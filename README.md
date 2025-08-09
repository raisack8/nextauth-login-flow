# 匿名ユーザーログインフロー実装ガイド

**「まず使ってもらって、後で登録してもらう」現代的なUXパターンの実装手順**

## 概要

このガイドでは、Next.js + NextAuth + Drizzle ORM + PostgreSQLを使用して、匿名ユーザー機能付きログインフローを既存プロジェクトに適用する手順を説明します。

### 実現される機能
- 初回アクセス時の匿名ユーザー自動作成
- Cookieベースでの状態永続化
- Google OAuth連携による匿名ユーザー昇格
- 同一PublicIDでのユーザー情報更新

## 前提条件

- Next.js 14 (App Router)
- NextAuth.js v4.24+
- Drizzle ORM
- PostgreSQL
- TypeScript

## 実装手順

### 1. データベーススキーマの作成

```typescript
// drizzle/schema.ts
import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  publicId: text('public_id').unique().notNull(),
  name: text('name').notNull(),
  email: text('email').unique(),
  image: text('image'),
  isAnonymous: boolean('is_anonymous').default(true).notNull(),
  googleId: text('google_id').unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
```

### 2. Server Actions実装

```typescript
// lib/actions/user.ts
'use server';

import { db } from '@/lib/db';
import { users, User } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';

const generateRandomName = (): string => {
  const adjectives = ['楽しい', '元気な', '優しい', '賢い', '面白い'];
  const animals = ['パンダ', 'コアラ', 'ペンギン', 'うさぎ', 'きつね'];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${adjective}${animal}${Math.floor(Math.random() * 1000)}`;
};

export async function createAnonymousUser(): Promise<User> {
  const publicId = nanoid(12);
  const name = generateRandomName();

  const [newUser] = await db
    .insert(users)
    .values({ publicId, name, isAnonymous: true })
    .returning();

  return newUser;
}

export async function getCurrentUserFromCookie(): Promise<User | null> {
  const cookieStore = cookies();
  const anonymousUserId = cookieStore.get('anonymous_user_id')?.value;

  if (!anonymousUserId) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.publicId, anonymousUserId))
    .limit(1);

  return user || null;
}

export async function upgradeAnonymousUserWithGoogle(
  googleId: string,
  email: string,
  name: string,
  image?: string
): Promise<User | null> {
  try {
    const anonymousUser = await getCurrentUserFromCookie();
    if (!anonymousUser?.isAnonymous) return null;

    const [updatedUser] = await db
      .update(users)
      .set({
        googleId,
        email,
        name,
        image,
        isAnonymous: false,
        updatedAt: new Date(),
      })
      .where(eq(users.publicId, anonymousUser.publicId))
      .returning();

    return updatedUser;
  } catch (error) {
    console.error('Failed to upgrade user:', error);
    return null;
  }
}
```

### 3. 匿名ユーザー作成API

```typescript
// app/api/user/anonymous/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAnonymousUser } from '@/lib/actions/user';

export async function GET() {
  try {
    const user = await createAnonymousUser();
    
    const cookieStore = cookies();
    cookieStore.set('anonymous_user_id', user.publicId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30日
      path: '/',
    });

    return NextResponse.redirect(new URL('/', 'http://localhost:3000'));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
```

### 4. NextAuth設定

```typescript
// lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      publicId?: string;
      name: string;
      email?: string;
      image?: string;
      isAnonymous?: boolean;
      googleId?: string;
      isLinked?: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    googleId?: string;
    isLinked?: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ account }) {
      return account?.provider === 'google';
    },
    
    async jwt({ token, user, account }) {
      if (account?.provider === 'google' && user) {
        token.googleId = account.providerAccountId;
        token.isLinked = false;
      }
      return token;
    },
    
    async session({ session, token }) {
      session.user = {
        ...session.user,
        googleId: token.googleId,
        isLinked: token.isLinked || false,
      };
      return session;
    },
  },
};
```

### 5. クライアントサイドフック

```typescript
// hooks/useCurrentUser.ts
'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { getCurrentUserFromCookie, upgradeAnonymousUserWithGoogle } from '@/lib/actions/user';

export function useCurrentUser() {
  const { data: session, status, update } = useSession();
  const [anonymousUser, setAnonymousUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      const initAnonymousUser = async () => {
        const user = await getCurrentUserFromCookie();
        setAnonymousUser(user);
        setLoading(false);
      };
      initAnonymousUser();
    } else {
      setLoading(false);
    }
  }, [session, status]);

  // Google OAuth後の昇格処理
  useEffect(() => {
    if (session?.user.googleId && session.user.isLinked === false) {
      const attemptUpgrade = async () => {
        const upgradedUser = await upgradeAnonymousUserWithGoogle(
          session.user.googleId!,
          session.user.email!,
          session.user.name,
          session.user.image
        );
        
        if (upgradedUser) {
          await update({
            ...session.user,
            id: upgradedUser.id,
            publicId: upgradedUser.publicId,
            isAnonymous: false,
            isLinked: true
          });
        }
      };
      attemptUpgrade();
    }
  }, [session, update]);

  return {
    user: session ? session.user : anonymousUser,
    loading,
    isAuthenticated: !!session,
  };
}
```

### 6. ページ初期化処理

```typescript
// app/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCurrentUserFromCookie } from '@/lib/actions/user';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    const existingUser = await getCurrentUserFromCookie();
    if (!existingUser) {
      redirect('/api/user/anonymous');
    }
  }

  return (
    <div>
      {/* あなたのコンポーネント */}
    </div>
  );
}
```

## 適用時の注意点

### セキュリティ考慮事項

1. **Cookie設定**: 本番環境では必ずsecure: trueを設定
2. **環境変数**: NEXTAUTH_SECRETを強力なランダム文字列に設定
3. **CORS設定**: 本番ドメインのみ許可

### パフォーマンス最適化

1. **DB接続**: Connection poolingの設定
2. **インデックス**: publicId、googleId、emailにインデックス作成
3. **キャッシュ戦略**: 頻繁なCookie読み取りの最適化

### デバッグ時の確認項目

```bash
# データベース確認
SELECT public_id, name, email, is_anonymous, google_id 
FROM users 
ORDER BY created_at DESC;

# Cookie確認（ブラウザDevTools）
document.cookie; # anonymous_user_idが設定されているか
```

## 環境変数設定

```env
# .env.local
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## トラブルシューティング

### よくある問題

1. **Cookie取得失敗**: Server Components内でのcookies()使用制限
2. **重複ユーザー作成**: 昇格処理でのトランザクション未使用
3. **セッション更新されない**: update()関数の未使用

### 解決方法

- Route Handlerでの適切なCookie操作
- DB操作のトランザクション化
- useSession().update()の活用

## まとめ

この実装により、Discord・Figma・Notion等と同様の現代的なユーザーオンボーディング体験を提供できます。匿名ユーザーから認証ユーザーへのシームレスな移行が可能になり、ユーザー獲得率の向上が期待できます。
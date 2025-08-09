'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { getCurrentUserFromCookie, upgradeAnonymousUserWithGoogle } from '@/lib/actions/user';
import { User } from '@/drizzle/schema';

export function useCurrentUser() {
  const { data: session, status, update } = useSession();
  const [anonymousUser, setAnonymousUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      // 未認証時のみ匿名ユーザーを取得（Cookieから）
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

  // Google OAuth完了後の昇格チェック
  useEffect(() => {
    if (session && session.user.googleId && session.user.isLinked === false) {
      const attemptUpgrade = async () => {
        try {
          // 昇格処理を実行（Server Action経由でCookie→DB連携）
          const upgradedUser = await upgradeAnonymousUserWithGoogle(
            session.user.googleId!, 
            session.user.email!,
            session.user.name,
            session.user.image
          );
          
          if (upgradedUser) {
            // セッションを手動更新してisLinkedフラグを更新
            await update({
              ...session.user,
              id: upgradedUser.id,
              publicId: upgradedUser.publicId,
              isAnonymous: false,
              isLinked: true
            });
          } else {
            console.log('No upgrade needed or upgrade failed');
          }
        } catch (error) {
          console.error('Upgrade failed:', error);
        }
      };
      
      attemptUpgrade();
    }
  }, [session, update]);

  if (session) {
    return {
      user: session.user,
      loading: false,
      isAuthenticated: true,
    };
  }

  return {
    user: anonymousUser,
    loading,
    isAuthenticated: false,
  };
}

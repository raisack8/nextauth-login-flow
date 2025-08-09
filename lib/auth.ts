import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { JWT } from 'next-auth/jwt';
import { Session } from 'next-auth';

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

  interface User {
    id: string;
    publicId: string;
    name: string;
    email?: string;
    image?: string;
    isAnonymous: boolean;
    googleId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    publicId?: string;
    name: string;
    email?: string;
    image?: string;
    isAnonymous?: boolean;
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
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' && profile?.sub) {
        // シンプルにGoogle認証のみ許可
        return true;
      }
      return false;
    },
    
    async jwt({ token, user, account }) {
      if (account?.provider === 'google' && user) {
        // Google認証時の基本情報をトークンに保存
        token.googleId = account.providerAccountId;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
        token.isLinked = false; 
      }
      return token;
    },
    
    async session({ session, token }: { session: Session; token: JWT }) {
      // セッションにGoogle情報を含める
      session.user = {
        ...session.user,
        googleId: token.googleId,
        email: token.email,
        name: token.name,
        image: token.image,
        isLinked: token.isLinked || false,
      };
      return session;
    },
  },
  pages: {
    signIn: undefined,
  },
};;;;;

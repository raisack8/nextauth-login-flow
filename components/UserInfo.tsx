'use client';

import { signIn, signOut } from 'next-auth/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function UserInfo() {
  const { user, loading, isAuthenticated } = useCurrentUser();

  if (loading) {
    return (
      <div className="p-6 border rounded-lg shadow-sm bg-white">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-3/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            <div className="h-4 bg-gray-300 rounded w-2/3"></div>
            <div className="h-4 bg-gray-300 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 border rounded-lg shadow-sm bg-red-50 border-red-200">
        <p className="text-red-600">ユーザー情報が取得できませんでした</p>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded-lg shadow-sm bg-white">
      <h3 className="text-xl font-semibold mb-4">ユーザー情報</h3>
      <div className="space-y-2 mb-4">
        <p><strong>名前:</strong> <span className="text-blue-600">{user.name}</span></p>
        <p><strong>公開ID:</strong> <span className="font-mono text-gray-600">{user.publicId}</span></p>
        <p>
          <strong>状態:</strong> 
          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
            user.isAnonymous 
              ? 'bg-yellow-100 text-yellow-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {user.isAnonymous ? '匿名ユーザー' : 'Google連携済み'}
          </span>
        </p>
        {user.email && <p><strong>メール:</strong> <span className="text-gray-600">{user.email}</span></p>}
        <p>
          <strong>認証状態:</strong> 
          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
            isAuthenticated 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {isAuthenticated ? 'ログイン中' : '匿名'}
          </span>
        </p>
      </div>
      
      <div className="space-x-2">
        {user.isAnonymous ? (
          <button
            onClick={() => signIn('google')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Googleで連携</span>
          </button>
        ) : (
          <button
            onClick={() => signOut()}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors duration-200"
          >
            ログアウト
          </button>
        )}
      </div>
    </div>
  );
}

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCurrentUserFromCookie } from '@/lib/actions/user';

export default async function ServerUserInfo() {
  const session = await getServerSession(authOptions);
  
  let user;
  if (session) {
    user = session.user;
  } else {
    user = await getCurrentUserFromCookie();
    // ページレベルで匿名ユーザー作成は処理済みのはず
  }

  if (!user) {
    return (
      <div className="p-6 border rounded-lg shadow-sm bg-red-50 border-red-200">
        <p className="text-red-600">ユーザー情報を取得できませんでした</p>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded-lg shadow-sm bg-white">
      <h3 className="text-xl font-semibold mb-4">サーバーサイド ユーザー情報</h3>
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
          <strong>セッション状態:</strong> 
          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
            session 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {session ? 'セッションあり' : 'セッションなし'}
          </span>
        </p>
      </div>
      
      <div className="text-sm text-gray-500 mt-4 p-3 bg-gray-50 rounded">
        <p><strong>注意:</strong> このコンポーネントはサーバーサイドで実行されるため、リアルタイムの状態変更は反映されません。</p>
      </div>
    </div>
  );
}

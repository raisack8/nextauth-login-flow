import UserInfo from '@/components/UserInfo';
import ServerUserInfo from '@/components/ServerUserInfo';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCurrentUserFromCookie } from '@/lib/actions/user';
import { redirect } from 'next/navigation';

export default async function Home() {
  // 初回アクセス時の匿名ユーザー作成処理
  const session = await getServerSession(authOptions);
  if (!session) {
    const existingUser = await getCurrentUserFromCookie();
    if (!existingUser) {
      // Route Handlerを呼び出してCookie設定を行う
      redirect('/api/user/anonymous');
    }
  }
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          NextAuth 匿名ユーザー ログインフロー
        </h1>
        
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">クライアントサイド</h2>
            <UserInfo />
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">サーバーサイド</h2>
            <ServerUserInfo />
          </div>
        </div>
      </div>
    </main>
  );
}

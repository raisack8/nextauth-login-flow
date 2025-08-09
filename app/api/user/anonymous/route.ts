import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users } from '@/drizzle/schema';
import { nanoid } from 'nanoid';

// ランダムな名前生成（Server Actionから移動）
const generateRandomName = (): string => {
  const adjectives = ['楽しい', '元気な', '優しい', '賢い', '面白い', '静かな', '明るい'];
  const animals = ['パンダ', 'コアラ', 'ペンギン', 'うさぎ', 'きつね', 'ねこ', 'いぬ'];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${adjective}${animal}${Math.floor(Math.random() * 1000)}`;
};

export async function GET() {
  try {
    console.log('=== Route Handler: Creating anonymous user ===');
    
    // Route Handler内で直接ユーザー作成
    const publicId = nanoid(12);
    const name = generateRandomName();
    console.log('Generated data:', { publicId, name });

    const [user] = await db
      .insert(users)
      .values({
        publicId,
        name,
        isAnonymous: true,
      })
      .returning();
    
    console.log('User created successfully:', user);
    
    // Route Handler内でCookie設定
    const cookieStore = cookies();
    cookieStore.set('anonymous_user_id', user.publicId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30日
      path: '/',
    });

    console.log('Cookie set, redirecting to home...');
    // ホームページにリダイレクト
    return NextResponse.redirect(new URL('/', 'http://localhost:3000'));
  } catch (error) {
    console.error('Anonymous user creation failed:', error);
    console.error('Error stack:', error);
    return NextResponse.json({ 
      error: 'Failed to create user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
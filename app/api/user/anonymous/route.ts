import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users } from '@/drizzle/schema';
import { nanoid } from 'nanoid';

const firstNames = [
  'Alex', 'Blake', 'Casey', 'Drew', 'Emery', 'Finley', 'Gray', 'Hunter',
  'Jamie', 'Kelly', 'Logan', 'Morgan', 'Nico', 'Parker', 'Quinn', 'River',
  'Sage', 'Taylor', 'Avery', 'Bailey', 'Cameron', 'Dakota', 'Eden', 'Frankie',
  'Haven', 'Indigo', 'Jordan', 'Kendall', 'Lane', 'Mason', 'Nova', 'Ocean'
]

const lastNames = [
  'Smith', 'Johnson', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor',
  'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Garcia', 'Martinez',
  'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen',
  'Young', 'King', 'Wright', 'Lopez', 'Hill', 'Scott', 'Green', 'Adams'
]

export function generateRandomName(): string {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
  const number = Math.floor(Math.random() * 999) + 1 // 1-999の範囲
  return `${firstName}${lastName}${number}`
} 

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
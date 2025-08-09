'use server';

import { db } from '@/lib/db';
import { users, User } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';

// ランダムな名前生成
const generateRandomName = (): string => {
  const adjectives = ['楽しい', '元気な', '優しい', '賢い', '面白い', '静かな', '明るい'];
  const animals = ['パンダ', 'コアラ', 'ペンギン', 'うさぎ', 'きつね', 'ねこ', 'いぬ'];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${adjective}${animal}${Math.floor(Math.random() * 1000)}`;
};

export async function createAnonymousUser(): Promise<User> {
  try {
    const publicId = nanoid(12);
    const name = generateRandomName();

    const [newUser] = await db
      .insert(users)
      .values({
        publicId,
        name,
        isAnonymous: true,
      })
      .returning();
    return newUser;
  } catch (error) {
    console.error('createAnonymousUser error:', error);
    throw error;
  }
}

export async function getUserByPublicId(publicId: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.publicId, publicId))
    .limit(1);

  return user || null;
}

export async function getUserByGoogleId(googleId: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.googleId, googleId))
    .limit(1);

  return user || null;
}

export async function linkGoogleAccount(
  publicId: string,
  googleId: string,
  email: string,
  name: string,
  image?: string
): Promise<User> {
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
    .where(eq(users.publicId, publicId))
    .returning();

  return updatedUser;
}

export async function getCurrentUserFromCookie(): Promise<User | null> {
  const cookieStore = cookies();
  const anonymousUserId = cookieStore.get('anonymous_user_id')?.value;

  if (!anonymousUserId) {
    return null;
  }

  return await getUserByPublicId(anonymousUserId);
}

// Google認証後の匿名ユーザー昇格処理
export async function upgradeAnonymousUserWithGoogle(
  googleId: string,
  email: string,
  name: string,
  image?: string
): Promise<User | null> {
  'use server';
  
  try {
    console.log('=== Upgrading Anonymous User ===');
    
    // Cookieから現在の匿名ユーザーを取得
    const anonymousUser = await getCurrentUserFromCookie();
    console.log('Anonymous user from cookie:', anonymousUser ? `${anonymousUser.name} (${anonymousUser.publicId})` : 'Not found');
    
    if (!anonymousUser || !anonymousUser.isAnonymous) {
      console.log('No anonymous user to upgrade');
      return null;
    }

    // 既にこのGoogleIDで連携済みユーザーがいないかチェック
    const existingGoogleUser = await getUserByGoogleId(googleId);
    if (existingGoogleUser) {
      console.log('Google user already exists:', existingGoogleUser.publicId);
      return existingGoogleUser;
    }

    // 匿名ユーザーを昇格
    const upgradedUser = await linkGoogleAccount(
      anonymousUser.publicId,
      googleId,
      email,
      name, // Googleの名前は使わず、匿名ユーザーの名前を保持
      image
    );
    
    console.log('User upgraded successfully:', {
      publicId: upgradedUser.publicId,
      name: upgradedUser.name,
      email: upgradedUser.email,
      isAnonymous: upgradedUser.isAnonymous
    });
    
    return upgradedUser;
  } catch (error) {
    console.error('Failed to upgrade anonymous user:', error);
    return null;
  }
}

export async function upgradeAnonymousUserToGoogleUser(
  googleUserId: string,
  googleEmail: string,
  googleName: string,
  googleImage?: string
): Promise<User | null> {
  'use server';
  
  try {
    // 1. Cookieから匿名ユーザーを取得
    const anonymousUser = await getCurrentUserFromCookie();
    
    if (!anonymousUser || !anonymousUser.isAnonymous) {
      return null;
    }
    
    // 2. 既にGoogle IDでユーザーが存在するかチェック
    const existingGoogleUser = await getUserByGoogleId(googleUserId);
    if (existingGoogleUser) {
      return existingGoogleUser;
    }
    
    // 3. 匿名ユーザーをGoogle連携ユーザーに昇格
    const upgradedUser = await linkGoogleAccount(
      anonymousUser.publicId,
      googleUserId,
      googleEmail,
      googleName,
      googleImage
    );
    return upgradedUser;
  } catch (error) {
    console.error('upgradeAnonymousUserToGoogleUser error:', error);
    return null;
  }
}

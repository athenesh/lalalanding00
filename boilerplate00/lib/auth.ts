import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

/**
 * 인증된 사용자의 Clerk ID를 반환합니다.
 * 로그인하지 않은 경우 로그인 페이지로 리다이렉트합니다.
 */
export async function getAuthUserId() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return userId;
}

/**
 * 인증된 사용자의 역할(role)을 반환합니다.
 * 로그인하지 않은 경우 null을 반환합니다.
 */
export async function getAuthRole(): Promise<'agent' | 'client' | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = user.publicMetadata?.role as 'agent' | 'client' | undefined;

    return role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

/**
 * 인증된 사용자의 전체 정보를 반환합니다.
 * 로그인하지 않은 경우 null을 반환합니다.
 */
export async function getAuthUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return user;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

/**
 * 에이전트인지 확인합니다.
 * 에이전트가 아닌 경우 홈으로 리다이렉트합니다.
 */
export async function requireAgent() {
  const role = await getAuthRole();

  if (role !== 'agent') {
    redirect('/');
  }
}

/**
 * 클라이언트인지 확인합니다.
 * 클라이언트가 아닌 경우 홈으로 리다이렉트합니다.
 */
export async function requireClient() {
  const role = await getAuthRole();

  if (role !== 'client') {
    redirect('/');
  }
}


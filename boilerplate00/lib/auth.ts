import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/service-role';

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
 * 
 * 주의: API 라우트에서는 이 함수를 사용하지 말고, 직접 NextResponse를 반환하세요.
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

/**
 * Account를 조회하고, 없으면 자동으로 생성합니다.
 * 에이전트용 accounts 테이블에 레코드를 생성합니다.
 */
export async function getOrCreateAccount() {
  const userId = await getAuthUserId();
  const supabase = createClerkSupabaseClient();
  const serviceSupabase = getServiceRoleClient();

  // 먼저 일반 클라이언트로 Account 조회 시도
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  // Account가 존재하면 반환
  if (account && !accountError) {
    console.log('[Auth] Account 조회 성공:', { accountId: account.id });
    return account;
  }

  // RLS 정책 때문에 조회가 안 될 수 있으므로 Service Role로도 조회 시도
  const { data: serviceAccount, error: serviceAccountError } = await serviceSupabase
    .from('accounts')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (serviceAccount && !serviceAccountError) {
    console.log('[Auth] Account 조회 성공 (Service Role):', { accountId: serviceAccount.id });
    return serviceAccount;
  }

  // Account가 없으면 생성
  console.log('[Auth] Account가 없어서 생성 시도:', { userId });

  // Clerk에서 사용자 정보 가져오기
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);

  if (!clerkUser) {
    throw new Error('Clerk user not found');
  }

  // Account 생성 시에는 Service Role 클라이언트를 사용하여 RLS를 우회
  // (서버 사이드에서만 사용되므로 안전함)
  const { data: newAccount, error: createError } = await serviceSupabase
    .from('accounts')
    .insert({
      clerk_user_id: userId,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      role: 'agent',
      name: clerkUser.fullName || clerkUser.firstName || clerkUser.username || 'Unknown',
    })
    .select()
    .single();

  // Unique constraint 에러 (23505)는 이미 존재한다는 의미
  // 이 경우 다시 조회해서 반환
  if (createError?.code === '23505') {
    console.log('[Auth] Account가 이미 존재함 (unique constraint), 재조회 시도:', { userId });
    const { data: existingAccount, error: fetchError } = await serviceSupabase
      .from('accounts')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (existingAccount && !fetchError) {
      console.log('[Auth] Account 재조회 성공:', { accountId: existingAccount.id });
      return existingAccount;
    }

    // 재조회도 실패하면 원래 에러를 throw
    console.error('[Auth] Account 재조회 실패:', {
      userId,
      error: fetchError,
    });
    throw new Error(`Failed to fetch existing account: ${fetchError?.message || 'Unknown error'}`);
  }

  if (createError || !newAccount) {
    console.error('[Auth] Account 생성 실패:', {
      userId,
      error: createError,
    });
    throw new Error(`Failed to create account: ${createError?.message || 'Unknown error'}`);
  }

  console.log('[Auth] Account 생성 성공:', { accountId: newAccount.id });
  return newAccount;
}


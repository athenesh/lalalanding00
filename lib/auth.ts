import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * 인증된 사용자의 Clerk ID를 반환합니다.
 * 로그인하지 않은 경우 로그인 페이지로 리다이렉트합니다.
 */
export async function getAuthUserId() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return userId;
}

/**
 * 인증된 사용자의 역할(role)을 반환합니다.
 * 로그인하지 않은 경우 null을 반환합니다.
 */
export async function getAuthRole(): Promise<"agent" | "client" | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = user.publicMetadata?.role as "agent" | "client" | undefined;

    return role || null;
  } catch (error) {
    console.error("Error getting user role:", error);
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
    console.error("Error getting user:", error);
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

  if (role !== "agent") {
    redirect("/");
  }
}

/**
 * 클라이언트인지 확인합니다.
 * 클라이언트가 아닌 경우 홈으로 리다이렉트합니다.
 */
export async function requireClient() {
  const role = await getAuthRole();

  if (role !== "client") {
    redirect("/");
  }
}

/**
 * 권한 부여된 사용자의 client_id를 조회합니다.
 * 권한이 없으면 null을 반환합니다.
 *
 * @param userId - Clerk 사용자 ID (선택사항, API 라우트에서 사용 시 직접 전달)
 * @returns 권한 부여된 클라이언트의 client_id 또는 null
 */
export async function getAuthorizedClientId(
  userId?: string,
): Promise<string | null> {
  const finalUserId = userId || (await getAuthUserId());

  if (!finalUserId) {
    return null;
  }

  const supabase = createClerkSupabaseClient();

  try {
    const { data: authorization, error } = await supabase
      .from("client_authorizations")
      .select("client_id")
      .eq("authorized_clerk_user_id", finalUserId)
      .single();

    if (error || !authorization) {
      // 권한이 없거나 에러 발생
      return null;
    }

    console.log("[Auth] 권한 부여된 사용자 확인:", {
      userId: finalUserId,
      clientId: authorization.client_id,
    });

    return authorization.client_id;
  } catch (error) {
    console.error("[Auth] 권한 확인 중 오류:", error);
    return null;
  }
}

/**
 * API 라우트용: 권한 부여된 사용자의 client_id를 조회합니다.
 * @param userId - Clerk 사용자 ID
 * @returns 권한 부여된 클라이언트의 client_id 또는 null
 */
async function getAuthorizedClientIdForUser(
  userId: string,
): Promise<string | null> {
  return getAuthorizedClientId(userId);
}

/**
 * 클라이언트 본인 또는 권한 부여된 사용자의 client_id를 반환합니다.
 * 권한 부여된 클라이언트가 있으면 우선적으로 반환합니다.
 * 관리자인 경우 쿼리 파라미터로 clientId를 받을 수 있습니다.
 * 둘 다 없으면 null을 반환합니다.
 *
 * 우선순위:
 * 1. 권한 부여된 클라이언트 (배우자가 권한을 받은 클라이언트)
 * 2. 본인 클라이언트
 * 3. 관리자인 경우 쿼리 파라미터의 clientId (API 라우트에서만)
 *
 * @param userId - Clerk 사용자 ID (API 라우트에서 사용 시 직접 전달)
 * @param clientIdFromQuery - 쿼리 파라미터에서 받은 clientId (관리자용, 선택사항)
 * @returns client_id 또는 null
 */
export async function getClientIdForUser(
  userId?: string,
  clientIdFromQuery?: string,
): Promise<string | null> {
  // userId가 제공되지 않으면 getAuthUserId() 호출 (페이지 컴포넌트용)
  // userId가 제공되면 직접 사용 (API 라우트용)
  const finalUserId = userId || (await getAuthUserId());

  if (!finalUserId) {
    return null;
  }

  const supabase = createClerkSupabaseClient();

  // 0. 관리자인 경우 쿼리 파라미터의 clientId 사용 (API 라우트에서만)
  if (clientIdFromQuery) {
    const adminCheck = await isAdmin();
    if (adminCheck) {
      console.log("[Auth] 관리자가 쿼리 파라미터의 clientId 사용:", {
        userId: finalUserId,
        clientId: clientIdFromQuery,
      });
      // clientId가 실제로 존재하는지 확인
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id")
        .eq("id", clientIdFromQuery)
        .single();

      if (client && !clientError) {
        return clientIdFromQuery;
      } else {
        console.warn("[Auth] 관리자가 지정한 clientId가 존재하지 않음:", {
          clientId: clientIdFromQuery,
          error: clientError,
        });
      }
    }
  }

  // 1. 권한 부여된 사용자인지 먼저 확인 (우선순위)
  // 배우자는 항상 권한을 받은 클라이언트의 데이터를 봐야 함
  console.log("[Auth] 권한 부여된 클라이언트 확인 시작:", {
    userId: finalUserId,
  });
  const authorizedClientId = await getAuthorizedClientIdForUser(finalUserId);
  if (authorizedClientId) {
    console.log("[Auth] 권한 부여된 클라이언트 우선 반환:", {
      userId: finalUserId,
      clientId: authorizedClientId,
    });
    return authorizedClientId;
  }
  console.log("[Auth] 권한 부여된 클라이언트 없음:", {
    userId: finalUserId,
  });

  // 2. 본인이 클라이언트인지 확인
  console.log("[Auth] 본인 클라이언트 조회 시작:", {
    userId: finalUserId,
  });
  const { data: ownClient, error: ownClientError } = await supabase
    .from("clients")
    .select("id")
    .eq("clerk_user_id", finalUserId)
    .single();

  if (ownClient && !ownClientError) {
    console.log("[Auth] 본인 클라이언트 확인:", {
      userId: finalUserId,
      clientId: ownClient.id,
    });
    return ownClient.id;
  }

  // 3. 관리자인 경우 첫 번째 클라이언트를 자동으로 선택 (fallback)
  const adminCheck = await isAdmin();
  if (adminCheck) {
    console.log("[Auth] 관리자 확인, 첫 번째 클라이언트 조회 시도:", {
      userId: finalUserId,
    });
    const { data: firstClient, error: firstClientError } = await supabase
      .from("clients")
      .select("id")
      .limit(1)
      .single();

    if (firstClient && !firstClientError) {
      console.log("[Auth] 관리자가 첫 번째 클라이언트 사용:", {
        userId: finalUserId,
        clientId: firstClient.id,
      });
      return firstClient.id;
    } else {
      console.log("[Auth] 관리자이지만 클라이언트가 없음:", {
        userId: finalUserId,
        error: firstClientError,
      });
    }
  }

  // 에러가 있으면 로그 출력
  if (ownClientError) {
    console.log("[Auth] 클라이언트 조회 에러:", {
      userId: finalUserId,
      error: ownClientError,
      errorCode: ownClientError.code,
      errorMessage: ownClientError.message,
    });
  } else {
    console.log("[Auth] 클라이언트 레코드를 찾을 수 없음:", {
      userId: finalUserId,
    });
  }

  // 둘 다 없으면 null 반환
  console.log("[Auth] 클라이언트 ID를 찾을 수 없어 null 반환:", {
    userId: finalUserId,
  });
  return null;
}

/**
 * 에이전트가 특정 클라이언트에 접근할 수 있는지 확인합니다.
 * 에이전트가 해당 클라이언트의 소유자인지 확인합니다.
 *
 * @param clientId 확인할 클라이언트 ID
 * @returns 접근 가능하면 true, 아니면 false
 */
export async function canAgentAccessClient(clientId: string): Promise<boolean> {
  const userId = await getAuthUserId();
  const role = await getAuthRole();

  // 에이전트가 아니면 false 반환
  if (role !== "agent") {
    return false;
  }

  const supabase = createClerkSupabaseClient();

  // Account 조회 또는 자동 생성
  const account = await getOrCreateAccount();

  // 클라이언트 소유권 확인
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, owner_agent_id")
    .eq("id", clientId)
    .eq("owner_agent_id", account.id)
    .single();

  if (clientError || !client) {
    console.log("[Auth] 에이전트 클라이언트 접근 권한 없음:", {
      userId,
      clientId,
      accountId: account.id,
      error: clientError?.message,
    });
    return false;
  }

  console.log("[Auth] 에이전트 클라이언트 접근 권한 확인:", {
    userId,
    clientId,
    accountId: account.id,
  });
  return true;
}

/**
 * 클라이언트 또는 권한 부여된 사용자인지 확인합니다.
 * 둘 다 아닌 경우 홈으로 리다이렉트합니다.
 *
 * 주의: API 라우트에서는 이 함수를 사용하지 말고, 직접 NextResponse를 반환하세요.
 */
export async function requireClientOrAuthorized() {
  const clientId = await getClientIdForUser();

  if (!clientId) {
    console.log("[Auth] 클라이언트 또는 권한 부여된 사용자가 아님");
    redirect("/");
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
    .from("accounts")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  // Account가 존재하면 반환
  if (account && !accountError) {
    console.log("[Auth] Account 조회 성공:", { accountId: account.id });
    return account;
  }

  // RLS 정책 때문에 조회가 안 될 수 있으므로 Service Role로도 조회 시도
  const { data: serviceAccount, error: serviceAccountError } =
    await serviceSupabase
      .from("accounts")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

  if (serviceAccount && !serviceAccountError) {
    console.log("[Auth] Account 조회 성공 (Service Role):", {
      accountId: serviceAccount.id,
    });
    return serviceAccount;
  }

  // Account가 없으면 생성
  console.log("[Auth] Account가 없어서 생성 시도:", { userId });

  // Clerk에서 사용자 정보 가져오기
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);

  if (!clerkUser) {
    throw new Error("Clerk user not found");
  }

  // Account 생성 시에는 Service Role 클라이언트를 사용하여 RLS를 우회
  // (서버 사이드에서만 사용되므로 안전함)
  const { data: newAccount, error: createError } = await serviceSupabase
    .from("accounts")
    .insert({
      clerk_user_id: userId,
      email: clerkUser.emailAddresses[0]?.emailAddress || "",
      role: "agent",
      name:
        clerkUser.fullName ||
        clerkUser.firstName ||
        clerkUser.username ||
        "Unknown",
    })
    .select()
    .single();

  // Unique constraint 에러 (23505)는 이미 존재한다는 의미
  // 이 경우 다시 조회해서 반환
  if (createError?.code === "23505") {
    console.log(
      "[Auth] Account가 이미 존재함 (unique constraint), 재조회 시도:",
      { userId },
    );
    const { data: existingAccount, error: fetchError } = await serviceSupabase
      .from("accounts")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (existingAccount && !fetchError) {
      console.log("[Auth] Account 재조회 성공:", {
        accountId: existingAccount.id,
      });
      return existingAccount;
    }

    // 재조회도 실패하면 원래 에러를 throw
    console.error("[Auth] Account 재조회 실패:", {
      userId,
      error: fetchError,
    });
    throw new Error(
      `Failed to fetch existing account: ${
        fetchError?.message || "Unknown error"
      }`,
    );
  }

  if (createError || !newAccount) {
    console.error("[Auth] Account 생성 실패:", {
      userId,
      error: createError,
    });
    throw new Error(
      `Failed to create account: ${createError?.message || "Unknown error"}`,
    );
  }

  console.log("[Auth] Account 생성 성공:", { accountId: newAccount.id });
  return newAccount;
}

/**
 * ADMIN인지 확인합니다.
 * ADMIN은 환경 변수 ADMIN_EMAIL에 지정된 이메일 주소로 식별됩니다.
 * ADMIN이 아닌 경우 홈으로 리다이렉트합니다.
 */
export async function requireAdmin() {
  const user = await getAuthUser();

  if (!user) {
    console.warn("[Auth] requireAdmin: 사용자 정보 없음, /sign-in으로 리다이렉트");
    redirect("/sign-in");
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error("[Auth] ADMIN_EMAIL 환경 변수가 설정되지 않았습니다.");
    console.error("[Auth] requireAdmin 실패: 환경 변수 없음, /로 리다이렉트");
    redirect("/");
  }

  const userEmail = user.emailAddresses[0]?.emailAddress;
  if (!userEmail) {
    console.warn("[Auth] requireAdmin: 사용자 이메일 주소 없음, /로 리다이렉트");
    redirect("/");
  }

  const isAdmin = userEmail.toLowerCase() === adminEmail.toLowerCase();
  if (!isAdmin) {
    console.log("[Auth] ADMIN 권한 없음:", {
      userEmail: userEmail.toLowerCase(),
      adminEmail: adminEmail.toLowerCase(),
      match: false,
    });
    console.log("[Auth] requireAdmin 실패: 권한 없음, /로 리다이렉트");
    redirect("/");
  }

  console.log("[Auth] ADMIN 권한 확인됨:", {
    userEmail: userEmail.toLowerCase(),
    adminEmail: adminEmail.toLowerCase(),
  });
}

/**
 * ADMIN인지 확인하고, ADMIN이면 true를 반환합니다.
 * API 라우트에서 사용합니다.
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getAuthUser();

  if (!user) {
    console.log("[Auth] isAdmin: 사용자 정보 없음");
    return false;
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error("[Auth] isAdmin: ADMIN_EMAIL 환경 변수가 설정되지 않았습니다.");
    return false;
  }

  const userEmail = user.emailAddresses[0]?.emailAddress;
  if (!userEmail) {
    console.log("[Auth] isAdmin: 사용자 이메일 주소 없음");
    return false;
  }

  const isAdminUser = userEmail.toLowerCase() === adminEmail.toLowerCase();
  
  // 개발 환경에서만 상세 로그
  if (process.env.NODE_ENV === "development") {
    console.log("[Auth] isAdmin 체크:", {
      userEmail: userEmail.toLowerCase(),
      adminEmail: adminEmail.toLowerCase(),
      match: isAdminUser,
    });
  }
  
  return isAdminUser;
}

/**
 * 특정 에이전트의 승인 상태를 확인합니다.
 * @param accountId - 확인할 에이전트의 account ID
 * @returns 승인되었으면 true, 아니면 false
 */
export async function isAgentApproved(
  accountId: string,
): Promise<boolean> {
  const supabase = createClerkSupabaseClient();
  const serviceSupabase = getServiceRoleClient();

  // Service Role로 조회하여 RLS 우회
  const { data: account, error } = await serviceSupabase
    .from("accounts")
    .select("is_approved")
    .eq("id", accountId)
    .eq("role", "agent")
    .single();

  if (error || !account) {
    console.log("[Auth] isAgentApproved: 에이전트를 찾을 수 없음:", {
      accountId,
      error: error?.message,
    });
    return false;
  }

  console.log("[Auth] Agent approval check:", {
    accountId,
    isApproved: account.is_approved,
  });

  return account.is_approved === true;
}

/**
 * 현재 사용자가 승인된 에이전트인지 확인합니다.
 * API 라우트에서 사용합니다.
 * @returns 승인된 에이전트이면 true, 아니면 false
 */
export async function requireApprovedAgent(): Promise<boolean> {
  // 1. 에이전트 역할 확인
  const role = await getAuthRole();
  if (role !== "agent") {
    console.log("[Auth] requireApprovedAgent: 에이전트 역할이 아님:", {
      role,
    });
    return false;
  }

  // 2. Account 조회 또는 생성
  const account = await getOrCreateAccount();

  // 3. 승인 상태 확인
  const isApproved = await isAgentApproved(account.id);

  if (!isApproved) {
    console.warn("[Auth] requireApprovedAgent: 승인되지 않은 에이전트:", {
      accountId: account.id,
    });
    return false;
  }

  console.log("[Auth] requireApprovedAgent: 승인된 에이전트 확인:", {
    accountId: account.id,
  });

  return true;
}

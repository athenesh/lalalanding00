import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { getAuthRole } from "@/lib/auth";

/**
 * Clerk 사용자를 Supabase accounts 테이블에 동기화하는 API
 *
 * 클라이언트에서 로그인 후 이 API를 호출하여 사용자 정보를 Supabase에 저장합니다.
 * 이미 존재하는 경우 업데이트하고, 없으면 새로 생성합니다.
 */
export async function POST() {
  try {
    console.log("[SyncUser] 동기화 시작");
    
    // Clerk 인증 확인
    const { userId } = await auth();

    if (!userId) {
      console.log("[SyncUser] 인증되지 않은 사용자");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[SyncUser] Clerk 사용자 ID:", userId);

    // Clerk에서 사용자 정보 가져오기
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);

    if (!clerkUser) {
      console.error("[SyncUser] Clerk 사용자를 찾을 수 없음");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 사용자 역할 가져오기
    const role = await getAuthRole();
    const userRole = role || "agent"; // 기본값은 'agent'

    console.log("[SyncUser] 사용자 역할:", userRole);

    // Supabase에 사용자 정보 동기화 (accounts 테이블)
    const supabase = getServiceRoleClient();

    const email = clerkUser.emailAddresses[0]?.emailAddress || "";
    const name =
      clerkUser.fullName ||
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      clerkUser.username ||
      "Unknown";

    console.log("[SyncUser] 동기화할 데이터:", {
      clerk_user_id: userId,
      email,
      name,
      role: userRole,
    });

    const { data, error } = await supabase
      .from("accounts")
      .upsert(
        {
          clerk_user_id: userId,
          email: email,
          role: userRole,
          name: name,
        },
        {
          onConflict: "clerk_user_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("[SyncUser] Supabase 동기화 오류:", {
        errorCode: error.code,
        errorMessage: error.message,
      });
      // 보안: 상세 에러 메시지는 클라이언트에 노출하지 않음
      return NextResponse.json(
        { error: "Failed to sync user" },
        { status: 500 }
      );
    }

    console.log("[SyncUser] 동기화 성공:", { accountId: data.id });

    return NextResponse.json({
      success: true,
      account: data,
    });
  } catch (error) {
    // 보안: 민감한 정보는 로그에서 제외
    console.error("[SyncUser] 동기화 중 예외 발생:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

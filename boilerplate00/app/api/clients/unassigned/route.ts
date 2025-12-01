import { NextResponse } from "next/server";
import { getAuthRole, getOrCreateAccount } from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/clients/unassigned
 * 할당되지 않은 클라이언트 목록을 조회합니다.
 * 프로필 작성 완료 상태도 함께 반환합니다.
 */
export async function GET() {
  try {
    // API 호출 시작 로그
    console.log("[API] GET /api/clients/unassigned 호출 시작");

    // 에이전트 권한 확인
    const role = await getAuthRole();
    if (role !== "agent") {
      console.error("[API] Unauthorized access - not an agent:", { role });
      return NextResponse.json(
        { error: "Unauthorized", details: "Agent role required" },
        { status: 403 },
      );
    }

    const supabase = createClerkSupabaseClient();

    // Account 조회 또는 자동 생성
    let account;
    try {
      account = await getOrCreateAccount();
      console.log("[API] Account 조회/생성 성공:", { accountId: account.id });
    } catch (accountError) {
      console.error("[API] Account 조회/생성 실패:", {
        error: accountError,
        errorMessage:
          accountError instanceof Error
            ? accountError.message
            : "Unknown error",
      });
      return NextResponse.json(
        {
          error: "Failed to get or create account",
          details:
            accountError instanceof Error
              ? accountError.message
              : "Unknown error",
        },
        { status: 500 },
      );
    }

    // 할당되지 않은 클라이언트 목록 조회 (owner_agent_id가 null)
    console.log("[API] 할당되지 않은 클라이언트 목록 조회 시도");
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select(
        `
        id,
        name,
        email,
        phone_kr,
        phone_us,
        occupation,
        moving_date,
        relocation_type,
        birth_date,
        created_at,
        updated_at,
        clerk_user_id
      `,
      )
      .is("owner_agent_id", null)
      .order("created_at", { ascending: false });

    if (clientsError) {
      console.error("[API] Unassigned clients fetch error:", {
        accountId: account.id,
        error: clientsError,
        errorCode: clientsError?.code,
        errorMessage: clientsError?.message,
        errorDetails: clientsError?.details,
        errorHint: clientsError?.hint,
      });
      return NextResponse.json(
        {
          error: "Failed to fetch unassigned clients",
          details: clientsError.message || "Unknown error",
          code: clientsError?.code,
          hint: clientsError?.hint,
        },
        { status: 500 },
      );
    }

    console.log("[API] 할당되지 않은 클라이언트 목록 조회 성공:", {
      clientCount: clients?.length || 0,
    });

    // 프로필 작성 완료 상태 계산
    // 필수 필드: name, email, occupation, moving_date, relocation_type
    const clientsWithProfileStatus = clients?.map((client) => {
      const isProfileComplete =
        client.name &&
        client.email &&
        client.occupation &&
        client.moving_date &&
        client.relocation_type &&
        client.name.trim() !== "" &&
        client.email.trim() !== "" &&
        client.occupation.trim() !== "" &&
        client.relocation_type.trim() !== "";

      return {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone_kr || client.phone_us || null,
        occupation: client.occupation,
        moving_date: client.moving_date,
        relocation_type: client.relocation_type,
        birth_date: client.birth_date,
        created_at: client.created_at,
        updated_at: client.updated_at,
        clerk_user_id: client.clerk_user_id,
        is_profile_complete: isProfileComplete,
      };
    });

    return NextResponse.json({
      clients: clientsWithProfileStatus || [],
    });
  } catch (error) {
    console.error("[API] Error in GET /api/clients/unassigned:", {
      error,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

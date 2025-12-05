import { NextResponse } from "next/server";
import { getAuthUserId, getAuthRole, getOrCreateAccount } from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/clients
 * 에이전트의 클라이언트 목록을 조회합니다.
 */
export async function GET() {
  try {
    // API 호출 시작 로그
    console.log("[API] GET /api/clients 호출 시작");

    // 에이전트 권한 확인
    const role = await getAuthRole();
    if (role !== "agent") {
      console.error("[API] Unauthorized access - not an agent:", { role });
      return NextResponse.json(
        { error: "Unauthorized", details: "Agent role required" },
        { status: 403 },
      );
    }

    const userId = await getAuthUserId();
    console.log("[API] User ID (Clerk User ID):", userId);

    const supabase = createClerkSupabaseClient();

    // Account 조회 또는 자동 생성
    let account;
    try {
      account = await getOrCreateAccount();
      console.log("[API] Account 조회/생성 성공:", {
        accountId: account.id,
        clerkUserId: userId,
      });
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

    // 디버깅: RLS 정책이 작동하는지 확인하기 위해 직접 쿼리 테스트
    console.log("[API] 클라이언트 목록 조회 시도:", { accountId: account.id });

    // 먼저 Service Role로 조회하여 데이터가 실제로 있는지 확인
    const { getServiceRoleClient } = await import(
      "@/lib/supabase/service-role"
    );
    const serviceSupabase = getServiceRoleClient();
    const { data: serviceClients, error: serviceError } = await serviceSupabase
      .from("clients")
      .select("id, name, owner_agent_id")
      .eq("owner_agent_id", account.id);

    console.log(
      "[API] Service Role로 조회한 클라이언트 수:",
      serviceClients?.length || 0,
    );
    if (serviceError) {
      console.error("[API] Service Role 조회 에러:", serviceError);
    }

    // 일반 클라이언트로 조회 (RLS 정책 적용)
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
        created_at,
        checklist_items (
          id,
          is_completed
        )
      `,
      )
      .eq("owner_agent_id", account.id)
      .order("created_at", { ascending: false });

    console.log("[API] RLS 정책 적용 후 클라이언트 수:", clients?.length || 0);

    if (clientsError) {
      console.error("[API] Clients fetch error:", {
        accountId: account.id,
        error: clientsError,
        errorCode: clientsError?.code,
        errorMessage: clientsError?.message,
        errorDetails: clientsError?.details,
        errorHint: clientsError?.hint,
        // 추가 디버깅 정보
        serviceRoleCount: serviceClients?.length || 0,
      });
      return NextResponse.json(
        {
          error: "Failed to fetch clients",
          details: clientsError.message || "Unknown error",
          code: clientsError?.code,
          hint: clientsError?.hint,
        },
        { status: 500 },
      );
    }

    console.log("[API] 클라이언트 목록 조회 성공:", {
      accountId: account.id,
      clientCount: clients?.length || 0,
    });

    // 체크리스트 완료율 및 프로필 완료 상태 계산
    const clientsWithProgress = clients?.map((client) => {
      const checklistItems = client.checklist_items || [];
      const totalItems = checklistItems.length;
      const completedItems = checklistItems.filter(
        (item: any) => item.is_completed,
      ).length;
      const completionRate =
        totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

      // 프로필 작성 완료 상태 계산
      // 필수 필드: name, email, occupation, moving_date, relocation_type
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
        created_at: client.created_at,
        checklist_completion_rate: Math.round(completionRate),
        checklist_total: totalItems,
        checklist_completed: completedItems,
        is_profile_complete: isProfileComplete,
      };
    });

    console.log("[API] GET /api/clients 완료:", {
      clientCount: clientsWithProgress?.length || 0,
    });

    return NextResponse.json({
      clients: clientsWithProgress || [],
    });
  } catch (error) {
    console.error("[API] Error in GET /api/clients:", {
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

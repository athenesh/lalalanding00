import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * GET /api/admin/agents
 * ADMIN이 모든 에이전트 목록을 조회합니다.
 * 승인 대기 중인 에이전트와 승인된 에이전트를 모두 조회할 수 있습니다.
 */
export async function GET(request: Request) {
  try {
    console.log("[API] GET /api/admin/agents 호출 시작");

    // ADMIN 권한 확인
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const supabase = getServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // 'pending' | 'approved' | null (all)

    // 쿼리 구성
    let query = supabase
      .from("accounts")
      .select("id, clerk_user_id, email, name, dre_number, brokerage_name, is_approved, approved_at, approved_by, created_at")
      .eq("role", "agent")
      .order("created_at", { ascending: false });

    // 상태 필터링
    if (status === "pending") {
      query = query.eq("is_approved", false);
    } else if (status === "approved") {
      query = query.eq("is_approved", true);
    }

    const { data: agents, error } = await query;

    if (error) {
      console.error("[API] Agents 조회 실패:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch agents",
          details: error.message,
        },
        { status: 500 }
      );
    }

    console.log("[API] Agents 조회 성공:", {
      count: agents?.length || 0,
      status,
    });

    return NextResponse.json({
      success: true,
      agents: agents || [],
    });
  } catch (error) {
    console.error("[API] Error in GET /api/admin/agents:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * GET /api/admin/clients
 * 관리자가 모든 클라이언트 목록을 조회합니다.
 */
export async function GET(request: Request) {
  try {
    console.log("[API] GET /api/admin/clients 호출 시작");

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
    const agentId = searchParams.get("agent_id"); // 에이전트별 필터링
    const search = searchParams.get("search"); // 검색 (이름, 이메일)

    // 기본 쿼리 구성
    let query = supabase
      .from("clients")
      .select(`
        id,
        name,
        email,
        phone_kr,
        phone_us,
        occupation,
        moving_date,
        moving_type,
        relocation_type,
        created_at,
        updated_at,
        owner_agent_id,
        accounts!clients_owner_agent_id_fkey (
          id,
          name,
          email
        )
      `)
      .order("created_at", { ascending: false });

    // 에이전트별 필터링
    if (agentId) {
      query = query.eq("owner_agent_id", agentId);
    }

    // 검색 필터링
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: clients, error } = await query;

    if (error) {
      console.error("[API] Clients 조회 실패:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch clients",
          details: error.message,
        },
        { status: 500 }
      );
    }

    console.log("[API] Clients 조회 성공:", {
      count: clients?.length || 0,
      agentId,
      search,
    });

    return NextResponse.json({
      success: true,
      clients: clients || [],
    });
  } catch (error) {
    console.error("[API] Error in GET /api/admin/clients:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


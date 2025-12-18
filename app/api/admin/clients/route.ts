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
    // 먼저 클라이언트만 조회하고, accounts는 별도로 조회
    // updated_at 컬럼은 테이블에 없으므로 제외
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
        owner_agent_id
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
      console.error("[API] Clients 조회 실패:", {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return NextResponse.json(
        {
          error: "Failed to fetch clients",
          details: error.message,
          code: error.code,
          hint: error.hint,
        },
        { status: 500 }
      );
    }

    console.log("[API] Clients 조회 성공 (accounts 조회 전):", {
      count: clients?.length || 0,
      sampleClient: clients?.[0] ? {
        id: clients[0].id,
        name: clients[0].name,
        owner_agent_id: clients[0].owner_agent_id,
        owner_agent_id_type: typeof clients[0].owner_agent_id,
      } : null,
    });

    // accounts 정보를 별도로 조회하여 매핑
    const agentIds = clients
      ?.map((c) => c.owner_agent_id)
      .filter((id): id is string => id !== null && id !== undefined && typeof id === 'string') || [];
    
    let accountsMap: Record<string, { id: string; name: string; email: string }> = {};
    
    if (agentIds.length > 0) {
      try {
        const { data: accounts, error: accountsError } = await supabase
          .from("accounts")
          .select("id, name, email")
          .in("id", agentIds);

        if (accountsError) {
          console.error("[API] Accounts 조회 실패:", accountsError);
          // accounts 조회 실패해도 클라이언트 목록은 반환
        } else if (accounts) {
          accountsMap = accounts.reduce((acc, account) => {
            if (account && account.id) {
              acc[account.id] = {
                id: account.id,
                name: account.name || "",
                email: account.email || "",
              };
            }
            return acc;
          }, {} as Record<string, { id: string; name: string; email: string }>);
        }
      } catch (accountsErr) {
        console.error("[API] Accounts 조회 중 예외 발생:", accountsErr);
        // accounts 조회 실패해도 클라이언트 목록은 반환
      }
    }

    // 클라이언트 데이터에 accounts 정보 추가
    const clientsWithAccounts = clients?.map((client) => ({
      ...client,
      accounts: client.owner_agent_id ? accountsMap[client.owner_agent_id] || null : null,
    })) || [];

    console.log("[API] Clients 조회 성공:", {
      count: clientsWithAccounts.length,
      agentId,
      search,
    });

    return NextResponse.json({
      success: true,
      clients: clientsWithAccounts,
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


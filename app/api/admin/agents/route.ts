import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { clerkClient } from "@clerk/nextjs/server";

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

    // Clerk에서 실제로 존재하는 모든 사용자 ID 가져오기
    const clerk = await clerkClient();
    const validClerkUserIds: Set<string> = new Set();
    
    try {
      const allClerkUsers = await clerk.users.getUserList({
        limit: 500,
      });
      
      allClerkUsers.data.forEach((user) => {
        validClerkUserIds.add(user.id);
      });
      
      console.log("[API] Clerk에 존재하는 사용자 수:", validClerkUserIds.size);
    } catch (clerkError) {
      console.error("[API] Clerk 사용자 목록 조회 실패:", clerkError);
      // Clerk API 실패 시 기존 방식으로 폴백
    }

    // 쿼리 구성 (clerk_user_id가 NULL이 아니고 빈 문자열이 아닌 에이전트만 조회)
    let query = supabase
      .from("accounts")
      .select("id, clerk_user_id, email, name, dre_number, brokerage_name, is_approved, approved_at, approved_by, created_at")
      .eq("role", "agent")
      .not("clerk_user_id", "is", null)
      .neq("clerk_user_id", "")
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

    // Clerk에 실제로 존재하는 에이전트 확인
    let filteredAgents = agents || [];
    const missingAgents = (agents || []).filter((agent) =>
      agent.clerk_user_id && !validClerkUserIds.has(agent.clerk_user_id)
    );
    
    if (validClerkUserIds.size > 0 && missingAgents.length > 0) {
      // Clerk에 존재하지 않는 에이전트가 있지만, 데이터베이스 기준으로 모두 포함
      console.log("[API] Clerk에 존재하지 않는 에이전트:", {
        count: missingAgents.length,
        agents: missingAgents.map(a => ({ id: a.id, clerk_id: a.clerk_user_id, email: a.email })),
      });
      console.log("[API] 경고: Clerk에 존재하지 않는 에이전트가 데이터베이스에 있습니다. 데이터베이스 기준으로 모두 포함합니다.");
      // 모든 에이전트를 포함 (Clerk 필터링 제거)
      filteredAgents = agents || [];
    } else if (validClerkUserIds.size > 0) {
      // Clerk에 모두 존재하는 경우에만 필터링
      filteredAgents = (agents || []).filter((agent) =>
        agent.clerk_user_id && validClerkUserIds.has(agent.clerk_user_id)
      );
      console.log("[API] Clerk 필터링 적용:", {
        before: agents?.length || 0,
        after: filteredAgents.length,
      });
    }

    console.log("[API] Agents 조회 성공:", {
      count: filteredAgents.length,
      status,
    });

    return NextResponse.json({
      success: true,
      agents: filteredAgents,
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


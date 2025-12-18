import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * GET /api/admin/dashboard/stats
 * 관리자 대시보드 통계 데이터를 조회합니다.
 */
export async function GET() {
  try {
    console.log("[API] GET /api/admin/dashboard/stats 호출 시작");

    // ADMIN 권한 확인
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const supabase = getServiceRoleClient();

    // Clerk에서 실제로 존재하는 모든 사용자 ID 가져오기
    const clerk = await clerkClient();
    let validClerkUserIds: Set<string> = new Set();
    let clerkAgentUserIds: Set<string> = new Set(); // 에이전트 역할 사용자만
    
    try {
      // Clerk에서 모든 사용자 가져오기
      const allClerkUsers = await clerk.users.getUserList({
        limit: 500, // 충분한 수
      });
      
      // 실제로 존재하는 Clerk 사용자 ID만 Set에 저장
      allClerkUsers.data.forEach((user) => {
        validClerkUserIds.add(user.id);
        
        // 에이전트 역할을 가진 사용자만 별도로 저장
        const role = user.publicMetadata?.role as string | undefined;
        if (role === "agent") {
          clerkAgentUserIds.add(user.id);
        }
      });
      
      // 데이터베이스의 모든 에이전트 clerk_user_id를 직접 확인
      // getUserList에 포함되지 않을 수 있는 사용자들을 확인하기 위해
      const { data: dbAgents } = await supabase
        .from("accounts")
        .select("clerk_user_id")
        .eq("role", "agent")
        .not("clerk_user_id", "is", null)
        .neq("clerk_user_id", "");
      
      if (dbAgents) {
        const dbAgentIds = dbAgents.map(a => a.clerk_user_id).filter(Boolean);
        console.log("[API] 데이터베이스의 에이전트 Clerk ID 목록:", dbAgentIds);
        
        // 각 에이전트 ID를 직접 조회하여 Clerk에 존재하는지 확인
        for (const agentId of dbAgentIds) {
          if (!validClerkUserIds.has(agentId)) {
            try {
              const specificUser = await clerk.users.getUser(agentId);
              if (specificUser) {
                validClerkUserIds.add(specificUser.id);
                const role = specificUser.publicMetadata?.role as string | undefined;
                console.log("[API] 직접 조회로 발견된 사용자:", {
                  id: specificUser.id,
                  email: specificUser.emailAddresses[0]?.emailAddress,
                  role: specificUser.publicMetadata?.role,
                });
                // 역할과 관계없이 데이터베이스에 agent로 등록되어 있으면 포함
                // (Clerk의 역할 설정과 데이터베이스의 역할이 다를 수 있음)
              }
            } catch (specificUserError: any) {
              console.log("[API] 사용자 직접 조회 실패:", {
                clerk_id: agentId,
                error: specificUserError?.message || "Unknown error",
              });
            }
          }
        }
      }
      
      // 디버깅: 모든 Clerk 사용자의 역할 정보 출력
      console.log("[API] Clerk에 존재하는 사용자 수:", validClerkUserIds.size);
      console.log("[API] Clerk에 존재하는 에이전트 역할 사용자 수:", clerkAgentUserIds.size);
      console.log("[API] Clerk 에이전트 역할 사용자 ID:", Array.from(clerkAgentUserIds));
      console.log("[API] Clerk 모든 사용자 역할 정보:", 
        allClerkUsers.data.map(u => ({
          id: u.id,
          email: u.emailAddresses[0]?.emailAddress,
          role: u.publicMetadata?.role,
          metadata: u.publicMetadata
        }))
      );
    } catch (clerkError) {
      console.error("[API] Clerk 사용자 목록 조회 실패:", clerkError);
      // Clerk API 실패 시 기존 방식으로 폴백
    }

    // 병렬로 모든 통계 조회
    const [
      clientsResult,
      agentsResult,
      pendingAgentsResult,
      messagesResult,
    ] = await Promise.all([
      // 전체 클라이언트 수
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true }),
      
      // 전체 에이전트 수 (clerk_user_id가 NULL이 아니고 빈 문자열이 아닌 것만)
      supabase
        .from("accounts")
        .select("id, clerk_user_id", { count: "exact" })
        .eq("role", "agent")
        .not("clerk_user_id", "is", null)
        .neq("clerk_user_id", ""),
      
      // 승인 대기 중인 에이전트 수
      supabase
        .from("accounts")
        .select("id, clerk_user_id", { count: "exact" })
        .eq("role", "agent")
        .eq("is_approved", false)
        .not("clerk_user_id", "is", null)
        .neq("clerk_user_id", ""),
      
      // 전체 메시지 수
      supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true }),
    ]);

    // Clerk에 실제로 존재하는 에이전트만 필터링
    let totalAgents = 0;
    let pendingAgents = 0;
    
    console.log("[API] 디버깅 정보:", {
      validClerkUserIdsSize: validClerkUserIds.size,
      agentsResultDataLength: agentsResult.data?.length,
      agentsResultCount: agentsResult.count,
      pendingAgentsResultDataLength: pendingAgentsResult.data?.length,
      pendingAgentsResultCount: pendingAgentsResult.count,
    });
    
    if (validClerkUserIds.size > 0) {
      // Clerk API가 성공한 경우, 데이터를 다시 조회하여 필터링
      const { data: allAgents } = await supabase
        .from("accounts")
        .select("id, clerk_user_id")
        .eq("role", "agent")
        .not("clerk_user_id", "is", null)
        .neq("clerk_user_id", "");
      
      const { data: allPendingAgents } = await supabase
        .from("accounts")
        .select("id, clerk_user_id, is_approved")
        .eq("role", "agent")
        .eq("is_approved", false)
        .not("clerk_user_id", "is", null)
        .neq("clerk_user_id", "");
      
      console.log("[API] 데이터베이스의 모든 에이전트:", {
        total: allAgents?.map(a => ({ id: a.id, clerk_id: a.clerk_user_id })) || [],
        pending: allPendingAgents?.map(a => ({ id: a.id, clerk_id: a.clerk_user_id, is_approved: a.is_approved })) || [],
      });
      
      // Clerk에 실제로 존재하는 에이전트만 카운트
      // 중요: 데이터베이스에 있는 에이전트 중 Clerk에 실제로 존재하는 사용자만 카운트
      // (Clerk의 역할 설정과 관계없이, 데이터베이스에 role='agent'로 등록된 사용자)
      const validAgents = allAgents?.filter((agent) =>
        agent.clerk_user_id && validClerkUserIds.has(agent.clerk_user_id)
      ) || [];
      
      const validPendingAgents = allPendingAgents?.filter((agent) =>
        agent.clerk_user_id && validClerkUserIds.has(agent.clerk_user_id)
      ) || [];
      
      // 디버깅: Clerk에 존재하지 않는 에이전트도 확인
      const missingAgents = allAgents?.filter((agent) =>
        agent.clerk_user_id && !validClerkUserIds.has(agent.clerk_user_id)
      ) || [];
      
      const missingPendingAgents = allPendingAgents?.filter((agent) =>
        agent.clerk_user_id && !validClerkUserIds.has(agent.clerk_user_id)
      ) || [];
      
      console.log("[API] Clerk에 존재하지 않는 에이전트:", {
        total: missingAgents.map(a => ({ id: a.id, clerk_id: a.clerk_user_id })),
        pending: missingPendingAgents.map(a => ({ id: a.id, clerk_id: a.clerk_user_id, is_approved: a.is_approved })),
      });
      
      totalAgents = validAgents.length;
      pendingAgents = validPendingAgents.length;
      
      // 임시 해결책: Clerk에 존재하지 않더라도 데이터베이스에 등록된 에이전트는 포함
      // (Clerk API 조회 실패 시에도 데이터베이스 기준으로 통계 표시)
      if (missingAgents.length > 0 || missingPendingAgents.length > 0) {
        console.log("[API] 경고: Clerk에 존재하지 않는 에이전트가 데이터베이스에 있습니다. 데이터베이스 기준으로 카운트합니다.");
        totalAgents = allAgents?.length || 0;
        pendingAgents = allPendingAgents?.length || 0;
      }
      
      console.log("[API] Clerk 필터링 후:", {
        totalAgents,
        pendingAgents,
        validAgents: validAgents.map(a => ({ id: a.id, clerk_id: a.clerk_user_id })),
        validPendingAgents: validPendingAgents.map(a => ({ id: a.id, clerk_id: a.clerk_user_id })),
        clerkAgentIds: Array.from(clerkAgentUserIds),
      });
    } else {
      // Clerk API 실패 시 기존 방식 사용
      totalAgents = agentsResult.count || 0;
      pendingAgents = pendingAgentsResult.count || 0;
      console.log("[API] Clerk API 실패, 기존 방식 사용:", {
        totalAgents,
        pendingAgents,
      });
    }

    // 최근 활동 (최근 7일간 가입한 클라이언트와 에이전트)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [recentClientsResult, recentAgentsResult] = await Promise.all([
      supabase
        .from("clients")
        .select("id, name, created_at")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(5),
      
      supabase
        .from("accounts")
        .select("id, name, email, clerk_user_id, created_at")
        .eq("role", "agent")
        .not("clerk_user_id", "is", null)
        .neq("clerk_user_id", "")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    // 최근 에이전트도 Clerk에 존재하는 것만 필터링
    let recentAgents = recentAgentsResult.data || [];
    if (validClerkUserIds.size > 0) {
      recentAgents = recentAgents.filter((agent: any) =>
        agent.clerk_user_id && validClerkUserIds.has(agent.clerk_user_id)
      );
    }

    const stats = {
      totalClients: clientsResult.count || 0,
      totalAgents,
      pendingAgents,
      totalMessages: messagesResult.count || 0,
      recentClients: recentClientsResult.data || [],
      recentAgents,
    };

    console.log("[API] Dashboard stats 조회 성공:", stats);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("[API] Error in GET /api/admin/dashboard/stats:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


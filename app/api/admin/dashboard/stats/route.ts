import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

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
      
      // 전체 에이전트 수
      supabase
        .from("accounts")
        .select("id", { count: "exact", head: true })
        .eq("role", "agent"),
      
      // 승인 대기 중인 에이전트 수
      supabase
        .from("accounts")
        .select("id", { count: "exact", head: true })
        .eq("role", "agent")
        .eq("is_approved", false),
      
      // 전체 메시지 수
      supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true }),
    ]);

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
        .select("id, name, email, created_at")
        .eq("role", "agent")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const stats = {
      totalClients: clientsResult.count || 0,
      totalAgents: agentsResult.count || 0,
      pendingAgents: pendingAgentsResult.count || 0,
      totalMessages: messagesResult.count || 0,
      recentClients: recentClientsResult.data || [],
      recentAgents: recentAgentsResult.data || [],
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


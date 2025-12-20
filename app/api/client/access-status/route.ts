import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getClientIdForUser } from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/client/access-status
 * 클라이언트의 주거옵션 및 체크리스트 탭 접근 권한을 확인합니다.
 * 
 * 반환값:
 * - canAccessHousing: 주거옵션 탭 접근 가능 여부
 * - canAccessChecklist: 체크리스트 탭 접근 가능 여부
 * - isDevelopment: 개발환경 여부
 * - agentApproved: 에이전트 승인 여부
 */
export async function GET(request: Request) {
  try {
    console.log("[API] GET /api/client/access-status 호출");

    // 인증 확인
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 개발환경 확인
    const isDevelopment = process.env.NODE_ENV === "development";

    const supabase = createClerkSupabaseClient();

    // 클라이언트 본인 또는 권한 부여된 사용자의 client_id 조회
    const clientId = await getClientIdForUser(userId);

    if (!clientId) {
      console.log("[API] 클라이언트 레코드를 찾을 수 없음");
      return NextResponse.json({
        canAccessHousing: false,
        canAccessChecklist: false,
        isDevelopment,
        agentApproved: false,
        reason: "no_client",
      });
    }

    // 클라이언트 정보 조회 (owner_agent_id 포함)
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("owner_agent_id")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      console.error("[API] 클라이언트 조회 실패:", clientError);
      return NextResponse.json({
        canAccessHousing: false,
        canAccessChecklist: false,
        isDevelopment,
        agentApproved: false,
        reason: "client_fetch_error",
      });
    }

    // 에이전트가 할당되지 않은 경우
    if (!client.owner_agent_id) {
      console.log("[API] 에이전트가 할당되지 않음");
      return NextResponse.json({
        canAccessHousing: false,
        canAccessChecklist: false,
        isDevelopment,
        agentApproved: false,
        reason: "no_agent",
      });
    }

    // 에이전트 승인 상태 확인 (정보 제공용)
    const { data: agent, error: agentError } = await supabase
      .from("accounts")
      .select("is_approved")
      .eq("id", client.owner_agent_id)
      .single();

    const agentApproved = agent && !agentError ? agent.is_approved === true : false;

    // 에이전트가 배정되면 탭 접근 허용 (에이전트 승인 여부와 관계없이)
    // 단, 에이전트 승인 상태는 정보 제공용으로 반환
    const canAccess = !!client.owner_agent_id;

    console.log("[API] 탭 접근 권한 확인 완료:", {
      clientId,
      agentId: client.owner_agent_id,
      agentApproved,
      canAccess,
      isDevelopment,
    });

    return NextResponse.json({
      canAccessHousing: canAccess,
      canAccessChecklist: canAccess,
      isDevelopment,
      agentApproved,
      reason: canAccess ? (agentApproved ? "approved" : "assigned") : "no_agent",
    });
  } catch (error) {
    console.error("[API] Error in GET /api/client/access-status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


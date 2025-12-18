import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * GET /api/admin/agents/[id]
 * 관리자가 특정 에이전트의 상세 정보를 조회합니다.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log("[API] GET /api/admin/agents/[id] 호출:", { id });

    // ADMIN 권한 확인
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const supabase = getServiceRoleClient();

    // 에이전트 상세 정보 조회
    const { data: agent, error: agentError } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", id)
      .eq("role", "agent")
      .single();

    if (agentError || !agent) {
      console.error("[API] Agent 조회 실패:", agentError);
      return NextResponse.json(
        {
          error: "Agent not found",
          details: agentError?.message,
        },
        { status: 404 }
      );
    }

    // 에이전트의 클라이언트 수 조회
    const { count: clientCount } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("owner_agent_id", id);

    // 에이전트의 클라이언트 목록 (최근 5개)
    const { data: recentClients } = await supabase
      .from("clients")
      .select("id, name, email, moving_date, created_at")
      .eq("owner_agent_id", id)
      .order("created_at", { ascending: false })
      .limit(5);

    console.log("[API] Agent 상세 조회 성공:", { id });

    return NextResponse.json({
      success: true,
      agent: {
        ...agent,
        clientCount: clientCount || 0,
        recentClients: recentClients || [],
      },
    });
  } catch (error) {
    console.error("[API] Error in GET /api/admin/agents/[id]:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/agents/[id]
 * 관리자가 에이전트 정보를 수정합니다.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    console.log("[API] PATCH /api/admin/agents/[id] 호출:", { id, body });

    // ADMIN 권한 확인
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const supabase = getServiceRoleClient();

    // 업데이트 가능한 필드만 추출
    const updateData: Record<string, any> = {};
    const allowedFields = [
      "name",
      "email",
      "dre_number",
      "brokerage_name",
      "is_approved",
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // 승인 상태 변경 시 타임스탬프 업데이트
    if (body.is_approved !== undefined) {
      if (body.is_approved) {
        updateData.approved_at = new Date().toISOString();
        // TODO: approved_by에 관리자 clerk_id 추가
      } else {
        updateData.approved_at = null;
        updateData.approved_by = null;
      }
    }

    const { data: updatedAgent, error: updateError } = await supabase
      .from("accounts")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError || !updatedAgent) {
      console.error("[API] Agent 업데이트 실패:", updateError);
      return NextResponse.json(
        {
          error: "Failed to update agent",
          details: updateError?.message,
        },
        { status: 500 }
      );
    }

    console.log("[API] Agent 업데이트 성공:", { id });

    return NextResponse.json({
      success: true,
      agent: updatedAgent,
    });
  } catch (error) {
    console.error("[API] Error in PATCH /api/admin/agents/[id]:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


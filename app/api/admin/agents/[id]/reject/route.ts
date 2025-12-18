import { NextResponse } from "next/server";
import { isAdmin, getAuthUserId } from "@/lib/auth";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { z } from "zod";

const rejectAgentSchema = z.object({
  reason: z.string().optional(),
});

/**
 * POST /api/admin/agents/[id]/reject
 * ADMIN이 에이전트를 거부합니다.
 * (현재는 승인만 구현하지만, 향후 거부 기능을 위해 준비)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("[API] POST /api/admin/agents/[id]/reject 호출 시작");

    // ADMIN 권한 확인
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const adminUserId = await getAuthUserId();
    const { id: agentId } = await params;
    const supabase = getServiceRoleClient();

    // 요청 본문 파싱
    const body = await request.json().catch(() => ({}));
    const validationResult = rejectAgentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { reason } = validationResult.data;

    // Account 조회
    const { data: account, error: fetchError } = await supabase
      .from("accounts")
      .select("id, clerk_user_id, email, name, is_approved")
      .eq("id", agentId)
      .eq("role", "agent")
      .single();

    if (fetchError || !account) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // 알림 생성 (거부 알림)
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_clerk_id: account.clerk_user_id,
        type: "agent_rejected",
        title: "에이전트 승인 거부",
        message: reason
          ? `에이전트 승인이 거부되었습니다. 사유: ${reason}`
          : "에이전트 승인이 거부되었습니다. 자세한 내용은 관리자에게 문의해주세요.",
        metadata: {
          agent_id: account.id,
          rejected_by: adminUserId,
          reason: reason || null,
        },
      });

    if (notificationError) {
      console.error("[API] 알림 생성 실패:", notificationError);
    }

    console.log("[API] Agent 거부 알림 생성 성공:", {
      agentId: account.id,
      rejectedBy: adminUserId,
    });

    return NextResponse.json({
      success: true,
      message: "Agent rejection notification sent",
    });
  } catch (error) {
    console.error("[API] Error in POST /api/admin/agents/[id]/reject:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


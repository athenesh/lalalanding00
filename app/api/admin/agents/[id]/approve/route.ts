import { NextResponse } from "next/server";
import { isAdmin, getAuthUserId } from "@/lib/auth";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * POST /api/admin/agents/[id]/approve
 * ADMIN이 에이전트를 승인합니다.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("[API] POST /api/admin/agents/[id]/approve 호출 시작");

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

    // 요청 본문 파싱 (선택사항: 거부 사유 등)
    const body = await request.json().catch(() => ({}));
    const { rejectReason } = body;

    // Account 조회
    const { data: account, error: fetchError } = await supabase
      .from("accounts")
      .select("id, clerk_user_id, email, name, is_approved, dre_number, brokerage_name")
      .eq("id", agentId)
      .eq("role", "agent")
      .single();

    if (fetchError || !account) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    if (account.is_approved) {
      return NextResponse.json(
        { error: "Agent is already approved" },
        { status: 400 }
      );
    }

    // 승인 처리
    const { data: updatedAccount, error: updateError } = await supabase
      .from("accounts")
      .update({
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: adminUserId,
      })
      .eq("id", agentId)
      .select()
      .single();

    if (updateError || !updatedAccount) {
      console.error("[API] Agent 승인 실패:", updateError);
      return NextResponse.json(
        {
          error: "Failed to approve agent",
          details: updateError?.message,
        },
        { status: 500 }
      );
    }

    // 알림 생성
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_clerk_id: account.clerk_user_id,
        type: "agent_approved",
        title: "에이전트 승인 완료",
        message: "축하합니다! 에이전트 승인이 완료되었습니다. 이제 서비스를 이용하실 수 있습니다.",
        metadata: {
          agent_id: account.id,
          approved_by: adminUserId,
        },
      });

    if (notificationError) {
      console.error("[API] 알림 생성 실패:", notificationError);
      // 알림 실패는 치명적이지 않으므로 계속 진행
    }

    console.log("[API] Agent 승인 성공:", {
      agentId: account.id,
      approvedBy: adminUserId,
    });

    return NextResponse.json({
      success: true,
      agent: {
        id: updatedAccount.id,
        email: updatedAccount.email,
        name: updatedAccount.name,
        isApproved: updatedAccount.is_approved,
        approvedAt: updatedAccount.approved_at,
      },
    });
  } catch (error) {
    console.error("[API] Error in POST /api/admin/agents/[id]/approve:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


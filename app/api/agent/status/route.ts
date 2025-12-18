import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/agent/status
 * 에이전트의 승인 상태 및 정보를 조회합니다.
 */
export async function GET() {
  try {
    console.log("[API] GET /api/agent/status 호출 시작");

    const userId = await getAuthUserId();
    const supabase = createClerkSupabaseClient();

    // Account 조회
    const { data: account, error } = await supabase
      .from("accounts")
      .select("id, is_approved, dre_number, brokerage_name, approved_at")
      .eq("clerk_user_id", userId)
      .single();

    if (error || !account) {
      console.error("[API] Account 조회 실패:", error);
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    console.log("[API] Account 상태 조회 성공:", {
      accountId: account.id,
      isApproved: account.is_approved,
    });

    return NextResponse.json({
      isApproved: account.is_approved,
      dreNumber: account.dre_number,
      brokerageName: account.brokerage_name,
      approvedAt: account.approved_at,
    });
  } catch (error) {
    console.error("[API] Error in GET /api/agent/status:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { getAuthUserId, getAuthRole } from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const completeAgentSchema = z.object({
  dreNumber: z.string().regex(/^\d{6,8}$/, "DRE 번호는 6-8자리 숫자여야 합니다."),
  brokerageName: z.string().min(1, "Brokerage 이름을 입력해주세요."),
});

/**
 * POST /api/agent/complete
 * 에이전트의 DRE 번호와 Brokerage 이름을 저장합니다.
 */
export async function POST(request: Request) {
  try {
    console.log("[API] POST /api/agent/complete 호출 시작");

    // 에이전트 권한 확인
    const role = await getAuthRole();
    if (role !== "agent") {
      return NextResponse.json(
        { error: "Only agents can complete this form" },
        { status: 403 }
      );
    }

    const userId = await getAuthUserId();
    const supabase = createClerkSupabaseClient();

    // 요청 본문 파싱 및 검증
    const body = await request.json();
    const validationResult = completeAgentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { dreNumber, brokerageName } = validationResult.data;

    // DRE 번호 중복 확인
    const { data: existingAccount, error: checkError } = await supabase
      .from("accounts")
      .select("id")
      .eq("dre_number", dreNumber)
      .neq("clerk_user_id", userId)
      .single();

    if (existingAccount) {
      return NextResponse.json(
        { error: "DRE 번호가 이미 사용 중입니다." },
        { status: 400 }
      );
    }

    // Account 업데이트
    const { data: account, error: updateError } = await supabase
      .from("accounts")
      .update({
        dre_number: dreNumber,
        brokerage_name: brokerageName,
      })
      .eq("clerk_user_id", userId)
      .select()
      .single();

    if (updateError || !account) {
      console.error("[API] Account 업데이트 실패:", updateError);
      return NextResponse.json(
        {
          error: "Failed to update account",
          details: updateError?.message,
        },
        { status: 500 }
      );
    }

    console.log("[API] Agent 정보 저장 성공:", {
      accountId: account.id,
      dreNumber,
      brokerageName,
    });

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        dreNumber: account.dre_number,
        brokerageName: account.brokerage_name,
        isApproved: account.is_approved,
      },
    });
  } catch (error) {
    console.error("[API] Error in POST /api/agent/complete:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


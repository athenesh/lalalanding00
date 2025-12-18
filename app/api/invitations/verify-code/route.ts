import { NextResponse } from "next/server";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const verifyCodeSchema = z.object({
  code: z.string().length(6, "초대 코드는 6자리여야 합니다."),
});

/**
 * GET /api/invitations/verify-code?code=XXX
 * 초대 코드의 유효성을 검증합니다.
 * 회원가입 페이지에서 사용됩니다.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Code is required" },
        { status: 400 }
      );
    }

    // 코드 형식 검증
    const validationResult = verifyCodeSchema.safeParse({ code });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid code format" },
        { status: 400 }
      );
    }

    const supabase = createClerkSupabaseClient();

    // 초대 정보 조회
    const { data: invitation, error: fetchError } = await supabase
      .from("client_invitations")
      .select("id, agent_id, email, expires_at, used_at, created_at, invitation_token")
      .eq("invitation_code", code.toUpperCase())
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // 만료 여부 확인
    const isExpired = new Date(invitation.expires_at) < new Date();

    // 사용 여부 확인
    const isUsed = invitation.used_at !== null;

    // 유효성 검증
    if (isExpired) {
      return NextResponse.json(
        {
          valid: false,
          error: "Invitation has expired",
          invitation: {
            id: invitation.id,
            expiresAt: invitation.expires_at,
          },
        },
        { status: 200 }
      );
    }

    if (isUsed) {
      return NextResponse.json(
        {
          valid: false,
          error: "Invitation has already been used",
          invitation: {
            id: invitation.id,
            usedAt: invitation.used_at,
          },
        },
        { status: 200 }
      );
    }

    // 에이전트 정보 조회
    const { data: agent, error: agentError } = await supabase
      .from("accounts")
      .select("id, name, email")
      .eq("id", invitation.agent_id)
      .single();

    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation.id,
        agentId: invitation.agent_id,
        agentName: agent?.name || null,
        agentEmail: agent?.email || null,
        email: invitation.email,
        expiresAt: invitation.expires_at,
        createdAt: invitation.created_at,
        token: invitation.invitation_token, // 토큰도 반환하여 회원가입 시 사용
      },
    });
  } catch (error) {
    console.error("[API] Error in GET /api/invitations/verify-code:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


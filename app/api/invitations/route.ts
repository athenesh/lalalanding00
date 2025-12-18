import { NextResponse } from "next/server";
import { requireAgent, getOrCreateAccount } from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";
import { randomUUID } from "crypto";

const createInvitationSchema = z.object({
  email: z.string().email().optional(),
  expiresInDays: z.number().int().min(1).max(90).default(30), // 기본 30일
});

/**
 * POST /api/invitations
 * 에이전트가 클라이언트 초대 링크를 생성합니다.
 */
export async function POST(request: Request) {
  try {
    console.log("[API] POST /api/invitations 호출 시작");

    // 에이전트 권한 확인
    await requireAgent();

    const supabase = createClerkSupabaseClient();
    const account = await getOrCreateAccount();

    // 요청 본문 파싱
    const body = await request.json().catch(() => ({}));
    const validationResult = createInvitationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { email, expiresInDays } = validationResult.data;

    // 초대 토큰 생성
    const invitationToken = randomUUID();

    // 초대 코드 생성 (6자리 영숫자)
    const generateInvitationCode = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 혼동하기 쉬운 문자 제외 (0, O, I, 1)
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let invitationCode = generateInvitationCode();
    let codeExists = true;
    let attempts = 0;
    const maxAttempts = 10;

    // 중복되지 않는 코드 생성
    while (codeExists && attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from("client_invitations")
        .select("id")
        .eq("invitation_code", invitationCode)
        .single();

      if (!existing) {
        codeExists = false;
      } else {
        invitationCode = generateInvitationCode();
        attempts++;
      }
    }

    if (codeExists) {
      return NextResponse.json(
        {
          error: "Failed to generate unique invitation code",
        },
        { status: 500 }
      );
    }

    // 만료 시간 계산 (현재 시간 + expiresInDays일)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    console.log("[API] Creating invitation:", {
      agentId: account.id,
      email,
      token: invitationToken,
      code: invitationCode,
      expiresAt: expiresAt.toISOString(),
    });

    // 초대 레코드 생성
    const { data: invitation, error: createError } = await supabase
      .from("client_invitations")
      .insert({
        agent_id: account.id,
        invitation_token: invitationToken,
        invitation_code: invitationCode,
        email: email || null,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error("[API] Invitation creation error:", createError);
      return NextResponse.json(
        {
          error: "Failed to create invitation",
          details: createError.message,
        },
        { status: 500 }
      );
    }

    // 초대 링크 생성
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const invitationLink = `${baseUrl}/sign-up/client?token=${invitationToken}`;

    console.log("[API] Invitation created successfully:", {
      invitationId: invitation.id,
      token: invitationToken,
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        token: invitationToken,
        code: invitationCode,
        link: invitationLink,
        email: invitation.email,
        expiresAt: invitation.expires_at,
        createdAt: invitation.created_at,
      },
    });
  } catch (error) {
    console.error("[API] Error in POST /api/invitations:", error);
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
 * GET /api/invitations
 * 에이전트가 생성한 초대 목록을 조회합니다.
 */
export async function GET() {
  try {
    console.log("[API] GET /api/invitations 호출 시작");

    // 에이전트 권한 확인
    await requireAgent();

    const supabase = createClerkSupabaseClient();
    const account = await getOrCreateAccount();

    // 초대 목록 조회
    const { data: invitations, error: fetchError } = await supabase
      .from("client_invitations")
      .select("*")
      .eq("agent_id", account.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("[API] Invitations fetch error:", fetchError);
      return NextResponse.json(
        {
          error: "Failed to fetch invitations",
          details: fetchError.message,
        },
        { status: 500 }
      );
    }

    // 초대 링크 생성
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const invitationsWithLinks = invitations.map((invitation) => ({
      ...invitation,
      link: `${baseUrl}/sign-up/client?token=${invitation.invitation_token}`,
      codeLink: invitation.invitation_code
        ? `${baseUrl}/sign-up/client?code=${invitation.invitation_code}`
        : null,
      isExpired: new Date(invitation.expires_at) < new Date(),
      isUsed: invitation.used_at !== null,
    }));

    console.log("[API] Invitations fetched successfully:", {
      count: invitationsWithLinks.length,
    });

    return NextResponse.json({
      success: true,
      invitations: invitationsWithLinks,
    });
  } catch (error) {
    console.error("[API] Error in GET /api/invitations:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


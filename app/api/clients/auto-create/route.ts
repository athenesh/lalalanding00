import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAuthRole } from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * POST /api/clients/auto-create
 * 클라이언트 회원가입 시 자동으로 clients 테이블에 레코드를 생성합니다.
 * clerk_user_id로 중복 생성 방지
 * 
 * Request Body (optional):
 * {
 *   invitationToken?: string; // 초대 토큰이 있으면 owner_agent_id 자동 할당
 * }
 */
export async function POST(request: Request) {
  try {
    // API 호출 시작 로그
    console.log("[API] POST /api/clients/auto-create 호출 시작");

    // 인증 확인 (리다이렉트 없이)
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 클라이언트 역할 확인
    const role = await getAuthRole();
    if (role !== "client") {
      return NextResponse.json(
        { error: "Only clients can create client records" },
        { status: 403 }
      );
    }
    const supabase = createClerkSupabaseClient();

    // 요청 본문에서 초대 토큰 가져오기
    let invitationToken: string | null = null;
    try {
      const body = await request.json().catch(() => ({}));
      invitationToken = body.invitationToken || null;
    } catch {
      // 본문이 없어도 계속 진행
    }

    // Clerk에서 사용자 정보 가져오기
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);

    if (!clerkUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 이미 클라이언트 레코드가 있는지 확인
    const { data: existingClient, error: checkError } = await supabase
      .from("clients")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116은 "not found" 에러이므로 무시
      console.error("[API] Error checking existing client:", checkError);
      return NextResponse.json(
        { error: "Failed to check existing client", details: checkError.message },
        { status: 500 }
      );
    }

    // 초대 토큰이 있으면 검증 및 에이전트 정보 가져오기
    let ownerAgentId: string | null = null;
    if (invitationToken) {
      console.log("[API] Validating invitation token:", invitationToken);
      
      const { data: invitation, error: invitationError } = await supabase
        .from("client_invitations")
        .select("id, agent_id, expires_at, used_at")
        .eq("invitation_token", invitationToken)
        .single();

      if (invitationError || !invitation) {
        console.error("[API] Invalid invitation token:", invitationError);
        return NextResponse.json(
          { error: "Invalid or expired invitation token" },
          { status: 400 }
        );
      }

      // 만료 여부 확인
      if (new Date(invitation.expires_at) < new Date()) {
        return NextResponse.json(
          { error: "Invitation token has expired" },
          { status: 400 }
        );
      }

      // 사용 여부 확인
      if (invitation.used_at) {
        return NextResponse.json(
          { error: "Invitation token has already been used" },
          { status: 400 }
        );
      }

      ownerAgentId = invitation.agent_id;
      console.log("[API] Invitation validated, agent ID:", ownerAgentId);
    }

    // 이미 레코드가 있으면 반환
    if (existingClient) {
      console.log("[API] Client record already exists:", {
        clientId: existingClient.id,
        userId,
      });
      return NextResponse.json({
        success: true,
        client: existingClient,
        message: "Client record already exists",
      });
    }

    // 새 클라이언트 레코드 생성
    const email = clerkUser.emailAddresses[0]?.emailAddress || "";
    const name = clerkUser.fullName || 
                 [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
                 clerkUser.username ||
                 "Unknown";

    console.log("[API] Creating new client record:", {
      userId,
      name,
      email,
      ownerAgentId,
      invitationToken,
    });

    const { data: newClient, error: createError } = await supabase
      .from("clients")
      .insert({
        clerk_user_id: userId,
        owner_agent_id: ownerAgentId,
        invitation_token: invitationToken,
        access_level: "invited", // 초대받은 상태
        name: name,
        email: email,
        phone_kr: null,
        phone_us: null,
        occupation: null, // 나중에 클라이언트가 입력
        moving_date: null, // 나중에 클라이언트가 입력
        relocation_type: null, // 나중에 클라이언트가 입력
        birth_date: null,
      })
      .select()
      .single();

    if (createError) {
      console.error("[API] Client creation error:", {
        userId,
        error: createError,
        errorCode: createError?.code,
        errorMessage: createError?.message,
      });
      return NextResponse.json(
        {
          error: "Failed to create client record",
          details: createError.message,
        },
        { status: 500 }
      );
    }

    // 초대 토큰을 사용된 것으로 표시
    if (invitationToken) {
      const { error: updateInvitationError } = await supabase
        .from("client_invitations")
        .update({ used_at: new Date().toISOString() })
        .eq("invitation_token", invitationToken);

      if (updateInvitationError) {
        console.error("[API] Failed to mark invitation as used:", updateInvitationError);
        // 에러가 나도 클라이언트 생성은 성공했으므로 계속 진행
      } else {
        console.log("[API] Invitation marked as used:", invitationToken);
      }
    }

    console.log("[API] Client record created successfully:", {
      clientId: newClient.id,
      userId,
      ownerAgentId,
    });

    return NextResponse.json({
      success: true,
      client: newClient,
    });
  } catch (error) {
    console.error("[API] Error in POST /api/clients/auto-create:", {
      error,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


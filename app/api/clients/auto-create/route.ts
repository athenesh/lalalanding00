import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAuthRole, isAgentApproved } from "@/lib/auth";
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
      console.error("[API] POST /api/clients/auto-create: 인증 실패 - userId 없음");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[API] POST /api/clients/auto-create: userId 확인됨", { userId });

    // 클라이언트 역할 확인
    let role: "agent" | "client" | null = null;
    try {
      role = await getAuthRole();
      console.log("[API] POST /api/clients/auto-create: 역할 확인됨", { role, userId });
    } catch (roleError) {
      console.error("[API] POST /api/clients/auto-create: 역할 확인 실패", {
        error: roleError,
        userId,
      });
      return NextResponse.json(
        {
          error: "Failed to verify user role",
          details: roleError instanceof Error ? roleError.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    if (role !== "client") {
      console.warn("[API] POST /api/clients/auto-create: 클라이언트 역할이 아님", {
        role,
        userId,
      });
      return NextResponse.json(
        { error: "Only clients can create client records" },
        { status: 403 }
      );
    }

    const supabase = createClerkSupabaseClient();

    // 요청 본문에서 초대 토큰 또는 코드 가져오기
    let invitationToken: string | null = null;
    let invitationCode: string | null = null;
    try {
      const body = await request.json().catch(() => ({}));
      invitationToken = body.invitationToken || null;
      invitationCode = body.invitationCode || null;
    } catch {
      // 본문이 없어도 계속 진행
    }

    // Clerk에서 사용자 정보 가져오기
    let clerkUser;
    try {
      const client = await clerkClient();
      clerkUser = await client.users.getUser(userId);
      console.log("[API] POST /api/clients/auto-create: Clerk 사용자 정보 조회 성공", {
        userId,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        name: clerkUser.fullName,
      });
    } catch (clerkError) {
      console.error("[API] POST /api/clients/auto-create: Clerk 사용자 정보 조회 실패", {
        error: clerkError,
        userId,
      });
      return NextResponse.json(
        {
          error: "Failed to fetch user information",
          details: clerkError instanceof Error ? clerkError.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    if (!clerkUser) {
      console.error("[API] POST /api/clients/auto-create: Clerk 사용자 없음", { userId });
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 이미 클라이언트 레코드가 있는지 확인
    console.log("[API] POST /api/clients/auto-create: 기존 클라이언트 레코드 확인 시작", {
      userId,
    });
    const { data: existingClient, error: checkError } = await supabase
      .from("clients")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116은 "not found" 에러이므로 무시
      console.error("[API] POST /api/clients/auto-create: 기존 클라이언트 확인 실패", {
        error: checkError,
        errorCode: checkError.code,
        errorMessage: checkError.message,
        userId,
      });
      return NextResponse.json(
        {
          error: "Failed to check existing client",
          details: checkError.message,
          code: checkError.code,
        },
        { status: 500 }
      );
    }

    if (existingClient) {
      console.log("[API] POST /api/clients/auto-create: 기존 클라이언트 레코드 발견", {
        clientId: existingClient.id,
        userId,
      });
    } else {
      console.log("[API] POST /api/clients/auto-create: 기존 클라이언트 레코드 없음", {
        userId,
      });
    }

    // 초대 토큰 또는 코드가 있으면 검증 및 에이전트 정보 가져오기
    let ownerAgentId: string | null = null;
    let usedInvitationToken: string | null = null;
    
    if (invitationToken) {
      console.log("[API] Validating invitation token:", invitationToken);
      
      const { data: invitation, error: invitationError } = await supabase
        .from("client_invitations")
        .select("id, agent_id, expires_at, used_at, invitation_token")
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
      usedInvitationToken = invitation.invitation_token;
      console.log("[API] Invitation validated, agent ID:", ownerAgentId);

      // 에이전트 승인 상태 확인
      const isApproved = await isAgentApproved(ownerAgentId);
      if (!isApproved) {
        console.warn("[API] Unapproved agent's invitation token used:", {
          agentId: ownerAgentId,
          invitationToken,
        });
        return NextResponse.json(
          {
            error: "이 초대 코드는 승인되지 않은 에이전트가 생성한 코드입니다.",
          },
          { status: 400 }
        );
      }

      console.log("[API] Agent approval check for invitation token:", {
        agentId: ownerAgentId,
        isApproved: true,
      });
    } else if (invitationCode) {
      console.log("[API] Validating invitation code:", invitationCode);
      
      const { data: invitation, error: invitationError } = await supabase
        .from("client_invitations")
        .select("id, agent_id, expires_at, used_at, invitation_token")
        .eq("invitation_code", invitationCode.toUpperCase())
        .single();

      if (invitationError || !invitation) {
        console.error("[API] Invalid invitation code:", invitationError);
        return NextResponse.json(
          { error: "Invalid or expired invitation code" },
          { status: 400 }
        );
      }

      // 만료 여부 확인
      if (new Date(invitation.expires_at) < new Date()) {
        return NextResponse.json(
          { error: "Invitation code has expired" },
          { status: 400 }
        );
      }

      // 사용 여부 확인
      if (invitation.used_at) {
        return NextResponse.json(
          { error: "Invitation code has already been used" },
          { status: 400 }
        );
      }

      ownerAgentId = invitation.agent_id;
      usedInvitationToken = invitation.invitation_token;
      console.log("[API] Invitation code validated, agent ID:", ownerAgentId);

      // 에이전트 승인 상태 확인
      const isApproved = await isAgentApproved(ownerAgentId);
      if (!isApproved) {
        console.warn("[API] Unapproved agent's invitation code used:", {
          agentId: ownerAgentId,
          invitationCode,
        });
        return NextResponse.json(
          {
            error: "이 초대 코드는 승인되지 않은 에이전트가 생성한 코드입니다.",
          },
          { status: 400 }
        );
      }

      console.log("[API] Agent approval check for invitation code:", {
        agentId: ownerAgentId,
        isApproved: true,
      });
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

    console.log("[API] POST /api/clients/auto-create: 새 클라이언트 레코드 생성 시작", {
      userId,
      name,
      email,
      ownerAgentId: ownerAgentId || null,
      invitationToken: usedInvitationToken || null,
      invitationCode: invitationCode || null,
    });

    // owner_agent_id가 null일 수 있으므로 조건부로 포함
    const insertData: any = {
      clerk_user_id: userId,
      invitation_token: usedInvitationToken,
      access_level: "invited", // 초대받은 상태
      name: name,
      email: email || null, // email이 빈 문자열이면 null로 설정
      phone_kr: null,
      phone_us: null,
      occupation: null, // 나중에 클라이언트가 입력
      moving_date: null, // 나중에 클라이언트가 입력
      relocation_type: null, // 나중에 클라이언트가 입력
      birth_date: null,
    };

    // owner_agent_id가 있으면 포함 (null이면 제외하여 데이터베이스 제약 조건 회피)
    if (ownerAgentId) {
      insertData.owner_agent_id = ownerAgentId;
    }

    console.log("[API] POST /api/clients/auto-create: 삽입할 데이터", {
      ...insertData,
      clerk_user_id: userId, // 로그에는 포함하되 민감 정보는 마스킹
    });

    const { data: newClient, error: createError } = await supabase
      .from("clients")
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      console.error("[API] POST /api/clients/auto-create: 클라이언트 레코드 생성 실패", {
        userId,
        error: createError,
        errorCode: createError?.code,
        errorMessage: createError?.message,
        errorDetails: createError?.details,
        insertData: {
          ...insertData,
          clerk_user_id: userId, // 로그용
        },
      });
      return NextResponse.json(
        {
          error: "Failed to create client record",
          details: createError.message,
          code: createError.code,
        },
        { status: 500 }
      );
    }

    console.log("[API] POST /api/clients/auto-create: 클라이언트 레코드 생성 성공", {
      clientId: newClient?.id,
      userId,
      ownerAgentId: ownerAgentId || null,
    });

    // 초대 토큰 또는 코드를 사용된 것으로 표시
    if (usedInvitationToken) {
      const { error: updateInvitationError } = await supabase
        .from("client_invitations")
        .update({ used_at: new Date().toISOString() })
        .eq("invitation_token", usedInvitationToken);

      if (updateInvitationError) {
        console.error("[API] Failed to mark invitation as used:", updateInvitationError);
        // 에러가 나도 클라이언트 생성은 성공했으므로 계속 진행
      } else {
        console.log("[API] Invitation marked as used:", usedInvitationToken);
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
    console.error("[API] POST /api/clients/auto-create: 예상치 못한 에러 발생", {
      error,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorStack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.name : undefined,
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


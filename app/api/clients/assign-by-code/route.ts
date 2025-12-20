import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAuthRole, getClientIdForUser } from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { isAgentApproved } from "@/lib/auth";
import { z } from "zod";

const assignByCodeSchema = z.object({
  code: z.string().length(6, "초대 코드는 6자리여야 합니다."),
});

/**
 * POST /api/clients/assign-by-code
 * 클라이언트가 에이전트 코드를 입력하여 에이전트 배정을 요청합니다.
 */
export async function POST(request: Request) {
  try {
    console.log("[API] POST /api/clients/assign-by-code 호출 시작");

    // 인증 확인
    const { userId } = await auth();
    if (!userId) {
      console.error("[API] POST /api/clients/assign-by-code: 인증 실패 - userId 없음");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 클라이언트 역할 확인
    const role = await getAuthRole();
    if (role !== "client") {
      console.warn("[API] POST /api/clients/assign-by-code: 클라이언트 역할이 아님", {
        role,
        userId,
      });
      return NextResponse.json(
        { error: "Only clients can request agent assignment" },
        { status: 403 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const validationResult = assignByCodeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { code } = validationResult.data;
    const invitationCode = code.toUpperCase();

    console.log("[API] POST /api/clients/assign-by-code: 코드 검증 시작", {
      userId,
      invitationCode,
    });

    const supabase = createClerkSupabaseClient();

    // 클라이언트 레코드 조회
    const clientId = await getClientIdForUser();
    if (!clientId) {
      console.error("[API] POST /api/clients/assign-by-code: 클라이언트 레코드 없음", {
        userId,
      });
      return NextResponse.json(
        { error: "Client record not found" },
        { status: 404 }
      );
    }

    // 클라이언트 정보 조회 (이미 할당되었는지 확인)
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, owner_agent_id")
      .eq("id", clientId)
      .single();

    if (clientError) {
      console.error("[API] POST /api/clients/assign-by-code: 클라이언트 조회 실패", {
        clientId,
        error: clientError,
      });
      return NextResponse.json(
        { error: "Failed to fetch client record" },
        { status: 500 }
      );
    }

    // 이미 할당된 클라이언트인지 확인
    if (client.owner_agent_id) {
      console.warn("[API] POST /api/clients/assign-by-code: 이미 할당된 클라이언트", {
        clientId,
        ownerAgentId: client.owner_agent_id,
      });
      return NextResponse.json(
        { error: "이미 에이전트가 배정되어 있습니다." },
        { status: 400 }
      );
    }

    // 초대 코드 검증
    const { data: invitation, error: invitationError } = await supabase
      .from("client_invitations")
      .select("id, agent_id, expires_at, used_at, invitation_token")
      .eq("invitation_code", invitationCode)
      .single();

    if (invitationError || !invitation) {
      console.error("[API] POST /api/clients/assign-by-code: 유효하지 않은 초대 코드", {
        invitationCode,
        error: invitationError,
      });
      return NextResponse.json(
        { error: "유효하지 않은 초대 코드입니다." },
        { status: 400 }
      );
    }

    // 만료 여부 확인
    if (new Date(invitation.expires_at) < new Date()) {
      console.warn("[API] POST /api/clients/assign-by-code: 만료된 초대 코드", {
        invitationCode,
        expiresAt: invitation.expires_at,
      });
      return NextResponse.json(
        { error: "만료된 초대 코드입니다." },
        { status: 400 }
      );
    }

    // 사용 여부 확인
    if (invitation.used_at) {
      console.warn("[API] POST /api/clients/assign-by-code: 이미 사용된 초대 코드", {
        invitationCode,
        usedAt: invitation.used_at,
      });
      return NextResponse.json(
        { error: "이미 사용된 초대 코드입니다." },
        { status: 400 }
      );
    }

    // 에이전트 승인 상태 확인
    const isApproved = await isAgentApproved(invitation.agent_id);
    if (!isApproved) {
      console.warn("[API] POST /api/clients/assign-by-code: 승인되지 않은 에이전트", {
        agentId: invitation.agent_id,
        invitationCode,
      });
      return NextResponse.json(
        {
          error: "이 초대 코드는 승인되지 않은 에이전트가 생성한 코드입니다.",
        },
        { status: 400 }
      );
    }

    console.log("[API] POST /api/clients/assign-by-code: 에이전트 배정 시작", {
      clientId,
      agentId: invitation.agent_id,
      invitationCode,
    });

    // 클라이언트에 에이전트 할당
    const { data: updatedClient, error: updateError } = await supabase
      .from("clients")
      .update({
        owner_agent_id: invitation.agent_id,
        invitation_token: invitation.invitation_token,
      })
      .eq("id", clientId)
      .select()
      .single();

    if (updateError) {
      console.error("[API] POST /api/clients/assign-by-code: 클라이언트 업데이트 실패", {
        clientId,
        agentId: invitation.agent_id,
        error: updateError,
      });
      return NextResponse.json(
        { error: "에이전트 배정에 실패했습니다.", details: updateError.message },
        { status: 500 }
      );
    }

    // 초대 코드를 사용된 것으로 표시
    const { error: updateInvitationError } = await supabase
      .from("client_invitations")
      .update({ used_at: new Date().toISOString() })
      .eq("invitation_token", invitation.invitation_token);

    if (updateInvitationError) {
      console.error("[API] POST /api/clients/assign-by-code: 초대 코드 사용 처리 실패", {
        invitationToken: invitation.invitation_token,
        error: updateInvitationError,
      });
      // 에러가 나도 클라이언트 배정은 성공했으므로 경고만 로그
    } else {
      console.log("[API] POST /api/clients/assign-by-code: 초대 코드 사용 처리 완료", {
        invitationToken: invitation.invitation_token,
      });
    }

    // 에이전트 정보 조회 (응답에 포함)
    const { data: agent } = await supabase
      .from("accounts")
      .select("id, name, email")
      .eq("id", invitation.agent_id)
      .single();

    console.log("[API] POST /api/clients/assign-by-code: 에이전트 배정 완료", {
      clientId,
      agentId: invitation.agent_id,
    });

    return NextResponse.json({
      success: true,
      client: updatedClient,
      agent: agent ? {
        id: agent.id,
        name: agent.name,
        email: agent.email,
      } : null,
      message: "에이전트가 성공적으로 배정되었습니다.",
    });
  } catch (error) {
    console.error("[API] POST /api/clients/assign-by-code: 예상치 못한 에러 발생", {
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


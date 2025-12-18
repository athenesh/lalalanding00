import { NextResponse } from "next/server";
import { requireAgent, getOrCreateAccount, requireApprovedAgent } from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validations/api-schemas";

/**
 * PATCH /api/clients/[id]/assign
 * 할당되지 않은 클라이언트를 현재 에이전트에게 할당합니다.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // UUID 검증
    const idValidation = uuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { error: "Invalid client ID format" },
        { status: 400 }
      );
    }
    
    // API 호출 시작 로그
    console.log("[API] PATCH /api/clients/[id]/assign 호출:", {
      clientId: id,
    });

    // 에이전트 권한 확인
    await requireAgent();

    const supabase = createClerkSupabaseClient();

    // Account 조회 또는 자동 생성
    const account = await getOrCreateAccount();

    // 승인된 에이전트인지 확인
    const isApproved = await requireApprovedAgent();
    if (!isApproved) {
      console.warn("[API] Unapproved agent attempted to assign client:", {
        accountId: account.id,
        clientId: id,
      });
      return NextResponse.json(
        {
          error: "승인되지 않은 에이전트는 클라이언트를 할당받을 수 없습니다.",
        },
        { status: 403 }
      );
    }

    console.log("[API] Agent approval check:", {
      accountId: account.id,
      isApproved: true,
    });

    // 클라이언트 조회 및 할당 상태 확인
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, owner_agent_id")
      .eq("id", id)
      .single();

    if (clientError) {
      console.error("[API] Client fetch error:", {
        clientId: id,
        error: clientError,
      });
      if (clientError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Client not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch client" },
        { status: 500 }
      );
    }

    // 이미 할당된 클라이언트인지 확인
    if (client.owner_agent_id) {
      console.warn("[API] Client already assigned:", {
        clientId: id,
        ownerAgentId: client.owner_agent_id,
      });
      return NextResponse.json(
        { error: "Client is already assigned to an agent" },
        { status: 400 }
      );
    }

    // 클라이언트 할당
    console.log("[API] Assigning client to agent:", {
      clientId: id,
      accountId: account.id,
    });

    const { data: updatedClient, error: updateError } = await supabase
      .from("clients")
      .update({
        owner_agent_id: account.id,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("[API] Client assignment error:", {
        clientId: id,
        accountId: account.id,
        error: updateError,
      });
      return NextResponse.json(
        { error: "Failed to assign client", details: updateError.message },
        { status: 500 }
      );
    }

    console.log("[API] Client assigned successfully:", {
      clientId: id,
      accountId: account.id,
    });

    return NextResponse.json({
      success: true,
      client: updatedClient,
    });
  } catch (error) {
    const { id } = await params;
    console.error("[API] Error in PATCH /api/clients/[id]/assign:", {
      clientId: id,
      error,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


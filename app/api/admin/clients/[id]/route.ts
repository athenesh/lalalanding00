import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * GET /api/admin/clients/[id]
 * 관리자가 특정 클라이언트의 상세 정보를 조회합니다.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log("[API] GET /api/admin/clients/[id] 호출:", { id });

    // ADMIN 권한 확인
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const supabase = getServiceRoleClient();

    // 클라이언트 상세 정보 조회
    // foreign key 컬럼 이름을 사용하여 관계 조회
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select(`
        *,
        accounts!owner_agent_id (
          id,
          name,
          email,
          clerk_user_id
        )
      `)
      .eq("id", id)
      .single();

    if (clientError || !client) {
      console.error("[API] Client 조회 실패:", clientError);
      return NextResponse.json(
        {
          error: "Client not found",
          details: clientError?.message,
        },
        { status: 404 }
      );
    }

    // 체크리스트 통계 조회
    const { data: checklistStats } = await supabase
      .from("checklist_items")
      .select("id, is_completed")
      .eq("client_id", id);

    const checklistTotal = checklistStats?.length || 0;
    const checklistCompleted = checklistStats?.filter((item) => item.is_completed).length || 0;

    // 메시지 수 조회
    const { count: messageCount } = await supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("room_id", id); // room_id가 client_id와 연결되어 있다고 가정

    console.log("[API] Client 상세 조회 성공:", { id });

    return NextResponse.json({
      success: true,
      client: {
        ...client,
        checklist: {
          total: checklistTotal,
          completed: checklistCompleted,
          completionRate: checklistTotal > 0 
            ? Math.round((checklistCompleted / checklistTotal) * 100) 
            : 0,
        },
        messageCount: messageCount || 0,
      },
    });
  } catch (error) {
    console.error("[API] Error in GET /api/admin/clients/[id]:", error);
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
 * PATCH /api/admin/clients/[id]
 * 관리자가 클라이언트 정보를 수정합니다.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    console.log("[API] PATCH /api/admin/clients/[id] 호출:", { id, body });

    // ADMIN 권한 확인
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const supabase = getServiceRoleClient();

    // 업데이트 가능한 필드만 추출
    const updateData: Record<string, any> = {};
    const allowedFields = [
      "name",
      "email",
      "phone_kr",
      "phone_us",
      "occupation",
      "moving_date",
      "moving_type",
      "relocation_type",
      "owner_agent_id",
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // updated_at 컬럼은 테이블에 없으므로 제거

    const { data: updatedClient, error: updateError } = await supabase
      .from("clients")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError || !updatedClient) {
      console.error("[API] Client 업데이트 실패:", updateError);
      return NextResponse.json(
        {
          error: "Failed to update client",
          details: updateError?.message,
        },
        { status: 500 }
      );
    }

    console.log("[API] Client 업데이트 성공:", { id });

    return NextResponse.json({
      success: true,
      client: updatedClient,
    });
  } catch (error) {
    console.error("[API] Error in PATCH /api/admin/clients/[id]:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


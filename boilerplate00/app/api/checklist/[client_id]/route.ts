import { NextResponse } from "next/server";
import { requireAgent, getOrCreateAccount } from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/checklist/[client_id]
 * 클라이언트의 체크리스트를 조회합니다.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ client_id: string }> }
) {
  try {
    const { client_id } = await params;
    // API 호출 시작 로그
    console.log("[API] GET /api/checklist/[client_id] 호출:", {
      clientId: client_id,
    });

    // 에이전트 권한 확인
    await requireAgent();

    const supabase = createClerkSupabaseClient();

    // Account 조회 또는 자동 생성
    const account = await getOrCreateAccount();

    // 클라이언트 소유권 확인
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", client_id)
      .eq("owner_agent_id", account.id)
      .single();

    if (clientError || !client) {
      console.error("[API] Client ownership check failed:", {
        clientId: client_id,
        accountId: account.id,
        error: clientError,
      });
      return NextResponse.json(
        { error: "Client not found or access denied" },
        { status: 404 }
      );
    }

    // 체크리스트 항목 조회
    const { data: checklistItems, error: checklistError } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("client_id", client_id)
      .order("order_num", { ascending: true });

    if (checklistError) {
      console.error("[API] Checklist fetch error:", {
        clientId: client_id,
        error: checklistError,
      });
      return NextResponse.json(
        { error: "Failed to fetch checklist" },
        { status: 500 }
      );
    }

    console.log("[API] Checklist 조회 성공:", {
      clientId: client_id,
      itemCount: checklistItems?.length || 0,
    });

    // category별로 그룹화
    const groupedByCategory: Record<string, any[]> = {};
    checklistItems?.forEach((item) => {
      if (!groupedByCategory[item.category]) {
        groupedByCategory[item.category] = [];
      }
      groupedByCategory[item.category].push(item);
    });

    return NextResponse.json({
      checklist: checklistItems || [],
      groupedByCategory,
    });
  } catch (error) {
    const { client_id } = await params;
    console.error("[API] Error in GET /api/checklist/[client_id]:", {
      clientId: client_id,
      error,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/checklist/[client_id]
 * 체크리스트 항목들을 업데이트합니다.
 * 여러 항목을 한 번에 업데이트할 수 있습니다.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ client_id: string }> }
) {
  try {
    const { client_id } = await params;
    // API 호출 시작 로그
    console.log("[API] PATCH /api/checklist/[client_id] 호출:", {
      clientId: client_id,
    });

    // 에이전트 권한 확인
    await requireAgent();

    const supabase = createClerkSupabaseClient();

    // Account 조회 또는 자동 생성
    const account = await getOrCreateAccount();

    // 클라이언트 소유권 확인
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", client_id)
      .eq("owner_agent_id", account.id)
      .single();

    if (clientError || !client) {
      console.error("[API] Client ownership check failed:", {
        clientId: client_id,
        accountId: account.id,
        error: clientError,
      });
      return NextResponse.json(
        { error: "Client not found or access denied" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { items } = body; // items는 업데이트할 항목들의 배열

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "Items must be an array" },
        { status: 400 }
      );
    }

    console.log("[API] 체크리스트 업데이트 데이터:", {
      clientId: client_id,
      itemCount: items.length,
    });

    // 각 항목을 업데이트
    const updatePromises = items.map(async (item: any) => {
      const { id, completed, notes, referenceUrl, completedAt } = item;

      if (!id) {
        console.warn("[API] Checklist item missing id:", item);
        return null;
      }

      const updateData: any = {};

      if (completed !== undefined) {
        updateData.is_completed = completed;
        // 완료 시 completed_at 설정, 미완료 시 null
        if (completed) {
          updateData.completed_at = completedAt
            ? new Date(completedAt).toISOString()
            : new Date().toISOString();
        } else {
          updateData.completed_at = null;
        }
      }

      if (notes !== undefined) {
        updateData.notes = notes || null;
      }

      if (referenceUrl !== undefined) {
        updateData.reference_url = referenceUrl || null;
      }

      const { data: updatedItem, error: updateError } = await supabase
        .from("checklist_items")
        .update(updateData)
        .eq("id", id)
        .eq("client_id", client_id) // 소유권 확인
        .select()
        .single();

      if (updateError) {
        console.error("[API] Checklist item update error:", {
          itemId: id,
          error: updateError,
        });
        return null;
      }

      return updatedItem;
    });

    const updatedItems = await Promise.all(updatePromises);
    const successfulUpdates = updatedItems.filter((item) => item !== null);

    console.log("[API] Checklist 업데이트 성공:", {
      clientId: client_id,
      updatedCount: successfulUpdates.length,
      totalCount: items.length,
    });

    return NextResponse.json({
      updated: successfulUpdates,
      count: successfulUpdates.length,
    });
  } catch (error) {
    const { client_id } = await params;
    console.error("[API] Error in PATCH /api/checklist/[client_id]:", {
      clientId: client_id,
      error,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


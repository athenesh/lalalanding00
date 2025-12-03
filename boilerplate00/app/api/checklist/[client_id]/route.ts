import { NextResponse } from "next/server";
import { requireAgent, getOrCreateAccount } from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/database.types";

/**
 * GET /api/checklist/[client_id]
 * 클라이언트의 체크리스트를 조회합니다.
 * 체크리스트 항목이 없을 경우 템플릿을 기반으로 자동 생성합니다.
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
      .select("id,title,category,description,is_completed,notes,reference_url,completed_at,is_required,order_num")
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

    // 체크리스트 항목이 없거나 부족한 경우 템플릿에서 생성
    if (!checklistItems || checklistItems.length === 0) {
      console.log("[API] 체크리스트 항목이 없음. 템플릿에서 생성 시작:", {
        clientId: client_id,
      });

      // 템플릿 조회
      const { data: templates, error: templateError } = await supabase
        .from("checklist_templates")
        .select("id,title,category,description,order_num,is_required")
        .order("category,order_num", { ascending: true });

      if (templateError) {
        console.error("[API] Template fetch error:", {
          clientId: client_id,
          error: templateError,
        });
        // 템플릿이 없어도 기존 로직 계속 진행
      } else if (templates && templates.length > 0) {
        // 템플릿을 기반으로 체크리스트 항목 생성
        const itemsToInsert: TablesInsert<"checklist_items">[] = templates.map(
          (template) => ({
            client_id: client_id,
            category: template.category,
            title: template.title,
            description: template.description,
            order_num: template.order_num,
            is_required: template.is_required,
            is_completed: false,
          })
        );

        const { data: newItems, error: insertError } = await supabase
          .from("checklist_items")
          .insert(itemsToInsert)
          .select("id,title,category,description,is_completed,notes,reference_url,completed_at,is_required,order_num");

        if (insertError) {
          console.error("[API] Checklist items creation error:", {
            clientId: client_id,
            error: insertError,
          });
          // 생성 실패해도 기존 로직 계속 진행
        } else {
          console.log("[API] 체크리스트 항목 생성 성공:", {
            clientId: client_id,
            itemCount: newItems?.length || 0,
          });

          // 생성된 항목으로 업데이트
          if (newItems && newItems.length > 0) {
            const groupedByCategory: Record<string, Tables<"checklist_items">[]> = {};
            newItems.forEach((item) => {
              if (!groupedByCategory[item.category]) {
                groupedByCategory[item.category] = [];
              }
              groupedByCategory[item.category].push(item);
            });

            return NextResponse.json({
              checklist: newItems,
              groupedByCategory,
            });
          }
        }
      }
    }

    console.log("[API] Checklist 조회 성공:", {
      clientId: client_id,
      itemCount: checklistItems?.length || 0,
    });

    // category별로 그룹화
    const groupedByCategory: Record<string, Tables<"checklist_items">[]> = {};
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
 * id가 없는 항목은 새로 생성합니다.
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
      itemsWithId: items.filter((item: any) => item.id).length,
      itemsWithoutId: items.filter((item: any) => !item.id).length,
    });

    // 각 항목을 업데이트 또는 생성
    const updatePromises = items.map(async (item: any) => {
      const {
        id,
        title,
        category,
        description,
        completed,
        notes,
        referenceUrl,
        completedAt,
        orderNum,
      } = item;

      // id가 없는 경우 새로 생성
      if (!id) {
        console.log("[API] 체크리스트 항목 생성:", {
          title,
          category,
          clientId: client_id,
        });

        // 카테고리 매핑 (pre-departure -> pre_departure)
        const dbCategory = category
          ? category.replace(/-/g, "_")
          : "pre_departure";

        // description이 배열인 경우 JSON 문자열로 변환
        const descriptionText = Array.isArray(description)
          ? JSON.stringify(description)
          : typeof description === "string"
            ? description
            : null;

        const insertData: TablesInsert<"checklist_items"> = {
          client_id: client_id,
          category: dbCategory,
          title: title || "Untitled",
          description: descriptionText,
          is_completed: completed || false,
          notes: notes || null,
          reference_url: referenceUrl || null,
          order_num: orderNum || 0,
        };

        if (completed) {
          insertData.completed_at = completedAt
            ? new Date(completedAt).toISOString()
            : new Date().toISOString();
        }

        const { data: newItem, error: insertError } = await supabase
          .from("checklist_items")
          .insert(insertData)
          .select(
            "id,title,category,description,is_completed,notes,reference_url,completed_at,is_required,order_num"
          )
          .single();

        if (insertError) {
          console.error("[API] Checklist item insert error:", {
            title,
            error: insertError,
          });
          return null;
        }

        console.log("[API] 체크리스트 항목 생성 성공:", {
          itemId: newItem.id,
          title,
        });

        return newItem;
      }

      // id가 있는 경우 업데이트
      const updateData: Partial<TablesInsert<"checklist_items">> = {};

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
        .select("id,is_completed,notes,reference_url,completed_at")
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


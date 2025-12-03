import { NextResponse } from "next/server";
import { getAuthUserId, requireClient } from "@/lib/auth";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/database.types";
import {
  parseDescription,
  serializeDescription,
  dbItemToUI,
  uiItemToDBUpdate,
  uiItemToDBInsert,
  dbDocumentToFile,
} from "@/lib/checklist/transformers";
import { getChecklistFiles } from "@/lib/storage/checklist-files";

/**
 * GET /api/client/checklist
 * 클라이언트 자신의 체크리스트를 조회합니다.
 * 체크리스트 항목이 없을 경우 템플릿을 기반으로 자동 생성합니다.
 */
export async function GET() {
  try {
    console.log("[API] GET /api/client/checklist 호출");

    // 클라이언트 권한 확인
    await requireClient();

    const userId = await getAuthUserId();
    const supabase = createClerkSupabaseClient();

    // 클라이언트 정보 조회 (clerk_user_id로)
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (clientError || !client) {
      console.error("[API] Client not found:", { userId, error: clientError });
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // 체크리스트 항목 조회
    const { data: checklistItems, error: checklistError } = await supabase
      .from("checklist_items")
      .select(
        "id,title,category,sub_category,description,is_completed,notes,reference_url,completed_at,is_required,order_num"
      )
      .eq("client_id", client.id)
      .order("order_num", { ascending: true });

    if (checklistError) {
      console.error("[API] Checklist fetch error:", {
        clientId: client.id,
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
        clientId: client.id,
      });

      // 템플릿 조회
      const { data: templates, error: templateError } = await supabase
        .from("checklist_templates")
        .select("id,title,category,description,order_num,is_required")
        .order("category,order_num", { ascending: true });

      if (templateError) {
        console.error("[API] Template fetch error:", {
          clientId: client.id,
          error: templateError,
        });
        // 템플릿이 없어도 기존 로직 계속 진행
      } else if (templates && templates.length > 0) {
        // 템플릿을 기반으로 체크리스트 항목 생성
        const itemsToInsert: TablesInsert<"checklist_items">[] = templates.map(
          (template) => ({
            client_id: client.id,
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
          .select(
            "id,title,category,sub_category,description,is_completed,notes,reference_url,completed_at,is_required,order_num"
          );

        if (insertError) {
          console.error("[API] Checklist items creation error:", {
            clientId: client.id,
            error: insertError,
          });
          // 생성 실패해도 기존 로직 계속 진행
        } else {
          console.log("[API] 체크리스트 항목 생성 성공:", {
            clientId: client.id,
            itemCount: newItems?.length || 0,
          });

          // 생성된 항목으로 업데이트 (파일 목록 포함)
          if (newItems && newItems.length > 0) {
            const itemsWithFiles = await Promise.all(
              newItems.map(async (item) => {
                const documents = await getChecklistFiles(item.id);
                const files = documents.map(dbDocumentToFile);
                return dbItemToUI(item, files);
              })
            );

            // category별로 그룹화 (DB category 기준)
            const groupedByCategory: Record<string, any[]> = {};
            itemsWithFiles.forEach((item) => {
              const dbCategory = item.phase
                .replace('PRE_DEPARTURE', 'pre_departure')
                .replace('ARRIVAL', 'arrival')
                .replace('EARLY_SETTLEMENT', 'settlement_early')
                .replace('SETTLEMENT_COMPLETE', 'settlement_complete');
              
              if (!groupedByCategory[dbCategory]) {
                groupedByCategory[dbCategory] = [];
              }
              groupedByCategory[dbCategory].push(item);
            });

            return NextResponse.json({
              checklist: itemsWithFiles,
              groupedByCategory,
            });
          }
        }
      }
    }

    console.log("[API] Checklist 조회 성공:", {
      clientId: client.id,
      itemCount: checklistItems?.length || 0,
    });

    // 각 항목의 파일 목록 조회 및 변환
    const itemsWithFiles = await Promise.all(
      (checklistItems || []).map(async (item) => {
        const documents = await getChecklistFiles(item.id);
        const files = documents.map(dbDocumentToFile);
        return dbItemToUI(item, files);
      })
    );

    // category별로 그룹화 (DB category 기준)
    const groupedByCategory: Record<string, any[]> = {};
    itemsWithFiles.forEach((item) => {
      // phase를 DB category로 변환
      const dbCategory = item.phase
        .replace('PRE_DEPARTURE', 'pre_departure')
        .replace('ARRIVAL', 'arrival')
        .replace('EARLY_SETTLEMENT', 'settlement_early')
        .replace('SETTLEMENT_COMPLETE', 'settlement_complete');
      
      if (!groupedByCategory[dbCategory]) {
        groupedByCategory[dbCategory] = [];
      }
      groupedByCategory[dbCategory].push(item);
    });

    return NextResponse.json({
      checklist: itemsWithFiles,
      groupedByCategory,
    });
  } catch (error) {
    console.error("[API] Error in GET /api/client/checklist:", {
      error,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/client/checklist
 * 클라이언트 자신의 체크리스트 항목들을 업데이트합니다.
 * 여러 항목을 한 번에 업데이트할 수 있습니다.
 * id가 없는 항목은 새로 생성합니다.
 */
export async function PATCH(request: Request) {
  try {
    console.log("[API] PATCH /api/client/checklist 호출");

    // 클라이언트 권한 확인
    await requireClient();

    const userId = await getAuthUserId();
    const supabase = createClerkSupabaseClient();

    // 클라이언트 정보 조회 (clerk_user_id로)
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (clientError || !client) {
      console.error("[API] Client not found:", { userId, error: clientError });
      return NextResponse.json(
        { error: "Client not found" },
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
      clientId: client.id,
      itemCount: items.length,
      itemsWithId: items.filter((item: any) => item.id).length,
      itemsWithoutId: items.filter((item: any) => !item.id).length,
    });

    // id가 있는 항목은 업데이트, id가 없는 항목은 생성
    const updatePromises = items.map(async (item: any) => {
      const {
        id,
        title,
        phase,
        category, // sub_category
        description,
        isCompleted,
        memo, // notes
        referenceUrl,
        completedAt,
        orderNum,
        isRequired,
      } = item;

      // id가 없는 경우 새로 생성
      if (!id) {
        console.log("[API] 체크리스트 항목 생성:", {
          title,
          phase,
          clientId: client.id,
        });

        // UI 형식의 ChecklistItem을 DB Insert 형식으로 변환
        const uiItem = {
          title: title || "Untitled",
          category: category || "",
          phase: phase || "PRE_DEPARTURE",
          description: Array.isArray(description)
            ? description
            : typeof description === "string"
              ? parseDescription(description)
              : [],
          isCompleted: isCompleted || false,
          memo: memo || "",
          files: [],
          referenceUrl: referenceUrl || undefined,
          isRequired: isRequired || false,
          completedAt: completedAt ? new Date(completedAt) : undefined,
          orderNum: orderNum || 0,
        };

        const insertData = uiItemToDBInsert(uiItem, client.id);

        const { data: newItem, error: insertError } = await supabase
          .from("checklist_items")
          .insert(insertData)
          .select(
            "id,title,category,sub_category,description,is_completed,notes,reference_url,completed_at,is_required,order_num"
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
      // 기존 항목 조회
      const { data: existingItem } = await supabase
        .from("checklist_items")
        .select("*")
        .eq("id", id)
        .eq("client_id", client.id)
        .single();

      if (!existingItem) {
        console.error("[API] Checklist item not found:", { id });
        return null;
      }

      // UI 형식으로 변환 후 업데이트할 필드만 병합
      const existingUIItem = dbItemToUI(existingItem, []);
      const updatedUIItem: any = {
        ...existingUIItem,
        ...(title !== undefined && { title }),
        ...(phase !== undefined && { phase }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && {
          description: Array.isArray(description)
            ? description
            : parseDescription(description),
        }),
        ...(isCompleted !== undefined && { isCompleted }),
        ...(memo !== undefined && { memo }),
        ...(referenceUrl !== undefined && { referenceUrl }),
        ...(isRequired !== undefined && { isRequired }),
        ...(orderNum !== undefined && { orderNum }),
        ...(completedAt !== undefined && {
          completedAt: completedAt ? new Date(completedAt) : undefined,
        }),
      };

      // 완료 상태 변경 시 completed_at 업데이트
      if (isCompleted !== undefined) {
        if (isCompleted && !updatedUIItem.completedAt) {
          updatedUIItem.completedAt = new Date();
        } else if (!isCompleted) {
          updatedUIItem.completedAt = undefined;
        }
      }

      const updateData = uiItemToDBUpdate(updatedUIItem, client.id);

      const { data: updatedItem, error: updateError } = await supabase
        .from("checklist_items")
        .update(updateData)
        .eq("id", id)
        .eq("client_id", client.id) // 소유권 확인
        .select(
          "id,title,category,sub_category,description,is_completed,notes,reference_url,completed_at,is_required,order_num"
        )
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
      clientId: client.id,
      updatedCount: successfulUpdates.length,
      totalCount: items.length,
    });

    return NextResponse.json({
      updated: successfulUpdates,
      count: successfulUpdates.length,
    });
  } catch (error) {
    console.error("[API] Error in PATCH /api/client/checklist:", {
      error,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


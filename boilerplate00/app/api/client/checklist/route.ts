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
import { dbCategoryToPhase } from "@/types/checklist";

/**
 * GET /api/client/checklist
 * 클라이언트 자신의 체크리스트를 조회합니다.
 * 
 * 로직:
 * 1. 템플릿을 기준으로 화면 구성 (템플릿이 메인)
 * 2. 각 템플릿에 대해 checklist_items에서 상태 정보만 조회 (template_id로 매칭)
 * 3. 템플릿 정보 + 클라이언트 상태 정보 병합
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

    // 1. 템플릿 조회 (항상 최신 템플릿 사용)
    const { data: templates, error: templateError } = await supabase
      .from("checklist_templates")
      .select("id,title,category,sub_category,description,order_num,is_required")
      .order("category,order_num", { ascending: true });

    if (templateError) {
      console.error("[API] Template fetch error:", {
        clientId: client.id,
        error: templateError,
      });
      return NextResponse.json(
        { error: "Failed to fetch templates" },
        { status: 500 }
      );
    }

    if (!templates || templates.length === 0) {
      console.log("[API] 템플릿이 없음:", { clientId: client.id });
      return NextResponse.json({
        checklist: [],
        groupedByCategory: {},
      });
    }

    // 2. 클라이언트의 체크리스트 상태 조회 (template_id로 매칭)
    const { data: checklistItems, error: checklistError } = await supabase
      .from("checklist_items")
      .select(
        "id,template_id,is_completed,notes,completed_at"
      )
      .eq("client_id", client.id);

    if (checklistError) {
      console.error("[API] Checklist fetch error:", {
        clientId: client.id,
        error: checklistError,
      });
      // 에러가 있어도 템플릿은 반환
    }

    // template_id를 키로 하는 맵 생성
    const itemsByTemplateId = new Map(
      (checklistItems || []).map((item) => [item.template_id, item])
    );

    // 3. 템플릿과 클라이언트 상태 병합
    const mergedItems = await Promise.all(
      templates.map(async (template) => {
        const clientItem = itemsByTemplateId.get(template.id);
        
        // 파일 목록 조회 (clientItem이 있는 경우만)
        let files: any[] = [];
        if (clientItem?.id) {
          const documents = await getChecklistFiles(clientItem.id);
          files = documents.map(dbDocumentToFile);
        }

        // 템플릿 정보 + 클라이언트 상태 정보 병합
        return {
          id: clientItem?.id || undefined, // checklist_items의 id (없으면 undefined)
          templateId: template.id, // 템플릿 ID
          title: template.title, // 템플릿에서 가져옴
          category: template.sub_category || '', // 템플릿에서 가져옴
          phase: dbCategoryToPhase(template.category), // 템플릿에서 가져옴
          description: parseDescription(template.description), // 템플릿에서 가져옴
          isCompleted: clientItem?.is_completed || false, // 클라이언트 상태
          memo: clientItem?.notes || '', // 클라이언트 메모
          files: files, // 클라이언트 파일
          referenceUrl: undefined, // 템플릿에는 없음
          isRequired: template.is_required || false, // 템플릿에서 가져옴
          completedAt: clientItem?.completed_at
            ? new Date(clientItem.completed_at)
            : undefined, // 클라이언트 상태
          orderNum: template.order_num, // 템플릿에서 가져옴
        };
      })
    );

    // category별로 그룹화
    const groupedByCategory: Record<string, any[]> = {};
    mergedItems.forEach((item) => {
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

    console.log("[API] Checklist 조회 성공:", {
      clientId: client.id,
      templateCount: templates.length,
      itemCount: mergedItems.length,
      itemsWithStatus: checklistItems?.length || 0,
    });

    return NextResponse.json({
      checklist: mergedItems,
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
 * 
 * 로직:
 * - templateId를 기준으로 checklist_items 업데이트/생성
 * - 상태 정보만 저장 (is_completed, notes, completed_at)
 * - title, description은 템플릿에서 가져오므로 업데이트하지 않음
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
    });

    // templateId를 기준으로 업데이트/생성
    const updatePromises = items.map(async (item: any) => {
      const {
        id, // checklist_items의 id (있으면 업데이트, 없으면 생성)
        templateId, // 템플릿 ID (필수)
        isCompleted,
        memo, // notes
        completedAt,
      } = item;

      if (!templateId) {
        console.error("[API] templateId가 없음:", { item });
        return null;
      }

      // 템플릿 존재 확인
      const { data: template } = await supabase
        .from("checklist_templates")
        .select("id,category,order_num")
        .eq("id", templateId)
        .single();

      if (!template) {
        console.error("[API] Template not found:", { templateId });
        return null;
      }

      // 완료 시간 설정
      let completedAtValue: string | null = null;
      if (isCompleted !== undefined) {
        if (isCompleted) {
          completedAtValue = completedAt
            ? new Date(completedAt).toISOString()
            : new Date().toISOString();
        } else {
          completedAtValue = null;
        }
      }

      // id가 있는 경우 업데이트
      if (id) {
        const { data: updatedItem, error: updateError } = await supabase
          .from("checklist_items")
          .update({
            is_completed: isCompleted !== undefined ? isCompleted : undefined,
            notes: memo !== undefined ? memo || null : undefined,
            completed_at: completedAtValue,
          })
          .eq("id", id)
          .eq("client_id", client.id) // 소유권 확인
          .select("id,template_id,is_completed,notes,completed_at")
          .single();

        if (updateError) {
          console.error("[API] Checklist item update error:", {
            itemId: id,
            error: updateError,
          });
          return null;
        }

        return updatedItem;
      }

      // id가 없는 경우 생성 (상태 정보만 저장)
      // 템플릿 속성(category, title, description, order_num, is_required)은 제거됨
      // template_id로 템플릿을 참조하므로 상태 정보만 저장
      const { data: newItem, error: insertError } = await supabase
        .from("checklist_items")
        .insert({
          client_id: client.id,
          template_id: templateId,
          is_completed: isCompleted || false,
          notes: memo || null,
          completed_at: completedAtValue,
        })
        .select("id,template_id,is_completed,notes,completed_at")
        .single();

      if (insertError) {
        console.error("[API] Checklist item insert error:", {
          templateId,
          error: insertError,
        });
        return null;
      }

      console.log("[API] 체크리스트 항목 생성 성공:", {
        itemId: newItem.id,
        templateId,
      });

      return newItem;
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


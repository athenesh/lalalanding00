/**
 * @file transformers.ts
 * @description 체크리스트 데이터 변환 유틸리티
 *
 * DB 스키마와 UI 간의 데이터 변환을 처리합니다.
 * - DB → UI: checklist_items → ChecklistItem
 * - UI → DB: ChecklistItem → checklist_items 업데이트 데이터
 */

import type { Tables } from "@/database.types";
import type {
  ChecklistItem,
  ChecklistItemContent,
  ChecklistFile,
} from "@/types/checklist";
import { dbCategoryToPhase, phaseToDbCategory } from "@/types/checklist";

/**
 * DB의 description을 ChecklistItemContent[]로 파싱
 * JSONB 타입으로 변경되어 이미 파싱된 객체이거나, 문자열일 수 있음
 */
export function parseDescription(
  description: string | null | unknown,
): ChecklistItemContent[] {
  if (!description) return [];

  try {
    // JSONB는 이미 파싱된 객체로 반환됨
    if (Array.isArray(description)) {
      return description as ChecklistItemContent[];
    }

    // 단일 객체인 경우 배열로 감싸기
    if (
      typeof description === "object" &&
      description !== null &&
      "text" in description
    ) {
      return [description as ChecklistItemContent];
    }

    // 문자열인 경우 (레거시 호환성)
    if (typeof description === "string") {
      const parsed = JSON.parse(description);
      if (Array.isArray(parsed)) {
        return parsed as ChecklistItemContent[];
      }
      if (typeof parsed === "object" && parsed.text) {
        return [parsed as ChecklistItemContent];
      }
      // JSON이 아닌 경우: 줄바꿈으로 split하여 단순 텍스트 배열로 변환
      const lines = description.split("\n").filter(Boolean);
      return lines.map((line) => ({ text: line }));
    }
  } catch {
    // 파싱 실패 시 빈 배열 반환
    return [];
  }

  return [];
}

/**
 * ChecklistItemContent[]를 DB의 description 문자열로 직렬화
 */
export function serializeDescription(
  description: ChecklistItemContent[],
): string {
  if (!description || description.length === 0) return "";
  return JSON.stringify(description);
}

/**
 * DB의 checklist_items Row를 UI의 ChecklistItem으로 변환
 * 템플릿 기반 구조이므로 템플릿 정보도 필요합니다.
 */
export function dbItemToUI(
  dbItem: Tables<"checklist_items">,
  template: Tables<"checklist_templates">,
  files: ChecklistFile[] = [],
): ChecklistItem {
  return {
    id: dbItem.id,
    templateId: dbItem.template_id,
    title: template.title,
    category: template.sub_category || "",
    phase: dbCategoryToPhase(template.category),
    description: parseDescription(template.description),
    isCompleted: dbItem.is_completed || false,
    memo: dbItem.notes || "",
    files: files,
    referenceUrl: template.reference_url || dbItem.reference_url || undefined,
    isRequired: template.is_required || false,
    completedAt: dbItem.completed_at
      ? new Date(dbItem.completed_at)
      : undefined,
    orderNum: template.order_num,
  };
}

/**
 * UI의 ChecklistItem을 DB 업데이트용 데이터로 변환
 * 템플릿 기반 구조이므로 상태 정보만 업데이트합니다.
 */
export function uiItemToDBUpdate(
  uiItem: ChecklistItem,
): Partial<Tables<"checklist_items">> {
  return {
    is_completed: uiItem.isCompleted,
    notes: uiItem.memo || null,
    reference_url: uiItem.referenceUrl || null,
    completed_at:
      uiItem.isCompleted && uiItem.completedAt
        ? uiItem.completedAt.toISOString()
        : uiItem.isCompleted
        ? new Date().toISOString()
        : null,
  };
}

/**
 * UI의 ChecklistItem을 DB Insert용 데이터로 변환
 * 템플릿 기반 구조이므로 template_id가 필수입니다.
 */
export function uiItemToDBInsert(
  uiItem: Omit<ChecklistItem, "id">,
  clientId: string,
): Omit<Tables<"checklist_items">, "id" | "created_at"> {
  if (!uiItem.templateId) {
    throw new Error("templateId is required for checklist_items insert");
  }

  return {
    client_id: clientId,
    template_id: uiItem.templateId,
    is_completed: uiItem.isCompleted || false,
    notes: uiItem.memo || null,
    reference_url: uiItem.referenceUrl || null,
    completed_at:
      uiItem.isCompleted && uiItem.completedAt
        ? uiItem.completedAt.toISOString()
        : uiItem.isCompleted
        ? new Date().toISOString()
        : null,
    actual_cost: null,
  };
}

/**
 * client_documents 테이블의 Row를 ChecklistFile로 변환
 */
export function dbDocumentToFile(
  doc: Tables<"client_documents">,
): ChecklistFile {
  return {
    id: doc.id,
    name: doc.file_name,
    type: doc.mime_type || "application/octet-stream",
    url: doc.file_url,
    file_url: doc.file_url,
    document_id: doc.id,
    timestamp: doc.uploaded_at
      ? new Date(doc.uploaded_at).getTime()
      : Date.now(),
  };
}

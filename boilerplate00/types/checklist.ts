/**
 * @file checklist.ts
 * @description 체크리스트 관련 타입 정의 및 유틸리티 함수
 *
 * us-settlement-guide의 타입을 Next.js 프로젝트에 맞게 변환하고,
 * DB 스키마와 UI 간의 데이터 변환을 위한 유틸리티를 제공합니다.
 */

export enum TimelinePhase {
  PRE_DEPARTURE = 'PRE_DEPARTURE',
  ARRIVAL = 'ARRIVAL',
  EARLY_SETTLEMENT = 'EARLY_SETTLEMENT',
  SETTLEMENT_COMPLETE = 'SETTLEMENT_COMPLETE',
}

/**
 * 체크리스트 항목의 description 구조
 * text: 메인 설명 텍스트
 * subText: 하위 항목 목록 (불릿 포인트)
 * important: 중요 항목 여부
 */
export interface ChecklistItemContent {
  text: string;
  subText?: string[];
  important?: boolean;
}

/**
 * 체크리스트 항목에 첨부된 파일 정보
 */
export interface ChecklistFile {
  id: string;
  name: string;
  type: string;
  url: string; // Supabase Storage URL 또는 임시 Object URL
  timestamp: number;
  // Supabase Storage 관련 추가 필드
  file_url?: string; // Supabase Storage의 실제 파일 URL
  document_id?: string; // client_documents 테이블의 id
}

/**
 * UI에서 사용하는 체크리스트 항목 타입
 * us-settlement-guide의 ChecklistItem과 호환
 */
export interface ChecklistItem {
  id: string;
  title: string;
  category: string; // sub_category (예: "서류 준비", "운전면허")
  phase: TimelinePhase;
  description: ChecklistItemContent[];
  isCompleted: boolean;
  memo: string; // notes 필드와 매핑
  files: ChecklistFile[];
  // DB 필드 매핑
  referenceUrl?: string; // reference_url
  isRequired?: boolean; // is_required
  completedAt?: Date; // completed_at
  orderNum?: number; // order_num
}

/**
 * DB category 문자열을 TimelinePhase enum으로 변환
 */
export function dbCategoryToPhase(category: string): TimelinePhase {
  const mapping: Record<string, TimelinePhase> = {
    'pre_departure': TimelinePhase.PRE_DEPARTURE,
    'arrival': TimelinePhase.ARRIVAL,
    'settlement_early': TimelinePhase.EARLY_SETTLEMENT,
    'settlement_complete': TimelinePhase.SETTLEMENT_COMPLETE,
    // 기존 호환성
    'settlement': TimelinePhase.EARLY_SETTLEMENT,
  };
  
  return mapping[category] || TimelinePhase.PRE_DEPARTURE;
}

/**
 * TimelinePhase enum을 DB category 문자열로 변환
 */
export function phaseToDbCategory(phase: TimelinePhase): string {
  const mapping: Record<TimelinePhase, string> = {
    [TimelinePhase.PRE_DEPARTURE]: 'pre_departure',
    [TimelinePhase.ARRIVAL]: 'arrival',
    [TimelinePhase.EARLY_SETTLEMENT]: 'settlement_early',
    [TimelinePhase.SETTLEMENT_COMPLETE]: 'settlement_complete',
  };
  
  return mapping[phase];
}

/**
 * Phase의 한국어 라벨 반환
 */
export function getPhaseLabel(phase: TimelinePhase): string {
  const labels: Record<TimelinePhase, string> = {
    [TimelinePhase.PRE_DEPARTURE]: '출국 전 준비',
    [TimelinePhase.ARRIVAL]: '입국 직후',
    [TimelinePhase.EARLY_SETTLEMENT]: '정착 초기',
    [TimelinePhase.SETTLEMENT_COMPLETE]: '정착 완료',
  };
  
  return labels[phase];
}

/**
 * Phase의 영어 서브라벨 반환
 */
export function getPhaseSubLabel(phase: TimelinePhase): string {
  const subLabels: Record<TimelinePhase, string> = {
    [TimelinePhase.PRE_DEPARTURE]: 'Preparation',
    [TimelinePhase.ARRIVAL]: 'Arrival',
    [TimelinePhase.EARLY_SETTLEMENT]: 'Settlement',
    [TimelinePhase.SETTLEMENT_COMPLETE]: 'Complete',
  };
  
  return subLabels[phase];
}

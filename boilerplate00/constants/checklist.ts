/**
 * @file checklist.ts
 * @description 체크리스트 상수 정의
 *
 * us-settlement-guide의 CHECKLIST_DATA를 참고하되,
 * 실제 데이터는 DB의 checklist_templates에서 로드합니다.
 * 이 파일은 개발/테스트용 기본값이나 타입 정의에 사용됩니다.
 */

import { TimelinePhase } from '@/types/checklist';

/**
 * 파일 업로드 관련 상수
 */
export const MAX_FILE_SIZE = 6 * 1024 * 1024; // 6MB

export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;

export const ALLOWED_FILE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
] as const;

/**
 * 파일 타입 검증 함수
 */
export function isValidFileType(file: File): boolean {
  return ALLOWED_FILE_TYPES.includes(file.type as any);
}

/**
 * 파일 크기 검증 함수
 */
export function isValidFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE;
}

/**
 * 파일 타입 검증 함수 (별칭)
 */
export const isFileTypeAllowed = isValidFileType;

/**
 * 파일 크기 검증 함수 (별칭)
 */
export const isFileSizeValid = isValidFileSize;

/**
 * Phase별 라벨 매핑
 */
export const PHASE_LABELS: Record<
  TimelinePhase,
  { label: string; sub: string }
> = {
  [TimelinePhase.PRE_DEPARTURE]: { label: '출국 전 준비', sub: 'Preparation' },
  [TimelinePhase.ARRIVAL]: { label: '입국 직후', sub: 'Arrival' },
  [TimelinePhase.EARLY_SETTLEMENT]: { label: '정착 초기', sub: 'Settlement' },
  [TimelinePhase.SETTLEMENT_COMPLETE]: { label: '정착 완료', sub: 'Complete' },
};

/**
 * Phase별 아이콘 매핑 (lucide-react 아이콘 이름)
 */
export const PHASE_ICONS: Record<TimelinePhase, string> = {
  [TimelinePhase.PRE_DEPARTURE]: 'Plane',
  [TimelinePhase.ARRIVAL]: 'Home',
  [TimelinePhase.EARLY_SETTLEMENT]: 'Car',
  [TimelinePhase.SETTLEMENT_COMPLETE]: 'Flag',
};

/**
 * 파일 업로드 설정
 */
export const FILE_UPLOAD_CONFIG = {
  MAX_SIZE: MAX_FILE_SIZE,
  ALLOWED_TYPES: ALLOWED_FILE_TYPES,
  ALLOWED_EXTENSIONS: ALLOWED_FILE_EXTENSIONS,
} as const;

/**
 * 체크리스트 항목의 카테고리별 색상 매핑
 */
export const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  '서류 준비': { bg: 'bg-red-100', text: 'text-red-600' },
  '운전면허': { bg: 'bg-blue-50', text: 'text-blue-600' },
  '집 렌트': { bg: 'bg-orange-50', text: 'text-orange-600' },
  'SSN 발급': { bg: 'bg-purple-50', text: 'text-purple-600' },
  '유틸리티': { bg: 'bg-green-50', text: 'text-green-600' },
  '계좌개설': { bg: 'bg-indigo-50', text: 'text-indigo-600' },
  '차량 구매': { bg: 'bg-cyan-50', text: 'text-cyan-600' },
  '보험': { bg: 'bg-yellow-50', text: 'text-yellow-600' },
  '금융': { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  '숙소': { bg: 'bg-pink-50', text: 'text-pink-600' },
};

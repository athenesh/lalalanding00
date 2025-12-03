/**
 * @file checklist.ts
 * @description 체크리스트 파일 업로드 유틸리티
 *
 * 파일 업로드 검증에 필요한 상수와 함수들을 제공합니다.
 */

/**
 * 최대 파일 크기 (6MB)
 */
export const MAX_FILE_SIZE = 6 * 1024 * 1024;

/**
 * 허용되는 파일 타입들
 */
export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
] as const;

/**
 * 허용되는 파일 확장자들
 */
export const ALLOWED_FILE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
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

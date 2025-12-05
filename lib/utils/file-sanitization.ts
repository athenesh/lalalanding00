/**
 * 파일명 sanitization 유틸리티
 * 보안을 위해 파일명에서 위험한 문자를 제거하고 안전한 파일명으로 변환
 */

/**
 * 파일명을 안전하게 sanitize합니다.
 * 
 * @param fileName 원본 파일명
 * @returns sanitized 파일명
 */
export function sanitizeFileName(fileName: string): string {
  // 파일명에서 경로 구분자 제거
  let sanitized = fileName
    .replace(/[\/\\]/g, '') // 슬래시와 백슬래시 제거
    .replace(/\.\./g, '') // 상위 디렉토리 참조 제거
    .replace(/[<>:"|?*]/g, '') // Windows에서 금지된 문자 제거
    .trim();

  // 파일명이 비어있거나 점으로만 구성된 경우 기본값 사용
  if (!sanitized || sanitized === '.' || sanitized === '..') {
    sanitized = 'file';
  }

  // 파일명 길이 제한 (255자)
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop();
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
    sanitized = nameWithoutExt.substring(0, 255 - (ext?.length || 0) - 1) + '.' + ext;
  }

  return sanitized;
}

/**
 * 파일 확장자를 안전하게 추출합니다.
 * 
 * @param fileName 파일명
 * @returns 확장자 (소문자로 변환)
 */
export function getSafeFileExtension(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  // 확장자에서 위험한 문자 제거
  return ext.replace(/[^a-z0-9]/g, '');
}

/**
 * 안전한 파일명을 생성합니다 (타임스탬프 + 랜덤 문자열).
 * 
 * @param originalFileName 원본 파일명 (확장자 추출용)
 * @returns 안전한 파일명
 */
export function generateSafeFileName(originalFileName: string): string {
  const ext = getSafeFileExtension(originalFileName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  
  return ext ? `${timestamp}-${random}.${ext}` : `${timestamp}-${random}`;
}


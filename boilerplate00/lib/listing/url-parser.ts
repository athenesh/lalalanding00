/**
 * @file url-parser.ts
 * @description Redfin/Zillow URL에서 주소 또는 MLS 번호를 추출하는 유틸리티 함수
 *
 * 이 모듈은 Redfin과 Zillow의 부동산 리스팅 URL을 파싱하여
 * Bridge Data Output API 검색에 필요한 정보를 추출합니다.
 *
 * 주요 기능:
 * 1. Redfin/Zillow URL 패턴 감지
 * 2. URL에서 주소 정보 추출
 * 3. URL에서 MLS 번호 추출 (가능한 경우)
 *
 * @dependencies
 * - 없음 (순수 TypeScript 유틸리티)
 */

export interface ParsedListingUrl {
  platform: "redfin" | "zillow" | "unknown";
  address?: string;
  mlsNumber?: string;
  propertyId?: string;
  isValid: boolean;
}

/**
 * Redfin URL에서 주소를 추출합니다.
 * 
 * Redfin URL 형식 예시:
 * - https://www.redfin.com/CA/Los-Angeles/123-Main-St-90001/123456789/home/12345678
 * - https://www.redfin.com/state/city/address-zip/home-id/property-id
 */
function parseRedfinUrl(url: string): ParsedListingUrl {
  try {
    const urlObj = new URL(url);
    
    // Redfin URL 패턴: /state/city/address-zip/home-id/property-id
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    
    if (pathParts.length < 3) {
      return { platform: "redfin", isValid: false };
    }
    
    // 주소 부분 추출 (보통 3번째 부분: address-zip)
    const addressPart = pathParts[2];
    
    // 주소에서 ZIP 코드 분리
    const addressMatch = addressPart.match(/^(.+)-(\d{5})$/);
    let address = addressPart;
    
    if (addressMatch) {
      // ZIP 코드 제거하고 주소만 추출
      address = addressMatch[1].replace(/-/g, " ");
    } else {
      // ZIP 코드가 없는 경우 그대로 사용
      address = addressPart.replace(/-/g, " ");
    }
    
    // 도시 이름 추가 (2번째 부분)
    const city = pathParts[1]?.replace(/-/g, " ");
    // 주 이름 추가 (1번째 부분)
    const state = pathParts[0]?.toUpperCase();
    
    // 전체 주소 구성
    const fullAddress = city && state 
      ? `${address}, ${city}, ${state}`
      : address;
    
    // Property ID 추출 (마지막 부분)
    const propertyId = pathParts[pathParts.length - 1];
    
    return {
      platform: "redfin",
      address: fullAddress,
      propertyId,
      isValid: true,
    };
  } catch (error) {
    console.error("[URL Parser] Redfin URL 파싱 실패:", error);
    return { platform: "redfin", isValid: false };
  }
}

/**
 * Zillow URL에서 주소를 추출합니다.
 * 
 * Zillow URL 형식 예시:
 * - https://www.zillow.com/homedetails/123-Main-St-Los-Angeles-CA-90001/12345678_zpid/
 * - https://www.zillow.com/homes/123-Main-St-Los-Angeles-CA-90001_rb/
 */
function parseZillowUrl(url: string): ParsedListingUrl {
  try {
    const urlObj = new URL(url);
    
    // Zillow URL 패턴: /homedetails/address-zpid/ 또는 /homes/address-rb/
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    
    if (pathParts.length < 2) {
      return { platform: "zillow", isValid: false };
    }
    
    // homedetails 또는 homes 경로 확인
    const routeType = pathParts[0];
    
    if (routeType === "homedetails" || routeType === "homes") {
      // 주소 부분 추출 (2번째 부분)
      const addressPart = pathParts[1];
      
      // ZPID 또는 _rb 제거
      const address = addressPart
        .replace(/_\d+_zpid$/, "") // ZPID 제거
        .replace(/_rb$/, "") // _rb 제거
        .replace(/-/g, " "); // 하이픈을 공백으로 변환
      
      // ZPID 추출 (있는 경우)
      const zpidMatch = addressPart.match(/(\d+)_zpid$/);
      const propertyId = zpidMatch ? zpidMatch[1] : undefined;
      
      return {
        platform: "zillow",
        address,
        propertyId,
        isValid: true,
      };
    }
    
    return { platform: "zillow", isValid: false };
  } catch (error) {
    console.error("[URL Parser] Zillow URL 파싱 실패:", error);
    return { platform: "zillow", isValid: false };
  }
}

/**
 * URL에서 Redfin 또는 Zillow 링크를 감지하고 파싱합니다.
 * 
 * @param url - 파싱할 URL 문자열
 * @returns 파싱된 리스팅 정보
 * 
 * @example
 * ```typescript
 * const result = parseListingUrl("https://www.redfin.com/CA/Los-Angeles/123-Main-St-90001/home/12345678");
 * // { platform: "redfin", address: "123 Main St, Los Angeles, CA", isValid: true }
 * ```
 */
export function parseListingUrl(url: string): ParsedListingUrl {
  if (!url || typeof url !== "string") {
    return { platform: "unknown", isValid: false };
  }
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Redfin URL 감지
    if (hostname.includes("redfin.com")) {
      return parseRedfinUrl(url);
    }
    
    // Zillow URL 감지
    if (hostname.includes("zillow.com")) {
      return parseZillowUrl(url);
    }
    
    return { platform: "unknown", isValid: false };
  } catch (error) {
    console.error("[URL Parser] URL 파싱 실패:", error);
    return { platform: "unknown", isValid: false };
  }
}

/**
 * 텍스트에서 Redfin 또는 Zillow URL을 찾아 반환합니다.
 * 
 * @param text - 검색할 텍스트
 * @returns 발견된 URL 배열
 * 
 * @example
 * ```typescript
 * const urls = extractListingUrls("Check this out: https://www.redfin.com/...");
 * // ["https://www.redfin.com/..."]
 * ```
 */
export function extractListingUrls(text: string): string[] {
  if (!text || typeof text !== "string") {
    return [];
  }
  
  // URL 패턴 매칭 (http:// 또는 https://로 시작하는 redfin.com 또는 zillow.com URL)
  const urlPattern = /https?:\/\/(?:www\.)?(?:redfin|zillow)\.com\/[^\s<>"']+/gi;
  const matches = text.match(urlPattern);
  
  return matches || [];
}

/**
 * 텍스트에서 첫 번째 유효한 리스팅 URL을 찾아 파싱합니다.
 * 
 * @param text - 검색할 텍스트
 * @returns 파싱된 리스팅 정보 또는 null
 */
export function findAndParseListingUrl(text: string): ParsedListingUrl | null {
  const urls = extractListingUrls(text);
  
  for (const url of urls) {
    const parsed = parseListingUrl(url);
    if (parsed.isValid) {
      return parsed;
    }
  }
  
  return null;
}


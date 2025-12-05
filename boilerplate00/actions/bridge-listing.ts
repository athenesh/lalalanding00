"use server";

/**
 * @file bridge-listing.ts
 * @description Bridge Data Output API를 사용하여 부동산 리스팅 정보를 가져오는 Server Actions
 *
 * 이 모듈은 Redfin/Zillow URL에서 추출한 주소 정보를 사용하여
 * Bridge Data Output API로 리스팅 정보를 검색하고,
 * shared_listings 테이블 형식으로 변환합니다.
 *
 * 주요 기능:
 * 1. 주소로 리스팅 검색
 * 2. API 응답을 shared_listings 형식으로 변환
 * 3. 에러 처리 및 로깅
 *
 * @dependencies
 * - lib/listing/url-parser: URL 파싱 유틸리티
 */

import { parseListingUrl } from "@/lib/listing/url-parser";

/**
 * Bridge Data Output API 응답 타입
 */
interface BridgeListingResponse {
  "@odata.context"?: string;
  value: BridgeListing[];
}

interface BridgeListing {
  ListingKey?: string;
  ListPrice?: number;
  BedroomsTotal?: number;
  BathroomsTotalInteger?: number;
  LivingArea?: number; // 평수 (sqft)
  UnparsedAddress?: string;
  StandardStatus?: string;
  Media?: Array<{
    MediaURL?: string;
    MediaCategory?: string;
  }>;
  PropertyType?: string;
  YearBuilt?: number;
  LotSizeSquareFeet?: number;
}

/**
 * shared_listings 테이블에 저장할 형식으로 변환된 리스팅 정보
 */
export interface ListingData {
  address: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  title: string | null;
  thumbnail_url: string | null;
  listing_url: string;
}

/**
 * Bridge Data Output API로 리스팅을 검색합니다.
 * 
 * @param address - 검색할 주소
 * @returns 리스팅 정보 또는 null (찾지 못한 경우)
 */
async function searchListingByAddress(address: string): Promise<ListingData | null> {
  const apiKey = process.env.BRIDGE_DATA_API_KEY;
  
  if (!apiKey) {
    console.error("[Bridge API] BRIDGE_DATA_API_KEY is not set");
    throw new Error("Bridge Data Output API key is not configured");
  }
  
  try {
    console.log("[Bridge API] 주소로 리스팅 검색 시작:", { address });
    
    // Bridge Data Output API 엔드포인트
    // 참고: 실제 데이터베이스 이름은 API 키 발급 시 제공됩니다
    // 예시: https://api.bridgedataoutput.com/v2/OData/{database}/listings
    const database = process.env.BRIDGE_DATA_DATABASE || "bridge";
    const baseUrl = `https://api.bridgedataoutput.com/v2/OData/${database}/listings`;
    
    // OData 필터: 주소로 검색
    // UnparsedAddress 필드에 주소가 포함되어 있는지 확인
    const addressParts = address.split(",").map(part => part.trim());
    const streetAddress = addressParts[0] || address;
    
    // OData $filter 쿼리 구성
    // 주소의 일부가 포함된 리스팅 검색
    const filter = `contains(UnparsedAddress, '${encodeURIComponent(streetAddress)}')`;
    const select = "ListingKey,ListPrice,BedroomsTotal,BathroomsTotalInteger,LivingArea,UnparsedAddress,StandardStatus,Media,PropertyType";
    const top = "1"; // 첫 번째 결과만 가져오기
    
    const url = `${baseUrl}?$filter=${filter}&$select=${select}&$top=${top}`;
    
    console.log("[Bridge API] API 호출 URL:", url.replace(apiKey, "***"));
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      // Next.js Server Actions에서 fetch는 기본적으로 캐싱되므로 명시적으로 no-store 설정
      cache: "no-store",
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Bridge API] API 호출 실패:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      
      if (response.status === 401) {
        throw new Error("Bridge Data Output API 인증 실패. API 키를 확인하세요.");
      }
      
      if (response.status === 404) {
        // 리스팅을 찾지 못한 경우 null 반환 (에러가 아님)
        console.log("[Bridge API] 리스팅을 찾지 못함:", { address });
        return null;
      }
      
      throw new Error(`Bridge Data Output API 호출 실패: ${response.status} ${response.statusText}`);
    }
    
    const data: BridgeListingResponse = await response.json();
    
    if (!data.value || data.value.length === 0) {
      console.log("[Bridge API] 검색 결과 없음:", { address });
      return null;
    }
    
    const listing = data.value[0];
    console.log("[Bridge API] 리스팅 정보 조회 성공:", {
      listingKey: listing.ListingKey,
      address: listing.UnparsedAddress,
      price: listing.ListPrice,
    });
    
    // 썸네일 이미지 찾기 (Media 배열에서 첫 번째 이미지)
    const thumbnail = listing.Media?.find(
      (media) => media.MediaCategory === "Photo" || !media.MediaCategory
    )?.MediaURL || listing.Media?.[0]?.MediaURL || null;
    
    // 리스팅 제목 생성 (주소 또는 PropertyType 사용)
    const title = listing.UnparsedAddress || 
                  (listing.PropertyType ? `${listing.PropertyType} Property` : null);
    
    // shared_listings 형식으로 변환
    const listingData: ListingData = {
      address: listing.UnparsedAddress || null,
      price: listing.ListPrice || null,
      bedrooms: listing.BedroomsTotal || null,
      bathrooms: listing.BathroomsTotalInteger || null,
      square_feet: listing.LivingArea || null,
      title,
      thumbnail_url: thumbnail,
      listing_url: "", // 원본 URL은 호출하는 쪽에서 제공
    };
    
    return listingData;
  } catch (error) {
    console.error("[Bridge API] 리스팅 검색 중 오류:", error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error("리스팅 정보를 가져오는 중 오류가 발생했습니다.");
  }
}

/**
 * Redfin 또는 Zillow URL에서 리스팅 정보를 가져옵니다.
 * 
 * @param listingUrl - Redfin 또는 Zillow URL
 * @returns 리스팅 정보 또는 null
 */
export async function fetchListingFromUrl(listingUrl: string): Promise<ListingData | null> {
  try {
    console.log("[Bridge API] URL에서 리스팅 정보 가져오기 시작:", { listingUrl });
    
    // URL 파싱
    const parsed = parseListingUrl(listingUrl);
    
    if (!parsed.isValid || !parsed.address) {
      console.warn("[Bridge API] 유효하지 않은 URL 또는 주소 추출 실패:", { listingUrl, parsed });
      return null;
    }
    
    // 주소로 리스팅 검색
    const listingData = await searchListingByAddress(parsed.address);
    
    if (listingData) {
      // 원본 URL 추가
      listingData.listing_url = listingUrl;
    }
    
    return listingData;
  } catch (error) {
    console.error("[Bridge API] URL에서 리스팅 정보 가져오기 실패:", error);
    throw error;
  }
}

/**
 * 주소로 직접 리스팅을 검색합니다.
 * 
 * @param address - 검색할 주소
 * @returns 리스팅 정보 또는 null
 */
export async function fetchListingByAddress(address: string): Promise<ListingData | null> {
  return searchListingByAddress(address);
}


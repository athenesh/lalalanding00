"use server";

/**
 * @file gemini-listing.ts
 * @description Gemini API를 사용하여 부동산 리스팅 정보를 추출하는 Server Actions
 *
 * 이 모듈은 URL 또는 텍스트 설명에서 부동산 리스팅 정보를 추출하고,
 * shared_listings 테이블 형식으로 변환합니다.
 *
 * 주요 기능:
 * 1. Gemini API를 사용하여 URL/텍스트에서 리스팅 정보 추출
 * 2. Gemini 응답을 shared_listings 테이블 형식으로 변환
 * 3. 에러 처리 및 로깅
 *
 * @dependencies
 * - @google/genai: Gemini API 클라이언트
 */

import { GoogleGenAI } from "@google/genai";

/**
 * Gemini API 응답 형식
 */
interface GeminiListingData {
  unitName: string;
  price: string;
  beds: number | string;
  baths: number | string;
  sqft: string;
  complexName: string;
  fullAddress: string;
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
 * 가격 문자열을 숫자로 변환합니다.
 * 예: "$3,590-$3,605/mo" -> 3590 또는 3605 (첫 번째 값 사용)
 * 예: "$500,000" -> 500000
 */
function parsePrice(priceString: string): number | null {
  if (!priceString) return null;

  try {
    // 숫자와 쉼표, 달러 기호만 추출
    const cleaned = priceString.replace(/[^0-9,]/g, "");
    // 첫 번째 숫자 범위 추출 (예: "3590-3605" -> "3590")
    const firstNumber = cleaned.split(",").join("").split("-")[0];
    const parsed = parseInt(firstNumber, 10);

    if (isNaN(parsed)) return null;
    return parsed;
  } catch (error) {
    console.error("[Gemini] 가격 파싱 실패:", error);
    return null;
  }
}

/**
 * 문자열을 숫자로 변환합니다.
 */
function parseNumber(value: number | string): number | null {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;

  try {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  } catch (error) {
    console.error("[Gemini] 숫자 파싱 실패:", error);
    return null;
  }
}

/**
 * 평수 문자열을 숫자로 변환합니다.
 * 예: "1,211" -> 1211
 */
function parseSquareFeet(sqftString: string): number | null {
  if (!sqftString) return null;

  try {
    const cleaned = sqftString.replace(/[^0-9]/g, "");
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? null : parsed;
  } catch (error) {
    console.error("[Gemini] 평수 파싱 실패:", error);
    return null;
  }
}

/**
 * Gemini API 응답을 shared_listings 형식으로 변환합니다.
 */
function convertGeminiToListingData(
  geminiData: GeminiListingData,
  listingUrl: string
): ListingData {
  console.log("[Gemini] 데이터 변환 시작:", { geminiData, listingUrl });

  // title 생성: complexName과 unitName 조합
  const titleParts: string[] = [];
  if (geminiData.complexName) {
    titleParts.push(geminiData.complexName);
  }
  if (geminiData.unitName && geminiData.unitName !== "-") {
    titleParts.push(geminiData.unitName);
  }
  const title = titleParts.length > 0 ? titleParts.join(" - ") : null;

  const listingData: ListingData = {
    address: geminiData.fullAddress || null,
    price: parsePrice(geminiData.price),
    bedrooms: parseNumber(geminiData.beds),
    bathrooms: parseNumber(geminiData.baths),
    square_feet: parseSquareFeet(geminiData.sqft),
    title,
    thumbnail_url: null, // Gemini API는 썸네일을 제공하지 않음
    listing_url: listingUrl,
  };

  console.log("[Gemini] 데이터 변환 완료:", listingData);
  return listingData;
}

/**
 * Gemini API를 사용하여 URL 또는 텍스트에서 리스팅 정보를 추출합니다.
 *
 * @param text - 리스팅 URL 또는 텍스트 설명
 * @param listingUrl - 원본 리스팅 URL (있는 경우)
 * @returns 리스팅 정보 또는 null
 */
export async function fetchListingFromText(
  text: string,
  listingUrl?: string
): Promise<ListingData | null> {
  try {
    console.log("[Gemini] 리스팅 정보 추출 시작:", { text, listingUrl });

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("[Gemini] GEMINI_API_KEY is not set");
      throw new Error("Gemini API key is not configured");
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a real estate extraction assistant. 
      The user will provide a Real Estate URL, a raw description, or an address.
      
      YOUR TASK:
      1. If it is a URL or address, use Google Search to find the most recent listing details.
      2. Extract the following fields: Unit Name (or short title), Price, Beds, Baths, Sqft, Complex Name, Full Address.
      3. Format the Output as a STRICT JSON object. Do not include markdown formatting like \`\`\`json.

      Input: "${text}"

      Required JSON Structure:
      {
        "unitName": "String (e.g. 'B6', 'Plan A')",
        "price": "String (e.g. '$3,590-$3,605/mo')",
        "beds": "String (e.g. '2')",
        "baths": "String (e.g. '2')",
        "sqft": "String (e.g. '1,211')",
        "complexName": "String",
        "fullAddress": "String"
      }`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    });

    const outputText = response.text || "{}";

    // Clean up potential markdown code blocks if the model adds them despite instructions
    const jsonString = outputText.replace(/```json/g, "").replace(/```/g, "").trim();

    const geminiData = JSON.parse(jsonString) as GeminiListingData;

    console.log("[Gemini] API 응답 수신:", geminiData);

    // URL이 제공되지 않은 경우, 입력 텍스트에서 URL 추출 시도
    const finalListingUrl = listingUrl || text;

    const listingData = convertGeminiToListingData(geminiData, finalListingUrl);

    console.log("[Gemini] 리스팅 정보 추출 성공:", listingData);
    return listingData;
  } catch (error) {
    console.error("[Gemini] 리스팅 정보 추출 실패:", error);
    throw error;
  }
}


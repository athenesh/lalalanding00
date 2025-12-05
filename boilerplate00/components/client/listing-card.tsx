"use client";

/**
 * @file listing-card.tsx
 * @description 부동산 리스팅 정보를 카드 형태로 표시하는 컴포넌트
 *
 * 이 컴포넌트는 Gemini API에서 가져온 리스팅 정보를
 * 채팅 메시지 하단에 카드 형태로 표시합니다.
 *
 * 주요 기능:
 * 1. 가격, bed/bath, 평수(sqft), 주소 표시
 * 2. 원본 링크로 이동 기능
 *
 * @dependencies
 * - listing-card-generator 스타일 기반
 */

import { cn } from "@/lib/utils";

export interface ListingCardProps {
  address: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  title: string | null;
  thumbnail_url: string | null;
  listing_url: string;
  className?: string;
}

/**
 * 가격을 포맷팅합니다.
 * 예: 500000 -> "$500,000"
 */
function formatPrice(price: number | null): string {
  if (!price) return "Price TBD";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * title에서 unitName과 complexName을 추출합니다.
 * 형식: "Complex Name - Unit Name" 또는 "Unit Name" 또는 "Complex Name"
 */
function parseTitle(title: string | null): {
  unitName: string;
  complexName: string;
} {
  if (!title) {
    return { unitName: "-", complexName: "" };
  }

  // " - " 구분자로 분리
  const parts = title.split(" - ").map((p) => p.trim());

  if (parts.length === 2) {
    return {
      complexName: parts[0],
      unitName: parts[1],
    };
  } else if (parts.length === 1) {
    // 단일 값인 경우, 짧으면 unitName, 길면 complexName으로 간주
    const single = parts[0];
    if (single.length <= 10) {
      return { unitName: single, complexName: "" };
    } else {
      return { unitName: "-", complexName: single };
    }
  }

  return { unitName: "-", complexName: "" };
}

export default function ListingCard({
  address,
  price,
  bedrooms,
  bathrooms,
  square_feet,
  title,
  listing_url,
  className,
}: ListingCardProps) {
  const handleViewListing = () => {
    if (listing_url) {
      window.open(listing_url, "_blank", "noopener,noreferrer");
    }
  };

  const { unitName, complexName } = parseTitle(title);
  const formattedPrice = formatPrice(price);
  const beds = bedrooms !== null && bedrooms !== undefined ? bedrooms : "-";
  const baths =
    bathrooms !== null && bathrooms !== undefined ? bathrooms : "-";
  const sqft =
    square_feet !== null && square_feet !== undefined
      ? new Intl.NumberFormat("en-US").format(square_feet)
      : "-";

  return (
    <div
      className={cn(
        "w-full min-w-0 bg-white shadow-xl overflow-hidden border border-gray-300",
        className
      )}
    >
      {/* Content Body (반응형 패딩 및 텍스트 크기, 모바일 최적화) */}
      <div className="p-2 sm:p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center text-center">
        {/* Unit Name (e.g. B6) */}
        <div className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl 3xl:text-4xl font-normal text-black mb-1 sm:mb-2">
          {unitName}
        </div>

        {/* Price */}
        <div className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl text-black font-normal mb-1">
          {formattedPrice}
        </div>

        {/* Bed/Bath & Sqft */}
        <div className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl text-black font-normal mb-1">
          {beds}&{baths} · {sqft !== "-" ? `${sqft} Sqft.` : "Sqft. TBD"}
        </div>

        {/* Complex Name & Address */}
        <div className="text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl 3xl:text-2xl text-black font-normal leading-tight mt-1">
          {complexName && <div>{complexName}</div>}
          <div className="mt-1">{address || "주소 정보 없음"}</div>
        </div>

        {/* 원본 링크 버튼 (클릭 가능한 영역) */}
        {listing_url && (
          <button
            onClick={handleViewListing}
            className="mt-2 sm:mt-4 text-[10px] sm:text-xs md:text-sm text-blue-600 hover:text-blue-800 underline"
          >
            원본 링크 보기
          </button>
        )}
      </div>
    </div>
  );
}

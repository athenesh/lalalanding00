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
 * 3. 메모 기능 (인라인 편집, 자동 저장)
 *
 * @dependencies
 * - listing-card-generator 스타일 기반
 * - actions/listing-notes: 메모 업데이트 Server Action
 */

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { updateListingNotes } from "@/actions/listing-notes";
import { useToast } from "@/hooks/use-toast";

export interface ListingCardProps {
  id: string;
  address: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  title: string | null;
  thumbnail_url: string | null;
  listing_url: string;
  notes: string | null;
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
  id,
  address,
  price,
  bedrooms,
  bathrooms,
  square_feet,
  title,
  listing_url,
  notes: initialNotes,
  className,
}: ListingCardProps) {
  const [notes, setNotes] = useState<string | null>(initialNotes);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // 초기 notes가 변경되면 상태 업데이트 (다른 사용자가 수정한 경우)
  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  // 편집 모드 진입 시 textarea 포커스
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // 커서를 끝으로 이동
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [isEditing]);

  const handleViewListing = () => {
    if (listing_url) {
      window.open(listing_url, "_blank", "noopener,noreferrer");
    }
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);

    // 기존 타이머 취소
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 1초 후 자동 저장 (debounce)
    saveTimeoutRef.current = setTimeout(async () => {
      await saveNotes(value);
    }, 1000);
  };

  const saveNotes = async (valueToSave: string) => {
    if (isSaving) return;

    const trimmedValue = valueToSave.trim();
    const finalValue = trimmedValue === "" ? null : trimmedValue;

    // 값이 변경되지 않았으면 저장하지 않음
    if (finalValue === initialNotes) {
      return;
    }

    try {
      setIsSaving(true);
      console.log("[ListingCard] 메모 저장 시작:", {
        listingId: id,
        notesLength: finalValue?.length || 0,
      });

      const result = await updateListingNotes(id, finalValue);

      if (result.success) {
        console.log("[ListingCard] 메모 저장 성공:", {
          listingId: id,
          notesLength: finalValue?.length || 0,
        });
        // 성공적으로 저장되면 초기값 업데이트 (중복 저장 방지)
        // initialNotes는 prop이므로 부모 컴포넌트에서 업데이트됨
      } else {
        console.error("[ListingCard] 메모 저장 실패:", result.error);
        toast({
          title: "저장 실패",
          description: result.error || "메모 저장에 실패했습니다.",
          variant: "destructive",
        });
        // 저장 실패 시 이전 값으로 복원
        setNotes(initialNotes);
      }
    } catch (error) {
      console.error("[ListingCard] 메모 저장 중 예상치 못한 에러:", error);
      toast({
        title: "저장 실패",
        description: "메모 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      setNotes(initialNotes);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlur = async () => {
    // 포커스 아웃 시 즉시 저장 (debounce 타이머가 있으면 취소하고 바로 저장)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    await saveNotes(notes || "");
    setIsEditing(false);
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const { unitName, complexName } = parseTitle(title);
  const formattedPrice = formatPrice(price);
  const beds = bedrooms !== null && bedrooms !== undefined ? bedrooms : "-";
  const baths = bathrooms !== null && bathrooms !== undefined ? bathrooms : "-";
  const sqft =
    square_feet !== null && square_feet !== undefined
      ? new Intl.NumberFormat("en-US").format(square_feet)
      : "-";

  return (
    <div
      className={cn(
        "w-full min-w-0 bg-white shadow-xl overflow-hidden border border-gray-300",
        className,
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

        {/* 메모 섹션 */}
        <div className="mt-2 sm:mt-3 w-full">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={notes || ""}
              onChange={(e) => handleNotesChange(e.target.value)}
              onBlur={handleBlur}
              placeholder="메모를 입력하세요..."
              className="w-full min-h-[60px] px-2 py-1 text-[10px] sm:text-xs md:text-sm border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          ) : (
            <button
              onClick={handleEditClick}
              className="w-full text-left px-2 py-1 text-[10px] sm:text-xs md:text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors min-h-[40px]"
            >
              {notes ? (
                <div className="whitespace-pre-wrap break-words">{notes}</div>
              ) : (
                <div className="text-gray-400 italic">메모 추가</div>
              )}
            </button>
          )}
          {isSaving && (
            <div className="text-[8px] sm:text-[10px] text-gray-400 mt-1">
              저장 중...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

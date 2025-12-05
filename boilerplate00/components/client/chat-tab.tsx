"use client";

/**
 * @file chat-tab.tsx
 * @description 채팅 탭 컴포넌트 - Supabase 연동 및 리스팅 카드 표시
 *
 * 이 컴포넌트는 클라이언트와 에이전트 간의 채팅을 제공하며,
 * Redfin/Zillow URL이 포함된 메시지의 경우 리스팅 카드를 표시합니다.
 *
 * 주요 기능:
 * 1. Supabase에서 메시지 및 리스팅 정보 로드
 * 2. 메시지 전송 (API Route 사용)
 * 3. 입력창 아래에 리스팅 카드 표시 (역순 그리드 레이아웃)
 * 4. 폴링 방식으로 새 메시지 확인 (5초마다, 최적화됨)
 *
 * @dependencies
 * - app/api/messages/route.ts: 메시지 전송/조회 API
 * - components/client/listing-card.tsx: 리스팅 카드 컴포넌트
 * - hooks/use-toast.ts: 토스트 알림
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import ListingCard from "@/components/client/listing-card";

interface Message {
  id: string;
  content: string;
  sender_clerk_id: string;
  sender_type: "agent" | "client";
  created_at: string;
}

interface Listing {
  id: string;
  listing_url: string;
  address: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  title: string | null;
  thumbnail_url: string | null;
  notes: string | null;
  created_at: string | null;
}

interface ChatTabProps {
  userType: "agent" | "client";
  clientId?: string; // 에이전트인 경우 필수
}

export default function ChatTab({ userType, clientId }: ChatTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef<number>(0);
  const prevMessagesDataRef = useRef<string>("");
  const prevListingsDataRef = useRef<string>("");
  const isInitialLoadRef = useRef<boolean>(true);
  const { toast } = useToast();
  const toastRef = useRef(toast);

  // toast ref 업데이트
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  // 데이터 깊은 비교 함수
  const hasDataChanged = (oldData: string, newData: string): boolean => {
    return oldData !== newData;
  };

  // 메시지 및 리스팅 로드 (최적화됨)
  const loadMessages = useCallback(
    async (isInitial = false) => {
      try {
        // 초기 로드가 아닐 때는 isLoading을 변경하지 않음 (깜빡거림 방지)
        if (isInitial) {
          setIsLoading(true);
        }
        console.log("[ChatTab] 메시지 로드 시작", { isInitial });

        const url = clientId
          ? `/api/messages?client_id=${clientId}`
          : "/api/messages";

        const response = await fetch(url);

        if (!response.ok) {
          if (response.status === 404) {
            // 채팅방이 없으면 빈 목록 반환
            setMessages([]);
            setListings([]);
            prevMessagesDataRef.current = "[]";
            prevListingsDataRef.current = "[]";
            return;
          }
          throw new Error("Failed to load messages");
        }

        const data = await response.json();
        const newMessages = data.messages || [];
        const rawListings = data.listings || [];

        // 리스팅 데이터 타입 정규화 (bathrooms, bedrooms, price, square_feet를 숫자로 변환)
        const normalizedListings = rawListings.map((listing: any) => ({
          ...listing,
          bathrooms:
            typeof listing.bathrooms === "string"
              ? parseFloat(listing.bathrooms) || null
              : listing.bathrooms,
          bedrooms:
            typeof listing.bedrooms === "string"
              ? parseInt(listing.bedrooms, 10) || null
              : listing.bedrooms,
          price:
            typeof listing.price === "string"
              ? parseFloat(listing.price) || null
              : listing.price,
          square_feet:
            typeof listing.square_feet === "string"
              ? parseInt(listing.square_feet, 10) || null
              : listing.square_feet,
        }));

        // 데이터 깊은 비교
        const newMessagesData = JSON.stringify(newMessages);
        const newListingsData = JSON.stringify(normalizedListings);

        const messagesChanged = hasDataChanged(
          prevMessagesDataRef.current,
          newMessagesData,
        );
        const listingsChanged = hasDataChanged(
          prevListingsDataRef.current,
          newListingsData,
        );

        // 데이터가 실제로 변경된 경우 또는 리스팅이 있을 때 항상 상태 업데이트
        // (리스팅이 있으면 폴링 최적화를 우회하여 항상 표시되도록)
        const shouldUpdate =
          messagesChanged ||
          listingsChanged ||
          isInitial ||
          normalizedListings.length > 0;

        if (shouldUpdate) {
          setMessages(newMessages);
          setListings(normalizedListings);
          prevMessagesDataRef.current = newMessagesData;
          prevListingsDataRef.current = newListingsData;

          console.log("[ChatTab] 메시지 로드 성공:", {
            messageCount: newMessages.length,
            listingCount: normalizedListings.length,
            messagesChanged,
            listingsChanged,
            shouldUpdate,
          });
        } else {
          console.log("[ChatTab] 데이터 변경 없음, 상태 업데이트 스킵");
        }
      } catch (error) {
        // 네트워크 연결 실패는 조용히 처리 (서버 재시작 중일 수 있음)
        if (
          error instanceof TypeError &&
          (error.message.includes("fetch") ||
            error.message.includes("Failed to fetch"))
        ) {
          console.warn("[ChatTab] 서버 연결 실패 (서버가 재시작 중일 수 있음)");
          // 토스트는 표시하지 않음 (과도한 알림 방지)
          return;
        }

        console.error("[ChatTab] 메시지 로드 실패:", error);
        // toastRef를 사용하여 의존성 문제 해결
        toastRef.current({
          title: "오류",
          description: "메시지를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        if (isInitial) {
          setIsLoading(false);
          isInitialLoadRef.current = false;
        }
      }
    },
    [clientId],
  );

  // 초기 로드 및 폴링 (최적화됨)
  useEffect(() => {
    loadMessages(true); // 초기 로드

    // 5초마다 새 메시지 확인 (폴링)
    // 데이터 변경이 없으면 상태 업데이트를 스킵하여 깜빡거림 방지
    const interval = setInterval(() => {
      loadMessages(false).catch((error) => {
        // 연결 실패 시 에러 로그만 출력하고 계속 시도
        // (서버가 재시작되면 자동으로 복구됨)
        if (error instanceof TypeError && error.message.includes("fetch")) {
          // 네트워크 에러는 조용히 처리 (콘솔 스팸 방지)
          return;
        }
        // 다른 에러는 로그 출력
        console.error("[ChatTab] 폴링 중 에러:", error);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [loadMessages]);

  // 메시지 전송
  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;

    try {
      setIsSending(true);
      console.log("[ChatTab] 메시지 전송 시작:", { content: inputValue });

      const body: { content: string; client_id?: string } = {
        content: inputValue.trim(),
      };

      if (userType === "agent" && clientId) {
        body.client_id = clientId;
      }

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      const data = await response.json();
      console.log("[ChatTab] 메시지 전송 성공:", {
        messageId: data.message.id,
      });

      // 입력 필드 초기화
      setInputValue("");

      // 리스팅이 생성된 경우 강제 업데이트 (isInitial을 true로 설정)
      if (data.listing_id) {
        toast({
          title: "리스팅 정보 추가됨",
          description: "부동산 정보가 카드로 표시되었습니다.",
        });
        // 리스팅이 생성되었으면 강제로 다시 로드 (isInitial을 true로 설정)
        await loadMessages(true);
      } else {
        // 리스팅이 없으면 일반 로드
        await loadMessages(false);
      }
    } catch (error) {
      console.error("[ChatTab] 메시지 전송 실패:", error);
      toast({
        title: "전송 실패",
        description:
          error instanceof Error
            ? error.message
            : "메시지 전송에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 스크롤 최적화: 메시지가 실제로 추가되었을 때만 스크롤
  useEffect(() => {
    const currentMessageCount = messages.length;
    // 메시지가 추가된 경우에만 스크롤 (초기 로드 또는 새 메시지)
    if (
      currentMessageCount > prevMessageCountRef.current ||
      isInitialLoadRef.current
    ) {
      scrollToBottom();
      prevMessageCountRef.current = currentMessageCount;
    }
  }, [messages]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 메시지 길이에 따라 줄바꿈 여부 결정 (25글자 이상일 때만 줄바꿈)
  const shouldWrapMessage = (content: string) => {
    return content.length >= 25;
  };

  // 그리드 레이아웃을 위한 리스팅 정렬
  // 가장 최신 리스팅이 첫 번째에 오도록 정렬 (created_at 기준, 최신->오래된 순서)
  const sortedListings = [...listings].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA; // 최신부터 오래된 순서
  });

  // 그리드 레이아웃을 위한 행 분할
  // 4개씩 묶어서 행으로 만들기
  // sortedListings는 이미 최신->오래된 순서이므로, 각 행은 그대로 사용
  // CSS Grid는 왼쪽->오른쪽으로 채워지므로, [16,15,14,13] 순서면 왼쪽에 16, 오른쪽에 13이 됨
  const getGridRows = () => {
    const rows: Listing[][] = [];
    const itemsPerRow = 4;

    for (let i = 0; i < sortedListings.length; i += itemsPerRow) {
      rows.push(sortedListings.slice(i, i + itemsPerRow));
    }

    // 행들은 위에서 아래로 배치 (정순)
    return rows;
  };

  const gridRows = getGridRows();

  return (
    <div className="flex flex-col min-h-[500px] max-h-[700px] bg-background rounded-lg border border-border w-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[360px]">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">메시지를 불러오는 중...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              아직 메시지가 없습니다. 첫 메시지를 보내보세요!
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender_type === userType;

            return (
              <div key={message.id} className="space-y-2">
                <div
                  className={cn(
                    "flex",
                    isOwnMessage ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "flex flex-col",
                      isOwnMessage ? "items-end" : "items-start",
                      shouldWrapMessage(message.content)
                        ? "max-w-[80%] md:max-w-[60%] lg:max-w-[50%]"
                        : "max-w-fit",
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-lg px-4 py-2",
                        isOwnMessage
                          ? "chat-bubble-agent"
                          : "chat-bubble-client",
                        shouldWrapMessage(message.content)
                          ? "break-words"
                          : "whitespace-nowrap",
                      )}
                    >
                      {message.content}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요... (Redfin/Zillow 링크 포함 가능)"
            className="flex-1"
            disabled={isSending}
          />
          <Button onClick={handleSend} size="icon" disabled={isSending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 리스팅 카드 섹션 (입력창 아래, 최신이 상단 왼쪽, 오래된 것이 하단 오른쪽) */}
      {sortedListings.length > 0 && (
        <div className="p-4 border-t border-border bg-muted/30 max-w-full">
          <div className="flex flex-col gap-1 sm:gap-2 md:gap-4">
            {gridRows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className="grid grid-cols-4 gap-1 sm:gap-2 md:gap-4"
              >
                {row.map((listing) => (
                  <div key={listing.id} className="col-span-1 min-w-0">
                    <ListingCard
                      id={listing.id}
                      address={listing.address}
                      price={listing.price}
                      bedrooms={listing.bedrooms}
                      bathrooms={listing.bathrooms}
                      square_feet={listing.square_feet}
                      title={listing.title}
                      thumbnail_url={listing.thumbnail_url}
                      listing_url={listing.listing_url}
                      notes={listing.notes}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

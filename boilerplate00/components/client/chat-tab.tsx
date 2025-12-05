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
        const newListings = data.listings || [];

        // 데이터 깊은 비교
        const newMessagesData = JSON.stringify(newMessages);
        const newListingsData = JSON.stringify(newListings);

        const messagesChanged = hasDataChanged(
          prevMessagesDataRef.current,
          newMessagesData,
        );
        const listingsChanged = hasDataChanged(
          prevListingsDataRef.current,
          newListingsData,
        );

        // 데이터가 실제로 변경된 경우에만 상태 업데이트
        if (messagesChanged || listingsChanged || isInitial) {
          setMessages(newMessages);
          setListings(newListings);
          prevMessagesDataRef.current = newMessagesData;
          prevListingsDataRef.current = newListingsData;

          console.log("[ChatTab] 메시지 로드 성공:", {
            messageCount: newMessages.length,
            listingCount: newListings.length,
            messagesChanged,
            listingsChanged,
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

      // 메시지 목록 새로고침 (초기 로드가 아니므로 false)
      await loadMessages(false);

      // 리스팅이 생성된 경우 알림
      if (data.listing_id) {
        toast({
          title: "리스팅 정보 추가됨",
          description: "부동산 정보가 카드로 표시되었습니다.",
        });
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

  // 역순 그리드 레이아웃을 위한 리스팅 정렬
  // 가장 최근 리스팅이 마지막에 오도록 정렬 (created_at 기준)
  const sortedListings = [...listings].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeA - timeB; // 오래된 것부터 최신 순서
  });

  // 역순 그리드 레이아웃: 5개 이상이면 첫 행에 5번째, 둘째 행에 1-4번째
  const getGridLayout = () => {
    if (sortedListings.length === 0) return { topRow: [], bottomRow: [] };

    if (sortedListings.length >= 5) {
      // 5개 이상: 첫 행에 5번째 (index 4), 둘째 행에 1-4번째 (index 0-3)
      return {
        topRow: [sortedListings[4]],
        bottomRow: sortedListings.slice(0, 4),
      };
    } else {
      // 4개 이하: 둘째 행에만 표시
      return {
        topRow: [],
        bottomRow: sortedListings,
      };
    }
  };

  const { topRow, bottomRow } = getGridLayout();

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

      {/* 리스팅 카드 섹션 (입력창 아래, 역순 그리드 레이아웃) */}
      {sortedListings.length > 0 && (
        <div className="p-4 border-t border-border bg-muted/30 max-w-full">
          <div className="space-y-4">
            {/* 첫 행: 5번째 카드 (5개 이상인 경우만) */}
            {topRow.length > 0 && (
              <div className="grid grid-cols-4 gap-1 sm:gap-2 md:gap-4">
                <div className="col-span-1 min-w-0">
                  <ListingCard
                    key={topRow[0].id}
                    address={topRow[0].address}
                    price={topRow[0].price}
                    bedrooms={topRow[0].bedrooms}
                    bathrooms={topRow[0].bathrooms}
                    square_feet={topRow[0].square_feet}
                    title={topRow[0].title}
                    thumbnail_url={topRow[0].thumbnail_url}
                    listing_url={topRow[0].listing_url}
                  />
                </div>
              </div>
            )}

            {/* 둘째 행: 1-4번째 카드 (또는 모든 카드) */}
            {bottomRow.length > 0 && (
              <div className="grid grid-cols-4 gap-1 sm:gap-2 md:gap-4">
                {bottomRow.map((listing) => (
                  <div key={listing.id} className="col-span-1 min-w-0">
                    <ListingCard
                      address={listing.address}
                      price={listing.price}
                      bedrooms={listing.bedrooms}
                      bathrooms={listing.bathrooms}
                      square_feet={listing.square_feet}
                      title={listing.title}
                      thumbnail_url={listing.thumbnail_url}
                      listing_url={listing.listing_url}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
import { X, RotateCcw } from "lucide-react"; // 아이콘 추가
import { updateListingExcluded } from "@/actions/listing-excluded";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CHAT_CONFIG } from "@/lib/config/chat";

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
  is_excluded?: boolean; // 추가
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
          if (response.status === 401) {
            // 클라이언트 레코드가 없을 수 있으므로 자동 생성 시도
            console.log("[ChatTab] 401 에러 - 클라이언트 레코드 자동 생성 시도");
            const createResponse = await fetch("/api/clients/auto-create", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({}),
            });

            if (createResponse.ok) {
              console.log("[ChatTab] 클라이언트 레코드 생성 성공, 재시도");
              // 재시도
              const retryResponse = await fetch(url);
              if (retryResponse.ok) {
                // 성공 처리 로직은 아래로 계속
                const data = await retryResponse.json();
                const loadedMessages = data.messages || [];
                const loadedListings = data.listings || [];

                // 데이터 변경 확인
                const messagesDataStr = JSON.stringify(loadedMessages);
                const listingsDataStr = JSON.stringify(loadedListings);

                if (
                  hasDataChanged(
                    prevMessagesDataRef.current,
                    messagesDataStr,
                  ) ||
                  hasDataChanged(prevListingsDataRef.current, listingsDataStr)
                ) {
                  setMessages(loadedMessages);
                  setListings(loadedListings);
                  prevMessagesDataRef.current = messagesDataStr;
                  prevListingsDataRef.current = listingsDataStr;
                }

                if (isInitial) {
                  setIsLoading(false);
                  isInitialLoadRef.current = false;
                }
                return;
              }
            }
            // 자동 생성 실패 시 조용히 처리
            console.warn("[ChatTab] 클라이언트 레코드 자동 생성 실패");
            setMessages([]);
            setListings([]);
            prevMessagesDataRef.current = "[]";
            prevListingsDataRef.current = "[]";
            if (isInitial) {
              setIsLoading(false);
              isInitialLoadRef.current = false;
            }
            return;
          }

          if (response.status === 404) {
            // 채팅방이 없으면 빈 목록 반환
            setMessages([]);
            setListings([]);
            prevMessagesDataRef.current = "[]";
            prevListingsDataRef.current = "[]";
            return;
          }

          // 응답이 HTML인지 확인
          const contentType = response.headers.get("content-type");
          if (contentType && !contentType.includes("application/json")) {
            // HTML 응답인 경우 (에러 페이지 등)
            const text = await response.text();
            console.error("[ChatTab] HTML 응답 수신:", {
              status: response.status,
              contentType,
              preview: text.substring(0, 200),
            });

            // 인증 에러인 경우 조용히 처리 (리다이렉트될 수 있음)
            if (response.status === 401 || response.status === 403) {
              console.warn("[ChatTab] 인증 실패, 조용히 처리");
              return;
            }

            throw new Error(
              `서버 오류 (${response.status}): HTML 응답을 받았습니다.`,
            );
          }

          // JSON 에러 응답인 경우
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Failed to load messages (${response.status})`,
          );
        }

        // Content-Type 확인
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          // JSON이 아닌 응답인 경우
          const text = await response.text();
          console.error("[ChatTab] JSON이 아닌 응답 수신:", {
            contentType,
            preview: text.substring(0, 200),
          });
          throw new Error("서버가 JSON이 아닌 응답을 반환했습니다.");
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

        // JSON 파싱 에러인 경우 특별 처리
        if (error instanceof SyntaxError && error.message.includes("JSON")) {
          console.error("[ChatTab] JSON 파싱 실패:", error);
          // 폴링 중이면 조용히 처리 (초기 로드가 아닐 때)
          if (!isInitial) {
            console.warn("[ChatTab] 폴링 중 JSON 파싱 실패, 조용히 처리");
            return;
          }
          // 초기 로드 시에만 에러 표시
          toastRef.current({
            title: "오류",
            description:
              "서버 응답 형식이 올바르지 않습니다. 페이지를 새로고침해주세요.",
            variant: "destructive",
          });
          return;
        }

        console.error("[ChatTab] 메시지 로드 실패:", error);
        // toastRef를 사용하여 의존성 문제 해결
        toastRef.current({
          title: "오류",
          description:
            error instanceof Error
              ? error.message
              : "메시지를 불러오는데 실패했습니다.",
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

  // 초기 로드 및 폴링 (개선됨: 자동 복구, 백오프, 포커스 감지)
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let retryCount = 0;
    let isPollingActive = true;

    const startPolling = () => {
      // 페이지가 숨겨져 있거나 오프라인일 때는 폴링 중지
      if (document.hidden || !navigator.onLine) {
        console.log("[ChatTab] 폴링 일시 중지:", {
          hidden: document.hidden,
          online: navigator.onLine,
        });
        return;
      }

      // 기존 interval이 있으면 정리
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }

      // 재시도 카운트에 따라 간격 조정 (백오프 적용)
      const currentInterval =
        retryCount > 0
          ? CHAT_CONFIG.POLLING_INTERVAL *
            Math.pow(CHAT_CONFIG.BACKOFF_MULTIPLIER, retryCount)
          : CHAT_CONFIG.POLLING_INTERVAL;

      intervalId = setInterval(async () => {
        if (!isPollingActive) return;

        try {
          await loadMessages(false);
          // 성공 시 재시도 카운터 리셋
          if (retryCount > 0) {
            console.log("[ChatTab] 폴링 복구 성공, 정상 간격으로 복귀");
            retryCount = 0;
            startPolling(); // 정상 간격으로 재시작
          }
        } catch (error) {
          retryCount++;

          // 최대 재시도 횟수 초과 시
          if (retryCount >= CHAT_CONFIG.MAX_RETRY_COUNT) {
            console.error("[ChatTab] 폴링 실패 횟수 초과:", {
              retryCount,
              maxRetries: CHAT_CONFIG.MAX_RETRY_COUNT,
            });

            // 백오프 적용하여 재시작
            const backoffInterval =
              CHAT_CONFIG.POLLING_INTERVAL *
              Math.pow(CHAT_CONFIG.BACKOFF_MULTIPLIER, retryCount);

            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }

            setTimeout(() => {
              retryCount = 0; // 재시도 카운터 리셋
              startPolling(); // 폴링 재시작
            }, backoffInterval);
          } else {
            // 재시도 카운터 증가, 다음 폴링에서 간격 자동 조정됨
            console.warn("[ChatTab] 폴링 실패:", {
              retryCount,
              nextInterval:
                CHAT_CONFIG.POLLING_INTERVAL *
                Math.pow(CHAT_CONFIG.BACKOFF_MULTIPLIER, retryCount),
            });
          }
        }
      }, currentInterval);

      console.log("[ChatTab] 폴링 시작:", {
        interval: currentInterval,
        retryCount,
      });
    };

    // 초기 로드
    loadMessages(true).then(() => {
      // 초기 로드 성공 후 폴링 시작
      startPolling();
    });

    // 페이지 가시성 변경 감지
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 백그라운드로 갈 때 폴링 중지
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
          console.log("[ChatTab] 페이지 숨김, 폴링 중지");
        }
      } else {
        // 포그라운드로 돌아올 때 즉시 새로고침 후 폴링 재시작
        if (!intervalId) {
          loadMessages(true).then(() => {
            retryCount = 0; // 재시도 카운터 리셋
            startPolling();
            console.log("[ChatTab] 페이지 표시, 폴링 재시작");
          });
        }
      }
    };

    // 온라인/오프라인 상태 변경 감지
    const handleOnline = () => {
      if (!intervalId && !document.hidden) {
        loadMessages(true).then(() => {
          retryCount = 0;
          startPolling();
          console.log("[ChatTab] 온라인 상태 복구, 폴링 재시작");
        });
      }
    };

    const handleOffline = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log("[ChatTab] 오프라인 상태, 폴링 중지");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 정리 함수
    return () => {
      isPollingActive = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
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

      // 메시지 전송 성공 후 즉시 새로고침 (폴링 대기하지 않음)
      // 리스팅이 생성된 경우에도 즉시 새로고침하여 사용자 경험 개선
      if (data.listing_id) {
        toast({
          title: "리스팅 정보 추가됨",
          description: "부동산 정보가 카드로 표시되었습니다.",
        });
      }

      // 즉시 새로고침 (isInitial을 true로 설정하여 로딩 상태 표시)
      await loadMessages(true);

      // 스크롤을 맨 아래로 (새 메시지 표시)
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
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

  // 제외된 리스팅 ID를 관리하는 Set
  const [excludedListingIds, setExcludedListingIds] = useState<Set<string>>(
    new Set(),
  );

  // 제외된 리스팅 표시 여부 (필터링 옵션)
  const [showExcluded, setShowExcluded] = useState(true);

  // 로컬 스토리지 키 (클라이언트별로 구분)
  const storageKey = clientId
    ? `excluded_listings_${clientId}`
    : `excluded_listings_${userType}`;

  // 로컬 스토리지에서 제외 상태 로드
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const excludedIds = JSON.parse(stored) as string[];
        setExcludedListingIds(new Set(excludedIds));
        console.log("[ChatTab] 로컬 스토리지에서 제외 상태 로드:", {
          count: excludedIds.length,
        });
      }
    } catch (error) {
      console.error("[ChatTab] 로컬 스토리지 로드 실패:", error);
    }
  }, [storageKey]);

  // 로컬 스토리지에 제외 상태 저장
  const saveToLocalStorage = (excludedIds: Set<string>) => {
    try {
      const array = Array.from(excludedIds);
      localStorage.setItem(storageKey, JSON.stringify(array));
      console.log("[ChatTab] 로컬 스토리지에 제외 상태 저장:", {
        count: array.length,
      });
    } catch (error) {
      console.error("[ChatTab] 로컬 스토리지 저장 실패:", error);
    }
  };

  // 서버에서 제외 상태 로드 (리스팅 데이터와 함께)
  useEffect(() => {
    // 리스팅 데이터가 로드되면 서버의 is_excluded 상태를 확인
    if (listings.length > 0) {
      const serverExcludedIds = new Set<string>();
      listings.forEach((listing) => {
        if (listing.is_excluded) {
          serverExcludedIds.add(listing.id);
        }
      });

      // 서버 상태와 로컬 스토리지 상태 병합
      setExcludedListingIds((prev) => {
        const merged = new Set([...prev, ...serverExcludedIds]);
        saveToLocalStorage(merged);
        return merged;
      });
    }
  }, [listings]);

  // 제외 상태 토글 함수 (로컬 + 서버 동기화)
  const toggleExclude = async (listingId: string) => {
    const newExcluded = !excludedListingIds.has(listingId);

    // 즉시 UI 업데이트 (낙관적 업데이트)
    setExcludedListingIds((prev) => {
      const newSet = new Set(prev);
      if (newExcluded) {
        newSet.add(listingId);
      } else {
        newSet.delete(listingId);
      }
      saveToLocalStorage(newSet);
      return newSet;
    });

    // 서버에 동기화
    try {
      console.log("[ChatTab] 서버에 제외 상태 동기화 시작:", {
        listingId,
        isExcluded: newExcluded,
      });

      const result = await updateListingExcluded(listingId, newExcluded);

      if (result.success) {
        console.log("[ChatTab] 서버 동기화 성공:", {
          listingId,
          isExcluded: newExcluded,
        });
      } else {
        console.error("[ChatTab] 서버 동기화 실패:", result.error);
        toast({
          title: "동기화 실패",
          description:
            result.error || "제외 상태를 서버에 저장하지 못했습니다.",
          variant: "destructive",
        });

        // 실패 시 이전 상태로 복원
        setExcludedListingIds((prev) => {
          const newSet = new Set(prev);
          if (newExcluded) {
            newSet.delete(listingId);
          } else {
            newSet.add(listingId);
          }
          saveToLocalStorage(newSet);
          return newSet;
        });
      }
    } catch (error) {
      console.error("[ChatTab] 서버 동기화 중 예상치 못한 에러:", error);
      toast({
        title: "동기화 실패",
        description: "제외 상태를 저장하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });

      // 실패 시 이전 상태로 복원
      setExcludedListingIds((prev) => {
        const newSet = new Set(prev);
        if (newExcluded) {
          newSet.delete(listingId);
        } else {
          newSet.add(listingId);
        }
        saveToLocalStorage(newSet);
        return newSet;
      });
    }
  };

  // 필터링된 리스팅 목록
  const filteredListings = showExcluded
    ? sortedListings
    : sortedListings.filter((listing) => !excludedListingIds.has(listing.id));

  // 필터링된 리스팅으로 그리드 행 생성
  const getFilteredGridRows = () => {
    const rows: Listing[][] = [];
    const itemsPerRow = 4;

    for (let i = 0; i < filteredListings.length; i += itemsPerRow) {
      rows.push(filteredListings.slice(i, i + itemsPerRow));
    }

    return rows;
  };

  const gridRows = getFilteredGridRows();

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

      {/* 리스팅 카드 섹션 */}
      {sortedListings.length > 0 && (
        <div className="p-4 border-t border-border bg-muted/30 max-w-full">
          {/* 필터링 옵션 */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="show-excluded"
                checked={showExcluded}
                onCheckedChange={setShowExcluded}
              />
              <Label htmlFor="show-excluded" className="text-sm cursor-pointer">
                제외된 리스팅 표시
              </Label>
            </div>
            <div className="text-xs text-muted-foreground">
              {excludedListingIds.size > 0 && (
                <span>
                  제외됨: {excludedListingIds.size}개 / 전체:{" "}
                  {sortedListings.length}개
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 sm:gap-2 md:gap-4">
            {gridRows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className="grid grid-cols-4 gap-1 sm:gap-2 md:gap-4"
              >
                {row.map((listing) => {
                  const isExcluded = excludedListingIds.has(listing.id);

                  return (
                    <div
                      key={listing.id}
                      className="col-span-1 min-w-0 flex flex-col gap-2"
                    >
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
                        isExcluded={isExcluded}
                      />
                      {/* 제외 표시 토글 버튼 */}
                      <Button
                        variant={isExcluded ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => toggleExclude(listing.id)}
                        className="w-full text-xs sm:text-sm"
                      >
                        {isExcluded ? (
                          <>
                            <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            제외 해제
                          </>
                        ) : (
                          <>
                            <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            제외 표시
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * @file chat.ts
 * @description 채팅 관련 설정
 *
 * 이 파일은 채팅 기능의 설정을 환경 변수로 관리합니다.
 * 비개발자도 Vercel 대시보드에서 환경 변수를 수정하여 쉽게 조정할 수 있습니다.
 *
 * 환경 변수:
 * - NEXT_PUBLIC_CHAT_POLLING_INTERVAL: 폴링 간격 (밀리초, 기본값: 5000)
 * - NEXT_PUBLIC_CHAT_MAX_RETRY_COUNT: 최대 재시도 횟수 (기본값: 5)
 * - NEXT_PUBLIC_CHAT_BACKOFF_MULTIPLIER: 백오프 배수 (기본값: 2)
 *
 * @see {@link components/client/chat-tab.tsx} - 채팅 컴포넌트에서 사용
 */

/**
 * 채팅 관련 설정
 */
export const CHAT_CONFIG = {
  /**
   * 폴링 간격 (밀리초)
   * 기본값: 5초 (5000ms)
   * 최소값: 1초 (1000ms) 권장
   * 최대값: 60초 (60000ms) 권장
   *
   * Vercel 환경 변수에서 설정:
   * NEXT_PUBLIC_CHAT_POLLING_INTERVAL=5000
   */
  POLLING_INTERVAL: Number(
    process.env.NEXT_PUBLIC_CHAT_POLLING_INTERVAL || "5000",
  ),

  /**
   * 최대 재시도 횟수
   * 폴링 실패 시 최대 몇 번까지 재시도할지 결정
   * 기본값: 5회
   *
   * Vercel 환경 변수에서 설정:
   * NEXT_PUBLIC_CHAT_MAX_RETRY_COUNT=5
   */
  MAX_RETRY_COUNT: Number(process.env.NEXT_PUBLIC_CHAT_MAX_RETRY_COUNT || "5"),

  /**
   * 백오프 배수
   * 연속 실패 시 폴링 간격을 증가시키는 배수
   * 기본값: 2 (2배씩 증가)
   *
   * 예: 기본 간격 5초, 실패 시 10초, 20초, 40초...로 증가
   *
   * Vercel 환경 변수에서 설정:
   * NEXT_PUBLIC_CHAT_BACKOFF_MULTIPLIER=2
   */
  BACKOFF_MULTIPLIER: Number(
    process.env.NEXT_PUBLIC_CHAT_BACKOFF_MULTIPLIER || "2",
  ),
} as const;

// 유효성 검사 및 경고
if (typeof window !== "undefined") {
  // 클라이언트 사이드에서만 실행
  if (CHAT_CONFIG.POLLING_INTERVAL < 1000) {
    console.warn(
      "[ChatConfig] ⚠️ 폴링 간격이 너무 짧습니다. 최소 1초(1000ms) 이상 권장합니다.",
      {
        current: CHAT_CONFIG.POLLING_INTERVAL,
        recommended: 1000,
      },
    );
  }

  if (CHAT_CONFIG.POLLING_INTERVAL > 60000) {
    console.warn(
      "[ChatConfig] ⚠️ 폴링 간격이 너무 깁니다. 최대 60초(60000ms) 권장합니다.",
      {
        current: CHAT_CONFIG.POLLING_INTERVAL,
        recommended: 60000,
      },
    );
  }

  if (CHAT_CONFIG.MAX_RETRY_COUNT < 1) {
    console.warn(
      "[ChatConfig] ⚠️ 최대 재시도 횟수는 최소 1 이상이어야 합니다.",
      {
        current: CHAT_CONFIG.MAX_RETRY_COUNT,
        recommended: 5,
      },
    );
  }

  if (CHAT_CONFIG.BACKOFF_MULTIPLIER < 1) {
    console.warn("[ChatConfig] ⚠️ 백오프 배수는 최소 1 이상이어야 합니다.", {
      current: CHAT_CONFIG.BACKOFF_MULTIPLIER,
      recommended: 2,
    });
  }

  // 설정 값 로깅 (개발 환경에서만)
  if (process.env.NODE_ENV === "development") {
    console.log("[ChatConfig] 채팅 설정 로드됨:", {
      POLLING_INTERVAL: `${CHAT_CONFIG.POLLING_INTERVAL}ms`,
      MAX_RETRY_COUNT: CHAT_CONFIG.MAX_RETRY_COUNT,
      BACKOFF_MULTIPLIER: CHAT_CONFIG.BACKOFF_MULTIPLIER,
    });
  }
}

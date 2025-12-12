"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

export default function ClientSignUpCompletePage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const hasRun = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clerk 인증 상태가 로드될 때까지 대기
    if (!isLoaded) {
      console.log("Clerk not loaded yet...");
      return;
    }

    // userId가 없으면 최대 3초 대기
    if (!userId) {
      console.log("userId not available, waiting...");

      // 이미 대기 중이면 중복 실행 방지
      if (timeoutRef.current) return;

      timeoutRef.current = setTimeout(() => {
        if (!userId) {
          console.error("userId not available after 3 seconds");
          setStatus("error");
        }
      }, 3000);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }

    // userId가 있으면 역할 설정 시도
    if (hasRun.current) return;
    hasRun.current = true;

    const setRole = async () => {
      try {
        console.log("Setting role with userId:", userId);
        const response = await fetch("/api/set-role", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: "client" }),
        });

        const data = await response.json();
        console.log("API Response:", { ok: response.ok, data });

        // 성공 응답 처리
        if (response.ok || data.success === true) {
          console.log("Role set successfully");
        } else if (data.error && data.error !== "Role already set to different role") {
          // 에러 응답 처리
          console.error("API Error:", data);
          throw new Error(data.error || "Failed to set role");
        }

        // 역할 설정 후 클라이언트 레코드 자동 생성
        // URL에서 초대 토큰 가져오기
        const urlParams = new URLSearchParams(window.location.search);
        const invitationToken = urlParams.get("token");

        console.log("Creating client record...", {
          invitationToken: invitationToken || null,
        });
        const createClientResponse = await fetch("/api/clients/auto-create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            invitationToken: invitationToken || null,
          }),
        });

        if (!createClientResponse.ok) {
          const createClientData = await createClientResponse.json();
          console.error("Failed to create client record:", createClientData);
          // 레코드 생성 실패해도 계속 진행 (이미 존재할 수 있음)
        } else {
          console.log("Client record created successfully");
        }

        setStatus("success");
        // Clerk 세션이 업데이트될 시간을 주고 강제 리다이렉트
        setTimeout(() => {
          // window.location.href를 사용하여 강제 리다이렉트 (무한 루프 방지)
          window.location.href = "/client/home";
        }, 2000);
      } catch (error) {
        console.error("Error setting role:", error);
        setStatus("error");
      }
    };

    setRole();
  }, [userId, isLoaded, router]);

  // cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
      <div className="w-full max-w-md space-y-4 text-center">
        {status === "loading" && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold">회원가입 처리 중...</h1>
            <p className="text-gray-600 dark:text-gray-400">
              클라이언트 역할을 설정하고 있습니다.
            </p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h1 className="text-2xl font-bold">회원가입 완료!</h1>
            <p className="text-gray-600 dark:text-gray-400">
              클라이언트 홈으로 이동합니다...
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-red-500 text-5xl mb-4">✗</div>
            <h1 className="text-2xl font-bold">오류 발생</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              역할 설정에 실패했습니다. 다시 시도해주세요.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              다시 시도
            </button>
          </>
        )}
      </div>
    </div>
  );
}

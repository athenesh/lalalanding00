"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

export default function AgentSignUpCompletePage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const { userId } = useAuth();
  const router = useRouter();
  const hasRun = useRef(false);

  useEffect(() => {
    // 중복 실행 방지
    if (hasRun.current) return;
    hasRun.current = true;

    const setRole = async () => {
      if (!userId) {
        setStatus("error");
        return;
      }

      try {
        const response = await fetch("/api/set-role", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: "agent" }),
        });

        const data = await response.json();

        // 역할이 이미 설정되어 있어도 성공으로 처리
        if (
          !response.ok &&
          data.error !== "Role already set to different role"
        ) {
          throw new Error(data.error || "Failed to set role");
        }

        setStatus("success");
        // 역할 설정 후 에이전트 대시보드로 리다이렉트
        setTimeout(() => {
          router.push("/agent/dashboard");
        }, 1000);
      } catch (error) {
        console.error("Error setting role:", error);
        setStatus("error");
      }
    };

    setRole();
  }, [userId, router]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
      <div className="w-full max-w-md space-y-4 text-center">
        {status === "loading" && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold">회원가입 처리 중...</h1>
            <p className="text-gray-600 dark:text-gray-400">
              에이전트 역할을 설정하고 있습니다.
            </p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h1 className="text-2xl font-bold">회원가입 완료!</h1>
            <p className="text-gray-600 dark:text-gray-400">
              에이전트 대시보드로 이동합니다...
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

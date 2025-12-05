"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

/**
 * 기존 역할 선택 페이지는 더 이상 사용되지 않습니다.
 * 역할별 회원가입 페이지로 리다이렉트합니다.
 */
export default function SelectRolePage() {
  const router = useRouter();
  const { userId } = useAuth();

  useEffect(() => {
    // 로그인한 사용자는 랜딩 페이지로 리다이렉트
    // (랜딩 페이지에서 역할에 따라 적절한 페이지로 리다이렉트됨)
    if (userId) {
      router.push("/");
    } else {
      // 로그인하지 않은 사용자도 랜딩 페이지로 리다이렉트
      router.push("/");
    }
  }, [userId, router]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">리다이렉트 중...</p>
      </div>
    </div>
  );
}


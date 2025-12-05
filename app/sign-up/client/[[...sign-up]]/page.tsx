"use client";

import { SignUp } from "@clerk/nextjs";
import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ClientSignUpPage() {
  const { userId, isLoaded: authLoaded } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    // 인증 상태가 로드될 때까지 대기
    if (!authLoaded || !userLoaded) return;

    // 이미 로그인된 경우
    if (userId && user) {
      const role = (user.publicMetadata as { role?: string })?.role;

      // 역할이 이미 설정되어 있으면 대시보드로 리다이렉트
      if (role === "agent") {
        router.push("/agent/dashboard");
        return;
      }
      if (role === "client") {
        router.push("/client/home");
        return;
      }

      // 역할이 없으면 회원가입 완료 페이지로 리다이렉트
      if (!role) {
        router.push("/sign-up/client/complete");
        return;
      }
    }
  }, [userId, user, authLoaded, userLoaded, router]);

  // 로그인되지 않은 경우에만 SignUp 컴포넌트 렌더링
  if (authLoaded && userLoaded && !userId) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <div className="w-full max-w-md space-y-4">
          {/* "이미 계정이 있으신가요?" 링크 추가 */}
          <div className="text-center mb-2">
            <p className="text-sm text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Link
                href="/sign-in"
                className="text-primary hover:underline font-medium"
              >
                로그인하기
              </Link>
            </p>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">클라이언트 회원가입</h1>
            <p className="text-gray-600 dark:text-gray-400">
              미국 이주를 준비하는 의사/직원/학생으로 가입하세요
            </p>
          </div>
          <SignUp
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "shadow-lg",
              },
            }}
            fallbackRedirectUrl="/sign-up/client/complete"
            signInFallbackRedirectUrl="/sign-in"
            routing="path"
            path="/sign-up/client"
          />
        </div>
      </div>
    );
  }

  // 로그인된 경우 로딩 표시 (리다이렉트 중)
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
      <p className="text-muted-foreground">리다이렉트 중...</p>
    </div>
  );
}


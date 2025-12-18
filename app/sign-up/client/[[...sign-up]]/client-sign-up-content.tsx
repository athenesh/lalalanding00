"use client";

import { SignUp } from "@clerk/nextjs";
import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function ClientSignUpContent() {
  const { userId, isLoaded: authLoaded } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const [invitationValid, setInvitationValid] = useState<boolean | null>(null);
  const [invitationAgent, setInvitationAgent] = useState<{
    name: string | null;
    email: string | null;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  // 초대 토큰 또는 코드 검증
  useEffect(() => {
    const token = searchParams.get("token");
    const code = searchParams.get("code");

    if (token) {
      setInvitationToken(token);
      setIsVerifying(true);

      // 토큰 검증
      fetch(`/api/invitations/verify?token=${token}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.valid) {
            setInvitationValid(true);
            setInvitationAgent({
              name: data.invitation.agentName,
              email: data.invitation.agentEmail,
            });
          } else {
            setInvitationValid(false);
            toast({
              title: "초대 링크 오류",
              description: data.error || "유효하지 않은 초대 링크입니다.",
              variant: "destructive",
            });
          }
        })
        .catch((error) => {
          console.error("[ClientSignUp] Error verifying invitation:", error);
          setInvitationValid(false);
          toast({
            title: "초대 링크 검증 실패",
            description: "초대 링크를 확인하는 중 오류가 발생했습니다.",
            variant: "destructive",
          });
        })
        .finally(() => {
          setIsVerifying(false);
        });
    } else if (code) {
      setInvitationCode(code.toUpperCase());
      setIsVerifying(true);

      // 코드 검증
      fetch(`/api/invitations/verify-code?code=${code.toUpperCase()}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.valid) {
            setInvitationValid(true);
            setInvitationToken(data.invitation.token); // 토큰도 저장하여 회원가입 시 사용
            setInvitationAgent({
              name: data.invitation.agentName,
              email: data.invitation.agentEmail,
            });
          } else {
            setInvitationValid(false);
            toast({
              title: "초대 코드 오류",
              description: data.error || "유효하지 않은 초대 코드입니다.",
              variant: "destructive",
            });
          }
        })
        .catch((error) => {
          console.error("[ClientSignUp] Error verifying invitation code:", error);
          setInvitationValid(false);
          toast({
            title: "초대 코드 검증 실패",
            description: "초대 코드를 확인하는 중 오류가 발생했습니다.",
            variant: "destructive",
          });
        })
        .finally(() => {
          setIsVerifying(false);
        });
    } else {
      setIsVerifying(false);
      // 토큰이나 코드가 없으면 초대가 필요하다는 메시지 표시
      setInvitationValid(false);
    }
  }, [searchParams, toast]);

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

      // 역할이 없으면 회원가입 완료 페이지로 리다이렉트 (토큰 또는 코드 포함)
      if (!role) {
        const token = searchParams.get("token");
        const code = searchParams.get("code");
        let redirectUrl = "/sign-up/client/complete";
        if (token) {
          redirectUrl = `/sign-up/client/complete?token=${token}`;
        } else if (code) {
          redirectUrl = `/sign-up/client/complete?code=${code}`;
        }
        router.push(redirectUrl);
        return;
      }
    }
  }, [userId, user, authLoaded, userLoaded, router, searchParams]);

  // 로그인되지 않은 경우에만 SignUp 컴포넌트 렌더링
  if (authLoaded && userLoaded && !userId) {
    // 초대 토큰 검증 중
    if (isVerifying) {
      return (
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
          <div className="w-full max-w-md space-y-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">초대 링크를 확인하는 중...</p>
          </div>
        </div>
      );
    }

    // 초대 토큰 또는 코드가 없거나 유효하지 않은 경우
    if ((!invitationToken && !invitationCode) || !invitationValid) {
      return (
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
          <div className="w-full max-w-md space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {invitationToken || invitationCode
                  ? "유효하지 않은 초대 링크/코드입니다. 에이전트에게 새로운 초대를 요청해주세요."
                  : "이 서비스는 에이전트의 초대를 통해서만 가입할 수 있습니다. 에이전트에게 초대 링크 또는 코드를 요청해주세요."}
              </AlertDescription>
            </Alert>
            <div className="text-center">
              <Link
                href="/sign-in"
                className="text-primary hover:underline font-medium"
              >
                이미 계정이 있으신가요? 로그인하기
              </Link>
            </div>
          </div>
        </div>
      );
    }

    // 유효한 초대 토큰이 있는 경우
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <div className="w-full max-w-md space-y-4">
          {/* 초대 정보 표시 */}
          {invitationAgent && (
            <Alert>
              <AlertDescription>
                <strong>{invitationAgent.name || "에이전트"}</strong>
                {invitationAgent.email && ` (${invitationAgent.email})`}님의
                초대를 받았습니다.
              </AlertDescription>
            </Alert>
          )}

          {/* "이미 계정이 있으신가요?" 링크 추가 */}
          <div className="text-center mb-2">
            <p className="text-sm text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Link
                href={`/sign-in?redirect=/sign-up/client/complete?${invitationToken ? `token=${invitationToken}` : `code=${invitationCode}`}`}
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
            fallbackRedirectUrl={`/sign-up/client/complete?${invitationToken ? `token=${invitationToken}` : `code=${invitationCode}`}`}
            signInFallbackRedirectUrl={`/sign-in?redirect=/sign-up/client/complete?${invitationToken ? `token=${invitationToken}` : `code=${invitationCode}`}`}
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


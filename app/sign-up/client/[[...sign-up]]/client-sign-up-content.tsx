"use client";

import { SignUp } from "@clerk/nextjs";
import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const [manualCode, setManualCode] = useState("");
  const [isVerifyingManualCode, setIsVerifyingManualCode] = useState(false);
  const [manualCodeValid, setManualCodeValid] = useState<boolean | null>(null);
  const [manualCodeAgent, setManualCodeAgent] = useState<{
    name: string | null;
    email: string | null;
  } | null>(null);

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
      // 토큰이나 코드가 없어도 회원가입 진행 가능 (선택사항)
      setInvitationValid(null); // null로 설정하여 선택사항임을 표시
    }
  }, [searchParams, toast]);

  // 수동 코드 검증 핸들러
  const handleVerifyManualCode = async (code: string) => {
    if (code.length !== 6) {
      setManualCodeValid(null);
      setManualCodeAgent(null);
      return;
    }

    try {
      setIsVerifyingManualCode(true);
      console.log("[ClientSignUp] 수동 코드 검증 시작:", code);

      const response = await fetch(
        `/api/invitations/verify-code?code=${code.toUpperCase()}`,
      );

      const data = await response.json();

      if (data.valid) {
        setManualCodeValid(true);
        setManualCodeAgent({
          name: data.invitation.agentName,
          email: data.invitation.agentEmail,
        });
        // 토큰과 코드 저장하여 회원가입 시 사용
        if (data.invitation.token) {
          setInvitationToken(data.invitation.token);
        }
        setInvitationCode(code.toUpperCase());
        setInvitationValid(true);
        console.log("[ClientSignUp] 수동 코드 검증 성공:", data.invitation);
      } else {
        setManualCodeValid(false);
        setManualCodeAgent(null);
        toast({
          title: "코드 검증 실패",
          description: data.error || "유효하지 않은 초대 코드입니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[ClientSignUp] 수동 코드 검증 오류:", error);
      setManualCodeValid(false);
      setManualCodeAgent(null);
      toast({
        title: "코드 검증 실패",
        description: "코드를 확인하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingManualCode(false);
    }
  };

  // 수동 코드 입력 핸들러
  const handleManualCodeChange = (value: string) => {
    // 대문자로 변환하고 6자리만 허용
    const upperValue = value.toUpperCase().slice(0, 6);
    setManualCode(upperValue);
    setManualCodeValid(null);
    setManualCodeAgent(null);

    // 6자리가 되면 자동 검증
    if (upperValue.length === 6) {
      handleVerifyManualCode(upperValue);
    }
  };

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

    // 초대 토큰 또는 코드가 유효하지 않은 경우 (명시적으로 false인 경우만)
    if (invitationValid === false) {
      return (
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
          <div className="w-full max-w-md space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {invitationToken || invitationCode
                  ? "유효하지 않은 초대 링크/코드입니다. 에이전트에게 새로운 초대를 요청해주세요."
                  : "유효하지 않은 초대 코드입니다."}
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

    // 회원가입 폼 표시 (초대 코드가 있거나 없거나 모두 가능)
    const finalToken = invitationToken;
    const finalCode = invitationCode || (manualCodeValid ? manualCode : null);
    const displayAgent = invitationAgent || manualCodeAgent;

    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <div className="w-full max-w-md space-y-4">
          {/* 초대 정보 표시 */}
          {displayAgent && (
            <Alert>
              <AlertDescription>
                <strong>{displayAgent.name || "에이전트"}</strong>
                {displayAgent.email && ` (${displayAgent.email})`}님의
                초대를 받았습니다.
              </AlertDescription>
            </Alert>
          )}

          {/* 에이전트 코드 입력 필드 (초대 코드가 없는 경우) */}
          {!invitationToken && !invitationCode && (
            <Alert className="border-primary/50 bg-primary/5">
              <UserPlus className="h-4 w-4 text-primary" />
              <AlertDescription className="space-y-3">
                <p className="font-medium">
                  에이전트 코드가 있으신가요? (선택사항)
                </p>
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="에이전트 코드 입력 (6자리)"
                    value={manualCode}
                    onChange={(e) => handleManualCodeChange(e.target.value)}
                    maxLength={6}
                    className="uppercase font-mono"
                    disabled={isVerifyingManualCode}
                  />
                  {isVerifyingManualCode && (
                    <p className="text-sm text-muted-foreground">
                      코드를 확인하는 중...
                    </p>
                  )}
                  {manualCodeValid === true && manualCodeAgent && (
                    <div className="rounded-md bg-primary/10 p-2 text-sm">
                      <p className="font-medium text-primary">
                        {manualCodeAgent.name || "에이전트"}
                        {manualCodeAgent.email && ` (${manualCodeAgent.email})`}님의
                        코드가 확인되었습니다.
                      </p>
                    </div>
                  )}
                  {manualCodeValid === false && (
                    <p className="text-sm text-destructive">
                      유효하지 않은 코드입니다. 다시 확인해주세요.
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  에이전트 코드가 없어도 회원가입은 가능합니다. 나중에 클라이언트
                  홈에서 에이전트를 배정할 수 있습니다.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* "이미 계정이 있으신가요?" 링크 추가 */}
          <div className="text-center mb-2">
            <p className="text-sm text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Link
                href={`/sign-in?redirect=/sign-up/client/complete?${finalToken ? `token=${finalToken}` : finalCode ? `code=${finalCode}` : ""}`}
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
            fallbackRedirectUrl={`/sign-up/client/complete?${finalToken ? `token=${finalToken}` : finalCode ? `code=${finalCode}` : ""}`}
            signInFallbackRedirectUrl={`/sign-in?redirect=/sign-up/client/complete?${finalToken ? `token=${finalToken}` : finalCode ? `code=${finalCode}` : ""}`}
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


"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function AgentSignUpCompletePage() {
  const [step, setStep] = useState<"role" | "info" | "pending" | "error">(
    "role",
  );
  const [dreNumber, setDreNumber] = useState("");
  const [brokerageName, setBrokerageName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountStatus, setAccountStatus] = useState<{
    isApproved: boolean;
    dreNumber: string | null;
    brokerageName: string | null;
  } | null>(null);
  const { userId, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const hasRun = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 계정 상태 확인
  useEffect(() => {
    if (!isLoaded || !userId) return;

    const checkAccountStatus = async () => {
      try {
        const response = await fetch("/api/agent/status");
        if (response.ok) {
          const data = await response.json();
          setAccountStatus(data);
          
          // 이미 승인된 경우 대시보드로 이동
          if (data.isApproved) {
            router.push("/agent/dashboard");
            return;
          }
          
          // DRE 번호와 Brokerage 이름이 이미 입력된 경우 승인 대기 상태로
          if (data.dreNumber && data.brokerageName) {
            setStep("pending");
            return;
          }
          
          // 역할이 이미 설정되어 있으면 정보 입력 단계로
          const userRole = (user?.publicMetadata as { role?: string })?.role;
          if (userRole === "agent") {
            setStep("info");
            return;
          }
        }
      } catch (error) {
        console.error("Error checking account status:", error);
      }
    };

    checkAccountStatus();
  }, [userId, isLoaded, router, user]);

  // 역할 설정
  useEffect(() => {
    if (!isLoaded || !userId || step !== "role") return;
    if (hasRun.current) return;

    // 먼저 역할이 이미 설정되어 있는지 확인
    const userRole = (user?.publicMetadata as { role?: string })?.role;
    if (userRole === "agent") {
      // 역할이 이미 설정되어 있으면 정보 입력 단계로
      console.log("[AgentSignUp] Role already set, moving to info step");
      setStep("info");
      return;
    }

    hasRun.current = true;

    const setRole = async () => {
      try {
        console.log("[AgentSignUp] Setting role with userId:", userId);
        const response = await fetch("/api/set-role", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: "agent" }),
        });

        const data = await response.json();
        console.log("[AgentSignUp] API Response:", { ok: response.ok, data });

        if (response.ok || data.success === true) {
          console.log("[AgentSignUp] Role set successfully");
          // DRE 번호와 Brokerage 이름 입력 단계로 이동
          setStep("info");
          return;
        }

        if (data.error && data.error !== "Role already set to different role") {
          console.error("[AgentSignUp] API Error:", data);
          setStep("error");
          return;
        }

        // 역할이 이미 설정된 경우도 정보 입력 단계로
        console.log("[AgentSignUp] Role already set, moving to info step");
        setStep("info");
      } catch (error) {
        console.error("[AgentSignUp] Error setting role:", error);
        setStep("error");
      }
    };

    setRole();
  }, [userId, isLoaded, step, user]);

  // DRE 번호와 Brokerage 이름 제출
  const handleSubmitInfo = async () => {
    if (!dreNumber.trim() || !brokerageName.trim()) {
      toast({
        title: "입력 오류",
        description: "DRE 번호와 Brokerage 이름을 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // DRE 번호 형식 검증 (6-8자리 숫자)
    const dreRegex = /^\d{6,8}$/;
    if (!dreRegex.test(dreNumber.trim())) {
      toast({
        title: "입력 오류",
        description: "DRE 번호는 6-8자리 숫자여야 합니다.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("[AgentSignUp] Submitting agent info:", {
        dreNumber: dreNumber.trim(),
        brokerageName: brokerageName.trim(),
      });

      const response = await fetch("/api/agent/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dreNumber: dreNumber.trim(),
          brokerageName: brokerageName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit information");
      }

      console.log("[AgentSignUp] Agent info submitted successfully");
      toast({
        title: "정보 제출 완료",
        description: "ADMIN 승인을 기다리고 있습니다.",
      });
      setStep("pending");
    } catch (error) {
      console.error("[AgentSignUp] Error submitting info:", error);
      toast({
        title: "제출 실패",
        description:
          error instanceof Error
            ? error.message
            : "정보 제출에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <div className="w-full max-w-md space-y-6">
        {step === "role" && (
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold">회원가입 처리 중...</h1>
            <p className="text-gray-600 dark:text-gray-400">
              에이전트 역할을 설정하고 있습니다.
            </p>
          </div>
        )}

        {step === "info" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">에이전트 정보 입력</h1>
              <p className="text-gray-600 dark:text-gray-400">
                California Real Estate License 정보를 입력해주세요.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dreNumber">
                  DRE 번호 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dreNumber"
                  type="text"
                  placeholder="예: 12345678"
                  value={dreNumber}
                  onChange={(e) => setDreNumber(e.target.value)}
                  maxLength={8}
                  pattern="[0-9]*"
                />
                <p className="text-sm text-muted-foreground">
                  California Department of Real Estate License Number (6-8자리
                  숫자)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brokerageName">
                  Brokerage 이름 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="brokerageName"
                  type="text"
                  placeholder="예: ABC Realty"
                  value={brokerageName}
                  onChange={(e) => setBrokerageName(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  소속된 Brokerage의 이름을 입력해주세요.
                </p>
              </div>

              <Button
                onClick={handleSubmitInfo}
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? "제출 중..." : "정보 제출"}
              </Button>
            </div>
          </div>
        )}

        {step === "pending" && (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <AlertCircle className="h-16 w-16 text-yellow-500" />
            </div>
            <h1 className="text-2xl font-bold">승인 대기 중</h1>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                입력하신 정보를 검토 중입니다. ADMIN 승인 후 서비스를 이용하실
                수 있습니다.
                <br />
                <br />
                승인되면 알림을 받으실 수 있습니다.
              </AlertDescription>
            </Alert>
            <div className="space-y-2 text-sm text-muted-foreground">
              {accountStatus?.dreNumber && (
                <p>DRE 번호: {accountStatus.dreNumber}</p>
              )}
              {accountStatus?.brokerageName && (
                <p>Brokerage: {accountStatus.brokerageName}</p>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="w-full"
            >
              홈으로 돌아가기
            </Button>
          </div>
        )}

        {step === "error" && (
          <div className="text-center space-y-4">
            <div className="text-red-500 text-5xl mb-4">✗</div>
            <h1 className="text-2xl font-bold">오류 발생</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              역할 설정에 실패했습니다. 다시 시도해주세요.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
            >
              다시 시도
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

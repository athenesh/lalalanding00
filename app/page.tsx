"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Briefcase,
  Users,
  LayoutDashboard,
  Home as HomeIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { SignedOut, SignedIn, useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const { isLoaded: authLoaded, userId } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const [role, setRole] = useState<string | undefined>(undefined);
  const hasRedirected = useRef(false);
  const isCheckingAuthorization = useRef(false);

  // useUser를 통해 최신 publicMetadata 가져오기
  useEffect(() => {
    if (userLoaded && user) {
      const userRole = (user.publicMetadata as { role?: string })?.role;
      console.log("[HomePage] User role from useUser:", userRole);
      console.log("[HomePage] Full publicMetadata:", user.publicMetadata);
      setRole(userRole);
    } else if (userLoaded && !user) {
      setRole(undefined);
    }
  }, [user, userLoaded]);

  // 역할이 확인되면 자동으로 대시보드로 리다이렉트 (한 번만 실행)
  useEffect(() => {
    if (!authLoaded || !userLoaded || hasRedirected.current) return;

    // role이 있는 경우
    if (role === "agent") {
      hasRedirected.current = true;
      console.log("[HomePage] Redirecting agent to dashboard (one-time)");
      window.location.href = "/agent/dashboard";
      return;
    }

    if (role === "client") {
      hasRedirected.current = true;
      console.log("[HomePage] Redirecting client to home (one-time)");
      window.location.href = "/client/home";
      return;
    }

    // role이 없지만 로그인한 경우 권한 부여 상태 확인
    if (!role && userId && !isCheckingAuthorization.current) {
      isCheckingAuthorization.current = true;
      
      // 권한 부여 상태 확인 함수 (useEffect 내부에서 정의)
      const checkAuthorizationStatus = async () => {
        try {
          console.log("[HomePage] 권한 부여 상태 확인 시작");
          const response = await fetch("/api/client/authorize/status");

          if (response.ok) {
            const data = await response.json();
            if (data.hasAuthorization) {
              hasRedirected.current = true;
              console.log("[HomePage] 권한 부여된 사용자 확인, /client/home으로 리다이렉트");
              window.location.href = "/client/home";
            } else {
              console.log("[HomePage] 권한 부여 상태 없음");
            }
          } else if (response.status === 404) {
            // 권한이 없음 (정상)
            console.log("[HomePage] 권한 부여 상태 없음 (404)");
          } else {
            console.error("[HomePage] 권한 상태 확인 실패:", response.status);
          }
        } catch (error) {
          console.error("[HomePage] 권한 상태 확인 중 오류:", error);
        } finally {
          isCheckingAuthorization.current = false;
        }
      };

      checkAuthorizationStatus();
    }
  }, [authLoaded, userLoaded, role, userId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            미국 이주 준비 플랫폼
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            체계적인 이주 준비와 효율적인 클라이언트 관리를 위한 올인원 솔루션
          </p>
        </div>

        <SignedOut>
          <div className="grid md:grid-cols-2 gap-6">
            <Card
              className="hover:shadow-xl transition-all duration-200 cursor-pointer group"
              onClick={() => router.push("/sign-up/agent")}
            >
              <CardHeader className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Briefcase className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">에이전트</CardTitle>
                <CardDescription className="text-base">
                  여러 클라이언트를 효율적으로 관리하고 이주 준비를 지원하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" size="lg">
                  에이전트로 시작하기
                </Button>
              </CardContent>
            </Card>

            <Card
              className="hover:shadow-xl transition-all duration-200 cursor-pointer group"
              onClick={() => router.push("/sign-up/client")}
            >
              <CardHeader className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                  <Users className="h-8 w-8 text-success" />
                </div>
                <CardTitle className="text-2xl">클라이언트</CardTitle>
                <CardDescription className="text-base">
                  체계적인 준비 과정을 통해 안전한 미국 이주를 시작하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full bg-success hover:bg-success/90"
                  size="lg"
                >
                  클라이언트로 시작하기
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 로그인 링크 추가 */}
          <div className="text-center space-y-2">
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

          <div className="text-center text-sm text-muted-foreground">
            <p>LA/OC 지역 한인 이주 지원 전문 플랫폼</p>
          </div>
        </SignedOut>

        <SignedIn>
          {authLoaded && userLoaded && (
            <div className="space-y-6">
              {role === "agent" && (
                <Card className="hover:shadow-xl transition-all duration-200">
                  <CardHeader className="space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <LayoutDashboard className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">
                      에이전트 대시보드
                    </CardTitle>
                    <CardDescription className="text-base">
                      클라이언트를 관리하고 이주 준비를 지원하세요
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => router.push("/agent/dashboard")}
                    >
                      대시보드로 이동
                    </Button>
                  </CardContent>
                </Card>
              )}

              {role === "client" && (
                <Card className="hover:shadow-xl transition-all duration-200">
                  <CardHeader className="space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center">
                      <HomeIcon className="h-8 w-8 text-success" />
                    </div>
                    <CardTitle className="text-2xl">내 이주 준비</CardTitle>
                    <CardDescription className="text-base">
                      이주 준비 현황을 확인하고 관리하세요
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full bg-success hover:bg-success/90"
                      size="lg"
                      onClick={() => router.push("/client/home")}
                    >
                      홈으로 이동
                    </Button>
                  </CardContent>
                </Card>
              )}

              {!role && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    역할이 설정되지 않았습니다. 회원가입을 완료해주세요.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    <Button
                      variant="outline"
                      onClick={() => router.push("/sign-up/agent/complete")}
                    >
                      에이전트 역할 설정
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push("/sign-up/client/complete")}
                    >
                      클라이언트 역할 설정
                    </Button>
                  </div>
                </div>
              )}

              <div className="text-center text-sm text-muted-foreground">
                <p>LA/OC 지역 한인 이주 지원 전문 플랫폼</p>
              </div>
            </div>
          )}
        </SignedIn>
      </div>
    </div>
  );
}

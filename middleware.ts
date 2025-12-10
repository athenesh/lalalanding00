import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// 공개 라우트 정의
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)", // /sign-up/agent, /sign-up/client, /sign-up/agent/complete, /sign-up/client/complete 포함
  "/select-role", // 기존 경로 호환성을 위해 유지 (실제로는 랜딩 페이지로 리다이렉트)
]);

export default clerkMiddleware(
  async (auth, req) => {
    try {
      const pathname = req.nextUrl.pathname;
      
      // 응답 객체 생성 (보안 헤더는 Clerk가 자동으로 처리)
      const response = NextResponse.next();

      // 정적 파일 요청은 조기에 반환 (favicon, robots.txt 등)
      // Next.js가 자동으로 처리하도록 함
      if (
        pathname === "/favicon.ico" ||
        pathname === "/robots.txt" ||
        pathname === "/sitemap.xml"
      ) {
        return NextResponse.next();
      }

      const { userId, sessionClaims } = await auth();
      const role = (sessionClaims?.publicMetadata as { role?: string })?.role;

      // 로그인한 사용자가 공개 라우트에 접근하는 경우
      if (userId && isPublicRoute(req)) {
        // 회원가입 완료 페이지는 역할 설정 중이므로 리다이렉트하지 않음
        if (
          pathname === "/sign-up/agent/complete" ||
          pathname === "/sign-up/client/complete"
        ) {
          return NextResponse.next();
        }

        // 루트 경로나 로그인/회원가입 페이지 접근 시 역할에 따라 리다이렉트
        // 단, 역할이 없으면 리다이렉트하지 않음 (회원가입 진행 중일 수 있음)
        if (
          pathname === "/" ||
          pathname.startsWith("/sign-in") ||
          pathname.startsWith("/sign-up")
        ) {
          if (role === "agent") {
            return NextResponse.redirect(new URL("/agent/dashboard", req.url));
          }
          if (role === "client") {
            return NextResponse.redirect(new URL("/client/home", req.url));
          }
          // 역할이 없으면 그대로 진행 (회원가입 진행 중일 수 있음)
        }
      }

      // 보호된 라우트 접근 제어
      if (!isPublicRoute(req)) {
        if (!userId) {
          // 로그인하지 않은 사용자는 로그인 페이지로 리다이렉트
          return NextResponse.redirect(new URL("/sign-in", req.url));
        }

        // 에이전트 전용 라우트 - role이 명확히 다른 역할인 경우만 차단
        // role이 없거나 undefined인 경우는 페이지에서 클라이언트 사이드로 체크하도록 허용
        if (pathname.startsWith("/agent")) {
          if (role && role !== "agent") {
            // 보안 로그 (민감한 정보 제외)
            console.warn(
              `[Middleware] Access denied: role mismatch for ${pathname}`,
            );
            return NextResponse.redirect(new URL("/", req.url));
          }
          // role이 없으면 일단 허용하고, 페이지에서 클라이언트 사이드로 체크
        }

        // 클라이언트 전용 라우트 - role이 명확히 다른 역할(agent)인 경우만 차단
        // role이 없거나 undefined인 경우는 권한 부여된 사용자일 수 있으므로 페이지에서 체크하도록 허용
        if (pathname.startsWith("/client")) {
          if (role === "agent") {
            // 에이전트는 클라이언트 라우트 접근 불가
            console.warn(
              `[Middleware] Access denied: agent cannot access client routes for ${pathname}`,
            );
            return NextResponse.redirect(new URL("/", req.url));
          }
          // role이 "client"이거나 없으면 일단 허용
          // - role이 "client": 클라이언트 본인
          // - role이 없음: 권한 부여된 사용자일 수 있음 (페이지에서 확인)
        }
      }
    } catch (error) {
      // 에러 로깅 (민감한 정보는 제외)
      console.error("[Middleware] Error:", {
        pathname: req.nextUrl.pathname,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      
      // 보안: 에러 발생 시 보호된 라우트는 로그인 페이지로 리다이렉트
      if (!isPublicRoute(req)) {
        return NextResponse.redirect(new URL("/sign-in", req.url));
      }
      
      // 공개 라우트는 그대로 진행
      return NextResponse.next();
    }
  },
  {
    contentSecurityPolicy: {},
  },
);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

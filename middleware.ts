import {
  clerkMiddleware,
  createRouteMatcher,
  clerkClient,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// 공개 라우트 정의
const isPublicRoute = createRouteMatcher([
  "/",
  "/maintenance", // Maintenance 페이지 추가
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/select-role",
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

      // Maintenance mode 체크 전에 사용자 인증 정보 가져오기 (관리자 예외 처리용)
      const { userId, sessionClaims } = await auth();
      const role = (sessionClaims?.publicMetadata as { role?: string })?.role;

      // 🔥 관리자 체크 (maintenance mode 예외 처리용)
      let isAdminUser = false;
      if (userId) {
        try {
          const adminEmail = process.env.ADMIN_EMAIL;
          if (!adminEmail) {
            console.warn(
              "[Middleware] ADMIN_EMAIL 환경 변수가 설정되지 않았습니다.",
            );
          } else {
            const client = await clerkClient();
            const user = await client.users.getUser(userId);
            const userEmail = user.emailAddresses[0]?.emailAddress;

            if (userEmail) {
              const isAdmin =
                userEmail.toLowerCase() === adminEmail.toLowerCase();
              if (isAdmin) {
                isAdminUser = true;
                console.log("[Middleware] 관리자 확인됨:", userEmail);
              } else {
                // 프로덕션에서만 상세 로그 (디버깅용)
                if (process.env.NODE_ENV === "production") {
                  console.log("[Middleware] 관리자 아님:", {
                    userEmail: userEmail.toLowerCase(),
                    adminEmail: adminEmail.toLowerCase(),
                    match: false,
                  });
                }
              }
            } else {
              console.warn(
                "[Middleware] 사용자 이메일 주소를 찾을 수 없습니다.",
              );
            }
          }
        } catch (error) {
          // 관리자 체크 실패 시 상세 로그
          console.error("[Middleware] 관리자 체크 중 오류:", {
            error: error instanceof Error ? error.message : "Unknown error",
            userId,
            pathname,
          });
        }
      }

      // Maintenance mode 체크 (가장 우선순위)
      // 프로덕션 환경에서만 maintenance mode 활성화
      // Vercel에서는 NODE_ENV가 자동으로 "production"으로 설정됨
      const isProduction = process.env.NODE_ENV === "production";
      // 대소문자 구분 없이 체크 (true, TRUE, True 모두 허용)
      const maintenanceModeValue =
        process.env.MAINTENANCE_MODE?.toLowerCase() || "";
      const maintenanceMode =
        isProduction &&
        (maintenanceModeValue === "true" || maintenanceModeValue === "1");

      // 디버깅: 환경 변수 로그 (프로덕션에서만)
      if (isProduction) {
        console.log("[Middleware] Environment check:", {
          NODE_ENV: process.env.NODE_ENV,
          MAINTENANCE_MODE: process.env.MAINTENANCE_MODE,
          maintenanceModeValue,
          maintenanceMode,
          isAdminUser,
        });
      }

      if (maintenanceMode) {
        // 🔥 /admin 경로는 항상 maintenance mode 예외 처리 (최우선)
        // 관리자 전용 경로이므로 maintenance mode에서도 접근 가능
        // 실제 권한 체크는 layout.tsx의 requireAdmin()에서 수행
        if (pathname.startsWith("/admin")) {
          console.log(
            `[Middleware] Maintenance mode active, but /admin path allowed: ${pathname} (will check in layout)`,
            {
              pathname,
              isAdminUser,
              userId,
            },
          );
          // /admin 경로는 maintenance mode를 우회하고 정상 진행
          // layout.tsx에서 requireAdmin()이 권한 체크를 수행
        } else if (isAdminUser) {
          // 관리자 확인된 경우 모든 경로 접근 가능
          console.log(
            "[Middleware] Maintenance mode active, but admin access allowed",
            {
              pathname,
              isAdminUser,
              userId,
            },
          );
          // 관리자는 maintenance mode를 우회하고 정상 진행
        } else {
          // Maintenance 페이지로의 접근만 허용
          if (pathname === "/maintenance") {
            return NextResponse.next();
          }
          // 프로덕션 점검 모드일 때 로그인/회원가입 경로 명시적 차단
          if (
            pathname.startsWith("/sign-in") ||
            pathname.startsWith("/sign-up")
          ) {
            console.log(
              `[Middleware] Maintenance mode: blocking ${pathname}, redirecting to /maintenance`,
            );
            return NextResponse.redirect(new URL("/maintenance", req.url));
          }
          // 나머지 모든 경로는 maintenance 페이지로 리다이렉트
          console.log(
            `[Middleware] Maintenance mode active, redirecting ${pathname} to /maintenance`,
            {
              pathname,
              isAdminUser,
              userId,
            },
          );
          return NextResponse.redirect(new URL("/maintenance", req.url));
        }
      }

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
        // 에이전트는 승인 상태를 확인해야 하므로 클라이언트 사이드에서 처리
        // 🔥 관리자는 role과 관계없이 리다이렉트하지 않음 (홈 페이지에서 처리)
        if (
          pathname === "/" ||
          pathname.startsWith("/sign-in") ||
          pathname.startsWith("/sign-up")
        ) {
          // 관리자가 아닌 경우에만 role 기반 리다이렉트
          if (!isAdminUser && role === "client") {
            return NextResponse.redirect(new URL("/client/home", req.url));
          }
          // 관리자이거나 역할이 없으면 그대로 진행 (홈 페이지에서 관리자 체크 수행)
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

        // 관리자 전용 라우트 - 관리자 권한은 페이지 레벨에서 체크 (requireAdmin)
        // 미들웨어에서는 기본 인증만 확인
        if (pathname.startsWith("/admin")) {
          // 관리자 라우트는 requireAdmin()에서 이메일 기반으로 체크하므로
          // 여기서는 인증된 사용자만 허용
          // 실제 관리자 권한은 layout.tsx의 requireAdmin()에서 확인
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
    contentSecurityPolicy: {
      directives: {
        "connect-src": [
          "https://*.supabase.co",
          "wss://*.supabase.co",
          // Vercel Live (개발 환경 전용)
          ...(process.env.NODE_ENV === "development"
            ? ["https://vercel.live"]
            : []),
        ],
        "frame-src": [
          // Vercel Live (개발 환경 전용)
          ...(process.env.NODE_ENV === "development"
            ? ["https://vercel.live"]
            : []),
        ],
        "script-src": [
          // Vercel Live (개발 환경 전용)
          ...(process.env.NODE_ENV === "development"
            ? ["https://vercel.live"]
            : []),
        ],
      },
    },
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

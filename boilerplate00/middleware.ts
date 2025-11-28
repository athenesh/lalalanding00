import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// 공개 라우트 정의
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)', // /sign-up/agent, /sign-up/client, /sign-up/agent/complete, /sign-up/client/complete 포함
  '/select-role', // 기존 경로 호환성을 위해 유지 (실제로는 랜딩 페이지로 리다이렉트)
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  const role = sessionClaims?.publicMetadata?.role as string | undefined;
  const pathname = req.nextUrl.pathname;

  // 로그인한 사용자가 공개 라우트에 접근하는 경우
  if (userId && isPublicRoute(req) && pathname !== '/') {
    // 역할에 따라 적절한 페이지로 리다이렉트
    if (role === 'agent') {
      return NextResponse.redirect(new URL('/agent/dashboard', req.url));
    }
    if (role === 'client') {
      return NextResponse.redirect(new URL('/client/home', req.url));
    }
  }

  // 보호된 라우트 접근 제어
  if (!isPublicRoute(req)) {
    if (!userId) {
      // 로그인하지 않은 사용자는 로그인 페이지로 리다이렉트
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }

    // 에이전트 전용 라우트
    if (pathname.startsWith('/agent') && role !== 'agent') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // 클라이언트 전용 라우트
    if (pathname.startsWith('/client') && role !== 'client') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
Clerk Content-Security-Policy 헤더를 구성합니다.
콘텐츠 보안 정책 XSS 공격 및 데이터 삽입으로부터 애플리케이션을 보호할 수 있습니다

Clerk가 애플리케이션에서 올바르게 작동하려면 다음 CSP 지침이 필요합니다.

script-src- 이 값에는 호스트 애플리케이션의 FAPI 호스트 이름(예: ) https://clerk.your-domain.com과 Cloudflare의 봇 보호 호스트( 예: )가 포함되어야 합니다 https://challenges.cloudflare.com.
connect-src- 이 값에는 호스트 애플리케이션의 FAPI 호스트 이름(예: )이 포함되어야 합니다 https://clerk.your-domain.com.
img-src- 이 값은 이어야 합니다 https://img.clerk.com.
worker-src- 이 'self'값을 사용하여 작업자를 자체 스크립트에서 로드할 수 있음을 나타냅니다. blob:스키마 값도 포함해야 합니다.
style-src- 이 값에는 'unsafe-inline'Clerk이 스타일링을 위해 런타임 CSS-in-JS를 사용하기 때문에 해당 값이 포함되어야 합니다.
frame-src- 이 값에는 Cloudflare의 봇 보호 호스트가 포함되어야 합니다 https://challenges.cloudflare.com.
CSP 헤더를 구성하는 방법에는 두 가지가 있습니다.

자동 CSP 구성 -이 기능은 Next.js SDK에서만 사용할 수 있습니다.Clerk는 미들웨어를 통해 CSP 헤더를 자동으로 삽입하는 기능을 내장하고 있습니다. 이를 통해 Clerk와 올바르게 작동하는 안전한 CSP를 설정하는 과정이 간소화됩니다.
수동 CSP 구성
자동 CSP 구성
경고

자동 CSP 구성은 에만 사용할 수 있습니다 @clerk/nextjs >=6.14.0.

contentSecurityPolicyClerk는 `.csp` 파일에 옵션을 추가하여 CSP 헤더를 자동으로 삽입하는 기능을 기본적으로 지원합니다 clerkMiddleware(). CSP를 얼마나 엄격하게 적용할지에 따라 두 가지 모드가 있습니다.

default구성
strict구성
default구성
이 default구성은 다음 CSP 지시문을 적용합니다.

connect-src-'self' https://clerk-telemetry.com https://_.clerk-telemetry.com https://api.stripe.com https://maps.googleapis.com https://{{fapi_url}}
default-src-'self'
form-action-'self'
frame-src-'self' https://challenges.cloudflare.com https://_.js.stripe.com https://js.stripe.com https://hooks.stripe.com
img-src-'self' https://img.clerk.com
script-src-'self' 'unsafe-inline' https http https://\*.js.stripe.com https://js.stripe.com https://maps.googleapis.com
style-src-'self' 'unsafe-inline'
worker-src-'self' blob:
중요한

Next.js 15 이하 버전을 사용하는 경우 파일 이름을 middleware.ts대신 로 지정 proxy.ts하세요. 코드 자체는 동일하며 파일 이름만 변경됩니다.

프록시.ts

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])

export default clerkMiddleware(
async (auth, request) => {
if (!isPublicRoute(request)) {
await auth.protect()
}
},
{
contentSecurityPolicy: {},
},
)
strict구성
이 설정을 사용하면 strictClerk는 다음과 같은 작업을 수행합니다.

각 요청에 대해 고유한 nonce를 자동으로 생성합니다.
적절한 지시문을 사용하여 CSP 헤더를 구성하십시오.
헤더를 통해 애플리케이션에서 nonce를 사용할 수 있도록 하세요 x-nonce.
미들웨어는 nonce 값을 자동으로 전달하므로 서버 컴포넌트를 사용할 때 <ClerkProvider>해당 속성을 수동으로 설정할 필요가 없습니다 .nonce

프록시.ts

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])

export default clerkMiddleware(
async (auth, request) => {
if (!isPublicRoute(request)) {
await auth.protect()
}
},
{
contentSecurityPolicy: {
strict: true,
},
},
)
중요한

당신은 통과해야 합니다
동적 속성
<ClerkProvider>CSP 구성이 올바르게 작동하려면 nonce strict값이 서버에서 생성되어 클라이언트로 전달되므로 동적 렌더링이 필요합니다.

앱 /layout.tsx

import { ClerkProvider } from '@clerk/nextjs'

export default function Layout({ children }) {
return (
// When using clerkMiddleware with `strict` configuration,
// the nonce is automatically provided.
// No need to manually set the `nonce` prop on `<ClerkProvider>`
<ClerkProvider dynamic>

<html lang="en">
<body>{children}</body>
</html>
</ClerkProvider>
)
}
사용자 지정 스크립트에 nonce를 적용해야 하는 경우 헤더를 통해 nonce에 접근할 수 있습니다.

페이지 /index.tsx

import { headers } from 'next/headers'

export default function Page() {
const nonce = headers().get('x-nonce')

return (

<div>
<script nonce={nonce} src="/custom-script.js" />
</div>
)
}
추가 CSP 지시문을 추가하세요
default콘텐츠 보안 정책(CSP)은 또는 구성 에 사용자 지정 지시문을 추가하여 맞춤 설정할 수 있습니다 strict. directives객체를 제공하기만 하면 사용자 지정 규칙이 Clerk의 기본 보안 설정과 병합됩니다.

다음 예에서 지시문은 와 를 connect-src포함하도록 구성되어 있으며 , 지시문은 를 포함하도록 구성되어 있습니다 .api.example.comanalytics.example.comimg-srcimages.example.com

프록시.ts

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])

export default clerkMiddleware(
async (auth, request) => {
if (!isPublicRoute(request)) {
await auth.protect()
}
},
{
contentSecurityPolicy: {
strict: true,
directives: {
'connect-src': ['api.example.com', 'analytics.example.com'],
'img-src': ['images.example.com'],
},
},
},
)

라라랜딩 프로젝트 구현 예시
이 프로젝트는 Clerk의 자동 CSP 구성을 사용하며, Supabase와의 통합을 위해 추가 지시문을 포함합니다.

구현 내용:

1. middleware.ts에서 Clerk 자동 CSP 구성 사용 (default 모드)
2. Supabase 도메인을 connect-src에 추가
3. Vercel Live 도메인을 개발 환경에서만 허용 (connect-src, frame-src, script-src)
4. next.config.ts에서 수동 CSP 헤더 제거 (Clerk가 자동 처리)
5. app/layout.tsx의 ClerkProvider에 dynamic prop 추가

middleware.ts

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
"/",
"/sign-in(.*)",
"/sign-up(.*)",
"/select-role",
]);

export default clerkMiddleware(
async (auth, req) => {
// 인증 및 라우트 보호 로직
// ...
},
{
contentSecurityPolicy: {
directives: {
"connect-src": [
"https://_.supabase.co",
"wss://\_.supabase.co",
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

app/layout.tsx

import { ClerkProvider } from "@clerk/nextjs";
import { koKR } from "@clerk/localizations";

export default function RootLayout({ children }) {
return (
<ClerkProvider
publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
localization={koKR}
dynamic
appearance={{
        cssLayerName: "clerk",
      }} >

<html lang="ko">
<body>{children}</body>
</html>
</ClerkProvider>
);
}

next.config.ts

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
async headers() {
return [
{
source: "/:path\*",
headers: [
// 다른 보안 헤더는 유지
{
key: "X-Frame-Options",
value: "DENY",
},
// Content-Security-Policy는 Clerk가 자동으로 처리하므로 제거
],
},
];
},
};

export default nextConfig;

중요 사항:

- Supabase를 사용하는 경우 connect-src에 https://_.supabase.co와 wss://\_.supabase.co를 반드시 추가해야 합니다.
- ClerkProvider에 dynamic prop을 추가하면 CSP nonce가 자동으로 전달됩니다.
- next.config.ts에서 Content-Security-Policy 헤더를 제거해야 Clerk의 자동 CSP와 충돌하지 않습니다.

### 프로덕션 환경에서의 Vercel Live CSP 에러

**에러 메시지**:

```
Framing 'https://vercel.live/' violates the following Content Security Policy directive: "frame-src 'self' https://challenges.cloudflare.com https://*.js.stripe.com https://js.stripe.com https://hooks.stripe.com"
```

**원인**: Vercel Live는 개발 도구이지만, 프로덕션 환경에서도 CSP 에러가 발생할 수 있습니다.

**해결 방법**:

프로덕션 환경에서는 Vercel Live가 자동으로 비활성화되어야 하지만, CSP 에러가 발생하는 경우 `middleware.ts`에서 개발 환경에서만 허용하도록 설정:

```typescript
// middleware.ts
export default clerkMiddleware(
  async (auth, req) => {
    // ... 인증 로직
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
```

**주의사항**:

- Vercel Live CSP 에러는 애플리케이션 기능에 영향을 주지 않습니다.
- 프로덕션 환경에서는 Vercel Live가 자동으로 비활성화되어야 합니다.
- 에러가 계속 발생하면 Vercel 설정에서 Live 기능을 확인하세요.
  수동 CSP 구성
  다음 예시는 Next.js 설정 파일에서 애플리케이션 자산과 Clerk가 올바르게 로드되고 작동하는 데 필요한 지시문을 설정하는 방법을 보여줍니다. 예시에 사용된 값은 Clerk 대시보드에서 현재 선택된 인스턴스를 기반으로 생성됩니다. 개발 인스턴스와 프로덕션 인스턴스 호스트를 모두 정확하게 설정해야 합니다.

경고

스크립트나 자산을 불러오는 타사 도메인도 모두 지정해야 합니다.

다음.config.js

라라랜딩

라라랜딩

const cspHeader = `  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://rapid-anteater-86.clerk.accounts.dev https://challenges.cloudflare.com;
  connect-src 'self' https://rapid-anteater-86.clerk.accounts.dev;
  img-src 'self' https://img.clerk.com;
  worker-src 'self' blob:;
  style-src 'self' 'unsafe-inline';
  frame-src 'self' https://challenges.cloudflare.com;
  form-action 'self';`

/\*_ @type {import('next').NextConfig} _/
const nextConfig = {
async headers() {
return [
{
source: '/(.\*)',
headers: [
{
key: 'Content-Security-Policy',
value: cspHeader.replace(/\n/g, ''),
},
],
},
]
},
}

module.exports = nextConfig
Next.js에서 의 사용법 unsafe-eval및 지시어unsafe-inline
Next.js와 Clerk는 특정 요구 사항 script-src과 style-src지시문을 가지고 있습니다. 알아야 할 사항은 다음과 같습니다.

script-src 'unsafe-eval'이는 Next.js 개발 환경에서 실행되기 위한 필수 요구 사항 입니다 . 프로덕션 환경의 CSP에서는 이를 제거해야 합니다.
script-src 'unsafe-inline'Next.js 라우팅 구조에 따라 다릅니다.
앱 라우터: 개발 및 프로덕션 환경 모두 에서 필수입니다 . 단, 다른 접근 strict-dynamic방식을 사용하는 경우는 예외입니다 .
페이지 라우터: 안전하게 제거할 수 있습니다.
style-src 'unsafe-inline'Clerk의 컴포넌트가 스타일을 주입하려면 이 요구 사항 을 충족해야 합니다. 이 요구 사항을 제거하는 것은 Clerk의 로드맵에 포함되어 있습니다. 더 빨리 구현되기를 원하시면 지원팀에 문의해 주세요
strict-dynamicCSP 구현하기
엄격하고 동적인 CSP를 으로 구현하려면 Clerk에서 지원하지만 구성 방식이 다릅니다. 엄격하고 동적인 CSP는 요청마다 프로그램적으로 생성해야 하는 "nonce" 값을 필요로 하므로, 모든 요청에서 실행되는 미들웨어를 사용하는 것이 가장 좋습니다. 다음 예제는 Next.js 미들웨어를 사용하여 엄격하고 동적인 CSP를 구현하는 방법을 보여주지만, 다른 프레임워크에서도 동일한 접근 방식을 사용할 수 있습니다.

메모

이 모드 strict-dynamic는 에서clerkMiddleware() 사용하는 경우에는 필요하지 않습니다 . 엄격한 동적 CSP를 수동으로 구현하는 경우에만 필요합니다 .

프록시.ts

라라랜딩

라라랜딩

import { NextResponse } from 'next/server'
import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware((auth, req) => {
return applyCsp(req)
})

function applyCsp(req) {
// create a randomly generated nonce value
const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

// format the CSP header
const cspHeader = `    default-src 'self';
    script-src 'self' 'strict-dynamic' 'nonce-${nonce}' https: http: ${
      process.env.NODE_ENV === 'production' ? '' :`'unsafe-eval'`  };
    connect-src 'self' https://rapid-anteater-86.clerk.accounts.dev;
    img-src 'self' https://img.clerk.com;
    worker-src 'self' blob:;
    style-src 'self';
    frame-src 'self' https://challenges.cloudflare.com;
    form-action 'self';`
// Replace newline characters and spaces
const contentSecurityPolicyHeaderValue = cspHeader.replace(/\s{2,}/g, ' ').trim()

// set the nonce and csp values in the request headers
const requestHeaders = new Headers(req.headers)
requestHeaders.set('x-nonce', nonce)
requestHeaders.set('Content-Security-Policy', contentSecurityPolicyHeaderValue)

const response = NextResponse.next({
request: {
headers: requestHeaders,
},
})

response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue)

return response
}

export const config = {
matcher: [
// Skip Next.js internals and all static files, unless found in search params
'/((?!\_next|[^?]_\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest))._)',
// Always run for API routes
'/(api|trpc)(.\*)',
],
}
이 strict-dynamic설정이 적용되면 모든 스크립트 태그는 nonce 값 을 전달해야 하며nonce , 그렇지 않으면 차단됩니다. nonce 값은 nonce스크립트 태그의 매개변수로 전달하여 사용할 수 있습니다. 예를 들어, ` <script>`와 같이 <script src="https://example.com/script.js" nonce="<nonce_value>"></script>사용합니다. Next.js를 사용하는 경우, Next를 통해 로드되는 모든 스크립트에는 nonce 값이 자동으로 삽입됩니다.

위 미들웨어를 사용하면 nonce 값을 x-nonce요청 헤더를 통해 접근할 수 있습니다. Next.js 페이지에서 이 값에 접근하는 방법은 아래 예시를 참조하십시오.

페이지 /index.tsx

import { headers } from 'next/headers'

export default function Page() {
const nonce = headers().get('x-nonce')

return <p>{nonce}</p>
}
Clerk의 React 기반 SDK 중 하나를 사용하는 경우, Clerk가 올바르게 로드되려면 nonce 값을 컴포넌트에 전달해야 합니다 . 이는 nonce 값을 컴포넌트 의 props <ClerkProvider>로 전달함으로써 가능합니다 . 예를 들면 다음과 같습니다.nonce<ClerkProvider>

중요한

당신은 통과해야 합니다
동적 속성
<ClerkProvider>CSP가 올바르게 작동하려면 nonce strict-dynamic값이 서버에서 생성되어 클라이언트로 전달되므로 동적 렌더링이 필요합니다.

앱 /layout.tsx

import { ClerkProvider } from '@clerk/nextjs'
import { headers } from 'next/headers'

export default function Layout({ children }) {
return (
// Note: since this is server-rendered, you don't _need_ to pass the nonce, see note below
<ClerkProvider nonce={headers().get('x-nonce')} dynamic>

<html lang="en">
<body>{children}</body>
</html>
</ClerkProvider>
)
}
Next.js를 사용하고 레이아웃 파일이 서버에서 렌더링되는 경우(위 예시와 같이), Clerk SDK는 nonce요청에서 해당 값을 자동으로 읽어와 전달합니다 <ClerkProvider>. 프로바이더를 클라이언트에서 렌더링하는 경우에는nonce 해당 값을 클라이언트로 명시적으로 전달하고 전달해야 합니다 <ClerkProvider>.

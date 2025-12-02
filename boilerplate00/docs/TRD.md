# Technical Requirements Document (TRD)

## 미국 이주 지원 플랫폼 v1.1

---

## 1. 기술 스택 개요

### 1.1 핵심 기술 스택

| 카테고리           | 기술                  | 버전              | 용도                       |
| ------------------ | --------------------- | ----------------- | -------------------------- |
| **Frontend**       | Next.js               | 15.x (App Router) | 웹 애플리케이션 프레임워크 |
| **Language**       | TypeScript            | 5.x               | 타입 안정성                |
| **Styling**        | Tailwind CSS          | 3.x               | 스타일링                   |
| **Authentication** | Clerk                 | Latest            | 사용자 인증 및 권한 관리   |
| **Database**       | Supabase (PostgreSQL) | Latest            | 데이터 저장 및 관리        |
| **Real-time**      | Supabase Realtime     | Latest            | 실시간 채팅 (Phase 2)      |
| **Hosting**        | Vercel                | Hobby Plan        | 프론트엔드 배포            |
| **Backend**        | Next.js API Routes    | -                 | 서버 사이드 로직           |

### 1.2 개발 도구

| 도구         | 용도           |
| ------------ | -------------- |
| **pnpm**     | 패키지 매니저  |
| **ESLint**   | 코드 품질 관리 |
| **Prettier** | 코드 포맷팅    |
| **Git**      | 버전 관리      |

---

## 2. 아키텍처

### 2.1 시스템 아키텍처

```
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Vercel Edge   │
│   (Next.js App) │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│ Clerk  │ │ Supabase │
│  Auth  │ │   DB     │
└────────┘ └──────────┘
```

### 2.2 데이터 흐름

1. **인증 흐름**:

   - 사용자 → Clerk 로그인
   - Clerk → Next.js (JWT 토큰)
   - Next.js → Supabase (RLS 정책으로 접근 제어)

2. **API 흐름**:

   - 클라이언트 → Next.js API Route
   - Next.js → Supabase (PostgreSQL)
   - Supabase → Next.js (응답)
   - Next.js → 클라이언트

3. **채팅 흐름 (Phase 1 - 폴링)**:

   - 클라이언트 → Next.js API (GET /api/messages)
   - Next.js → Supabase (메시지 조회)
   - 5초마다 폴링 반복

4. **채팅 흐름 (Phase 2 - Realtime)**:
   - 클라이언트 → Supabase Realtime 구독
   - 새 메시지 → 즉시 전송 (WebSocket)

---

## 3. 데이터베이스 스키마

### 3.1 테이블 구조

#### accounts (에이전트 계정)

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent',
  name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_accounts_clerk_user_id ON accounts(clerk_user_id);
```

#### clients (클라이언트)

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_agent_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  clerk_user_id TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  occupation TEXT NOT NULL, -- 'doctor' | 'employee' | 'student'
  moving_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_clients_owner_agent_id ON clients(owner_agent_id);
CREATE INDEX idx_clients_clerk_user_id ON clients(clerk_user_id);
```

#### housing_requirements (주거 요구사항)

```sql
CREATE TABLE housing_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  preferred_city TEXT,
  budget_max INTEGER, -- USD/월
  housing_type TEXT, -- 'apartment' | 'house' | 'townhouse'
  bedrooms INTEGER,
  bathrooms DECIMAL(3,1), -- 1.5 등 지원
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_housing_requirements_client_id ON housing_requirements(client_id);
```

#### checklist_items (체크리스트)

```sql
CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'pre_departure' | 'arrival' | 'settlement'
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  order INTEGER NOT NULL,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_checklist_items_client_id ON checklist_items(client_id);
CREATE INDEX idx_checklist_items_category ON checklist_items(category);
```

#### messages (채팅 메시지)

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sender_clerk_id TEXT NOT NULL,
  sender_type TEXT NOT NULL, -- 'agent' | 'client'
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_client_id ON messages(client_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
```

### 3.2 Row Level Security (RLS) 정책

#### accounts 테이블

```sql
-- 에이전트는 자신의 정보만 조회
CREATE POLICY "Agents can view own account"
  ON accounts FOR SELECT
  USING (auth.jwt() ->> 'metadata' ->> 'role' = 'agent'
    AND clerk_user_id = auth.jwt() ->> 'sub');
```

#### clients 테이블

```sql
-- 에이전트는 자신의 클라이언트만 조회
CREATE POLICY "Agents can view own clients"
  ON clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = clients.owner_agent_id
      AND accounts.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- 클라이언트는 자신의 정보만 조회
CREATE POLICY "Clients can view own profile"
  ON clients FOR SELECT
  USING (clerk_user_id = auth.jwt() ->> 'sub');

-- 에이전트는 자신의 클라이언트만 수정
CREATE POLICY "Agents can update own clients"
  ON clients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = clients.owner_agent_id
      AND accounts.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- 클라이언트는 자신의 정보만 수정
CREATE POLICY "Clients can update own profile"
  ON clients FOR UPDATE
  USING (clerk_user_id = auth.jwt() ->> 'sub');
```

#### messages 테이블

```sql
-- 에이전트와 클라이언트만 해당 클라이언트의 메시지 조회
CREATE POLICY "Users can view messages for their clients"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = messages.client_id
      AND (
        clients.owner_agent_id IN (
          SELECT id FROM accounts
          WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
        OR clients.clerk_user_id = auth.jwt() ->> 'sub'
      )
    )
  );
```

---

## 4. API 명세

### 4.1 REST API 엔드포인트

#### 클라이언트 관리

```
POST   /api/clients              -- 새 클라이언트 생성
GET    /api/clients              -- 클라이언트 목록 (에이전트만)
GET    /api/clients/[id]         -- 클라이언트 상세
PATCH  /api/clients/[id]         -- 클라이언트 정보 수정
```

#### 주거 요구사항

```
GET    /api/housing/[client_id]  -- 주거 요구사항 조회
PATCH  /api/housing/[client_id]  -- 주거 요구사항 업데이트
```

#### 체크리스트

```
GET    /api/checklist/[client_id] -- 체크리스트 조회
PATCH  /api/checklist/[id]        -- 항목 업데이트
```

#### 채팅

```
POST   /api/messages              -- 메시지 전송
GET    /api/messages/[client_id]  -- 메시지 히스토리 (폴링)
```

### 4.2 API 요청/응답 예시

#### POST /api/clients

**Request**:

```json
{
  "name": "홍길동",
  "email": "hong@example.com",
  "phone": "010-1234-5678",
  "occupation": "doctor",
  "moving_date": "2025-06-01"
}
```

**Response**:

```json
{
  "id": "uuid",
  "name": "홍길동",
  "email": "hong@example.com",
  "created_at": "2025-01-27T00:00:00Z"
}
```

#### GET /api/messages/[client_id]

**Query Parameters**:

- `limit`: 페이지당 메시지 수 (기본: 50)
- `offset`: 오프셋 (기본: 0)

**Response**:

```json
{
  "messages": [
    {
      "id": "uuid",
      "sender_clerk_id": "user_xxx",
      "sender_type": "client",
      "content": "안녕하세요",
      "created_at": "2025-01-27T00:00:00Z"
    }
  ],
  "total": 10
}
```

---

## 5. 인증 및 권한

### 5.1 Clerk 통합

#### 환경 변수

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/agent/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/agent/dashboard
```

#### 미들웨어 (middleware.ts)

```typescript
import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export default authMiddleware({
  publicRoutes: ["/", "/sign-in", "/sign-up"],
  async afterAuth(auth, req) {
    if (auth.userId) {
      const role = auth.sessionClaims?.publicMetadata?.role;

      if (role === "agent" && !req.nextUrl.pathname.startsWith("/agent")) {
        return NextResponse.redirect(new URL("/agent/dashboard", req.url));
      }

      if (role === "client" && !req.nextUrl.pathname.startsWith("/client")) {
        return NextResponse.redirect(new URL("/client/home", req.url));
      }
    }
  },
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

#### 서버 사이드 인증 확인

```typescript
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function getAuthUser() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return userId;
}

export async function getAuthRole() {
  const { userId } = await auth();
  const session = await clerkClient.sessions.getSession(userId);
  return session?.publicMetadata?.role;
}
```

### 5.2 Supabase 클라이언트 설정

#### 환경 변수

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... (서버 사이드만)
```

#### Supabase 클라이언트 생성

```typescript
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

export async function createSupabaseClient() {
  const { getToken } = await auth();
  const token = await getToken({ template: "supabase" });

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      },
    }
  );
}
```

---

## 6. 실시간 통신 (Phase 2)

### 6.1 Supabase Realtime 설정

#### 채널 구독

```typescript
const channel = supabase
  .channel(`chat:${clientId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `client_id=eq.${clientId}`,
    },
    (payload) => {
      // 새 메시지 처리
      setMessages((prev) => [...prev, payload.new]);
    }
  )
  .subscribe();

// 정리
return () => {
  supabase.removeChannel(channel);
};
```

### 6.2 Phase 1 폴링 방식

```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const { data } = await fetch(`/api/messages/${clientId}`);
    setMessages(data.messages);
  }, 5000); // 5초마다 폴링

  return () => clearInterval(interval);
}, [clientId]);
```

---

## 7. 배포 및 인프라

### 7.1 Vercel 배포

#### 설정 파일 (vercel.json)

```json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

#### 환경 변수 설정

- Vercel 대시보드에서 환경 변수 설정
- Production, Preview, Development 환경별 분리

### 7.2 Supabase 설정

#### 데이터베이스 마이그레이션

- Supabase Dashboard에서 SQL Editor 사용
- 또는 Supabase CLI 사용 (향후)

#### RLS 정책 활성화

```sql
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- ... 모든 테이블에 적용
```

### 7.3 Clerk 설정

#### Webhook 설정

- Clerk Dashboard에서 Webhook 엔드포인트 설정
- 사용자 생성/업데이트 시 Supabase 동기화

---

## 8. 보안

### 8.1 인증 보안

- Clerk JWT 토큰 검증
- HTTPS 필수
- 세션 타임아웃 설정

### 8.2 데이터 보안

- Supabase RLS로 데이터 접근 제어
- 환경 변수 암호화
- SQL Injection 방지 (Supabase 자동 처리)

### 8.3 개인정보 보호

- GDPR/CCPA 준수
- 개인정보 처리방침 페이지
- 데이터 삭제 기능 (향후)

---

## 9. 모니터링 및 로깅

### 9.1 Vercel Analytics

- Vercel 대시보드에서 기본 분석 제공
- 페이지뷰, 성능 메트릭 자동 수집

### 9.2 에러 추적

- Next.js Error Boundary
- 클라이언트 사이드 에러 로깅 (향후 Sentry 고려)

### 9.3 로깅

- 서버 사이드: `console.log` (Vercel 로그)
- 클라이언트 사이드: 개발 모드에서만 로깅

---

## 10. 성능 최적화

### 10.1 프론트엔드

- Next.js Image 최적화
- 코드 스플리팅 (자동)
- 정적 페이지 생성 (가능한 경우)

### 10.2 데이터베이스

- 인덱스 최적화
- 쿼리 최적화
- 연결 풀링 (Supabase 자동)

### 10.3 캐싱

- Next.js 캐싱 전략 활용
- API 응답 캐싱 (가능한 경우)

---

## 11. 개발 환경 설정

### 11.1 필수 요구사항

- Node.js 18.x 이상
- pnpm 8.x 이상
- Git

### 11.2 초기 설정

```bash
# 프로젝트 클론
git clone [repository-url]
cd lalalanding0

# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일에 필요한 환경 변수 입력

# 개발 서버 실행
pnpm dev
```

### 11.3 환경 변수 목록

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 12. 테스트 전략

### 12.1 단위 테스트 (향후)

- React 컴포넌트 테스트
- API 라우트 테스트

### 12.2 통합 테스트 (향후)

- 인증 플로우 테스트
- 데이터 CRUD 테스트

### 12.3 E2E 테스트 (향후)

- Playwright 또는 Cypress
- 주요 사용자 시나리오 테스트

---

## 13. 확장성 고려사항

### 13.1 현재 제약사항

- Vercel Hobby: 무료 플랜 제한
- Supabase Free: 500MB 데이터베이스, 2GB 대역폭
- Clerk Free: 10,000 MAU

### 13.2 확장 시 마이그레이션 계획

- Vercel Pro ($20/월): 더 많은 빌드 시간
- Supabase Pro ($25/월): 더 큰 데이터베이스, 더 많은 대역폭
- Clerk Pro: 더 많은 MAU

---

## 14. 문서화

### 14.1 코드 문서화

- 함수/컴포넌트 JSDoc 주석
- 복잡한 로직 설명 주석

### 14.2 API 문서화

- API 엔드포인트 설명
- 요청/응답 예시

### 14.3 사용자 가이드 (향후)

- 에이전트 사용 가이드
- 클라이언트 사용 가이드

---

## 15. 버전 관리

### 15.1 Git 전략

- Main 브랜치: 프로덕션
- Develop 브랜치: 개발
- Feature 브랜치: 기능 개발

### 15.2 릴리스 프로세스

1. Feature 브랜치에서 개발
2. Develop 브랜치로 머지
3. 테스트 완료 후 Main 브랜치로 머지
4. Vercel 자동 배포

---

## 16. 결론

이 기술 요구사항 문서는 MVP 개발을 위한 핵심 기술 스펙을 정의합니다. Phase 1에서는 최소 기능으로 시작하여 점진적으로 기능을 확장하는 전략을 따릅니다.

**핵심 원칙**:

1. 빠른 프로토타이핑 (VibeCoding)
2. 검증된 기술 스택 사용
3. 무료 플랜으로 시작하여 필요 시 확장
4. 보안 및 성능 최적화

# 보안 가이드

## 개요

이 문서는 프로젝트의 보안 설정, 구현 사항, 점검 체크리스트를 포함한 종합 보안 가이드입니다.

## 구현 완료 사항

### Phase 1: 데이터베이스 보안 강화 ✅

1. **RLS 활성화 마이그레이션 작성**

   - 파일: `supabase/migrations/20251205203448_enable_rls_production.sql`
   - 모든 테이블(14개)에 RLS 활성화
   - 누락된 테이블에 대한 RLS 정책 추가

2. **PostgreSQL 함수 보안 강화**

   - 파일: `supabase/migrations/20251205203537_fix_function_search_path.sql`
   - 모든 함수에 `SET search_path = public` 추가
   - 함수 목록: get_checklist_progress, ui_to_db_category, db_to_ui_category, update_checklist_completed_at, debug_jwt_claims

3. **Storage RLS 확인**
   - Storage 버킷 RLS 정책이 이미 올바르게 설정되어 있음 확인

### Phase 2: 입력 검증 및 데이터 보호 ✅

1. **Zod 스키마 추가**

   - 파일: `lib/validations/api-schemas.ts`
   - 모든 주요 API 라우트에 Zod 스키마 적용:
     - `/api/messages` (POST, GET)
     - `/api/clients/[id]` (GET, PATCH)
     - `/api/housing/[client_id]` (GET, PATCH)
     - `/api/checklist/[client_id]` (GET, PATCH)
     - `/api/client/profile` (PATCH)
     - `/api/client/housing` (PATCH)
     - `/api/client/checklist` (PATCH)
     - `/api/set-role` (POST)
     - `/api/clients/[id]/assign` (PATCH)
     - `/api/client/checklist/files` (GET, POST, DELETE)

2. **파일 업로드 보안 강화**
   - 파일: `lib/utils/file-sanitization.ts`
   - 파일명 sanitization 구현
   - UUID 검증 추가
   - 경로 탐색 공격 방지

### Phase 3: 인증 및 인가 강화 ✅

1. **Middleware 보안 개선**

   - 파일: `middleware.ts`
   - 에러 처리에서 민감한 정보 제외
   - 보안 로그 개선

2. **API 라우트 인증 확인**
   - 모든 API 라우트에서 인증 확인 수행
   - 역할 기반 접근 제어 확인
   - 클라이언트 소유권 확인

### Phase 4: 환경 변수 및 설정 보안 ✅

1. **환경 변수 보안 확인**
   - Service Role Key가 서버 사이드에서만 사용됨 확인
   - API 키가 서버 사이드에서만 사용됨 확인

### Phase 5: 로깅 및 모니터링 ✅

1. **보안 이벤트 로깅 구현**
   - 파일: `lib/logging/security-events.ts`
   - 인증 실패 로깅
   - 권한 위반 로깅
   - 잘못된 입력 로깅
   - 의심스러운 활동 로깅

### Phase 6: 프로덕션 환경 설정 ✅

1. **Next.js 보안 헤더 설정**
   - 파일: `next.config.ts`
   - Content-Security-Policy 설정
   - 보안 헤더 추가 (X-Frame-Options, X-Content-Type-Options 등)
   - Strict-Transport-Security 설정

## 주요 보안 개선 사항

1. **데이터베이스 보안**: 모든 테이블에 RLS 활성화, 함수 보안 강화
2. **입력 검증**: 모든 API에 Zod 스키마 적용
3. **파일 보안**: 파일명 sanitization, 크기/타입 제한
4. **보안 헤더**: CSP, X-Frame-Options 등 설정
5. **로깅**: 보안 이벤트 추적 시스템 구축

## 환경 변수 보안

### 필수 환경 변수 목록

#### Clerk 인증

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: 공개 키 (클라이언트 노출 가능)
- `CLERK_SECRET_KEY`: 비밀 키 (서버 사이드 전용, 절대 노출 금지)
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`: 로그인 페이지 URL
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`: 로그인 후 리다이렉트 URL
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`: 회원가입 후 리다이렉트 URL

#### Supabase

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL (공개 가능)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon 키 (공개 가능, RLS로 보호됨)
- `SUPABASE_SERVICE_ROLE_KEY`: Service Role 키 (서버 사이드 전용, 절대 노출 금지)
- `NEXT_PUBLIC_STORAGE_BUCKET`: Storage 버킷 이름 (기본값: "uploads")

#### 외부 API

- `GEMINI_API_KEY`: Gemini API 키 (서버 사이드 전용)
- `BRIDGE_DATA_API_KEY`: Bridge Data API 키 (서버 사이드 전용)

#### 채팅 폴링 설정 (선택사항)

- `NEXT_PUBLIC_CHAT_POLLING_INTERVAL`: 폴링 간격 (밀리초, 기본값: 5000)
  - 최소값: 1000ms (1초) 권장
  - 최대값: 60000ms (60초) 권장
- `NEXT_PUBLIC_CHAT_MAX_RETRY_COUNT`: 최대 재시도 횟수 (기본값: 5)
- `NEXT_PUBLIC_CHAT_BACKOFF_MULTIPLIER`: 백오프 배수 (기본값: 2)
  - 연속 실패 시 폴링 간격을 증가시키는 배수

### 보안 체크리스트

#### Service Role Key 보안

- [ ] `SUPABASE_SERVICE_ROLE_KEY`가 클라이언트 사이드 코드에 사용되지 않음
- [ ] `lib/supabase/service-role.ts`는 서버 사이드에서만 사용됨
- [ ] 환경 변수가 `.gitignore`에 포함되어 있음
- [ ] 프로덕션 환경 변수가 안전하게 설정됨

#### API 키 보안

- [ ] `GEMINI_API_KEY`가 서버 사이드에서만 사용됨 (`actions/gemini-listing.ts` 확인)
- [ ] `BRIDGE_DATA_API_KEY`가 서버 사이드에서만 사용됨 (`actions/bridge-listing.ts` 확인)
- [ ] 클라이언트 사이드에 노출되는 키는 `NEXT_PUBLIC_` 접두사가 있는 키만 사용

#### 환경 변수 검증

- [ ] 모든 필수 환경 변수가 설정되어 있음
- [ ] 프로덕션 환경에서 환경 변수가 올바르게 설정됨
- [ ] 환경 변수 값이 유효한 형식인지 확인됨

### 프로덕션 환경 변수 설정 가이드

#### Vercel 배포 시

1. Vercel Dashboard → 프로젝트 선택
2. Settings → Environment Variables
3. 각 환경 변수 추가:
   - Production 환경에만 설정
   - Preview 환경에는 개발용 값 설정
   - Development 환경은 로컬 `.env.local` 사용

#### 환경 변수 검증 스크립트

프로덕션 배포 전에 다음 스크립트를 실행하여 필수 환경 변수를 확인하세요:

```bash
# 필수 환경 변수 확인
node -e "
const required = [
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];
const missing = required.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error('Missing environment variables:', missing);
  process.exit(1);
}
console.log('All required environment variables are set');
"
```

### 보안 모범 사례

1. **절대 하드코딩하지 않기**: 모든 키는 환경 변수로 관리
2. **서버 사이드 키 보호**: `SUPABASE_SERVICE_ROLE_KEY`, `CLERK_SECRET_KEY` 등은 서버 사이드에서만 사용
3. **정기적인 키 로테이션**: 프로덕션 키는 정기적으로 변경
4. **접근 제어**: 환경 변수에 접근할 수 있는 사람을 최소화
5. **로깅 주의**: 환경 변수 값이 로그에 출력되지 않도록 주의

## 보안 로깅 시스템

### 현재 구현

#### 보안 이벤트 로깅 (`lib/logging/security-events.ts`)

다음 이벤트 타입을 지원합니다:

- `AUTH_FAILURE`: 인증 실패
- `PERMISSION_DENIED`: 권한 위반
- `INVALID_INPUT`: 잘못된 입력
- `SUSPICIOUS_ACTIVITY`: 의심스러운 활동
- `RATE_LIMIT_EXCEEDED`: Rate limit 초과

#### 로깅 위치

보안 이벤트는 다음 위치에서 로깅됩니다:

- API 라우트의 인증 실패
- 권한 위반 시도
- 입력 검증 실패
- 의심스러운 활동 감지

### Sentry 연동 (권장)

#### 1. Sentry 계정 생성 및 프로젝트 설정

1. [Sentry](https://sentry.io)에 가입
2. 새 프로젝트 생성 (Next.js 선택)
3. DSN 복사

#### 2. 패키지 설치

```bash
pnpm add @sentry/nextjs
```

#### 3. Sentry 초기화

```bash
npx @sentry/wizard@latest -i nextjs
```

#### 4. 환경 변수 추가

```env
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
SENTRY_AUTH_TOKEN=your_auth_token_here
```

#### 5. 보안 이벤트 로깅 활성화

`lib/logging/security-events.ts`의 `logSecurityEvent` 함수에서 Sentry 연동 코드의 주석을 해제하세요.

### 모니터링 설정

#### Supabase 대시보드

1. Supabase Dashboard → Logs
2. API 로그 모니터링 설정
3. 에러 알림 설정

#### Vercel Analytics (선택사항)

1. Vercel Dashboard → Analytics
2. Web Vitals 모니터링 활성화
3. 에러 추적 활성화

### 알림 설정

중요한 보안 이벤트에 대한 알림을 설정하세요:

1. **인증 실패**: 짧은 시간 내 여러 번 발생 시 알림
2. **권한 위반**: 반복적인 시도 시 알림
3. **의심스러운 활동**: 비정상적인 패턴 감지 시 알림

### 로그 보관 정책

- 보안 이벤트 로그는 최소 90일간 보관
- 민감한 정보(비밀번호, API 키 등)는 로그에서 제외
- 개인정보는 익명화하여 로깅

## 보안 점검 체크리스트

### 자동화된 보안 점검

#### 1. Supabase 보안 어드바이저 실행

```bash
# MCP를 통해 실행
mcp_supabase_get_advisors(type: "security")
```

**확인 사항:**

- [ ] RLS가 모든 테이블에서 활성화되어 있음
- [ ] RLS 정책이 올바르게 설정되어 있음
- [ ] PostgreSQL 함수에 search_path가 설정되어 있음
- [ ] 보안 경고가 0개

#### 2. 의존성 취약점 스캔

```bash
pnpm audit
```

**확인 사항:**

- [ ] Critical 취약점 없음
- [ ] High 취약점 없음 (또는 수용 가능한 수준)

#### 3. 정적 코드 분석

```bash
pnpm lint
```

**확인 사항:**

- [ ] 린터 에러 없음
- [ ] 타입 에러 없음

### 수동 보안 점검

#### 인증 및 인가

- [ ] 모든 보호된 라우트가 Middleware에서 보호됨
- [ ] 모든 API 라우트가 인증을 확인함
- [ ] 역할 기반 접근 제어가 올바르게 작동함
- [ ] 클라이언트 소유권 확인이 모든 관련 API에서 수행됨

#### 데이터베이스 보안

- [ ] 모든 테이블에 RLS가 활성화되어 있음
- [ ] RLS 정책이 올바르게 작동함
- [ ] Service Role Key가 클라이언트에 노출되지 않음
- [ ] 데이터베이스 함수에 search_path가 설정되어 있음

#### 입력 검증

- [ ] 모든 API 라우트에 Zod 스키마가 적용됨
- [ ] UUID 형식 검증이 수행됨
- [ ] 파일 업로드 크기/타입 제한이 적용됨
- [ ] 파일명 sanitization이 적용됨

#### 파일 업로드 보안

- [ ] 파일 크기 제한이 적용됨 (10MB)
- [ ] 허용된 파일 타입만 업로드 가능
- [ ] 파일명 sanitization이 적용됨
- [ ] Storage RLS 정책이 올바르게 작동함

#### 환경 변수 보안

- [ ] Service Role Key가 서버 사이드에서만 사용됨
- [ ] API 키가 서버 사이드에서만 사용됨
- [ ] 환경 변수가 `.gitignore`에 포함되어 있음
- [ ] 프로덕션 환경 변수가 안전하게 설정됨

#### 보안 헤더

- [ ] Content-Security-Policy가 설정됨
- [ ] X-Frame-Options가 설정됨
- [ ] X-Content-Type-Options가 설정됨
- [ ] Strict-Transport-Security가 설정됨

#### 로깅 및 모니터링

- [ ] 보안 이벤트 로깅이 구현됨
- [ ] 인증 실패가 로깅됨
- [ ] 권한 위반이 로깅됨
- [ ] 에러 로깅 시스템이 설정됨 (Sentry 등)

### 침투 테스트

#### 인증 우회 시도

- [ ] 인증 없이 보호된 API 접근 시도 → 401 반환 확인
- [ ] 잘못된 토큰으로 접근 시도 → 401 반환 확인
- [ ] 만료된 토큰으로 접근 시도 → 401 반환 확인

#### 권한 상승 시도

- [ ] 클라이언트 역할로 에이전트 전용 API 접근 시도 → 403 반환 확인
- [ ] 에이전트 역할로 클라이언트 전용 API 접근 시도 → 403 반환 확인
- [ ] 다른 사용자의 데이터 접근 시도 → 404 또는 403 반환 확인

#### SQL 인젝션 시도

- [ ] API 파라미터에 SQL 코드 삽입 시도 → 검증 실패 확인
- [ ] UUID 필드에 SQL 코드 삽입 시도 → 검증 실패 확인

#### XSS 공격 시도

- [ ] 입력 필드에 스크립트 태그 삽입 시도 → sanitization 확인
- [ ] 메시지에 악성 스크립트 삽입 시도 → sanitization 확인

#### 파일 업로드 공격 시도

- [ ] 실행 가능한 파일 업로드 시도 → 타입 검증 실패 확인
- [ ] 큰 파일 업로드 시도 → 크기 제한 확인
- [ ] 경로 탐색 공격 시도 (../) → sanitization 확인

#### CSRF 공격 시도

- [ ] Clerk가 CSRF 보호를 제공하는지 확인
- [ ] API 라우트가 CSRF 토큰을 확인하는지 확인 (필요한 경우)

### 성능 및 안정성

- [ ] 데이터베이스 쿼리가 효율적으로 실행됨
- [ ] 인덱스가 적절히 설정되어 있음
- [ ] RLS 정책이 성능에 큰 영향을 주지 않음
- [ ] 에러 처리가 올바르게 작동함

### 문서화

- [ ] 보안 설정이 문서화되어 있음
- [ ] 프로덕션 전환 가이드가 작성되어 있음
- [ ] 환경 변수 가이드가 작성되어 있음
- [ ] 보안 이벤트 로깅 가이드가 작성되어 있음

### 최종 확인

- [ ] 모든 보안 경고가 해결됨
- [ ] 모든 테스트가 통과함
- [ ] 프로덕션 환경 변수가 설정됨
- [ ] 모니터링 시스템이 작동함
- [ ] 백업이 설정됨

## 다음 단계

### 즉시 수행해야 할 작업

1. **마이그레이션 적용**

   - `supabase/migrations/20251205203448_enable_rls_production.sql` 실행
   - `supabase/migrations/20251205203537_fix_function_search_path.sql` 실행

2. **보안 어드바이저 재실행**

   ```bash
   mcp_supabase_get_advisors(type: "security")
   ```

   - 모든 경고가 해결되었는지 확인

3. **테스트 수행**
   - RLS 정책 테스트
   - 인증/인가 테스트
   - 입력 검증 테스트
   - 파일 업로드 테스트

### 프로덕션 전환 전 필수 작업

1. **Sentry 연동** (선택사항이지만 권장)

   - 위의 "보안 로깅 시스템" 섹션 참고

2. **프로덕션 환경 변수 설정**

   - 위의 "환경 변수 보안" 섹션 참고

3. **프로덕션 프로젝트 생성**

   - `docs/PRODUCTION_SETUP.md` 참고

4. **최종 보안 점검**
   - 위의 "보안 점검 체크리스트" 섹션 참고

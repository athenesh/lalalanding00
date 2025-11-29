# 오류 해결 요약

## 발생한 오류

### 1. "Could not find the table 'public.users' in the schema cache"

**원인**: Supabase 데이터베이스에 `users` 테이블이 없습니다.

**해결 방법**:

- `MIGRATION_INSTRUCTIONS.md` 파일을 참고하여 마이그레이션을 적용하세요.
- Supabase Dashboard의 SQL Editor에서 마이그레이션 SQL을 실행하거나
- Supabase CLI를 사용하여 마이그레이션을 적용할 수 있습니다.

### 2. "alg" (Algorithm) Header Parameter value not allowed

**원인**: Clerk JWT 토큰을 Supabase Storage API에 직접 사용할 때 발생하는 오류입니다.

- Clerk의 JWT 알고리즘이 Supabase Storage에서 지원되지 않습니다.
- Storage API는 Clerk 토큰과 호환되지 않습니다.

**해결 방법**:

- Storage 작업에는 `useStorageClient()` 훅을 사용하도록 변경했습니다.
- 이 클라이언트는 Clerk 토큰 없이 작동하므로 JWT 알고리즘 오류가 발생하지 않습니다.

### 3. "역할 설정에 실패했습니다. 다시 시도해주세요." 에러

**원인**: 회원가입 완료 페이지(`/sign-up/agent/complete`, `/sign-up/client/complete`)에서 역할 설정 API 호출 시 발생하는 타이밍 이슈입니다.

- Clerk 인증 상태(`isLoaded`)가 로드되기 전에 역할 설정 API 호출을 시도함
- `userId`가 준비되지 않은 상태에서 즉시 에러 상태로 설정되어 재시도 없음
- 구글 계정 등 소셜 로그인 직후 Clerk 세션이 완전히 설정되기 전에 페이지가 로드됨
- API 호출은 성공했지만(`{"success":true, "role":"agent"}`), 클라이언트 코드의 응답 처리 로직이 불완전하여 UI에 에러가 표시됨

**해결 방법**:

- `useAuth()`에서 `isLoaded` 체크 추가: Clerk 인증 상태가 로드될 때까지 대기
- `userId` 재시도 로직 추가: 없을 경우 최대 3초 대기 후 재확인
- 성공 응답 처리 개선: `response.ok` 또는 `data.success === true` 체크로 명확한 성공 조건 처리
- 디버깅 로그 추가: 문제 발생 시 원인 파악을 위한 콘솔 로그 추가

## 적용된 변경사항

### 1. `lib/supabase/clerk-client.ts`

- `useStorageClient()` 훅 추가: Storage 작업 전용 클라이언트 (Clerk 토큰 없음)
- `useClerkSupabaseClient()` 개선: 에러 핸들링 추가

### 2. `app/storage-test/page.tsx`

- `useClerkSupabaseClient()` → `useStorageClient()`로 변경
- Storage 작업 시 JWT 알고리즘 오류 방지

### 3. `app/sign-up/agent/complete/page.tsx` 및 `app/sign-up/client/complete/page.tsx`

- `useAuth()`에서 `isLoaded` 추가하여 Clerk 인증 상태 로드 대기
- `useEffect`에 `isLoaded` 체크 추가: 인증 상태가 준비될 때까지 실행 지연
- `userId` 재시도 로직 추가: 없을 경우 최대 3초 대기 후 재확인
- 성공 응답 처리 로직 개선: `response.ok || data.success === true` 조건으로 명확한 성공 처리
- 디버깅 로그 추가: `console.log`를 통한 단계별 상태 추적
- 의존성 배열에 `isLoaded` 추가: 인증 상태 변경 시 재실행

## 다음 단계

### 1. 마이그레이션 적용 (필수)

`MIGRATION_INSTRUCTIONS.md` 파일의 지침에 따라 `users` 테이블을 생성하세요.

### 2. Storage 인증 설정 (선택사항, 권장)

현재 Storage는 인증 없이 작동하지만, 프로덕션 환경에서는 보안을 위해 다음 중 하나를 설정하는 것이 좋습니다:

#### 옵션 A: 서버 사이드 API 사용 (권장)

Storage 작업을 서버 사이드 API Route로 이동:

- `/api/storage/upload` - 파일 업로드
- `/api/storage/list` - 파일 목록
- `/api/storage/download` - 파일 다운로드
- `/api/storage/delete` - 파일 삭제

이렇게 하면 Service Role 클라이언트를 사용하여 안전하게 Storage에 접근할 수 있습니다.

#### 옵션 B: Supabase Third-Party Auth 설정

Clerk를 Supabase Third-Party Auth로 등록:

1. [Supabase Dashboard](https://supabase.com/dashboard) → Authentication → Third-Party Auth
2. Clerk 통합 추가
3. Clerk에서 `role` claim을 세션 토큰에 추가하도록 설정

자세한 내용은 [Supabase Clerk 문서](https://supabase.com/docs/guides/auth/third-party/clerk)를 참고하세요.

## 테스트

1. 마이그레이션 적용 후 애플리케이션 재시작
2. 로그인 시도
3. 콘솔에서 오류가 사라졌는지 확인:
   - ✅ "Failed to sync user" 오류 해결됨
   - ✅ "alg" (Algorithm) Header Parameter 오류 해결됨
   - ✅ "역할 설정에 실패했습니다" 오류 해결됨

## 추가 오류: Storage RLS 정책 위반

### "new row violates row-level security policy" 오류

**원인**: Storage 버킷의 RLS 정책이 `authenticated` 역할만 허용하는데, `useStorageClient()`는 `anon` 역할로 접근합니다.

**해결 방법**:

- `STORAGE_RLS_FIX.md` 파일을 참고하세요.
- 개발 환경에서는 `supabase/migrations/fix_storage_rls.sql` 파일을 실행하여 `anon` 역할도 허용하도록 정책을 추가하세요.
- 프로덕션에서는 서버 사이드 API를 사용하거나 Supabase Third-Party Auth를 설정하는 것을 권장합니다.

### 4. 무한 리다이렉트 루프 (메인 페이지 ↔ 대시보드)

**원인**: 메인 페이지(`/`)와 미들웨어 간의 리다이렉트 루프가 발생했습니다.

**상세 원인 분석**:

1. 메인 페이지에서 `useUser`로 역할 확인 → `role === "agent"` 확인 → `/agent/dashboard`로 리다이렉트
2. 미들웨어에서 `sessionClaims`로 역할 확인 → `sessionClaims`는 JWT 토큰의 캐시된 정보이므로 `publicMetadata`가 업데이트되어도 즉시 반영되지 않을 수 있음
3. 미들웨어가 역할을 읽지 못하거나 `role !== 'agent'`로 판단 → `/`로 리다이렉트
4. 다시 메인 페이지에서 역할 확인 → `/agent/dashboard`로 리다이렉트
5. 무한 반복...

**핵심 문제**:

- `useUser`(클라이언트, 최신 정보)와 `sessionClaims`(서버, 캐시된 정보) 간의 동기화 지연
- 메인 페이지에서 리다이렉트가 매번 실행되어 루프 발생
- 미들웨어가 역할이 없을 때 접근을 차단하여 루프 악화

**해결 방법**:

1. **메인 페이지 (`app/page.tsx`)**:

   - `useRef`를 사용하여 리다이렉트를 한 번만 실행되도록 보장
   - `hasRedirected.current` 플래그로 중복 리다이렉트 방지
   - 역할이 확인되면 한 번만 대시보드로 리다이렉트

2. **미들웨어 (`middleware.ts`)**:

   - 역할이 없을 때 `/agent/dashboard` 접근을 막지 않도록 변경
   - 역할이 명확히 다른 경우만 차단 (예: `role === 'client'`인데 `/agent` 접근)
   - 역할이 없으면 일단 허용하고, 페이지에서 클라이언트 사이드로 체크하도록 변경

3. **대시보드 페이지 (`app/agent/dashboard/page.tsx`)**:
   - 클라이언트 사이드 역할 체크 추가
   - `useUser`로 최신 역할 정보 확인
   - 에이전트가 아니면 홈으로 리다이렉트

**적용된 변경사항**:

### 4. `app/page.tsx`

- `useRef`를 사용하여 리다이렉트를 한 번만 실행되도록 보장
- `hasRedirected.current` 플래그로 중복 리다이렉트 방지
- 역할이 확인되면 한 번만 대시보드로 리다이렉트

### 5. `middleware.ts`

- 역할이 없을 때 `/agent/dashboard` 접근을 막지 않도록 변경
- 역할이 명확히 다른 경우만 차단 (예: `role === 'client'`인데 `/agent` 접근)
- 역할이 없으면 일단 허용하고, 페이지에서 클라이언트 사이드로 체크

### 6. `app/agent/dashboard/page.tsx`

- 클라이언트 사이드 역할 체크 추가
- `useUser`로 최신 역할 정보 확인
- 에이전트가 아니면 홈으로 리다이렉트

## 참고 자료

- [Supabase Clerk 통합 가이드](https://supabase.com/docs/guides/auth/third-party/clerk)
- [Supabase Storage 가이드](https://supabase.com/docs/guides/storage)
- [Supabase Storage RLS 가이드](https://supabase.com/docs/guides/storage/security/access-control)
- [Clerk 세션 토큰 커스터마이징](https://clerk.com/docs/backend-requests/custom-session-token)

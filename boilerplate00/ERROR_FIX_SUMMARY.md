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

## 적용된 변경사항

### 1. `lib/supabase/clerk-client.ts`

- `useStorageClient()` 훅 추가: Storage 작업 전용 클라이언트 (Clerk 토큰 없음)
- `useClerkSupabaseClient()` 개선: 에러 핸들링 추가

### 2. `app/storage-test/page.tsx`

- `useClerkSupabaseClient()` → `useStorageClient()`로 변경
- Storage 작업 시 JWT 알고리즘 오류 방지

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

## 추가 오류: Storage RLS 정책 위반

### "new row violates row-level security policy" 오류

**원인**: Storage 버킷의 RLS 정책이 `authenticated` 역할만 허용하는데, `useStorageClient()`는 `anon` 역할로 접근합니다.

**해결 방법**:

- `STORAGE_RLS_FIX.md` 파일을 참고하세요.
- 개발 환경에서는 `supabase/migrations/fix_storage_rls.sql` 파일을 실행하여 `anon` 역할도 허용하도록 정책을 추가하세요.
- 프로덕션에서는 서버 사이드 API를 사용하거나 Supabase Third-Party Auth를 설정하는 것을 권장합니다.

## 참고 자료

- [Supabase Clerk 통합 가이드](https://supabase.com/docs/guides/auth/third-party/clerk)
- [Supabase Storage 가이드](https://supabase.com/docs/guides/storage)
- [Supabase Storage RLS 가이드](https://supabase.com/docs/guides/storage/security/access-control)
- [Clerk 세션 토큰 커스터마이징](https://clerk.com/docs/backend-requests/custom-session-token)

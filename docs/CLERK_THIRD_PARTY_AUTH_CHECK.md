# Clerk Third-Party Auth 설정 확인 가이드

## 현재 상황

Clerk를 Supabase Third-Party Auth로 등록했다고 하셨습니다. 이제 Clerk 토큰이 `authenticated` 역할로 인식되어야 합니다.

## 확인 사항

### 1. Clerk 세션 토큰에 `role` claim 포함 확인

Clerk 세션 토큰에 `role: 'authenticated'` claim이 포함되어 있어야 Supabase가 `authenticated` 역할로 인식합니다.

**확인 방법:**

1. **Clerk Dashboard** → **JWT Templates** 또는 **Session Tokens** 확인
2. 세션 토큰에 다음 claim이 포함되어 있는지 확인:
   ```json
   {
     "role": "authenticated"
   }
   ```

**설정 방법 (필요한 경우):**

Clerk Dashboard에서 세션 토큰을 커스터마이징하여 `role` claim을 추가:

1. **Clerk Dashboard** → **JWT Templates** 또는 **Session Tokens**
2. 세션 토큰에 다음 claim 추가:
   ```javascript
   {
     "role": "authenticated"
   }
   ```

또는 Clerk의 Connect with Supabase 페이지를 사용했다면 자동으로 설정되어 있을 수 있습니다.

### 2. Supabase Third-Party Auth 설정 확인

**Supabase Dashboard에서 확인:**

1. **Supabase Dashboard** → **Authentication** → **Third-Party Auth**
2. Clerk 통합이 활성화되어 있는지 확인
3. Issuer URL과 JWKS URI가 올바르게 설정되어 있는지 확인

### 3. 코드 변경 사항

이미 다음 변경을 적용했습니다:

- ✅ `storage-test/page.tsx`: `useStorageClient()` → `useClerkSupabaseClient()`로 변경
- ✅ `clerk-client.ts`: 주석 업데이트 (Third-Party Auth 설정 시 Storage도 사용 가능)

## 테스트 방법

1. **애플리케이션 실행**
2. **로그인 후 Storage 테스트 페이지 접속**
3. **파일 업로드 시도**
4. **콘솔에서 오류 확인**

### 예상 결과

- ✅ **성공**: 파일이 정상적으로 업로드됨
- ❌ **실패**: 여전히 RLS 오류가 발생하는 경우 아래를 확인하세요

## 문제 해결

### 여전히 RLS 오류가 발생하는 경우

#### 1. Clerk 세션 토큰에 `role` claim이 없는 경우

**해결 방법:**

- Clerk Dashboard에서 세션 토큰에 `role: 'authenticated'` claim 추가
- 또는 [Clerk의 Connect with Supabase 페이지](https://dashboard.clerk.com/setup/supabase) 사용

#### 2. Supabase Third-Party Auth 설정이 잘못된 경우

**확인 사항:**

- Issuer URL이 올바른지 확인
- JWKS URI가 올바른지 확인
- 통합이 활성화되어 있는지 확인

#### 3. 임시 해결책 (개발 환경용)

개발 환경에서 빠르게 테스트하려면 `anon` 역할도 허용하는 정책을 추가할 수 있습니다:

```sql
-- 개발 환경용: anon 역할도 허용
CREATE POLICY IF NOT EXISTS "Allow anon uploads for development"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'uploads');
```

**주의**: 프로덕션에서는 이 정책을 제거하세요.

## 참고 자료

- [Supabase Clerk 통합 가이드](https://supabase.com/docs/guides/auth/third-party/clerk)
- [Clerk 세션 토큰 커스터마이징](https://clerk.com/docs/backend-requests/custom-session-token)
- [Clerk Connect with Supabase](https://dashboard.clerk.com/setup/supabase)

## 다음 단계

1. ✅ 코드 변경 완료 (`useClerkSupabaseClient()` 사용)
2. ✅ Clerk 세션 토큰에 `role` claim 확인 완료
3. ⏳ RLS 정책 수정 (`fix_storage_rls_clerk.sql` 실행)
4. ⏳ 애플리케이션 테스트
5. ⏳ 여전히 오류 발생 시 `STORAGE_RLS_DEBUG.md` 참고

## 추가 문제 해결

여전히 RLS 오류가 발생하는 경우:

1. **`STORAGE_RLS_DEBUG.md`** 파일 참고 - 상세한 디버깅 가이드
2. **`fix_storage_rls_clerk.sql`** 파일 실행 - RLS 정책 업데이트
3. JWT의 `sub` claim과 파일 경로의 폴더명이 일치하는지 확인

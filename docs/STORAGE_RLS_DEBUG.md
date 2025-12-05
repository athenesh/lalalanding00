# Storage RLS 오류 디버깅 가이드

## 문제 상황

Clerk Third-Party Auth가 설정되어 있고, `role` claim도 있지만 여전히 RLS 오류가 발생합니다.

## 원인 분석

RLS 정책이 다음을 확인합니다:

```sql
(storage.foldername(name))[1] = (auth.jwt()->>'sub')
```

이것은:

1. 파일 경로의 첫 번째 폴더명 (예: `user_123abc/file.jpg` → `user_123abc`)
2. JWT의 `sub` claim 값

이 두 값이 일치해야 합니다.

## 디버깅 단계

### 1. JWT의 실제 내용 확인

Supabase Dashboard의 SQL Editor에서 다음을 실행하여 현재 JWT의 내용을 확인하세요:

```sql
-- JWT의 모든 claim 확인
SELECT auth.jwt();

-- 또는 특정 claim만 확인
SELECT
  auth.jwt()->>'sub' as sub,
  auth.jwt()->>'role' as role,
  auth.jwt()->>'email' as email;
```

**주의**: 이 쿼리는 인증된 요청 컨텍스트에서 실행해야 합니다. 브라우저에서 Storage 작업을 시도한 후 즉시 실행하세요.

### 2. 파일 경로 확인

코드에서 생성하는 파일 경로를 확인하세요:

```typescript
// app/storage-test/page.tsx
const filePath = `${user.id}/${fileName}`;
```

여기서 `user.id`는 Clerk의 user ID입니다. 이것이 JWT의 `sub` claim과 일치해야 합니다.

### 3. Clerk User ID 형식 확인

Clerk의 user ID는 보통 다음과 같은 형식입니다:

- `user_2abc123def456...` (접두사 `user_` 포함)

JWT의 `sub` claim도 동일한 형식이어야 합니다.

## 해결 방법

### 방법 1: RLS 정책 수정 (권장)

`fix_storage_rls_clerk.sql` 파일을 실행하여 정책을 업데이트하세요:

1. **Supabase Dashboard** → **SQL Editor**
2. `supabase/migrations/fix_storage_rls_clerk.sql` 파일의 내용 실행

이 정책은 `auth.jwt()->>'sub'`를 직접 사용하므로 더 명확합니다.

### 방법 2: 디버깅 함수 사용

JWT의 실제 내용을 확인하려면:

```sql
-- 디버깅 함수 실행 (인증된 컨텍스트에서)
SELECT * FROM debug_jwt_claims();
```

이 함수는 현재 JWT의 `sub`, `role`, 그리고 모든 claim을 반환합니다.

### 방법 3: 임시로 더 관대한 정책 사용 (개발 환경용)

개발 환경에서 빠르게 테스트하려면:

```sql
-- 임시 정책: authenticated 역할이면 모든 파일 접근 허용
CREATE POLICY "Allow all authenticated users (dev)"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'uploads')
WITH CHECK (bucket_id = 'uploads');
```

**주의**: 프로덕션에서는 이 정책을 제거하고 방법 1을 사용하세요.

## 확인 체크리스트

- [ ] Clerk 세션 토큰에 `role: 'authenticated'` claim이 있음
- [ ] Supabase Third-Party Auth 설정이 활성화되어 있음
- [ ] 파일 경로가 `${user.id}/filename` 형식으로 생성됨
- [ ] JWT의 `sub` claim이 Clerk user ID와 일치함
- [ ] RLS 정책이 올바르게 적용됨

## 추가 확인 사항

### Clerk 토큰이 제대로 전달되는지 확인

브라우저 개발자 도구의 Network 탭에서:

1. Storage 업로드 요청 확인
2. `Authorization` 헤더에 JWT 토큰이 포함되어 있는지 확인
3. 토큰을 [jwt.io](https://jwt.io)에서 디코딩하여 `sub` claim 확인

### Supabase 로그 확인

Supabase Dashboard → Logs → API에서:

1. Storage 요청 로그 확인
2. RLS 정책 위반 오류 메시지 확인
3. JWT 파싱 오류가 있는지 확인

## 다음 단계

1. `fix_storage_rls_clerk.sql` 파일 실행
2. 애플리케이션 재시작
3. 파일 업로드 시도
4. 여전히 오류가 발생하면 디버깅 함수로 JWT 내용 확인
5. JWT의 `sub`와 파일 경로의 폴더명이 일치하는지 확인

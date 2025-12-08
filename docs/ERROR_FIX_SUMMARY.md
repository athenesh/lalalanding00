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

### 7. 체크리스트 관련 오류들

#### 7.1. "Could not find the 'category' column of 'checklist_items' in the schema cache"

**원인**: 마이그레이션(`20251203220740_refactor_checklist_items_to_template_based.sql`)에서 `checklist_items` 테이블의 템플릿 속성 컬럼들(`category`, `title`, `description`, `order_num`, `is_required`)을 제거했는데, API 라우트(`app/api/client/checklist/route.ts`)의 INSERT 문에서 여전히 사용하려고 했습니다.

**해결 방법**:

- `app/api/client/checklist/route.ts`의 PATCH 핸들러에서 INSERT 문 수정
- 제거된 컬럼들(`category`, `title`, `description`, `order_num`, `is_required`)을 INSERT 문에서 삭제
- 상태 정보만 저장하도록 변경: `client_id`, `template_id`, `is_completed`, `notes`, `completed_at`만 사용

**적용된 변경사항**:

- `app/api/client/checklist/route.ts` (PATCH 핸들러, 약 280-290줄):
  - INSERT 문에서 제거된 컬럼들 삭제
  - 템플릿 속성은 `template_id`로 참조하므로 상태 정보만 저장

#### 7.2. React Key Prop 경고: "Each child in a list should have a unique 'key' prop"

**원인**: `ChecklistTab` 컴포넌트에서 리스트를 렌더링할 때 `item.id`를 key로 사용했는데, `item.id`가 `undefined`일 수 있습니다. 새로 생성되지 않은 체크리스트 항목은 `id`가 없고 `templateId`만 있습니다.

**해결 방법**:

- 모든 리스트 렌더링에서 `key={item.id || item.templateId}` 사용
- `item.id`가 없을 때 `templateId`를 fallback으로 사용

**적용된 변경사항**:

- `components/client/checklist-tab.tsx`:
  - 리스트 렌더링 시 `key={item.id || item.templateId}` 사용
  - `expandedItems` Set에서도 `item.id || item.templateId` 사용

#### 7.3. 체크리스트 하나만 체크하면 전부 체크되는 문제

**원인**: `item.id`가 `undefined`일 때, 여러 항목이 모두 같은 `undefined` id로 인식되어 하나를 체크하면 모든 항목이 같은 `undefined` id로 매칭되어 전부 체크되었습니다.

**해결 방법**:

- 모든 항목 식별자 비교에서 `item.id || item.templateId` 사용
- `toggleCheck`, `updateChecklistItem`, `onToggle`, `onUpdateItem`, `onExpand` 등 모든 함수에서 고유 식별자 사용

**적용된 변경사항**:

- `components/client/checklist-tab.tsx`:
  - `ChecklistRow` 컴포넌트: `onToggle(item.id || item.templateId!)`, `onUpdateItem(item.id || item.templateId!, ...)`, `onExpand(item.id || item.templateId!)` 사용
  - `toggleCheck` 함수: `checklist.find((i) => (i.id || i.templateId) === id)` 사용
  - `updateChecklistItem` 함수: `(item.id || item.templateId) === id` 비교 사용
  - `useEffect` (첫 번째 미완료 항목 확장): `firstUncompleted.id || firstUncompleted.templateId!` 사용

#### 7.4. 데이터 저장할 때마다 페이지가 재렌더링되는 문제

**원인**: `handleSaveChecklist` 함수에서 저장 후 `loadChecklistData()`를 호출하여 전체 데이터를 다시 불러오면서 페이지가 재렌더링되었습니다.

**해결 방법**:

- 저장 후 `loadChecklistData()` 호출 제거
- 서버 응답(`updated`)으로 받은 데이터만 사용하여 로컬 상태 부분 업데이트
- 완료율만 재계산하여 불필요한 재렌더링 최소화

**적용된 변경사항**:

- `app/client/home/page.tsx` (`handleSaveChecklist` 함수, 약 346-384줄):
  - `await loadChecklistData()` 호출 제거
  - 서버 응답의 `updated` 배열을 사용하여 `setChecklistData`로 부분 업데이트
  - `template_id`를 키로 하여 변경된 항목만 업데이트
  - 새로 생성된 항목의 경우 `id`도 업데이트
  - 완료율 재계산을 같은 `setChecklistData` 콜백 내에서 처리

**성능 최적화 추가**:

- `components/client/checklist-tab.tsx`:
  - 메모 입력에 debounce 적용 (500ms)
  - 타이핑 중에는 로컬 상태만 업데이트하고, 입력이 멈춘 후에만 서버에 저장
  - `updateChecklistItem` 함수에 `shouldSave` 파라미터 추가하여 저장 여부 제어

### 8. 권한 부여된 사용자의 파일 업로드 실패 ("new row violates row-level security policy")

**원인**: 권한 부여된 사용자(배우자 등)가 클라이언트의 체크리스트에 파일을 업로드할 때 Storage RLS 정책 위반으로 실패했습니다.

**상세 분석**:

1. **파일 업로드 과정**: Storage에 파일 저장 → `client_documents` 테이블에 메타데이터 저장
2. **실패 지점**: Storage 업로드 시 RLS 정책 위반으로 실패
3. **근본 원인**: `storage.objects` 테이블의 RLS 정책이 잘못되어 있었음

**정책 오류 상세**:

- **잘못된 코드**: `WHERE clients.clerk_user_id = (storage.foldername(clients.name))[1]`
- **올바른 코드**: `WHERE clients.clerk_user_id = (storage.foldername(name))[1]`

잘못된 정책에서는 `clients.name` (클라이언트 이름)을 사용하여 폴더명을 추출했지만, 실제로는 업로드할 파일의 경로(`name` 파라미터)에서 폴더명을 추출해야 합니다.

**PostgreSQL 이름 해석 문제**:

PostgreSQL이 `EXISTS` 서브쿼리 내에서 `name`을 참조할 때, 가장 가까운 테이블인 `clients`의 컬럼으로 해석하여 `clients.name`으로 변환하는 문제가 발생했습니다.

**트러블슈팅 과정**:

1. **초기 시도**: `storage.foldername(name)[1]` 사용 → 여전히 `clients.name`으로 해석됨
2. **명시적 참조 시도**: `storage.objects.name` 명시 → 복잡하고 효과 없음
3. **LATERAL JOIN 시도**: `CROSS JOIN LATERAL` 사용 → 복잡함
4. **최종 해결**: 서브쿼리 구조를 `IN` 절로 변경하여 `name`이 `storage.objects`에서 오는 것을 명확히 함

**로그 분석 결과**:

```
권한 부여된 사용자: user_36YD5AQcuFhT9bWvsQ4yRzFtEFg
클라이언트 폴더: user_36EfvxKHSAEpOowD9PUM0COM1Vs (클라이언트의 clerk_user_id)
Storage 경로: user_36EfvxKHSAEpOowD9PUM0COM1Vs/checklist/...
```

**최종 해결 방법**:

Supabase SQL 에디터에서 `FINAL_CORRECT_FIX.sql` 파일을 실행하여 Storage RLS 정책을 수정:

```sql
-- 모든 기존 정책 삭제
DROP POLICY IF EXISTS "Users can upload to own folder or authorized client folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files or authorized client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files or authorized client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files or authorized client files" ON storage.objects;

-- 올바른 정책 생성 (IN 절 사용으로 name이 storage.objects에서 오는 것을 명확히 함)
CREATE POLICY "Users can upload to own folder or authorized client folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND (
    -- 본인 폴더에 업로드
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
    -- 권한 부여된 클라이언트의 폴더에 업로드
    -- ⚠️ 핵심: IN 절을 사용하여 name이 storage.objects에서 오는 것을 명확히 함
    (storage.foldername(name))[1] IN (
      SELECT clients.clerk_user_id
      FROM public.clients
      WHERE EXISTS (
        SELECT 1 FROM public.client_authorizations
        WHERE client_authorizations.client_id = clients.id
        AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  )
);

-- SELECT, DELETE, UPDATE 정책들도 동일한 구조로 생성
```

**핵심 해결 포인트**:

1. **Supabase 공식 문서 확인**: [Storage Helper Functions](https://supabase.com/docs/guides/storage/schema/helper-functions)에서 `storage.foldername(name)`의 `name`은 `storage.objects` 테이블의 `name` 컬럼(파일 경로)을 의미함을 확인
2. **서브쿼리 구조 변경**: `EXISTS` 서브쿼리에서 `WHERE clients.clerk_user_id = (storage.foldername(name))[1]` 대신 `IN` 절을 사용하여 `(storage.foldername(name))[1] IN (SELECT clients.clerk_user_id ...)` 구조로 변경
3. **이름 해석 명확화**: `IN` 절을 사용하면 PostgreSQL이 `name`을 `storage.objects.name`으로 올바르게 해석함

**해결 결과**:

- ✅ 권한 부여된 사용자가 클라이언트의 파일을 정상적으로 업로드할 수 있게 됨
- ✅ Storage RLS 정책이 올바르게 작동하여 보안과 기능이 모두 유지됨
- ✅ 모든 정책이 "✅ 올바름: name 사용"으로 확인됨
- ✅ `policy_preview`에서 `storage.foldername(name)`이 올바르게 사용되는 것을 확인

**참고 파일**:

- `FINAL_CORRECT_FIX.sql`: 최종 해결 SQL 파일
- `CORRECT_STORAGE_POLICY.sql`: Supabase 공식 문서 기준 정책

## 참고 자료

- [Supabase Clerk 통합 가이드](https://supabase.com/docs/guides/auth/third-party/clerk)
- [Supabase Storage 가이드](https://supabase.com/docs/guides/storage)
- [Supabase Storage RLS 가이드](https://supabase.com/docs/guides/storage/security/access-control)
- [Clerk 세션 토큰 커스터마이징](https://clerk.com/docs/backend-requests/custom-session-token)

# Supabase Dashboard에서 Storage RLS 정책 수정 가이드

## 방법 1: Supabase Dashboard에서 직접 수정 (권장)

### 단계별 가이드

#### 1단계: Supabase Dashboard 접속
1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인
2. 프로젝트 선택

#### 2단계: Storage 정책 페이지로 이동
1. 왼쪽 메뉴에서 **"Storage"** 클릭
2. **"Policies"** 탭 클릭
3. 또는 **"Authentication"** → **"Policies"** → **"storage.objects"** 선택

#### 3단계: 기존 정책 삭제
각 정책마다:
1. 정책 이름 옆의 **"..."** (더보기) 메뉴 클릭
2. **"Delete policy"** 선택
3. 확인

삭제할 정책 목록:
- ✅ "Users can upload to own folder or authorized client folder" (INSERT)
- ✅ "Users can view own files or authorized client files" (SELECT)
- ✅ "Users can delete own files or authorized client files" (DELETE)
- ✅ "Users can update own files or authorized client files" (UPDATE)

#### 4단계: 새 정책 생성
각 정책을 하나씩 생성:

**INSERT 정책 생성:**
1. **"New Policy"** 또는 **"Create Policy"** 클릭
2. 정책 이름: `Users can upload to own folder or authorized client folder`
3. Operation: **INSERT** 선택
4. Target roles: **authenticated** 선택
5. Policy definition (WITH CHECK):
   ```sql
   bucket_id = 'uploads' AND (
     (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
     OR
     EXISTS (
       SELECT 1 FROM public.clients
       WHERE clients.clerk_user_id = (storage.foldername(name))[1]
       AND EXISTS (
         SELECT 1 FROM public.client_authorizations
         WHERE client_authorizations.client_id = clients.id
         AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
       )
     )
   )
   ```
6. **"Save"** 또는 **"Create"** 클릭

**SELECT 정책 생성:**
1. **"New Policy"** 클릭
2. 정책 이름: `Users can view own files or authorized client files`
3. Operation: **SELECT** 선택
4. Target roles: **authenticated** 선택
5. Policy definition (USING):
   ```sql
   bucket_id = 'uploads' AND (
     (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
     OR
     EXISTS (
       SELECT 1 FROM public.clients
       WHERE clients.clerk_user_id = (storage.foldername(name))[1]
       AND EXISTS (
         SELECT 1 FROM public.client_authorizations
         WHERE client_authorizations.client_id = clients.id
         AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
       )
     )
   )
   ```
6. **"Save"** 클릭

**DELETE 정책 생성:**
1. **"New Policy"** 클릭
2. 정책 이름: `Users can delete own files or authorized client files`
3. Operation: **DELETE** 선택
4. Target roles: **authenticated** 선택
5. Policy definition (USING):
   ```sql
   bucket_id = 'uploads' AND (
     (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
     OR
     EXISTS (
       SELECT 1 FROM public.clients
       WHERE clients.clerk_user_id = (storage.foldername(name))[1]
       AND EXISTS (
         SELECT 1 FROM public.client_authorizations
         WHERE client_authorizations.client_id = clients.id
         AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
       )
     )
   )
   ```
6. **"Save"** 클릭

**UPDATE 정책 생성:**
1. **"New Policy"** 클릭
2. 정책 이름: `Users can update own files or authorized client files`
3. Operation: **UPDATE** 선택
4. Target roles: **authenticated** 선택
5. Policy definition:
   - **USING**:
     ```sql
     bucket_id = 'uploads' AND (
       (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
       OR
       EXISTS (
         SELECT 1 FROM public.clients
         WHERE clients.clerk_user_id = (storage.foldername(name))[1]
         AND EXISTS (
           SELECT 1 FROM public.client_authorizations
           WHERE client_authorizations.client_id = clients.id
           AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
         )
       )
     )
     ```
   - **WITH CHECK**:
     ```sql
     bucket_id = 'uploads' AND (
       (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
       OR
       EXISTS (
         SELECT 1 FROM public.clients
         WHERE clients.clerk_user_id = (storage.foldername(name))[1]
         AND EXISTS (
           SELECT 1 FROM public.client_authorizations
           WHERE client_authorizations.client_id = clients.id
           AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
         )
       )
     )
     ```
6. **"Save"** 클릭

#### 5단계: 정책 확인
모든 정책 생성 후, 정책 목록에서 각 정책을 클릭하여 내용을 확인하세요.

**중요 확인 사항:**
- ✅ `storage.foldername(name)[1]` 사용 (올바름)
- ❌ `storage.foldername(clients.name)[1]` 사용하지 않음 (잘못됨)

---

## 방법 2: SQL Editor에서 직접 실행 (더 빠름)

### Supabase SQL Editor 사용

1. Supabase Dashboard → **"SQL Editor"** 클릭
2. **"New query"** 클릭
3. 아래 SQL을 복사하여 붙여넣기
4. **"Run"** 클릭

```sql
-- ============================================
-- Storage RLS 정책 수정 (한 번에 실행)
-- ============================================

-- 1. 기존 정책 삭제
DROP POLICY IF EXISTS "Users can upload to own folder or authorized client folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files or authorized client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files or authorized client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files or authorized client files" ON storage.objects;

-- 2. INSERT 정책 생성
CREATE POLICY "Users can upload to own folder or authorized client folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND (
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.clerk_user_id = (storage.foldername(name))[1]
      AND EXISTS (
        SELECT 1 FROM public.client_authorizations
        WHERE client_authorizations.client_id = clients.id
        AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  )
);

-- 3. SELECT 정책 생성
CREATE POLICY "Users can view own files or authorized client files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads' AND (
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.clerk_user_id = (storage.foldername(name))[1]
      AND EXISTS (
        SELECT 1 FROM public.client_authorizations
        WHERE client_authorizations.client_id = clients.id
        AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  )
);

-- 4. DELETE 정책 생성
CREATE POLICY "Users can delete own files or authorized client files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'uploads' AND (
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.clerk_user_id = (storage.foldername(name))[1]
      AND EXISTS (
        SELECT 1 FROM public.client_authorizations
        WHERE client_authorizations.client_id = clients.id
        AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  )
);

-- 5. UPDATE 정책 생성
CREATE POLICY "Users can update own files or authorized client files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'uploads' AND (
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.clerk_user_id = (storage.foldername(name))[1]
      AND EXISTS (
        SELECT 1 FROM public.client_authorizations
        WHERE client_authorizations.client_id = clients.id
        AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  )
)
WITH CHECK (
  bucket_id = 'uploads' AND (
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.clerk_user_id = (storage.foldername(name))[1]
      AND EXISTS (
        SELECT 1 FROM public.client_authorizations
        WHERE client_authorizations.client_id = clients.id
        AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  )
);

-- 6. 확인 쿼리
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN with_check LIKE '%storage.foldername(clients.name)%' THEN '❌ 잘못됨'
    WHEN with_check LIKE '%storage.foldername(name)%' THEN '✅ 올바름'
    WHEN qual LIKE '%storage.foldername(clients.name)%' THEN '❌ 잘못됨'
    WHEN qual LIKE '%storage.foldername(name)%' THEN '✅ 올바름'
    ELSE '⚠️ 확인 필요'
  END as status
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY cmd, policyname;
```

### 실행 후 확인
확인 쿼리 결과에서 모든 정책이 **"✅ 올바름"**으로 표시되어야 합니다.

---

## 핵심 차이점

### ❌ 잘못된 코드 (현재)
```sql
clients.clerk_user_id = (storage.foldername(clients.name))[1]
```
- `clients.name` (예: "영설화")에서 폴더명 추출 시도
- 실제 파일 경로와 매칭 실패

### ✅ 올바른 코드 (수정 후)
```sql
clients.clerk_user_id = (storage.foldername(name))[1]
```
- 파일 경로(`name` 파라미터)에서 폴더명 추출
- 실제 파일 경로와 정확히 매칭

---

## 문제 해결

### 정책이 여전히 "잘못됨"으로 표시되는 경우
1. 정책 삭제가 제대로 되었는지 확인
2. 새 정책 생성 시 SQL 문법 오류가 없는지 확인
3. Supabase Dashboard를 새로고침
4. 확인 쿼리를 다시 실행

### SQL 실행 시 에러가 발생하는 경우
- 에러 메시지를 확인하고 알려주세요
- 정책 이름이 이미 존재하는 경우: 먼저 삭제 후 생성
- 권한 문제: 관리자 계정으로 로그인했는지 확인


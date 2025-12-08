# Supabase Dashboard에서 Storage RLS 정책 수동 수정 가이드

## 현재 문제
정책이 여전히 `storage.foldername(clients.name)`을 사용하고 있습니다.
SQL 실행이 실패했거나 정책이 제대로 업데이트되지 않았을 수 있습니다.

## 해결 방법: Dashboard에서 직접 수정

### 방법 1: SQL Editor에서 정확한 SQL 실행

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 왼쪽 메뉴 → "SQL Editor" 클릭
   - "New query" 클릭

3. **아래 SQL을 복사하여 실행**

```sql
-- ============================================
-- Storage RLS 정책 완전 교체
-- ============================================

-- 1. 모든 정책 삭제
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

-- 6. 확인
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

4. **"Run" 버튼 클릭** (또는 Ctrl+Enter)

5. **에러 확인**
   - 에러가 발생하면 에러 메시지를 복사하여 알려주세요
   - 에러 없이 성공했다면 마지막 확인 쿼리 결과를 확인하세요

---

## 방법 2: Dashboard UI에서 직접 수정

### 단계별 가이드

1. **Storage Policies 페이지로 이동**
   - 왼쪽 메뉴 → "Storage" 클릭
   - "Policies" 탭 클릭
   - 또는 "Authentication" → "Policies" → "storage.objects" 선택

2. **기존 정책 삭제**
   - 각 정책의 "..." 메뉴 → "Delete policy" 선택
   - 삭제할 정책:
     - "Users can upload to own folder or authorized client folder"
     - "Users can view own files or authorized client files"
     - "Users can delete own files or authorized client files"
     - "Users can update own files or authorized client files"

3. **새 정책 생성**
   - "New Policy" 또는 "Create Policy" 클릭
   - 정책 이름, Operation, Target roles 설정
   - **Policy definition에 아래 SQL 조건 입력** (중요!)

**INSERT 정책:**
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

**SELECT/DELETE 정책:**
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

**UPDATE 정책:**
- USING과 WITH CHECK 모두에 위의 SQL 조건 입력

---

## 중요 확인 사항

### SQL 실행 시 확인할 것
1. **에러 메시지**: 에러가 발생했는지 확인
2. **성공 메시지**: "Success" 또는 "Policy created" 메시지 확인
3. **정책 개수**: 삭제 후 정책이 0개인지 확인
4. **생성 후 확인**: 생성 후 정책이 올바르게 생성되었는지 확인

### 정책이 여전히 잘못된 경우
1. SQL 실행 시 에러 메시지가 있었는지 확인
2. 정책 삭제가 실제로 성공했는지 확인
3. 새 정책 생성이 실제로 성공했는지 확인
4. Supabase Dashboard를 새로고침

---

## 핵심 차이점

### ❌ 잘못된 코드 (현재)
```sql
clients.clerk_user_id = (storage.foldername(clients.name))[1]
```

### ✅ 올바른 코드 (수정 후)
```sql
clients.clerk_user_id = (storage.foldername(name))[1]
```

**차이점**: `clients.name` → `name` (파일 경로 파라미터 사용)


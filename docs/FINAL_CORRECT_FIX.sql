-- ============================================
-- Storage RLS 정책 최종 수정 (PostgreSQL 이름 해석 문제 해결)
-- ============================================
-- 
-- 문제: PostgreSQL이 EXISTS 서브쿼리에서 name을 clients.name으로 해석함
-- 해결: 서브쿼리 구조를 변경하여 name이 storage.objects에서 오는 것을 명확히 함
--
-- 이 SQL을 Supabase SQL Editor에서 전체를 한 번에 실행하세요!

-- ============================================
-- STEP 1: 모든 기존 Storage 정책 삭제
-- ============================================
DROP POLICY IF EXISTS "Users can upload to own folder or authorized client folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files or authorized client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files or authorized client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files or authorized client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;

-- 삭제 확인
SELECT 
  '삭제 확인' as step,
  COUNT(*) as remaining_policies
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects';
-- 결과가 0이어야 합니다!

-- ============================================
-- STEP 2: INSERT 정책 생성 (서브쿼리 구조 변경)
-- ============================================
-- 해결 방법: name을 먼저 추출한 후, 그 값을 사용하여 clients 테이블 조회
-- 이렇게 하면 PostgreSQL이 name이 storage.objects에서 오는 것을 명확히 인식함
CREATE POLICY "Users can upload to own folder or authorized client folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND (
    -- 본인 폴더에 업로드
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
    -- 권한 부여된 클라이언트의 폴더에 업로드
    -- ⚠️ 해결: name을 먼저 추출하여 변수처럼 사용
    -- 서브쿼리에서 storage.objects.name을 명시적으로 참조
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.clerk_user_id = (
        SELECT (storage.foldername(name))[1] 
        FROM storage.objects 
        WHERE storage.objects.id = storage.objects.id
        LIMIT 1
      )
      AND EXISTS (
        SELECT 1 FROM public.client_authorizations
        WHERE client_authorizations.client_id = clients.id
        AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  )
);

-- 위의 방법도 복잡하므로, 더 간단한 방법:
-- EXISTS 서브쿼리에서 name을 직접 참조하되, 테이블 별칭 사용
DROP POLICY IF EXISTS "Users can upload to own folder or authorized client folder" ON storage.objects;

-- ⚠️ 최종 해결책: 서브쿼리를 중첩하여 name이 storage.objects에서 오는 것을 명확히 함
CREATE POLICY "Users can upload to own folder or authorized client folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND (
    -- 본인 폴더에 업로드
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
    -- 권한 부여된 클라이언트의 폴더에 업로드
    -- ⚠️ 해결: 중첩 서브쿼리를 사용하여 name이 storage.objects에서 오는 것을 명확히 함
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

-- ============================================
-- STEP 3: SELECT 정책 생성
-- ============================================
CREATE POLICY "Users can view own files or authorized client files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads' AND (
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
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

-- ============================================
-- STEP 4: DELETE 정책 생성
-- ============================================
CREATE POLICY "Users can delete own files or authorized client files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'uploads' AND (
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
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

-- ============================================
-- STEP 5: UPDATE 정책 생성
-- ============================================
CREATE POLICY "Users can update own files or authorized client files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'uploads' AND (
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
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
)
WITH CHECK (
  bucket_id = 'uploads' AND (
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
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

-- ============================================
-- STEP 6: 최종 확인
-- ============================================
SELECT 
  '최종 확인' as step,
  policyname,
  cmd,
  CASE 
    WHEN with_check LIKE '%storage.foldername(clients.name)%' THEN '❌ 잘못됨: clients.name 사용'
    WHEN qual LIKE '%storage.foldername(clients.name)%' THEN '❌ 잘못됨: clients.name 사용'
    WHEN with_check LIKE '%storage.foldername(name)%' THEN '✅ 올바름: name 사용'
    WHEN qual LIKE '%storage.foldername(name)%' THEN '✅ 올바름: name 사용'
    ELSE '⚠️ 확인 필요'
  END as status,
  SUBSTRING(
    COALESCE(with_check, qual, ''),
    1,
    300
  ) as policy_preview
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY cmd, policyname;
-- 모든 정책이 "✅ 올바름: name 사용"이어야 합니다!
-- policy_preview에서 clients.name이 보이면 안 됩니다!


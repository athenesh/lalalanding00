-- ============================================
-- Storage RLS 정책 정확한 수정
-- ============================================
-- 
-- ⚠️ 문제: 정책이 여전히 storage.foldername(clients.name) 사용 중
-- ✅ 해결: storage.foldername(name) 사용 (파일 경로의 name 파라미터 사용)
--
-- 중요: 이 SQL을 Supabase SQL 에디터에서 전체를 한 번에 실행하세요!

-- ============================================
-- 1. 모든 기존 정책 삭제
-- ============================================
DROP POLICY IF EXISTS "Users can upload to own folder or authorized client folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files or authorized client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files or authorized client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files or authorized client files" ON storage.objects;

-- ============================================
-- 2. ✅ 올바른 INSERT 정책 생성
-- ============================================
-- ⚠️ 중요: storage.foldername(name)[1] 사용 (clients.name이 아님!)
CREATE POLICY "Users can upload to own folder or authorized client folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND (
    -- 본인 폴더에 업로드
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
    -- 권한 부여된 클라이언트의 폴더에 업로드
    -- ✅ 수정: storage.foldername(name)[1] 사용 (clients.name이 아님!)
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

-- ============================================
-- 3. ✅ 올바른 SELECT 정책 생성
-- ============================================
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

-- ============================================
-- 4. ✅ 올바른 DELETE 정책 생성
-- ============================================
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

-- ============================================
-- 5. ✅ 올바른 UPDATE 정책 생성
-- ============================================
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

-- ============================================
-- 6. 최종 확인
-- ============================================
-- 이 쿼리를 실행하여 모든 정책이 올바르게 생성되었는지 확인하세요
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN with_check LIKE '%storage.foldername(clients.name)%' THEN '❌ 잘못됨: clients.name 사용'
    WHEN with_check LIKE '%storage.foldername(name)%' THEN '✅ 올바름: name 사용'
    WHEN qual LIKE '%storage.foldername(clients.name)%' THEN '❌ 잘못됨: clients.name 사용'
    WHEN qual LIKE '%storage.foldername(name)%' THEN '✅ 올바름: name 사용'
    ELSE '⚠️ 확인 필요'
  END as status,
  -- 실제 조건에서 clients.name이 사용되는지 확인
  CASE 
    WHEN with_check LIKE '%storage.foldername(clients.name)%' THEN 'clients.name 발견됨'
    WHEN qual LIKE '%storage.foldername(clients.name)%' THEN 'clients.name 발견됨'
    ELSE 'clients.name 없음'
  END as detail
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY cmd, policyname;


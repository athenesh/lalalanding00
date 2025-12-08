-- ============================================
-- Storage RLS 정책 정확한 수정 (최종 버전)
-- ============================================
-- 
-- ⚠️ 문제: 정책에 두 가지 조건이 혼재되어 있음
--   1. (storage.foldername(name))[1] ✅ 올바름
--   2. clients.clerk_user_id = (storage.foldername(clients.name))[1] ❌ 잘못됨
--
-- ✅ 해결: 정책을 완전히 삭제하고 올바른 정책으로 교체
--
-- 중요: 이 SQL을 Supabase SQL Editor에서 전체를 한 번에 실행하세요!

-- ============================================
-- STEP 1: 모든 Storage 정책 삭제
-- ============================================
DROP POLICY IF EXISTS "Users can upload to own folder or authorized client folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files or authorized client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files or authorized client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files or authorized client files" ON storage.objects;

-- 삭제 확인
SELECT COUNT(*) as remaining_policies
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects';
-- 결과가 0이어야 합니다!

-- ============================================
-- STEP 2: 올바른 INSERT 정책 생성
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
-- STEP 3: 올바른 SELECT 정책 생성
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
-- STEP 4: 올바른 DELETE 정책 생성
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
-- STEP 5: 올바른 UPDATE 정책 생성
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
-- STEP 6: 최종 확인 (반드시 실행!)
-- ============================================
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN with_check LIKE '%storage.foldername(clients.name)%' THEN '❌ 잘못됨: clients.name 사용'
    WHEN with_check LIKE '%storage.foldername(name)%' THEN '✅ 올바름: name 사용'
    WHEN qual LIKE '%storage.foldername(clients.name)%' THEN '❌ 잘못됨: clients.name 사용'
    WHEN qual LIKE '%storage.foldername(name)%' THEN '✅ 올바름: name 사용'
    ELSE '⚠️ 확인 필요'
  END as status
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY cmd, policyname;
-- 모든 정책이 "✅ 올바름: name 사용"이어야 합니다!


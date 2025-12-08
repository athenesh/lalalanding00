-- ============================================
-- Storage RLS 정책 수정 (Supabase 공식 문서 기준)
-- ============================================
-- 
-- 참고: https://supabase.com/docs/guides/storage/schema/helper-functions
-- 참고: https://supabase.com/docs/guides/storage/security/access-control
--
-- ⚠️ 중요: storage.foldername(name)의 name은 storage.objects 테이블의 name 컬럼(파일 경로)을 의미합니다
-- ❌ 잘못됨: storage.foldername(clients.name) - clients 테이블의 name 컬럼 사용
-- ✅ 올바름: storage.foldername(name) - storage.objects 테이블의 name 컬럼 사용
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
DROP POLICY IF EXISTS "Allow anon uploads for development" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon view for development" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon delete for development" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon update for development" ON storage.objects;

-- 삭제 확인
SELECT 
  '삭제 확인' as step,
  COUNT(*) as remaining_policies
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects';
-- 결과가 0이어야 합니다!

-- ============================================
-- STEP 2: INSERT 정책 생성 (공식 문서 기준)
-- ============================================
-- 참고: https://supabase.com/docs/guides/storage/security/access-control#policy-examples
-- storage.foldername(name)[1]은 파일 경로의 첫 번째 폴더명을 반환합니다
-- 예: 파일 경로가 "user123/checklist/item1/file.pdf"이면 "user123"을 반환
CREATE POLICY "Users can upload to own folder or authorized client folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND (
    -- 본인 폴더에 업로드
    -- 파일 경로의 첫 번째 폴더명이 현재 사용자의 Clerk user ID와 일치
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
    -- 권한 부여된 클라이언트의 폴더에 업로드
    -- 파일 경로의 첫 번째 폴더명이 클라이언트의 clerk_user_id와 일치하고,
    -- 현재 사용자가 해당 클라이언트에 대한 권한을 가지고 있는지 확인
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
-- STEP 3: SELECT 정책 생성
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
-- STEP 4: DELETE 정책 생성
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
-- STEP 5: UPDATE 정책 생성
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
-- STEP 6: 최종 확인
-- ============================================
-- 정책이 올바르게 생성되었는지 확인
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
  -- 정책 내용의 일부를 표시하여 확인
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

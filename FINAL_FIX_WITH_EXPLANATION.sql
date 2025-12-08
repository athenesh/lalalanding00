-- ============================================
-- Storage RLS 정책 최종 수정 (완전한 설명 포함)
-- ============================================
-- 
-- ⚠️ 문제: 정책 삭제 후 새 정책 생성했지만 여전히 clients.name 사용 중
-- 
-- 원인 분석:
-- 1. 정책 삭제는 성공했지만 (No rows returned)
-- 2. 새 정책 생성도 성공했지만 (No rows returned)
-- 3. 하지만 정책 내용이 여전히 clients.name을 사용함
--
-- 가능한 원인:
-- - 정책 생성 시 SQL 문법 오류로 인해 이전 정책이 유지됨
-- - 또는 정책이 여러 개 생성되어 충돌
-- - 또는 캐시 문제
--
-- 해결 방법: 정책을 완전히 삭제하고 다시 생성

-- ============================================
-- STEP 1: 모든 Storage 정책 확인
-- ============================================
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

-- ============================================
-- STEP 2: 모든 Storage 정책 강제 삭제
-- ============================================
-- ⚠️ 주의: 이 명령은 모든 Storage 정책을 삭제합니다
-- 정책이 여러 개 있을 수 있으므로 모두 삭제

-- INSERT 정책 삭제
DROP POLICY IF EXISTS "Users can upload to own folder or authorized client folder" ON storage.objects;

-- SELECT 정책 삭제
DROP POLICY IF EXISTS "Users can view own files or authorized client files" ON storage.objects;

-- DELETE 정책 삭제
DROP POLICY IF EXISTS "Users can delete own files or authorized client files" ON storage.objects;

-- UPDATE 정책 삭제
DROP POLICY IF EXISTS "Users can update own files or authorized client files" ON storage.objects;

-- 삭제 확인: 정책이 모두 삭제되었는지 확인
SELECT COUNT(*) as remaining_policies
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects';
-- 결과가 0이어야 합니다

-- ============================================
-- STEP 3: 올바른 정책 생성 (하나씩 확인하며)
-- ============================================

-- ✅ INSERT 정책 생성
CREATE POLICY "Users can upload to own folder or authorized client folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND (
    -- 본인 폴더에 업로드
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
    -- 권한 부여된 클라이언트의 폴더에 업로드
    -- ✅ 중요: storage.foldername(name)[1] 사용 (clients.name이 아님!)
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

-- 생성 확인
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN with_check LIKE '%storage.foldername(clients.name)%' THEN '❌ 잘못됨'
    WHEN with_check LIKE '%storage.foldername(name)%' THEN '✅ 올바름'
    ELSE '⚠️ 확인 필요'
  END as status
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND cmd = 'INSERT';
-- status가 "✅ 올바름"이어야 합니다

-- ✅ SELECT 정책 생성
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

-- ✅ DELETE 정책 생성
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

-- ✅ UPDATE 정책 생성
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
-- STEP 4: 최종 확인
-- ============================================
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
-- 모든 정책이 "✅ 올바름"이어야 합니다


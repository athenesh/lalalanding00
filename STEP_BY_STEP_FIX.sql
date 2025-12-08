-- ============================================
-- 단계별 Storage RLS 정책 수정
-- 각 단계를 실행한 후 결과를 확인하세요
-- ============================================

-- ============================================
-- STEP 1: 현재 정책 확인
-- ============================================
-- 이 쿼리를 실행하고 결과를 알려주세요
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN with_check LIKE '%storage.foldername(clients.name)%' THEN '❌ 잘못됨'
    WHEN with_check LIKE '%storage.foldername(name)%' THEN '✅ 올바름'
    ELSE '확인 필요'
  END as status,
  substring(with_check, 1, 300) as with_check_preview
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND cmd = 'INSERT';

-- ============================================
-- STEP 2: 정책 삭제 시도
-- ============================================
-- 이 명령을 실행하고 에러가 발생하는지 확인하세요
DROP POLICY IF EXISTS "Users can upload to own folder or authorized client folder" ON storage.objects;

-- 삭제 확인
SELECT policyname 
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects' 
  AND policyname = 'Users can upload to own folder or authorized client folder';
-- 결과가 없어야 합니다 (정책 삭제됨)

-- ============================================
-- STEP 3: 새 정책 생성
-- ============================================
-- 이 명령을 실행하고 에러가 발생하는지 확인하세요
CREATE POLICY "Users can upload to own folder or authorized client folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND (
    -- 본인 폴더에 업로드
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
    -- 권한 부여된 클라이언트의 폴더에 업로드
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
-- STEP 4: 생성 확인
-- ============================================
-- 이 쿼리를 실행하고 결과를 알려주세요
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN with_check LIKE '%storage.foldername(clients.name)%' THEN '❌ 잘못됨'
    WHEN with_check LIKE '%storage.foldername(name)%' THEN '✅ 올바름'
    ELSE '확인 필요'
  END as status
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND cmd = 'INSERT';


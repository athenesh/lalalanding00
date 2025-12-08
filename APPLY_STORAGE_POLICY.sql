-- ============================================
-- Storage RLS 정책 수정 - Supabase SQL 에디터에서 실행
-- ============================================
-- 
-- ⚠️ 문제: 정책이 여전히 clients.name을 사용하고 있음
-- ✅ 해결: storage.foldername(name)[1] 사용 (업로드 파일 경로에서 폴더명 추출)
--
-- 실행 방법:
-- 1. Supabase 대시보드 → SQL Editor 열기
-- 2. 아래 전체 SQL을 복사하여 붙여넣기
-- 3. Run 버튼 클릭하여 실행
-- 4. 실행 후 정책 확인 쿼리 결과를 확인하세요

-- ============================================
-- 1. 기존 잘못된 정책 모두 삭제
-- ============================================
DROP POLICY IF EXISTS "Users can upload to own folder or authorized client folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files or authorized client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files or authorized client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files or authorized client files" ON storage.objects;

-- ============================================
-- 2. ✅ 올바른 INSERT 정책 생성
-- ============================================
-- 중요: storage.foldername(name)[1] 사용 (clients.name이 아님!)
-- 파일 경로: {clerk_user_id}/checklist/{item_id}/{filename}
-- storage.foldername(name)[1]은 첫 번째 폴더명(clerk_user_id)을 반환
CREATE POLICY "Users can upload to own folder or authorized client folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND (
    -- 본인 폴더에 업로드
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
    -- 권한 부여된 클라이언트의 폴더에 업로드
    -- ✅ 수정: storage.foldername(name)[1] 사용
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
-- 6. 정책 확인 쿼리 (실행 후 확인용)
-- ============================================
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN with_check LIKE '%storage.foldername(clients.name)%' THEN '❌ 잘못됨'
    WHEN with_check LIKE '%storage.foldername(name)%' THEN '✅ 올바름'
    WHEN qual LIKE '%storage.foldername(clients.name)%' THEN '❌ 잘못됨'
    WHEN qual LIKE '%storage.foldername(name)%' THEN '✅ 올바름'
    ELSE '확인 필요'
  END as status
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY cmd, policyname;



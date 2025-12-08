-- ============================================
-- Storage RLS 정책 완전 교체
-- ============================================
-- ⚠️ 문제: 정책이 부분적으로만 업데이트되어 
--          clients.name과 name이 혼재되어 있음
-- ✅ 해결: 모든 정책을 완전히 삭제하고 올바르게 재생성
--
-- 중요: 이 SQL을 Supabase SQL 에디터에서 전체를 한 번에 실행하세요!
--       실행 후 에러 메시지가 있는지 확인하세요!
--
-- ============================================
-- 1단계: 모든 기존 정책 완전 삭제
-- ============================================

-- 모든 가능한 정책 이름으로 삭제 시도
DROP POLICY IF EXISTS "Users can upload to own folder or authorized client folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files or authorized client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files or authorized client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files or authorized client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;

-- ============================================
-- 2단계: 삭제 확인 (정책 개수가 0이어야 함)
-- ============================================
-- 아래 쿼리를 실행하여 정책이 모두 삭제되었는지 확인하세요:
-- SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';
-- 결과가 0이어야 합니다!

-- ============================================
-- 3단계: ✅ 올바른 INSERT 정책 생성
-- ============================================
-- 중요: storage.foldername(name)[1] 사용 (clients.name 아님!)

CREATE POLICY "Users can upload to own folder or authorized client folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND (
    -- 조건 1: 본인 폴더에 업로드
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
    -- 조건 2: 권한 부여된 클라이언트의 폴더에 업로드
    -- ⚠️ 중요: storage.foldername(name)[1] 사용 (파일 경로의 name 파라미터)
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
-- 4단계: ✅ 올바른 SELECT 정책 생성
-- ============================================

CREATE POLICY "Users can view own files or authorized client files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads' AND (
    -- 조건 1: 본인 폴더의 파일 조회
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
    -- 조건 2: 권한 부여된 클라이언트의 폴더 파일 조회
    -- ⚠️ 중요: storage.foldername(name)[1] 사용
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
-- 5단계: ✅ 올바른 DELETE 정책 생성
-- ============================================

CREATE POLICY "Users can delete own files or authorized client files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'uploads' AND (
    -- 조건 1: 본인 폴더의 파일 삭제
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
    -- 조건 2: 권한 부여된 클라이언트의 폴더 파일 삭제
    -- ⚠️ 중요: storage.foldername(name)[1] 사용
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
-- 6단계: ✅ 올바른 UPDATE 정책 생성
-- ============================================

CREATE POLICY "Users can update own files or authorized client files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'uploads' AND (
    -- 조건 1: 본인 폴더의 파일 업데이트
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
    -- 조건 2: 권한 부여된 클라이언트의 폴더 파일 업데이트
    -- ⚠️ 중요: storage.foldername(name)[1] 사용
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
    -- 조건 1: 본인 폴더에 업데이트
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
    -- 조건 2: 권한 부여된 클라이언트의 폴더에 업데이트
    -- ⚠️ 중요: storage.foldername(name)[1] 사용
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
-- 7단계: 최종 확인 쿼리
-- ============================================
-- 아래 쿼리를 실행하여 정책이 올바르게 생성되었는지 확인하세요:

SELECT
  policyname,
  cmd,
  CASE
    WHEN with_check LIKE '%storage.foldername(clients.name)%' THEN '❌ 잘못됨: clients.name 사용'
    WHEN with_check LIKE '%storage.foldername(name)%' AND with_check NOT LIKE '%storage.foldername(clients.name)%' THEN '✅ 올바름: name 사용'
    WHEN qual LIKE '%storage.foldername(clients.name)%' THEN '❌ 잘못됨: clients.name 사용'
    WHEN qual LIKE '%storage.foldername(name)%' AND qual NOT LIKE '%storage.foldername(clients.name)%' THEN '✅ 올바름: name 사용'
    ELSE '⚠️ 확인 필요'
  END as status,
  -- 정책의 실제 내용 일부 확인
  substring(
    COALESCE(with_check, qual, ''),
    position('storage.foldername' in COALESCE(with_check, qual, '')),
    100
  ) as policy_content_preview
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY cmd, policyname;

-- ============================================
-- 예상 결과:
-- ============================================
-- 모든 정책의 status가 "✅ 올바름: name 사용"이어야 합니다.
-- policy_content_preview에 "clients.name"이 없어야 합니다.
-- 
-- 만약 여전히 "❌ 잘못됨"이 표시된다면:
-- 1. SQL 실행 시 에러 메시지를 확인하세요
-- 2. 정책 삭제가 성공했는지 확인하세요 (COUNT 쿼리 결과가 0이어야 함)
-- 3. Supabase Dashboard를 새로고침하세요
-- 4. 정책의 실제 전체 내용을 확인하세요 (with_check 또는 qual 컬럼)


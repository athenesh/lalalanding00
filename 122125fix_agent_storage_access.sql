-- Storage RLS 정책 업데이트: 에이전트가 자신의 클라이언트의 파일에 접근 가능하도록
-- 문서의 패턴을 따라 IN 절을 사용하여 name이 storage.objects에서 오는 것을 명확히 함
-- 파일 경로: {clerk_user_id}/checklist/{item_id}/{filename}
-- 에이전트는 clients.owner_agent_id를 통해 자신의 클라이언트의 파일에 접근 가능

-- ============================================
-- 기존 정책 삭제 (모든 가능한 정책 이름 포함)
-- ============================================

DROP POLICY IF EXISTS "Users can upload to own folder or authorized client folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files or authorized client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files or authorized client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files or authorized client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
-- 새로 생성하려는 정책도 삭제 (이미 존재할 경우)
DROP POLICY IF EXISTS "Users can upload own authorized or agent client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own authorized or agent client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own authorized or agent client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own authorized or agent client files" ON storage.objects;

-- ============================================
-- INSERT 정책: 본인 폴더, 권한 부여된 클라이언트 폴더, 또는 에이전트의 클라이언트 폴더에 업로드 가능
-- ============================================

CREATE POLICY "Users can upload own authorized or agent client files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND (
    -- 본인 폴더에 업로드
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
    -- 권한 부여된 클라이언트의 폴더에 업로드
    -- ⚠️ 핵심: IN 절을 사용하여 name이 storage.objects에서 오는 것을 명확히 함
    (storage.foldername(name))[1] IN (
      SELECT clients.clerk_user_id
      FROM public.clients
      WHERE EXISTS (
        SELECT 1 FROM public.client_authorizations
        WHERE client_authorizations.client_id = clients.id
        AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
    OR
    -- 에이전트: 자신의 클라이언트의 폴더에 업로드
    -- ⚠️ 핵심: IN 절을 사용하여 name이 storage.objects에서 오는 것을 명확히 함
    (storage.foldername(name))[1] IN (
      SELECT clients.clerk_user_id
      FROM public.clients
      WHERE EXISTS (
        SELECT 1 FROM public.accounts
        WHERE accounts.id = clients.owner_agent_id
        AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  )
);

-- ============================================
-- SELECT 정책: 본인 폴더, 권한 부여된 클라이언트 폴더, 또는 에이전트의 클라이언트 폴더의 파일 조회 가능
-- ============================================

CREATE POLICY "Users can view own authorized or agent client files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads' AND (
    -- 본인 폴더의 파일 조회
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
    -- 권한 부여된 클라이언트의 폴더 파일 조회
    -- ⚠️ 핵심: IN 절을 사용하여 name이 storage.objects에서 오는 것을 명확히 함
    (storage.foldername(name))[1] IN (
      SELECT clients.clerk_user_id
      FROM public.clients
      WHERE EXISTS (
        SELECT 1 FROM public.client_authorizations
        WHERE client_authorizations.client_id = clients.id
        AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
    OR
    -- 에이전트: 자신의 클라이언트의 폴더 파일 조회
    -- ⚠️ 핵심: IN 절을 사용하여 name이 storage.objects에서 오는 것을 명확히 함
    (storage.foldername(name))[1] IN (
      SELECT clients.clerk_user_id
      FROM public.clients
      WHERE EXISTS (
        SELECT 1 FROM public.accounts
        WHERE accounts.id = clients.owner_agent_id
        AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  )
);

-- ============================================
-- DELETE 정책: 본인 폴더, 권한 부여된 클라이언트 폴더, 또는 에이전트의 클라이언트 폴더의 파일 삭제 가능
-- ============================================

CREATE POLICY "Users can delete own authorized or agent client files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'uploads' AND (
    -- 본인 폴더의 파일 삭제
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
    -- 권한 부여된 클라이언트의 폴더 파일 삭제
    -- ⚠️ 핵심: IN 절을 사용하여 name이 storage.objects에서 오는 것을 명확히 함
    (storage.foldername(name))[1] IN (
      SELECT clients.clerk_user_id
      FROM public.clients
      WHERE EXISTS (
        SELECT 1 FROM public.client_authorizations
        WHERE client_authorizations.client_id = clients.id
        AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
    OR
    -- 에이전트: 자신의 클라이언트의 폴더 파일 삭제
    -- ⚠️ 핵심: IN 절을 사용하여 name이 storage.objects에서 오는 것을 명확히 함
    (storage.foldername(name))[1] IN (
      SELECT clients.clerk_user_id
      FROM public.clients
      WHERE EXISTS (
        SELECT 1 FROM public.accounts
        WHERE accounts.id = clients.owner_agent_id
        AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  )
);

-- ============================================
-- UPDATE 정책: 본인 폴더, 권한 부여된 클라이언트 폴더, 또는 에이전트의 클라이언트 폴더의 파일 업데이트 가능
-- ============================================

CREATE POLICY "Users can update own authorized or agent client files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'uploads' AND (
    -- 본인 폴더의 파일 업데이트
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
    -- 권한 부여된 클라이언트의 폴더 파일 업데이트
    -- ⚠️ 핵심: IN 절을 사용하여 name이 storage.objects에서 오는 것을 명확히 함
    (storage.foldername(name))[1] IN (
      SELECT clients.clerk_user_id
      FROM public.clients
      WHERE EXISTS (
        SELECT 1 FROM public.client_authorizations
        WHERE client_authorizations.client_id = clients.id
        AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
    OR
    -- 에이전트: 자신의 클라이언트의 폴더 파일 업데이트
    -- ⚠️ 핵심: IN 절을 사용하여 name이 storage.objects에서 오는 것을 명확히 함
    (storage.foldername(name))[1] IN (
      SELECT clients.clerk_user_id
      FROM public.clients
      WHERE EXISTS (
        SELECT 1 FROM public.accounts
        WHERE accounts.id = clients.owner_agent_id
        AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  )
)
WITH CHECK (
  bucket_id = 'uploads' AND (
    -- 본인 폴더에 업데이트
    (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
    OR
    -- 권한 부여된 클라이언트의 폴더에 업데이트
    -- ⚠️ 핵심: IN 절을 사용하여 name이 storage.objects에서 오는 것을 명확히 함
    (storage.foldername(name))[1] IN (
      SELECT clients.clerk_user_id
      FROM public.clients
      WHERE EXISTS (
        SELECT 1 FROM public.client_authorizations
        WHERE client_authorizations.client_id = clients.id
        AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
    OR
    -- 에이전트: 자신의 클라이언트의 폴더에 업데이트
    -- ⚠️ 핵심: IN 절을 사용하여 name이 storage.objects에서 오는 것을 명확히 함
    (storage.foldername(name))[1] IN (
      SELECT clients.clerk_user_id
      FROM public.clients
      WHERE EXISTS (
        SELECT 1 FROM public.accounts
        WHERE accounts.id = clients.owner_agent_id
        AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  )
);


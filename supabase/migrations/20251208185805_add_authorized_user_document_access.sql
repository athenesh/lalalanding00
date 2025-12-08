-- client_documents 테이블에 권한 부여된 사용자 접근 추가
-- 권한 부여된 사용자(배우자 등)가 체크리스트 파일을 업로드, 조회, 삭제할 수 있도록 RLS 정책 업데이트

-- ============================================
-- client_documents 테이블: 권한 부여된 사용자 접근 추가
-- ============================================

-- SELECT 정책 업데이트: 권한 부여된 사용자도 조회 가능
DROP POLICY IF EXISTS "Users can view documents for their clients" ON public.client_documents;
CREATE POLICY "Users can view documents for their clients"
  ON public.client_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = client_documents.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 문서 조회
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 문서 조회
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        -- 권한 부여된 사용자: 권한이 부여된 클라이언트의 문서 조회
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );

-- INSERT 정책 업데이트: 권한 부여된 사용자도 업로드 가능
DROP POLICY IF EXISTS "Users can insert documents for their clients" ON public.client_documents;
CREATE POLICY "Users can insert documents for their clients"
  ON public.client_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = client_documents.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 문서 업로드
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 문서 업로드
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        -- 권한 부여된 사용자: 권한이 부여된 클라이언트의 문서 업로드
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );

-- DELETE 정책 업데이트: 권한 부여된 사용자도 삭제 가능
DROP POLICY IF EXISTS "Users can delete documents for their clients" ON public.client_documents;
CREATE POLICY "Users can delete documents for their clients"
  ON public.client_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = client_documents.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 문서 삭제
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 문서 삭제
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        -- 권한 부여된 사용자: 권한이 부여된 클라이언트의 문서 삭제
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );


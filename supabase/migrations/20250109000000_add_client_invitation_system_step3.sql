-- Step 3: RLS 정책 및 권한 설정
-- Step 1, Step 2를 성공적으로 실행한 후 이 파일을 실행하세요.

-- RLS 활성화
ALTER TABLE public.client_invitations ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Agents can view own invitations" ON public.client_invitations;
DROP POLICY IF EXISTS "Agents can create invitations" ON public.client_invitations;
DROP POLICY IF EXISTS "Agents can update own invitations" ON public.client_invitations;
DROP POLICY IF EXISTS "Users can view valid invitations by token" ON public.client_invitations;

-- 에이전트는 자신이 생성한 초대만 조회 가능
CREATE POLICY "Agents can view own invitations"
  ON public.client_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = client_invitations.agent_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 에이전트는 자신의 초대를 생성할 수 있음
CREATE POLICY "Agents can create invitations"
  ON public.client_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = client_invitations.agent_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 에이전트는 자신의 초대를 업데이트할 수 있음
CREATE POLICY "Agents can update own invitations"
  ON public.client_invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = client_invitations.agent_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 인증된 사용자는 초대 토큰으로 초대 정보를 조회할 수 있음 (회원가입 시 검증용)
CREATE POLICY "Users can view valid invitations by token"
  ON public.client_invitations FOR SELECT
  TO authenticated
  USING (
    expires_at > NOW()
    AND used_at IS NULL
  );

-- 권한 부여
GRANT ALL ON TABLE public.client_invitations TO authenticated;

-- clients 테이블 RLS 정책 업데이트
DROP POLICY IF EXISTS "Clients can create own record" ON public.clients;

CREATE POLICY "Clients can create own record"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (
    clerk_user_id = (auth.jwt()->>'sub')
    AND (
      owner_agent_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.client_invitations
        WHERE client_invitations.invitation_token = clients.invitation_token
        AND client_invitations.agent_id = clients.owner_agent_id
        AND client_invitations.expires_at > NOW()
        AND client_invitations.used_at IS NULL
      )
    )
  );


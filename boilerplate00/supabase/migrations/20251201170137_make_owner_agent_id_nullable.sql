-- owner_agent_id를 nullable로 변경하고 RLS 정책 수정
-- 클라이언트가 회원가입 시 자동으로 레코드가 생성되지만 아직 에이전트에 할당되지 않은 상태를 지원

-- 1. owner_agent_id를 nullable로 변경
ALTER TABLE public.clients
ALTER COLUMN owner_agent_id DROP NOT NULL;

-- 2. 기존 RLS 정책 삭제 (재생성 필요)
DROP POLICY IF EXISTS "Agents can view own clients" ON public.clients;
DROP POLICY IF EXISTS "Agents can create clients" ON public.clients;
DROP POLICY IF EXISTS "Agents can update own clients" ON public.clients;

-- 3. 새로운 RLS 정책 생성
-- 에이전트는 자신의 클라이언트와 할당되지 않은 클라이언트를 조회 가능
CREATE POLICY "Agents can view own and unassigned clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    -- 자신의 클라이언트
    (
      owner_agent_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.accounts
        WHERE accounts.id = clients.owner_agent_id
        AND accounts.clerk_user_id = (auth.jwt()->>'sub')
      )
    )
    OR
    -- 할당되지 않은 클라이언트 (모든 에이전트가 조회 가능)
    (owner_agent_id IS NULL)
  );

-- 에이전트는 자신의 클라이언트를 생성할 수 있음 (기존 정책 유지)
CREATE POLICY "Agents can create clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_agent_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = clients.owner_agent_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 클라이언트는 자신의 레코드를 생성할 수 있음 (owner_agent_id가 null인 경우)
CREATE POLICY "Clients can create own record"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_agent_id IS NULL
    AND clerk_user_id = (auth.jwt()->>'sub')
  );

-- 에이전트는 자신의 클라이언트만 수정 가능
CREATE POLICY "Agents can update own clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    owner_agent_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = clients.owner_agent_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 에이전트는 할당되지 않은 클라이언트를 자신에게 할당할 수 있음
-- USING 절: 기존 레코드가 할당되지 않은 경우
-- WITH CHECK 절: 업데이트 후 현재 에이전트에게 할당되는 경우
CREATE POLICY "Agents can assign unassigned clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    -- 할당 전에는 owner_agent_id가 null이어야 함
    owner_agent_id IS NULL
  )
  WITH CHECK (
    -- 할당 후에는 현재 에이전트의 account.id가 되어야 함
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = clients.owner_agent_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );


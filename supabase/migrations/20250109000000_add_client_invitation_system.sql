-- 클라이언트 초대 시스템 추가
-- Phase 1: 에이전트 초대 방식 구현
-- 
-- 주의: 이 마이그레이션은 accounts 테이블이 이미 생성되어 있어야 합니다.
-- create_main_schema.sql을 먼저 실행했는지 확인하세요.

-- ============================================
-- 1. client_invitations 테이블 생성
-- ============================================

-- accounts 테이블 존재 확인
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'accounts'
  ) THEN
    RAISE EXCEPTION 'accounts 테이블이 존재하지 않습니다. create_main_schema.sql을 먼저 실행해주세요.';
  END IF;
END $$;

-- 테이블 생성 (외래키는 나중에 추가)
CREATE TABLE IF NOT EXISTS public.client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  invitation_token TEXT UNIQUE NOT NULL,
  email TEXT, -- 선택사항: 특정 이메일로 초대하는 경우
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 외래키 제약조건 추가 (accounts 테이블이 존재하는 경우에만)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_name = 'client_invitations_agent_id_fkey'
  ) THEN
    ALTER TABLE public.client_invitations
    ADD CONSTRAINT client_invitations_agent_id_fkey 
    FOREIGN KEY (agent_id) 
    REFERENCES public.accounts(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_client_invitations_token ON public.client_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_client_invitations_agent_id ON public.client_invitations(agent_id);
CREATE INDEX IF NOT EXISTS idx_client_invitations_email ON public.client_invitations(email) WHERE email IS NOT NULL;

-- ============================================
-- 2. clients 테이블에 필드 추가
-- ============================================

-- invitation_token: 초대 토큰 (어떤 초대를 통해 가입했는지 추적)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS invitation_token TEXT;

-- access_level: 접근 레벨 ('invited' | 'paid')
-- 'invited': 초대만 받은 상태 (프로필, 채팅만 가능)
-- 'paid': 결제 완료 상태 (모든 기능 사용 가능)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'invited' CHECK (access_level IN ('invited', 'paid'));

-- payment_status: 결제 상태 (Phase 2에서 사용)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed'));

-- payment_completed_at: 결제 완료 시간 (Phase 2에서 사용)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMP WITH TIME ZONE;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_clients_invitation_token ON public.clients(invitation_token) WHERE invitation_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_access_level ON public.clients(access_level);

-- ============================================
-- 3. RLS 정책: client_invitations 테이블
-- ============================================

ALTER TABLE public.client_invitations ENABLE ROW LEVEL SECURITY;

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

-- 에이전트는 자신의 초대를 업데이트할 수 있음 (사용 여부 등)
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
-- 단, 만료되지 않고 사용되지 않은 초대만 조회 가능
CREATE POLICY "Users can view valid invitations by token"
  ON public.client_invitations FOR SELECT
  TO authenticated
  USING (
    expires_at > NOW()
    AND used_at IS NULL
  );

-- 권한 부여
GRANT ALL ON TABLE public.client_invitations TO authenticated;

-- ============================================
-- 4. 기존 clients 테이블 RLS 정책 업데이트
-- ============================================

-- 클라이언트는 자신의 레코드를 생성할 수 있음 (owner_agent_id가 null이거나 초대 토큰이 있는 경우)
-- 기존 정책을 업데이트하여 invitation_token도 허용
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


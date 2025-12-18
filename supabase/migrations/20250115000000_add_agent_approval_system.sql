-- 에이전트 승인 시스템 추가
-- DRE 번호, Brokerage 이름, 승인 상태 필드 추가
-- 알림 시스템 추가
-- 초대 코드 시스템 추가

-- ============================================
-- 1. accounts 테이블에 필드 추가
-- ============================================

-- DRE 번호 (California Department of Real Estate License Number)
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS dre_number TEXT UNIQUE;

-- Brokerage 이름
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS brokerage_name TEXT;

-- 승인 상태
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE NOT NULL;

-- 승인 시간
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- 승인한 ADMIN의 clerk_user_id
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS approved_by TEXT;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_accounts_dre_number ON public.accounts(dre_number) WHERE dre_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_is_approved ON public.accounts(is_approved);
CREATE INDEX IF NOT EXISTS idx_accounts_brokerage_name ON public.accounts(brokerage_name) WHERE brokerage_name IS NOT NULL;

-- ============================================
-- 2. notifications 테이블 생성 (앱 내 알림)
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_clerk_id TEXT NOT NULL, -- 알림을 받을 사용자의 Clerk ID
  type TEXT NOT NULL, -- 'agent_approved' | 'agent_rejected' | 'client_invited' | 'message' 등
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  metadata JSONB -- 추가 정보 (예: agent_id, client_id 등)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_clerk_id ON public.notifications(user_clerk_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- RLS 활성화
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 알림만 조회 가능
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_clerk_id = (auth.jwt()->>'sub'));

-- 사용자는 자신의 알림을 읽음 처리할 수 있음
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_clerk_id = (auth.jwt()->>'sub'));

-- 서비스 역할은 모든 알림을 생성할 수 있음 (서버 사이드에서 사용)
-- INSERT 정책은 RLS를 우회하는 service_role을 사용하므로 별도 정책 불필요

-- 권한 부여
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;

-- RLS 비활성화 (개발 단계)
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. client_invitations 테이블 생성 (없는 경우) 및 invitation_code 필드 추가
-- ============================================

-- client_invitations 테이블이 없으면 생성
CREATE TABLE IF NOT EXISTS public.client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  invitation_token TEXT UNIQUE NOT NULL,
  email TEXT, -- 선택사항: 특정 이메일로 초대하는 경우
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 외래키 제약조건 추가 (없는 경우에만)
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

-- 기존 인덱스 생성 (없는 경우)
CREATE INDEX IF NOT EXISTS idx_client_invitations_token ON public.client_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_client_invitations_agent_id ON public.client_invitations(agent_id);
CREATE INDEX IF NOT EXISTS idx_client_invitations_email ON public.client_invitations(email) WHERE email IS NOT NULL;

-- invitation_code 필드 추가
ALTER TABLE public.client_invitations
ADD COLUMN IF NOT EXISTS invitation_code TEXT UNIQUE;

-- invitation_code 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_client_invitations_code ON public.client_invitations(invitation_code) WHERE invitation_code IS NOT NULL;

-- RLS 정책 추가 (없는 경우)
DO $$
BEGIN
  -- RLS 활성화
  ALTER TABLE public.client_invitations ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN
    -- 이미 활성화되어 있으면 무시
    NULL;
END $$;

-- 에이전트는 자신이 생성한 초대만 조회 가능
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'client_invitations' 
    AND policyname = 'Agents can view own invitations'
  ) THEN
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
  END IF;
END $$;

-- 에이전트는 자신의 초대를 생성할 수 있음
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'client_invitations' 
    AND policyname = 'Agents can create invitations'
  ) THEN
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
  END IF;
END $$;

-- 에이전트는 자신의 초대를 업데이트할 수 있음
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'client_invitations' 
    AND policyname = 'Agents can update own invitations'
  ) THEN
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
  END IF;
END $$;

-- 인증된 사용자는 초대 토큰으로 초대 정보를 조회할 수 있음 (회원가입 시 검증용)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'client_invitations' 
    AND policyname = 'Users can view valid invitations by token'
  ) THEN
    CREATE POLICY "Users can view valid invitations by token"
      ON public.client_invitations FOR SELECT
      TO authenticated
      USING (
        expires_at > NOW()
        AND used_at IS NULL
      );
  END IF;
END $$;

-- 권한 부여
GRANT ALL ON TABLE public.client_invitations TO authenticated;
GRANT ALL ON TABLE public.client_invitations TO service_role;

-- RLS 비활성화 (개발 단계)
ALTER TABLE public.client_invitations DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS 정책 업데이트: accounts 테이블
-- ============================================

-- 승인되지 않은 에이전트도 자신의 정보를 조회할 수 있어야 함 (프로필 수정용)
-- 기존 정책은 이미 clerk_user_id로만 확인하므로 수정 불필요

-- 승인되지 않은 에이전트도 자신의 정보를 업데이트할 수 있어야 함 (DRE 번호, Brokerage 이름 입력용)
-- 기존 정책은 이미 clerk_user_id로만 확인하므로 수정 불필요

-- ADMIN은 모든 accounts를 조회할 수 있어야 함 (승인 페이지용)
-- 이는 서버 사이드에서 service_role을 사용하므로 별도 정책 불필요


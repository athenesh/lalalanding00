-- Step 1: accounts 테이블 확인 및 client_invitations 테이블 생성
-- 이 파일을 먼저 실행하세요.

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

-- client_invitations 테이블 생성 (외래키 없이)
CREATE TABLE IF NOT EXISTS public.client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  invitation_token TEXT UNIQUE NOT NULL,
  email TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_client_invitations_token ON public.client_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_client_invitations_agent_id ON public.client_invitations(agent_id);
CREATE INDEX IF NOT EXISTS idx_client_invitations_email ON public.client_invitations(email) WHERE email IS NOT NULL;

-- 외래키 제약조건 추가
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


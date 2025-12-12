-- clients 테이블이 없으면 생성
-- accounts 테이블이 먼저 있어야 함

-- accounts 테이블 확인
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'accounts'
  ) THEN
    RAISE EXCEPTION 'accounts 테이블이 존재하지 않습니다. accounts 테이블을 먼저 생성해주세요.';
  END IF;
END $$;

-- clients 테이블 생성 (이미 존재하면 무시)
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_agent_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  clerk_user_id TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone_kr TEXT,
  phone_us TEXT,
  occupation TEXT,
  moving_date DATE,
  relocation_type TEXT,
  moving_type TEXT,
  birth_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_clients_owner_agent_id ON public.clients(owner_agent_id);
CREATE INDEX IF NOT EXISTS idx_clients_clerk_user_id ON public.clients(clerk_user_id) WHERE clerk_user_id IS NOT NULL;

-- 확인
SELECT 'clients 테이블 생성 완료' AS status;


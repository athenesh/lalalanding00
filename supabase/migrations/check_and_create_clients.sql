-- clients 테이블 존재 여부 확인 및 생성
-- 이 파일을 Step 1 전에 실행하세요.

-- clients 테이블이 있는지 확인
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'clients'
  ) THEN
    -- clients 테이블 생성 (기본 구조만)
    -- accounts 테이블이 먼저 있어야 함
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'accounts'
    ) THEN
      RAISE EXCEPTION 'accounts 테이블이 존재하지 않습니다. accounts 테이블을 먼저 생성해주세요.';
    END IF;

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

    CREATE INDEX IF NOT EXISTS idx_clients_owner_agent_id ON public.clients(owner_agent_id);
    CREATE INDEX IF NOT EXISTS idx_clients_clerk_user_id ON public.clients(clerk_user_id);
    
    RAISE NOTICE 'clients 테이블이 생성되었습니다.';
  ELSE
    RAISE NOTICE 'clients 테이블이 이미 존재합니다.';
  END IF;
END $$;

-- 확인: clients 테이블 정보 출력
SELECT 
  'clients 테이블 확인' AS status,
  COUNT(*) AS table_exists
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'clients';


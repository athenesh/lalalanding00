-- accounts 테이블 존재 여부 확인 및 생성
-- 이 파일을 먼저 실행하세요.

-- accounts 테이블이 있는지 확인
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'accounts'
  ) THEN
    -- accounts 테이블 생성
    CREATE TABLE IF NOT EXISTS public.accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clerk_user_id TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'agent',
      name TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_accounts_clerk_user_id ON public.accounts(clerk_user_id);
    
    RAISE NOTICE 'accounts 테이블이 생성되었습니다.';
  ELSE
    RAISE NOTICE 'accounts 테이블이 이미 존재합니다.';
  END IF;
END $$;

-- 확인: accounts 테이블 정보 출력
SELECT 
  'accounts 테이블 확인' AS status,
  COUNT(*) AS table_exists
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'accounts';


-- Step 2: clients 테이블에 필드 추가
-- Step 1을 성공적으로 실행한 후 이 파일을 실행하세요.

-- invitation_token: 초대 토큰
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS invitation_token TEXT;

-- access_level: 접근 레벨 ('invited' | 'paid')
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'invited';

-- access_level CHECK 제약조건 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public'
    AND table_name = 'clients'
    AND constraint_name = 'clients_access_level_check'
  ) THEN
    ALTER TABLE public.clients
    ADD CONSTRAINT clients_access_level_check 
    CHECK (access_level IN ('invited', 'paid'));
  END IF;
END $$;

-- payment_status: 결제 상태
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- payment_status CHECK 제약조건 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public'
    AND table_name = 'clients'
    AND constraint_name = 'clients_payment_status_check'
  ) THEN
    ALTER TABLE public.clients
    ADD CONSTRAINT clients_payment_status_check 
    CHECK (payment_status IN ('pending', 'completed', 'failed'));
  END IF;
END $$;

-- payment_completed_at: 결제 완료 시간
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMP WITH TIME ZONE;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_clients_invitation_token ON public.clients(invitation_token) WHERE invitation_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_access_level ON public.clients(access_level);


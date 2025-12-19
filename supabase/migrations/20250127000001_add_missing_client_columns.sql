-- clients 테이블에 누락된 컬럼 추가
-- access_level, invitation_token, payment_status, payment_completed_at 컬럼이 없으면 추가

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

-- 기존 레코드에 기본값 설정 (access_level이 null인 경우)
UPDATE public.clients
SET access_level = 'invited'
WHERE access_level IS NULL;

-- 기존 레코드에 기본값 설정 (payment_status가 null인 경우)
UPDATE public.clients
SET payment_status = 'pending'
WHERE payment_status IS NULL;


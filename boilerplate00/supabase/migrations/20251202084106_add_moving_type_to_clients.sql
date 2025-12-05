-- clients 테이블에 moving_type 필드 추가
-- 이주 형태를 나타내는 필드 (가족 동반 / 단독 이주)
-- 기존 relocation_type 필드는 "이주 목적"으로 사용 (주재원, 학업, 출장)

-- moving_type 컬럼 추가
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS moving_type TEXT;

-- 컬럼에 대한 코멘트 추가
COMMENT ON COLUMN public.clients.moving_type IS '이주 형태: 가족 동반 또는 단독 이주';


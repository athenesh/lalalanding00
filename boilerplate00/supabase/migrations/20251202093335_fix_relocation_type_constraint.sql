-- clients 테이블의 relocation_type CHECK 제약 조건 수정
-- 기존: 'with_family', 'solo'만 허용
-- 수정: '주재원', '학업', '출장' 허용 (이주 목적)

-- 기존 제약 조건 삭제
ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_relocation_type_check;

-- 새로운 제약 조건 추가 (이주 목적: 주재원, 학업, 출장)
ALTER TABLE public.clients
ADD CONSTRAINT clients_relocation_type_check
CHECK (relocation_type IS NULL OR relocation_type IN ('주재원', '학업', '출장'));

-- 제약 조건에 대한 코멘트 추가
COMMENT ON CONSTRAINT clients_relocation_type_check ON public.clients IS 
'이주 목적: 주재원, 학업, 출장 중 하나여야 함';


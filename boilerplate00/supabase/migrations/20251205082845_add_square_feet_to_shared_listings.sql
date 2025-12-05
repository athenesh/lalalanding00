-- shared_listings 테이블에 square_feet 필드 추가
-- Bridge Data Output API에서 가져온 리스팅의 평수(sqft) 정보를 저장하기 위한 필드

ALTER TABLE public.shared_listings
ADD COLUMN IF NOT EXISTS square_feet INTEGER;

-- 인덱스 추가 (필요시 검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_shared_listings_square_feet 
ON public.shared_listings(square_feet) 
WHERE square_feet IS NOT NULL;

-- 코멘트 추가
COMMENT ON COLUMN public.shared_listings.square_feet IS '부동산 평수 (제곱피트, sqft)';


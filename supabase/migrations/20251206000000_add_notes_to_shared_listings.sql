-- shared_listings 테이블에 notes 필드 추가
-- 리스팅 카드에 메모 기능을 추가하기 위한 필드
-- 채팅방 참여자(클라이언트/에이전트)가 리스팅에 대한 메모를 작성할 수 있음

-- notes 컬럼 추가 (TEXT 타입, NULL 허용)
ALTER TABLE public.shared_listings
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 코멘트 추가
COMMENT ON COLUMN public.shared_listings.notes IS '리스팅에 대한 메모 (채팅방 참여자가 작성 가능)';



-- 승인되지 않은 에이전트에게 할당된 클라이언트 정리
-- 승인되지 않은 에이전트에게 할당된 클라이언트의 owner_agent_id를 NULL로 변경
-- 관리자가 나중에 다시 할당할 수 있도록 함

-- ============================================
-- 1. 승인되지 않은 에이전트에게 할당된 클라이언트 확인
-- ============================================

-- 먼저 영향받을 클라이언트 수 확인
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO affected_count
  FROM public.clients c
  INNER JOIN public.accounts a ON c.owner_agent_id = a.id
  WHERE a.role = 'agent'
    AND a.is_approved = false
    AND c.owner_agent_id IS NOT NULL;

  RAISE NOTICE '승인되지 않은 에이전트에게 할당된 클라이언트 수: %', affected_count;
END $$;

-- ============================================
-- 2. 승인되지 않은 에이전트에게 할당된 클라이언트의 owner_agent_id를 NULL로 변경
-- ============================================

UPDATE public.clients
SET owner_agent_id = NULL
WHERE owner_agent_id IN (
  SELECT a.id
  FROM public.accounts a
  WHERE a.role = 'agent'
    AND a.is_approved = false
);

-- ============================================
-- 3. 변경 사항 확인
-- ============================================

-- 변경 후 승인되지 않은 에이전트에게 할당된 클라이언트가 있는지 확인
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM public.clients c
  INNER JOIN public.accounts a ON c.owner_agent_id = a.id
  WHERE a.role = 'agent'
    AND a.is_approved = false
    AND c.owner_agent_id IS NOT NULL;

  IF remaining_count > 0 THEN
    RAISE WARNING '여전히 승인되지 않은 에이전트에게 할당된 클라이언트가 %개 있습니다.', remaining_count;
  ELSE
    RAISE NOTICE '모든 승인되지 않은 에이전트에게 할당된 클라이언트가 정리되었습니다.';
  END IF;
END $$;

-- ============================================
-- 완료 메시지
-- ============================================

SELECT '승인되지 않은 에이전트에게 할당된 클라이언트 정리 완료' AS status;


-- ============================================
-- 정리: Clerk에 존재하지 않는 에이전트 레코드 삭제
-- ============================================
-- 
-- ⚠️ 주의: 이 스크립트를 실행하기 전에 반드시 진단 스크립트를 먼저 실행하여
--          삭제될 레코드를 확인하세요.
--
-- 이 스크립트는 다음 레코드를 삭제합니다:
-- 1. clerk_user_id가 NULL이거나 빈 문자열인 에이전트 레코드
-- 2. (선택사항) 특정 clerk_user_id 목록에 없는 에이전트 레코드
--
-- 사용 방법:
-- 1. 먼저 20250116000001_diagnose_orphaned_agents.sql 실행하여 확인
-- 2. Clerk Dashboard에서 실제 에이전트의 clerk_user_id 목록 확인
-- 3. 아래의 "실제 Clerk 에이전트 ID 목록"에 해당 ID들을 추가
-- 4. 이 스크립트 실행

-- ============================================
-- 1. 삭제 전 백업 (선택사항)
-- ============================================
-- 
-- 삭제하기 전에 백업 테이블을 만들고 싶다면:
-- CREATE TABLE accounts_backup_20250116 AS 
-- SELECT * FROM accounts WHERE role = 'agent';

-- ============================================
-- 2. clerk_user_id가 NULL이거나 빈 문자열인 에이전트 삭제
-- ============================================

-- 먼저 영향받을 레코드 수 확인
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO affected_count
  FROM public.accounts
  WHERE role = 'agent'
    AND (clerk_user_id IS NULL OR clerk_user_id = '');
  
  RAISE NOTICE '삭제될 레코드 수 (clerk_user_id가 NULL 또는 빈 문자열): %', affected_count;
END $$;

-- 실제 삭제 실행
-- ⚠️ 주의: 이 구문을 실행하면 데이터가 삭제됩니다!
-- DELETE FROM public.accounts
-- WHERE role = 'agent'
--   AND (clerk_user_id IS NULL OR clerk_user_id = '');

-- ============================================
-- 3. 특정 clerk_user_id 목록에 없는 에이전트 삭제 (선택사항)
-- ============================================
--
-- Clerk Dashboard에서 확인한 실제 에이전트의 clerk_user_id 목록을
-- 아래 배열에 추가하세요.
--
-- 예시:
-- WITH valid_clerk_ids AS (
--   SELECT unnest(ARRAY[
--     'user_2abc123def456',  -- 실제 Clerk 에이전트 ID 1
--     'user_2xyz789ghi012'   -- 실제 Clerk 에이전트 ID 2
--   ]) AS clerk_id
-- )
-- DELETE FROM public.accounts
-- WHERE role = 'agent'
--   AND clerk_user_id IS NOT NULL
--   AND clerk_user_id NOT IN (SELECT clerk_id FROM valid_clerk_ids);

-- ============================================
-- 4. 삭제 후 확인
-- ============================================

-- 삭제 후 남은 에이전트 수 확인
SELECT 
  COUNT(*) as remaining_agents,
  COUNT(CASE WHEN is_approved = true THEN 1 END) as approved_agents,
  COUNT(CASE WHEN is_approved = false THEN 1 END) as pending_agents
FROM public.accounts
WHERE role = 'agent';

-- 남은 에이전트 목록
SELECT 
  id,
  clerk_user_id,
  email,
  name,
  is_approved,
  created_at
FROM public.accounts
WHERE role = 'agent'
ORDER BY created_at DESC;

-- ============================================
-- 완료 메시지
-- ============================================

SELECT '에이전트 레코드 정리 완료' AS status;


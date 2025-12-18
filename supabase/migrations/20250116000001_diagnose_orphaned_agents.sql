-- ============================================
-- 진단: Clerk에 존재하지 않는 에이전트 레코드 확인
-- ============================================
-- 
-- 이 스크립트는 accounts 테이블에서 role='agent'인 레코드를 확인합니다.
-- Clerk에 실제로 존재하는 에이전트와 비교하여 고아 레코드를 찾습니다.
--
-- 사용 방법:
-- 1. 이 SQL을 Supabase SQL Editor에서 실행하여 현재 상태 확인
-- 2. 결과를 확인한 후 정리 스크립트 실행

-- ============================================
-- 1. 현재 accounts 테이블의 모든 에이전트 확인
-- ============================================

SELECT 
  id,
  clerk_user_id,
  email,
  name,
  role,
  is_approved,
  created_at
FROM public.accounts
WHERE role = 'agent'
ORDER BY created_at DESC;

-- ============================================
-- 2. clerk_user_id가 NULL이거나 빈 문자열인 에이전트 확인
-- ============================================

SELECT 
  id,
  clerk_user_id,
  email,
  name,
  role,
  is_approved,
  created_at
FROM public.accounts
WHERE role = 'agent'
  AND (clerk_user_id IS NULL OR clerk_user_id = '');

-- ============================================
-- 3. 통계 정보
-- ============================================

SELECT 
  COUNT(*) as total_agents,
  COUNT(CASE WHEN clerk_user_id IS NULL OR clerk_user_id = '' THEN 1 END) as agents_without_clerk_id,
  COUNT(CASE WHEN is_approved = true THEN 1 END) as approved_agents,
  COUNT(CASE WHEN is_approved = false THEN 1 END) as pending_agents
FROM public.accounts
WHERE role = 'agent';

-- ============================================
-- 4. 최근 생성된 에이전트 (최근 30일)
-- ============================================

SELECT 
  id,
  clerk_user_id,
  email,
  name,
  role,
  is_approved,
  created_at
FROM public.accounts
WHERE role = 'agent'
  AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;


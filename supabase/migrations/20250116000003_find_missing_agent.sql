-- ============================================
-- 진단: Clerk에 존재하지 않는 에이전트 레코드 확인
-- ============================================
-- 
-- 이 스크립트는 데이터베이스의 에이전트 중 Clerk에 존재하지 않는 레코드를 찾습니다.
-- 
-- 사용 방법:
-- 1. 이 SQL을 Supabase SQL Editor에서 실행
-- 2. 결과를 확인하여 Clerk에 존재하지 않는 에이전트 레코드 확인
-- 3. 필요시 해당 레코드를 삭제하거나 Clerk User ID를 업데이트

-- ============================================
-- 1. 승인 대기 중인 에이전트 중 Clerk에 존재하지 않는 것 확인
-- ============================================

SELECT 
  a.id,
  a.clerk_user_id,
  a.email,
  a.name,
  a.is_approved,
  a.created_at,
  CASE 
    WHEN a.clerk_user_id IS NULL OR a.clerk_user_id = '' THEN 'clerk_user_id가 없음'
    ELSE 'Clerk에 존재하지 않을 수 있음 (수동 확인 필요)'
  END AS status
FROM public.accounts a
WHERE a.role = 'agent'
  AND a.is_approved = false
ORDER BY a.created_at DESC;

-- ============================================
-- 2. 모든 에이전트의 clerk_user_id 목록
-- ============================================

SELECT 
  clerk_user_id,
  email,
  name,
  is_approved,
  created_at
FROM public.accounts
WHERE role = 'agent'
  AND clerk_user_id IS NOT NULL
  AND clerk_user_id != ''
ORDER BY created_at DESC;

-- ============================================
-- 3. 중복된 clerk_user_id 확인
-- ============================================

SELECT 
  clerk_user_id,
  COUNT(*) as count,
  array_agg(id) as account_ids,
  array_agg(email) as emails
FROM public.accounts
WHERE role = 'agent'
  AND clerk_user_id IS NOT NULL
  AND clerk_user_id != ''
GROUP BY clerk_user_id
HAVING COUNT(*) > 1;


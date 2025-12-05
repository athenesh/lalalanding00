-- RLS 정책 테스트를 위한 SQL 쿼리
-- 이 쿼리들은 Supabase SQL Editor에서 실행하여 RLS 정책이 올바르게 작동하는지 확인합니다.

-- ============================================
-- 주의사항
-- ============================================
-- 이 쿼리들을 실행하기 전에:
-- 1. 테스트용 에이전트 계정 2개와 클라이언트 계정 2개를 준비하세요.
-- 2. 각 계정의 Clerk User ID를 확인하세요.
-- 3. 각 계정으로 로그인한 상태에서 쿼리를 실행하세요.
-- 4. 예상 결과와 실제 결과를 비교하세요.

-- ============================================
-- 1. accounts 테이블 RLS 테스트
-- ============================================

-- 에이전트 A로 로그인한 상태에서
-- 자신의 계정 조회 (성공해야 함)
SELECT * FROM public.accounts WHERE clerk_user_id = '에이전트_A의_Clerk_User_ID';

-- 에이전트 A로 로그인한 상태에서
-- 에이전트 B의 계정 조회 (실패해야 함 - 빈 결과셋)
SELECT * FROM public.accounts WHERE clerk_user_id = '에이전트_B의_Clerk_User_ID';

-- ============================================
-- 2. clients 테이블 RLS 테스트
-- ============================================

-- 에이전트 A로 로그인한 상태에서
-- 자신의 클라이언트 조회 (성공해야 함)
SELECT * FROM public.clients 
WHERE owner_agent_id IN (
  SELECT id FROM public.accounts WHERE clerk_user_id = '에이전트_A의_Clerk_User_ID'
);

-- 에이전트 A로 로그인한 상태에서
-- 에이전트 B의 클라이언트 조회 (실패해야 함 - 빈 결과셋)
SELECT * FROM public.clients 
WHERE owner_agent_id IN (
  SELECT id FROM public.accounts WHERE clerk_user_id = '에이전트_B의_Clerk_User_ID'
);

-- 클라이언트 A로 로그인한 상태에서
-- 자신의 프로필 조회 (성공해야 함)
SELECT * FROM public.clients WHERE clerk_user_id = '클라이언트_A의_Clerk_User_ID';

-- 클라이언트 A로 로그인한 상태에서
-- 클라이언트 B의 프로필 조회 (실패해야 함 - 빈 결과셋)
SELECT * FROM public.clients WHERE clerk_user_id = '클라이언트_B의_Clerk_User_ID';

-- ============================================
-- 3. housing_requirements 테이블 RLS 테스트
-- ============================================

-- 에이전트 A로 로그인한 상태에서
-- 자신의 클라이언트의 주거 요구사항 조회 (성공해야 함)
SELECT hr.* FROM public.housing_requirements hr
JOIN public.clients c ON c.id = hr.client_id
JOIN public.accounts a ON a.id = c.owner_agent_id
WHERE a.clerk_user_id = '에이전트_A의_Clerk_User_ID';

-- 에이전트 A로 로그인한 상태에서
-- 에이전트 B의 클라이언트의 주거 요구사항 조회 (실패해야 함 - 빈 결과셋)
SELECT hr.* FROM public.housing_requirements hr
JOIN public.clients c ON c.id = hr.client_id
JOIN public.accounts a ON a.id = c.owner_agent_id
WHERE a.clerk_user_id = '에이전트_B의_Clerk_User_ID';

-- 클라이언트 A로 로그인한 상태에서
-- 자신의 주거 요구사항 조회 (성공해야 함)
SELECT hr.* FROM public.housing_requirements hr
JOIN public.clients c ON c.id = hr.client_id
WHERE c.clerk_user_id = '클라이언트_A의_Clerk_User_ID';

-- ============================================
-- 4. checklist_items 테이블 RLS 테스트
-- ============================================

-- 에이전트 A로 로그인한 상태에서
-- 자신의 클라이언트의 체크리스트 조회 (성공해야 함)
SELECT ci.* FROM public.checklist_items ci
JOIN public.clients c ON c.id = ci.client_id
JOIN public.accounts a ON a.id = c.owner_agent_id
WHERE a.clerk_user_id = '에이전트_A의_Clerk_User_ID';

-- 클라이언트 A로 로그인한 상태에서
-- 자신의 체크리스트 조회 (성공해야 함)
SELECT ci.* FROM public.checklist_items ci
JOIN public.clients c ON c.id = ci.client_id
WHERE c.clerk_user_id = '클라이언트_A의_Clerk_User_ID';

-- ============================================
-- 5. messages 테이블 RLS 테스트
-- ============================================

-- 에이전트 A로 로그인한 상태에서
-- 자신의 클라이언트의 메시지 조회 (성공해야 함)
SELECT m.* FROM public.messages m
JOIN public.clients c ON c.id = m.client_id
JOIN public.accounts a ON a.id = c.owner_agent_id
WHERE a.clerk_user_id = '에이전트_A의_Clerk_User_ID';

-- 클라이언트 A로 로그인한 상태에서
-- 자신의 메시지 조회 (성공해야 함)
SELECT m.* FROM public.messages m
JOIN public.clients c ON c.id = m.client_id
WHERE c.clerk_user_id = '클라이언트_A의_Clerk_User_ID';

-- ============================================
-- 6. client_documents 테이블 RLS 테스트
-- ============================================

-- 에이전트 A로 로그인한 상태에서
-- 자신의 클라이언트의 문서 조회 (성공해야 함)
SELECT cd.* FROM public.client_documents cd
JOIN public.clients c ON c.id = cd.client_id
JOIN public.accounts a ON a.id = c.owner_agent_id
WHERE a.clerk_user_id = '에이전트_A의_Clerk_User_ID';

-- 클라이언트 A로 로그인한 상태에서
-- 자신의 문서 조회 (성공해야 함)
SELECT cd.* FROM public.client_documents cd
JOIN public.clients c ON c.id = cd.client_id
WHERE c.clerk_user_id = '클라이언트_A의_Clerk_User_ID';

-- ============================================
-- 7. family_members 테이블 RLS 테스트
-- ============================================

-- 에이전트 A로 로그인한 상태에서
-- 자신의 클라이언트의 가족 구성원 조회 (성공해야 함)
SELECT fm.* FROM public.family_members fm
JOIN public.clients c ON c.id = fm.client_id
JOIN public.accounts a ON a.id = c.owner_agent_id
WHERE a.clerk_user_id = '에이전트_A의_Clerk_User_ID';

-- 클라이언트 A로 로그인한 상태에서
-- 자신의 가족 구성원 조회 (성공해야 함)
SELECT fm.* FROM public.family_members fm
JOIN public.clients c ON c.id = fm.client_id
WHERE c.clerk_user_id = '클라이언트_A의_Clerk_User_ID';

-- ============================================
-- 8. emergency_contacts 테이블 RLS 테스트
-- ============================================

-- 에이전트 A로 로그인한 상태에서
-- 자신의 클라이언트의 비상연락망 조회 (성공해야 함)
SELECT ec.* FROM public.emergency_contacts ec
JOIN public.clients c ON c.id = ec.client_id
JOIN public.accounts a ON a.id = c.owner_agent_id
WHERE a.clerk_user_id = '에이전트_A의_Clerk_User_ID';

-- 클라이언트 A로 로그인한 상태에서
-- 자신의 비상연락망 조회 (성공해야 함)
SELECT ec.* FROM public.emergency_contacts ec
JOIN public.clients c ON c.id = ec.client_id
WHERE c.clerk_user_id = '클라이언트_A의_Clerk_User_ID';

-- ============================================
-- 9. INSERT 테스트 (WITH CHECK 절 확인)
-- ============================================

-- 에이전트 A로 로그인한 상태에서
-- 자신의 클라이언트에 대한 주거 요구사항 생성 시도 (성공해야 함)
-- 주의: 실제로 실행하지 말고, 쿼리만 확인하세요.
/*
INSERT INTO public.housing_requirements (client_id, preferred_city, budget_max)
VALUES (
  '에이전트_A의_클라이언트_ID',
  'Test City',
  2000
);
*/

-- 에이전트 A로 로그인한 상태에서
-- 에이전트 B의 클라이언트에 대한 주거 요구사항 생성 시도 (실패해야 함)
-- 주의: 실제로 실행하지 말고, 쿼리만 확인하세요.
/*
INSERT INTO public.housing_requirements (client_id, preferred_city, budget_max)
VALUES (
  '에이전트_B의_클라이언트_ID',
  'Test City',
  2000
);
-- 예상 결과: RLS 정책 위반 에러
*/

-- ============================================
-- 10. UPDATE 테스트 (USING 절 확인)
-- ============================================

-- 에이전트 A로 로그인한 상태에서
-- 자신의 클라이언트 정보 수정 시도 (성공해야 함)
-- 주의: 실제로 실행하지 말고, 쿼리만 확인하세요.
/*
UPDATE public.clients
SET name = 'Updated Name'
WHERE id = '에이전트_A의_클라이언트_ID'
AND owner_agent_id IN (
  SELECT id FROM public.accounts WHERE clerk_user_id = '에이전트_A의_Clerk_User_ID'
);
*/

-- 에이전트 A로 로그인한 상태에서
-- 에이전트 B의 클라이언트 정보 수정 시도 (실패해야 함 - 영향받는 행 없음)
-- 주의: 실제로 실행하지 말고, 쿼리만 확인하세요.
/*
UPDATE public.clients
SET name = 'Updated Name'
WHERE id = '에이전트_B의_클라이언트_ID';
-- 예상 결과: 영향받는 행 0개 (RLS 정책에 의해 차단)
*/

-- ============================================
-- 11. DELETE 테스트 (USING 절 확인)
-- ============================================

-- 에이전트 A로 로그인한 상태에서
-- 자신의 클라이언트의 문서 삭제 시도 (성공해야 함)
-- 주의: 실제로 실행하지 말고, 쿼리만 확인하세요.
/*
DELETE FROM public.client_documents
WHERE id = '에이전트_A의_클라이언트_문서_ID'
AND client_id IN (
  SELECT c.id FROM public.clients c
  JOIN public.accounts a ON a.id = c.owner_agent_id
  WHERE a.clerk_user_id = '에이전트_A의_Clerk_User_ID'
);
*/

-- 에이전트 A로 로그인한 상태에서
-- 에이전트 B의 클라이언트의 문서 삭제 시도 (실패해야 함 - 영향받는 행 없음)
-- 주의: 실제로 실행하지 말고, 쿼리만 확인하세요.
/*
DELETE FROM public.client_documents
WHERE id = '에이전트_B의_클라이언트_문서_ID';
-- 예상 결과: 영향받는 행 0개 (RLS 정책에 의해 차단)
*/


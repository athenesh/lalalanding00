-- accounts 테이블의 RLS 정책 수정
-- 문제: Clerk JWT 토큰에는 metadata->role 필드가 없어서 accounts 테이블 조회 실패
-- 해결: role 체크를 제거하고 clerk_user_id만 확인하도록 수정

-- ============================================
-- accounts 테이블 정책 수정
-- ============================================

-- SELECT 정책: role 체크 제거
DROP POLICY IF EXISTS "Agents can view own account" ON public.accounts;
CREATE POLICY "Agents can view own account"
  ON public.accounts FOR SELECT
  TO authenticated
  USING (
    clerk_user_id = ((select auth.jwt())->>'sub')
  );

-- UPDATE 정책: role 체크 제거
DROP POLICY IF EXISTS "Agents can update own account" ON public.accounts;
CREATE POLICY "Agents can update own account"
  ON public.accounts FOR UPDATE
  TO authenticated
  USING (
    clerk_user_id = ((select auth.jwt())->>'sub')
  );

-- INSERT 정책은 이미 올바르게 설정되어 있음 (role 체크 없음)


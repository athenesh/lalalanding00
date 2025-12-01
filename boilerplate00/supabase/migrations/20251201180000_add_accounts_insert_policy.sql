-- accounts 테이블에 INSERT 정책 추가
-- 인증된 사용자가 자신의 계정을 생성할 수 있도록 허용

-- 에이전트는 자신의 계정을 생성할 수 있음
CREATE POLICY "Agents can create own account"
  ON public.accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    clerk_user_id = (auth.jwt()->>'sub')
  );


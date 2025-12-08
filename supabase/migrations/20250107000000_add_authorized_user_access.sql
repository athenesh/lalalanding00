-- 권한 부여된 사용자(배우자 등)가 클라이언트 데이터에 접근할 수 있도록 RLS 정책 업데이트
-- client_authorizations 테이블을 통해 권한이 부여된 사용자는 클라이언트와 동일한 권한을 가짐

-- ============================================
-- housing_requirements 테이블: 권한 부여된 사용자 접근 추가
-- ============================================

-- SELECT 정책 통합: 기존 정책들을 하나로 통합
DROP POLICY IF EXISTS "Users can view housing for their clients" ON public.housing_requirements;
DROP POLICY IF EXISTS "Clients can view own housing" ON public.housing_requirements;
CREATE POLICY "Users can view housing for their clients"
  ON public.housing_requirements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = housing_requirements.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 주거 요구사항 조회
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 주거 요구사항 조회
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        -- 권한 부여된 사용자: 권한이 부여된 클라이언트의 주거 요구사항 조회
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );

-- UPDATE 정책 통합: 기존 정책들을 하나로 통합
DROP POLICY IF EXISTS "Users can update housing for their clients" ON public.housing_requirements;
DROP POLICY IF EXISTS "Clients can update own housing" ON public.housing_requirements;
CREATE POLICY "Users can update housing for their clients"
  ON public.housing_requirements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = housing_requirements.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 주거 요구사항 수정
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 주거 요구사항 수정
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        -- 권한 부여된 사용자: 권한이 부여된 클라이언트의 주거 요구사항 수정
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );

-- INSERT 정책 통합: 기존 정책들을 하나로 통합
DROP POLICY IF EXISTS "Users can insert housing for their clients" ON public.housing_requirements;
DROP POLICY IF EXISTS "Clients can insert own housing" ON public.housing_requirements;
CREATE POLICY "Users can insert housing for their clients"
  ON public.housing_requirements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = housing_requirements.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 주거 요구사항 생성
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 주거 요구사항 생성
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        -- 권한 부여된 사용자: 권한이 부여된 클라이언트의 주거 요구사항 생성
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );

-- ============================================
-- checklist_items 테이블: 권한 부여된 사용자 접근 추가
-- ============================================

-- SELECT 정책 통합: 기존 정책들을 하나로 통합
DROP POLICY IF EXISTS "Users can view checklist for their clients" ON public.checklist_items;
DROP POLICY IF EXISTS "Clients can view own checklist" ON public.checklist_items;
CREATE POLICY "Users can view checklist for their clients"
  ON public.checklist_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = checklist_items.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 체크리스트 조회
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 체크리스트 조회
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        -- 권한 부여된 사용자: 권한이 부여된 클라이언트의 체크리스트 조회
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );

-- UPDATE 정책 통합: 기존 정책들을 하나로 통합
DROP POLICY IF EXISTS "Users can update checklist for their clients" ON public.checklist_items;
DROP POLICY IF EXISTS "Clients can update own checklist" ON public.checklist_items;
CREATE POLICY "Users can update checklist for their clients"
  ON public.checklist_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = checklist_items.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 체크리스트 수정
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 체크리스트 수정
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        -- 권한 부여된 사용자: 권한이 부여된 클라이언트의 체크리스트 수정
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );

-- INSERT 정책 업데이트: 권한 부여된 사용자도 생성 가능 (기존 정책에 권한 부여된 사용자 조건 추가)
DROP POLICY IF EXISTS "Users can insert checklist for their clients" ON public.checklist_items;
CREATE POLICY "Users can insert checklist for their clients"
  ON public.checklist_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = checklist_items.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 체크리스트 생성
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 체크리스트 생성
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        -- 권한 부여된 사용자: 권한이 부여된 클라이언트의 체크리스트 생성
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );

-- ============================================
-- messages 테이블: 권한 부여된 사용자 접근 추가
-- ============================================

-- messages 테이블은 이미 권한 부여된 사용자를 포함하고 있으므로 업데이트 불필요
-- 기존 정책 확인:
-- "Users can view messages for their clients" - 이미 권한 부여된 사용자 포함
-- "Users can send messages" - 이미 권한 부여된 사용자 포함
-- 따라서 messages 테이블은 수정하지 않음

-- ============================================
-- shared_listings 테이블: 권한 부여된 사용자 접근 추가
-- 참고: shared_listings는 room_id 기반 구조이므로 chat_rooms를 통해 접근
-- ============================================

-- SELECT 정책 업데이트: 권한 부여된 사용자도 조회 가능
DROP POLICY IF EXISTS "Users can view listings in their chat rooms" ON public.shared_listings;
CREATE POLICY "Users can view listings in their chat rooms"
  ON public.shared_listings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      JOIN public.clients ON clients.id = chat_rooms.client_id
      WHERE chat_rooms.id = shared_listings.room_id
      AND (
        -- 에이전트: 자신의 클라이언트의 리스팅 조회
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 리스팅 조회
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        -- 권한 부여된 사용자: 권한이 부여된 클라이언트의 리스팅 조회
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );

-- UPDATE 정책 업데이트: 권한 부여된 사용자도 수정 가능 (메모 등)
DROP POLICY IF EXISTS "Users can update listings in their chat rooms" ON public.shared_listings;
CREATE POLICY "Users can update listings in their chat rooms"
  ON public.shared_listings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      JOIN public.clients ON clients.id = chat_rooms.client_id
      WHERE chat_rooms.id = shared_listings.room_id
      AND (
        -- 에이전트: 자신의 클라이언트의 리스팅 수정
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 리스팅 수정
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        -- 권한 부여된 사용자: 권한이 부여된 클라이언트의 리스팅 수정
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );

-- INSERT 정책 업데이트: 권한 부여된 사용자도 생성 가능
DROP POLICY IF EXISTS "Users can share listings" ON public.shared_listings;
CREATE POLICY "Users can share listings"
  ON public.shared_listings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      JOIN public.clients ON clients.id = chat_rooms.client_id
      WHERE chat_rooms.id = shared_listings.room_id
      AND (
        -- 에이전트: 자신의 클라이언트의 리스팅 생성
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 리스팅 생성
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        -- 권한 부여된 사용자: 권한이 부여된 클라이언트의 리스팅 생성
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
    -- 리스팅 공유자는 본인인지 확인
    AND shared_listings.shared_by = ((select auth.jwt())->>'sub')
  );

-- ============================================
-- clients 테이블: 권한 부여된 사용자 접근 (이미 구현되어 있을 수 있음)
-- ============================================

-- clients 테이블은 이미 권한 부여된 사용자를 포함하고 있으므로 업데이트 불필요
-- 기존 정책 확인:
-- "Clients can view own profile" - 이미 권한 부여된 사용자 포함
-- "Clients can update own profile" - 이미 권한 부여된 사용자 포함
-- 따라서 clients 테이블은 수정하지 않음


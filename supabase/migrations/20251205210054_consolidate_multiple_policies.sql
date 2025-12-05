-- 다중 정책 통합: 같은 역할과 액션에 대한 여러 정책을 하나로 통합
-- 성능 향상을 위해 각 정책을 OR 조건으로 통합

-- ============================================
-- housing_requirements 테이블: SELECT, INSERT, UPDATE 통합
-- ============================================

-- SELECT 통합: 에이전트와 클라이언트 정책 통합
DROP POLICY IF EXISTS "Agents can view housing for own clients" ON public.housing_requirements;
DROP POLICY IF EXISTS "Clients can view own housing" ON public.housing_requirements;
CREATE POLICY "Users can view housing for their clients"
  ON public.housing_requirements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = housing_requirements.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 주거 요구사항
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 주거 요구사항
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  );

-- INSERT 통합: 에이전트와 클라이언트 정책 통합
DROP POLICY IF EXISTS "Agents can insert housing for own clients" ON public.housing_requirements;
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
      )
    )
  );

-- UPDATE 통합: 에이전트와 클라이언트 정책 통합
DROP POLICY IF EXISTS "Agents can update housing for own clients" ON public.housing_requirements;
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
      )
    )
  );

-- ============================================
-- checklist_items 테이블: SELECT, INSERT, UPDATE 통합
-- ============================================

-- SELECT 통합: 에이전트와 클라이언트 정책 통합
DROP POLICY IF EXISTS "Agents can view checklist for own clients" ON public.checklist_items;
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
      )
    )
  );

-- INSERT 통합: 에이전트와 클라이언트 정책 통합
DROP POLICY IF EXISTS "Agents can insert checklist for own clients" ON public.checklist_items;
DROP POLICY IF EXISTS "Clients can insert own checklist" ON public.checklist_items;
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
      )
    )
  );

-- UPDATE 통합: 에이전트와 클라이언트 정책 통합
DROP POLICY IF EXISTS "Agents can update checklist for own clients" ON public.checklist_items;
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
      )
    )
  );

-- ============================================
-- client_documents 테이블: SELECT, INSERT, DELETE 통합
-- ============================================

-- SELECT 통합: 에이전트와 클라이언트 정책 통합
DROP POLICY IF EXISTS "Agents can view documents for own clients" ON public.client_documents;
DROP POLICY IF EXISTS "Clients can view own documents" ON public.client_documents;
CREATE POLICY "Users can view documents for their clients"
  ON public.client_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = client_documents.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 문서 조회
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 문서 조회
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  );

-- INSERT 통합: 에이전트와 클라이언트 정책 통합
DROP POLICY IF EXISTS "Agents can upload documents for own clients" ON public.client_documents;
DROP POLICY IF EXISTS "Clients can insert own documents" ON public.client_documents;
CREATE POLICY "Users can insert documents for their clients"
  ON public.client_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = client_documents.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 문서 업로드
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 문서 업로드
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  );

-- DELETE 통합: 에이전트와 클라이언트 정책 통합
DROP POLICY IF EXISTS "Agents can delete documents for own clients" ON public.client_documents;
DROP POLICY IF EXISTS "Clients can delete own documents" ON public.client_documents;
CREATE POLICY "Users can delete documents for their clients"
  ON public.client_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = client_documents.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 문서 삭제
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 문서 삭제
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  );

-- ============================================
-- clients 테이블: SELECT, INSERT, UPDATE 통합
-- ============================================

-- SELECT 통합: 에이전트와 클라이언트 정책 통합
-- 주의: "Agents can view own and unassigned clients"는 특별한 로직이 있으므로 유지
-- "Clients can view own profile"만 통합
-- 실제로는 두 정책이 다른 조건이므로 통합하지 않음 (에이전트는 할당되지 않은 클라이언트도 볼 수 있음)
-- 따라서 이 테이블은 통합하지 않음

-- INSERT 통합: 에이전트와 클라이언트 정책 통합
-- 주의: "Agents can create clients"와 "Clients can create own record"는 다른 조건이므로 통합하지 않음
-- 에이전트는 owner_agent_id가 NOT NULL이어야 하고, 클라이언트는 NULL이어야 함

-- UPDATE 통합: 에이전트와 클라이언트 정책 통합
-- 주의: "Agents can update own clients", "Agents can assign unassigned clients", "Clients can update own profile"는 다른 조건이므로 통합하지 않음

-- ============================================
-- family_members 테이블: SELECT, INSERT, UPDATE, DELETE 통합
-- ============================================

-- SELECT 통합: 에이전트와 클라이언트 정책 통합
DROP POLICY IF EXISTS "Agents can view family for own clients" ON public.family_members;
DROP POLICY IF EXISTS "Clients can view own family" ON public.family_members;
CREATE POLICY "Users can view family for their clients"
  ON public.family_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = family_members.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 가족 구성원 조회
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 가족 구성원 조회
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  );

-- INSERT 통합: 에이전트와 클라이언트 정책 통합
DROP POLICY IF EXISTS "Agents can manage family for own clients" ON public.family_members;
DROP POLICY IF EXISTS "Clients can manage own family" ON public.family_members;
CREATE POLICY "Users can insert family for their clients"
  ON public.family_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = family_members.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 가족 구성원 생성
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 가족 구성원 생성
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  );

-- UPDATE 통합: 에이전트와 클라이언트 정책 통합
DROP POLICY IF EXISTS "Agents can update family for own clients" ON public.family_members;
DROP POLICY IF EXISTS "Clients can update own family" ON public.family_members;
CREATE POLICY "Users can update family for their clients"
  ON public.family_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = family_members.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 가족 구성원 수정
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 가족 구성원 수정
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  );

-- DELETE 통합: 에이전트와 클라이언트 정책 통합
DROP POLICY IF EXISTS "Agents can delete family for own clients" ON public.family_members;
DROP POLICY IF EXISTS "Clients can delete own family" ON public.family_members;
CREATE POLICY "Users can delete family for their clients"
  ON public.family_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = family_members.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 가족 구성원 삭제
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 가족 구성원 삭제
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  );

-- ============================================
-- emergency_contacts 테이블: SELECT, INSERT, UPDATE, DELETE 통합
-- ============================================

-- SELECT 통합: 에이전트와 클라이언트 정책 통합
DROP POLICY IF EXISTS "Agents can view emergency contacts for own clients" ON public.emergency_contacts;
DROP POLICY IF EXISTS "Clients can view own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can view emergency contacts for their clients"
  ON public.emergency_contacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = emergency_contacts.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 비상연락망 조회
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 비상연락망 조회
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  );

-- INSERT 통합: 에이전트와 클라이언트 정책 통합
DROP POLICY IF EXISTS "Agents can manage emergency contacts for own clients" ON public.emergency_contacts;
DROP POLICY IF EXISTS "Clients can manage own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can insert emergency contacts for their clients"
  ON public.emergency_contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = emergency_contacts.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 비상연락망 생성
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 비상연락망 생성
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  );

-- UPDATE 통합: 에이전트와 클라이언트 정책 통합
DROP POLICY IF EXISTS "Agents can update emergency contacts for own clients" ON public.emergency_contacts;
DROP POLICY IF EXISTS "Clients can update own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can update emergency contacts for their clients"
  ON public.emergency_contacts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = emergency_contacts.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 비상연락망 수정
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 비상연락망 수정
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  );

-- DELETE 통합: 에이전트와 클라이언트 정책 통합
DROP POLICY IF EXISTS "Agents can delete emergency contacts for own clients" ON public.emergency_contacts;
DROP POLICY IF EXISTS "Clients can delete own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can delete emergency contacts for their clients"
  ON public.emergency_contacts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = emergency_contacts.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 비상연락망 삭제
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 비상연락망 삭제
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  );

-- ============================================
-- chat_rooms 테이블: SELECT, INSERT, UPDATE 통합
-- ============================================

-- SELECT 통합: 에이전트와 클라이언트 정책 통합
DROP POLICY IF EXISTS "Agents can view chat rooms for own clients" ON public.chat_rooms;
DROP POLICY IF EXISTS "Clients can view own chat rooms" ON public.chat_rooms;
CREATE POLICY "Users can view chat rooms for their clients"
  ON public.chat_rooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = chat_rooms.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 채팅방 조회
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 채팅방 조회
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  );

-- INSERT 통합: 에이전트와 클라이언트 정책 통합
DROP POLICY IF EXISTS "Agents can manage chat rooms for own clients" ON public.chat_rooms;
DROP POLICY IF EXISTS "Clients can manage own chat rooms" ON public.chat_rooms;
CREATE POLICY "Users can insert chat rooms for their clients"
  ON public.chat_rooms FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = chat_rooms.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 채팅방 생성
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 채팅방 생성
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  );

-- UPDATE 통합: 에이전트와 클라이언트 정책 통합
DROP POLICY IF EXISTS "Agents can update chat rooms for own clients" ON public.chat_rooms;
DROP POLICY IF EXISTS "Clients can update own chat rooms" ON public.chat_rooms;
CREATE POLICY "Users can update chat rooms for their clients"
  ON public.chat_rooms FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = chat_rooms.client_id
      AND (
        -- 에이전트: 자신의 클라이언트의 채팅방 수정
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 채팅방 수정
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  );


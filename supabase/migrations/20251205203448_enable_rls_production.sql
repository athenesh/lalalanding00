-- 프로덕션 환경을 위한 RLS 활성화 마이그레이션
-- 모든 테이블에 Row Level Security 활성화 및 누락된 정책 추가

-- ============================================
-- 1. 모든 테이블에 RLS 활성화
-- ============================================

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housing_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. 정책이 없는 테이블에 대한 RLS 정책 추가
-- ============================================

-- checklist_templates: 읽기 전용 템플릿 (모든 인증된 사용자가 읽을 수 있음)
DROP POLICY IF EXISTS "Authenticated users can view checklist templates" ON public.checklist_templates;
CREATE POLICY "Authenticated users can view checklist templates"
  ON public.checklist_templates FOR SELECT
  TO authenticated
  USING (true);

-- family_members: 클라이언트의 가족 구성원 정보
-- 에이전트는 자신의 클라이언트의 가족 구성원 조회
DROP POLICY IF EXISTS "Agents can view family for own clients" ON public.family_members;
CREATE POLICY "Agents can view family for own clients"
  ON public.family_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = family_members.client_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 클라이언트는 자신의 가족 구성원 조회
DROP POLICY IF EXISTS "Clients can view own family" ON public.family_members;
CREATE POLICY "Clients can view own family"
  ON public.family_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = family_members.client_id
      AND clients.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 에이전트는 자신의 클라이언트의 가족 구성원 생성/수정
DROP POLICY IF EXISTS "Agents can manage family for own clients" ON public.family_members;
CREATE POLICY "Agents can manage family for own clients"
  ON public.family_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = family_members.client_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

DROP POLICY IF EXISTS "Agents can update family for own clients" ON public.family_members;
CREATE POLICY "Agents can update family for own clients"
  ON public.family_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = family_members.client_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

DROP POLICY IF EXISTS "Agents can delete family for own clients" ON public.family_members;
CREATE POLICY "Agents can delete family for own clients"
  ON public.family_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = family_members.client_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 클라이언트는 자신의 가족 구성원 생성/수정
DROP POLICY IF EXISTS "Clients can manage own family" ON public.family_members;
CREATE POLICY "Clients can manage own family"
  ON public.family_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = family_members.client_id
      AND clients.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

DROP POLICY IF EXISTS "Clients can update own family" ON public.family_members;
CREATE POLICY "Clients can update own family"
  ON public.family_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = family_members.client_id
      AND clients.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

DROP POLICY IF EXISTS "Clients can delete own family" ON public.family_members;
CREATE POLICY "Clients can delete own family"
  ON public.family_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = family_members.client_id
      AND clients.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- emergency_contacts: 클라이언트의 비상연락망 정보
-- 에이전트는 자신의 클라이언트의 비상연락망 조회
DROP POLICY IF EXISTS "Agents can view emergency contacts for own clients" ON public.emergency_contacts;
CREATE POLICY "Agents can view emergency contacts for own clients"
  ON public.emergency_contacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = emergency_contacts.client_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 클라이언트는 자신의 비상연락망 조회
DROP POLICY IF EXISTS "Clients can view own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Clients can view own emergency contacts"
  ON public.emergency_contacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = emergency_contacts.client_id
      AND clients.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 에이전트는 자신의 클라이언트의 비상연락망 생성/수정
DROP POLICY IF EXISTS "Agents can manage emergency contacts for own clients" ON public.emergency_contacts;
CREATE POLICY "Agents can manage emergency contacts for own clients"
  ON public.emergency_contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = emergency_contacts.client_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

DROP POLICY IF EXISTS "Agents can update emergency contacts for own clients" ON public.emergency_contacts;
CREATE POLICY "Agents can update emergency contacts for own clients"
  ON public.emergency_contacts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = emergency_contacts.client_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

DROP POLICY IF EXISTS "Agents can delete emergency contacts for own clients" ON public.emergency_contacts;
CREATE POLICY "Agents can delete emergency contacts for own clients"
  ON public.emergency_contacts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = emergency_contacts.client_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 클라이언트는 자신의 비상연락망 생성/수정
DROP POLICY IF EXISTS "Clients can manage own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Clients can manage own emergency contacts"
  ON public.emergency_contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = emergency_contacts.client_id
      AND clients.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

DROP POLICY IF EXISTS "Clients can update own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Clients can update own emergency contacts"
  ON public.emergency_contacts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = emergency_contacts.client_id
      AND clients.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

DROP POLICY IF EXISTS "Clients can delete own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Clients can delete own emergency contacts"
  ON public.emergency_contacts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = emergency_contacts.client_id
      AND clients.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- chat_rooms: 채팅방 정보
-- 에이전트는 자신의 클라이언트의 채팅방 조회
DROP POLICY IF EXISTS "Agents can view chat rooms for own clients" ON public.chat_rooms;
CREATE POLICY "Agents can view chat rooms for own clients"
  ON public.chat_rooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = chat_rooms.client_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 클라이언트는 자신의 채팅방 조회
DROP POLICY IF EXISTS "Clients can view own chat rooms" ON public.chat_rooms;
CREATE POLICY "Clients can view own chat rooms"
  ON public.chat_rooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = chat_rooms.client_id
      AND clients.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 에이전트는 자신의 클라이언트의 채팅방 생성/수정
DROP POLICY IF EXISTS "Agents can manage chat rooms for own clients" ON public.chat_rooms;
CREATE POLICY "Agents can manage chat rooms for own clients"
  ON public.chat_rooms FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = chat_rooms.client_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

DROP POLICY IF EXISTS "Agents can update chat rooms for own clients" ON public.chat_rooms;
CREATE POLICY "Agents can update chat rooms for own clients"
  ON public.chat_rooms FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = chat_rooms.client_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 클라이언트는 자신의 채팅방 생성/수정
DROP POLICY IF EXISTS "Clients can manage own chat rooms" ON public.chat_rooms;
CREATE POLICY "Clients can manage own chat rooms"
  ON public.chat_rooms FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = chat_rooms.client_id
      AND clients.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

DROP POLICY IF EXISTS "Clients can update own chat rooms" ON public.chat_rooms;
CREATE POLICY "Clients can update own chat rooms"
  ON public.chat_rooms FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = chat_rooms.client_id
      AND clients.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- chat_messages: 채팅 메시지
-- 에이전트와 클라이언트는 해당 채팅방의 메시지 조회
DROP POLICY IF EXISTS "Users can view messages in their chat rooms" ON public.chat_messages;
CREATE POLICY "Users can view messages in their chat rooms"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      JOIN public.clients ON clients.id = chat_rooms.client_id
      WHERE chat_rooms.id = chat_messages.room_id
      AND (
        clients.owner_agent_id IN (
          SELECT id FROM public.accounts
          WHERE clerk_user_id = (auth.jwt()->>'sub')
        )
        OR clients.clerk_user_id = (auth.jwt()->>'sub')
      )
    )
  );

-- 에이전트와 클라이언트는 메시지 전송 가능
DROP POLICY IF EXISTS "Users can send chat messages" ON public.chat_messages;
CREATE POLICY "Users can send chat messages"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      JOIN public.clients ON clients.id = chat_rooms.client_id
      WHERE chat_rooms.id = chat_messages.room_id
      AND (
        clients.owner_agent_id IN (
          SELECT id FROM public.accounts
          WHERE clerk_user_id = (auth.jwt()->>'sub')
        )
        OR clients.clerk_user_id = (auth.jwt()->>'sub')
      )
    )
    AND sender_clerk_id = (auth.jwt()->>'sub')
  );

-- agent_notes: 에이전트 전용 메모
-- 에이전트는 자신의 메모만 조회
DROP POLICY IF EXISTS "Agents can view own notes" ON public.agent_notes;
CREATE POLICY "Agents can view own notes"
  ON public.agent_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = agent_notes.agent_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 에이전트는 자신의 메모 생성/수정/삭제
DROP POLICY IF EXISTS "Agents can manage own notes" ON public.agent_notes;
CREATE POLICY "Agents can manage own notes"
  ON public.agent_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = agent_notes.agent_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

DROP POLICY IF EXISTS "Agents can update own notes" ON public.agent_notes;
CREATE POLICY "Agents can update own notes"
  ON public.agent_notes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = agent_notes.agent_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

DROP POLICY IF EXISTS "Agents can delete own notes" ON public.agent_notes;
CREATE POLICY "Agents can delete own notes"
  ON public.agent_notes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = agent_notes.agent_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- shared_listings: 공유된 리스팅 정보
-- 에이전트와 클라이언트는 해당 채팅방의 리스팅 조회
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
        clients.owner_agent_id IN (
          SELECT id FROM public.accounts
          WHERE clerk_user_id = (auth.jwt()->>'sub')
        )
        OR clients.clerk_user_id = (auth.jwt()->>'sub')
      )
    )
  );

-- 에이전트와 클라이언트는 리스팅 공유 가능
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
        clients.owner_agent_id IN (
          SELECT id FROM public.accounts
          WHERE clerk_user_id = (auth.jwt()->>'sub')
        )
        OR clients.clerk_user_id = (auth.jwt()->>'sub')
      )
    )
    AND shared_by = (auth.jwt()->>'sub')
  );

-- 에이전트와 클라이언트는 리스팅 업데이트 가능 (북마크 등)
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
        clients.owner_agent_id IN (
          SELECT id FROM public.accounts
          WHERE clerk_user_id = (auth.jwt()->>'sub')
        )
        OR clients.clerk_user_id = (auth.jwt()->>'sub')
      )
    )
  );

-- users: 레거시 users 테이블 (Clerk 동기화용)
-- 사용자는 자신의 정보만 조회/수정
DROP POLICY IF EXISTS "Users can view own record" ON public.users;
CREATE POLICY "Users can view own record"
  ON public.users FOR SELECT
  TO authenticated
  USING (clerk_id = (auth.jwt()->>'sub'));

DROP POLICY IF EXISTS "Users can update own record" ON public.users;
CREATE POLICY "Users can update own record"
  ON public.users FOR UPDATE
  TO authenticated
  USING (clerk_id = (auth.jwt()->>'sub'));

DROP POLICY IF EXISTS "Users can create own record" ON public.users;
CREATE POLICY "Users can create own record"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (clerk_id = (auth.jwt()->>'sub'));

-- ============================================
-- 3. 에이전트가 client_documents도 조회할 수 있도록 정책 추가
-- ============================================

-- 에이전트는 자신의 클라이언트의 문서 조회
DROP POLICY IF EXISTS "Agents can view documents for own clients" ON public.client_documents;
CREATE POLICY "Agents can view documents for own clients"
  ON public.client_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = client_documents.client_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 에이전트는 자신의 클라이언트의 문서 업로드 가능
DROP POLICY IF EXISTS "Agents can upload documents for own clients" ON public.client_documents;
CREATE POLICY "Agents can upload documents for own clients"
  ON public.client_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = client_documents.client_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 에이전트는 자신의 클라이언트의 문서 삭제 가능
DROP POLICY IF EXISTS "Agents can delete documents for own clients" ON public.client_documents;
CREATE POLICY "Agents can delete documents for own clients"
  ON public.client_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = client_documents.client_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

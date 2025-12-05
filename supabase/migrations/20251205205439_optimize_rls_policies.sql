-- RLS 정책 성능 최적화: auth.jwt() 호출을 (select auth.jwt())로 변경
-- 쿼리 계획 캐싱을 개선하여 대규모 쿼리 성능 향상

-- ============================================
-- accounts 테이블 정책 최적화
-- ============================================

DROP POLICY IF EXISTS "Agents can view own account" ON public.accounts;
CREATE POLICY "Agents can view own account"
  ON public.accounts FOR SELECT
  TO authenticated
  USING (
    ((select auth.jwt())->'metadata'->>'role') = 'agent'
    AND clerk_user_id = ((select auth.jwt())->>'sub')
  );

DROP POLICY IF EXISTS "Agents can update own account" ON public.accounts;
CREATE POLICY "Agents can update own account"
  ON public.accounts FOR UPDATE
  TO authenticated
  USING (
    ((select auth.jwt())->'metadata'->>'role') = 'agent'
    AND clerk_user_id = ((select auth.jwt())->>'sub')
  );

DROP POLICY IF EXISTS "Agents can create own account" ON public.accounts;
CREATE POLICY "Agents can create own account"
  ON public.accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    clerk_user_id = ((select auth.jwt())->>'sub')
  );

-- ============================================
-- clients 테이블 정책 최적화
-- ============================================

DROP POLICY IF EXISTS "Agents can view own and unassigned clients" ON public.clients;
CREATE POLICY "Agents can view own and unassigned clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    (
      owner_agent_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.accounts
        WHERE accounts.id = clients.owner_agent_id
        AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
    OR
    (owner_agent_id IS NULL)
  );

DROP POLICY IF EXISTS "Clients can view own profile" ON public.clients;
CREATE POLICY "Clients can view own profile"
  ON public.clients FOR SELECT
  TO authenticated
  USING (clerk_user_id = ((select auth.jwt())->>'sub'));

DROP POLICY IF EXISTS "Agents can create clients" ON public.clients;
CREATE POLICY "Agents can create clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_agent_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = clients.owner_agent_id
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Clients can create own record" ON public.clients;
CREATE POLICY "Clients can create own record"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_agent_id IS NULL
    AND clerk_user_id = ((select auth.jwt())->>'sub')
  );

DROP POLICY IF EXISTS "Agents can update own clients" ON public.clients;
CREATE POLICY "Agents can update own clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    owner_agent_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = clients.owner_agent_id
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Clients can update own profile" ON public.clients;
CREATE POLICY "Clients can update own profile"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (clerk_user_id = ((select auth.jwt())->>'sub'));

DROP POLICY IF EXISTS "Agents can assign unassigned clients" ON public.clients;
CREATE POLICY "Agents can assign unassigned clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    owner_agent_id IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = clients.owner_agent_id
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

-- ============================================
-- housing_requirements 테이블 정책 최적화
-- ============================================

DROP POLICY IF EXISTS "Agents can view housing for own clients" ON public.housing_requirements;
CREATE POLICY "Agents can view housing for own clients"
  ON public.housing_requirements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = housing_requirements.client_id
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Agents can update housing for own clients" ON public.housing_requirements;
CREATE POLICY "Agents can update housing for own clients"
  ON public.housing_requirements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = housing_requirements.client_id
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Agents can insert housing for own clients" ON public.housing_requirements;
CREATE POLICY "Agents can insert housing for own clients"
  ON public.housing_requirements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = housing_requirements.client_id
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Clients can view own housing" ON public.housing_requirements;
CREATE POLICY "Clients can view own housing"
  ON public.housing_requirements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = housing_requirements.client_id
      AND clients.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Clients can update own housing" ON public.housing_requirements;
CREATE POLICY "Clients can update own housing"
  ON public.housing_requirements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = housing_requirements.client_id
      AND clients.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Clients can insert own housing" ON public.housing_requirements;
CREATE POLICY "Clients can insert own housing"
  ON public.housing_requirements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = housing_requirements.client_id
      AND clients.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

-- ============================================
-- checklist_items 테이블 정책 최적화
-- ============================================

DROP POLICY IF EXISTS "Agents can view checklist for own clients" ON public.checklist_items;
CREATE POLICY "Agents can view checklist for own clients"
  ON public.checklist_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = checklist_items.client_id
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Agents can update checklist for own clients" ON public.checklist_items;
CREATE POLICY "Agents can update checklist for own clients"
  ON public.checklist_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = checklist_items.client_id
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Agents can insert checklist for own clients" ON public.checklist_items;
CREATE POLICY "Agents can insert checklist for own clients"
  ON public.checklist_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = checklist_items.client_id
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Clients can view own checklist" ON public.checklist_items;
CREATE POLICY "Clients can view own checklist"
  ON public.checklist_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = checklist_items.client_id
      AND clients.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Clients can update own checklist" ON public.checklist_items;
CREATE POLICY "Clients can update own checklist"
  ON public.checklist_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = checklist_items.client_id
      AND clients.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Clients can insert own checklist" ON public.checklist_items;
CREATE POLICY "Clients can insert own checklist"
  ON public.checklist_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = checklist_items.client_id
      AND clients.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

-- ============================================
-- messages 테이블 정책 최적화
-- ============================================

DROP POLICY IF EXISTS "Users can view messages for their clients" ON public.messages;
CREATE POLICY "Users can view messages for their clients"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = messages.client_id
      AND (
        clients.owner_agent_id IN (
          SELECT id FROM public.accounts
          WHERE clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR clients.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  );

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = messages.client_id
      AND (
        clients.owner_agent_id IN (
          SELECT id FROM public.accounts
          WHERE clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR clients.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
    AND sender_clerk_id = ((select auth.jwt())->>'sub')
  );

-- ============================================
-- client_documents 테이블 정책 최적화
-- ============================================

DROP POLICY IF EXISTS "Clients can view own documents" ON public.client_documents;
CREATE POLICY "Clients can view own documents"
  ON public.client_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = client_documents.client_id
      AND clients.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Clients can insert own documents" ON public.client_documents;
CREATE POLICY "Clients can insert own documents"
  ON public.client_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = client_documents.client_id
      AND clients.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Clients can delete own documents" ON public.client_documents;
CREATE POLICY "Clients can delete own documents"
  ON public.client_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = client_documents.client_id
      AND clients.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Agents can view documents for own clients" ON public.client_documents;
CREATE POLICY "Agents can view documents for own clients"
  ON public.client_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = client_documents.client_id
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Agents can upload documents for own clients" ON public.client_documents;
CREATE POLICY "Agents can upload documents for own clients"
  ON public.client_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = client_documents.client_id
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Agents can delete documents for own clients" ON public.client_documents;
CREATE POLICY "Agents can delete documents for own clients"
  ON public.client_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = client_documents.client_id
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

-- ============================================
-- family_members 테이블 정책 최적화
-- ============================================

DROP POLICY IF EXISTS "Agents can view family for own clients" ON public.family_members;
CREATE POLICY "Agents can view family for own clients"
  ON public.family_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = family_members.client_id
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Clients can view own family" ON public.family_members;
CREATE POLICY "Clients can view own family"
  ON public.family_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = family_members.client_id
      AND clients.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Agents can manage family for own clients" ON public.family_members;
CREATE POLICY "Agents can manage family for own clients"
  ON public.family_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = family_members.client_id
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
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
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
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
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Clients can manage own family" ON public.family_members;
CREATE POLICY "Clients can manage own family"
  ON public.family_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = family_members.client_id
      AND clients.clerk_user_id = ((select auth.jwt())->>'sub')
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
      AND clients.clerk_user_id = ((select auth.jwt())->>'sub')
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
      AND clients.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

-- ============================================
-- emergency_contacts 테이블 정책 최적화
-- ============================================

DROP POLICY IF EXISTS "Agents can view emergency contacts for own clients" ON public.emergency_contacts;
CREATE POLICY "Agents can view emergency contacts for own clients"
  ON public.emergency_contacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = emergency_contacts.client_id
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Clients can view own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Clients can view own emergency contacts"
  ON public.emergency_contacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = emergency_contacts.client_id
      AND clients.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Agents can manage emergency contacts for own clients" ON public.emergency_contacts;
CREATE POLICY "Agents can manage emergency contacts for own clients"
  ON public.emergency_contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = emergency_contacts.client_id
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
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
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
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
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Clients can manage own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Clients can manage own emergency contacts"
  ON public.emergency_contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = emergency_contacts.client_id
      AND clients.clerk_user_id = ((select auth.jwt())->>'sub')
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
      AND clients.clerk_user_id = ((select auth.jwt())->>'sub')
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
      AND clients.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

-- ============================================
-- chat_rooms 테이블 정책 최적화
-- ============================================

DROP POLICY IF EXISTS "Agents can view chat rooms for own clients" ON public.chat_rooms;
CREATE POLICY "Agents can view chat rooms for own clients"
  ON public.chat_rooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = chat_rooms.client_id
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Clients can view own chat rooms" ON public.chat_rooms;
CREATE POLICY "Clients can view own chat rooms"
  ON public.chat_rooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = chat_rooms.client_id
      AND clients.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Agents can manage chat rooms for own clients" ON public.chat_rooms;
CREATE POLICY "Agents can manage chat rooms for own clients"
  ON public.chat_rooms FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = chat_rooms.client_id
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
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
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Clients can manage own chat rooms" ON public.chat_rooms;
CREATE POLICY "Clients can manage own chat rooms"
  ON public.chat_rooms FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = chat_rooms.client_id
      AND clients.clerk_user_id = ((select auth.jwt())->>'sub')
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
      AND clients.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

-- ============================================
-- chat_messages 테이블 정책 최적화
-- ============================================

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
          WHERE clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR clients.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  );

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
          WHERE clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR clients.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
    AND sender_clerk_id = ((select auth.jwt())->>'sub')
  );

-- ============================================
-- agent_notes 테이블 정책 최적화
-- ============================================

DROP POLICY IF EXISTS "Agents can view own notes" ON public.agent_notes;
CREATE POLICY "Agents can view own notes"
  ON public.agent_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = agent_notes.agent_id
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

DROP POLICY IF EXISTS "Agents can manage own notes" ON public.agent_notes;
CREATE POLICY "Agents can manage own notes"
  ON public.agent_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = agent_notes.agent_id
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
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
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
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
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

-- ============================================
-- shared_listings 테이블 정책 최적화
-- ============================================

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
          WHERE clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR clients.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  );

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
          WHERE clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR clients.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
    AND shared_by = ((select auth.jwt())->>'sub')
  );

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
          WHERE clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR clients.clerk_user_id = ((select auth.jwt())->>'sub')
      )
    )
  );

-- ============================================
-- users 테이블 정책 최적화
-- ============================================

DROP POLICY IF EXISTS "Users can view own record" ON public.users;
CREATE POLICY "Users can view own record"
  ON public.users FOR SELECT
  TO authenticated
  USING (clerk_id = ((select auth.jwt())->>'sub'));

DROP POLICY IF EXISTS "Users can update own record" ON public.users;
CREATE POLICY "Users can update own record"
  ON public.users FOR UPDATE
  TO authenticated
  USING (clerk_id = ((select auth.jwt())->>'sub'));

DROP POLICY IF EXISTS "Users can create own record" ON public.users;
CREATE POLICY "Users can create own record"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (clerk_id = ((select auth.jwt())->>'sub'));

-- ============================================
-- Storage RLS 정책 최적화 (storage.objects)
-- ============================================

DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
);

DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
);

DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
);

DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
)
WITH CHECK (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
);


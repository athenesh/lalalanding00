-- chat_messages 및 chat_rooms 테이블에 권한 부여된 사용자 접근 추가
-- 권한 부여된 사용자(배우자 등)가 채팅 메시지를 조회하고 전송할 수 있도록 RLS 정책 업데이트

-- ============================================
-- chat_rooms 테이블: 권한 부여된 사용자 접근 추가
-- ============================================

-- SELECT 정책 업데이트: 권한 부여된 사용자도 조회 가능
DROP POLICY IF EXISTS "Users can view chat rooms for their clients" ON public.chat_rooms;
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
        OR
        -- 권한 부여된 사용자: 권한이 부여된 클라이언트의 채팅방 조회
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );

-- INSERT 정책 업데이트: 권한 부여된 사용자도 채팅방 생성 가능
DROP POLICY IF EXISTS "Users can insert chat rooms for their clients" ON public.chat_rooms;
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
        OR
        -- 권한 부여된 사용자: 권한이 부여된 클라이언트의 채팅방 생성
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );

-- UPDATE 정책 업데이트: 권한 부여된 사용자도 채팅방 수정 가능
DROP POLICY IF EXISTS "Users can update chat rooms for their clients" ON public.chat_rooms;
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
        OR
        -- 권한 부여된 사용자: 권한이 부여된 클라이언트의 채팅방 수정
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );

-- ============================================
-- chat_messages 테이블: 권한 부여된 사용자 접근 추가
-- ============================================

-- SELECT 정책 업데이트: 권한 부여된 사용자도 메시지 조회 가능
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
        -- 에이전트: 자신의 클라이언트의 메시지 조회
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 메시지 조회
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        -- 권한 부여된 사용자: 권한이 부여된 클라이언트의 메시지 조회
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );

-- INSERT 정책 업데이트: 권한 부여된 사용자도 메시지 전송 가능
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
        -- 에이전트: 자신의 클라이언트의 메시지 전송
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트: 자신의 메시지 전송
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        -- 권한 부여된 사용자: 권한이 부여된 클라이언트의 메시지 전송
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
    AND sender_clerk_id = ((select auth.jwt())->>'sub')
  );


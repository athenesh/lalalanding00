-- 미국 이주 지원 플랫폼 메인 스키마 생성
-- Phase 1 MVP를 위한 테이블 및 RLS 정책

-- accounts 테이블 (에이전트 계정)
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent',
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_accounts_clerk_user_id ON public.accounts(clerk_user_id);

-- clients 테이블 (클라이언트)
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_agent_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  clerk_user_id TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  occupation TEXT NOT NULL, -- 'doctor' | 'employee' | 'student'
  moving_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clients_owner_agent_id ON public.clients(owner_agent_id);
CREATE INDEX IF NOT EXISTS idx_clients_clerk_user_id ON public.clients(clerk_user_id);

-- housing_requirements 테이블 (주거 요구사항)
CREATE TABLE IF NOT EXISTS public.housing_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  preferred_city TEXT,
  budget_max INTEGER, -- USD/월
  housing_type TEXT, -- 'apartment' | 'house' | 'townhouse'
  bedrooms INTEGER,
  bathrooms DECIMAL(3,1), -- 1.5 등 지원
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_housing_requirements_client_id ON public.housing_requirements(client_id);

-- checklist_items 테이블 (체크리스트)
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'pre_departure' | 'arrival' | 'settlement'
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_checklist_items_client_id ON public.checklist_items(client_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_category ON public.checklist_items(category);

-- messages 테이블 (채팅 메시지)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sender_clerk_id TEXT NOT NULL,
  sender_type TEXT NOT NULL, -- 'agent' | 'client'
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_client_id ON public.messages(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- RLS 활성화
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housing_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS 정책: accounts 테이블
-- 에이전트는 자신의 정보만 조회
CREATE POLICY "Agents can view own account"
  ON public.accounts FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->'metadata'->>'role') = 'agent'
    AND clerk_user_id = (auth.jwt()->>'sub')
  );

-- 에이전트는 자신의 정보를 업데이트할 수 있음
CREATE POLICY "Agents can update own account"
  ON public.accounts FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->'metadata'->>'role') = 'agent'
    AND clerk_user_id = (auth.jwt()->>'sub')
  );

-- RLS 정책: clients 테이블
-- 에이전트는 자신의 클라이언트만 조회
CREATE POLICY "Agents can view own clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = clients.owner_agent_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 클라이언트는 자신의 정보만 조회
CREATE POLICY "Clients can view own profile"
  ON public.clients FOR SELECT
  TO authenticated
  USING (clerk_user_id = (auth.jwt()->>'sub'));

-- 에이전트는 자신의 클라이언트를 생성할 수 있음
CREATE POLICY "Agents can create clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = clients.owner_agent_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 에이전트는 자신의 클라이언트만 수정
CREATE POLICY "Agents can update own clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = clients.owner_agent_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 클라이언트는 자신의 정보만 수정
CREATE POLICY "Clients can update own profile"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (clerk_user_id = (auth.jwt()->>'sub'));

-- RLS 정책: housing_requirements 테이블
-- 에이전트는 자신의 클라이언트의 주거 요구사항 조회
CREATE POLICY "Agents can view housing for own clients"
  ON public.housing_requirements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = housing_requirements.client_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 에이전트는 자신의 클라이언트의 주거 요구사항 수정
CREATE POLICY "Agents can update housing for own clients"
  ON public.housing_requirements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = housing_requirements.client_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 에이전트는 자신의 클라이언트의 주거 요구사항 생성
CREATE POLICY "Agents can insert housing for own clients"
  ON public.housing_requirements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = housing_requirements.client_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 클라이언트는 자신의 주거 요구사항 조회
CREATE POLICY "Clients can view own housing"
  ON public.housing_requirements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = housing_requirements.client_id
      AND clients.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 클라이언트는 자신의 주거 요구사항 수정
CREATE POLICY "Clients can update own housing"
  ON public.housing_requirements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = housing_requirements.client_id
      AND clients.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 클라이언트는 자신의 주거 요구사항 생성
CREATE POLICY "Clients can insert own housing"
  ON public.housing_requirements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = housing_requirements.client_id
      AND clients.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- RLS 정책: checklist_items 테이블
-- 에이전트는 자신의 클라이언트의 체크리스트 조회
CREATE POLICY "Agents can view checklist for own clients"
  ON public.checklist_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = checklist_items.client_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 에이전트는 자신의 클라이언트의 체크리스트 수정
CREATE POLICY "Agents can update checklist for own clients"
  ON public.checklist_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = checklist_items.client_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 에이전트는 자신의 클라이언트의 체크리스트 생성
CREATE POLICY "Agents can insert checklist for own clients"
  ON public.checklist_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = checklist_items.client_id
      AND accounts.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 클라이언트는 자신의 체크리스트 조회
CREATE POLICY "Clients can view own checklist"
  ON public.checklist_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = checklist_items.client_id
      AND clients.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- 클라이언트는 자신의 체크리스트 수정
CREATE POLICY "Clients can update own checklist"
  ON public.checklist_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = checklist_items.client_id
      AND clients.clerk_user_id = (auth.jwt()->>'sub')
    )
  );

-- RLS 정책: messages 테이블
-- 에이전트와 클라이언트만 해당 클라이언트의 메시지 조회
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
          WHERE clerk_user_id = (auth.jwt()->>'sub')
        )
        OR clients.clerk_user_id = (auth.jwt()->>'sub')
      )
    )
  );

-- 에이전트와 클라이언트만 메시지 전송 가능
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
          WHERE clerk_user_id = (auth.jwt()->>'sub')
        )
        OR clients.clerk_user_id = (auth.jwt()->>'sub')
      )
    )
    AND sender_clerk_id = (auth.jwt()->>'sub')
  );

-- 권한 부여
GRANT ALL ON TABLE public.accounts TO authenticated;
GRANT ALL ON TABLE public.clients TO authenticated;
GRANT ALL ON TABLE public.housing_requirements TO authenticated;
GRANT ALL ON TABLE public.checklist_items TO authenticated;
GRANT ALL ON TABLE public.messages TO authenticated;


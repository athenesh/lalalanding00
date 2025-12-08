# Supabase SQL Editor 실행 가이드

이 문서는 Supabase SQL Editor에서 실행할 수 있는 모든 SQL문을 포함합니다.

## 📋 목차

1. [테이블 구조 확인](#1-테이블-구조-확인)
2. [RLS 상태 확인](#2-rls-상태-확인)
3. [client_authorizations 테이블 생성](#3-client_authorizations-테이블-생성)
4. [RLS 정책 생성 및 업데이트](#4-rls-정책-생성-및-업데이트)
5. [개발 환경용 RLS 비활성화](#5-개발-환경용-rls-비활성화)
6. [데이터 확인 및 진단](#6-데이터-확인-및-진단)
7. [프로덕션 배포 전 RLS 재활성화](#7-프로덕션-배포-전-rls-재활성화)

---

## 1. 테이블 구조 확인

### 1.1 client_authorizations 테이블 구조 확인

```sql
-- 현재 테이블 구조 확인
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'client_authorizations'
ORDER BY ordinal_position;
```

### 1.2 테이블 존재 여부 확인

```sql
-- client_authorizations 테이블이 존재하는지 확인
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'client_authorizations'
) as table_exists;
```

---

## 2. RLS 상태 확인

### 2.1 모든 테이블의 RLS 상태 확인

```sql
-- RLS가 활성화되어 있는지 확인
SELECT
  tablename,
  CASE WHEN rowsecurity THEN '활성화' ELSE '비활성화' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'client_authorizations',
    'clients',
    'housing_requirements',
    'checklist_items',
    'messages',
    'family_members',
    'emergency_contacts'
  )
ORDER BY tablename;
```

### 2.2 RLS 정책 확인

```sql
-- clients 테이블의 SELECT 정책 확인
SELECT
  policyname,
  cmd,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'clients'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- client_authorizations 테이블의 모든 정책 확인
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'client_authorizations'
ORDER BY policyname;
```

---

## 3. client_authorizations 테이블 생성

### 3.1 테이블 생성

```sql
-- client_authorizations 테이블 생성
CREATE TABLE IF NOT EXISTS public.client_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  authorized_clerk_user_id TEXT NOT NULL,
  granted_by_clerk_user_id TEXT NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(client_id, authorized_clerk_user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_client_authorizations_client_id
  ON public.client_authorizations(client_id);

CREATE INDEX IF NOT EXISTS idx_client_authorizations_clerk_user_id
  ON public.client_authorizations(authorized_clerk_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_authorizations_unique
  ON public.client_authorizations(client_id, authorized_clerk_user_id);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_client_authorizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_client_authorizations_updated_at ON public.client_authorizations;
CREATE TRIGGER trigger_update_client_authorizations_updated_at
  BEFORE UPDATE ON public.client_authorizations
  FOR EACH ROW
  EXECUTE FUNCTION update_client_authorizations_updated_at();
```

---

## 4. RLS 정책 생성 및 업데이트

### 4.1 client_authorizations 테이블 RLS 정책

```sql
-- RLS 활성화
ALTER TABLE public.client_authorizations ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 클라이언트는 자신의 권한 부여 내역 조회 가능
DROP POLICY IF EXISTS "Clients can view own authorizations" ON public.client_authorizations;
CREATE POLICY "Clients can view own authorizations"
  ON public.client_authorizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = client_authorizations.client_id
      AND clients.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

-- RLS 정책: 에이전트는 자신의 클라이언트의 권한 부여 내역 조회 가능
DROP POLICY IF EXISTS "Agents can view authorizations for own clients" ON public.client_authorizations;
CREATE POLICY "Agents can view authorizations for own clients"
  ON public.client_authorizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.accounts ON accounts.id = clients.owner_agent_id
      WHERE clients.id = client_authorizations.client_id
      AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

-- RLS 정책: 권한 부여된 사용자는 자신의 권한 내역 조회 가능
DROP POLICY IF EXISTS "Authorized users can view own authorization" ON public.client_authorizations;
CREATE POLICY "Authorized users can view own authorization"
  ON public.client_authorizations FOR SELECT
  TO authenticated
  USING (
    authorized_clerk_user_id = ((select auth.jwt())->>'sub')
  );

-- RLS 정책: 클라이언트는 자신의 데이터에 대한 권한 부여 가능
DROP POLICY IF EXISTS "Clients can grant authorization for own data" ON public.client_authorizations;
CREATE POLICY "Clients can grant authorization for own data"
  ON public.client_authorizations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = client_authorizations.client_id
      AND clients.clerk_user_id = ((select auth.jwt())->>'sub')
    )
    AND granted_by_clerk_user_id = ((select auth.jwt())->>'sub')
    AND authorized_clerk_user_id IS NOT NULL
  );

-- RLS 정책: 클라이언트는 자신이 부여한 권한 삭제 가능
DROP POLICY IF EXISTS "Clients can delete own authorizations" ON public.client_authorizations;
CREATE POLICY "Clients can delete own authorizations"
  ON public.client_authorizations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = client_authorizations.client_id
      AND clients.clerk_user_id = ((select auth.jwt())->>'sub')
    )
    AND granted_by_clerk_user_id = ((select auth.jwt())->>'sub')
  );

-- 권한 부여
GRANT ALL ON TABLE public.client_authorizations TO authenticated;
```

### 4.2 clients 테이블 RLS 정책 업데이트

```sql
-- clients 테이블 SELECT 정책 업데이트 (권한 부여된 사용자 포함)
DROP POLICY IF EXISTS "Clients can view own profile" ON public.clients;
CREATE POLICY "Clients can view own profile"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    -- 본인 데이터
    clerk_user_id = ((select auth.jwt())->>'sub')
    OR
    -- 권한 부여받은 사용자
    EXISTS (
      SELECT 1 FROM public.client_authorizations
      WHERE client_authorizations.client_id = clients.id
      AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );

-- clients 테이블 UPDATE 정책 업데이트
DROP POLICY IF EXISTS "Clients can update own profile" ON public.clients;
CREATE POLICY "Clients can update own profile"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    -- 본인 데이터
    clerk_user_id = ((select auth.jwt())->>'sub')
    OR
    -- 권한 부여받은 사용자
    EXISTS (
      SELECT 1 FROM public.client_authorizations
      WHERE client_authorizations.client_id = clients.id
      AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
    )
  );
```

### 4.3 housing_requirements 테이블 RLS 정책 업데이트

```sql
DROP POLICY IF EXISTS "Clients can view own housing" ON public.housing_requirements;
CREATE POLICY "Clients can view own housing"
  ON public.housing_requirements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = housing_requirements.client_id
      AND (
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
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
      AND (
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
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
      AND (
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );
```

### 4.4 checklist_items 테이블 RLS 정책 업데이트

```sql
DROP POLICY IF EXISTS "Clients can view own checklist" ON public.checklist_items;
CREATE POLICY "Clients can view own checklist"
  ON public.checklist_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = checklist_items.client_id
      AND (
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
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
      AND (
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );
```

### 4.5 messages 테이블 RLS 정책 업데이트

```sql
DROP POLICY IF EXISTS "Users can view messages for their clients" ON public.messages;
CREATE POLICY "Users can view messages for their clients"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = messages.client_id
      AND (
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
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
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
    AND sender_clerk_id = ((select auth.jwt())->>'sub')
  );
```

### 4.6 family_members 테이블 RLS 정책 업데이트

```sql
DROP POLICY IF EXISTS "Users can view family for their clients" ON public.family_members;
CREATE POLICY "Users can view family for their clients"
  ON public.family_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = family_members.client_id
      AND (
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert family for their clients" ON public.family_members;
CREATE POLICY "Users can insert family for their clients"
  ON public.family_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = family_members.client_id
      AND (
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can update family for their clients" ON public.family_members;
CREATE POLICY "Users can update family for their clients"
  ON public.family_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = family_members.client_id
      AND (
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete family for their clients" ON public.family_members;
CREATE POLICY "Users can delete family for their clients"
  ON public.family_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = family_members.client_id
      AND (
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );
```

### 4.7 emergency_contacts 테이블 RLS 정책 업데이트

```sql
DROP POLICY IF EXISTS "Users can view emergency contacts for their clients" ON public.emergency_contacts;
CREATE POLICY "Users can view emergency contacts for their clients"
  ON public.emergency_contacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = emergency_contacts.client_id
      AND (
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert emergency contacts for their clients" ON public.emergency_contacts;
CREATE POLICY "Users can insert emergency contacts for their clients"
  ON public.emergency_contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = emergency_contacts.client_id
      AND (
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can update emergency contacts for their clients" ON public.emergency_contacts;
CREATE POLICY "Users can update emergency contacts for their clients"
  ON public.emergency_contacts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = emergency_contacts.client_id
      AND (
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete emergency contacts for their clients" ON public.emergency_contacts;
CREATE POLICY "Users can delete emergency contacts for their clients"
  ON public.emergency_contacts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = emergency_contacts.client_id
      AND (
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );
```

---

## 5. 개발 환경용 RLS 비활성화

⚠️ **주의: 개발 환경에서만 사용하세요! 프로덕션에서는 절대 사용하지 마세요!**

```sql
-- 모든 테이블의 RLS 비활성화 (개발 환경 전용)
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_authorizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.housing_requirements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts DISABLE ROW LEVEL SECURITY;
```

---

## 6. 데이터 확인 및 진단

### 6.1 현재 인증 컨텍스트 확인

```sql
-- 현재 인증된 사용자의 Clerk User ID 확인
SELECT
  (auth.jwt())->>'sub' as current_clerk_user_id,
  CASE
    WHEN (auth.jwt())->>'sub' IS NULL THEN '❌ 토큰 없음 - 애플리케이션에서 확인 필요'
    ELSE '✅ 토큰 있음'
  END as token_status;
```

### 6.2 client_authorizations 테이블 데이터 확인

```sql
-- 모든 권한 부여 데이터 확인
SELECT
  id,
  client_id,
  authorized_clerk_user_id,
  granted_by_clerk_user_id,
  granted_at,
  created_at
FROM public.client_authorizations
ORDER BY granted_at DESC;

-- 데이터 개수 확인
SELECT COUNT(*) as total_authorizations FROM public.client_authorizations;
```

### 6.3 clients와 권한 부여 매칭 확인

```sql
-- clients 테이블과 권한 부여 매칭 확인
SELECT
  c.id as client_id,
  c.name as client_name,
  c.email as client_email,
  c.clerk_user_id,
  COUNT(ca.id) as authorization_count
FROM public.clients c
LEFT JOIN public.client_authorizations ca ON ca.client_id = c.id
GROUP BY c.id, c.name, c.email, c.clerk_user_id
ORDER BY authorization_count DESC
LIMIT 10;
```

### 6.4 현재 사용자와 데이터 매칭 확인

```sql
-- 현재 사용자와 clients 데이터 매칭 확인
SELECT
  c.id,
  c.clerk_user_id,
  c.name,
  c.email,
  CASE
    WHEN c.clerk_user_id = ((select auth.jwt())->>'sub') THEN '✅ 본인 데이터'
    WHEN EXISTS (
      SELECT 1 FROM public.client_authorizations ca
      WHERE ca.client_id = c.id
      AND ca.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
    ) THEN '✅ 권한 부여됨'
    ELSE '❌ 접근 불가'
  END as access_status,
  (select auth.jwt())->>'sub' as current_user_id
FROM public.clients c
LIMIT 10;
```

### 6.5 다른 테이블들 데이터 개수 확인

```sql
-- housing_requirements 확인
SELECT COUNT(*) as housing_count FROM public.housing_requirements;

-- checklist_items 확인
SELECT COUNT(*) as checklist_count FROM public.checklist_items;

-- messages 확인
SELECT COUNT(*) as messages_count FROM public.messages;

-- family_members 확인
SELECT COUNT(*) as family_count FROM public.family_members;

-- emergency_contacts 확인
SELECT COUNT(*) as emergency_count FROM public.emergency_contacts;
```

### 6.6 권한 부여된 사용자 확인

```sql
-- 현재 사용자에게 권한이 있는지 확인
SELECT
  ca.id,
  ca.client_id,
  c.name as client_name,
  c.email as client_email,
  ca.authorized_clerk_user_id,
  ca.granted_at
FROM public.client_authorizations ca
JOIN public.clients c ON c.id = ca.client_id
WHERE ca.authorized_clerk_user_id = ((select auth.jwt())->>'sub');
```

---

## 7. 프로덕션 배포 전 RLS 재활성화

⚠️ **프로덕션 배포 전에 반드시 실행하세요!**

```sql
-- 모든 테이블의 RLS 재활성화
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housing_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
```

---

## 📝 사용 가이드

### 초기 설정 시

1. **3단계: client_authorizations 테이블 생성** 실행
2. **4단계: RLS 정책 생성 및 업데이트** 실행 (모든 섹션)
3. **2단계: RLS 상태 확인** 실행하여 정책이 올바르게 적용되었는지 확인

### 개발 중 문제 발생 시

1. **5단계: 개발 환경용 RLS 비활성화** 실행
2. 애플리케이션에서 데이터 확인
3. 데이터가 보이면 → RLS 정책 문제 (Clerk 토큰 전달 확인)
4. 데이터가 안 보이면 → 데이터 저장 문제 (API 로직 확인)

### 프로덕션 배포 전

1. **7단계: 프로덕션 배포 전 RLS 재활성화** 실행
2. **2단계: RLS 상태 확인** 실행하여 모든 테이블의 RLS가 활성화되었는지 확인
3. 애플리케이션에서 정상 작동 확인

### 문제 진단 시

1. **6단계: 데이터 확인 및 진단** 실행
2. 각 쿼리 결과를 확인하여 문제 원인 파악
3. 필요시 **1단계: 테이블 구조 확인** 실행

---

## ⚠️ 주의사항

- **개발 환경에서만 RLS를 비활성화하세요.** 프로덕션에서는 절대 사용하지 마세요.
- SQL문을 실행하기 전에 백업을 권장합니다.
- 프로덕션 배포 전에는 반드시 RLS를 재활성화하세요.
- Clerk 토큰이 제대로 전달되지 않으면 RLS 정책이 작동하지 않을 수 있습니다.

---

## 🔗 관련 문서

- [Supabase RLS 문서](https://supabase.com/docs/guides/auth/row-level-security)
- [Clerk + Supabase 통합 가이드](https://clerk.com/docs/integrations/databases/supabase)

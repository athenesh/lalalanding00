# 데이터베이스 마이그레이션 가이드

> **참고**: `boilerplate00` 폴더의 모든 파일들은 `lalalanding0` 프로젝트로 이전되었습니다. 현재 프로젝트 루트(`lalalanding0`)에서 작업을 진행하시면 됩니다.

## 마이그레이션 적용 방법

### Supabase Dashboard 사용 (권장)

1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭
4. **New query** 클릭
5. SQL을 복사하여 붙여넣기
6. **Run** 클릭하여 실행

### Supabase CLI 사용 (선택사항)

프로젝트 루트(`lalalanding0`)에서 실행:

```bash
supabase db push
```

또는 특정 파일 실행:

```bash
supabase db execute -f supabase/migrations/[파일명].sql
```

---

## 문제 상황 및 해결 방법

### 1. users 테이블이 없음

**문제**: Supabase 데이터베이스에 `users` 테이블이 없어서 Clerk 사용자 동기화 오류가 발생합니다.

**해결**: 다음 SQL을 실행하여 `users` 테이블을 생성하세요.

```sql
-- Users 테이블 생성
-- Clerk 인증과 연동되는 사용자 정보를 저장하는 테이블

CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 테이블 소유자 설정
ALTER TABLE public.users OWNER TO postgres;

-- Row Level Security (RLS) 비활성화
-- 개발 단계에서는 RLS를 끄고, 프로덕션에서는 활성화하는 것을 권장합니다
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 권한 부여
GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;
```

**확인 방법**:

- Supabase Dashboard → **Table Editor**에서 `users` 테이블이 생성되었는지 확인
- 애플리케이션을 다시 실행하고 로그인 시도
- 콘솔에서 "Failed to sync user" 오류가 사라졌는지 확인

---

### 2. 메인 스키마 생성 (create_main_schema.sql)

**마이그레이션 파일**: `supabase/migrations/create_main_schema.sql`

**생성되는 테이블**:

- `accounts` - 에이전트 계정
- `clients` - 클라이언트 정보
- `housing_requirements` - 주거 요구사항
- `checklist_items` - 체크리스트 항목
- `messages` - 채팅 메시지

**주의사항**: 이 마이그레이션 파일에는 다음 수정 사항이 반영되어 있습니다:

#### SQL 에러 수정

**문제 1**: `operator does not exist: text ->> unknown`

- 원인: `auth.jwt() ->> 'metadata' ->> 'role'` 구문이 잘못됨
- 해결: JSONB에서 중첩된 객체 접근 시 `->`와 `->>`를 올바르게 조합

  ```sql
  -- 잘못된 구문
  auth.jwt() ->> 'metadata' ->> 'role'

  -- 올바른 구문
  (auth.jwt()->'metadata'->>'role')
  ```

**문제 2**: `FOR ALL`은 PostgreSQL에서 지원되지 않음

- 원인: RLS 정책에서 `FOR ALL` 사용 불가
- 해결: 각 작업(SELECT, INSERT, UPDATE, DELETE)별로 정책을 분리

  ```sql
  -- 잘못된 구문
  CREATE POLICY "Agents can manage housing for own clients"
    ON public.housing_requirements FOR ALL
    ...

  -- 올바른 구문
  CREATE POLICY "Agents can view housing for own clients"
    ON public.housing_requirements FOR SELECT
    TO authenticated
    ...

  CREATE POLICY "Agents can update housing for own clients"
    ON public.housing_requirements FOR UPDATE
    TO authenticated
    ...

  CREATE POLICY "Agents can insert housing for own clients"
    ON public.housing_requirements FOR INSERT
    TO authenticated
    ...
  ```

**문제 3**: RLS 정책에 `TO authenticated` 명시 필요

- 모든 RLS 정책에 `TO authenticated`를 명시적으로 추가

**확인 방법**:

- Supabase Dashboard → **Table Editor**에서 모든 테이블이 생성되었는지 확인
- 애플리케이션을 다시 실행하고 테스트

---

### 3. clients 테이블에 moving_type 필드 추가

**문제**: `clients` 테이블에 이주 형태(가족 동반/단독 이주)를 저장할 필드가 없습니다.

**마이그레이션 파일**: `supabase/migrations/20251202084106_add_moving_type_to_clients.sql`

**해결**: 다음 SQL을 실행하세요.

```sql
-- clients 테이블에 moving_type 필드 추가
-- 이주 형태를 나타내는 필드 (가족 동반 / 단독 이주)
-- 기존 relocation_type 필드는 "이주 목적"으로 사용 (주재원, 학업, 출장)

-- moving_type 컬럼 추가
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS moving_type TEXT;

-- 컬럼에 대한 코멘트 추가
COMMENT ON COLUMN public.clients.moving_type IS '이주 형태: 가족 동반 또는 단독 이주';
```

**참고사항**:

- `moving_type` 필드는 NULL을 허용합니다 (기존 데이터 호환성)
- 값은 '가족 동반' 또는 '단독 이주'입니다
- 기존 `relocation_type` 필드는 "이주 목적"으로 사용됩니다 (주재원, 학업, 출장)

**확인 방법**:

- Supabase Dashboard → **Table Editor** → `clients` 테이블 선택
- `moving_type` 컬럼이 추가되었는지 확인
- 애플리케이션을 다시 실행하고 프로필 페이지에서 이주 형태 선택 기능이 작동하는지 확인

---

### 4. relocation_type 제약 조건 수정

**문제**: `relocation_type` 필드에 기존 CHECK 제약 조건이 있어서 "주재원", "학업", "출장" 값을 사용할 수 없습니다.

**마이그레이션 파일**: `supabase/migrations/20251202093335_fix_relocation_type_constraint.sql`

**해결**: 다음 SQL을 실행하세요.

```sql
-- clients 테이블의 relocation_type CHECK 제약 조건 수정
-- 기존: 'with_family', 'solo'만 허용
-- 수정: '주재원', '학업', '출장' 허용 (이주 목적)

-- 기존 제약 조건 삭제
ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_relocation_type_check;

-- 새로운 제약 조건 추가 (이주 목적: 주재원, 학업, 출장)
ALTER TABLE public.clients
ADD CONSTRAINT clients_relocation_type_check
CHECK (relocation_type IS NULL OR relocation_type IN ('주재원', '학업', '출장'));
```

**중요**: `relocation_type` 제약 조건을 수정하지 않으면 프로필 저장 시 에러가 발생합니다.

---

## 마이그레이션 실행 순서

권장 실행 순서:

1. **users 테이블 생성** (문제 1)
2. **메인 스키마 생성** (문제 2) - `create_main_schema.sql`
3. **moving_type 필드 추가** (문제 3)
4. **relocation_type 제약 조건 수정** (문제 4)

---

## 일반적인 확인 방법

모든 마이그레이션 적용 후:

1. Supabase Dashboard → **Table Editor**에서 테이블과 컬럼이 올바르게 생성/수정되었는지 확인
2. 애플리케이션을 다시 실행하고 관련 기능이 정상 작동하는지 테스트
3. 브라우저 콘솔에서 에러 메시지 확인

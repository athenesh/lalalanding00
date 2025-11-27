# 마이그레이션 적용 방법

## 문제: users 테이블이 없음

현재 Supabase 데이터베이스에 `users` 테이블이 없어서 동기화 오류가 발생하고 있습니다.

## 해결 방법

### 방법 1: Supabase Dashboard에서 직접 실행 (권장)

1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭
4. 다음 SQL을 실행:

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

### 방법 2: Supabase CLI 사용

터미널에서 다음 명령어 실행:

```bash
# Supabase CLI가 설치되어 있어야 합니다
supabase db push
```

또는:

```bash
# 마이그레이션 파일 직접 실행
supabase db execute -f supabase/migrations/setup_schema.sql
```

## 확인

마이그레이션 적용 후, 다음을 확인하세요:

1. Supabase Dashboard → **Table Editor**에서 `users` 테이블이 생성되었는지 확인
2. 애플리케이션을 다시 실행하고 로그인 시도
3. 콘솔에서 "Failed to sync user" 오류가 사라졌는지 확인


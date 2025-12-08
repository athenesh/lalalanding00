# 데이터베이스 마이그레이션 적용 가이드

> **참고**: `boilerplate00` 폴더의 모든 파일들은 `lalalanding0` 프로젝트로 이전되었습니다. 현재 프로젝트 루트(`lalalanding0`)에서 작업을 진행하시면 됩니다.

## 마이그레이션 파일

`supabase/migrations/create_main_schema.sql`

## 적용 방법

### 방법 1: Supabase Dashboard 사용 (권장)

1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭
4. **New query** 클릭
5. 아래 SQL을 복사하여 붙여넣기
6. **Run** 클릭하여 실행

### 방법 2: Supabase CLI 사용

프로젝트 루트(`lalalanding0`)에서 실행:

```bash
supabase db push
```

또는:

```bash
supabase db execute -f supabase/migrations/create_main_schema.sql
```

## 생성되는 테이블

- `accounts` - 에이전트 계정
- `clients` - 클라이언트 정보
- `housing_requirements` - 주거 요구사항
- `checklist_items` - 체크리스트 항목
- `messages` - 채팅 메시지

## 확인 방법

마이그레이션 적용 후:

1. Supabase Dashboard → **Table Editor**에서 테이블들이 생성되었는지 확인
2. 애플리케이션을 다시 실행하고 테스트

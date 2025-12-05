# 마이그레이션: clients 테이블에 moving_type 필드 추가

## 개요

`clients` 테이블에 `moving_type` 필드를 추가하여 이주 형태(가족 동반/단독 이주)를 저장할 수 있도록 합니다.

## 마이그레이션 파일

`supabase/migrations/20251202084106_add_moving_type_to_clients.sql`

## 실행 방법

### Supabase Dashboard에서 직접 실행 (권장)

1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭
4. **New query** 클릭
5. 아래 SQL을 복사하여 붙여넣기:

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

6. **Run** 클릭하여 실행
7. 실행 결과 확인 (성공 메시지 확인)

## 확인 방법

마이그레이션 적용 후:

1. Supabase Dashboard → **Table Editor** → `clients` 테이블 선택
2. `moving_type` 컬럼이 추가되었는지 확인
3. 애플리케이션을 다시 실행하고 프로필 페이지에서 이주 형태 선택 기능이 작동하는지 확인

## 추가 마이그레이션: relocation_type 제약 조건 수정

`relocation_type` 필드에 기존 CHECK 제약 조건이 있어서 "주재원", "학업", "출장" 값을 사용할 수 없습니다. 다음 마이그레이션도 실행해야 합니다:

`supabase/migrations/20251202093335_fix_relocation_type_constraint.sql`

### 실행 방법

Supabase Dashboard의 SQL Editor에서 다음 SQL을 실행하세요:

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

## 참고사항

- `moving_type` 필드는 NULL을 허용합니다 (기존 데이터 호환성)
- 값은 '가족 동반' 또는 '단독 이주'입니다
- 기존 `relocation_type` 필드는 "이주 목적"으로 사용됩니다 (주재원, 학업, 출장)
- **중요**: `relocation_type` 제약 조건을 수정하지 않으면 프로필 저장 시 에러가 발생합니다

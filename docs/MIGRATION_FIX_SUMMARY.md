# 마이그레이션 수정 사항

## 문제점

1. **SQL 에러**: `operator does not exist: text ->> unknown`
   - 원인: `auth.jwt() ->> 'metadata' ->> 'role'` 구문이 잘못됨
   - JSONB에서 중첩된 객체 접근 시 `->`와 `->>`를 올바르게 조합해야 함

2. **PostgreSQL 제약사항**: `FOR ALL`은 지원되지 않음
   - 각 작업(SELECT, INSERT, UPDATE)별로 정책을 분리해야 함

## 수정 사항

### 1. JWT 접근 구문 수정

**이전 (잘못된 구문):**
```sql
auth.jwt() ->> 'metadata' ->> 'role'
```

**수정 후 (올바른 구문):**
```sql
(auth.jwt()->'metadata'->>'role')
```

### 2. FOR ALL 제거 및 정책 분리

**이전:**
```sql
CREATE POLICY "Agents can manage housing for own clients"
  ON public.housing_requirements FOR ALL
  ...
```

**수정 후:**
```sql
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

### 3. TO authenticated 명시

모든 RLS 정책에 `TO authenticated`를 명시적으로 추가했습니다.

## 적용 방법

1. Supabase Dashboard → SQL Editor
2. `supabase/migrations/create_main_schema.sql` 파일 전체 내용 복사
3. SQL Editor에 붙여넣고 **Run** 클릭

## 확인

마이그레이션 적용 후 다음 테이블이 생성되었는지 확인:
- `accounts`
- `clients`
- `housing_requirements`
- `checklist_items`
- `messages`


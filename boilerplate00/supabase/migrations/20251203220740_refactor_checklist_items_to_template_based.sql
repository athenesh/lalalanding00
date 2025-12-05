-- 체크리스트 아이템을 템플릿 기반으로 리팩토링
-- checklist_items는 템플릿의 상태만 저장하도록 변경

-- 1. 기존 checklist_items 데이터 모두 삭제
DELETE FROM checklist_items;

-- 2. checklist_items 테이블에서 템플릿 속성 제거
-- 템플릿 속성: category, sub_category, title, description, order_num, is_required
-- 상태 속성만 유지: is_completed, notes, completed_at, actual_cost, reference_url

-- category 컬럼 제거
ALTER TABLE checklist_items DROP COLUMN IF EXISTS category;

-- sub_category 컬럼 제거
ALTER TABLE checklist_items DROP COLUMN IF EXISTS sub_category;

-- title 컬럼 제거
ALTER TABLE checklist_items DROP COLUMN IF EXISTS title;

-- description 컬럼 제거
ALTER TABLE checklist_items DROP COLUMN IF EXISTS description;

-- order_num 컬럼 제거
ALTER TABLE checklist_items DROP COLUMN IF EXISTS order_num;

-- is_required 컬럼 제거
ALTER TABLE checklist_items DROP COLUMN IF EXISTS is_required;

-- 3. template_id를 NOT NULL로 변경 (템플릿 기반이므로 필수)
-- 주의: 기존 데이터가 모두 삭제된 후에만 실행 가능
ALTER TABLE checklist_items 
  ALTER COLUMN template_id SET NOT NULL;

-- 참고: 템플릿 데이터는 이미 20251203215704_insert_checklist_templates_from_docs.sql 마이그레이션에서 삽입됨
-- 총 16개 항목: 출국 전 준비(6), 입국 직후(4), 정착 초기(5), 정착 완료(1)


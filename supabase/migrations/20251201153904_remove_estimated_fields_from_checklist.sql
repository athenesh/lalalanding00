-- estimated_cost, estimated_days 필드 제거 마이그레이션
-- checklist_items와 checklist_templates 테이블에서 해당 필드들을 제거합니다.

-- checklist_items 테이블에서 estimated_cost, estimated_days 컬럼 제거
ALTER TABLE public.checklist_items
DROP COLUMN IF EXISTS estimated_cost;

ALTER TABLE public.checklist_items
DROP COLUMN IF EXISTS estimated_days;

-- checklist_templates 테이블에서 estimated_cost, estimated_days 컬럼 제거
ALTER TABLE public.checklist_templates
DROP COLUMN IF EXISTS estimated_cost;

ALTER TABLE public.checklist_templates
DROP COLUMN IF EXISTS estimated_days;


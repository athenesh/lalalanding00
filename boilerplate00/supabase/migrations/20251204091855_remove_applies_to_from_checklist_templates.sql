-- Phase 2: checklist_templates 테이블에서 applies_to 컬럼 제거
-- 16개 체크리스트는 모두 'all'에 적용되므로 불필요한 컬럼

-- 1. applies_to 컬럼 제거
ALTER TABLE checklist_templates 
  DROP COLUMN IF EXISTS applies_to;

-- 2. 변경 사항 확인
-- SELECT 
--   column_name, 
--   data_type, 
--   is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'checklist_templates' 
-- ORDER BY ordinal_position;


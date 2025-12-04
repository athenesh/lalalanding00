-- Phase 1: checklist_templates.description을 TEXT에서 JSONB로 변경
-- 성능 최적화 및 타입 안정성 향상

-- 0. NULL 값을 빈 배열로 변환 (먼저 처리해야 함)
-- description이 NULL인 경우 빈 배열 []로 설정
UPDATE checklist_templates 
SET description = '[]'::text
WHERE description IS NULL;

-- 1. description 컬럼을 JSONB로 변경
-- 기존 TEXT 데이터를 JSONB로 변환 (이미 JSON 형식이거나 빈 배열이므로 안전하게 변환 가능)
ALTER TABLE checklist_templates 
  ALTER COLUMN description TYPE JSONB 
  USING CASE 
    WHEN description IS NULL THEN '[]'::jsonb
    WHEN description = '' THEN '[]'::jsonb
    ELSE description::jsonb
  END;

-- 2. NOT NULL 제약 추가 (16개 고정 템플릿이므로 description은 필수)
-- NULL 값이 모두 처리되었으므로 안전하게 NOT NULL 제약 추가 가능
ALTER TABLE checklist_templates 
  ALTER COLUMN description SET NOT NULL;

-- 3. JSONB 인덱스 추가 (쿼리 성능 최적화)
-- GIN 인덱스를 사용하여 JSONB 필드의 빠른 검색 지원
CREATE INDEX IF NOT EXISTS idx_checklist_templates_description_gin 
  ON checklist_templates USING GIN (description);

-- 4. 변경 사항 확인
-- SELECT 
--   column_name, 
--   data_type, 
--   is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'checklist_templates' 
--   AND column_name = 'description';


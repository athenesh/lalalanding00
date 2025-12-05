-- 기존 체크리스트 템플릿 데이터 전체 삭제
-- 새로운 표준 템플릿(16개)으로 재구성하기 전 정리 작업

-- 외래키 제약조건 때문에 checklist_items의 template_id를 먼저 NULL로 설정
UPDATE checklist_items
SET template_id = NULL
WHERE template_id IS NOT NULL;

-- 기존 템플릿 데이터 모두 삭제
DELETE FROM checklist_templates;

-- 삭제 확인 (결과가 0이어야 함)
-- SELECT COUNT(*) FROM checklist_templates;


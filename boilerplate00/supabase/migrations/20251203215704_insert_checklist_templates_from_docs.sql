-- 체크리스트 템플릿 데이터 삽입
-- docs/정리.md 파일의 표준 구조를 기반으로 16개 항목 삽입

-- 출국 전 준비 (6개 항목)
INSERT INTO checklist_templates (category, sub_category, title, description, order_num, is_required, applies_to) VALUES
('출국 전 준비', '서류 준비', '필수 서류 영문 발급 및 준비 (신분)', NULL, 1, true, 'all'),
('출국 전 준비', '서류 준비', '소득 및 재정 증빙 서류 (집 렌트용)', NULL, 2, true, 'all'),
('출국 전 준비', '운전면허', '국제운전면허증 발급', NULL, 3, false, 'all'),
('출국 전 준비', '집 렌트', '주거지 사전 조사 (Zillow)', NULL, 4, false, 'all'),
('출국 전 준비', '금융', '초기 정착 자금 확보', NULL, 5, true, 'all'),
('출국 전 준비', '숙소', '임시 숙소 예약 (약 2~3주)', NULL, 6, false, 'all'),

-- 입국 직후 (4개 항목)
('입국 직후', 'SSN 발급', 'SSN (Social Security Number) 신청', NULL, 1, true, 'all'),
('입국 직후', '집 렌트', '집 렌트 계약 및 입주', NULL, 2, false, 'all'),
('입국 직후', '유틸리티', '유틸리티 신청 (입주 즉시)', NULL, 3, true, 'all'),
('입국 직후', '계좌개설', '미국 계좌 개설 (Checking Account)', NULL, 4, false, 'all'),

-- 정착 초기 (5개 항목)
('정착 초기', '운전면허', '운전면허 필기시험 (Written Test)', NULL, 1, true, 'all'),
('정착 초기', '운전면허', '운전면허 실기시험 (Behind-the-Wheel)', NULL, 2, false, 'all'),
('정착 초기', '차량 구매', '차량 구매 또는 리스 계약', NULL, 3, false, 'all'),
('정착 초기', '보험', '자동차 보험 가입', NULL, 4, false, 'all'),
('정착 초기', '금융', '신용 쌓기 (Secured/Credit Card)', NULL, 5, false, 'all'),

-- 정착 완료 (1개 항목)
('정착 완료', '금융', '본격적인 신용 관리 및 신용카드 신청', NULL, 1, false, 'all');

-- 삽입 확인
-- SELECT category, COUNT(*) as count FROM checklist_templates GROUP BY category ORDER BY category;


-- us-settlement-guide의 모든 체크리스트 데이터를 checklist_templates에 삽입
-- 기존 템플릿은 삭제하고 새 데이터로 교체

-- 기존 템플릿 삭제 (선택사항 - 주석 해제하여 실행)
-- DELETE FROM checklist_templates;

-- ============================================
-- 1. PRE_DEPARTURE (출국 전 준비)
-- ============================================

-- 1-1. 필수 서류 영문 발급 및 준비 (신분)
INSERT INTO checklist_templates (category, title, description, sub_category, order_num, is_required) VALUES
(
  'pre_departure',
  '필수 서류 영문 발급 및 준비 (신분)',
  '[
    {
      "text": "미국 입국 및 자녀 학교 등록 등에 필요한 신분 관련 서류를 영문으로 준비하세요.",
      "important": true
    },
    {
      "text": "체크리스트",
      "subText": [
        "여권 및 비자 (유효기간 확인)",
        "가족관계증명서 (영문 상세)",
        "기본증명서 (영문 상세)",
        "자녀 예방접종 증명서 (영문, 학교 제출용)",
        "한국 운전면허증 (원본 필수 지참)"
      ]
    }
  ]'::jsonb::text,
  '서류 준비',
  1,
  true
);

-- 1-2. 소득 및 재정 증빙 서류 (집 렌트용)
INSERT INTO checklist_templates (category, title, description, sub_category, order_num, is_required) VALUES
(
  'pre_departure',
  '소득 및 재정 증빙 서류 (집 렌트용)',
  '[
    {
      "text": "미국 도착 즉시 집을 계약하려면 신용점수 대신 지불 능력을 증명해야 합니다. 반드시 영문으로 여러 부 준비하세요.",
      "important": true
    },
    {
      "text": "필수 준비물",
      "subText": [
        "Job Offer Letter: 연봉(Salary)이 명시된 영문 고용계약서 또는 재직증명서",
        "Paystubs: 최근 3개월 치 영문 급여명세서",
        "Bank Statement: 영문 은행 잔고증명서 (보증금 및 초기 정착금을 커버할 수 있는 금액)"
      ]
    },
    {
      "text": "팁",
      "subText": ["미국 내 신용기록이 없으므로, 이러한 재정 서류가 집주인을 설득하는 가장 강력한 수단입니다."]
    }
  ]'::jsonb::text,
  '서류 준비',
  2,
  true
);

-- 1-3. 국제운전면허증 발급
INSERT INTO checklist_templates (category, title, description, sub_category, order_num, is_required) VALUES
(
  'pre_departure',
  '국제운전면허증 발급',
  '[
    {
      "text": "인천공항, 경찰서, 운전면허시험장에서 발급 가능합니다."
    },
    {
      "text": "주의사항",
      "subText": [
        "반드시 한국 면허증 원본과 함께 소지해야 효력이 있음",
        "캘리포니아 거주자의 경우 입국 후 10일까지만 유효하므로, 최대한 빨리 CA 면허를 따야 함"
      ]
    }
  ]'::jsonb::text,
  '운전면허',
  3,
  true
);

-- 1-4. 주거지 사전 조사 (Zillow)
INSERT INTO checklist_templates (category, title, description, sub_category, order_num, is_required) VALUES
(
  'pre_departure',
  '주거지 사전 조사 (Zillow)',
  '[
    {
      "text": "ZILLOW, Redfin 등을 통해 한국에서 미리 시세와 매물을 확인하세요."
    },
    {
      "text": "주요 체크 포인트",
      "subText": [
        "치안: Gated Community (게이트가 있는 아파트) 추천",
        "편의: In-unit Washer/Dryer (집 안에 세탁기/건조기 구비 여부)",
        "바닥: 카펫보다는 마루 바닥(Hardwood/Laminate) 선호",
        "위치: 회사와의 출퇴근 거리 및 학군"
      ]
    }
  ]'::jsonb::text,
  '집 렌트',
  4,
  false
);

-- 1-5. 초기 정착 자금 확보
INSERT INTO checklist_templates (category, title, description, sub_category, order_num, is_required) VALUES
(
  'pre_departure',
  '초기 정착 자금 확보',
  '[
    {
      "text": "보증금(Deposit)과 첫 달 렌트비, 차량 구매 비용 등 목돈이 필요합니다.",
      "important": true
    },
    {
      "text": "준비사항",
      "subText": [
        "Cashier''s Check 발급을 위한 현금 유동성 확보",
        "해외 사용 가능한 신용카드 한도 체크",
        "환전 및 송금 계획 수립"
      ]
    }
  ]'::jsonb::text,
  '금융',
  5,
  true
);

-- 1-6. 임시 숙소 예약 (약 2~3주)
INSERT INTO checklist_templates (category, title, description, sub_category, order_num, is_required) VALUES
(
  'pre_departure',
  '임시 숙소 예약 (약 2~3주)',
  '[
    {
      "text": "입국 후 집을 계약하고 입주하기까지 통상 2~3주가 소요됩니다."
    },
    {
      "text": "팁",
      "subText": [
        "회사 근처 또는 희망 거주 지역 근처의 레지던스 호텔이나 에어비앤비 예약",
        "취사가 가능한 곳이 초기 적응에 유리함"
      ]
    }
  ]'::jsonb::text,
  '숙소',
  6,
  false
);

-- ============================================
-- 2. ARRIVAL (입국 직후)
-- ============================================

-- 2-1. SSN (Social Security Number) 신청
INSERT INTO checklist_templates (category, title, description, sub_category, order_num, is_required) VALUES
(
  'arrival',
  'SSN (Social Security Number) 신청',
  '[
    {
      "text": "입국 후 가장 먼저 가까운 Social Security Office를 방문하세요.",
      "important": true
    },
    {
      "text": "필요 서류",
      "subText": ["여권", "비자", "I-94(온라인 출력)", "SS-5(신청서)"]
    },
    {
      "text": "소요 기간",
      "subText": ["신청 후 우편 수령까지 약 2~3주 소요 (거주지 주소 확정 필요)"]
    }
  ]'::jsonb::text,
  'SSN 발급',
  1,
  true
);

-- 2-2. 집 렌트 계약 및 입주
INSERT INTO checklist_templates (category, title, description, sub_category, order_num, is_required) VALUES
(
  'arrival',
  '집 렌트 계약 및 입주',
  '[
    {
      "text": "집 종류별 특징",
      "subText": [
        "🏠 아파트: 1~2인, 보안/커뮤니티 우수, 월세 높음",
        "🏘️ 타운하우스: 2~3층 독채, 3~4인, 차고 포함",
        "🏡 하우스: 넓은 마당, 독립적, 관리 포인트 많음"
      ]
    },
    {
      "text": "계약 시 제출 서류",
      "subText": [
        "준비해 온 Offer Letter, Paystub, Bank Statement 제출",
        "SSN (없을 시 보증금 상향 가능성)",
        "여권 및 비자 사본"
      ]
    },
    {
      "text": "주의사항",
      "subText": [
        "Background Check에 며칠~몇 주 소요될 수 있음",
        "보증인(Co-signer) 요구 시 회사 도움 필요할 수 있음"
      ]
    }
  ]'::jsonb::text,
  '집 렌트',
  2,
  true
);

-- 2-3. 유틸리티 신청 (입주 즉시)
INSERT INTO checklist_templates (category, title, description, sub_category, order_num, is_required) VALUES
(
  'arrival',
  '유틸리티 신청 (입주 즉시)',
  '[
    {
      "text": "수도, 전기, 가스, 인터넷은 입주 날짜에 맞춰 개통 신청해야 합니다.",
      "important": true
    },
    {
      "text": "신청 항목",
      "subText": [
        "⚡ 전기: SoCal Edison (SCE)",
        "🔥 가스: SoCal Gas",
        "💧 수도/쓰레기: 해당 City의 유틸리티 부서",
        "🌐 인터넷: Spectrum, AT&T 등 (설치 약속 필요)"
      ]
    }
  ]'::jsonb::text,
  '유틸리티',
  3,
  true
);

-- 2-4. 미국 계좌 개설 (Checking Account)
INSERT INTO checklist_templates (category, title, description, sub_category, order_num, is_required) VALUES
(
  'arrival',
  '미국 계좌 개설 (Checking Account)',
  '[
    {
      "text": "월급 수령 및 초기 정착금 입금을 위해 은행 방문."
    },
    {
      "text": "추천 은행",
      "subText": ["Chase", "Bank of America", "Wells Fargo", "신한은행 아메리카(초기 SSN 없이 수월)"]
    },
    {
      "text": "준비물",
      "subText": ["여권", "거주지 증명 서류 (렌트 계약서, 유틸리티 고지서 등)"]
    }
  ]'::jsonb::text,
  '계좌개설',
  4,
  true
);

-- ============================================
-- 3. EARLY_SETTLEMENT (정착 초기)
-- ============================================

-- 3-1. 운전면허 필기시험 (Written Test)
INSERT INTO checklist_templates (category, title, description, sub_category, order_num, is_required) VALUES
(
  'settlement_early',
  '운전면허 필기시험 (Written Test)',
  '[
    {
      "text": "SSN 수령 후 즉시 DMV 방문 또는 온라인 예약.",
      "important": true
    },
    {
      "text": "준비물",
      "subText": ["여권", "SSN 카드", "거주지 증명 2종(계약서, 고지서 등)", "I-94"]
    },
    {
      "text": "팁",
      "subText": [
        "한국어로 시험 응시 가능",
        "유튜브 최신 기출문제 영상 시청 필수 (난이도 상승)",
        "합격 시 임시 면허(Permit) 발급 -> 동승자 있으면 운전 가능"
      ]
    }
  ]'::jsonb::text,
  '운전면허',
  1,
  true
);

-- 3-2. 운전면허 실기시험 (Behind-the-Wheel)
INSERT INTO checklist_templates (category, title, description, sub_category, order_num, is_required) VALUES
(
  'settlement_early',
  '운전면허 실기시험 (Behind-the-Wheel)',
  '[
    {
      "text": "필기 합격 후 실기 시험 예약 (보통 2주~1달 대기)."
    },
    {
      "text": "시험 당일",
      "subText": [
        "캘리포니아 면허 소지자 동승 필수",
        "시험용 차량 (등록증, 보험증 필수 확인)",
        "차량 방향지시등, 브레이크 등 정상 작동 확인"
      ]
    },
    {
      "text": "합격 팁",
      "subText": ["시험장 주변 코스 유튜브로 사전 숙지", "오버액션으로 좌우 확인(Shoulder check)"]
    }
  ]'::jsonb::text,
  '운전면허',
  2,
  true
);

-- 3-3. 차량 구매 또는 리스 계약
INSERT INTO checklist_templates (category, title, description, sub_category, order_num, is_required) VALUES
(
  'settlement_early',
  '차량 구매 또는 리스 계약',
  '[
    {
      "text": "미국 생활의 필수품. 신차, 중고차, 리스 중 선택."
    },
    {
      "text": "리스 (Lease)",
      "subText": [
        "보통 3년 계약, 초기 다운페이먼트 필요",
        "신용 기록 없으면 보증금 증가 또는 거절될 수 있음 (한인 중개인 활용)"
      ]
    },
    {
      "text": "중고차",
      "subText": ["Carmax 등 대형 업체 이용이 안전함"]
    }
  ]'::jsonb::text,
  '차량 구매',
  3,
  false
);

-- 3-4. 자동차 보험 가입
INSERT INTO checklist_templates (category, title, description, sub_category, order_num, is_required) VALUES
(
  'settlement_early',
  '자동차 보험 가입',
  '[
    {
      "text": "차량 인수 전 보험 가입 증명서(Binder)가 필요합니다."
    },
    {
      "text": "주요 보험사",
      "subText": ["Geico, AAA, State Farm, Farmers 등 비교 견적"]
    },
    {
      "text": "참고",
      "subText": ["한국 운전 무사고 경력 증명 인정 여부 확인해볼 것"]
    }
  ]'::jsonb::text,
  '보험',
  4,
  true
);

-- 3-5. 신용 쌓기 (Secured/Credit Card)
INSERT INTO checklist_templates (category, title, description, sub_category, order_num, is_required) VALUES
(
  'settlement_early',
  '신용 쌓기 (Secured/Credit Card)',
  '[
    {
      "text": "초기에는 신용도가 없어 일반 신용카드 발급이 어렵습니다."
    },
    {
      "text": "방법",
      "subText": [
        "은행에 보증금을 걸고 만드는 Secured Card 발급",
        "또는 한도 $1,000 내외의 입문용 신용카드 발급",
        "체크카드(Debit) 사용 줄이고 신용카드 사용 후 선결제 반복"
      ]
    }
  ]'::jsonb::text,
  '금융',
  5,
  false
);

-- ============================================
-- 4. SETTLEMENT_COMPLETE (정착 완료)
-- ============================================

-- 4-1. 본격적인 신용 관리 및 신용카드 신청
INSERT INTO checklist_templates (category, title, description, sub_category, order_num, is_required) VALUES
(
  'settlement_complete',
  '본격적인 신용 관리 및 신용카드 신청',
  '[
    {
      "text": "약 1년 후 신용점수(Credit Score) 700점 이상 목표."
    },
    {
      "text": "활용",
      "subText": [
        "메이저 신용카드(Chase Sapphire, Amex 등) 발급 신청",
        "향후 오토론, 모기지 금리 혜택 가능"
      ]
    }
  ]'::jsonb::text,
  '금융',
  1,
  false
);

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '체크리스트 템플릿 삽입 완료: 총 15개 항목';
  RAISE NOTICE '- PRE_DEPARTURE: 6개';
  RAISE NOTICE '- ARRIVAL: 4개';
  RAISE NOTICE '- EARLY_SETTLEMENT: 5개';
  RAISE NOTICE '- SETTLEMENT_COMPLETE: 1개';
END $$;


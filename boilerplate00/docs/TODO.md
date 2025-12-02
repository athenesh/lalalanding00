# Todo List - 미국 이주 지원 플랫폼

## 프로젝트 설정 및 인프라 (Project Setup & Infrastructure)

### 개발 환경 설정

- [x] `.cursor/` 디렉토리
  - [x] `rules/` 커서룰 (common, supabase, web 폴더에 규칙 파일 존재)
  - [x] `mcp.json` MCP 서버 설정
  - [x] `dir.md` 프로젝트 디렉토리 구조 (현재 `docs/DIR.md`에 위치)
- [ ] `.github/` 디렉토리 (GitHub Actions, 이슈 템플릿 등) - 프로덕션 배포 전 선택적
- [ ] `.husky/` 디렉토리 (Git hooks) - 팀 협업 시 선택적
- [x] `app/` 디렉토리
  - [x] `favicon.ico` 파일
  - [x] `not-found.tsx` 파일
  - [ ] `robots.ts` 파일 - 프로덕션 배포 전 필수 (SEO)
  - [ ] `sitemap.ts` 파일 - 프로덕션 배포 전 필수 (SEO)
  - [ ] `manifest.ts` 파일 - PWA 기능 필요 시 추가
- [x] `supabase/` 디렉토리
- [x] `public/` 디렉토리
  - [x] `icons/` 디렉토리
  - [x] `logo.png` 파일
  - [x] `og-image.png` 파일
- [x] `tsconfig.json` 파일
- [x] `.cursorignore` 파일
- [x] `.gitignore` 파일
- [x] `.prettierignore` 파일
- [x] `.prettierrc` 파일
- [x] `eslint.config.mjs` 파일
- [x] `AGENTS.md` 파일

---

## Phase 0: Lovable UI 마이그레이션 (완료 ✅)

### 사전 준비

- [x] Git 브랜치 생성 (`feature/lovable-migration`)
- [x] 프로젝트 백업 확인
- [x] 필요한 의존성 목록 정리

### Phase 1: UI 컴포넌트 마이그레이션

- [x] shadcn/ui 컴포넌트 동기화 (progress, badge, calendar, popover, checkbox, radio-group, select, toast, sonner, accordion)
- [x] 커스텀 컴포넌트 복사 및 변환:
  - [x] ClientCard.tsx → client-card.tsx
  - [x] ChatTab.tsx → chat-tab.tsx
  - [x] ChecklistTab.tsx → checklist-tab.tsx
  - [x] HousingTab.tsx → housing-tab.tsx
  - [x] ProfileTab.tsx → profile-tab.tsx
  - [x] Header.tsx → header.tsx
- [x] Hooks 마이그레이션 (use-mobile.tsx)
- [x] 라우팅 변환 (useNavigate → useRouter)
- [x] 'use client' 디렉티브 추가

### Phase 2: 페이지 마이그레이션

- [x] 랜딩 페이지 (Index.tsx → app/page.tsx)
- [x] 에이전트 대시보드 (Dashboard.tsx → app/agent/dashboard/page.tsx)
- [x] 클라이언트 상세 페이지 (ClientDetail.tsx → app/agent/client/[id]/page.tsx)
- [x] 클라이언트 홈 페이지 (Home.tsx → app/client/home/page.tsx)
- [x] NotFound 페이지 (NotFound.tsx → app/not-found.tsx)

### Phase 3: 스타일 및 설정 통합

- [x] CSS 변수 통합 (globals.css)
- [x] 폰트 설정 (Noto Sans KR 추가)
- [x] React Query 설정 (QueryClientProvider)
- [x] 커스텀 유틸리티 클래스 추가

### Phase 4: 데이터 연동 (진행 중 ⚠️)

- [x] Supabase 스키마 확인 및 확장
- [ ] Server Actions 생성 (clients, checklist, housing, messages)
- [ ] Mock 데이터 제거 및 실제 데이터 연동
- [ ] React Query로 클라이언트 사이드 캐싱

### Phase 5: 라우팅 및 네비게이션

- [x] Header 컴포넌트 통합 (Clerk UserButton)
- [x] 모든 라우팅 경로 확인 및 테스트

### Phase 6: 최종 통합 및 테스트

- [x] 의존성 정리 (react-router-dom 제거)
- [x] 타입 정의 통일
- [ ] 전체 기능 테스트
- [x] 반응형 디자인 확인
- [ ] 에러 핸들링 확인

---

## Phase 1: MVP Core (2주 목표)

### Week 1: 인증 및 기본 구조

#### Day 1-2: 프로젝트 초기 설정

- [x] Next.js 15 프로젝트 생성 (App Router)
- [x] TypeScript 설정
- [x] Tailwind CSS 설정
- [x] pnpm 패키지 매니저 설정
- [x] ESLint + Prettier 설정
- [ ] Git 저장소 초기화
- [ ] Vercel 프로젝트 연결

#### Day 3-4: Clerk 인증 시스템

- [x] Clerk 프로젝트 생성
- [x] Clerk 환경 변수 설정
- [x] Clerk 미들웨어 구현 (`middleware.ts`)
- [x] 역할 기반 라우팅 설정
- [x] 로그인 페이지 (`/sign-in`)
- [x] 회원가입 페이지 (`/sign-up`) + 역할 선택
- [x] 랜딩 페이지 (`/`) - 서비스 소개 + 로그인 버튼
- [x] 인증 상태 확인 유틸리티 함수

#### Day 5: Supabase 데이터베이스 설정

- [x] Supabase 프로젝트 생성
- [x] 데이터베이스 스키마 생성:
  - [x] `accounts` 테이블
  - [x] `clients` 테이블
  - [x] `housing_requirements` 테이블
  - [x] `checklist_items` 테이블
  - [x] `messages` 테이블
- [x] RLS (Row Level Security) 정책 설정
- [x] Supabase 클라이언트 설정 (Clerk JWT 연동)
- [x] 환경 변수 설정

#### Day 6-7: 에이전트 대시보드

- [x] 에이전트 대시보드 레이아웃 (`/agent/dashboard`)
- [x] 클라이언트 목록 API (`GET /api/clients`)
- [x] 클라이언트 목록 UI (카드 뷰)
- [x] 클라이언트 진행상황 요약 표시:
  - [x] 이름
  - [x] 이주 예정일
  - [x] 체크리스트 완료율 (프로그레스 바)
- [x] "+ 새 클라이언트 추가" 버튼 (UI만, 실제 기능 미구현)
- [x] 클라이언트 카드 클릭 → 상세 페이지 이동
- [ ] Mock 데이터 제거 및 실제 API 연동

---

### Week 2: 핵심 기능 구현

#### Day 8-9: 클라이언트 프로필 관리

- [x] 클라이언트 생성 API (`POST /api/clients`)
- [ ] 클라이언트 상세 조회 API (`GET /api/clients/[id]`)
- [ ] 클라이언트 수정 API (`PATCH /api/clients/[id]`)
- [x] 클라이언트 프로필 폼 컴포넌트:
  - [x] 이름 (필수)
  - [x] 이메일 (필수)
  - [x] 전화번호 (선택)
  - [x] 직업 (필수) - 드롭다운
  - [x] 이주 예정일 (필수) - 날짜 선택기
- [x] 에이전트 클라이언트 상세 페이지 (`/agent/client/[id]`) (UI 완료, 로컬 상태 관리 구현)
- [x] 클라이언트 홈 페이지 (`/client/home`) (UI만, Mock 데이터 사용)
- [x] 프로필 저장 기능 (로컬 상태 관리, Mock 데이터 기반)
- [ ] 프로필 편집 권한 확인 (에이전트/클라이언트)
- [ ] Mock 데이터 제거 및 실제 API 연동

#### Day 10: 주거 요구조건 관리

- [ ] 주거 요구사항 조회 API (`GET /api/housing/[client_id]`)
- [ ] 주거 요구사항 업데이트 API (`PATCH /api/housing/[client_id]`)
- [x] 주거 요구조건 폼 컴포넌트:
  - [x] 희망 지역 (자유 입력)
  - [x] 예산 범위 (최대) - USD/월
  - [x] 주거 형태 (드롭다운)
  - [x] 침실 수 (선택)
  - [x] 욕실 수 (선택)
- [x] 주거 옵션 탭 UI (Mock 데이터 사용)
- [x] 폼 유효성 검사
- [x] 주거 옵션 저장 기능 (로컬 상태 관리, Mock 데이터 기반)
- [ ] Mock 데이터 제거 및 실제 API 연동

#### Day 11: 체크리스트

- [ ] 체크리스트 템플릿 데이터 생성 (마이그레이션)
  - [ ] 출국 전 준비 항목 (4개):
    - [ ] 국제운전면허증 발급 (상세 설명 포함)
    - [ ] 비자 확인
    - [ ] 항공권 예약
    - [ ] 짐 정리
  - [ ] 입국 직후 항목 (4개):
    - [ ] 집 렌트 (가장 먼저 진행, 상세 설명 포함)
    - [ ] SSN 발급 신청 (최대한 빨리 신청 필요, 상세 설명 포함)
    - [ ] 은행 계좌 개설 (상세 설명 포함)
    - [ ] 유틸리티 신청 (상세 설명 포함)
  - [ ] 정착 단계 항목 (5개):
    - [ ] 운전면허 취득 (상세 설명 포함)
    - [ ] 차량 구매/리스 (상세 설명 포함)
    - [ ] 자동차 보험 (상세 설명 포함)
    - [ ] 자녀 학교 등록 (해당 시)
    - [ ] 의료보험 가입
- [ ] 체크리스트 조회 API (`GET /api/checklist/[client_id]`)
- [ ] 체크리스트 항목 업데이트 API (`PATCH /api/checklist/[id]`)
- [x] 체크리스트 UI:
  - [x] 카테고리별 그룹화 (출국 전 / 입국 직후 / 정착 단계)
  - [x] 체크박스 토글
  - [x] 완료율 프로그레스 바
  - [x] 각 항목별 상세 설명 표시 (토글 또는 모달)
  - [x] 필요 서류 표시
  - [x] 항목별 중요도 표시 (예: 집 렌트 - 가장 먼저, SSN - 최대한 빨리)
- [x] 체크리스트 탭 UI (Mock 데이터 사용)
- [x] 체크리스트 저장 기능 (로컬 상태 관리, Mock 데이터 기반, 저장 버튼 포함)
- [ ] Mock 데이터 제거 및 실제 API 연동

#### Day 12-13: 채팅 기능 (폴링 방식)

- [ ] 메시지 전송 API (`POST /api/messages`)
- [ ] 메시지 히스토리 조회 API (`GET /api/messages/[client_id]`)
- [x] 채팅 UI 컴포넌트:
  - [x] 메시지 리스트
  - [x] 메시지 입력 폼
  - [x] 카카오톡 스타일 말풍선
  - [x] 타임스탬프 표시
- [ ] 폴링 로직 구현 (5초 간격)
- [x] 채팅 탭 UI (Mock 데이터 사용)
- [ ] 무한 스크롤 (메시지 히스토리)
- [ ] Mock 데이터 제거 및 실제 API 연동

#### Day 14: 통합 테스트 및 버그 수정

- [ ] 전체 플로우 테스트:
  - [ ] 에이전트 회원가입 → 클라이언트 추가 → 정보 입력
  - [ ] 클라이언트 회원가입 → 정보 입력 → 채팅
- [ ] 버그 수정
- [ ] UI/UX 개선
- [ ] 성능 최적화
- [ ] 에러 핸들링 개선

---

## Phase 2: Enhancement (1-2주)

### 에이전트 메모

- [ ] `agent_notes` 테이블 생성
- [ ] 메모 작성 API (`POST /api/agent-notes`)
- [ ] 메모 조회 API (`GET /api/agent-notes/[client_id]`)
- [ ] 메모 UI 컴포넌트
- [ ] 메모 탭 추가

### 이주 형태 및 가족정보/비상연락망

- [ ] `clients` 테이블에 `relocation_type` 필드 추가
- [ ] `family_members` 테이블 생성
- [ ] `emergency_contacts` 테이블 생성
- [ ] 이주 형태 선택 UI (라디오 버튼)
- [ ] 조건부 폼 로직 (가족정보 / 비상연락망)
- [ ] 가족 구성원 추가/삭제 기능
- [ ] 비상연락망 추가/삭제 기능

### 주거 요구조건 확장

- [ ] `housing_requirements` 테이블 확장:
  - [ ] `workplace_address` 필드 추가
  - [ ] `has_pets` 필드 추가
  - [ ] `pet_details` 필드 추가
  - [ ] `has_washer_dryer` 필드 추가
  - [ ] `parking` 필드 추가
  - [ ] `school_district` 필드 추가
  - [ ] `additional_notes` 필드 추가
- [ ] 주거 요구조건 폼 확장
- [ ] 반려동물 입력 UI
- [ ] 세탁기/건조기 체크박스 + 툴팁
- [ ] 추가 요청사항 텍스트 에리어

### Realtime 채팅

- [ ] Supabase Realtime 설정
- [ ] 채팅 채널 구독 로직
- [ ] 폴링 → Realtime 전환
- [ ] 읽음 표시 기능 (선택적)
- [ ] 새 메시지 알림 배지

### 체크리스트 개선

- [ ] 각 항목별 메모 추가 기능
- [ ] 체크리스트 커스터마이징 (에이전트가 항목 추가/삭제)
- [ ] 체크리스트 템플릿 관리
- [ ] 항목별 체크리스트 하위 항목 추가 (예: 유틸리티 → 수도, 전기, 가스, 인터넷, 쓰레기 수거)
- [ ] 진행 상황 알림 기능

### 기타 개선사항

- [ ] 프로필 사진 업로드 (Supabase Storage)
- [ ] 검색 기능 (대시보드)
- [ ] 알림 시스템 (새 메시지)
- [ ] Google Maps API 연동 (직장 주소 자동완성)

---

## Phase 3: Advanced (향후)

### 파일 공유

- [ ] Supabase Storage 설정
- [ ] 파일 업로드 API
- [ ] 파일 다운로드 기능
- [ ] 파일 목록 UI

### 캘린더 통합

- [ ] 이주 일정 캘린더
- [ ] 중요 일정 알림
- [ ] 캘린더 뷰 추가

### 다국어 지원

- [ ] i18n 설정
- [ ] 영어 번역
- [ ] 언어 전환 기능

### 모바일 앱 (PWA)

- [ ] PWA 설정
- [ ] 오프라인 지원
- [ ] 푸시 알림

### 분석 대시보드

- [ ] 에이전트용 통계 대시보드
- [ ] 클라이언트 진행상황 차트
- [ ] 수익 분석 (향후)

---

## Post MVP: 추가 기능 확장

### Zillow 부동산 리스팅 통합

- [ ] Zillow URL 감지 및 파싱 유틸리티 함수 구현 (`lib/zillow-utils.ts`)
- [ ] 부동산 정보 카드 컴포넌트 개발 (`components/client/PropertyCard.tsx`)
- [ ] 서버 API 엔드포인트 생성 (`app/api/zillow/property/route.ts`)
- [ ] ChatTab 컴포넌트에 Zillow 링크 감지 로직 추가
- [ ] 부동산 정보 추출 로직 구현 (Open Graph 메타데이터 또는 Zillow API)
- [ ] 에러 핸들링 및 로딩 상태 처리
- [ ] 부동산 정보 캐싱 기능 (중복 요청 방지)
- [ ] 여러 Zillow 링크 처리 로직 (메시지에 여러 링크가 있는 경우)

---

## 우선순위별 정리

### P0 (필수 - Phase 1)

1. ✅ Clerk 인증 시스템 (완료)
2. ✅ 에이전트 대시보드 (UI 완료, 데이터 연동 필요)
3. ✅ 클라이언트 프로필 관리 (UI 완료, 로컬 상태 관리 완료, API 연동 필요)
4. ⚠️ 주거 요구조건 (UI 완료, 로컬 상태 관리 완료, API 연동 필요)
5. ⚠️ 체크리스트 (UI 완료, 로컬 상태 관리 완료, API 및 템플릿 데이터 미구현)
6. ⚠️ 기본 채팅 (UI 완료, API 및 폴링 로직 미구현)

### P1 (우선 - Phase 2)

1. 에이전트 메모
2. 이주 형태 선택 + 가족정보/비상연락망
3. 주거 요구조건 확장
4. Realtime 채팅
5. 체크리스트 개선

### P2 (부가 - Phase 3)

1. 파일 공유
2. 캘린더 통합
3. Google Maps 연동
4. 프로필 사진
5. 다국어 지원
6. 모바일 앱 (PWA)
7. 분석 대시보드

---

## 진행 상황 추적

### Week 1 진행률: 약 85%

- [x] Day 1-2: 프로젝트 초기 설정 (100%)
- [x] Day 3-4: Clerk 인증 시스템 (100%)
- [x] Day 5: Supabase 데이터베이스 설정 (100%)
- [x] Day 6-7: 에이전트 대시보드 (UI 완료, API 부분 완료, 데이터 연동 필요)

### Week 2 진행률: 약 55%

- [x] Day 8-9: 클라이언트 프로필 관리 (UI 완료, 로컬 상태 관리 완료, API 연동 필요)
- [x] Day 10: 주거 요구조건 관리 (UI 완료, 로컬 상태 관리 완료, API 연동 필요)
- [x] Day 11: 체크리스트 (UI 완료, 로컬 상태 관리 완료, API 및 템플릿 데이터 미구현)
- [x] Day 12-13: 채팅 기능 (UI 완료, API 및 폴링 로직 미구현)
- [ ] Day 14: 통합 테스트 (대기 중)

---

## 참고사항

- 각 작업 완료 시 체크박스 체크
- 버그 발견 시 즉시 수정
- 일정 지연 시 우선순위 재조정
- 주간 회고 및 다음 주 계획 수립

---

## 현재 상태 요약 (2025-01-27 업데이트)

### ✅ 완료된 작업

1. **프로젝트 초기 설정**: Next.js 15, TypeScript, Tailwind CSS, pnpm 설정 완료
2. **Clerk 인증 시스템**: 로그인, 회원가입, 역할 선택, 미들웨어 완료
3. **Supabase 데이터베이스**: 스키마 생성, RLS 정책 설정 완료
4. **UI 컴포넌트**: 모든 탭 컴포넌트 (Profile, Housing, Checklist, Chat) 완료
5. **페이지 구조**: 에이전트 대시보드, 클라이언트 상세, 클라이언트 홈 페이지 완료
6. **API 일부 구현**: 클라이언트 목록 조회 (GET), 클라이언트 생성 (POST) 완료
7. **로컬 상태 관리**: ProfileTab, HousingTab, ChecklistTab 저장 기능 구현 (Mock 데이터 기반)

### ⚠️ 진행 중인 작업

1. **데이터 연동**: Mock 데이터를 실제 API로 교체 필요
2. **API 구현**:
   - 클라이언트 상세 조회 (GET /api/clients/[id])
   - 클라이언트 수정 (PATCH /api/clients/[id])
   - 주거 요구사항 API (GET/PATCH /api/housing/[client_id])
   - 체크리스트 API (GET/PATCH /api/checklist/[client_id])
   - 메시지 API (POST /api/messages, GET /api/messages/[client_id])
3. **체크리스트 템플릿**: 마이그레이션으로 템플릿 데이터 생성 필요
4. **채팅 폴링**: 5초 간격 폴링 로직 구현 필요

### 📋 다음 우선순위 (즉시 시작 가능)

#### 1단계: 클라이언트 프로필 API 구현 (우선순위: 높음)

- [ ] `GET /api/clients/[id]` - 클라이언트 상세 조회
- [ ] `PATCH /api/clients/[id]` - 클라이언트 정보 수정
- [ ] 클라이언트 상세 페이지에서 Mock 데이터 제거 및 API 연동
- [ ] ProfileTab의 `onSave` 핸들러를 실제 API 호출로 교체

#### 2단계: 주거 요구사항 API 구현 (우선순위: 높음)

- [ ] `GET /api/housing/[client_id]` - 주거 요구사항 조회
- [ ] `PATCH /api/housing/[client_id]` - 주거 요구사항 업데이트
- [ ] HousingTab의 `onSave` 핸들러를 실제 API 호출로 교체

#### 3단계: 체크리스트 API 구현 (우선순위: 중간)

- [ ] 체크리스트 템플릿 데이터 마이그레이션 생성
- [ ] `GET /api/checklist/[client_id]` - 체크리스트 조회
- [ ] `PATCH /api/checklist/[client_id]` - 체크리스트 항목 업데이트
- [ ] ChecklistTab의 `onSave` 핸들러를 실제 API 호출로 교체

#### 4단계: 메시지 API 구현 (우선순위: 중간)

- [ ] `POST /api/messages` - 메시지 전송
- [ ] `GET /api/messages/[client_id]` - 메시지 히스토리 조회
- [ ] 폴링 로직 구현 (5초 간격)
- [ ] ChatTab의 Mock 데이터 제거 및 API 연동

#### 5단계: 통합 및 테스트 (우선순위: 높음)

- [ ] 전체 플로우 테스트
- [ ] 에러 핸들링 개선
- [ ] UI/UX 개선
- [ ] 성능 최적화

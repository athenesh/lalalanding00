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

### Phase 4: 데이터 연동 (완료 ✅)

- [x] Supabase 스키마 확인 및 확장
- [x] API Routes 생성 (clients, checklist, housing, messages) ✅
- [x] Mock 데이터 제거 및 실제 데이터 연동 ✅
- [x] 클라이언트 사이드 데이터 페칭 (fetch API 사용)

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
- [x] Mock 데이터 제거 및 실제 API 연동 ✅

---

### Week 2: 핵심 기능 구현

#### Day 8-9: 클라이언트 프로필 관리

- [x] 클라이언트 생성 API (`POST /api/clients`)
- [x] 클라이언트 상세 조회 API (`GET /api/clients/[id]`) ✅
- [x] 클라이언트 수정 API (`PATCH /api/clients/[id]`) ✅
- [x] 클라이언트 프로필 폼 컴포넌트:
  - [x] 이름 (필수)
  - [x] 이메일 (필수)
  - [x] 전화번호 (선택)
  - [x] 직업 (필수) - 드롭다운
  - [x] 이주 예정일 (필수) - 날짜 선택기
- [x] 에이전트 클라이언트 상세 페이지 (`/agent/client/[id]`) (UI 완료, API 연동 완료)
- [x] 클라이언트 홈 페이지 (`/client/home`) (UI 완료, API 연동 완료)
- [x] 프로필 저장 기능 (API 연동 완료)
- [x] 프로필 편집 권한 확인 (에이전트/클라이언트) ✅
- [x] Mock 데이터 제거 및 실제 API 연동 ✅

#### Day 10: 주거 요구조건 관리

- [x] 주거 요구사항 조회 API (`GET /api/housing/[client_id]`) ✅
- [x] 주거 요구사항 업데이트 API (`PATCH /api/housing/[client_id]`) ✅
- [x] 주거 요구조건 폼 컴포넌트:
  - [x] 희망 지역 (자유 입력)
  - [x] 예산 범위 (최대) - USD/월
  - [x] 주거 형태 (드롭다운)
  - [x] 침실 수 (선택)
  - [x] 욕실 수 (선택)
- [x] 주거 옵션 탭 UI (API 연동 완료)
- [x] 폼 유효성 검사
- [x] 주거 옵션 저장 기능 (API 연동 완료)
- [x] Mock 데이터 제거 및 실제 API 연동 ✅

#### Day 11: 체크리스트

- [x] 체크리스트 템플릿 데이터 생성 (마이그레이션) ✅
  - [x] 출국 전 준비 항목 (6개):
    - [x] 국제운전면허증 발급 (상세 설명 포함)
    - [x] 비자 확인
    - [x] 항공권 예약
    - [x] 짐 정리
    - [x] 기타 준비사항
  - [x] 입국 직후 항목 (4개):
    - [x] 집 렌트 (가장 먼저 진행, 상세 설명 포함)
    - [x] SSN 발급 신청 (최대한 빨리 신청 필요, 상세 설명 포함)
    - [x] 은행 계좌 개설 (상세 설명 포함)
    - [x] 유틸리티 신청 (상세 설명 포함)
  - [x] 정착 단계 항목 (5개):
    - [x] 운전면허 취득 (상세 설명 포함)
    - [x] 차량 구매/리스 (상세 설명 포함)
    - [x] 자동차 보험 (상세 설명 포함)
    - [x] 자녀 학교 등록 (해당 시)
    - [x] 의료보험 가입
  - [x] 정착 완료 항목 (1개)
- [x] 체크리스트 조회 API (`GET /api/checklist/[client_id]`) ✅
- [x] 체크리스트 항목 업데이트 API (`PATCH /api/checklist/[client_id]`) ✅
- [x] 체크리스트 파일 관리 API (업로드/다운로드/삭제) ✅
- [x] 체크리스트 UI:
  - [x] 카테고리별 그룹화 (출국 전 / 입국 직후 / 정착 단계)
  - [x] 체크박스 토글
  - [x] 완료율 프로그레스 바
  - [x] 각 항목별 상세 설명 표시 (토글 또는 모달)
  - [x] 필요 서류 표시
  - [x] 항목별 중요도 표시 (예: 집 렌트 - 가장 먼저, SSN - 최대한 빨리)
- [x] 체크리스트 탭 UI (API 연동 완료)
- [x] 체크리스트 저장 기능 (API 연동 완료)
- [x] Mock 데이터 제거 및 실제 API 연동 ✅

#### Day 12-13: 채팅 기능 (폴링 방식)

- [x] 메시지 전송 API (`POST /api/messages`) ✅
- [x] 메시지 히스토리 조회 API (`GET /api/messages`) ✅
- [x] 리스팅 통합 기능 (Gemini 리스팅 추출, Bridge Data API 연동) ✅
- [x] 채팅 UI 컴포넌트:
  - [x] 메시지 리스트
  - [x] 메시지 입력 폼
  - [x] 카카오톡 스타일 말풍선
  - [x] 타임스탬프 표시
  - [x] 리스팅 카드 표시
- [x] 폴링 로직 구현 (5초 간격, 환경 변수로 조정 가능) ✅
- [x] 채팅 탭 UI (API 연동 완료)
- [ ] 무한 스크롤 (메시지 히스토리)
- [x] Mock 데이터 제거 및 실제 API 연동 ✅

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

### 파일 공유 (일부 완료 ✅)

- [x] Supabase Storage 설정 ✅
- [x] 파일 업로드 API ✅ (체크리스트 파일 관리)
- [x] 파일 다운로드 기능 ✅ (체크리스트 파일 관리)
- [x] 파일 목록 UI ✅ (체크리스트 파일 관리)
- [ ] 일반 파일 공유 기능 (채팅 첨부 파일 등)

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

## Phase 1 완료된 추가 기능

### 리스팅 통합 기능 (완료 ✅)

- [x] Gemini 리스팅 추출 서버 액션 (`actions/gemini-listing.ts`)
  - [x] 채팅 메시지에서 리스팅 URL 감지 및 추출
  - [x] Gemini API를 통한 리스팅 정보 추출
  - [x] 리스팅 이미지 추출 (og:image 메타 태그)
  - [x] 에러 처리 및 타임아웃 설정
- [x] Bridge Data API 연동 (`actions/bridge-listing.ts`)
  - [x] Bridge Data Output API 키 설정
  - [x] MLS 데이터 조회 기능
  - [x] 리스팅 정보 파싱 및 저장
- [x] 리스팅 카드 컴포넌트 (`components/client/listing-card.tsx`)
  - [x] 리스팅 정보 표시 (주소, 가격, 침실/욕실 수 등)
  - [x] 썸네일 이미지 표시 (Next.js Image 최적화)
  - [x] 리스팅 제외 기능
  - [x] 리스팅 메모 기능
- [x] 채팅 탭에 리스팅 통합
  - [x] 메시지에서 리스팅 URL 자동 감지
  - [x] 리스팅 정보 자동 추출 및 저장
  - [x] 리스팅 카드 자동 표시
- [x] Next.js Image 설정 업데이트 (Redfin, Zillow 도메인 추가)

### 체크리스트 파일 관리 (완료 ✅)

- [x] 파일 업로드 API (`POST /api/client/checklist/files`)
  - [x] 체크리스트 항목별 파일 업로드
  - [x] 권한 부여된 사용자(배우자 등) 업로드 지원
  - [x] Storage RLS 정책 설정
- [x] 파일 다운로드 API (`GET /api/client/checklist/files/download`)
  - [x] 파일 다운로드 기능
  - [x] 권한 확인
- [x] 파일 목록 조회 API (`GET /api/client/checklist/files`)
  - [x] 체크리스트 항목별 파일 목록 조회
- [x] 파일 삭제 API (`DELETE /api/client/checklist/files`)
  - [x] 파일 삭제 기능
  - [x] Storage에서 파일 제거
- [x] 체크리스트 탭에 파일 관리 UI 통합
  - [x] 파일 업로드 버튼
  - [x] 파일 목록 표시
  - [x] 파일 다운로드/삭제 기능

---

## Post MVP: 추가 기능 확장

### 리스팅 통합 기능 확장 (일부 완료 ✅)

- [x] 리스팅 URL 감지 및 파싱 유틸리티 함수 구현 (`lib/listing/url-parser.ts`) ✅
- [x] 부동산 정보 카드 컴포넌트 개발 (`components/client/listing-card.tsx`) ✅
- [x] Gemini 리스팅 추출 서버 액션 (`actions/gemini-listing.ts`) ✅
- [x] Bridge Data API 연동 (`actions/bridge-listing.ts`) ✅
- [x] ChatTab 컴포넌트에 리스팅 링크 감지 로직 추가 ✅
- [x] 부동산 정보 추출 로직 구현 (Gemini API + 이미지 추출) ✅
- [x] 에러 핸들링 및 로딩 상태 처리 ✅
- [x] 리스팅 정보 캐싱 기능 (`shared_listings` 테이블) ✅
- [x] 여러 리스팅 링크 처리 로직 ✅
- [x] 이미지 추출 기능 (`actions/gemini-listing.ts` 내 통합) ✅
- [x] Next.js Image 설정 업데이트 (Redfin, Zillow 도메인 추가) ✅
- [x] ListingCard 컴포넌트에 이미지 표시 ✅
- [ ] 추가 리스팅 사이트 지원 (Redfin 외 다른 사이트)

---

## 우선순위별 정리

### P0 (필수 - Phase 1)

1. ✅ Clerk 인증 시스템 (완료)
2. ✅ 에이전트 대시보드 (완료)
3. ✅ 클라이언트 프로필 관리 (완료)
4. ✅ 주거 요구조건 (완료)
5. ✅ 체크리스트 (완료 - API, 템플릿, 파일 관리 포함)
6. ⚠️ 기본 채팅 (API 완료, 폴링 로직만 남음)

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

### Week 1 진행률: 100% ✅

- [x] Day 1-2: 프로젝트 초기 설정 (100%)
- [x] Day 3-4: Clerk 인증 시스템 (100%)
- [x] Day 5: Supabase 데이터베이스 설정 (100%)
- [x] Day 6-7: 에이전트 대시보드 (100%)

### Week 2 진행률: 약 85% ⚠️

- [x] Day 8-9: 클라이언트 프로필 관리 (100%) ✅
- [x] Day 10: 주거 요구조건 관리 (100%) ✅
- [x] Day 11: 체크리스트 (100%) ✅
- [x] Day 12-13: 채팅 기능 (100% - API 완료, 폴링 로직 완료) ✅
- [ ] Day 14: 통합 테스트 (대기 중)

### Phase 1 MVP Core 전체 진행률: 약 95% ✅

**완료된 주요 기능:**

- ✅ 인증 시스템 (Clerk)
- ✅ 데이터베이스 스키마 및 RLS 정책
- ✅ 클라이언트 관리 API (에이전트용, 클라이언트용)
- ✅ 주거 요구사항 API (에이전트용, 클라이언트용)
- ✅ 체크리스트 API 및 템플릿 데이터
- ✅ 체크리스트 파일 관리 (업로드/다운로드/삭제)
- ✅ 메시지 API (전송/조회)
- ✅ 채팅 폴링 로직 (환경 변수 기반, 자동 복구, 백오프 적용)
- ✅ 리스팅 통합 기능 (Gemini, Bridge Data)

**남은 작업:**

- ⚠️ 통합 테스트 및 버그 수정
- ⚠️ UI 컴포넌트 최종 연동 확인

---

## 참고사항

- 각 작업 완료 시 체크박스 체크
- 버그 발견 시 즉시 수정
- 일정 지연 시 우선순위 재조정
- 주간 회고 및 다음 주 계획 수립

---

## 현재 상태 요약 (2025-01-28 업데이트)

### ✅ 완료된 작업

1. **프로젝트 초기 설정**: Next.js 15, TypeScript, Tailwind CSS, pnpm 설정 완료
2. **Clerk 인증 시스템**: 로그인, 회원가입, 역할 선택, 미들웨어 완료
3. **Supabase 데이터베이스**: 스키마 생성, RLS 정책 설정 완료
4. **UI 컴포넌트**: 모든 탭 컴포넌트 (Profile, Housing, Checklist, Chat) 완료
5. **페이지 구조**: 에이전트 대시보드, 클라이언트 상세, 클라이언트 홈 페이지 완료
6. **클라이언트 관리 API**:
   - 에이전트용: 목록 조회, 생성, 상세 조회, 수정, 할당, 자동 생성
   - 클라이언트용: 프로필 조회, 프로필 수정
7. **주거 요구사항 API**:
   - 에이전트용: 조회, 업데이트
   - 클라이언트용: 조회, 업데이트
8. **체크리스트 API**:
   - 에이전트용: 조회, 업데이트
   - 클라이언트용: 조회, 업데이트
   - 파일 관리: 업로드, 다운로드, 삭제
9. **체크리스트 템플릿**: 마이그레이션으로 템플릿 데이터 생성 완료 (16개 항목)
10. **메시지 API**: 메시지 전송, 히스토리 조회 완료
11. **리스팅 통합 기능**: Gemini 리스팅 추출, Bridge Data API 연동 완료
12. **데이터 연동**: 대부분의 UI 컴포넌트가 실제 API와 연동 완료

### ⚠️ 진행 중인 작업

1. **통합 테스트**: 전체 플로우 테스트 및 버그 수정
2. **UI 연동 최종 확인**: 일부 컴포넌트의 API 연동 상태 확인 필요

### 📋 다음 우선순위 (즉시 시작 가능)

#### 1단계: 채팅 폴링 로직 구현 (완료 ✅)

- [x] ChatTab 컴포넌트에 폴링 로직 추가 (5초 간격, 환경 변수로 조정 가능)
- [x] 메시지 자동 새로고침 기능 구현 (전송 후 즉시 새로고침)
- [x] 폴링 중 에러 처리 및 재연결 로직 (자동 복구, 백오프 적용)
- [x] 컴포넌트 언마운트 시 폴링 정리 (cleanup)
- [x] 페이지 포커스 감지 (백그라운드 시 폴링 중지)
- [x] 온라인/오프라인 상태 감지
- [x] 환경 변수 기반 설정 파일 생성 (`lib/config/chat.ts`)

#### 2단계: 통합 테스트 및 버그 수정 (우선순위: 높음)

- [ ] 전체 플로우 테스트:
  - [ ] 에이전트 회원가입 → 클라이언트 추가 → 정보 입력
  - [ ] 클라이언트 회원가입 → 정보 입력 → 채팅
  - [ ] 체크리스트 파일 업로드/다운로드
  - [ ] 리스팅 링크 전송 및 카드 표시
- [ ] 에러 핸들링 개선
- [ ] UI/UX 개선
- [ ] 성능 최적화

#### 3단계: UI 컴포넌트 최종 연동 확인 (우선순위: 중간)

- [ ] 모든 탭 컴포넌트의 API 연동 상태 확인
- [ ] 에러 상태 처리 확인
- [ ] 로딩 상태 처리 확인
- [ ] 데이터 동기화 확인

#### 4단계: 문서 업데이트 (우선순위: 낮음)

- [ ] API_STATUS.md 업데이트 (메시지 API 상태 수정)
- [ ] README.md 업데이트 (프로젝트 상태 반영)

---

## 🚀 프로덕션 배포 전 체크리스트

이 섹션은 프로덕션 배포 전에 순서대로 실행해야 하는 필수 작업들을 포함합니다.

### Phase 1: 데이터베이스 보안 설정 (최우선)

#### 1.1 RLS 마이그레이션 적용

- [ ] **Step 1**: Supabase Dashboard → SQL Editor 열기
- [ ] **Step 2**: `supabase/migrations/20251205203448_enable_rls_production.sql` 파일 내용 복사
- [ ] **Step 3**: SQL Editor에 붙여넣기 후 실행
- [ ] **Step 4**: 실행 결과 확인 (모든 테이블에 RLS 활성화 확인)
- [ ] **Step 5**: `supabase/migrations/20251205203537_fix_function_search_path.sql` 파일 내용 복사
- [ ] **Step 6**: SQL Editor에 붙여넣기 후 실행
- [ ] **Step 7**: RLS 상태 확인 쿼리 실행:
      SELECT
      schemaname,
      tablename,
      rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
  - [ ] **Step 8**: 모든 테이블의 `rowsecurity`가 `true`인지 확인

#### 1.2 Storage RLS 정책 확인

- [ ] Supabase Dashboard → Storage → `uploads` 버킷 확인
- [ ] RLS 정책이 올바르게 설정되어 있는지 확인
- [ ] 파일 업로드/다운로드 테스트 (개발 환경)

### Phase 2: 환경 변수 설정

#### 2.1 `.env.example` 파일 생성

- [ ] 프로젝트 루트에 `.env.example` 파일 생성
- [ ] 필수 환경 변수 목록 작성:

  # Clerk Authentication

  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
  CLERK_SECRET_KEY=
  NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
  NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
  NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

  # Supabase

  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  NEXT_PUBLIC_STORAGE_BUCKET=uploads

  # Gemini API (리스팅 정보 추출)

  GEMINI_API_KEY=

  # Bridge Data API (선택사항)

  BRIDGE_DATA_API_KEY=

  # 채팅 폴링 설정 (선택사항, 기본값 사용 가능)

  NEXT_PUBLIC_CHAT_POLLING_INTERVAL=5000
  NEXT_PUBLIC_CHAT_MAX_RETRY_COUNT=5
  NEXT_PUBLIC_CHAT_BACKOFF_MULTIPLIER=2

  #### 2.2 프로덕션 환경 변수 준비

- [ ] Clerk 프로덕션 프로젝트 생성 (또는 기존 프로젝트 확인)
- [ ] Clerk 프로덕션 키 확인:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (프로덕션)
  - `CLERK_SECRET_KEY` (프로덕션)
- [ ] Supabase 프로덕션 프로젝트 생성 (또는 기존 프로젝트 확인)
- [ ] Supabase 프로덕션 키 확인:
  - `NEXT_PUBLIC_SUPABASE_URL` (프로덕션)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (프로덕션)
  - `SUPABASE_SERVICE_ROLE_KEY` (프로덕션, 절대 노출 금지)
- [ ] Gemini API 키 확인 (프로덕션)
- [ ] Bridge Data API 키 확인 (선택사항)

### Phase 3: 통합 테스트 (수동)

#### 3.1 인증 및 권한 테스트

- [ ] **에이전트 회원가입 플로우**:
  - [ ] `/sign-up/agent` 페이지 접근
  - [ ] 회원가입 완료
  - [ ] `/agent/dashboard` 접근 확인
- [ ] **클라이언트 회원가입 플로우**:
  - [ ] `/sign-up/client` 페이지 접근
  - [ ] 회원가입 완료
  - [ ] `/client/home` 접근 확인
- [ ] **권한 테스트**:
  - [ ] 에이전트로 로그인 → 클라이언트 전용 페이지 접근 시도 → 차단 확인
  - [ ] 클라이언트로 로그인 → 에이전트 전용 페이지 접근 시도 → 차단 확인

#### 3.2 에이전트 기능 테스트

- [ ] **클라이언트 관리**:
  - [ ] 에이전트 대시보드에서 클라이언트 목록 확인
  - [ ] 새 클라이언트 추가 (자동 생성 또는 수동 생성)
  - [ ] 클라이언트 상세 페이지 접근
  - [ ] 클라이언트 프로필 수정
- [ ] **주거 요구조건**:
  - [ ] 주거 요구조건 입력 및 저장
  - [ ] 주거 요구조건 수정
- [ ] **체크리스트**:
  - [ ] 체크리스트 항목 확인 (16개 항목 모두 표시되는지)
  - [ ] 체크리스트 항목 완료 처리
  - [ ] 체크리스트 파일 업로드
  - [ ] 체크리스트 파일 다운로드
  - [ ] 체크리스트 파일 삭제
- [ ] **채팅**:
  - [ ] 메시지 전송
  - [ ] 메시지 히스토리 확인
  - [ ] 리스팅 URL 전송 및 카드 표시 확인

#### 3.3 클라이언트 기능 테스트

- [ ] **프로필 관리**:
  - [ ] 프로필 정보 확인
  - [ ] 프로필 정보 수정
- [ ] **주거 요구조건**:
  - [ ] 주거 요구조건 확인 및 수정
- [ ] **체크리스트**:
  - [ ] 체크리스트 항목 확인
  - [ ] 체크리스트 항목 완료 처리
  - [ ] 체크리스트 파일 업로드/다운로드/삭제
- [ ] **채팅**:
  - [ ] 에이전트와 메시지 주고받기
  - [ ] 리스팅 URL 전송 및 카드 표시

#### 3.4 에러 핸들링 테스트

- [ ] 잘못된 입력값으로 API 호출 → 적절한 에러 메시지 표시 확인
- [ ] 인증되지 않은 상태에서 보호된 API 접근 → 401 에러 확인
- [ ] 권한 없는 리소스 접근 → 403 에러 확인
- [ ] 존재하지 않는 리소스 접근 → 404 에러 확인

### Phase 4: SEO 및 메타데이터 설정

#### 4.1 robots.ts 파일 생성

- [ ] `app/robots.ts` 파일 생성
- [ ] 기본 robots.txt 설정 작성

#### 4.2 sitemap.ts 파일 생성

- [ ] `app/sitemap.ts` 파일 생성
- [ ] 주요 페이지 경로 포함:
  - `/` (랜딩 페이지)
  - `/sign-in`
  - `/sign-up`
  - `/agent/dashboard`
  - `/client/home`

### Phase 5: 모니터링 및 로깅 설정 (선택사항, 권장)

#### 5.1 Sentry 연동 (선택사항)

- [ ] Sentry 계정 생성
- [ ] `@sentry/nextjs` 패키지 설치
- [ ] Sentry 초기화 (`npx @sentry/wizard@latest -i nextjs`)
- [ ] 환경 변수 설정:
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_AUTH_TOKEN`
- [ ] 보안 이벤트 로깅 활성화 (`lib/logging/security-events.ts`)

#### 5.2 Supabase 로그 모니터링

- [ ] Supabase Dashboard → Logs 확인
- [ ] API 로그 모니터링 활성화
- [ ] 에러 알림 설정

### Phase 6: 프로덕션 배포 준비

#### 6.1 Vercel 프로젝트 설정

- [ ] Vercel Dashboard → 새 프로젝트 생성
- [ ] GitHub 저장소 연결
- [ ] 빌드 설정 확인:
  - Framework Preset: Next.js
  - Build Command: `pnpm build`
  - Output Directory: `.next`
- [ ] 환경 변수 설정 (Phase 2에서 준비한 값들)

#### 6.2 프로덕션 Supabase 프로젝트 설정

- [ ] Supabase 프로덕션 프로젝트 생성
- [ ] 모든 마이그레이션 적용 (Phase 1.1에서 확인한 마이그레이션들)
- [ ] Storage 버킷 설정 (`uploads` 버킷 생성)
- [ ] 백업 설정 활성화

#### 6.3 최종 확인

- [ ] 프로덕션 빌드 테스트 (`pnpm build` 로컬에서 실행)
- [ ] 빌드 에러 없음 확인
- [ ] 환경 변수 모두 설정 확인
- [ ] RLS 마이그레이션 적용 확인

### Phase 7: 배포 및 배포 후 확인

#### 7.1 배포 실행

- [ ] Vercel에 배포
- [ ] 배포 완료 확인

#### 7.2 배포 후 확인사항

- [ ] 프로덕션 URL 접근 확인
- [ ] 인증 흐름 테스트 (로그인/회원가입)
- [ ] RLS 정책 작동 확인 (데이터 접근 권한)
- [ ] 파일 업로드/다운로드 테스트
- [ ] 채팅 기능 테스트
- [ ] 에러 로깅 작동 확인
- [ ] 성능 모니터링 확인

---

## 📝 배포 전 체크리스트 실행 가이드

### 실행 순서

1. **Phase 1** (데이터베이스 보안) → 필수, 최우선
2. **Phase 2** (환경 변수) → 필수
3. **Phase 3** (통합 테스트) → 필수
4. **Phase 4** (SEO) → 권장
5. **Phase 5** (모니터링) → 선택사항, 권장
6. **Phase 6** (배포 준비) → 필수
7. **Phase 7** (배포 및 확인) → 필수

### 각 Phase 완료 후

- 체크박스를 체크하여 진행 상황 추적
- 문제 발견 시 즉시 수정 후 재테스트
- 중요한 문제는 문서화 (`docs/ERROR_FIX_SUMMARY.md` 등)

### 배포 일정

- **목표 배포일**: [날짜 입력]
- **스테이징 배포**: Phase 1-3 완료 후
- **프로덕션 배포**: 모든 Phase 완료 후

# 관리자 시스템 설계 문서

## 1. 개요

이 문서는 미국 이주 지원 플랫폼의 관리자 시스템 전체 구조를 정의합니다.

### 1.1 목적

- 플랫폼의 효율적인 운영 및 유지보수
- 모든 사용자 및 데이터의 중앙 관리
- 시스템 설정 및 통계 모니터링
- 보안 및 권한 관리

### 1.2 관리자 인증

- **인증 방식**: 이메일 기반 (환경 변수 `ADMIN_EMAIL`)
- **현재 단계**: 단일 관리자 지원
- **확장 계획**: Phase 2에서 다중 관리자 지원 고려

---

## 2. 시스템 아키텍처

### 2.1 데이터 흐름

```
┌─────────────────┐
│  Admin Browser  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Next.js App    │
│  /admin/*       │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│ Clerk  │ │ Supabase │
│  Auth  │ │   DB     │
│        │ │ (Service │
│        │ │  Role)   │
└────────┘ └──────────┘
```

### 2.2 권한 체크 흐름

1. **페이지 접근**: `requireAdmin()` 미들웨어/서버 컴포넌트에서 체크
2. **API 호출**: 각 API 라우트에서 `isAdmin()` 체크
3. **데이터 접근**: Service Role Client 사용 (RLS 우회)

---

## 3. 데이터베이스 스키마

### 3.1 기존 테이블 (읽기/쓰기 가능)

- `accounts`: 에이전트 계정
- `clients`: 클라이언트 정보
- `chat_rooms`: 채팅방
- `chat_messages`: 채팅 메시지
- `checklist_items`: 체크리스트 항목
- `checklist_templates`: 체크리스트 템플릿
- `housing_requirements`: 주거 요구사항
- `shared_listings`: 공유된 리스팅
- `client_authorizations`: 클라이언트 권한 부여
- `agent_notes`: 에이전트 노트

### 3.2 신규 테이블

#### platform_settings (시스템 설정)

```sql
CREATE TABLE platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL, -- 'platform_fee_percentage', 'maintenance_mode', etc.
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_by TEXT -- admin clerk_id
);

CREATE INDEX idx_platform_settings_key ON platform_settings(key);
```

**설정 키 예시**:
- `platform_fee_percentage`: 플랫폼 수수료 비율 (예: "5.0")
- `maintenance_mode`: 점검 모드 활성화 여부 (예: "false")
- `max_clients_per_agent`: 에이전트당 최대 클라이언트 수 (예: "50")

#### admin_activity_logs (활동 로그) - Phase 2

```sql
CREATE TABLE admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_clerk_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'approve_agent', 'delete_client', 'update_settings'
  resource_type TEXT, -- 'agent', 'client', 'settings'
  resource_id TEXT,
  details JSONB, -- 변경 전/후 데이터
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_admin_activity_logs_admin ON admin_activity_logs(admin_clerk_id);
CREATE INDEX idx_admin_activity_logs_action ON admin_activity_logs(action);
CREATE INDEX idx_admin_activity_logs_created_at ON admin_activity_logs(created_at DESC);
```

---

## 4. API 엔드포인트 구조

### 4.1 대시보드

```
GET /api/admin/dashboard/stats
Response: {
  totalClients: number,
  totalAgents: number,
  pendingAgents: number,
  totalMessages: number,
  recentActivity: Array<{...}>
}
```

### 4.2 클라이언트 관리

```
GET    /api/admin/clients              - 전체 클라이언트 목록
GET    /api/admin/clients/[id]          - 클라이언트 상세
PATCH  /api/admin/clients/[id]          - 클라이언트 수정
DELETE /api/admin/clients/[id]          - 클라이언트 삭제 (소프트 삭제)
GET    /api/admin/clients/[id]/messages - 클라이언트 메시지 조회
```

### 4.3 에이전트 관리

```
GET    /api/admin/agents                - 에이전트 목록 (기존)
GET    /api/admin/agents/[id]           - 에이전트 상세 (신규)
PATCH  /api/admin/agents/[id]           - 에이전트 정보 수정 (신규)
POST   /api/admin/agents/[id]/approve   - 에이전트 승인 (기존)
POST   /api/admin/agents/[id]/reject    - 에이전트 거부 (기존)
GET    /api/admin/agents/[id]/clients   - 에이전트의 클라이언트 목록 (신규)
```

### 4.4 통계/분석

```
GET /api/admin/analytics/overview       - 전체 통계 개요
GET /api/admin/analytics/users         - 사용자 통계 (일별/월별 가입자)
GET /api/admin/analytics/agents        - 에이전트 통계 (성과 지표)
GET /api/admin/analytics/clients        - 클라이언트 통계 (이주 일정 등)
```

### 4.5 시스템 설정

```
GET    /api/admin/settings              - 모든 설정 조회
PATCH  /api/admin/settings              - 설정 일괄 업데이트
GET    /api/admin/settings/platform-fee - Platform Fee 조회
PATCH  /api/admin/settings/platform-fee - Platform Fee 업데이트
```

### 4.6 메시지 관리 (선택)

```
GET /api/admin/messages                 - 전체 메시지 조회 (페이지네이션)
GET /api/admin/messages/[client_id]     - 특정 클라이언트 메시지
DELETE /api/admin/messages/[id]         - 메시지 삭제 (신중하게)
```

---

## 5. 페이지 구조

### 5.1 디렉토리 구조

```
app/
  admin/
    layout.tsx              - 관리자 레이아웃 (네비게이션 포함)
    dashboard/
      page.tsx              - 대시보드 메인
    clients/
      page.tsx              - 클라이언트 목록
      [id]/
        page.tsx            - 클라이언트 상세
    agents/
      page.tsx              - 에이전트 목록 (기존)
      [id]/
        page.tsx            - 에이전트 상세 (신규)
    analytics/
      page.tsx              - 통계/분석 페이지
    settings/
      page.tsx              - 시스템 설정 페이지
```

### 5.2 공통 컴포넌트

```
components/
  admin/
    admin-nav.tsx           - 관리자 네비게이션 사이드바
    stats-card.tsx          - 통계 카드 컴포넌트
    data-table.tsx           - 데이터 테이블 (재사용 가능)
    client-card.tsx          - 클라이언트 카드 (에이전트 UI 재사용)
    agent-card.tsx           - 에이전트 카드 (기존 UI 재사용)
```

---

## 6. 보안 고려사항

### 6.1 권한 체크

- **모든 관리자 페이지**: `requireAdmin()` 사용
- **모든 관리자 API**: `isAdmin()` 체크 필수
- **미들웨어**: `/admin/*` 경로 보호

### 6.2 데이터 접근

- **Service Role Client**: 서버 사이드에서만 사용
- **RLS 우회**: 관리자만 Service Role 사용
- **민감한 작업**: 이중 확인 또는 로그 기록

### 6.3 감사 로그

- **Phase 1**: 콘솔 로그 (중요 작업만)
- **Phase 2**: `admin_activity_logs` 테이블에 기록

---

## 7. 구현 단계

### Phase 1: 핵심 관리 기능 (우선순위)

1. **관리자 대시보드** (`/admin/dashboard`)
   - 통계 개요 카드
   - 최근 활동 요약
   - 승인 대기 알림

2. **클라이언트 관리** (`/admin/clients`)
   - 전체 클라이언트 목록
   - 클라이언트 상세 정보
   - 필터링/검색 기능

3. **에이전트 관리 강화** (`/admin/agents`)
   - 기존 기능 유지
   - 에이전트 상세 페이지 추가
   - 에이전트별 클라이언트 수 표시

### Phase 2: 고급 기능

4. **통계/분석** (`/admin/analytics`)
   - 일별/월별 가입자 통계
   - 에이전트별 성과 지표
   - 클라이언트 이주 일정 타임라인

5. **시스템 설정** (`/admin/settings`)
   - Platform Fee 설정
   - 기본 설정 관리
   - 알림 설정

### Phase 3: 고급 관리 (선택적)

6. **메시지/채팅 관리**
   - 전체 메시지 조회
   - 스팸/부적절 메시지 관리

7. **활동 로그 시스템**
   - 관리자 활동 추적
   - 감사 로그 조회

---

## 8. UI/UX 가이드라인

### 8.1 디자인 원칙

- **기존 UI 재사용**: 에이전트/클라이언트 UI 컴포넌트 활용
- **일관성**: 기존 디자인 시스템 유지
- **명확성**: 관리자 기능임을 명확히 표시

### 8.2 네비게이션

- **사이드바**: 관리자 메뉴 (대시보드, 클라이언트, 에이전트, 통계, 설정)
- **헤더**: 기존 Header 컴포넌트 재사용
- **브레드크럼**: 현재 위치 표시

### 8.3 반응형 디자인

- **모바일**: 사이드바 → 햄버거 메뉴
- **태블릿/데스크톱**: 사이드바 고정

---

## 9. 데이터 접근 권한 매트릭스

| 작업 | 읽기 | 수정 | 삭제 | 비고 |
|------|------|------|------|------|
| 클라이언트 | ✅ | ✅ | ⚠️ | 삭제는 소프트 삭제 권장 |
| 에이전트 | ✅ | ✅ | ❌ | 삭제 대신 비활성화 |
| 메시지 | ✅ | ❌ | ⚠️ | 법적 문제 고려 |
| 체크리스트 | ✅ | ✅ | ⚠️ | 템플릿만 관리 |
| 설정 | ✅ | ✅ | ❌ | - |
| 파일 | ✅ | ❌ | ⚠️ | 백업 후 삭제 |

✅ = 가능, ⚠️ = 신중하게, ❌ = 불가능

---

## 10. 성능 고려사항

### 10.1 데이터 로딩

- **페이지네이션**: 대량 데이터는 페이지네이션 필수
- **인덱싱**: 자주 조회되는 컬럼에 인덱스 추가
- **캐싱**: 통계 데이터는 적절히 캐싱

### 10.2 쿼리 최적화

- **JOIN 최소화**: 필요한 데이터만 조회
- **집계 쿼리**: 통계는 데이터베이스에서 집계

---

## 11. 테스트 계획

### 11.1 단위 테스트

- `isAdmin()` 함수 테스트
- API 라우트 권한 체크 테스트

### 11.2 통합 테스트

- 관리자 페이지 접근 테스트
- 관리자 API 호출 테스트
- 비관리자 접근 차단 테스트

### 11.3 E2E 테스트

- 관리자 워크플로우 테스트
- 에이전트 승인 프로세스 테스트
- 클라이언트 관리 프로세스 테스트

---

## 12. 향후 확장 계획

### 12.1 다중 관리자 지원

- `admin_users` 테이블 생성
- 역할 기반 접근 제어 (Super Admin, Admin, Moderator)
- 권한 레벨별 기능 제한

### 12.2 고급 기능

- 자동화된 알림 시스템
- 데이터 내보내기 (CSV/JSON)
- 백업/복원 기능
- 실시간 모니터링 대시보드

---

## 13. 참고 문서

- [TRD.md](./TRD.md) - 기술 요구사항 문서
- [AGENTS.md](../AGENTS.md) - 개발 가이드라인
- [Supabase RLS 가이드](https://supabase.com/docs/guides/auth/row-level-security)

---

**문서 버전**: 1.0  
**최종 수정일**: 2025-01-27  
**작성자**: AI Assistant


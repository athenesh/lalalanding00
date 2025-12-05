# API 구현 현황

> **최종 업데이트**: 2025-01-28  
> **문서 버전**: 1.2

## 📊 구현 현황 요약

| 카테고리                       | 구현 완료 | 미구현 | 진행률    |
| ------------------------------ | --------- | ------ | --------- |
| 인증 및 사용자 관리            | 2         | 0      | 100% ✅   |
| 클라이언트 관리 (에이전트)     | 7         | 0      | 100% ✅   |
| 클라이언트 프로필 (클라이언트) | 2         | 0      | 100% ✅   |
| 주거 요구사항                  | 4         | 0      | 100% ✅   |
| 체크리스트                     | 7         | 0      | 100% ✅   |
| 메시지/채팅                    | 0         | 2      | 0% ❌     |
| **전체**                       | **22**    | **2**  | **91.7%** |

---

## ✅ 구현 완료된 API

### 1. 인증 및 사용자 관리

#### 1.1 POST /api/sync-user

- **용도**: Clerk 사용자를 Supabase `accounts` 테이블에 동기화
- **권한**: 인증된 사용자
- **상태**: ✅ 구현 완료
- **파일**: `app/api/sync-user/route.ts`
- **설명**: 로그인 시 자동으로 실행되며, Clerk 사용자 정보를 Supabase에 저장

#### 1.2 POST /api/set-role

- **용도**: 사용자의 역할(role) 설정
- **권한**: 인증된 사용자
- **상태**: ✅ 구현 완료
- **파일**: `app/api/set-role/route.ts`
- **요청 본문**:
  ```json
  {
    "role": "agent" | "client"
  }
  ```

---

### 2. 클라이언트 관리 (에이전트용)

#### 2.1 GET /api/clients

- **용도**: 에이전트의 클라이언트 목록 조회
- **권한**: 에이전트만 (`requireAgent()`)
- **상태**: ✅ 구현 완료
- **파일**: `app/api/clients/route.ts`
- **응답 예시**:
  ```json
  {
    "clients": [
      {
        "id": "uuid",
        "name": "홍길동",
        "email": "hong@example.com",
        "checklistCompletion": 50
      }
    ]
  }
  ```

#### 2.2 POST /api/clients

- **용도**: 새 클라이언트 생성
- **권한**: 에이전트만
- **상태**: ✅ 구현 완료
- **파일**: `app/api/clients/route.ts`
- **요청 본문**:
  ```json
  {
    "name": "홍길동",
    "email": "hong@example.com",
    "phone": "010-1234-5678",
    "occupation": "doctor",
    "moving_date": "2025-06-01"
  }
  ```

#### 2.3 GET /api/clients/[id]

- **용도**: 클라이언트 상세 정보 조회
- **권한**: 에이전트만 (소유권 확인)
- **상태**: ✅ 구현 완료
- **파일**: `app/api/clients/[id]/route.ts`
- **응답 예시**:
  ```json
  {
    "client": {
      "id": "uuid",
      "name": "홍길동",
      "email": "hong@example.com"
    },
    "familyMembers": [],
    "emergencyContacts": []
  }
  ```

#### 2.4 PATCH /api/clients/[id]

- **용도**: 클라이언트 정보 수정
- **권한**: 에이전트만 (소유권 확인)
- **상태**: ✅ 구현 완료
- **파일**: `app/api/clients/[id]/route.ts`
- **요청 본문**: 클라이언트 정보, 가족 정보, 비상연락망 포함 가능

#### 2.5 GET /api/clients/unassigned

- **용도**: 할당되지 않은 클라이언트 목록 조회
- **권한**: 에이전트만
- **상태**: ✅ 구현 완료
- **파일**: `app/api/clients/unassigned/route.ts`
- **설명**: `owner_agent_id`가 null인 클라이언트만 반환

#### 2.6 PATCH /api/clients/[id]/assign

- **용도**: 클라이언트를 현재 에이전트에게 할당
- **권한**: 에이전트만
- **상태**: ✅ 구현 완료
- **파일**: `app/api/clients/[id]/assign/route.ts`
- **설명**: 할당되지 않은 클라이언트를 에이전트에게 할당

#### 2.7 POST /api/clients/auto-create

- **용도**: 클라이언트 자동 생성
- **권한**: 에이전트만
- **상태**: ✅ 구현 완료
- **파일**: `app/api/clients/auto-create/route.ts`

---

### 3. 클라이언트 프로필 (클라이언트용)

#### 3.1 GET /api/client/profile

- **용도**: 클라이언트 자신의 프로필 정보 조회
- **권한**: 클라이언트만 (`requireClient()`)
- **상태**: ✅ 구현 완료
- **파일**: `app/api/client/profile/route.ts`
- **설명**: `clerk_user_id`로 클라이언트를 자동 조회하여 프로필 반환
- **응답 예시**:
  ```json
  {
    "client": {
      "id": "uuid",
      "name": "홍길동",
      "email": "hong@example.com"
    },
    "familyMembers": [],
    "emergencyContacts": []
  }
  ```

#### 3.2 PATCH /api/client/profile

- **용도**: 클라이언트 자신의 프로필 정보 수정
- **권한**: 클라이언트만
- **상태**: ✅ 구현 완료
- **파일**: `app/api/client/profile/route.ts`
- **요청 본문**: 프로필 정보, 가족 정보, 비상연락망 포함 가능

---

### 4. 주거 요구사항

#### 4.1 GET /api/housing/[client_id] (에이전트용)

- **용도**: 클라이언트의 주거 요구사항 조회
- **권한**: 에이전트만 (소유권 확인)
- **상태**: ✅ 구현 완료
- **파일**: `app/api/housing/[client_id]/route.ts`
- **응답 예시**:
  ```json
  {
    "housing": {
      "preferred_city": "로스앤젤레스, CA",
      "budget_max": 3000,
      "housing_type": ["apartment", "house"],
      "bedrooms": 2,
      "bathrooms": 2,
      "parking": true,
      "parking_count": 2
    }
  }
  ```

#### 4.2 PATCH /api/housing/[client_id] (에이전트용)

- **용도**: 클라이언트의 주거 요구사항 저장/업데이트
- **권한**: 에이전트만 (소유권 확인)
- **상태**: ✅ 구현 완료
- **파일**: `app/api/housing/[client_id]/route.ts`
- **요청 본문**:
  ```json
  {
    "preferredArea": "로스앤젤레스, CA",
    "maxBudget": "3000",
    "housingType": ["apartment"],
    "bedrooms": "2",
    "bathrooms": "2",
    "parking": true,
    "parkingCount": "2"
  }
  ```
- **데이터 변환**: UI 필드명 → DB 필드명, `parkingCount` (string) → `parking_count` (INTEGER)

#### 4.3 GET /api/client/housing (클라이언트용)

- **용도**: 클라이언트 자신의 주거 요구사항 조회
- **권한**: 클라이언트만
- **상태**: ✅ 구현 완료
- **파일**: `app/api/client/housing/route.ts`
- **설명**: `clerk_user_id`로 클라이언트를 자동 조회하여 주거 요구사항 반환

#### 4.4 PATCH /api/client/housing (클라이언트용)

- **용도**: 클라이언트 자신의 주거 요구사항 저장/업데이트
- **권한**: 클라이언트만
- **상태**: ✅ 구현 완료
- **파일**: `app/api/client/housing/route.ts`
- **설명**: 클라이언트가 직접 자신의 주거 요구사항을 수정

---

### 5. 체크리스트

#### 5.1 GET /api/checklist/[client_id]

- **용도**: 클라이언트의 체크리스트 조회
- **권한**: 에이전트만 (소유권 확인)
- **상태**: ✅ 구현 완료
- **파일**: `app/api/checklist/[client_id]/route.ts`
- **응답 예시**:
  ```json
  {
    "checklist": [
      {
        "id": "uuid",
        "title": "국제운전면허증 발급",
        "is_completed": false,
        "order_num": 1,
        "category": "pre_departure"
      }
    ],
    "groupedByCategory": {
      "pre_departure": [...],
      "arrival": [...],
      "settlement": [...]
    }
  }
  ```
- **성능 최적화**: 필드 선택 최적화 적용 (2025-01-28)

#### 5.2 PATCH /api/checklist/[client_id]

- **용도**: 체크리스트 항목들을 업데이트 (여러 항목 한 번에)
- **권한**: 에이전트만 (소유권 확인)
- **상태**: ✅ 구현 완료
- **파일**: `app/api/checklist/[client_id]/route.ts`
- **요청 본문**:
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "completed": true,
        "notes": "완료했습니다",
        "referenceUrl": "https://example.com",
        "completedAt": "2025-01-27T00:00:00Z"
      }
    ]
  }
  ```
- **설명**: 여러 체크리스트 항목을 한 번에 업데이트 가능
- **성능 최적화**: 필드 선택 최적화 적용 (2025-01-28)

#### 5.3 GET /api/client/checklist

- **용도**: 클라이언트 자신의 체크리스트 조회
- **권한**: 클라이언트만 (`requireClient()`)
- **상태**: ✅ 구현 완료
- **파일**: `app/api/client/checklist/route.ts`
- **설명**: `clerk_user_id`로 클라이언트를 자동 조회하여 체크리스트 반환
- **응답 예시**:
  ```json
  {
    "checklist": [
      {
        "id": "uuid",
        "title": "국제운전면허증 발급",
        "is_completed": false,
        "order_num": 1,
        "category": "pre_departure"
      }
    ],
    "groupedByCategory": {
      "pre_departure": [...],
      "arrival": [...],
      "settlement": [...]
    }
  }
  ```
- **성능 최적화**: 필드 선택 최적화 적용 (2025-01-28)

#### 5.4 PATCH /api/client/checklist

- **용도**: 클라이언트 자신의 체크리스트 항목들을 업데이트 (여러 항목 한 번에)
- **권한**: 클라이언트만
- **상태**: ✅ 구현 완료
- **파일**: `app/api/client/checklist/route.ts`
- **요청 본문**:
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "completed": true,
        "notes": "완료했습니다",
        "referenceUrl": "https://example.com",
        "completedAt": "2025-01-27T00:00:00Z"
      }
    ]
  }
  ```
- **설명**: 클라이언트가 직접 자신의 체크리스트를 수정 가능, id가 없는 항목은 새로 생성
- **성능 최적화**: 필드 선택 최적화 적용 (2025-01-28)

#### 5.5 GET /api/client/checklist/files

- **용도**: 체크리스트 항목의 파일 목록 조회
- **권한**: 클라이언트만
- **상태**: ✅ 구현 완료
- **파일**: `app/api/client/checklist/files/route.ts`
- **쿼리 파라미터**:
  - `item_id`: 체크리스트 항목 ID (필수)
- **응답 예시**:
  ```json
  {
    "files": [
      {
        "id": "uuid",
        "name": "document.pdf",
        "url": "https://...",
        "uploadedAt": "2025-01-27T00:00:00Z"
      }
    ]
  }
  ```
- **설명**: 클라이언트가 자신의 체크리스트 항목에 업로드한 파일 목록을 조회

#### 5.6 POST /api/client/checklist/files

- **용도**: 체크리스트 항목에 파일 업로드
- **권한**: 클라이언트만
- **상태**: ✅ 구현 완료
- **파일**: `app/api/client/checklist/files/route.ts`
- **요청 형식**: `multipart/form-data`
- **요청 필드**:
  - `file`: 업로드할 파일 (필수)
  - `item_id`: 체크리스트 항목 ID (필수)
- **응답 예시**:
  ```json
  {
    "success": true,
    "fileUrl": "https://...",
    "documentId": "uuid"
  }
  ```
- **설명**: 클라이언트가 자신의 체크리스트 항목에 파일을 업로드

#### 5.7 DELETE /api/client/checklist/files

- **용도**: 체크리스트 항목의 파일 삭제
- **권한**: 클라이언트만
- **상태**: ✅ 구현 완료
- **파일**: `app/api/client/checklist/files/route.ts`
- **쿼리 파라미터**:
  - `document_id`: 문서 ID (필수)
  - `file_path`: 파일 경로 (필수)
- **응답 예시**:
  ```json
  {
    "success": true
  }
  ```
- **설명**: 클라이언트가 자신의 체크리스트 항목에서 파일을 삭제

### 체크리스트 API 성능 최적화 (2025-01-28)

#### 필드 선택 최적화

모든 체크리스트 API에 필드 선택 최적화가 적용되었습니다:

- **GET API**: `select("*")` → 필요한 필드만 선택

  - 선택 필드: `id,title,category,description,is_completed,notes,reference_url,completed_at,is_required,order_num`
  - 제외 필드: `client_id`, `sub_category`, `template_id`, `actual_cost`, `created_at`

- **PATCH API**: 업데이트된 필드만 반환
  - 선택 필드: `id,is_completed,notes,reference_url,completed_at`

**예상 효과**:

- 응답 크기: 20-30% 감소
- 네트워크 전송 시간 개선
- DB 쿼리 성능 약간 개선

**적용된 API**:

- GET /api/checklist/[client_id]
- PATCH /api/checklist/[client_id]
- GET /api/client/checklist
- PATCH /api/client/checklist

---

## ❌ 미구현 API

### 6. 메시지/채팅

#### 6.1 POST /api/messages

- **용도**: 메시지 전송
- **권한**: 에이전트 또는 클라이언트
- **상태**: ❌ 미구현
- **예상 요청 본문**:
  ```json
  {
    "client_id": "uuid",
    "content": "안녕하세요",
    "sender_type": "agent" | "client"
  }
  ```

#### 6.2 GET /api/messages/[client_id]

- **용도**: 메시지 히스토리 조회 (폴링용)
- **권한**: 에이전트 또는 클라이언트 (소유권 확인)
- **상태**: ❌ 미구현
- **예상 쿼리 파라미터**:
  - `limit`: 페이지당 메시지 수 (기본: 50)
  - `offset`: 오프셋 (기본: 0)
- **예상 응답**:
  ```json
  {
    "messages": [
      {
        "id": "uuid",
        "sender_clerk_id": "user_xxx",
        "sender_type": "client",
        "content": "안녕하세요",
        "created_at": "2025-01-27T00:00:00Z"
      }
    ],
    "total": 10
  }
  ```

---

## 📋 다음 구현 우선순위

### 우선순위 1: 메시지/채팅 API (필수)

1. **POST /api/messages** - 메시지 전송

   - 에이전트와 클라이언트 모두 메시지 전송 가능
   - `messages` 테이블에 저장
   - 실시간 전송 (Phase 1: 폴링, Phase 2: Supabase Realtime)

2. **GET /api/messages/[client_id]** - 메시지 히스토리 조회
   - 폴링을 위한 API (5초 간격)
   - 최신 메시지부터 반환
   - 페이지네이션 지원

---

## 🔍 API 공통 패턴

### 인증 및 권한 확인

#### 에이전트용 API

```typescript
await requireAgent();
const account = await getOrCreateAccount();
// 소유권 확인: .eq("owner_agent_id", account.id)
```

#### 클라이언트용 API

```typescript
await requireClient();
const userId = await getAuthUserId();
// 자동 조회: .eq("clerk_user_id", userId)
```

### 에러 처리 패턴

```typescript
try {
  // API 로직
  console.log("[API] 작업 시작");

  // Supabase 쿼리
  const { data, error } = await supabase.from("table").select();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }

  console.log("[API] 작업 성공");
  return NextResponse.json({ data });
} catch (error) {
  console.error("[API] 에러:", error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
```

### 데이터 변환 패턴

#### UI → DB 변환

```typescript
const updateData = {
  preferred_city: preferredArea?.trim() || null,
  budget_max: maxBudget ? parseInt(maxBudget) : null,
  parking_count: parkingCount ? parseInt(parkingCount.replace("+", "")) : null,
};
```

#### DB → UI 변환

```typescript
const uiData = {
  preferredArea: dbData.preferred_city || "",
  maxBudget: dbData.budget_max?.toString() || "",
  parkingCount:
    dbData.parking_count >= 4 ? "4+" : dbData.parking_count?.toString() || "",
};
```

---

## 📝 참고 정보

### 관련 문서

- [TRD.md](./TRD.md) - 기술 요구사항 문서
- [TODO.md](./TODO.md) - 작업 목록
- [API 테스트 가이드라인](./API_TEST_GUIDE.md) - API 테스트 방법

### 데이터베이스 스키마

- `accounts` - 에이전트 계정
- `clients` - 클라이언트 정보
- `family_members` - 가족 정보
- `emergency_contacts` - 비상연락망
- `housing_requirements` - 주거 요구사항
- `checklist_items` - 체크리스트 항목
- `client_documents` - 클라이언트 문서 (체크리스트 파일)
- `messages` - 메시지 (미구현)

### 주요 파일 위치

- API 라우트: `app/api/`
- 인증 유틸리티: `lib/auth.ts`
- Supabase 클라이언트: `lib/supabase/`
- 타입 정의: `database.types.ts`

---

## 🚀 다음 단계

1. **메시지 API 구현** (우선순위 1)

   - POST /api/messages 구현
   - GET /api/messages/[client_id] 구현
   - 폴링 로직 구현 (5초 간격)

2. **체크리스트 API 추가 최적화** (필요시)

   - 서버 사이드 데이터 변환 (클라이언트 변환 로직 제거)
   - 응답 구조 변경 (categories 배열로 직접 반환)
   - 로깅 최소화

3. **통합 테스트**
   - 모든 API 엔드포인트 테스트
   - 에러 케이스 테스트
   - 성능 테스트

---

**문서 작성일**: 2025-01-27  
**최종 업데이트**: 2025-01-28 (체크리스트 파일 관리 API 추가)  
**작성자**: AI Assistant  
**검토 필요**: ✅

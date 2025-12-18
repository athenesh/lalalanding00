# 관리자 대시보드 접근 문제 해결 가이드

## 문제: 관리자 이메일로 로그인했지만 대시보드가 보이지 않음

### 가능한 원인 및 해결 방법

#### 1. 환경 변수 설정 문제

**원인**: `.env.local` 파일에 `ADMIN_EMAIL`이 설정되지 않았거나 잘못 설정됨

**해결 방법**:

1. 프로젝트 루트에 `.env.local` 파일이 있는지 확인
2. 다음 내용을 추가/수정:

```env
ADMIN_EMAIL=your-actual-email@example.com
```

**중요 사항**:

- `NEXT_PUBLIC_` 접두사는 **필요 없습니다** (서버 사이드 전용)
- 이메일 주소는 Clerk에 등록된 이메일과 **정확히 일치**해야 합니다
- 대소문자는 무시되지만, 공백이나 특수문자는 주의하세요

3. **Next.js 개발 서버 재시작** (필수!)
   ```bash
   # 서버 중지 (Ctrl+C)
   # 서버 재시작
   pnpm dev
   ```

#### 2. 이메일 주소 불일치

**원인**: Clerk에 등록된 이메일과 `ADMIN_EMAIL`이 일치하지 않음

**해결 방법**:

1. Clerk Dashboard에서 사용자 이메일 확인

   - Clerk Dashboard → Users → 해당 사용자 선택
   - Email addresses 섹션에서 정확한 이메일 확인

2. `.env.local`의 `ADMIN_EMAIL`과 비교

   - 정확히 일치하는지 확인
   - 예: `admin@example.com` vs `Admin@Example.com` (대소문자는 무시됨)

3. 브라우저 콘솔에서 확인
   - 개발자 도구 (F12) → Console 탭
   - `[HomePage] 관리자 확인 응답:` 로그 확인
   - `userEmail`과 `adminEmail` 값 비교

#### 3. Next.js 개발 서버 미재시작

**원인**: 환경 변수 변경 후 서버를 재시작하지 않음

**해결 방법**:

```bash
# 1. 현재 실행 중인 서버 중지 (Ctrl+C)
# 2. 서버 재시작
pnpm dev
```

**확인 방법**:

- 서버 로그에서 `[Auth] ADMIN 권한 확인됨:` 메시지 확인
- 또는 `[Auth] ADMIN_EMAIL 환경 변수가 설정되지 않았습니다.` 에러 확인

#### 4. Clerk 사용자 정보 로드 실패

**원인**: `getAuthUser()`가 사용자 정보를 가져오지 못함

**해결 방법**:

1. 브라우저 콘솔 확인

   - `[Auth] isAdmin: 사용자 정보 없음` 메시지 확인
   - Clerk 세션이 유효한지 확인

2. 로그아웃 후 재로그인
   - 완전히 로그아웃
   - 다시 로그인

#### 5. API 라우트 접근 실패

**원인**: `/api/admin/check` API가 작동하지 않음

**해결 방법**:

1. 브라우저 개발자 도구 → Network 탭
2. `/api/admin/check` 요청 확인
3. 응답 상태 코드 확인:

   - `200`: 정상
   - `403`: 권한 없음 (이메일 불일치)
   - `500`: 서버 에러

4. 서버 로그 확인:
   - 터미널에서 `[API] GET /api/admin/check` 로그 확인
   - 에러 메시지 확인

---

## 디버깅 체크리스트

### 1단계: 환경 변수 확인

```bash
# .env.local 파일 확인
cat .env.local | grep ADMIN_EMAIL

# 또는 Windows PowerShell
Get-Content .env.local | Select-String ADMIN_EMAIL
```

**예상 결과**:

```
ADMIN_EMAIL=your-email@example.com
```

### 2단계: 서버 로그 확인

서버 터미널에서 다음 로그 확인:

```
[API] GET /api/admin/check 호출 시작
[API] ADMIN_EMAIL 환경 변수: 설정됨
[Auth] isAdmin 체크: { userEmail: '...', adminEmail: '...', match: true/false }
```

### 3단계: 브라우저 콘솔 확인

브라우저 개발자 도구 (F12) → Console 탭:

```
[HomePage] 관리자 여부 확인 시작
[HomePage] 관리자 확인 응답: { isAdmin: true/false, ... }
```

### 4단계: Network 탭 확인

브라우저 개발자 도구 → Network 탭:

1. `/api/admin/check` 요청 찾기
2. Response 탭에서 응답 확인:
   ```json
   {
     "isAdmin": true,
     "adminEmailConfigured": true,
     "adminEmail": "your-email@example.com"
   }
   ```

---

## 빠른 해결 방법

### 방법 1: 환경 변수 재설정

1. `.env.local` 파일 열기
2. `ADMIN_EMAIL` 확인/수정:
   ```env
   ADMIN_EMAIL=your-exact-email@example.com
   ```
3. 서버 재시작:
   ```bash
   # Ctrl+C로 중지
   pnpm dev
   ```
4. 브라우저 새로고침 (Ctrl+Shift+R)

### 방법 2: 직접 관리자 페이지 접근

브라우저 주소창에 직접 입력:

```
http://localhost:3000/admin/dashboard
```

- 접근 가능: 환경 변수는 설정되어 있지만 자동 리다이렉트가 작동하지 않음
- 접근 불가: 환경 변수 문제 또는 이메일 불일치

### 방법 3: 로그 확인

1. 서버 터미널에서 로그 확인
2. 브라우저 콘솔에서 로그 확인
3. 위의 "디버깅 체크리스트" 참고

---

## 일반적인 실수

1. ❌ `.env` 파일에 설정 (`.env.local`에 설정해야 함)
2. ❌ `NEXT_PUBLIC_ADMIN_EMAIL` 사용 (서버 사이드 전용이므로 접두사 불필요)
3. ❌ 환경 변수 변경 후 서버 재시작 안 함
4. ❌ 이메일 주소에 공백 포함
5. ❌ Clerk 이메일과 다른 이메일 사용

---

## 테스트 방법

관리자 확인이 제대로 작동하는지 테스트:

1. 브라우저 콘솔에서 직접 API 호출:

   ```javascript
   fetch("/api/admin/check")
     .then((r) => r.json())
     .then(console.log);
   ```

2. 예상 응답:
   ```json
   {
     "isAdmin": true,
     "adminEmailConfigured": true,
     "adminEmail": "your-email@example.com"
   }
   ```

---

## 문제: 클라이언트 목록 조회 시 500 에러 발생

### 증상

- 관리자 대시보드에서 클라이언트 목록 페이지(`/admin/clients`) 접근 시 500 Internal Server Error 발생
- 브라우저 콘솔에 `GET http://localhost:3001/api/admin/clients? 500 (Internal Server Error)` 에러 표시
- 서버 로그에 다음과 같은 에러 메시지:

```
[API] Clients 조회 실패: {
  error: {
    code: '42703',
    message: 'column clients.updated_at does not exist',
    hint: 'Perhaps you meant to reference the column "clients.created_at".'
  }
}
```

### 원인

`clients` 테이블에 `updated_at` 컬럼이 존재하지 않는데, API 쿼리에서 해당 컬럼을 조회하려고 시도함.

**데이터베이스 스키마 확인**:

- `clients` 테이블에는 `updated_at` 컬럼이 없음
- 실제 컬럼: `id`, `owner_agent_id`, `clerk_user_id`, `name`, `email`, `phone_kr`, `phone_us`, `birth_date`, `occupation`, `moving_date`, `relocation_type`, `created_at`, `moving_type`

### 해결 방법

#### 1. API 쿼리에서 `updated_at` 제거

**파일**: `app/api/admin/clients/route.ts`

**수정 전**:

```typescript
.select(`
  id,
  name,
  email,
  ...
  created_at,
  updated_at,  // ❌ 이 컬럼이 테이블에 없음
  owner_agent_id
`)
```

**수정 후**:

```typescript
.select(`
  id,
  name,
  email,
  ...
  created_at,
  // updated_at 컬럼은 테이블에 없으므로 제외
  owner_agent_id
`)
```

#### 2. 업데이트 쿼리에서도 `updated_at` 제거

**파일**: `app/api/admin/clients/[id]/route.ts`

**수정 전**:

```typescript
updateData.updated_at = new Date().toISOString();
```

**수정 후**:

```typescript
// updated_at 컬럼은 테이블에 없으므로 제거
```

### 확인 방법

1. **서버 로그 확인**:

   ```
   [API] GET /api/admin/clients 호출 시작
   [API] Clients 조회 성공: { count: 2, ... }
   GET /api/admin/clients? 200 in XXXms
   ```

2. **브라우저 콘솔 확인**:

   - 에러 메시지가 사라지고 클라이언트 목록이 정상적으로 표시됨

3. **Network 탭 확인**:
   - `/api/admin/clients` 요청이 `200 OK` 상태로 응답
   - 응답 본문에 `clients` 배열이 포함됨

### 예방 방법

1. **데이터베이스 스키마와 API 쿼리 일치 확인**:

   - 새로운 컬럼 추가/제거 시 관련 API 쿼리도 함께 수정
   - 마이그레이션 파일과 API 코드를 동기화

2. **타입 안정성**:

   - TypeScript 타입 정의를 데이터베이스 스키마와 일치시키기
   - Supabase 타입 생성 도구 사용 (`supabase gen types`)

3. **테스트**:
   - API 엔드포인트 테스트 작성
   - 데이터베이스 스키마 변경 시 관련 API 테스트 실행

### 관련 파일

- `app/api/admin/clients/route.ts` - 클라이언트 목록 조회 API
- `app/api/admin/clients/[id]/route.ts` - 클라이언트 상세 조회/수정 API

---

## 여전히 문제가 있다면

1. 서버 로그 전체 복사
2. 브라우저 콘솔 로그 복사
3. Network 탭의 `/api/admin/check` 응답 스크린샷
4. `.env.local` 파일 내용 (이메일 주소는 마스킹)

이 정보들을 함께 제공해주시면 더 정확한 진단이 가능합니다.

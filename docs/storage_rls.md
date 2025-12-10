# Storage RLS 오류 해결 및 디버깅 가이드

## 문제 상황

**"new row violates row-level security policy"** 오류가 발생합니다.

이 오류는 다음과 같은 상황에서 발생할 수 있습니다:

1. Clerk 인증을 사용하지만 Supabase Storage에 접근할 수 없는 경우
2. Clerk Third-Party Auth가 설정되어 있고 `role` claim도 있지만 여전히 RLS 오류가 발생하는 경우

## 오류 원인

### 기본 원인

1. **Storage 버킷의 RLS 정책이 `authenticated` 역할만 허용**

   - 현재 `setup_storage.sql`의 정책은 `TO authenticated`로 설정되어 있습니다
   - 이는 Supabase Auth로 인증된 사용자만 접근 가능하다는 의미입니다

2. **`useStorageClient()`는 Clerk 토큰 없이 작동**
   - Clerk JWT 토큰을 Supabase Storage에 직접 사용할 수 없어서
   - `useStorageClient()`는 `anon` 역할로 접근합니다
   - `anon` 역할은 RLS 정책에서 허용되지 않아 오류가 발생합니다

### Third-Party Auth 설정 후에도 발생하는 경우

RLS 정책이 다음을 확인합니다:

```sql
(storage.foldername(name))[1] = (auth.jwt()->>'sub')
```

이것은:

1. 파일 경로의 첫 번째 폴더명 (예: `user_123abc/file.jpg` → `user_123abc`)
2. JWT의 `sub` claim 값

이 두 값이 일치해야 합니다. 만약 일치하지 않으면 오류가 발생합니다.

## 해결 방법

### 방법 1: 개발 환경용 RLS 정책 추가 (빠른 해결)

개발 환경에서 빠르게 테스트하려면 `anon` 역할도 허용하는 정책을 추가하세요:

1. **Supabase Dashboard** → **SQL Editor** 열기
2. 다음 SQL 실행:

```sql
-- 개발 환경용: anon 역할도 허용하는 정책 추가
CREATE POLICY IF NOT EXISTS "Allow anon uploads for development"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'uploads');

CREATE POLICY IF NOT EXISTS "Allow anon view for development"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'uploads');

CREATE POLICY IF NOT EXISTS "Allow anon delete for development"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'uploads');

CREATE POLICY IF NOT EXISTS "Allow anon update for development"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'uploads')
WITH CHECK (bucket_id = 'uploads');
```

또는 `supabase/migrations/fix_storage_rls.sql` 파일의 내용을 실행하세요.

**주의**: 프로덕션에서는 이 정책을 제거하고 다른 방법을 사용하세요.

### 방법 2: 서버 사이드 API 사용 (프로덕션 권장)

프로덕션 환경에서는 보안을 위해 서버 사이드 API를 사용하는 것이 좋습니다:

1. **API Route 생성**: `/app/api/storage/upload/route.ts`
2. **Service Role 클라이언트 사용**: RLS를 우회하여 안전하게 Storage에 접근
3. **클라이언트에서 API 호출**: 직접 Storage에 접근하지 않고 API를 통해 처리

예시:

```typescript
// app/api/storage/upload/route.ts
import { auth } from "@clerk/nextjs/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Clerk 인증 확인
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;

  // Service Role 클라이언트로 업로드 (RLS 우회)
  const supabase = getServiceRoleClient();
  const filePath = `${userId}/${file.name}`;

  const { data, error } = await supabase.storage
    .from("uploads")
    .upload(filePath, file);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ path: data.path });
}
```

### 방법 3: Supabase Third-Party Auth 설정 (장기적 해결)

Clerk를 Supabase Third-Party Auth로 등록하면 Clerk 토큰이 `authenticated` 역할로 인식됩니다:

1. **Supabase Dashboard** → **Authentication** → **Third-Party Auth**
2. **Clerk 통합 추가**
3. **Clerk에서 `role` claim 추가**: 세션 토큰에 `role: 'authenticated'` 추가

자세한 내용은 [Supabase Clerk 문서](https://supabase.com/docs/guides/auth/third-party/clerk)를 참고하세요.

### 방법 4: RLS 정책 수정 (Third-Party Auth 설정 후)

Third-Party Auth 설정 후에도 오류가 발생하는 경우, RLS 정책을 수정하세요:

1. **Supabase Dashboard** → **SQL Editor**
2. `supabase/migrations/fix_storage_rls_clerk.sql` 파일의 내용 실행

이 정책은 `auth.jwt()->>'sub'`를 직접 사용하므로 더 명확합니다.

## 디버깅 가이드

Third-Party Auth 설정 후에도 오류가 발생하는 경우, 다음 단계를 따라 디버깅하세요.

### 1. JWT의 실제 내용 확인

Supabase Dashboard의 SQL Editor에서 다음을 실행하여 현재 JWT의 내용을 확인하세요:

```sql
-- JWT의 모든 claim 확인
SELECT auth.jwt();

-- 또는 특정 claim만 확인
SELECT
  auth.jwt()->>'sub' as sub,
  auth.jwt()->>'role' as role,
  auth.jwt()->>'email' as email;
```

**주의**: 이 쿼리는 인증된 요청 컨텍스트에서 실행해야 합니다. 브라우저에서 Storage 작업을 시도한 후 즉시 실행하세요.

### 2. 디버깅 함수 사용

JWT의 실제 내용을 확인하려면:

```sql
-- 디버깅 함수 실행 (인증된 컨텍스트에서)
SELECT * FROM debug_jwt_claims();
```

이 함수는 현재 JWT의 `sub`, `role`, 그리고 모든 claim을 반환합니다.

### 3. 파일 경로 확인

코드에서 생성하는 파일 경로를 확인하세요:

```typescript
// app/storage-test/page.tsx
const filePath = `${user.id}/${fileName}`;
```

여기서 `user.id`는 Clerk의 user ID입니다. 이것이 JWT의 `sub` claim과 일치해야 합니다.

### 4. Clerk User ID 형식 확인

Clerk의 user ID는 보통 다음과 같은 형식입니다:

- `user_2abc123def456...` (접두사 `user_` 포함)

JWT의 `sub` claim도 동일한 형식이어야 합니다.

### 5. Clerk 토큰이 제대로 전달되는지 확인

브라우저 개발자 도구의 Network 탭에서:

1. Storage 업로드 요청 확인
2. `Authorization` 헤더에 JWT 토큰이 포함되어 있는지 확인
3. 토큰을 [jwt.io](https://jwt.io)에서 디코딩하여 `sub` claim 확인

### 6. Supabase 로그 확인

Supabase Dashboard → Logs → API에서:

1. Storage 요청 로그 확인
2. RLS 정책 위반 오류 메시지 확인
3. JWT 파싱 오류가 있는지 확인

## 확인 체크리스트

### 기본 설정 확인

- [ ] Clerk 세션 토큰에 `role: 'authenticated'` claim이 있음
- [ ] Supabase Third-Party Auth 설정이 활성화되어 있음
- [ ] 파일 경로가 `${user.id}/filename` 형식으로 생성됨
- [ ] JWT의 `sub` claim이 Clerk user ID와 일치함
- [ ] RLS 정책이 올바르게 적용됨

### 프로덕션 배포 전 체크리스트

- [ ] 개발용 `anon` 정책 제거
- [ ] 서버 사이드 API로 Storage 작업 이동 또는
- [ ] Supabase Third-Party Auth 설정 완료
- [ ] RLS 정책이 `authenticated` 역할만 허용하는지 확인

## 다음 단계 (오류 발생 시)

1. `fix_storage_rls_clerk.sql` 파일 실행
2. 애플리케이션 재시작
3. 파일 업로드 시도
4. 여전히 오류가 발생하면 디버깅 함수로 JWT 내용 확인
5. JWT의 `sub`와 파일 경로의 폴더명이 일치하는지 확인

---

# shared_listings 테이블 메모 업데이트 권한 오류

## 문제 상황

**브라우저 콘솔 에러**: `[ListingCard] 메모 저장 실패: "Access denied"`

리스팅 카드에서 메모를 저장하려고 할 때 "Access denied" 오류가 발생합니다.

### 에러 발생 위치

- **파일**: `components/client/listing-card.tsx:170`
- **함수**: `saveNotes()` → `updateListingNotes()` Server Action 호출
- **에러 메시지**: `"Access denied"`

## 오류 원인

### 핵심 문제

서버 액션(`actions/listing-notes.ts`)의 권한 확인 로직에서 **권한 부여된 사용자(authorized user)**를 확인하지 않았습니다.

### 상세 분석

1. **서버 액션의 권한 확인 로직 불완전**

   - 기존 코드는 다음만 확인했습니다:
     - ✅ 클라이언트: `client.clerk_user_id === userId`
     - ✅ 에이전트: `account.clerk_user_id === userId` (owner_agent_id를 통해)
     - ❌ **권한 부여된 사용자**: 확인하지 않음

2. **RLS 정책은 이미 올바르게 설정됨**

   - 데이터베이스의 RLS 정책(`20250107000000_add_authorized_user_access.sql`)은 권한 부여된 사용자를 포함하고 있습니다
   - 문제는 서버 액션의 애플리케이션 레벨 권한 확인에 있었습니다

3. **권한 부여된 사용자란?**
   - `client_authorizations` 테이블에 등록된 사용자
   - 클라이언트의 에이전트가 특정 사용자에게 접근 권한을 부여한 경우
   - 예: 가족 구성원, 보조 에이전트 등

### 에러 발생 시나리오

```
사용자 (권한 부여됨) → 메모 저장 시도
  ↓
서버 액션: 클라이언트 확인 → ❌ 실패
  ↓
서버 액션: 에이전트 확인 → ❌ 실패
  ↓
서버 액션: 권한 부여된 사용자 확인 → ❌ 확인하지 않음
  ↓
결과: "Access denied" 반환
```

## 해결 방법

### 수정된 코드

`actions/listing-notes.ts` 파일에 권한 부여된 사용자 확인 로직을 추가했습니다:

```typescript
// 클라이언트인지 확인
const isClient = client.clerk_user_id === userId;

// 에이전트인지 확인
let isAgent = false;
if (client.owner_agent_id) {
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("clerk_user_id")
    .eq("id", client.owner_agent_id)
    .single();

  if (!accountError && account) {
    isAgent = account.clerk_user_id === userId;
  }
}

// ✅ 추가: 권한 부여된 사용자인지 확인
let isAuthorized = false;
const { data: authorization, error: authError } = await supabase
  .from("client_authorizations")
  .select("id")
  .eq("client_id", room.client_id)
  .eq("authorized_clerk_user_id", userId)
  .maybeSingle();

if (!authError && authorization) {
  isAuthorized = true;
}

// ✅ 수정: 세 가지 권한 모두 확인
if (!isClient && !isAgent && !isAuthorized) {
  console.error("[Server Action] 채팅방 참여자가 아님:", {
    listingId,
    userId,
    clientId: client.clerk_user_id,
    ownerAgentId: client.owner_agent_id,
    isClient,
    isAgent,
    isAuthorized, // ✅ 디버깅 정보 추가
  });
  return { success: false, error: "Access denied" };
}
```

### 변경 사항 요약

1. **권한 부여된 사용자 확인 로직 추가**

   - `client_authorizations` 테이블에서 현재 사용자 확인
   - `client_id`와 `authorized_clerk_user_id`로 매칭

2. **권한 확인 조건 수정**

   - 기존: `if (!isClient && !isAgent)`
   - 수정: `if (!isClient && !isAgent && !isAuthorized)`

3. **디버깅 로그 개선**
   - `isAuthorized` 값도 로그에 포함하여 디버깅 용이성 향상

## 확인 사항

### RLS 정책 확인

데이터베이스의 RLS 정책은 이미 올바르게 설정되어 있습니다:

```sql
-- shared_listings 테이블 UPDATE 정책
CREATE POLICY "Users can update listings in their chat rooms"
  ON public.shared_listings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      JOIN public.clients ON clients.id = chat_rooms.client_id
      WHERE chat_rooms.id = shared_listings.room_id
      AND (
        -- 에이전트
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        -- ✅ 권한 부여된 사용자 (이미 포함됨)
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );
```

**결론**: 데이터베이스 수정은 필요 없습니다. 서버 액션만 수정하면 됩니다.

## 디버깅 가이드

### 1. 브라우저 콘솔 로그 확인

서버 액션에서 상세한 로그를 출력합니다:

```javascript
[Server Action] 채팅방 참여자가 아님: {
  listingId: "...",
  userId: "user_...",
  clientId: "user_...",
  ownerAgentId: "...",
  isClient: false,
  isAgent: false,
  isAuthorized: false  // ✅ 이 값 확인
}
```

### 2. 권한 부여 상태 확인

Supabase SQL Editor에서 다음 쿼리로 확인:

```sql
-- 특정 사용자가 클라이언트에 권한이 있는지 확인
SELECT
  ca.id,
  ca.client_id,
  ca.authorized_clerk_user_id,
  ca.granted_by_clerk_user_id,
  ca.granted_at,
  c.name as client_name
FROM client_authorizations ca
JOIN clients c ON c.id = ca.client_id
WHERE ca.authorized_clerk_user_id = 'user_...';  -- Clerk User ID
```

### 3. 클라이언트-채팅방-리스팅 관계 확인

```sql
-- 리스팅의 채팅방과 클라이언트 정보 확인
SELECT
  sl.id as listing_id,
  sl.room_id,
  cr.client_id,
  c.clerk_user_id,
  c.owner_agent_id,
  a.clerk_user_id as agent_clerk_id
FROM shared_listings sl
JOIN chat_rooms cr ON cr.id = sl.room_id
JOIN clients c ON c.id = cr.client_id
LEFT JOIN accounts a ON a.id = c.owner_agent_id
WHERE sl.id = '...';  -- Listing ID
```

## 예방 방법

### 코드 리뷰 체크리스트

권한 확인 로직을 작성할 때 다음을 확인하세요:

- [ ] 클라이언트 권한 확인
- [ ] 에이전트 권한 확인
- [ ] **권한 부여된 사용자 확인** (누락 방지)
- [ ] RLS 정책과 서버 액션 로직 일치 확인

### 패턴 예시

다른 서버 액션에서도 동일한 패턴을 사용하세요:

```typescript
// 1. 클라이언트 확인
const isClient = client.clerk_user_id === userId;

// 2. 에이전트 확인
let isAgent = false;
if (client.owner_agent_id) {
  // ... 에이전트 확인 로직
}

// 3. 권한 부여된 사용자 확인 (필수!)
let isAuthorized = false;
const { data: authorization } = await supabase
  .from("client_authorizations")
  .select("id")
  .eq("client_id", clientId)
  .eq("authorized_clerk_user_id", userId)
  .maybeSingle();

if (authorization) {
  isAuthorized = true;
}

// 4. 최종 권한 확인
if (!isClient && !isAgent && !isAuthorized) {
  return { success: false, error: "Access denied" };
}
```

## 관련 파일

- `actions/listing-notes.ts`: 서버 액션 (수정됨)
- `components/client/listing-card.tsx`: 클라이언트 컴포넌트
- `supabase/migrations/20250107000000_add_authorized_user_access.sql`: RLS 정책

## 참고 자료

- [Supabase Storage RLS 가이드](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Clerk 통합](https://supabase.com/docs/guides/auth/third-party/clerk)
- [Storage 버킷 접근 모델](https://supabase.com/docs/guides/storage/buckets/fundamentals#access-model)

---

# shared_listings 테이블 제외 상태 업데이트 권한 오류

## 문제 상황

**브라우저 콘솔 에러**: `[ChatTab] 서버 동기화 실패: "Access denied"`

채팅 탭의 리스팅 카드에서 "x 제외 표시"를 클릭했을 때 "Access denied" 오류가 발생합니다.

### 에러 발생 위치

- **파일**: `components/client/chat-tab.tsx:481`
- **함수**: `toggleExclude()` → `updateListingExcluded()` Server Action 호출
- **에러 메시지**: `"Access denied"`

## 오류 원인

### 핵심 문제

서버 액션(`actions/listing-excluded.ts`)의 권한 확인 로직에서 **권한 부여된 사용자(authorized user)**를 확인하지 않았습니다.

### 상세 분석

1. **서버 액션의 권한 확인 로직 불완전**

   - 기존 코드는 다음만 확인했습니다:
     - ✅ 클라이언트: `client.clerk_user_id === userId`
     - ✅ 에이전트: `account.clerk_user_id === userId` (owner_agent_id를 통해)
     - ❌ **권한 부여된 사용자**: 확인하지 않음

2. **RLS 정책은 이미 올바르게 설정됨**

   - 데이터베이스의 RLS 정책(`20250107000000_add_authorized_user_access.sql`)은 권한 부여된 사용자를 포함하고 있습니다
   - 문제는 서버 액션의 애플리케이션 레벨 권한 확인에 있었습니다

3. **권한 부여된 사용자란?**
   - `client_authorizations` 테이블에 등록된 사용자
   - 클라이언트의 에이전트가 특정 사용자에게 접근 권한을 부여한 경우
   - 예: 배우자, 가족 구성원, 보조 에이전트 등

### 에러 발생 시나리오

```
배우자 유저 (권한 부여됨) → "x 제외 표시" 클릭
  ↓
서버 액션: 클라이언트 확인 → ❌ 실패
  ↓
서버 액션: 에이전트 확인 → ❌ 실패
  ↓
서버 액션: 권한 부여된 사용자 확인 → ❌ 확인하지 않음
  ↓
결과: "Access denied" 반환
```

## 해결 방법

### 수정된 코드

`actions/listing-excluded.ts` 파일에 권한 부여된 사용자 확인 로직을 추가했습니다:

```typescript
// 클라이언트인지 확인
const isClient = client.clerk_user_id === userId;

// 에이전트인지 확인
let isAgent = false;
if (client.owner_agent_id) {
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("clerk_user_id")
    .eq("id", client.owner_agent_id)
    .single();

  if (!accountError && account) {
    isAgent = account.clerk_user_id === userId;
  }
}

// ✅ 추가: 권한 부여된 사용자인지 확인
let isAuthorized = false;
const { data: authorization, error: authError } = await supabase
  .from("client_authorizations")
  .select("id")
  .eq("client_id", room.client_id)
  .eq("authorized_clerk_user_id", userId)
  .maybeSingle();

if (!authError && authorization) {
  isAuthorized = true;
}

// ✅ 수정: 세 가지 권한 모두 확인
if (!isClient && !isAgent && !isAuthorized) {
  console.error("[Server Action] 채팅방 참여자가 아님:", {
    listingId,
    userId,
    clientId: client.clerk_user_id,
    ownerAgentId: client.owner_agent_id,
    isClient,
    isAgent,
    isAuthorized, // ✅ 디버깅 정보 추가
  });
  return { success: false, error: "Access denied" };
}
```

### 변경 사항 요약

1. **권한 부여된 사용자 확인 로직 추가**

   - `client_authorizations` 테이블에서 현재 사용자 확인
   - `client_id`와 `authorized_clerk_user_id`로 매칭

2. **권한 확인 조건 수정**

   - 기존: `if (!isClient && !isAgent)`
   - 수정: `if (!isClient && !isAgent && !isAuthorized)`

3. **디버깅 로그 개선**
   - `isAuthorized` 값도 로그에 포함하여 디버깅 용이성 향상

## 확인 사항

### RLS 정책 확인

데이터베이스의 RLS 정책은 이미 올바르게 설정되어 있습니다:

```sql
-- shared_listings 테이블 UPDATE 정책
CREATE POLICY "Users can update listings in their chat rooms"
  ON public.shared_listings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      JOIN public.clients ON clients.id = chat_rooms.client_id
      WHERE chat_rooms.id = shared_listings.room_id
      AND (
        -- 에이전트
        EXISTS (
          SELECT 1 FROM public.accounts
          WHERE accounts.id = clients.owner_agent_id
          AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
        )
        OR
        -- 클라이언트
        clients.clerk_user_id = ((select auth.jwt())->>'sub')
        OR
        -- ✅ 권한 부여된 사용자 (이미 포함됨)
        EXISTS (
          SELECT 1 FROM public.client_authorizations
          WHERE client_authorizations.client_id = clients.id
          AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
        )
      )
    )
  );
```

**결론**: 데이터베이스 수정은 필요 없습니다. 서버 액션만 수정하면 됩니다.

## 디버깅 가이드

### 1. 브라우저 콘솔 로그 확인

서버 액션에서 상세한 로그를 출력합니다:

```javascript
[Server Action] 채팅방 참여자가 아님: {
  listingId: "...",
  userId: "user_...",
  clientId: "user_...",
  ownerAgentId: "...",
  isClient: false,
  isAgent: false,
  isAuthorized: false  // ✅ 이 값 확인
}
```

### 2. 권한 부여 상태 확인

Supabase SQL Editor에서 다음 쿼리로 확인:

```sql
-- 특정 사용자가 클라이언트에 권한이 있는지 확인
SELECT
  ca.id,
  ca.client_id,
  ca.authorized_clerk_user_id,
  ca.granted_by_clerk_user_id,
  ca.granted_at,
  c.name as client_name
FROM client_authorizations ca
JOIN clients c ON c.id = ca.client_id
WHERE ca.authorized_clerk_user_id = 'user_...';  -- Clerk User ID
```

### 3. 클라이언트-채팅방-리스팅 관계 확인

```sql
-- 리스팅의 채팅방과 클라이언트 정보 확인
SELECT
  sl.id as listing_id,
  sl.room_id,
  sl.is_excluded,
  cr.client_id,
  c.clerk_user_id,
  c.owner_agent_id,
  a.clerk_user_id as agent_clerk_id
FROM shared_listings sl
JOIN chat_rooms cr ON cr.id = sl.room_id
JOIN clients c ON c.id = cr.client_id
LEFT JOIN accounts a ON a.id = c.owner_agent_id
WHERE sl.id = '...';  -- Listing ID
```

## 예방 방법

### 코드 리뷰 체크리스트

권한 확인 로직을 작성할 때 다음을 확인하세요:

- [ ] 클라이언트 권한 확인
- [ ] 에이전트 권한 확인
- [ ] **권한 부여된 사용자 확인** (누락 방지)
- [ ] RLS 정책과 서버 액션 로직 일치 확인

### 패턴 예시

다른 서버 액션에서도 동일한 패턴을 사용하세요:

```typescript
// 1. 클라이언트 확인
const isClient = client.clerk_user_id === userId;

// 2. 에이전트 확인
let isAgent = false;
if (client.owner_agent_id) {
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("clerk_user_id")
    .eq("id", client.owner_agent_id)
    .single();

  if (!accountError && account) {
    isAgent = account.clerk_user_id === userId;
  }
}

// 3. 권한 부여된 사용자 확인 (필수!)
let isAuthorized = false;
const { data: authorization, error: authError } = await supabase
  .from("client_authorizations")
  .select("id")
  .eq("client_id", room.client_id)
  .eq("authorized_clerk_user_id", userId)
  .maybeSingle();

if (!authError && authorization) {
  isAuthorized = true;
}

// 4. 최종 권한 확인
if (!isClient && !isAgent && !isAuthorized) {
  return { success: false, error: "Access denied" };
}
```

## 관련 파일

- `actions/listing-excluded.ts`: 서버 액션 (수정됨)
- `components/client/chat-tab.tsx`: 클라이언트 컴포넌트
- `components/client/listing-card.tsx`: 리스팅 카드 컴포넌트
- `supabase/migrations/20250107000000_add_authorized_user_access.sql`: RLS 정책

## 참고

이 문제는 `shared_listings` 테이블 메모 업데이트 권한 오류와 동일한 패턴입니다. `shared_listings` 테이블을 업데이트하는 모든 서버 액션에서 권한 부여된 사용자 확인 로직이 포함되어 있는지 확인해야 합니다.

---

# 에이전트가 클라이언트의 체크리스트 파일을 확인할 수 없는 문제

## 문제 상황

**에이전트 유저가 클라이언트 유저의 체크리스트 탭에서 업로드된 파일을 확인할 수 없습니다.**

### 에러 발생 위치

- **파일**: `app/agent/client/[id]/page.tsx` - 에이전트 클라이언트 상세 페이지
- **탭**: 체크리스트 탭에서 파일 목록 조회
- **증상**: 파일이 업로드되어 있지만 에이전트가 확인할 수 없음

## 오류 원인

### 핵심 문제

1. **Storage RLS 정책에 에이전트 접근 권한이 없음**

   - 기존 Storage RLS 정책은 다음만 허용:
     - 본인 폴더 접근
     - 권한 부여된 클라이언트 폴더 접근 (`client_authorizations` 테이블을 통해)
   - 에이전트가 자신의 클라이언트(`clients.owner_agent_id`)의 파일에 접근하는 정책이 없음

2. **API 라우트에서 에이전트 접근 차단**

   - `/api/client/checklist/files` API는 `requireClientOrAuthorized()`를 사용
   - `getClientIdForUser()` 함수가 에이전트의 경우 `null`을 반환하여 접근 차단
   - 에이전트는 `clients` 테이블에 직접 연결되지 않고 `accounts` 테이블과 `clients.owner_agent_id`를 통해 연결됨

3. **파일 다운로드 API도 동일한 문제**
   - `/api/client/checklist/files/download`에서도 에이전트 접근이 차단됨

### 에러 발생 시나리오

```
에이전트 → 클라이언트 체크리스트 탭 열기
  ↓
API 호출: /api/client/checklist/files?item_id=...
  ↓
requireClientOrAuthorized() → getClientIdForUser() 호출
  ↓
에이전트는 clients 테이블에 직접 연결되지 않음 → null 반환
  ↓
결과: "접근 권한이 없습니다." (403 에러)
```

## 해결 방법

### 1. Storage RLS 정책 업데이트

문서의 패턴(`IN` 절 사용)을 따라 Storage RLS 정책에 에이전트 접근 권한을 추가:

```sql
-- 에이전트: 자신의 클라이언트의 폴더 파일 조회
-- ⚠️ 핵심: IN 절을 사용하여 name이 storage.objects에서 오는 것을 명확히 함
(storage.foldername(name))[1] IN (
  SELECT clients.clerk_user_id
  FROM public.clients
  WHERE EXISTS (
    SELECT 1 FROM public.accounts
    WHERE accounts.id = clients.owner_agent_id
    AND accounts.clerk_user_id = ((select auth.jwt())->>'sub')
  )
)
```

**주의사항**:

- PostgreSQL 정책 이름은 최대 63자로 제한됨
- 정책 이름이 너무 길면 "policy already exists" 오류 발생 가능
- 짧고 명확한 이름 사용 권장 (예: `"Users can view own authorized or agent client files"`)

### 2. 인증 함수 추가

`lib/auth.ts`에 에이전트 접근 확인 함수 추가:

```typescript
/**
 * 에이전트가 특정 클라이언트에 접근할 수 있는지 확인합니다.
 * 에이전트가 해당 클라이언트의 소유자인지 확인합니다.
 *
 * @param clientId 확인할 클라이언트 ID
 * @returns 접근 가능하면 true, 아니면 false
 */
export async function canAgentAccessClient(clientId: string): Promise<boolean> {
  const userId = await getAuthUserId();
  const role = await getAuthRole();

  // 에이전트가 아니면 false 반환
  if (role !== "agent") {
    return false;
  }

  const supabase = createClerkSupabaseClient();

  // Account 조회 또는 자동 생성
  const account = await getOrCreateAccount();

  // 클라이언트 소유권 확인
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, owner_agent_id")
    .eq("id", clientId)
    .eq("owner_agent_id", account.id)
    .single();

  if (clientError || !client) {
    return false;
  }

  return true;
}
```

### 3. API 라우트 수정

`/api/client/checklist/files`와 `/api/client/checklist/files/download` API에 에이전트 접근 허용:

```typescript
// 에이전트인 경우: 클라이언트 소유권 확인
if (role === "agent") {
  const canAccess = await canAgentAccessClient(checklistItem.client_id);
  if (!canAccess) {
    return NextResponse.json(
      { error: "접근 권한이 없습니다." },
      { status: 403 },
    );
  }
} else {
  // 클라이언트 또는 권한 부여된 사용자인 경우
  await requireClientOrAuthorized();
  const clientId = await getClientIdForUser();
  // ...
}
```

## 적용된 변경사항

### 1. `lib/auth.ts`

- `canAgentAccessClient()` 함수 추가: 에이전트가 특정 클라이언트에 접근할 수 있는지 확인

### 2. `app/api/client/checklist/files/route.ts`

- GET: 파일 목록 조회 시 에이전트 접근 허용
- POST: 파일 업로드 시 에이전트 접근 허용
- DELETE: 파일 삭제 시 에이전트 접근 허용

### 3. `app/api/client/checklist/files/download/route.ts`

- 파일 다운로드 시 에이전트 접근 허용

### 4. Storage RLS 정책

- 에이전트가 자신의 클라이언트 파일에 접근할 수 있도록 정책 추가
- 문서의 `IN` 절 패턴 사용

## 해결 결과

- ✅ 에이전트가 클라이언트의 체크리스트 파일을 정상적으로 확인할 수 있게 됨
- ✅ Storage RLS 정책이 올바르게 작동하여 보안과 기능이 모두 유지됨
- ✅ API 라우트에서 에이전트 접근이 정상적으로 허용됨

## 참고 파일

- `fix_agent_storage_access.sql`: Storage RLS 정책 업데이트 SQL 파일
- `lib/auth.ts`: `canAgentAccessClient()` 함수 추가
- `app/api/client/checklist/files/route.ts`: API 라우트 수정
- `app/api/client/checklist/files/download/route.ts`: 다운로드 API 수정

## 예방 방법

### 코드 리뷰 체크리스트

Storage 접근 권한을 확인할 때 다음을 확인하세요:

- [ ] 클라이언트 권한 확인
- [ ] 권한 부여된 사용자 확인
- [ ] **에이전트 권한 확인** (누락 방지)
- [ ] Storage RLS 정책과 API 라우트 로직 일치 확인

### 패턴 예시

다른 API 라우트에서도 동일한 패턴을 사용하세요:

```typescript
// 1. 역할 확인
const role = await getAuthRole();

// 2. 에이전트인 경우: 클라이언트 소유권 확인
if (role === "agent") {
  const canAccess = await canAgentAccessClient(clientId);
  if (!canAccess) {
    return NextResponse.json(
      { error: "접근 권한이 없습니다." },
      { status: 403 },
    );
  }
} else {
  // 3. 클라이언트 또는 권한 부여된 사용자인 경우
  await requireClientOrAuthorized();
  const userClientId = await getClientIdForUser();
  // ...
}
```

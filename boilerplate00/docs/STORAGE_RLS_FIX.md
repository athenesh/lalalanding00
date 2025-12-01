# Storage RLS 오류 해결 가이드

## 오류 원인

**"new row violates row-level security policy"** 오류는 다음과 같은 이유로 발생합니다:

1. **Storage 버킷의 RLS 정책이 `authenticated` 역할만 허용**

   - 현재 `setup_storage.sql`의 정책은 `TO authenticated`로 설정되어 있습니다
   - 이는 Supabase Auth로 인증된 사용자만 접근 가능하다는 의미입니다

2. **`useStorageClient()`는 Clerk 토큰 없이 작동**
   - Clerk JWT 토큰을 Supabase Storage에 직접 사용할 수 없어서
   - `useStorageClient()`는 `anon` 역할로 접근합니다
   - `anon` 역할은 RLS 정책에서 허용되지 않아 오류가 발생합니다

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

## 현재 적용된 해결책

현재는 **방법 1**을 적용했습니다:

- `supabase/migrations/fix_storage_rls.sql` 파일 생성
- 개발 환경에서 `anon` 역할도 Storage에 접근 가능하도록 정책 추가

## 프로덕션 배포 전 체크리스트

- [ ] 개발용 `anon` 정책 제거
- [ ] 서버 사이드 API로 Storage 작업 이동 또는
- [ ] Supabase Third-Party Auth 설정 완료
- [ ] RLS 정책이 `authenticated` 역할만 허용하는지 확인

## 참고 자료

- [Supabase Storage RLS 가이드](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Clerk 통합](https://supabase.com/docs/guides/auth/third-party/clerk)
- [Storage 버킷 접근 모델](https://supabase.com/docs/guides/storage/buckets/fundamentals#access-model)

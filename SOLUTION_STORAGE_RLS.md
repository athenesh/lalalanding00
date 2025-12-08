# Storage RLS 정책 수정 해결 방법

## 문제 원인

정책을 삭제하고 재생성해도 계속 `storage.foldername(clients.name)`이 사용되는 이유는:

1. Supabase가 정책을 캐시하고 있을 수 있음
2. 마이그레이션 파일과 실제 데이터베이스 정책이 동기화되지 않았을 수 있음
3. SQL Editor에서 실행한 SQL이 제대로 적용되지 않았을 수 있음

## 해결 방법: Supabase 대시보드에서 직접 수정

가장 확실한 방법은 **Supabase 대시보드의 Storage > Policies**에서 직접 정책을 수정하는 것입니다.

### 단계별 가이드

1. **Supabase 대시보드 접속**

   - https://supabase.com/dashboard 접속
   - 프로젝트 선택

2. **Storage > Policies 이동**

   - 왼쪽 메뉴에서 `Storage` 클릭
   - `Policies` 탭 클릭
   - `objects` 테이블 선택

3. **각 정책 수정**

   - 다음 4개 정책을 찾아서 수정:
     - `Users can upload to own folder or authorized client folder` (INSERT)
     - `Users can view own files or authorized client files` (SELECT)
     - `Users can delete own files or authorized client files` (DELETE)
     - `Users can update own files or authorized client files` (UPDATE)

4. **정책 내용 수정**
   각 정책에서 다음 부분을 찾아서:

   **잘못된 코드:**

   ```sql
   clients.clerk_user_id = (storage.foldername(clients.name))[1]
   ```

   **올바른 코드로 변경:**

   ```sql
   clients.clerk_user_id = (storage.foldername(name))[1]
   ```

5. **저장**
   - 각 정책을 수정한 후 `Save` 버튼 클릭

## 올바른 정책 내용 (참고용)

### INSERT 정책

```sql
bucket_id = 'uploads' AND (
  (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
  OR
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.clerk_user_id = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM public.client_authorizations
      WHERE client_authorizations.client_id = clients.id
      AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
    )
  )
)
```

### SELECT 정책

```sql
bucket_id = 'uploads' AND (
  (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
  OR
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.clerk_user_id = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM public.client_authorizations
      WHERE client_authorizations.client_id = clients.id
      AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
    )
  )
)
```

### DELETE 정책

```sql
bucket_id = 'uploads' AND (
  (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
  OR
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.clerk_user_id = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM public.client_authorizations
      WHERE client_authorizations.client_id = clients.id
      AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
    )
  )
)
```

### UPDATE 정책 (USING)

```sql
bucket_id = 'uploads' AND (
  (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
  OR
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.clerk_user_id = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM public.client_authorizations
      WHERE client_authorizations.client_id = clients.id
      AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
    )
  )
)
```

### UPDATE 정책 (WITH CHECK)

```sql
bucket_id = 'uploads' AND (
  (storage.foldername(name))[1] = ((select auth.jwt())->>'sub')
  OR
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.clerk_user_id = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM public.client_authorizations
      WHERE client_authorizations.client_id = clients.id
      AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
    )
  )
)
```

## 핵심 포인트

**모든 정책에서:**

- ❌ `storage.foldername(clients.name)[1]` 사용하지 않기
- ✅ `storage.foldername(name)[1]` 사용하기

`clients.name`은 클라이언트 이름(예: "영설화")이고, `storage.foldername(name)[1]`은 파일 경로의 첫 번째 폴더명(`clerk_user_id`)을 반환합니다.

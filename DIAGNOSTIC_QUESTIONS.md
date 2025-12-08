# Storage RLS 정책 문제 진단 질문

## 확인된 사실
- ✅ RLS 활성화됨
- ✅ storage.foldername 함수 정상 작동
- ✅ 실제 파일 경로: `user_36EfvxKHSAEpOowD9PUM0COM1Vs/checklist/...`
- ❌ 정책이 여전히 `storage.foldername(clients.name)` 사용 중

## 확인이 필요한 사항

### 1. SQL 실행 결과 확인
Supabase SQL 에디터에서 다음을 실행했을 때:

```sql
DROP POLICY IF EXISTS "Users can upload to own folder or authorized client folder" ON storage.objects;
```

**질문 1**: 이 명령을 실행했을 때 에러가 발생했나요?
- [ ] 에러 없음 (성공)
- [ ] 에러 발생 (에러 메시지 내용: _______________)

### 2. 정책 삭제 확인
다음 쿼리로 정책이 삭제되었는지 확인:

```sql
SELECT policyname 
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects' 
  AND policyname = 'Users can upload to own folder or authorized client folder';
```

**질문 2**: 이 쿼리 결과가 어떻게 나오나요?
- [ ] 결과 없음 (정책 삭제됨)
- [ ] 정책이 여전히 존재함

### 3. 새 정책 생성 시도
다음 SQL을 실행했을 때:

```sql
CREATE POLICY "Users can upload to own folder or authorized client folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
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
);
```

**질문 3**: 이 명령을 실행했을 때 에러가 발생했나요?
- [ ] 에러 없음 (성공)
- [ ] 에러 발생 (에러 메시지 내용: _______________)

### 4. 권한 확인
**질문 4**: Supabase SQL 에디터에서 실행하는 계정이 관리자 권한을 가지고 있나요?
- [ ] 예 (Service Role 또는 관리자)
- [ ] 모름
- [ ] 아니오

### 5. 실제 에러 메시지
**질문 5**: 파일 업로드 시 브라우저 콘솔이나 서버 로그에 나타나는 정확한 에러 메시지는 무엇인가요?
(전체 에러 메시지를 복사해서 알려주세요)

### 6. 정책 확인
**질문 6**: 다음 쿼리를 실행한 결과를 알려주세요:

```sql
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND cmd = 'INSERT';
```


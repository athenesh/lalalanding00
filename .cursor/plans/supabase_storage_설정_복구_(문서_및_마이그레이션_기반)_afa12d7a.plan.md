---
name: Supabase Storage 설정 복구 (문서 및 마이그레이션 기반)
overview: 기존 마이그레이션 파일과 문서를 참고하여 Supabase Storage 버킷과 RLS 정책을 설정합니다. 가장 최신이고 완전한 SQL 파일(`fix_agent_storage_access.sql`)을 기반으로 계획을 수립합니다.
todos: []
---

#Supabase Storage 설정 복구 계획 (문서 및 마이그레이션 기반)

## 목표

파일 업로드 기능이 정상 작동하도록 Supabase Storage 버킷과 RLS 정책을 설정합니다. 기존에 해결했던 문제들과 최종 해결 방법을 반영합니다.

## 참고 자료

- [docs/ERROR_FIX_SUMMARY.md](docs/ERROR_FIX_SUMMARY.md): Storage RLS 정책 문제 해결 과정 상세 설명
- [docs/API_STATUS.md](docs/API_STATUS.md): Storage RLS 정책 설정 관련 내용
- [fix_agent_storage_access.sql](fix_agent_storage_access.sql): 가장 최신이고 완전한 SQL 파일 (에이전트 접근 권한 포함)
- [supabase/migrations/setup_storage.sql](supabase/migrations/setup_storage.sql): 기본 Storage 버킷 설정

## 핵심 해결 방법 (문서에서 확인)

1. **IN 절 사용**: `EXISTS` 서브쿼리 대신 `IN` 절을 사용하여 `name`이 `storage.objects`에서 오는 것을 명확히 함
2. **에이전트 접근 권한**: `clients.owner_agent_id`와 `accounts.clerk_user_id` 비교
3. **권한 부여된 사용자 접근 권한**: `client_authorizations` 테이블 확인

## 실행 순서

### 1단계: Storage 버킷 확인 및 생성

- **파일**: [supabase/migrations/setup_storage.sql](supabase/migrations/setup_storage.sql) 참고
- 버킷 ID: `uploads`
- 타입: Private (public = false)
- 파일 크기 제한: 6MB (6291456 bytes)
- MIME 타입: 모든 타입 허용 (NULL)

**SQL**:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  false,
  6291456,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 6291456;
```



### 2단계: 기존 Storage RLS 정책 모두 삭제

- **파일**: [fix_agent_storage_access.sql](fix_agent_storage_access.sql) 참고
- 모든 가능한 정책 이름을 포함하여 삭제 (이전 버전과의 호환성)

**삭제할 정책 목록**:

- "Users can upload to own folder or authorized client folder"
- "Users can upload to own folder"
- "Users can view own files or authorized client files"
- "Users can view own files"
- "Users can delete own files or authorized client files"
- "Users can delete own files"
- "Users can update own files or authorized client files"
- "Users can update own files"
- "Users can upload own authorized or agent client files"
- "Users can view own authorized or agent client files"
- "Users can delete own authorized or agent client files"
- "Users can update own authorized or agent client files"

### 3단계: 새로운 Storage RLS 정책 생성

- **파일**: [fix_agent_storage_access.sql](fix_agent_storage_access.sql) 사용 (가장 최신 버전)
- **핵심**: `IN` 절을 사용하여 `name`이 `storage.objects`에서 오는 것을 명확히 함

**정책 조건 (3가지)**:

1. **본인 폴더**: `(storage.foldername(name))[1] = ((select auth.jwt())->>'sub')`
2. **권한 부여된 클라이언트 폴더**: `IN` 절 사용
   ```sql
                        (storage.foldername(name))[1] IN (
                          SELECT clients.clerk_user_id
                          FROM public.clients
                          WHERE EXISTS (
                            SELECT 1 FROM public.client_authorizations
                            WHERE client_authorizations.client_id = clients.id
                            AND client_authorizations.authorized_clerk_user_id = ((select auth.jwt())->>'sub')
                          )
                        )
   ```




3. **에이전트가 소유한 클라이언트 폴더**: `IN` 절 사용
   ```sql
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


**정책 종류**:

- **INSERT**: "Users can upload own authorized or agent client files"
- **SELECT**: "Users can view own authorized or agent client files"
- **DELETE**: "Users can delete own authorized or agent client files"
- **UPDATE**: "Users can update own authorized or agent client files" (USING + WITH CHECK 모두 필요)

### 4단계: 정책 확인

- **파일**: [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md) 참고

**확인 쿼리**:

```sql
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN with_check LIKE '%storage.foldername(clients.name)%' THEN '❌ 잘못됨'
    WHEN qual LIKE '%storage.foldername(clients.name)%' THEN '❌ 잘못됨'
    WHEN with_check LIKE '%storage.foldername(name)%' THEN '✅ 올바름'
    WHEN qual LIKE '%storage.foldername(name)%' THEN '✅ 올바름'
    ELSE '⚠️ 확인 필요'
  END as status
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY cmd, policyname;
```

**기대 결과**:

- 정책 개수: 4개 (INSERT, SELECT, DELETE, UPDATE)
- 모든 정책이 "✅ 올바름: name 사용"으로 표시
- `clients.name` 사용 여부: 없음

## 최종 SQL 파일

- **권장 파일**: [fix_agent_storage_access.sql](fix_agent_storage_access.sql)
- 이 파일은 다음을 포함:

1. 모든 기존 정책 삭제
2. Storage 버킷 생성 (필요시)
3. 에이전트 접근 권한 포함한 완전한 RLS 정책
4. `IN` 절 사용 (문서에서 권장한 패턴)

## 주의사항

1. **정책 이름 길이**: PostgreSQL 정책 이름은 최대 63자로 제한됨
2. **IN 절 사용**: `EXISTS` 대신 `IN` 절을 사용하여 PostgreSQL이 `name`을 올바르게 해석하도록 함
3. **에이전트 접근**: `clients.owner_agent_id`와 `accounts.clerk_user_id` 비교
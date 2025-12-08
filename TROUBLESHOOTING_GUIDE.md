# Storage RLS 정책 문제 해결 가이드

## 현재 문제
정책이 여전히 `storage.foldername(clients.name)`을 사용하고 있습니다.
SQL을 여러 번 실행했지만 정책이 업데이트되지 않습니다.

## 가능한 원인

### 1. SQL 실행 실패 (에러 발생)
- SQL 실행 시 에러가 발생했지만 사용자가 모르고 있을 수 있음
- **해결**: SQL 실행 시 에러 메시지를 확인하세요

### 2. 정책 삭제 실패
- 정책 삭제가 실패했을 수 있음
- **해결**: 정책 삭제 후 정책 개수가 0인지 확인하세요

### 3. 새 정책 생성 실패
- 새 정책 생성이 실패했을 수 있음
- **해결**: 정책 생성 후 정책이 올바르게 생성되었는지 확인하세요

### 4. 다른 곳에서 정책 자동 생성
- 마이그레이션 파일이나 트리거에서 정책을 자동으로 생성할 수 있음
- **해결**: 마이그레이션 파일을 확인하세요

### 5. Supabase 캐시 문제
- Supabase가 정책을 캐시하고 있을 수 있음
- **해결**: Supabase Dashboard를 새로고침하세요

## 해결 방법

### 방법 1: SQL 실행 시 에러 확인

1. Supabase SQL Editor에서 SQL 실행
2. **에러 메시지 확인**
   - 에러가 발생했다면 에러 메시지를 복사하여 알려주세요
   - 에러 없이 성공했다면 다음 단계로 진행

### 방법 2: 정책 삭제 확인

다음 쿼리를 실행하여 정책이 삭제되었는지 확인:

```sql
SELECT COUNT(*) as remaining_policies
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects';
```

**결과가 0이어야 합니다!** 0이 아니면 정책 삭제가 실패한 것입니다.

### 방법 3: 정책 생성 확인

정책 생성 후 다음 쿼리로 확인:

```sql
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN with_check LIKE '%storage.foldername(clients.name)%' THEN '❌ 잘못됨'
    WHEN with_check LIKE '%storage.foldername(name)%' THEN '✅ 올바름'
    ELSE '⚠️ 확인 필요'
  END as status
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY cmd, policyname;
```

### 방법 4: 정책 직접 확인

정책의 실제 내용을 확인하려면:

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

이 쿼리 결과에서 `clients.name`이 사용되는지 확인하세요.

## 다음 단계

1. **SQL 실행 시 에러 메시지 확인**
   - 에러가 발생했다면 에러 메시지를 알려주세요
   - 에러 없이 성공했다면 다음 단계로 진행

2. **정책 삭제 확인**
   - 정책 삭제 후 정책 개수가 0인지 확인
   - 0이 아니면 정책 삭제가 실패한 것입니다

3. **정책 생성 확인**
   - 정책 생성 후 정책이 올바르게 생성되었는지 확인
   - 여전히 `clients.name`을 사용한다면 정책 생성이 실패한 것입니다

4. **문제가 계속되면**
   - SQL 실행 시 에러 메시지를 알려주세요
   - 정책의 실제 내용을 알려주세요
   - Supabase Dashboard를 새로고침했는지 확인하세요


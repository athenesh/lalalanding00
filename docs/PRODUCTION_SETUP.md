# 프로덕션 환경 설정 가이드

## Supabase 프로덕션 프로젝트 설정

### 1. 프로덕션 프로젝트 생성

1. Supabase Dashboard → New Project
2. 프로젝트 이름 입력 (예: `lalalanding-production`)
3. 데이터베이스 비밀번호 설정 (안전한 비밀번호 사용)
4. 리전 선택 (사용자와 가까운 리전)

### 2. 마이그레이션 적용

프로덕션 프로젝트에 모든 마이그레이션을 적용합니다:

```bash
# Supabase CLI를 사용한 마이그레이션 (권장)
supabase db push --project-ref your-project-ref

# 또는 Supabase Dashboard → SQL Editor에서 직접 실행
# 1. supabase/migrations/20251205203448_enable_rls_production.sql 실행
# 2. supabase/migrations/20251205203537_fix_function_search_path.sql 실행
```

### 3. RLS 활성화 확인

Supabase Dashboard → Database → Policies에서 모든 테이블의 RLS가 활성화되어 있는지 확인:

```sql
-- RLS 상태 확인 쿼리
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

모든 테이블의 `rowsecurity`가 `true`여야 합니다.

### 4. Storage 버킷 설정

1. Supabase Dashboard → Storage
2. `uploads` 버킷 생성 (없는 경우)
3. Public Access: 비활성화
4. File Size Limit: 10MB (또는 원하는 크기)
5. Allowed MIME Types: 이미지 및 문서 타입만 허용

### 5. 환경 변수 설정

프로덕션 프로젝트의 환경 변수를 설정합니다:

```env
# Supabase 프로덕션
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key

# Clerk 프로덕션
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-production-publishable-key
CLERK_SECRET_KEY=your-production-secret-key

# 외부 API
GEMINI_API_KEY=your-production-gemini-key
BRIDGE_DATA_API_KEY=your-production-bridge-key
```

### 6. 백업 설정

1. Supabase Dashboard → Database → Backups
2. 자동 백업 활성화
3. 백업 일정 설정 (매일 또는 주간)

### 7. 모니터링 설정

1. Supabase Dashboard → Logs
2. API 로그 모니터링 활성화
3. 에러 알림 설정

## 배포 플랫폼 설정 (Vercel)

### 1. 프로젝트 연결

1. Vercel Dashboard → Add New Project
2. GitHub 저장소 연결
3. 프로젝트 설정:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `pnpm build`
   - Output Directory: `.next`

### 2. 환경 변수 설정

Vercel Dashboard → Settings → Environment Variables에서 다음 변수들을 설정:

**Production 환경:**
- 모든 필수 환경 변수 설정
- `NODE_ENV=production`

**Preview 환경:**
- 개발용 환경 변수 설정 (선택사항)

### 3. 도메인 설정

1. Vercel Dashboard → Settings → Domains
2. 커스텀 도메인 추가
3. SSL 인증서 자동 발급 확인

### 4. 배포 확인

1. 첫 배포 후 모든 기능 테스트
2. RLS 정책이 올바르게 작동하는지 확인
3. 인증 흐름 확인
4. 파일 업로드 기능 확인

## 프로덕션 전환 체크리스트

### 데이터베이스
- [ ] 프로덕션 프로젝트 생성 완료
- [ ] 모든 마이그레이션 적용 완료
- [ ] RLS 활성화 확인 완료
- [ ] 함수 search_path 설정 확인 완료
- [ ] Storage RLS 정책 확인 완료
- [ ] 백업 설정 완료

### 환경 변수
- [ ] 모든 필수 환경 변수 설정 완료
- [ ] Service Role Key가 클라이언트에 노출되지 않음
- [ ] API 키가 서버 사이드에서만 사용됨

### 보안
- [ ] 보안 헤더 설정 완료
- [ ] CSP 설정 완료
- [ ] 입력 검증 (Zod) 적용 완료
- [ ] 파일 업로드 보안 강화 완료
- [ ] 보안 이벤트 로깅 설정 완료

### 모니터링
- [ ] 에러 로깅 시스템 설정 완료
- [ ] 보안 이벤트 모니터링 설정 완료
- [ ] 알림 설정 완료

### 테스트
- [ ] 인증 흐름 테스트 완료
- [ ] 권한 테스트 완료 (에이전트/클라이언트)
- [ ] RLS 정책 테스트 완료
- [ ] 파일 업로드 테스트 완료
- [ ] API 엔드포인트 테스트 완료

## 배포 후 확인사항

1. 프로덕션 환경에서 RLS 작동 확인
2. 로깅 시스템 작동 확인
3. 모니터링 대시보드 확인
4. 사용자 인증 흐름 확인
5. 데이터 접근 권한 확인
6. 성능 모니터링


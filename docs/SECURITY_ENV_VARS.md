# 환경 변수 보안 가이드

## 필수 환경 변수 목록

### Clerk 인증
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: 공개 키 (클라이언트 노출 가능)
- `CLERK_SECRET_KEY`: 비밀 키 (서버 사이드 전용, 절대 노출 금지)
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`: 로그인 페이지 URL
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`: 로그인 후 리다이렉트 URL
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`: 회원가입 후 리다이렉트 URL

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL (공개 가능)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon 키 (공개 가능, RLS로 보호됨)
- `SUPABASE_SERVICE_ROLE_KEY`: Service Role 키 (서버 사이드 전용, 절대 노출 금지)
- `NEXT_PUBLIC_STORAGE_BUCKET`: Storage 버킷 이름 (기본값: "uploads")

### 외부 API
- `GEMINI_API_KEY`: Gemini API 키 (서버 사이드 전용)
- `BRIDGE_DATA_API_KEY`: Bridge Data API 키 (서버 사이드 전용)

## 보안 체크리스트

### Service Role Key 보안
- [ ] `SUPABASE_SERVICE_ROLE_KEY`가 클라이언트 사이드 코드에 사용되지 않음
- [ ] `lib/supabase/service-role.ts`는 서버 사이드에서만 사용됨
- [ ] 환경 변수가 `.gitignore`에 포함되어 있음
- [ ] 프로덕션 환경 변수가 안전하게 설정됨

### API 키 보안
- [ ] `GEMINI_API_KEY`가 서버 사이드에서만 사용됨 (`actions/gemini-listing.ts` 확인)
- [ ] `BRIDGE_DATA_API_KEY`가 서버 사이드에서만 사용됨 (`actions/bridge-listing.ts` 확인)
- [ ] 클라이언트 사이드에 노출되는 키는 `NEXT_PUBLIC_` 접두사가 있는 키만 사용

### 환경 변수 검증
- [ ] 모든 필수 환경 변수가 설정되어 있음
- [ ] 프로덕션 환경에서 환경 변수가 올바르게 설정됨
- [ ] 환경 변수 값이 유효한 형식인지 확인됨

## 프로덕션 환경 변수 설정 가이드

### Vercel 배포 시
1. Vercel Dashboard → 프로젝트 선택
2. Settings → Environment Variables
3. 각 환경 변수 추가:
   - Production 환경에만 설정
   - Preview 환경에는 개발용 값 설정
   - Development 환경은 로컬 `.env.local` 사용

### 환경 변수 검증 스크립트
프로덕션 배포 전에 다음 스크립트를 실행하여 필수 환경 변수를 확인하세요:

```bash
# 필수 환경 변수 확인
node -e "
const required = [
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];
const missing = required.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error('Missing environment variables:', missing);
  process.exit(1);
}
console.log('All required environment variables are set');
"
```

## 보안 모범 사례

1. **절대 하드코딩하지 않기**: 모든 키는 환경 변수로 관리
2. **서버 사이드 키 보호**: `SUPABASE_SERVICE_ROLE_KEY`, `CLERK_SECRET_KEY` 등은 서버 사이드에서만 사용
3. **정기적인 키 로테이션**: 프로덕션 키는 정기적으로 변경
4. **접근 제어**: 환경 변수에 접근할 수 있는 사람을 최소화
5. **로깅 주의**: 환경 변수 값이 로그에 출력되지 않도록 주의


# 보안 로깅 시스템 설정 가이드

## 개요

보안 이벤트를 추적하고 모니터링하기 위한 로깅 시스템 설정 가이드입니다.

## 현재 구현

### 보안 이벤트 로깅 (`lib/logging/security-events.ts`)

다음 이벤트 타입을 지원합니다:
- `AUTH_FAILURE`: 인증 실패
- `PERMISSION_DENIED`: 권한 위반
- `INVALID_INPUT`: 잘못된 입력
- `SUSPICIOUS_ACTIVITY`: 의심스러운 활동
- `RATE_LIMIT_EXCEEDED`: Rate limit 초과

### 로깅 위치

보안 이벤트는 다음 위치에서 로깅됩니다:
- API 라우트의 인증 실패
- 권한 위반 시도
- 입력 검증 실패
- 의심스러운 활동 감지

## Sentry 연동 (권장)

### 1. Sentry 계정 생성 및 프로젝트 설정

1. [Sentry](https://sentry.io)에 가입
2. 새 프로젝트 생성 (Next.js 선택)
3. DSN 복사

### 2. 패키지 설치

```bash
pnpm add @sentry/nextjs
```

### 3. Sentry 초기화

```bash
npx @sentry/wizard@latest -i nextjs
```

### 4. 환경 변수 추가

```env
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
SENTRY_AUTH_TOKEN=your_auth_token_here
```

### 5. 보안 이벤트 로깅 활성화

`lib/logging/security-events.ts`의 `logSecurityEvent` 함수에서 Sentry 연동 코드의 주석을 해제하세요.

## 모니터링 설정

### Supabase 대시보드

1. Supabase Dashboard → Logs
2. API 로그 모니터링 설정
3. 에러 알림 설정

### Vercel Analytics (선택사항)

1. Vercel Dashboard → Analytics
2. Web Vitals 모니터링 활성화
3. 에러 추적 활성화

## 알림 설정

중요한 보안 이벤트에 대한 알림을 설정하세요:

1. **인증 실패**: 짧은 시간 내 여러 번 발생 시 알림
2. **권한 위반**: 반복적인 시도 시 알림
3. **의심스러운 활동**: 비정상적인 패턴 감지 시 알림

## 로그 보관 정책

- 보안 이벤트 로그는 최소 90일간 보관
- 민감한 정보(비밀번호, API 키 등)는 로그에서 제외
- 개인정보는 익명화하여 로깅


# Bridge Data Output API 설정 가이드

## 개요

Bridge Data Output API는 미국 부동산 MLS(Multiple Listing Service) 데이터에 접근할 수 있는 API 서비스입니다. 이 가이드는 API 키 발급 및 프로젝트 설정 방법을 안내합니다.

## API 키 발급 절차

### 1. Bridge Data Output 웹사이트 방문

1. [Bridge Data Output 공식 웹사이트](https://bridgedataoutput.com)에 접속합니다.
2. "Sign Up" 또는 "Get Started" 버튼을 클릭하여 계정을 생성합니다.

### 2. 계정 생성

- 이메일 주소로 회원가입
- 필요한 정보 입력 (회사명, 연락처 등)
- 이메일 인증 완료

### 3. API 키 발급

1. 로그인 후 대시보드로 이동합니다.
2. "API Keys" 또는 "Developer" 섹션으로 이동합니다.
3. "Create New API Key" 버튼을 클릭합니다.
4. API 키 이름을 입력하고 생성합니다.
5. 생성된 API 키를 안전하게 복사합니다.

**중요**: API 키는 한 번만 표시되므로 반드시 안전한 곳에 저장하세요.

### 4. API 문서 확인

- [Bridge Data Output API 문서](https://bridgedataoutput.com/docs/explorer/mls-data#listListings)를 참고하여 엔드포인트 및 사용법을 확인합니다.
- 주요 엔드포인트: `listListings` - 리스팅 목록 조회

## 프로젝트 환경 변수 설정

### 1. 로컬 개발 환경

프로젝트 루트의 `.env.local` 파일에 다음을 추가합니다:

```env
BRIDGE_DATA_API_KEY=your_api_key_here
```

### 2. 프로덕션 환경

배포 플랫폼(Vercel, Netlify 등)의 환경 변수 설정에서 다음을 추가합니다:

- 변수명: `BRIDGE_DATA_API_KEY`
- 값: 발급받은 API 키

### 3. 환경 변수 보안

- **절대** 클라이언트 사이드 코드에서 API 키를 사용하지 마세요.
- API 키는 서버 사이드(Server Actions, API Routes)에서만 사용합니다.
- `.env.local` 파일은 `.gitignore`에 포함되어 있어야 합니다.

## API 사용 예시

### Server Action에서 사용

```typescript
// actions/bridge-listing.ts
const apiKey = process.env.BRIDGE_DATA_API_KEY;

if (!apiKey) {
  throw new Error("BRIDGE_DATA_API_KEY is not set");
}

const response = await fetch(
  `https://api.bridgedataoutput.com/v2/OData/.../listings?$filter=...`,
  {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  },
);
```

## API 엔드포인트 정보

### Base URL

```
https://api.bridgedataoutput.com/v2/OData/{database}
```

### 주요 엔드포인트

- `GET /listings` - 리스팅 목록 조회
  - 쿼리 파라미터: `$filter`, `$select`, `$top`, `$skip` 등
  - OData 표준 쿼리 언어 사용

### 응답 형식

API는 OData 형식으로 JSON 응답을 반환합니다:

```json
{
  "@odata.context": "...",
  "value": [
    {
      "ListingKey": "...",
      "ListPrice": 500000,
      "BedroomsTotal": 3,
      "BathroomsTotalInteger": 2,
      "LivingArea": 1500,
      "UnparsedAddress": "123 Main St, City, State 12345",
      "Media": [
        {
          "MediaURL": "https://..."
        }
      ]
    }
  ]
}
```

## 주의사항

1. **API 사용량 제한**: API 키별로 일일/월간 요청 제한이 있을 수 있습니다. 문서에서 확인하세요.

2. **데이터 캐싱**: 동일한 리스팅 정보를 반복 조회하지 않도록 `shared_listings` 테이블에 캐싱합니다.

3. **에러 처리**: API 호출 실패 시 사용자에게 친화적인 메시지를 표시합니다.

4. **비용**: 일부 API 플랜은 사용량에 따라 비용이 발생할 수 있습니다. 요금제를 확인하세요.

## 문제 해결

### API 키가 작동하지 않는 경우

1. API 키가 올바르게 복사되었는지 확인
2. 환경 변수가 올바르게 설정되었는지 확인
3. API 키가 만료되지 않았는지 확인
4. Bridge Data Output 대시보드에서 API 키 상태 확인

### API 호출 실패 시

1. 네트워크 연결 확인
2. API 엔드포인트 URL 확인
3. 요청 헤더 확인 (Authorization 포함)
4. Bridge Data Output 상태 페이지 확인

## 추가 리소스

- [Bridge Data Output 공식 문서](https://bridgedataoutput.com/docs)
- [OData 쿼리 언어 가이드](https://www.odata.org/documentation/)
- [API 상태 페이지](https://status.bridgedataoutput.com) (있는 경우)

## 지원

문제가 발생하면:

1. Bridge Data Output 지원팀에 문의
2. 프로젝트 이슈 트래커에 문제 보고

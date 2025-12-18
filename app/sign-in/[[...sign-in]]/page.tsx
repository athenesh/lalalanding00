import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";

/**
 * @file app/sign-in/[[...sign-in]]/page.tsx
 * @description 로그인 페이지
 *
 * 프로덕션 환경에서 MAINTENANCE_MODE가 활성화되면 로그인을 차단합니다.
 * 개발 환경에서는 항상 정상 작동합니다.
 */
export default function SignInPage() {
  // 프로덕션 점검 모드 체크 (페이지 레벨 보호)
  const isProduction = process.env.NODE_ENV === "production";
  // 대소문자 구분 없이 체크 (true, TRUE, True 모두 허용)
  const maintenanceModeValue =
    process.env.MAINTENANCE_MODE?.toLowerCase() || "";
  const maintenanceMode =
    isProduction &&
    (maintenanceModeValue === "true" || maintenanceModeValue === "1");

  // 프로덕션 점검 모드일 때는 maintenance 페이지로 리다이렉트
  // 개발 환경에서는 항상 Clerk 컴포넌트 렌더링
  if (maintenanceMode) {
    console.log(
      "[SignInPage] Maintenance mode active, redirecting to /maintenance",
    );
    redirect("/maintenance");
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg",
          },
        }}
        routing="path"
        path="/sign-in"
        fallbackRedirectUrl="/"
      />
    </div>
  );
}


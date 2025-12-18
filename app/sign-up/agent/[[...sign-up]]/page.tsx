import { redirect } from "next/navigation";
import { AgentSignUpContent } from "./agent-sign-up-content";

/**
 * @file app/sign-up/agent/[[...sign-up]]/page.tsx
 * @description 에이전트 회원가입 페이지
 *
 * 프로덕션 환경에서 MAINTENANCE_MODE가 활성화되면 회원가입을 차단합니다.
 * 개발 환경에서는 항상 정상 작동합니다.
 */
export default function AgentSignUpPage() {
  // 프로덕션 점검 모드 체크 (페이지 레벨 보호)
  const isProduction = process.env.NODE_ENV === "production";
  // 대소문자 구분 없이 체크 (true, TRUE, True 모두 허용)
  const maintenanceModeValue =
    process.env.MAINTENANCE_MODE?.toLowerCase() || "";
  const maintenanceMode =
    isProduction &&
    (maintenanceModeValue === "true" || maintenanceModeValue === "1");

  // 프로덕션 점검 모드일 때는 maintenance 페이지로 리다이렉트
  // 개발 환경에서는 항상 클라이언트 컴포넌트 렌더링
  if (maintenanceMode) {
    console.log(
      "[AgentSignUpPage] Maintenance mode active, redirecting to /maintenance",
    );
    redirect("/maintenance");
  }

  return <AgentSignUpContent />;
}


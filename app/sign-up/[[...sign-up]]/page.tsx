import { redirect } from "next/navigation";

/**
 * 기존 /sign-up 경로는 역할별 회원가입 페이지로 리다이렉트합니다.
 * 랜딩 페이지에서 역할을 선택하도록 안내합니다.
 */
export default function SignUpPage() {
  redirect("/");
}


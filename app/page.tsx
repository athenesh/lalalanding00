import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getAuthRole, isAdmin } from "@/lib/auth";
import HomeClient from "./home-client";

/**
 * @file app/page.tsx
 * @description 랜딩페이지 (서버 컴포넌트)
 *
 * 서버 사이드에서 로그인한 사용자를 역할에 따라 적절한 페이지로 리다이렉트합니다.
 * 관리자는 role과 관계없이 관리자 대시보드로 리다이렉트됩니다.
 */
export default async function Home() {
  const { userId } = await auth();

  // 로그인한 사용자인 경우 role 및 관리자 여부 확인
  if (userId) {
    // 🔥 우선순위 1: 관리자 체크 (role과 관계없이 먼저 확인)
    const adminCheck = await isAdmin();
    if (adminCheck) {
      console.log("[HomePage] 서버 사이드: 관리자 확인, /admin/dashboard로 리다이렉트");
      redirect("/admin/dashboard");
    }
    
    // 관리자가 아닌 경우 role 확인
    const role = await getAuthRole();
    
    // 클라이언트인 경우 즉시 리다이렉트 (서버 사이드)
    if (role === "client") {
      console.log("[HomePage] 서버 사이드: 클라이언트 감지, /client/home으로 리다이렉트");
      redirect("/client/home");
    }
  }

  // 클라이언트 컴포넌트 렌더링 (로그인하지 않았거나, 클라이언트가 아닌 경우)
  return <HomeClient />;
}

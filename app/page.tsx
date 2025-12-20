import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getAuthRole } from "@/lib/auth";
import HomeClient from "./home-client";

/**
 * @file app/page.tsx
 * @description 랜딩페이지 (서버 컴포넌트)
 *
 * 서버 사이드에서 로그인한 클라이언트를 즉시 /client/home으로 리다이렉트합니다.
 * 이렇게 하면 클라이언트 사이드 리다이렉트로 인한 페이지 깜빡임을 방지할 수 있습니다.
 */
export default async function Home() {
  const { userId } = await auth();

  // 로그인한 사용자인 경우 role 확인
  if (userId) {
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

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SignedOut, SignedIn } from "@clerk/nextjs";
import { getAuthRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  // 로그인한 사용자는 역할에 따라 적절한 페이지로 리다이렉트
  const role = await getAuthRole();
  if (role === 'agent') {
    redirect('/agent/dashboard');
  }
  if (role === 'client') {
    redirect('/client/home');
  }

  return (
    <main className="min-h-[calc(100vh-80px)] flex items-center px-8 py-16 lg:py-24">
      <section className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start lg:items-center">
        {/* 좌측: 서비스 소개 */}
        <div className="flex flex-col gap-8">
          <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
            미국 이주 지원 플랫폼
          </h1>
          <p className="text-xl lg:text-2xl text-gray-600 dark:text-gray-400 leading-relaxed">
            미국 이주를 준비하는 클라이언트와 이를 지원하는 에이전트를 위한
            올인원 정보 관리 및 커뮤니케이션 플랫폼입니다.
          </p>
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="text-lg">체계적인 이주 준비 체크리스트</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="text-lg">실시간 커뮤니케이션</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="text-lg">효율적인 클라이언트 관리</span>
            </div>
          </div>
        </div>

        {/* 우측: 로그인 및 회원가입 버튼 */}
        <SignedOut>
          <div className="flex flex-col gap-6">
            <Link href="/sign-in" className="w-full">
              <Button className="w-full h-16 text-lg shadow-lg hover:shadow-xl transition-shadow">
                로그인
              </Button>
            </Link>
            <div className="space-y-4">
              <Link href="/sign-up/agent" className="w-full block">
                <Button
                  className="w-full h-16 text-lg shadow-lg hover:shadow-xl transition-shadow"
                  variant="outline"
                >
                  에이전트로 가입하기
                </Button>
              </Link>
              <Link href="/sign-up/client" className="w-full block">
                <Button
                  className="w-full h-16 text-lg shadow-lg hover:shadow-xl transition-shadow"
                  variant="outline"
                >
                  클라이언트로 가입하기
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-500 text-center mt-4">
              역할에 맞는 회원가입을 선택해주세요
            </p>
          </div>
        </SignedOut>
      </section>
    </main>
  );
}

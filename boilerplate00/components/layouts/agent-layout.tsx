import { ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

interface AgentLayoutProps {
  children: ReactNode;
}

export function AgentLayout({ children }: AgentLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/agent/dashboard" className="text-xl font-bold">
                에이전트 대시보드
              </Link>
              <nav className="hidden md:flex gap-4">
                <Link
                  href="/agent/dashboard"
                  className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  대시보드
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

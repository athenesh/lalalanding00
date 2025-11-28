"use client";

import { use } from "react";
import { useParams, useRouter } from "next/navigation";
import { AgentLayout } from "@/components/layouts/agent-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AgentClientDetailPage() {
  const params = use(useParams());
  const clientId = params.id as string;
  const router = useRouter();

  return (
    <AgentLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link
              href="/agent/dashboard"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-2 inline-block"
            >
              ← 대시보드로 돌아가기
            </Link>
            <h1 className="text-3xl font-bold mb-2">클라이언트 상세 정보</h1>
            <p className="text-gray-600 dark:text-gray-400">
              클라이언트 ID: {clientId}
            </p>
          </div>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">프로필</TabsTrigger>
            <TabsTrigger value="housing">주거옵션</TabsTrigger>
            <TabsTrigger value="checklist">체크리스트</TabsTrigger>
            <TabsTrigger value="chat">채팅</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4">프로필 정보</h2>
              <p className="text-gray-600 dark:text-gray-400">
                클라이언트의 기본 정보를 조회하고 수정할 수 있습니다.
              </p>
              {/* 프로필 폼은 Day 8-9에 구현 예정 */}
            </div>
          </TabsContent>

          <TabsContent value="housing" className="mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4">주거 옵션</h2>
              <p className="text-gray-600 dark:text-gray-400">
                클라이언트의 주거 요구조건을 조회하고 수정할 수 있습니다.
              </p>
              {/* 주거 옵션 폼은 Day 10에 구현 예정 */}
            </div>
          </TabsContent>

          <TabsContent value="checklist" className="mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4">체크리스트</h2>
              <p className="text-gray-600 dark:text-gray-400">
                클라이언트의 이주 준비 체크리스트를 확인하고 관리할 수 있습니다.
              </p>
              {/* 체크리스트는 Day 11에 구현 예정 */}
            </div>
          </TabsContent>

          <TabsContent value="chat" className="mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4">채팅</h2>
              <p className="text-gray-600 dark:text-gray-400">
                클라이언트와 실시간으로 소통할 수 있습니다.
              </p>
              {/* 채팅은 Day 12-13에 구현 예정 */}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AgentLayout>
  );
}


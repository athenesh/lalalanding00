"use client";

import { ClientLayout } from "@/components/layouts/client-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ClientHomePage() {
  return (
    <ClientLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">내 정보 관리</h1>
          <p className="text-gray-600 dark:text-gray-400">
            프로필, 주거 옵션, 체크리스트, 채팅을 관리할 수 있습니다.
          </p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">내 프로필</TabsTrigger>
            <TabsTrigger value="housing">주거옵션</TabsTrigger>
            <TabsTrigger value="checklist">체크리스트</TabsTrigger>
            <TabsTrigger value="chat">채팅</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4">내 프로필</h2>
              <p className="text-gray-600 dark:text-gray-400">
                프로필 정보를 입력하고 수정할 수 있습니다.
              </p>
              {/* 프로필 폼은 Day 8-9에 구현 예정 */}
            </div>
          </TabsContent>

          <TabsContent value="housing" className="mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4">주거 옵션</h2>
              <p className="text-gray-600 dark:text-gray-400">
                주거 요구조건을 입력하고 수정할 수 있습니다.
              </p>
              {/* 주거 옵션 폼은 Day 10에 구현 예정 */}
            </div>
          </TabsContent>

          <TabsContent value="checklist" className="mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4">체크리스트</h2>
              <p className="text-gray-600 dark:text-gray-400">
                이주 준비 체크리스트를 확인하고 완료할 수 있습니다.
              </p>
              {/* 체크리스트는 Day 11에 구현 예정 */}
            </div>
          </TabsContent>

          <TabsContent value="chat" className="mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4">채팅</h2>
              <p className="text-gray-600 dark:text-gray-400">
                에이전트와 실시간으로 소통할 수 있습니다.
              </p>
              {/* 채팅은 Day 12-13에 구현 예정 */}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ClientLayout>
  );
}


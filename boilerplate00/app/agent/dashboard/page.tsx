"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Header from "@/components/layout/header";
import ClientCard from "@/components/agent/client-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock data - will be replaced with real data later
const mockClients = [
  {
    id: "1",
    name: "홍길동",
    occupation: "doctor",
    movingDate: "2025-06-01",
    checklistCompletion: 65,
    checklistTotal: 20,
    checklistCompleted: 13,
    lastChatTime: "2시간 전",
  },
  {
    id: "2",
    name: "김영희",
    occupation: "employee",
    movingDate: "2025-07-15",
    checklistCompletion: 45,
    checklistTotal: 20,
    checklistCompleted: 9,
    lastChatTime: "1일 전",
  },
  {
    id: "3",
    name: "이철수",
    occupation: "student",
    movingDate: "2025-08-20",
    checklistCompletion: 30,
    checklistTotal: 20,
    checklistCompleted: 6,
    lastChatTime: "3시간 전",
  },
];

export default function AgentDashboard() {
  const [clients] = useState(mockClients);
  const { toast } = useToast();
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();

  // 에이전트 역할 체크
  useEffect(() => {
    if (!userLoaded) return;

    if (!user) {
      console.log("[AgentDashboard] No user, redirecting to sign-in");
      router.push("/sign-in");
      return;
    }

    const role = (user.publicMetadata as { role?: string })?.role;
    console.log("[AgentDashboard] Current role:", role);

    if (role !== "agent") {
      console.log(
        `[AgentDashboard] Access denied: role is '${role}', expected 'agent'. Redirecting to home.`,
      );
      router.push("/");
      return;
    }
  }, [user, userLoaded, router]);

  // 사용자 이름 추출 로직
  const displayName = useMemo(() => {
    if (!userLoaded || !user) {
      return "에이전트";
    }

    return (
      user.fullName ||
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.emailAddresses[0]?.emailAddress ||
      "에이전트"
    );
  }, [user, userLoaded]);

  const handleAddClient = () => {
    toast({
      title: "새 클라이언트 추가",
      description: "클라이언트 추가 기능은 곧 추가됩니다.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="내 클라이언트 관리" userName={displayName} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">클라이언트 목록</h2>
            <p className="text-muted-foreground mt-1">
              총 {clients.length}명의 클라이언트를 관리하고 있습니다
            </p>
          </div>
          <Button onClick={handleAddClient} className="gap-2">
            <Plus className="h-4 w-4" />새 클라이언트 추가
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <ClientCard key={client.id} {...client} />
          ))}
        </div>

        {clients.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              아직 등록된 클라이언트가 없습니다.
            </p>
            <Button onClick={handleAddClient} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />첫 클라이언트 추가하기
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

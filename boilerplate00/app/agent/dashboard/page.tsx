"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AgentLayout } from "@/components/layouts/agent-layout";

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  occupation: string;
  moving_date: string;
  checklist_completion_rate: number;
  created_at: string;
  updated_at: string;
}

export default function AgentDashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/clients");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch clients");
      }

      setClients(data.clients || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      alert("클라이언트 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getOccupationLabel = (occupation: string) => {
    const labels: Record<string, string> = {
      doctor: "의사",
      employee: "회사직원",
      student: "학생",
    };
    return labels[occupation] || occupation;
  };

  if (loading) {
    return (
      <AgentLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      </AgentLayout>
    );
  }

  return (
    <AgentLayout>
      <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">에이전트 대시보드</h1>
          <p className="text-gray-600">
            총 {clients.length}명의 클라이언트를 관리하고 있습니다.
          </p>
        </div>
        <Link href="/agent/clients/new">
          <Button className="h-12 px-6">
            + 새 클라이언트 추가
          </Button>
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-16 border rounded-lg">
          <p className="text-gray-600 mb-4">아직 등록된 클라이언트가 없습니다.</p>
          <Link href="/agent/clients/new">
            <Button>첫 클라이언트 추가하기</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <div
              key={client.id}
              onClick={() => router.push(`/agent/client/${client.id}`)}
              className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer bg-white dark:bg-gray-800"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold mb-1">{client.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {client.email}
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    직업
                  </p>
                  <p className="font-medium">
                    {getOccupationLabel(client.occupation)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    이주 예정일
                  </p>
                  <p className="font-medium">{formatDate(client.moving_date)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    체크리스트 진행률
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div
                      className="bg-primary h-2.5 rounded-full transition-all"
                      style={{ width: `${client.checklist_completion_rate}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {client.checklist_completion_rate}% 완료
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </AgentLayout>
  );
}


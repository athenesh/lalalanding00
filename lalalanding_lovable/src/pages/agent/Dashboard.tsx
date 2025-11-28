import { useState } from "react";
import Header from "@/components/layout/Header";
import ClientCard from "@/components/agent/ClientCard";
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

const AgentDashboard = () => {
  const [clients] = useState(mockClients);
  const { toast } = useToast();

  const handleAddClient = () => {
    toast({
      title: "새 클라이언트 추가",
      description: "클라이언트 추가 기능은 곧 추가됩니다.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="내 클라이언트 관리" 
        userName="에이전트"
        onLogout={() => window.location.href = '/'}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">클라이언트 목록</h2>
            <p className="text-muted-foreground mt-1">
              총 {clients.length}명의 클라이언트를 관리하고 있습니다
            </p>
          </div>
          <Button onClick={handleAddClient} className="gap-2">
            <Plus className="h-4 w-4" />
            새 클라이언트 추가
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <ClientCard key={client.id} {...client} />
          ))}
        </div>

        {clients.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">아직 등록된 클라이언트가 없습니다.</p>
            <Button onClick={handleAddClient} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              첫 클라이언트 추가하기
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default AgentDashboard;

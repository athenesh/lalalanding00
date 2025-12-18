J"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

interface Agent {
  id: string;
  clerk_user_id: string;
  email: string;
  name: string | null;
  dre_number: string | null;
  brokerage_name: string | null;
  is_approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
}

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const { toast } = useToast();
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();

  // ADMIN 권한 확인은 서버 사이드에서 처리되므로 클라이언트에서는 API 호출 시 확인됨

  // 에이전트 목록 로드
  useEffect(() => {
    const loadAgents = async () => {
      try {
        setIsLoading(true);
        const statusParam = filter === "all" ? "" : `?status=${filter}`;
        const response = await fetch(`/api/admin/agents${statusParam}`);

        if (!response.ok) {
          if (response.status === 403) {
            router.push("/");
            return;
          }
          throw new Error("Failed to load agents");
        }

        const data = await response.json();
        setAgents(data.agents || []);
      } catch (error) {
        console.error("[AdminAgents] Error loading agents:", error);
        toast({
          title: "데이터 로드 실패",
          description: "에이전트 목록을 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (userLoaded && user) {
      loadAgents();
    }
  }, [userLoaded, user, filter, router, toast]);

  // 에이전트 승인
  const handleApprove = async (agentId: string) => {
    try {
      const response = await fetch(`/api/admin/agents/${agentId}/approve`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to approve agent");
      }

      toast({
        title: "승인 완료",
        description: "에이전트가 성공적으로 승인되었습니다.",
      });

      // 목록 새로고침
      const statusParam = filter === "all" ? "" : `?status=${filter}`;
      const response2 = await fetch(`/api/admin/agents${statusParam}`);
      if (response2.ok) {
        const data = await response2.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error("[AdminAgents] Error approving agent:", error);
      toast({
        title: "승인 실패",
        description:
          error instanceof Error
            ? error.message
            : "에이전트 승인에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const pendingAgents = agents.filter((a) => !a.is_approved);
  const approvedAgents = agents.filter((a) => a.is_approved);

  return (
    <div className="min-h-screen bg-background">
      <Header
        title="에이전트 관리"
        userName={
          user?.fullName || user?.emailAddresses[0]?.emailAddress || "Admin"
        }
      />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            전체 ({agents.length})
          </Button>
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            onClick={() => setFilter("pending")}
          >
            승인 대기 ({pendingAgents.length})
          </Button>
          <Button
            variant={filter === "approved" ? "default" : "outline"}
            onClick={() => setFilter("approved")}
          >
            승인됨 ({approvedAgents.length})
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        ) : (
          <>
            {agents.length === 0 ? (
              <div className="text-center py-16 border border-border rounded-lg">
                <p className="text-muted-foreground">
                  {filter === "pending"
                    ? "승인 대기 중인 에이전트가 없습니다."
                    : filter === "approved"
                    ? "승인된 에이전트가 없습니다."
                    : "에이전트가 없습니다."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => (
                  <Card key={agent.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {agent.name || "이름 없음"}
                          </CardTitle>
                          <CardDescription className="mt-1 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {agent.email}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={agent.is_approved ? "default" : "secondary"}
                        >
                          {agent.is_approved ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              승인됨
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              대기 중
                            </>
                          )}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        {agent.dre_number && (
                          <div>
                            <span className="font-medium">DRE 번호:</span>{" "}
                            {agent.dre_number}
                          </div>
                        )}
                        {agent.brokerage_name && (
                          <div>
                            <span className="font-medium">Brokerage:</span>{" "}
                            {agent.brokerage_name}
                          </div>
                        )}
                        <div className="text-muted-foreground">
                          가입일:{" "}
                          {new Date(agent.created_at).toLocaleDateString(
                            "ko-KR",
                          )}
                        </div>
                        {agent.approved_at && (
                          <div className="text-muted-foreground">
                            승인일:{" "}
                            {new Date(agent.approved_at).toLocaleDateString(
                              "ko-KR",
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        {!agent.is_approved && (
                          <>
                            {!agent.dre_number || !agent.brokerage_name ? (
                              <Alert>
                                <AlertDescription className="text-xs">
                                  DRE 번호 또는 Brokerage 이름이 입력되지
                                  않았습니다.
                                </AlertDescription>
                              </Alert>
                            ) : (
                              <Button
                                onClick={() => handleApprove(agent.id)}
                                className="w-full"
                                size="sm"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                승인하기
                              </Button>
                            )}
                          </>
                        )}
                        <Link href={`/admin/agents/${agent.id}`}>
                          <Button
                            variant="outline"
                            className="w-full"
                            size="sm"
                          >
                            상세 보기
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

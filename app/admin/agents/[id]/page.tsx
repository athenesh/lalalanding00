"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Users, Calendar, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

interface AgentDetail {
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
  clientCount: number;
  recentClients: Array<{
    id: string;
    name: string;
    email: string;
    moving_date: string;
    created_at: string;
  }>;
}

export default function AdminAgentDetailPage() {
  const params = useParams();
  const agentId = params.id as string;
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();

  useEffect(() => {
    const loadAgent = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/admin/agents/${agentId}`);

        if (!response.ok) {
          if (response.status === 403) {
            router.push("/");
            return;
          }
          if (response.status === 404) {
            toast({
              title: "에이전트를 찾을 수 없습니다",
              description: "요청하신 에이전트가 존재하지 않습니다.",
              variant: "destructive",
            });
            router.push("/admin/agents");
            return;
          }
          throw new Error("Failed to load agent");
        }

        const data = await response.json();
        setAgent(data.agent);
      } catch (error) {
        console.error("[AdminAgentDetail] Error loading agent:", error);
        toast({
          title: "데이터 로드 실패",
          description: "에이전트 정보를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (userLoaded && user && agentId) {
      loadAgent();
    }
  }, [userLoaded, user, agentId, router, toast]);

  const displayName = user?.fullName || user?.emailAddresses[0]?.emailAddress || "Admin";

  if (!userLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="에이전트 상세" userName={displayName} />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <p className="text-muted-foreground">에이전트 정보를 불러오는 중...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="에이전트 상세" userName={displayName} />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <p className="text-muted-foreground">에이전트를 찾을 수 없습니다.</p>
            <Link href="/admin/agents">
              <Button variant="outline" className="mt-4">
                목록으로 돌아가기
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="에이전트 상세" userName={displayName} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/admin/agents">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              목록으로 돌아가기
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 메인 정보 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 기본 정보 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>기본 정보</CardTitle>
                  <Badge variant={agent.is_approved ? "default" : "secondary"}>
                    {agent.is_approved ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        승인됨
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        승인 대기
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">이름</p>
                    <p className="text-lg font-semibold">{agent.name || "이름 없음"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      이메일
                    </p>
                    <p className="text-sm">{agent.email}</p>
                  </div>
                  {agent.dre_number && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">DRE 번호</p>
                      <p className="text-sm">{agent.dre_number}</p>
                    </div>
                  )}
                  {agent.brokerage_name && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Brokerage</p>
                      <p className="text-sm">{agent.brokerage_name}</p>
                    </div>
                  )}
                  {agent.approved_at && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">승인일</p>
                      <p className="text-sm">
                        {new Date(agent.approved_at).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      가입일
                    </p>
                    <p className="text-sm">
                      {new Date(agent.created_at).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 최근 클라이언트 */}
            {agent.recentClients.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    최근 클라이언트
                  </CardTitle>
                  <CardDescription>최근 5명의 클라이언트</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {agent.recentClients.map((client) => (
                      <div
                        key={client.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent"
                      >
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-muted-foreground">{client.email}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            이주 예정일: {new Date(client.moving_date).toLocaleDateString("ko-KR")}
                          </p>
                        </div>
                        <Link href={`/admin/clients/${client.id}`}>
                          <Button variant="ghost" size="sm">
                            상세 보기
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                  {agent.clientCount > 5 && (
                    <div className="mt-4 text-center">
                      <Link href={`/admin/clients?agent_id=${agent.id}`}>
                        <Button variant="outline" size="sm">
                          전체 클라이언트 보기 ({agent.clientCount}명)
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* 사이드바 - 통계 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>통계</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      총 클라이언트 수
                    </p>
                    <p className="text-3xl font-bold mt-2">{agent.clientCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}


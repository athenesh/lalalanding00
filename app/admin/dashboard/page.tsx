"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  UserCheck, 
  Clock, 
  MessageSquare,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface DashboardStats {
  totalClients: number;
  totalAgents: number;
  pendingAgents: number;
  totalMessages: number;
  recentClients: Array<{
    id: string;
    name: string;
    created_at: string;
  }>;
  recentAgents: Array<{
    id: string;
    name: string;
    email: string;
    created_at: string;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();

  useEffect(() => {
    const loadStats = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/admin/dashboard/stats");

        if (!response.ok) {
          if (response.status === 403) {
            router.push("/");
            return;
          }
          throw new Error("Failed to load dashboard stats");
        }

        const data = await response.json();
        setStats(data.stats);
      } catch (error) {
        console.error("[AdminDashboard] Error loading stats:", error);
        toast({
          title: "데이터 로드 실패",
          description: "대시보드 통계를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (userLoaded && user) {
      loadStats();
    }
  }, [userLoaded, user, router, toast]);

  const displayName = user?.fullName || user?.emailAddresses[0]?.emailAddress || "Admin";

  if (!userLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* 페이지 제목 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">관리자 대시보드</h1>
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">통계 데이터를 불러오는 중...</p>
          </div>
        ) : stats ? (
          <>
            {/* 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">전체 클라이언트</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalClients}</div>
                  <p className="text-xs text-muted-foreground">
                    등록된 클라이언트 수
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">전체 에이전트</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalAgents}</div>
                  <p className="text-xs text-muted-foreground">
                    등록된 에이전트 수
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">승인 대기</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingAgents}</div>
                  <p className="text-xs text-muted-foreground">
                    승인 대기 중인 에이전트
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">전체 메시지</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalMessages}</div>
                  <p className="text-xs text-muted-foreground">
                    총 채팅 메시지 수
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 최근 활동 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 최근 클라이언트 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>최근 가입 클라이언트</CardTitle>
                      <CardDescription>최근 7일간 가입한 클라이언트</CardDescription>
                    </div>
                    <Link href="/admin/clients">
                      <Button variant="ghost" size="sm">
                        전체 보기 <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {stats.recentClients.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      최근 가입한 클라이언트가 없습니다.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {stats.recentClients.map((client) => (
                        <div
                          key={client.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-accent"
                        >
                          <div>
                            <p className="text-sm font-medium">{client.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(client.created_at).toLocaleDateString("ko-KR", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
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
                  )}
                </CardContent>
              </Card>

              {/* 최근 에이전트 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>최근 가입 에이전트</CardTitle>
                      <CardDescription>최근 7일간 가입한 에이전트</CardDescription>
                    </div>
                    <Link href="/admin/agents">
                      <Button variant="ghost" size="sm">
                        전체 보기 <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {stats.recentAgents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      최근 가입한 에이전트가 없습니다.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {stats.recentAgents.map((agent) => (
                        <div
                          key={agent.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-accent"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {agent.name || "이름 없음"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {agent.email} ·{" "}
                              {new Date(agent.created_at).toLocaleDateString("ko-KR", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          <Link href={`/admin/agents/${agent.id}`}>
                            <Button variant="ghost" size="sm">
                              상세 보기
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 빠른 액션 */}
            {stats.pendingAgents > 0 && (
              <Card className="mt-6 border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    승인 대기 알림
                  </CardTitle>
                  <CardDescription>
                    {stats.pendingAgents}명의 에이전트가 승인을 기다리고 있습니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/admin/agents?status=pending">
                    <Button>
                      승인 대기 에이전트 확인하기
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">통계 데이터를 불러올 수 없습니다.</p>
          </div>
        )}
      </main>
    </div>
  );
}


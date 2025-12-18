"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Phone, Calendar, Users, FileText, MessageSquare } from "lucide-react";
import Link from "next/link";

interface ClientDetail {
  id: string;
  name: string;
  email: string;
  phone_kr: string | null;
  phone_us: string | null;
  occupation: string;
  moving_date: string;
  moving_type: string | null;
  relocation_type: string | null;
  created_at: string;
  updated_at: string;
  owner_agent_id: string;
  accounts: {
    id: string;
    name: string;
    email: string;
    clerk_user_id: string;
  } | null;
  checklist: {
    total: number;
    completed: number;
    completionRate: number;
  };
  messageCount: number;
}

export default function AdminClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();

  useEffect(() => {
    const loadClient = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/admin/clients/${clientId}`);

        if (!response.ok) {
          if (response.status === 403) {
            router.push("/");
            return;
          }
          if (response.status === 404) {
            toast({
              title: "클라이언트를 찾을 수 없습니다",
              description: "요청하신 클라이언트가 존재하지 않습니다.",
              variant: "destructive",
            });
            router.push("/admin/clients");
            return;
          }
          throw new Error("Failed to load client");
        }

        const data = await response.json();
        setClient(data.client);
      } catch (error) {
        console.error("[AdminClientDetail] Error loading client:", error);
        toast({
          title: "데이터 로드 실패",
          description: "클라이언트 정보를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (userLoaded && user && clientId) {
      loadClient();
    }
  }, [userLoaded, user, clientId, router, toast]);

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
        <Header title="클라이언트 상세" userName={displayName} />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <p className="text-muted-foreground">클라이언트 정보를 불러오는 중...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="클라이언트 상세" userName={displayName} />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <p className="text-muted-foreground">클라이언트를 찾을 수 없습니다.</p>
            <Link href="/admin/clients">
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
      <Header title="클라이언트 상세" userName={displayName} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/admin/clients">
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
                <CardTitle>기본 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">이름</p>
                    <p className="text-lg font-semibold">{client.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">직업</p>
                    <Badge variant="secondary">{client.occupation}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      이메일
                    </p>
                    <p className="text-sm">{client.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      이주 예정일
                    </p>
                    <p className="text-sm">
                      {new Date(client.moving_date).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  {client.phone_kr && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        한국 전화번호
                      </p>
                      <p className="text-sm">{client.phone_kr}</p>
                    </div>
                  )}
                  {client.phone_us && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        미국 전화번호
                      </p>
                      <p className="text-sm">{client.phone_us}</p>
                    </div>
                  )}
                  {client.moving_type && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">이주 유형</p>
                      <p className="text-sm">{client.moving_type}</p>
                    </div>
                  )}
                  {client.relocation_type && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">정착 유형</p>
                      <p className="text-sm">{client.relocation_type}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 에이전트 정보 */}
            {client.accounts && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    담당 에이전트
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">{client.accounts.name || "이름 없음"}</p>
                    <p className="text-sm text-muted-foreground">{client.accounts.email}</p>
                    <Link href={`/admin/agents/${client.accounts.id}`}>
                      <Button variant="outline" size="sm" className="mt-2">
                        에이전트 상세 보기
                      </Button>
                    </Link>
                  </div>
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
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">체크리스트 진행률</p>
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-2xl font-bold">
                        {client.checklist.completionRate}%
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {client.checklist.completed}/{client.checklist.total}
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${client.checklist.completionRate}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    메시지 수
                  </p>
                  <p className="text-2xl font-bold mt-2">{client.messageCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>메타데이터</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">가입일</p>
                  <p>
                    {new Date(client.created_at).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">최종 수정일</p>
                  <p>
                    {new Date(client.updated_at).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}


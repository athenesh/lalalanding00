"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, Mail, Phone, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Client {
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
  owner_agent_id: string;
  accounts: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const { toast } = useToast();
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();

  // 클라이언트 목록 로드
  useEffect(() => {
    const loadClients = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (searchQuery) {
          params.append("search", searchQuery);
        }
        if (selectedAgentId) {
          params.append("agent_id", selectedAgentId);
        }

        const response = await fetch(`/api/admin/clients?${params.toString()}`);

        if (!response.ok) {
          if (response.status === 403) {
            router.push("/");
            return;
          }
          throw new Error("Failed to load clients");
        }

        const data = await response.json();
        setClients(data.clients || []);
      } catch (error) {
        console.error("[AdminClients] Error loading clients:", error);
        toast({
          title: "데이터 로드 실패",
          description: "클라이언트 목록을 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (userLoaded && user) {
      loadClients();
    }
  }, [userLoaded, user, searchQuery, selectedAgentId, router, toast]);

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
        <div className="mb-6">
          <h1 className="text-3xl font-bold">클라이언트 관리</h1>
        </div>

        {/* 검색 및 필터 */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="이름 또는 이메일로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              setSelectedAgentId("");
            }}
          >
            필터 초기화
          </Button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>전체 클라이언트</CardDescription>
              <CardTitle className="text-3xl">{clients.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 클라이언트 목록 */}
        {isLoading ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">클라이언트 목록을 불러오는 중...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16 border border-border rounded-lg">
            <p className="text-muted-foreground">
              {searchQuery || selectedAgentId
                ? "검색 결과가 없습니다."
                : "등록된 클라이언트가 없습니다."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
              <Card key={client.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                      <CardDescription className="mt-1">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {client.email}
                        </div>
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {client.occupation}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    {client.phone_kr && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>KR: {client.phone_kr}</span>
                      </div>
                    )}
                    {client.phone_us && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>US: {client.phone_us}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        이주 예정일: {new Date(client.moving_date).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                    {client.accounts && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>에이전트: {client.accounts.name || client.accounts.email}</span>
                      </div>
                    )}
                    <div className="text-muted-foreground text-xs">
                      가입일: {new Date(client.created_at).toLocaleDateString("ko-KR")}
                    </div>
                  </div>

                  <Link href={`/admin/clients/${client.id}`}>
                    <Button variant="outline" className="w-full" size="sm">
                      상세 보기
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}


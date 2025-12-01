"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Header from "@/components/layout/header";
import ClientCard from "@/components/agent/client-card";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  name: string;
  occupation: string;
  moving_date: string;
  checklist_completion_rate: number;
  checklist_total: number;
  checklist_completed: number;
}

interface UnassignedClient {
  id: string;
  name: string;
  email: string;
  occupation: string | null;
  moving_date: string | null;
  relocation_type: string | null;
  created_at: string;
  is_profile_complete: boolean;
}

export default function AgentDashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [unassignedClients, setUnassignedClients] = useState<UnassignedClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUnassigned, setIsLoadingUnassigned] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();

  // 클라이언트 목록 로드
  const loadClients = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("[AgentDashboard] Loading clients from API...");
      const response = await fetch("/api/clients");

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[AgentDashboard] API 호출 실패:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error,
          details: errorData.details,
          code: errorData.code,
          hint: errorData.hint,
          fullError: errorData,
        });

        if (response.status === 401 || response.status === 403) {
          console.error("[AgentDashboard] Unauthorized access");
          router.push("/sign-in");
          return;
        }

        if (
          response.status === 404 &&
          errorData.error === "Account not found"
        ) {
          toast({
            title: "계정 설정 필요",
            description:
              errorData.details ||
              "계정이 데이터베이스에 동기화되지 않았습니다. 잠시 후 다시 시도해주세요.",
            variant: "destructive",
          });
          return;
        }

        throw new Error(
          errorData.error || errorData.details || "Failed to load clients",
        );
      }

      const { clients: clientsData } = await response.json();
      console.log("[AgentDashboard] Clients loaded:", clientsData);
      setClients(clientsData || []);
    } catch (error) {
      console.error("[AgentDashboard] Error loading clients:", error);
      toast({
        title: "데이터 로드 실패",
        description: "클라이언트 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    if (userLoaded) {
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

      // 에이전트인 경우 클라이언트 목록 로드
      loadClients();
      loadUnassignedClients();
    }
  }, [user, userLoaded, router, toast, loadClients]);

  // 할당되지 않은 클라이언트 목록 로드
  const loadUnassignedClients = async () => {
    try {
      setIsLoadingUnassigned(true);
      console.log("[AgentDashboard] Loading unassigned clients from API...");
      const response = await fetch("/api/clients/unassigned");

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[AgentDashboard] Unassigned clients API 호출 실패:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error,
          details: errorData.details,
          code: errorData.code,
          hint: errorData.hint,
          fullError: errorData,
        });
        return;
      }

      const { clients: unassignedData } = await response.json();
      console.log("[AgentDashboard] Unassigned clients loaded:", unassignedData);
      setUnassignedClients(unassignedData || []);
    } catch (error) {
      console.error("[AgentDashboard] Error loading unassigned clients:", error);
    } finally {
      setIsLoadingUnassigned(false);
    }
  };

  // 클라이언트 할당 핸들러
  const handleAssignClient = async (clientId: string) => {
    try {
      console.log("[AgentDashboard] Assigning client:", clientId);
      const response = await fetch(`/api/clients/${clientId}/assign`, {
        method: "PATCH",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to assign client");
      }

      toast({
        title: "할당 완료",
        description: "클라이언트가 성공적으로 할당되었습니다.",
      });

      // 목록 새로고침
      loadClients();
      loadUnassignedClients();
    } catch (error) {
      console.error("[AgentDashboard] Error assigning client:", error);
      toast({
        title: "할당 실패",
        description:
          error instanceof Error
            ? error.message
            : "클라이언트 할당에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

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

  return (
    <div className="min-h-screen bg-background">
      <Header title="내 클라이언트 관리" userName={displayName} />

      <main className="container mx-auto px-4 py-8">
        {/* 내 클라이언트 섹션 */}
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">내 클라이언트</h2>
            <p className="text-muted-foreground mt-1">
              총 {clients.length}명의 클라이언트를 관리하고 있습니다
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">로딩 중...</p>
            </div>
          ) : (
            <>
              {clients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {clients.map((client) => (
                    <ClientCard
                      key={client.id}
                      id={client.id}
                      name={client.name}
                      occupation={client.occupation}
                      movingDate={client.moving_date}
                      checklistCompletion={client.checklist_completion_rate}
                      checklistTotal={client.checklist_total}
                      checklistCompleted={client.checklist_completed}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 border border-border rounded-lg">
                  <p className="text-muted-foreground">
                    아직 할당된 클라이언트가 없습니다.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    아래 &quot;할당 가능한 클라이언트&quot;에서 클라이언트를 할당하세요.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* 할당 가능한 클라이언트 섹션 */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold">할당 가능한 클라이언트</h2>
            <p className="text-muted-foreground mt-1">
              회원가입했지만 아직 할당되지 않은 클라이언트 목록입니다
            </p>
          </div>

          {isLoadingUnassigned ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">로딩 중...</p>
            </div>
          ) : (
            <>
              {unassignedClients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {unassignedClients.map((client) => (
                    <ClientCard
                      key={client.id}
                      id={client.id}
                      name={client.name}
                      occupation={client.occupation || "미입력"}
                      movingDate={client.moving_date || ""}
                      checklistCompletion={0}
                      checklistTotal={0}
                      checklistCompleted={0}
                      isUnassigned={true}
                      isProfileComplete={client.is_profile_complete}
                      onAssign={() => handleAssignClient(client.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 border border-border rounded-lg">
                  <p className="text-muted-foreground">
                    할당 가능한 클라이언트가 없습니다.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

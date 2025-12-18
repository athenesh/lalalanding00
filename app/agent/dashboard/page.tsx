"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Header from "@/components/layout/header";
import ClientCard from "@/components/agent/client-card";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Link as LinkIcon } from "lucide-react";

interface Client {
  id: string;
  name: string;
  occupation: string;
  moving_date: string;
  checklist_completion_rate: number;
  checklist_total: number;
  checklist_completed: number;
  is_profile_complete?: boolean; // 추가
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
  const [unassignedClients, setUnassignedClients] = useState<
    UnassignedClient[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUnassigned, setIsLoadingUnassigned] = useState(true);
  const [isInvitationDialogOpen, setIsInvitationDialogOpen] = useState(false);
  const [invitationEmail, setInvitationEmail] = useState("");
  const [isCreatingInvitation, setIsCreatingInvitation] = useState(false);
  const [generatedInvitationLink, setGeneratedInvitationLink] = useState("");
  const [generatedInvitationCode, setGeneratedInvitationCode] = useState("");
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [isCheckingApproval, setIsCheckingApproval] = useState(true);
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

  // 할당되지 않은 클라이언트 목록 로드
  const loadUnassignedClients = useCallback(async () => {
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

        // 에러 토스트 표시
        if (response.status === 401 || response.status === 403) {
          toast({
            title: "권한 없음",
            description: "할당되지 않은 클라이언트를 조회할 권한이 없습니다.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "데이터 로드 실패",
          description:
            errorData.details ||
            "할당되지 않은 클라이언트 목록을 불러오는데 실패했습니다.",
          variant: "destructive",
        });
        return;
      }

      const { clients: unassignedData } = await response.json();
      console.log(
        "[AgentDashboard] Unassigned clients loaded:",
        unassignedData,
      );
      setUnassignedClients(unassignedData || []);
    } catch (error) {
      console.error(
        "[AgentDashboard] Error loading unassigned clients:",
        error,
      );
      toast({
        title: "데이터 로드 실패",
        description:
          error instanceof Error
            ? error.message
            : "할당되지 않은 클라이언트 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUnassigned(false);
    }
  }, [toast]);

  // 승인 상태 확인
  useEffect(() => {
    const checkApprovalStatus = async () => {
      try {
        setIsCheckingApproval(true);
        const response = await fetch("/api/agent/status");
        if (response.ok) {
          const data = await response.json();
          setIsApproved(data.isApproved);

          // 승인되지 않은 경우 완료 페이지로 리다이렉트
          if (!data.isApproved) {
            console.log("[AgentDashboard] Agent not approved, redirecting to complete page");
            router.push("/sign-up/agent/complete");
            return;
          }
        } else {
          // 에러 발생 시 완료 페이지로 리다이렉트 (정보 미입력 가능성)
          console.log("[AgentDashboard] Failed to check approval status, redirecting to complete page");
          router.push("/sign-up/agent/complete");
          return;
        }
      } catch (error) {
        console.error("[AgentDashboard] Error checking approval status:", error);
        router.push("/sign-up/agent/complete");
      } finally {
        setIsCheckingApproval(false);
      }
    };

    if (userLoaded && user) {
      checkApprovalStatus();
    }
  }, [userLoaded, user, router]);

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

      // 승인된 에이전트만 클라이언트 목록 로드
      if (isApproved === true) {
        loadClients();
        loadUnassignedClients();
      }
    }
  }, [user, userLoaded, router, toast, loadClients, loadUnassignedClients, isApproved]);

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

  // 초대 링크 생성 핸들러
  const handleCreateInvitation = async () => {
    try {
      setIsCreatingInvitation(true);
      console.log("[AgentDashboard] Creating invitation:", {
        email: invitationEmail || null,
      });

      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: invitationEmail || undefined,
          expiresInDays: 30,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create invitation");
      }

      const { invitation } = await response.json();
      setGeneratedInvitationLink(invitation.link);
      setGeneratedInvitationCode(invitation.code || "");

      toast({
        title: "초대 링크 생성 완료",
        description: "초대 링크와 코드가 생성되었습니다. 클라이언트에게 공유하세요.",
      });
    } catch (error) {
      console.error("[AgentDashboard] Error creating invitation:", error);
      toast({
        title: "초대 링크 생성 실패",
        description:
          error instanceof Error
            ? error.message
            : "초대 링크 생성에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingInvitation(false);
    }
  };

  // 초대 링크 복사 핸들러
  const handleCopyInvitationLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedInvitationLink);
      toast({
        title: "복사 완료",
        description: "초대 링크가 클립보드에 복사되었습니다.",
      });
    } catch (error) {
      console.error("[AgentDashboard] Error copying link:", error);
      toast({
        title: "복사 실패",
        description: "링크 복사에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // 다이얼로그 닫기 핸들러
  const handleCloseDialog = () => {
    setIsInvitationDialogOpen(false);
    setInvitationEmail("");
    setGeneratedInvitationLink("");
  };

  // 승인 상태 확인 중
  if (isCheckingApproval || isApproved === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">승인 상태를 확인하는 중...</p>
        </div>
      </div>
    );
  }

  // 승인되지 않은 경우 (이미 리다이렉트되지만 안전장치)
  if (!isApproved) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="내 클라이언트 관리" userName={displayName} />

      <main className="container mx-auto px-4 py-8">
        {/* 초대 링크 생성 섹션 */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">클라이언트 초대</h2>
            <p className="text-muted-foreground mt-1">
              새로운 클라이언트를 초대하여 서비스를 이용하도록 할 수 있습니다
            </p>
          </div>
          <Dialog open={isInvitationDialogOpen} onOpenChange={setIsInvitationDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <LinkIcon className="mr-2 h-4 w-4" />
                초대 링크 생성
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>클라이언트 초대 링크 생성</DialogTitle>
                <DialogDescription>
                  초대 링크를 생성하여 클라이언트에게 공유하세요. 링크는 30일간
                  유효합니다.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {!generatedInvitationLink ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        이메일 (선택사항)
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="client@example.com"
                        value={invitationEmail}
                        onChange={(e) => setInvitationEmail(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        특정 이메일로 초대하는 경우 입력하세요. 비워두면 누구나
                        사용할 수 있는 링크가 생성됩니다.
                      </p>
                    </div>
                    <Button
                      onClick={handleCreateInvitation}
                      disabled={isCreatingInvitation}
                      className="w-full"
                    >
                      {isCreatingInvitation
                        ? "생성 중..."
                        : "초대 링크 생성"}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>생성된 초대 링크</Label>
                        <div className="flex gap-2">
                          <Input
                            value={generatedInvitationLink}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={handleCopyInvitationLink}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          링크를 복사하여 클라이언트에게 공유하세요.
                        </p>
                      </div>

                      {generatedInvitationCode && (
                        <div className="space-y-2">
                          <Label>초대 코드</Label>
                          <div className="flex gap-2">
                            <Input
                              value={generatedInvitationCode}
                              readOnly
                              className="font-mono text-sm text-center text-lg font-bold"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(generatedInvitationCode);
                                  toast({
                                    title: "복사 완료",
                                    description: "초대 코드가 클립보드에 복사되었습니다.",
                                  });
                                } catch (error) {
                                  console.error("[AgentDashboard] Error copying code:", error);
                                  toast({
                                    title: "복사 실패",
                                    description: "코드 복사에 실패했습니다.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            초대 코드를 클라이언트에게 공유하세요. 코드는 더 간편하게 사용할 수 있습니다.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleCloseDialog}
                        className="flex-1"
                      >
                        닫기
                      </Button>
                      <Button
                        onClick={() => {
                          setGeneratedInvitationLink("");
                          setInvitationEmail("");
                        }}
                        className="flex-1"
                      >
                        새 링크 생성
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

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
                      isProfileComplete={client.is_profile_complete} // 추가
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 border border-border rounded-lg">
                  <p className="text-muted-foreground">
                    아직 할당된 클라이언트가 없습니다.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    아래 &quot;할당 가능한 클라이언트&quot;에서 클라이언트를
                    할당하세요.
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

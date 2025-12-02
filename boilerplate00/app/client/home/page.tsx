"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import Header from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "lucide-react";
import ProfileTab from "@/components/client/profile-tab";
import HousingTab from "@/components/client/housing-tab";
import ChecklistTab from "@/components/client/checklist-tab";
import ChatTab from "@/components/client/chat-tab";
import { useToast } from "@/hooks/use-toast";

export default function ClientHomePage() {
  const { userId, isLoaded: authLoaded } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [clientData, setClientData] = useState({
    name: "",
    movingDate: "",
    checklistCompletion: 0,
  });
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 클라이언트 역할 체크 및 프로필 데이터 로드
  useEffect(() => {
    // 인증과 사용자 데이터가 모두 로드될 때까지 대기
    if (!authLoaded || !userLoaded) return;

    if (!userId) {
      console.log("[ClientHomePage] No userId, redirecting to sign-in");
      router.push("/sign-in");
      return;
    }

    // useUser를 통해 최신 publicMetadata 가져오기
    const role = (user?.publicMetadata as { role?: string })?.role;
    console.log("[ClientHomePage] Current role:", role);

    if (role !== "client") {
      console.log(
        `[ClientHomePage] Access denied: role is '${role}', expected 'client'. Redirecting to home.`,
      );
      router.push("/");
      return;
    }

    // 프로필 데이터 로드
    loadProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, user, authLoaded, userLoaded, router]);

  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      console.log("[ClientHomePage] 프로필 데이터 로드 시작");

      const response = await fetch("/api/client/profile");
      if (!response.ok) {
        if (response.status === 404) {
          console.log("[ClientHomePage] 프로필이 아직 생성되지 않음");
          setIsLoading(false);
          return;
        }
        throw new Error("Failed to load profile");
      }

      const data = await response.json();
      console.log("[ClientHomePage] 프로필 데이터 로드 성공:", data);

      const client = data.client;
      const familyMembers = data.familyMembers || [];
      const emergencyContacts = data.emergencyContacts || [];

      // 클라이언트 데이터 설정
      setClientData({
        name: client.name || "",
        movingDate: client.moving_date || "",
        checklistCompletion: 0, // TODO: 체크리스트 완료율 계산
      });

      // 프로필 데이터 변환
      const transformedFamilyMembers = familyMembers.map((member: any) => ({
        id: member.id,
        name: member.name,
        relationship: member.relationship,
        birthDate: member.birth_date ? new Date(member.birth_date) : undefined,
        phone: member.phone || "",
        email: member.email || "",
        notes: member.notes || "",
      }));

      const transformedEmergencyContacts = emergencyContacts.map((contact: any) => ({
        id: contact.id,
        name: contact.name,
        relationship: contact.relationship,
        phoneKr: contact.phone_kr || "",
        email: contact.email || "",
        kakaoId: contact.kakao_id || "",
      }));

      setProfileData({
        name: client.name || "",
        email: client.email || "",
        phone: client.phone_kr || client.phone_us || "",
        occupation: client.occupation || "",
        movingDate: client.moving_date ? new Date(client.moving_date) : undefined,
        relocationType: client.relocation_type || "",
        movingType: client.moving_type || "",
        birthDate: client.birth_date ? new Date(client.birth_date) : undefined,
        familyMembers: transformedFamilyMembers,
        emergencyContacts: transformedEmergencyContacts,
      });
    } catch (error) {
      console.error("[ClientHomePage] 프로필 데이터 로드 실패:", error);
      toast({
        title: "데이터 로드 실패",
        description: "프로필 정보를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async (data: any) => {
    try {
      setIsSaving(true);
      console.log("[ClientHomePage] 프로필 저장 시작:", data);

      const requestBody: any = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        occupation: data.occupation,
        moving_date: data.movingDate?.toISOString().split("T")[0],
        relocation_type: data.relocationType,
        moving_type: data.movingType,
        birth_date: data.birthDate?.toISOString().split("T")[0] || null,
      };

      // 가족 정보가 있으면 추가
      if (data.familyMembers && data.familyMembers.length > 0) {
        requestBody.family_members = data.familyMembers.map((member: any) => ({
          name: member.name,
          relationship: member.relationship,
          birthDate: member.birthDate,
          phone: member.phone,
          email: member.email,
          notes: member.notes,
        }));
      }

      // 비상연락망이 있으면 추가
      if (data.emergencyContacts && data.emergencyContacts.length > 0) {
        requestBody.emergency_contacts = data.emergencyContacts.map((contact: any) => ({
          name: contact.name,
          relationship: contact.relationship,
          phoneKr: contact.phoneKr,
          email: contact.email,
          kakaoId: contact.kakaoId,
        }));
      }

      const response = await fetch("/api/client/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[ClientHomePage] 프로필 저장 실패:", {
          status: response.status,
          error: errorData.error,
          details: errorData.details,
          code: errorData.code,
        });
        throw new Error(errorData.details || errorData.error || "Failed to update profile");
      }

      const { client } = await response.json();

      console.log("[ClientHomePage] 프로필 저장 성공:", client);

      // 로컬 상태 업데이트
      setClientData({
        name: client.name || "",
        movingDate: client.moving_date || "",
        checklistCompletion: clientData.checklistCompletion,
      });

      // 프로필 데이터 다시 로드
      await loadProfileData();

      toast({
        title: "저장 완료",
        description: "프로필 정보가 성공적으로 저장되었습니다.",
      });
    } catch (error) {
      console.error("[ClientHomePage] 프로필 저장 오류:", error);
      toast({
        title: "저장 실패",
        description: error instanceof Error ? error.message : "프로필 저장에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const daysUntilMoving = clientData.movingDate
    ? Math.ceil(
        (new Date(clientData.movingDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header title="내 이주 준비" userName={clientData.name} />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <Calendar className="h-12 w-12 mx-auto text-primary" />
                  <div className="text-4xl font-bold text-primary">
                    D-{daysUntilMoving}
                  </div>
                  <p className="text-muted-foreground">이주까지</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(clientData.movingDate).toLocaleDateString(
                      "ko-KR",
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-success">
                      {clientData.checklistCompletion}%
                    </div>
                    <p className="text-muted-foreground mt-2">준비 진행도</p>
                  </div>
                  <Progress
                    value={clientData.checklistCompletion}
                    className="h-3"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">내 프로필</TabsTrigger>
              <TabsTrigger value="housing">주거옵션</TabsTrigger>
              <TabsTrigger value="checklist">체크리스트</TabsTrigger>
              <TabsTrigger value="chat">채팅</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="profile" className="space-y-6">
                {isLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">프로필 정보를 불러오는 중...</p>
                  </div>
                ) : (
                  <ProfileTab
                    initialData={profileData}
                    onSave={handleSaveProfile}
                    isSaving={isSaving}
                  />
                )}
              </TabsContent>

              <TabsContent value="housing" className="space-y-6">
                <div className="bg-card rounded-lg border border-border p-6">
                  <h2 className="text-xl font-semibold mb-6">주거 옵션</h2>
                  <HousingTab
                    initialData={{
                      preferredArea: "로스앤젤레스, CA",
                      maxBudget: "3000",
                      housingType: "apartment",
                      bedrooms: "2",
                      bathrooms: "2",
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="checklist" className="space-y-6">
                <ChecklistTab />
              </TabsContent>

              <TabsContent value="chat" className="space-y-6">
                <ChatTab userType="client" />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

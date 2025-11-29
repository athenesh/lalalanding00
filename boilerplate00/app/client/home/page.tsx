"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Header from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "lucide-react";
import ProfileTab from "@/components/client/profile-tab";
import HousingTab from "@/components/client/housing-tab";
import ChecklistTab from "@/components/client/checklist-tab";
import ChatTab from "@/components/client/chat-tab";

export default function ClientHomePage() {
  const { userId, sessionClaims, isLoaded } = useAuth();
  const router = useRouter();

  // 클라이언트 역할 체크
  useEffect(() => {
    if (!isLoaded) return;

    if (!userId) {
      console.log("[ClientHomePage] No userId, redirecting to sign-in");
      router.push("/sign-in");
      return;
    }

    const role = (sessionClaims?.publicMetadata as { role?: string })?.role;
    console.log("[ClientHomePage] Current role:", role);

    if (role !== "client") {
      console.log(
        `[ClientHomePage] Access denied: role is '${role}', expected 'client'. Redirecting to home.`,
      );
      router.push("/");
      return;
    }
  }, [userId, sessionClaims, isLoaded, router]);
  const [clientData] = useState({
    name: "홍길동",
    movingDate: "2025-06-01",
    checklistCompletion: 65,
  });

  const daysUntilMoving = Math.ceil(
    (new Date(clientData.movingDate).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24),
  );

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
                <div className="bg-card rounded-lg border border-border p-6">
                  <h2 className="text-xl font-semibold mb-6">기본 정보</h2>
                  <ProfileTab
                    initialData={{
                      name: clientData.name,
                      email: "hong@example.com",
                      phone: "010-1234-5678",
                      occupation: "doctor",
                      movingDate: new Date(clientData.movingDate),
                    }}
                  />
                </div>
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

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar } from "lucide-react";
import ProfileTab from "@/components/client/ProfileTab";
import HousingTab from "@/components/client/HousingTab";
import ChecklistTab from "@/components/client/ChecklistTab";
import ChatTab from "@/components/client/ChatTab";

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock data - will be replaced with real data
  const [clientData] = useState({
    name: "홍길동",
    occupation: "doctor",
    movingDate: "2025-06-01",
  });

  const daysUntilMoving = Math.ceil(
    (new Date(clientData.movingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="클라이언트 상세" 
        userName="에이전트"
        onLogout={() => navigate('/')}
      />

      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/agent/dashboard')}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          목록으로 돌아가기
        </Button>

        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{clientData.name}</h1>
              <p className="text-muted-foreground mt-2">
                {new Date(clientData.movingDate).toLocaleDateString('ko-KR')} 이주 예정
              </p>
            </div>
            <Badge variant="secondary" className="gap-2 text-lg px-4 py-2">
              <Calendar className="h-5 w-5" />
              D-{daysUntilMoving}
            </Badge>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">프로필</TabsTrigger>
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
                      occupation: clientData.occupation,
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
                <ChatTab userType="agent" />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default ClientDetail;

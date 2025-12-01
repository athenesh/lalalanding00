"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar } from "lucide-react";
import ProfileTab from "@/components/client/profile-tab";
import HousingTab from "@/components/client/housing-tab";
import ChecklistTab from "@/components/client/checklist-tab";
import ChatTab from "@/components/client/chat-tab";

// 타입 정의 (나중에 API로 교체 시 사용)
interface ClientProfileData {
  name: string;
  email: string;
  phone: string;
  occupation: string;
  movingDate: string; // YYYY-MM-DD 형식
}

interface HousingData {
  preferredArea: string;
  maxBudget: string;
  housingType: string;
  bedrooms: string;
  bathrooms: string;
}

interface ChecklistItem {
  id: string;
  title: string;
  description: string[];
  completed: boolean;
}

interface ChecklistCategory {
  id: string;
  title: string;
  emoji: string;
  items: ChecklistItem[];
}

// 초기 체크리스트 데이터 (Mock)
const initialChecklist: ChecklistCategory[] = [
  {
    id: "pre-departure",
    title: "출국 전 준비 (7일 전)",
    emoji: "✈️",
    items: [
      {
        id: "intl-license",
        title: "국제운전면허증 발급",
        description: [
          "📝 한국에서 국제운전면허증 발급",
          "⚠️ 거주자 판단 기준 확인 (인정 기간: 10일)",
          "📌 본국 운전면허증과 함께 지참 필수",
        ],
        completed: false,
      },
      {
        id: "visa-check",
        title: "비자 확인",
        description: ["📝 비자 유효기간 확인", "📌 입국 관련 서류 준비"],
        completed: false,
      },
      {
        id: "flight",
        title: "항공권 예약",
        description: ["📝 입국 일정 확정", "📌 항공권 예약 및 확인"],
        completed: false,
      },
      {
        id: "packing",
        title: "짐 정리",
        description: ["📝 필수 물품 준비", "📌 이주 짐 정리"],
        completed: false,
      },
    ],
  },
  {
    id: "arrival",
    title: "입국 직후 (1주차)",
    emoji: "🏠",
    items: [
      {
        id: "rent",
        title: "집 렌트 (최우선 🔴)",
        description: [
          "📝 아파트(1~2 bedroom), 타운하우스(3~4 bedroom), 하우스(3~4 bedroom)",
          "💡 Redfin, Zillow로 사전 시세 확인",
          "📋 필요 서류: SSN, 급여명세서, 은행 잔고증명",
          "💰 보증금(Deposit) + 첫 달 렌트 선납",
          "⏰ Background 체크: 2~3주 소요",
        ],
        completed: false,
      },
      {
        id: "ssn",
        title: "SSN 발급 신청 (최대한 빨리 🔴)",
        description: [
          "📍 신청 장소: Social Security Office",
          "📋 필요 서류: 여권, 비자, I-94, SS-5 양식",
          "⏰ 기간: 2~3주 소요 (우편 배달)",
        ],
        completed: false,
      },
      {
        id: "bank",
        title: "은행 계좌 개설",
        description: [
          "🏦 즉시 가능: 신한은행(미국 지사)",
          "🏦 주요 은행: Chase, Bank of America, Wells Fargo",
          "📋 필요 서류: 여권, SSN, 거주지 증명",
          "💳 계좌 종류: Saving + Checking 2개",
          "💰 최소 잔고: $2,000 (Chase 기준)",
        ],
        completed: false,
      },
      {
        id: "utilities",
        title: "유틸리티 신청",
        description: [
          "📝 입주 날짜 확정 후 신청",
          "⚡ 전기: SoCal Edison",
          "🔥 가스: SoCal Gas",
          "📡 인터넷: Spectrum/AT&T/Verizon",
          "🗑️ 쓰레기 수거: EDCO",
          "💡 청구서는 거주증명으로 활용",
        ],
        completed: false,
      },
    ],
  },
  {
    id: "settlement",
    title: "정착 단계 (1개월차)",
    emoji: "🚗",
    items: [
      {
        id: "drivers-license",
        title: "운전면허 취득",
        description: [
          "💻 DMV 온라인 계정 생성",
          "📝 필기 시험: 한국어 선택 가능 (유튜브 공부)",
          "📋 필요 서류: 여권, SSN, 거주지 증명 2개 이상, I-94",
          "🎫 Learner's Permit (임시 면허) 발급",
          "🚗 실기 시험: DMV 예약, 자차 응시",
        ],
        completed: false,
      },
      {
        id: "car",
        title: "차량 구매/리스",
        description: [
          "🚘 신차/중고차(Carmax)",
          "📅 리스 기간: 3년",
          "📋 필요 서류: 여권, 비자, 운전면허증, I-94, Job Offer",
        ],
        completed: false,
      },
      {
        id: "car-insurance",
        title: "자동차 보험",
        description: [
          "🏢 보험사: Allstate, State Farm, Farmers, Progressive, GEICO",
          "💰 초기 보험료: 월 $350",
        ],
        completed: false,
      },
      {
        id: "school",
        title: "자녀 학교 등록 (해당 시)",
        description: ["🏫 거주지 학군 확인", "📋 등록 서류 준비 및 제출"],
        completed: false,
      },
      {
        id: "health-insurance",
        title: "의료보험 가입",
        description: ["🏥 회사 제공 보험 확인", "📋 개인 보험 가입 (필요 시)"],
        completed: false,
      },
    ],
  },
];

export default function AgentClientDetailPage() {
  // const params = useParams(); // TODO: 실제 데이터 연동 시 사용
  const router = useRouter();

  // Mock data - 로컬 상태로 관리 (나중에 API로 교체)
  const [clientProfile, setClientProfile] = useState<ClientProfileData>({
    name: "홍길동",
    email: "hong@example.com",
    phone: "010-1234-5678",
    occupation: "doctor",
    movingDate: "2025-06-01",
  });

  const [housingData, setHousingData] = useState<HousingData>({
    preferredArea: "로스앤젤레스, CA",
    maxBudget: "3000",
    housingType: "apartment",
    bedrooms: "2",
    bathrooms: "2",
  });

  const [checklistData, setChecklistData] =
    useState<ChecklistCategory[]>(initialChecklist);

  // 프로필 저장 핸들러 (Mock - 나중에 API로 교체)
  const handleSaveProfile = (data: {
    name: string;
    email: string;
    phone: string;
    occupation: string;
    movingDate: Date | undefined;
  }) => {
    // 로컬 상태 업데이트
    setClientProfile({
      name: data.name,
      email: data.email,
      phone: data.phone,
      occupation: data.occupation,
      movingDate: data.movingDate
        ? data.movingDate.toISOString().split("T")[0]
        : clientProfile.movingDate,
    });

    // TODO: 나중에 실제 API 호출로 교체
    // const response = await fetch(`/api/clients/${params.id}`, {
    //   method: "PATCH",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     name: data.name,
    //     email: data.email,
    //     phone: data.phone,
    //     occupation: data.occupation,
    //     moving_date: data.movingDate?.toISOString().split("T")[0],
    //   }),
    // });
  };

  // 주거 옵션 저장 핸들러 (Mock - 나중에 API로 교체)
  const handleSaveHousing = (data: HousingData) => {
    // 로컬 상태 업데이트
    setHousingData(data);

    // TODO: 나중에 실제 API 호출로 교체
    // const response = await fetch(`/api/housing/${params.id}`, {
    //   method: "PATCH",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(data),
    // });
  };

  // 체크리스트 저장 핸들러 (Mock - 나중에 API로 교체)
  const handleSaveChecklist = (data: ChecklistCategory[]) => {
    // 로컬 상태 업데이트
    setChecklistData(data);

    // TODO: 나중에 실제 API 호출로 교체
    // const response = await fetch(`/api/checklist/${params.id}`, {
    //   method: "PATCH",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     items: data.flatMap(cat => cat.items.map(item => ({
    //       id: item.id,
    //       completed: item.completed
    //     })))
    //   }),
    // });
  };

  const daysUntilMoving = useMemo(
    () =>
      Math.ceil(
        (new Date(clientProfile.movingDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    [clientProfile.movingDate],
  );

  return (
    <div className="min-h-screen bg-background">
      <Header title="클라이언트 상세" userName="에이전트" />

      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/agent/dashboard")}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          목록으로 돌아가기
        </Button>

        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{clientProfile.name}</h1>
              <p className="text-muted-foreground mt-2">
                {new Date(clientProfile.movingDate).toLocaleDateString("ko-KR")}{" "}
                이주 예정
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
                      name: clientProfile.name,
                      email: clientProfile.email,
                      phone: clientProfile.phone,
                      occupation: clientProfile.occupation,
                      movingDate: new Date(clientProfile.movingDate),
                    }}
                    onSave={handleSaveProfile}
                  />
                </div>
              </TabsContent>

              <TabsContent value="housing" className="space-y-6">
                <div className="bg-card rounded-lg border border-border p-6">
                  <h2 className="text-xl font-semibold mb-6">주거 옵션</h2>
                  <HousingTab
                    initialData={housingData}
                    onSave={handleSaveHousing}
                  />
                </div>
              </TabsContent>

              <TabsContent value="checklist" className="space-y-6">
                <ChecklistTab
                  initialData={checklistData}
                  onSave={handleSaveChecklist}
                />
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
}

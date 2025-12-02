"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar } from "lucide-react";
import ProfileTab from "@/components/client/profile-tab";
import HousingTab from "@/components/client/housing-tab";
import ChecklistTab from "@/components/client/checklist-tab";
import ChatTab from "@/components/client/chat-tab";
import { useToast } from "@/hooks/use-toast";

// 타입 정의 (나중에 API로 교체 시 사용)
interface ClientProfileData {
  name: string;
  email: string;
  phone: string;
  occupation: string;
  movingDate: string; // YYYY-MM-DD 형식
  relocationType: string;
  movingType?: string;
  birthDate: string | null; // YYYY-MM-DD 형식 또는 null
  familyMembers?: any[];
  emergencyContacts?: any[];
}

interface HousingData {
  preferredArea: string;
  maxBudget: string;
  housingType: string;
  bedrooms: string;
  bathrooms: string;
  furnished: boolean;
  hasWasherDryer: boolean;
  parking: boolean;
  hasPets: boolean;
  petDetails: string;
  schoolDistrict: boolean;
  workplaceAddress: string;
  additionalNotes: string;
}

interface ChecklistItem {
  id: string;
  title: string;
  description: string[];
  completed: boolean;
  notes?: string;
  referenceUrl?: string;
  completedAt?: Date;
  isRequired?: boolean;
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
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const clientId = params.id as string;

  // 로딩 상태
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 클라이언트 프로필 데이터 (API에서 로드)
  const [clientProfile, setClientProfile] = useState<ClientProfileData | null>(
    null,
  );

  const [housingData, setHousingData] = useState<HousingData | null>(null);
  const [isLoadingHousing, setIsLoadingHousing] = useState(true);

  const [checklistData, setChecklistData] =
    useState<ChecklistCategory[]>(initialChecklist);
  const [isLoadingChecklist, setIsLoadingChecklist] = useState(true);

  // 클라이언트 데이터 로드
  useEffect(() => {
    const loadClientData = async () => {
      try {
        setIsLoading(true);

        // 클라이언트 데이터 로드 시작 로그
        console.log("[ClientDetail] 클라이언트 데이터 로드 시작:", {
          clientId,
        });

        const response = await fetch(`/api/clients/${clientId}`);

        if (!response.ok) {
          if (response.status === 404) {
            console.warn("[ClientDetail] 클라이언트를 찾을 수 없음:", {
              clientId,
            });
            toast({
              title: "클라이언트를 찾을 수 없습니다",
              description: "클라이언트 목록으로 돌아갑니다.",
              variant: "destructive",
            });
            router.push("/agent/dashboard");
            return;
          }
          throw new Error("Failed to load client data");
        }

        const { client, familyMembers, emergencyContacts } = await response.json();

        // 클라이언트 데이터 로드 성공 로그
        console.log("[ClientDetail] 클라이언트 데이터 로드 성공:", {
          clientId,
          clientName: client.name,
          familyMembersCount: familyMembers?.length || 0,
          emergencyContactsCount: emergencyContacts?.length || 0,
        });

        // 프로필 데이터 변환
        const transformedFamilyMembers = (familyMembers || []).map((member: any) => ({
          id: member.id,
          name: member.name,
          relationship: member.relationship,
          birthDate: member.birth_date ? new Date(member.birth_date) : undefined,
          phone: member.phone || "",
          email: member.email || "",
          notes: member.notes || "",
        }));

        const transformedEmergencyContacts = (emergencyContacts || []).map((contact: any) => ({
          id: contact.id,
          name: contact.name,
          relationship: contact.relationship,
          phoneKr: contact.phone_kr || "",
          email: contact.email || "",
          kakaoId: contact.kakao_id || "",
        }));

        setClientProfile({
          name: client.name,
          email: client.email,
          phone: client.phone_kr || client.phone_us || "",
          occupation: client.occupation,
          movingDate: client.moving_date,
          relocationType: client.relocation_type || "",
          movingType: client.moving_type || "",
          birthDate: client.birth_date || null,
          familyMembers: transformedFamilyMembers,
          emergencyContacts: transformedEmergencyContacts,
        });
      } catch (error) {
        console.error("[ClientDetail] 클라이언트 데이터 로드 실패:", error);
        toast({
          title: "데이터 로드 실패",
          description: "클라이언트 정보를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
        router.push("/agent/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    if (clientId) {
      loadClientData();
    }
  }, [clientId, router, toast]);

  // 주거 요구사항 데이터 로드
  useEffect(() => {
    const loadHousingData = async () => {
      if (!clientId) return;

      try {
        setIsLoadingHousing(true);
        console.log("[ClientDetail] 주거 요구사항 데이터 로드 시작:", {
          clientId,
        });

        const response = await fetch(`/api/housing/${clientId}`);

        if (!response.ok) {
          if (response.status === 404) {
            // 주거 요구사항이 없으면 기본값 사용
            console.log("[ClientDetail] 주거 요구사항 없음, 기본값 사용");
            setHousingData({
              preferredArea: "",
              maxBudget: "",
              housingType: "apartment",
              bedrooms: "2",
              bathrooms: "2",
              furnished: false,
              hasWasherDryer: false,
              parking: false,
              hasPets: false,
              petDetails: "",
              schoolDistrict: false,
              workplaceAddress: "",
              additionalNotes: "",
            });
            return;
          }
          throw new Error("Failed to load housing data");
        }

        const { housing } = await response.json();

        if (housing) {
          // DB 필드명 → UI 필드명 변환
          setHousingData({
            preferredArea: housing.preferred_city || "",
            maxBudget: housing.budget_max?.toString() || "",
            housingType: housing.housing_type || "apartment",
            bedrooms: housing.bedrooms?.toString() || "2",
            bathrooms: housing.bathrooms?.toString() || "2",
            furnished: housing.furnished ?? false,
            hasWasherDryer: housing.has_washer_dryer ?? false,
            parking: housing.parking ?? false,
            hasPets: housing.has_pets ?? false,
            petDetails: housing.pet_details || "",
            schoolDistrict: housing.school_district ?? false,
            workplaceAddress: housing.workplace_address || "",
            additionalNotes: housing.additional_notes || "",
          });
        } else {
          // 주거 요구사항이 없으면 기본값 사용
          setHousingData({
            preferredArea: "",
            maxBudget: "",
            housingType: "apartment",
            bedrooms: "2",
            bathrooms: "2",
            furnished: false,
            hasWasherDryer: false,
            parking: false,
            hasPets: false,
            petDetails: "",
            schoolDistrict: false,
            workplaceAddress: "",
            additionalNotes: "",
          });
        }

        console.log("[ClientDetail] 주거 요구사항 데이터 로드 성공:", {
          clientId,
        });
      } catch (error) {
        console.error("[ClientDetail] 주거 요구사항 데이터 로드 실패:", error);
        // 에러가 발생해도 기본값으로 설정
        setHousingData({
          preferredArea: "",
          maxBudget: "",
          housingType: "apartment",
          bedrooms: "2",
          bathrooms: "2",
          furnished: false,
          hasWasherDryer: false,
          parking: false,
          hasPets: false,
          petDetails: "",
          schoolDistrict: false,
          workplaceAddress: "",
          additionalNotes: "",
        });
      } finally {
        setIsLoadingHousing(false);
      }
    };

    if (clientId) {
      loadHousingData();
    }
  }, [clientId]);

  // 체크리스트 데이터 로드
  useEffect(() => {
    const loadChecklistData = async () => {
      if (!clientId) return;

      try {
        setIsLoadingChecklist(true);
        console.log("[ClientDetail] 체크리스트 데이터 로드 시작:", {
          clientId,
        });

        const response = await fetch(`/api/checklist/${clientId}`);

        if (!response.ok) {
          throw new Error("Failed to load checklist data");
        }

        const { checklist } = await response.json();

        // DB 데이터를 UI 형식으로 변환
        if (checklist && checklist.length > 0) {
          // category별로 그룹화
          const groupedByCategory: Record<string, any[]> = {};
          checklist.forEach((item: any) => {
            if (!groupedByCategory[item.category]) {
              groupedByCategory[item.category] = [];
            }
            groupedByCategory[item.category].push(item);
          });

          // 하드코딩된 템플릿과 병합
          const mergedChecklist = initialChecklist.map((category) => {
            const dbItems = groupedByCategory[category.id] || [];

            return {
              ...category,
              items: category.items.map((templateItem) => {
                // 제목으로 매칭 (더 정확한 매칭을 위해 id도 확인)
                const dbItem = dbItems.find(
                  (item: any) =>
                    item.title === templateItem.title ||
                    item.id === templateItem.id,
                );

                if (dbItem) {
                  return {
                    ...templateItem,
                    id: dbItem.id, // DB id 사용
                    completed: dbItem.is_completed || false,
                    notes: dbItem.notes || undefined,
                    referenceUrl: dbItem.reference_url || undefined,
                    completedAt: dbItem.completed_at
                      ? new Date(dbItem.completed_at)
                      : undefined,
                    isRequired: dbItem.is_required || false,
                  };
                }
                return templateItem;
              }),
            };
          });

          setChecklistData(mergedChecklist);
        } else {
          // 체크리스트가 없으면 템플릿만 사용
          setChecklistData(initialChecklist);
        }

        console.log("[ClientDetail] 체크리스트 데이터 로드 성공:", {
          clientId,
          itemCount: checklist?.length || 0,
        });
      } catch (error) {
        console.error("[ClientDetail] 체크리스트 데이터 로드 실패:", error);
        // 에러가 발생해도 템플릿만 사용
        setChecklistData(initialChecklist);
      } finally {
        setIsLoadingChecklist(false);
      }
    };

    if (clientId) {
      loadChecklistData();
    }
  }, [clientId]);

  // 프로필 저장 핸들러 (API 호출)
  const handleSaveProfile = async (data: any) => {
    try {
      setIsSaving(true);

      const requestBody = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        occupation: data.occupation,
        moving_date: data.movingDate?.toISOString().split("T")[0],
        relocation_type: data.relocationType,
        moving_type: data.movingType,
        birth_date: data.birthDate?.toISOString().split("T")[0] || null,
        family_members: data.familyMembers?.map((member: any) => ({
          name: member.name,
          relationship: member.relationship,
          birthDate: member.birthDate,
          phone: member.phone,
          email: member.email,
          notes: member.notes,
        })) || [],
        emergency_contacts: data.emergencyContacts?.map((contact: any) => ({
          name: contact.name,
          relationship: contact.relationship,
          phoneKr: contact.phoneKr,
          email: contact.email,
          kakaoId: contact.kakaoId,
        })) || [],
      };

      // API 호출 시작 로그
      console.log("[ClientDetail] 프로필 업데이트 API 호출 시작:", {
        clientId,
        data: requestBody,
      });

      const response = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[ClientDetail] 프로필 업데이트 실패:", {
          status: response.status,
          error: errorData.error,
        });
        throw new Error(errorData.error || "Failed to update client");
      }

      const { client } = await response.json();

      // API 호출 성공 로그
      console.log("[ClientDetail] 프로필 업데이트 성공:", {
        clientId,
        updatedClient: client,
      });

      // 로컬 상태 업데이트
      setClientProfile({
        name: client.name,
        email: client.email,
        phone: client.phone || "",
        occupation: client.occupation,
        movingDate: client.moving_date,
        relocationType: client.relocation_type || "",
        birthDate: client.birth_date || null,
      });

      // 프로필 데이터 다시 로드
      // loadClientData는 useEffect에서 자동으로 호출되므로 여기서는 호출하지 않음

      toast({
        title: "저장 완료",
        description: "프로필 정보가 성공적으로 저장되었습니다.",
      });
    } catch (error) {
      console.error("[ClientDetail] 프로필 저장 중 에러 발생:", error);
      toast({
        title: "저장 실패",
        description:
          error instanceof Error
            ? error.message
            : "프로필 정보 저장에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 주거 옵션 저장 핸들러 (API 호출)
  const handleSaveHousing = async (data: HousingData) => {
    try {
      setIsSaving(true);

      console.log("[ClientDetail] 주거 요구사항 업데이트 API 호출 시작:", {
        clientId,
        data,
      });

      const response = await fetch(`/api/housing/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[ClientDetail] 주거 요구사항 업데이트 실패:", {
          status: response.status,
          error: errorData.error,
        });
        throw new Error(
          errorData.error || "Failed to update housing requirements",
        );
      }

      const { housing } = await response.json();

      // 로컬 상태 업데이트 (DB 필드명 → UI 필드명 변환)
      setHousingData({
        preferredArea: housing.preferred_city || "",
        maxBudget: housing.budget_max?.toString() || "",
        housingType: housing.housing_type || "apartment",
        bedrooms: housing.bedrooms?.toString() || "2",
        bathrooms: housing.bathrooms?.toString() || "2",
        furnished: housing.furnished ?? false,
        hasWasherDryer: housing.has_washer_dryer ?? false,
        parking: housing.parking ?? false,
        hasPets: housing.has_pets ?? false,
        petDetails: housing.pet_details || "",
        schoolDistrict: housing.school_district ?? false,
        workplaceAddress: housing.workplace_address || "",
        additionalNotes: housing.additional_notes || "",
      });

      console.log("[ClientDetail] 주거 요구사항 업데이트 성공:", {
        clientId,
        housingId: housing.id,
      });

      toast({
        title: "저장 완료",
        description: "주거 옵션이 성공적으로 저장되었습니다.",
      });
    } catch (error) {
      console.error("[ClientDetail] 주거 요구사항 저장 중 에러 발생:", error);
      toast({
        title: "저장 실패",
        description:
          error instanceof Error
            ? error.message
            : "주거 옵션 저장에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 체크리스트 저장 핸들러 (API 호출)
  const handleSaveChecklist = async (data: ChecklistCategory[]) => {
    try {
      setIsSaving(true);

      // 모든 항목을 평탄화하여 업데이트할 항목 목록 생성
      const itemsToUpdate = data.flatMap((category) =>
        category.items
          .filter((item) => item.id) // DB에 저장된 항목만 (id가 있는 것만)
          .map((item) => ({
            id: item.id,
            completed: item.completed || false,
            notes: item.notes || null,
            referenceUrl: item.referenceUrl || null,
            completedAt: item.completed ? item.completedAt || new Date() : null,
          })),
      );

      console.log("[ClientDetail] 체크리스트 업데이트 API 호출 시작:", {
        clientId,
        itemCount: itemsToUpdate.length,
      });

      const response = await fetch(`/api/checklist/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsToUpdate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[ClientDetail] 체크리스트 업데이트 실패:", {
          status: response.status,
          error: errorData.error,
        });
        throw new Error(errorData.error || "Failed to update checklist");
      }

      const { updated } = (await response.json()) as {
        updated: Array<{
          id: string;
          is_completed: boolean | null;
          notes: string | null;
          reference_url: string | null;
          completed_at: string | null;
        }>;
      };

      // 로컬 상태 업데이트 (업데이트된 항목 반영)
      const updatedItemsMap = new Map(updated.map((item) => [item.id, item]));

      setChecklistData((prev) =>
        prev.map((category) => ({
          ...category,
          items: category.items.map((item) => {
            const updatedItem = updatedItemsMap.get(item.id);
            if (updatedItem) {
              return {
                ...item,
                completed: updatedItem.is_completed || false,
                notes: updatedItem.notes || undefined,
                referenceUrl: updatedItem.reference_url || undefined,
                completedAt: updatedItem.completed_at
                  ? new Date(updatedItem.completed_at)
                  : undefined,
              };
            }
            return item;
          }),
        })),
      );

      console.log("[ClientDetail] 체크리스트 업데이트 성공:", {
        clientId,
        updatedCount: updated.length,
      });

      toast({
        title: "저장 완료",
        description: "체크리스트가 성공적으로 저장되었습니다.",
      });
    } catch (error) {
      console.error("[ClientDetail] 체크리스트 저장 중 에러 발생:", error);
      toast({
        title: "저장 실패",
        description:
          error instanceof Error
            ? error.message
            : "체크리스트 저장에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const daysUntilMoving = useMemo(() => {
    if (!clientProfile?.movingDate) return 0;
    return Math.ceil(
      (new Date(clientProfile.movingDate).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24),
    );
  }, [clientProfile?.movingDate]);

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="클라이언트 상세" userName="에이전트" />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        </main>
      </div>
    );
  }

  // 클라이언트 데이터가 없을 때
  if (!clientProfile) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="클라이언트 상세" userName="에이전트" />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-muted-foreground">
              클라이언트 정보를 불러올 수 없습니다.
            </p>
          </div>
        </main>
      </div>
    );
  }

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
                      relocationType: clientProfile.relocationType,
                      movingType: clientProfile.movingType || "",
                      birthDate: clientProfile.birthDate
                        ? new Date(clientProfile.birthDate)
                        : undefined,
                      familyMembers: clientProfile.familyMembers || [],
                      emergencyContacts: clientProfile.emergencyContacts || [],
                    }}
                    onSave={handleSaveProfile}
                    isSaving={isSaving}
                  />
                </div>
              </TabsContent>

              <TabsContent value="housing" className="space-y-6">
                <div className="bg-card rounded-lg border border-border p-6">
                  <h2 className="text-xl font-semibold mb-6">주거 옵션</h2>
                  {isLoadingHousing ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-muted-foreground">로딩 중...</p>
                    </div>
                  ) : housingData ? (
                    <HousingTab
                      initialData={housingData}
                      onSave={handleSaveHousing}
                    />
                  ) : null}
                </div>
              </TabsContent>

              <TabsContent value="checklist" className="space-y-6">
                {isLoadingChecklist ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">로딩 중...</p>
                  </div>
                ) : (
                  <ChecklistTab
                    initialData={checklistData}
                    onSave={handleSaveChecklist}
                  />
                )}
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

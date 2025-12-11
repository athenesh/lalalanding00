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
import { TimelinePhase } from "@/types/checklist";

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
  const [housingData, setHousingData] = useState<any>(null);
  const [checklistData, setChecklistData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHousing, setIsLoadingHousing] = useState(false);
  const [isLoadingChecklist, setIsLoadingChecklist] = useState(false);
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

    // 클라이언트이거나 권한 부여된 사용자인지 확인
    if (role === "client") {
      // 클라이언트인 경우 바로 데이터 로드
      loadProfileData();
      loadHousingData();
      loadChecklistData();
    } else {
      // role이 없거나 다른 경우 권한 부여 상태 확인
      checkAuthorizationAndLoad();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, user, authLoaded, userLoaded, router]);

  // 권한 부여 상태 확인 및 데이터 로드
  const checkAuthorizationAndLoad = async () => {
    try {
      console.log("[ClientHomePage] 권한 부여 상태 확인 시작");
      const response = await fetch("/api/client/authorize/status");

      if (response.ok) {
        const data = await response.json();
        if (data.hasAuthorization) {
          console.log(
            "[ClientHomePage] 권한 부여된 사용자 확인, 데이터 로드 시작",
          );
          // 권한 부여된 사용자인 경우 데이터 로드
          loadProfileData();
          loadHousingData();
          loadChecklistData();
        } else {
          console.log(
            "[ClientHomePage] 권한 부여 상태 없음, 홈으로 리다이렉트",
          );
          router.push("/");
        }
      } else if (response.status === 404) {
        // 권한이 없음
        console.log(
          "[ClientHomePage] 권한 부여 상태 없음 (404), 홈으로 리다이렉트",
        );
        router.push("/");
      } else {
        console.error("[ClientHomePage] 권한 상태 확인 실패:", response.status);
        router.push("/");
      }
    } catch (error) {
      console.error("[ClientHomePage] 권한 상태 확인 중 오류:", error);
      router.push("/");
    }
  };

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
      // 체크리스트 완료율은 loadChecklistData에서 계산
      setClientData({
        name: client.name || "",
        movingDate: client.moving_date || "",
        checklistCompletion: clientData.checklistCompletion, // 기존 값 유지
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

      const transformedEmergencyContacts = emergencyContacts.map(
        (contact: any) => ({
          id: contact.id,
          name: contact.name,
          relationship: contact.relationship,
          phoneKr: contact.phone_kr || "",
          email: contact.email || "",
          kakaoId: contact.kakao_id || "",
        }),
      );

      setProfileData({
        name: client.name || "",
        email: client.email || "",
        phone: client.phone_kr || client.phone_us || "",
        occupation: client.occupation || "",
        movingDate: client.moving_date
          ? new Date(client.moving_date)
          : undefined,
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

  const loadHousingData = async () => {
    try {
      setIsLoadingHousing(true);
      console.log("[ClientHomePage] 주거옵션 데이터 로드 시작");

      const response = await fetch("/api/client/housing");
      if (!response.ok) {
        if (response.status === 404) {
          console.log("[ClientHomePage] 주거옵션이 아직 생성되지 않음");
          setHousingData(null);
          setIsLoadingHousing(false);
          return;
        }
        throw new Error("Failed to load housing data");
      }

      const { housing } = await response.json();

      if (housing) {
        // DB 필드명 → UI 필드명 변환
        // housing_type이 배열이 아닌 경우 배열로 변환 (기존 데이터 호환성)
        let housingTypeArray: string[] = [];
        if (housing.housing_type) {
          if (Array.isArray(housing.housing_type)) {
            housingTypeArray = housing.housing_type;
          } else {
            // 단일 값인 경우 배열로 변환
            housingTypeArray = [housing.housing_type];
          }
        }

        // parking_count를 문자열로 변환 (4+ 같은 경우 처리)
        let parkingCountStr = "";
        if (
          housing.parking_count !== null &&
          housing.parking_count !== undefined
        ) {
          if (housing.parking_count >= 4) {
            parkingCountStr = "4+";
          } else {
            parkingCountStr = housing.parking_count.toString();
          }
        }

        setHousingData({
          preferredArea: housing.preferred_city || "",
          maxBudget: housing.budget_max?.toString() || "",
          housingType: housingTypeArray,
          bedrooms: housing.bedrooms?.toString() || "2",
          bathrooms: housing.bathrooms?.toString() || "2",
          furnished: housing.furnished ?? false,
          hasWasherDryer: housing.has_washer_dryer ?? false,
          parking: housing.parking ?? false,
          parkingCount: parkingCountStr,
          hasPets: housing.has_pets ?? false,
          petDetails: housing.pet_details || "",
          schoolDistrict: housing.school_district ?? false,
          workplaceAddress: housing.workplace_address || "",
          additionalNotes: housing.additional_notes || "",
        });
      } else {
        setHousingData(null);
      }

      console.log("[ClientHomePage] 주거옵션 데이터 로드 성공");
    } catch (error) {
      console.error("[ClientHomePage] 주거옵션 데이터 로드 실패:", error);
      toast({
        title: "데이터 로드 실패",
        description: "주거옵션 정보를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
      setHousingData(null);
    } finally {
      setIsLoadingHousing(false);
    }
  };

  const loadChecklistData = async () => {
    try {
      setIsLoadingChecklist(true);
      console.log("[ClientHomePage] 체크리스트 데이터 로드 시작");

      const response = await fetch("/api/client/checklist");
      if (!response.ok) {
        if (response.status === 404) {
          console.log("[ClientHomePage] 체크리스트가 아직 생성되지 않음");
          setChecklistData([]);
          setIsLoadingChecklist(false);
          return;
        }
        throw new Error("Failed to load checklist data");
      }

      const { checklist } = await response.json();

      if (checklist && checklist.length > 0) {
        // phase 문자열을 TimelinePhase enum으로 변환
        const normalizedChecklist = checklist.map((item: any) => ({
          ...item,
          phase: item.phase as TimelinePhase, // 타입 단언 또는 변환
        }));

        setChecklistData(normalizedChecklist);

        // 체크리스트 완료율 계산
        const completedCount = normalizedChecklist.filter(
          (item: any) => item.isCompleted,
        ).length;
        const completionPercent = Math.round(
          (completedCount / normalizedChecklist.length) * 100,
        );

        setClientData((prev) => ({
          ...prev,
          checklistCompletion: completionPercent,
        }));
      } else {
        setChecklistData([]);
        setClientData((prev) => ({
          ...prev,
          checklistCompletion: 0,
        }));
      }

      console.log("[ClientHomePage] 체크리스트 데이터 로드 성공:", {
        itemCount: checklist?.length || 0,
        completionPercent:
          checklist && checklist.length > 0
            ? Math.round(
                (checklist.filter((item: any) => item.isCompleted).length /
                  checklist.length) *
                  100,
              )
            : 0,
      });
    } catch (error) {
      console.error("[ClientHomePage] 체크리스트 데이터 로드 실패:", error);
      toast({
        title: "데이터 로드 실패",
        description: "체크리스트 정보를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
      setChecklistData([]);
    } finally {
      setIsLoadingChecklist(false);
    }
  };

  const handleSaveChecklist = async (items: any[]) => {
    try {
      setIsSaving(true);
      console.log("[ClientHomePage] 체크리스트 저장 시작:", {
        itemCount: items.length,
      });

      // 저장할 때 전송한 메모를 저장해두고, 서버 응답과 비교하여 동기화
      const sentMemos = new Map(
        items.map((item: any) => [
          item.templateId,
          item.memo || "", // 전송한 메모 저장
        ])
      );

      // ChecklistItem을 DB 업데이트 형식으로 변환
      // 템플릿 기준 로직: templateId를 기준으로 상태만 저장
      // updateChecklistSchema에 맞는 필드명 사용 (snake_case)
      const itemsToUpdate = items.map((item: any) => ({
        templateId: item.templateId, // 템플릿 ID (필수, UUID)
        is_completed: item.isCompleted || false, // boolean (필수)
        notes: item.memo || null, // string (optional, nullable)
        completed_at: item.completedAt
          ? item.completedAt instanceof Date
            ? item.completedAt.toISOString()
            : item.completedAt
          : null, // string datetime (optional, nullable)
        // id는 API에서 내부적으로 사용하므로 여기서는 제외
        // actual_cost와 reference_url은 현재 사용하지 않으므로 제외
      }));

      console.log("[ClientHomePage] 체크리스트 업데이트 항목:", {
        itemCount: itemsToUpdate.length,
      });

      let response: Response;
      try {
        response = await fetch("/api/client/checklist", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: itemsToUpdate,
          }),
        });
      } catch (fetchError) {
        console.error("[ClientHomePage] 네트워크 에러:", fetchError);
        throw new Error(
          "서버에 연결할 수 없습니다. 개발 서버가 실행 중인지 확인해주세요.",
        );
      }

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status} 에러` };
        }
        console.error("[ClientHomePage] 체크리스트 저장 실패:", {
          status: response.status,
          error: errorData.error,
        });
        throw new Error(errorData.error || "Failed to update checklist");
      }

      const { updated } = await response.json();

      // 서버 응답 데이터로 로컬 상태만 부분 업데이트 (재렌더링 최소화)
      // 단, 현재 입력 중인 메모는 보존 (무한 루프 방지)
      if (updated && updated.length > 0) {
        setChecklistData((prevChecklist) => {
          const updatedMap = new Map(
            updated.map((item: any) => [item.template_id, item]),
          );

          const newChecklist = prevChecklist.map((item: any) => {
            const serverItem = updatedMap.get(item.templateId) as any;
            if (serverItem) {
              // 서버에서 받은 데이터로 부분 업데이트
              const serverMemo = serverItem.notes !== null && serverItem.notes !== undefined 
                ? serverItem.notes 
                : "";
              
              // 저장할 때 전송한 메모와 서버 응답 메모 비교
              const sentMemo = sentMemos.get(item.templateId) || "";
              
              // 전송한 메모와 서버 응답 메모가 같으면 서버 메모 사용 (정상 동기화)
              // 다르면 현재 로컬 메모 유지 (사용자가 입력 중일 수 있음)
              // 또는 전송한 메모와 현재 로컬 메모가 다르면 현재 로컬 메모 유지 (새로 입력 중)
              const finalMemo = 
                sentMemo === serverMemo && item.memo === sentMemo
                  ? serverMemo // 정상 동기화: 전송=서버=로컬
                  : item.memo; // 사용자가 입력 중: 현재 로컬 메모 유지
              
              return {
                ...item,
                id: serverItem.id || item.id, // 새로 생성된 경우 id 업데이트
                isCompleted: serverItem.is_completed ?? item.isCompleted,
                memo: finalMemo,
                completedAt: serverItem.completed_at
                  ? new Date(serverItem.completed_at)
                  : item.completedAt,
              };
            }
            return item;
          });

          // 완료율 재계산
          const completedCount = newChecklist.filter(
            (item: any) => item.isCompleted,
          ).length;
          const completionPercent = Math.round(
            (completedCount / newChecklist.length) * 100,
          );
          setClientData((prev) => ({
            ...prev,
            checklistCompletion: completionPercent,
          }));

          return newChecklist;
        });
      }

      console.log("[ClientHomePage] 체크리스트 저장 성공:", {
        updatedCount: updated.length,
      });

      toast({
        title: "저장 완료",
        description: "체크리스트가 성공적으로 저장되었습니다.",
      });
    } catch (error) {
      console.error("[ClientHomePage] 체크리스트 저장 오류:", error);
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

  const handleSaveHousing = async (data: any) => {
    try {
      setIsSaving(true);
      console.log("[ClientHomePage] 주거옵션 저장 시작:", data);

      const response = await fetch("/api/client/housing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[ClientHomePage] 주거옵션 저장 실패:", {
          status: response.status,
          error: errorData.error,
        });
        throw new Error(
          errorData.error || "Failed to update housing requirements",
        );
      }

      const { housing } = await response.json();

      // 로컬 상태 업데이트 (DB 필드명 → UI 필드명 변환)
      // housing_type이 배열이 아닌 경우 배열로 변환 (기존 데이터 호환성)
      let housingTypeArray: string[] = [];
      if (housing.housing_type) {
        if (Array.isArray(housing.housing_type)) {
          housingTypeArray = housing.housing_type;
        } else {
          // 단일 값인 경우 배열로 변환
          housingTypeArray = [housing.housing_type];
        }
      }

      // parking_count를 문자열로 변환 (4+ 같은 경우 처리)
      let parkingCountStr = "";
      if (
        housing.parking_count !== null &&
        housing.parking_count !== undefined
      ) {
        if (housing.parking_count >= 4) {
          parkingCountStr = "4+";
        } else {
          parkingCountStr = housing.parking_count.toString();
        }
      }

      setHousingData({
        preferredArea: housing.preferred_city || "",
        maxBudget: housing.budget_max?.toString() || "",
        housingType: housingTypeArray,
        bedrooms: housing.bedrooms?.toString() || "2",
        bathrooms: housing.bathrooms?.toString() || "2",
        furnished: housing.furnished ?? false,
        hasWasherDryer: housing.has_washer_dryer ?? false,
        parking: housing.parking ?? false,
        parkingCount: parkingCountStr,
        hasPets: housing.has_pets ?? false,
        petDetails: housing.pet_details || "",
        schoolDistrict: housing.school_district ?? false,
        workplaceAddress: housing.workplace_address || "",
        additionalNotes: housing.additional_notes || "",
      });

      console.log("[ClientHomePage] 주거옵션 저장 성공");

      toast({
        title: "저장 완료",
        description: "주거옵션이 성공적으로 저장되었습니다.",
      });
    } catch (error) {
      console.error("[ClientHomePage] 주거옵션 저장 오류:", error);
      toast({
        title: "저장 실패",
        description:
          error instanceof Error
            ? error.message
            : "주거옵션 저장에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async (data: any) => {
    try {
      setIsSaving(true);
      console.log("[ClientHomePage] 프로필 저장 시작:", data);

      // updateClientProfileSchema에 맞는 필드만 포함
      const requestBody: any = {
        name: data.name,
        email: data.email,
        phone_kr: data.phone || null,
        phone_us: null, // 프로필 탭에서는 phone_kr만 사용
        occupation: data.occupation,
        moving_date: data.movingDate?.toISOString().split("T")[0],
        relocation_type: data.relocationType,
        moving_type: data.movingType || null,
        birth_date: data.birthDate?.toISOString().split("T")[0] || null,
      };

      // 가족 정보가 있으면 추가
      if (data.familyMembers && data.familyMembers.length > 0) {
        requestBody.family_members = data.familyMembers.map((member: any) => {
          // birthDate를 문자열로 변환 (Date 객체인 경우)
          let birthDateStr: string | null = null;
          if (member.birthDate) {
            if (member.birthDate instanceof Date) {
              birthDateStr = member.birthDate.toISOString().split("T")[0];
            } else if (typeof member.birthDate === "string") {
              birthDateStr = member.birthDate;
            }
          }

          return {
            name: member.name,
            relationship: member.relationship,
            birth_date: birthDateStr,
            phone: member.phone || null,
            email: member.email || null,
            notes: member.notes || null,
          };
        });
      }

      // 비상연락망이 있으면 추가
      if (data.emergencyContacts && data.emergencyContacts.length > 0) {
        requestBody.emergency_contacts = data.emergencyContacts.map(
          (contact: any) => ({
            name: contact.name,
            relationship: contact.relationship,
            phone_kr: contact.phoneKr || null,
            email: contact.email || null,
            kakao_id: contact.kakaoId || null,
          }),
        );
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

        // 에러 메시지 파싱 개선
        let errorMessage = "Failed to update profile";
        if (errorData.details) {
          if (Array.isArray(errorData.details)) {
            errorMessage = errorData.details
              .map((err: any) => err.message || JSON.stringify(err))
              .join(", ");
          } else if (typeof errorData.details === "string") {
            errorMessage = errorData.details;
          } else {
            errorMessage = JSON.stringify(errorData.details);
          }
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }

        throw new Error(errorMessage);
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
        description:
          error instanceof Error
            ? error.message
            : "프로필 저장에 실패했습니다.",
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
          <Card className="w-full">
            <CardContent className="p-6 pt-6">
              <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-stretch">
                {/* D-day 섹션 */}
                <div className="flex-1 flex flex-col justify-center items-center space-y-4 min-w-0">
                  <Calendar className="h-12 w-12 text-primary flex-shrink-0" />
                  <div className="text-4xl font-bold text-primary">
                    D-{daysUntilMoving}
                  </div>
                  <p className="text-muted-foreground">이주까지</p>
                  <p className="text-sm text-muted-foreground">
                    {clientData.movingDate
                      ? new Date(clientData.movingDate).toLocaleDateString(
                          "ko-KR",
                        )
                      : "날짜 미설정"}
                  </p>
                </div>

                {/* 구분선 (데스크톱에서만 표시) */}
                <div className="hidden md:block w-px bg-border self-stretch" />

                {/* 준비 진행도 섹션 */}
                <div className="flex-1 flex flex-col justify-center space-y-4 min-w-0 w-full md:w-auto">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-success">
                      {clientData.checklistCompletion}%
                    </div>
                    <p className="text-muted-foreground mt-2">준비 진행도</p>
                  </div>
                  <div
                    aria-valuemax={100}
                    aria-valuemin={0}
                    role="progressbar"
                    className="bg-primary/20 relative w-full overflow-hidden rounded-full h-3"
                  >
                    <div
                      className="bg-primary h-full w-full flex-1 transition-all"
                      style={{
                        transform: `translateX(-${
                          100 - clientData.checklistCompletion
                        }%)`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
                    <p className="text-muted-foreground">
                      프로필 정보를 불러오는 중...
                    </p>
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
                  {isLoadingHousing ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        주거옵션 정보를 불러오는 중...
                      </p>
                    </div>
                  ) : (
                    <HousingTab
                      initialData={housingData}
                      onSave={handleSaveHousing}
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="checklist" className="space-y-6">
                <ChecklistTab
                  movingDate={clientData.movingDate}
                  initialData={
                    checklistData.length > 0 ? checklistData : undefined
                  }
                  onSave={handleSaveChecklist}
                  isLoading={isLoadingChecklist}
                />
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

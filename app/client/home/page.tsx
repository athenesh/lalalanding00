"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar, Lock, UserPlus } from "lucide-react";
import ProfileTab from "@/components/client/profile-tab";
import HousingTab from "@/components/client/housing-tab";
import ChecklistTab from "@/components/client/checklist-tab";
import ChatTab from "@/components/client/chat-tab";
import { useToast } from "@/hooks/use-toast";
import { TimelinePhase } from "@/types/checklist";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const [accessLevel, setAccessLevel] = useState<"invited" | "paid">("invited");
  const [tabAccess, setTabAccess] = useState({
    canAccessHousing: false,
    canAccessChecklist: false,
    isDevelopment: false,
    agentApproved: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHousing, setIsLoadingHousing] = useState(false);
  const [isLoadingChecklist, setIsLoadingChecklist] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ownerAgentId, setOwnerAgentId] = useState<string | null>(null);
  const [agentCode, setAgentCode] = useState("");
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [verifiedAgent, setVerifiedAgent] = useState<{
    name: string | null;
    email: string | null;
  } | null>(null);

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
      // 클라이언트인 경우 클라이언트 레코드 확인 및 생성 후 데이터 로드
      ensureClientRecordAndLoad();
    } else {
      // role이 없거나 다른 경우 권한 부여 상태 확인
      checkAuthorizationAndLoad();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, user, authLoaded, userLoaded, router]);

  // 클라이언트 레코드 확인 및 생성 후 데이터 로드
  const ensureClientRecordAndLoad = async () => {
    try {
      console.log("[ClientHomePage] 클라이언트 레코드 확인 시작");

      // 먼저 클라이언트 레코드가 있는지 확인
      const statusResponse = await fetch("/api/client/authorize/status");

      if (statusResponse.status === 404) {
        // 클라이언트 레코드가 없으면 자동 생성 시도
        console.log("[ClientHomePage] 클라이언트 레코드 없음, 자동 생성 시도");

        const createResponse = await fetch("/api/clients/auto-create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        if (!createResponse.ok) {
          let errorData: any = {};
          try {
            errorData = await createResponse.json();
          } catch (jsonError) {
            console.error("[ClientHomePage] 에러 응답 파싱 실패:", jsonError);
            errorData = {
              error: `HTTP ${createResponse.status} 에러`,
              details: "서버에서 에러 응답을 받았지만 파싱할 수 없습니다.",
            };
          }

          console.error("[ClientHomePage] 클라이언트 레코드 생성 실패:", {
            status: createResponse.status,
            statusText: createResponse.statusText,
            errorData,
          });

          const errorMessage =
            errorData.details ||
            errorData.error ||
            "알 수 없는 오류가 발생했습니다.";
          toast({
            title: "오류",
            description: `클라이언트 레코드를 생성할 수 없습니다: ${errorMessage}`,
            variant: "destructive",
          });
          return;
        }

        console.log("[ClientHomePage] 클라이언트 레코드 생성 성공");
      } else if (!statusResponse.ok) {
        console.error(
          "[ClientHomePage] 클라이언트 상태 확인 실패:",
          statusResponse.status,
        );
        return;
      }

      // 클라이언트 레코드가 확인되었으므로 데이터 로드
      loadProfileData();
      loadHousingData();
      loadChecklistData();
      // 탭 접근 권한 확인
      checkTabAccess();
    } catch (error) {
      console.error("[ClientHomePage] 클라이언트 레코드 확인 중 오류:", error);
      toast({
        title: "오류",
        description: "클라이언트 정보를 확인하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 탭 접근 권한 확인
  const checkTabAccess = async () => {
    try {
      console.log("[ClientHomePage] 탭 접근 권한 확인 시작");
      const response = await fetch("/api/client/access-status");

      if (response.ok) {
        const data = await response.json();
        console.log("[ClientHomePage] 탭 접근 권한 확인 결과:", data);
        setTabAccess({
          canAccessHousing: data.canAccessHousing || false,
          canAccessChecklist: data.canAccessChecklist || false,
          isDevelopment: data.isDevelopment || false,
          agentApproved: data.agentApproved || false,
        });
      } else {
        console.error(
          "[ClientHomePage] 탭 접근 권한 확인 실패:",
          response.status,
        );
        // 실패 시 기본값 유지 (모두 false)
      }
    } catch (error) {
      console.error("[ClientHomePage] 탭 접근 권한 확인 중 오류:", error);
      // 에러 시 기본값 유지 (모두 false)
    }
  };

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
          // 탭 접근 권한 확인
          checkTabAccess();
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
        if (response.status === 401) {
          // 클라이언트 레코드가 없을 수 있으므로 자동 생성 시도
          console.log(
            "[ClientHomePage] 401 에러 - 클라이언트 레코드 자동 생성 시도",
          );
          const createResponse = await fetch("/api/clients/auto-create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          });

          if (createResponse.ok) {
            console.log("[ClientHomePage] 클라이언트 레코드 생성 성공, 재시도");
            // 재시도
            const retryResponse = await fetch("/api/client/profile");
            if (retryResponse.ok) {
              const data = await retryResponse.json();
              // 성공 처리 로직은 아래로 계속
              const client = data.client;
              const familyMembers = data.familyMembers || [];
              const emergencyContacts = data.emergencyContacts || [];

              setAccessLevel(client.access_level || "invited");
              setOwnerAgentId(client.owner_agent_id || null);

              setClientData({
                name: client.name || "",
                movingDate: client.moving_date || "",
                checklistCompletion: clientData.checklistCompletion,
              });

              const transformedFamilyMembers = familyMembers.map(
                (member: any) => ({
                  id: member.id,
                  name: member.name,
                  relationship: member.relationship,
                  birthDate: member.birth_date
                    ? new Date(member.birth_date)
                    : undefined,
                  phone: member.phone || "",
                  email: member.email || "",
                  notes: member.notes || "",
                }),
              );

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
                birthDate: client.birth_date
                  ? new Date(client.birth_date)
                  : undefined,
                familyMembers: transformedFamilyMembers,
                emergencyContacts: transformedEmergencyContacts,
              });
              setOwnerAgentId(client.owner_agent_id || null);
              setIsLoading(false);
              return;
            }
          }
        }
        if (response.status === 404) {
          console.log(
            "[ClientHomePage] 클라이언트가 없음 - 초대링크 없이 가입한 유저로 간주",
          );
          // 초대링크 없이 가입한 유저로 간주하고 accessLevel을 invited로 설정
          setAccessLevel("invited");
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

      // access_level 설정
      setAccessLevel(client.access_level || "invited");

      // owner_agent_id 설정
      setOwnerAgentId(client.owner_agent_id || null);

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

      // owner_agent_id도 설정
      setOwnerAgentId(client.owner_agent_id || null);
    } catch (error) {
      console.error("[ClientHomePage] 프로필 데이터 로드 실패:", error);
      // 에러 토스트는 표시하지 않음 (초대링크 없이 가입한 유저는 정상적인 상황)
      setIsLoading(false);
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
        if (response.status === 401) {
          // 클라이언트 레코드가 없을 수 있으므로 자동 생성 시도
          console.log(
            "[ClientHomePage] 401 에러 - 클라이언트 레코드 자동 생성 시도",
          );
          const createResponse = await fetch("/api/clients/auto-create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          });

          if (createResponse.ok) {
            console.log("[ClientHomePage] 클라이언트 레코드 생성 성공, 재시도");
            // 재시도
            const retryResponse = await fetch("/api/client/housing");
            if (retryResponse.ok) {
              const { housing } = await retryResponse.json();
              if (housing) {
                // DB 필드명 → UI 필드명 변환
                let housingTypeArray: string[] = [];
                if (housing.housing_type) {
                  if (Array.isArray(housing.housing_type)) {
                    housingTypeArray = housing.housing_type;
                  } else {
                    housingTypeArray = [housing.housing_type];
                  }
                }

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
              setIsLoadingHousing(false);
              return;
            }
          }
        }
        if (response.status === 404) {
          console.log(
            "[ClientHomePage] 클라이언트가 없음 - 초대링크 없이 가입한 유저로 간주",
          );
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
      // 에러 토스트는 표시하지 않음
      setHousingData(null);
      setIsLoadingHousing(false);
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
        if (response.status === 401) {
          // 클라이언트 레코드가 없을 수 있으므로 자동 생성 시도
          console.log(
            "[ClientHomePage] 401 에러 - 클라이언트 레코드 자동 생성 시도",
          );
          const createResponse = await fetch("/api/clients/auto-create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          });

          if (createResponse.ok) {
            console.log("[ClientHomePage] 클라이언트 레코드 생성 성공, 재시도");
            // 재시도 - 성공하면 아래 로직으로 계속 진행
            const retryResponse = await fetch("/api/client/checklist");
            if (retryResponse.ok) {
              // 성공 처리 로직은 아래로 계속
            } else {
              setChecklistData([]);
              setIsLoadingChecklist(false);
              return;
            }
          } else {
            setChecklistData([]);
            setIsLoadingChecklist(false);
            return;
          }
        } else if (response.status === 404) {
          console.log(
            "[ClientHomePage] 클라이언트가 없음 - 초대링크 없이 가입한 유저로 간주",
          );
          setChecklistData([]);
          setIsLoadingChecklist(false);
          return;
        } else {
          throw new Error("Failed to load checklist data");
        }
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
      // 에러 토스트는 표시하지 않음
      setChecklistData([]);
      setIsLoadingChecklist(false);
    } finally {
      setIsLoadingChecklist(false);
    }
  };

  const handleSaveChecklist = async (
    items: any[],
    options?: { showToast?: boolean },
  ) => {
    const showToast = options?.showToast ?? true; // 기본값: true (하위 호환성)
    try {
      setIsSaving(true);
      console.log("[ClientHomePage] 체크리스트 저장 시작:", {
        itemCount: items.length,
        showToast,
      });

      // 저장할 때 전송한 메모를 저장해두고, 서버 응답과 비교하여 동기화
      const sentMemos = new Map(
        items.map((item: any) => [
          item.templateId,
          item.memo || "", // 전송한 메모 저장
        ]),
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
              const serverMemo =
                serverItem.notes !== null && serverItem.notes !== undefined
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

      // showToast가 true일 때만 토스트 표시
      if (showToast) {
        toast({
          title: "저장 완료",
          description: "체크리스트가 성공적으로 저장되었습니다.",
        });
      }
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
        console.log("[ClientHomePage] 비상연락망 데이터 변환 전:", {
          emergencyContacts: data.emergencyContacts,
        });
        requestBody.emergency_contacts = data.emergencyContacts.map(
          (contact: any) => {
            const mapped = {
              name: contact.name,
              relationship: contact.relationship,
              phone_kr: contact.phoneKr || null,
              email: contact.email || null,
              kakao_id: contact.kakaoId || null,
            };
            console.log("[ClientHomePage] 비상연락망 데이터 변환:", {
              original: contact,
              mapped,
            });
            return mapped;
          },
        );
        console.log("[ClientHomePage] 비상연락망 최종 데이터:", {
          emergency_contacts: requestBody.emergency_contacts,
        });
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

  // 에이전트 코드 검증 핸들러
  const handleVerifyCode = async (code: string) => {
    if (code.length !== 6) {
      return;
    }

    try {
      setIsVerifyingCode(true);
      console.log("[ClientHomePage] 에이전트 코드 검증 시작:", code);

      const response = await fetch(
        `/api/invitations/verify-code?code=${code.toUpperCase()}`,
      );

      const data = await response.json();

      if (data.valid) {
        setVerifiedAgent({
          name: data.invitation.agentName,
          email: data.invitation.agentEmail,
        });
        console.log(
          "[ClientHomePage] 에이전트 코드 검증 성공:",
          data.invitation,
        );
      } else {
        setVerifiedAgent(null);
        toast({
          title: "코드 검증 실패",
          description: data.error || "유효하지 않은 초대 코드입니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[ClientHomePage] 에이전트 코드 검증 오류:", error);
      setVerifiedAgent(null);
      toast({
        title: "코드 검증 실패",
        description: "코드를 확인하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // 에이전트 코드 입력 핸들러
  const handleAgentCodeChange = (value: string) => {
    // 대문자로 변환하고 6자리만 허용
    const upperValue = value.toUpperCase().slice(0, 6);
    setAgentCode(upperValue);
    setVerifiedAgent(null);

    // 6자리가 되면 자동 검증
    if (upperValue.length === 6) {
      handleVerifyCode(upperValue);
    }
  };

  // 에이전트 배정 요청 핸들러
  const handleAssignAgent = async () => {
    if (!agentCode || agentCode.length !== 6) {
      toast({
        title: "코드 입력 필요",
        description: "6자리 에이전트 코드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmittingCode(true);
      console.log("[ClientHomePage] 에이전트 배정 요청 시작:", agentCode);

      const response = await fetch("/api/clients/assign-by-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: agentCode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "에이전트 배정에 실패했습니다.");
      }

      const data = await response.json();

      console.log("[ClientHomePage] 에이전트 배정 성공:", data);

      toast({
        title: "배정 완료",
        description: data.agent
          ? `${data.agent.name || "에이전트"}님이 성공적으로 배정되었습니다.`
          : "에이전트가 성공적으로 배정되었습니다.",
      });

      // 상태 초기화
      setAgentCode("");
      setVerifiedAgent(null);

      // 프로필 데이터 다시 로드하여 owner_agent_id 업데이트
      console.log("[ClientHomePage] 에이전트 배정 후 데이터 갱신 시작");
      await loadProfileData();
      await checkTabAccess();
      console.log("[ClientHomePage] 에이전트 배정 후 데이터 갱신 완료");
    } catch (error) {
      console.error("[ClientHomePage] 에이전트 배정 오류:", error);
      toast({
        title: "배정 실패",
        description:
          error instanceof Error
            ? error.message
            : "에이전트 배정에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingCode(false);
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
      <main className="container mx-auto px-4 py-8">
        {/* 페이지 제목 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">내 이주 준비</h1>
          <p className="text-muted-foreground mt-2">
            {clientData.name}님의 이주 준비 현황
          </p>
        </div>

        <div className="space-y-6">
          <Card className="w-full">
            <CardContent className="p-6 pt-6">
              <div className="flex flex-row gap-4 md:gap-8 items-stretch">
                {/* D-day 섹션 */}
                <div className="flex flex-col justify-center items-center space-y-4 min-w-0 flex-shrink-0">
                  <Calendar className="h-12 w-12 text-primary flex-shrink-0" />
                  <div className="text-4xl font-bold text-primary">
                    D-{daysUntilMoving}
                  </div>
                  <p className="text-muted-foreground">이주까지</p>
                </div>

                {/* 구분선 */}
                <div className="w-px bg-border self-stretch" />

                {/* 준비 진행도 섹션 */}
                <div className="flex-1 flex flex-col justify-center space-y-4 min-w-0">
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
                  <p className="text-sm text-muted-foreground text-center">
                    {clientData.movingDate
                      ? new Date(clientData.movingDate).toLocaleDateString(
                          "ko-KR",
                        )
                      : "날짜 미설정"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 에이전트 배정 요청 알림 (에이전트가 배정되지 않은 경우) */}
          {!ownerAgentId && !isLoading && (
            <Alert className="border-primary/50 bg-primary/5">
              <UserPlus className="h-4 w-4 text-primary" />
              <AlertTitle>에이전트 배정이 필요합니다</AlertTitle>
              <AlertDescription className="space-y-4">
                <p>
                  에이전트가 배정되어야 주거옵션 및 체크리스트 기능을 이용하실
                  수 있습니다.
                </p>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="에이전트 코드 입력 (6자리)"
                      value={agentCode}
                      onChange={(e) => handleAgentCodeChange(e.target.value)}
                      maxLength={6}
                      className="uppercase font-mono"
                      disabled={isSubmittingCode || isVerifyingCode}
                    />
                    <Button
                      onClick={handleAssignAgent}
                      disabled={
                        !agentCode ||
                        agentCode.length !== 6 ||
                        isSubmittingCode ||
                        isVerifyingCode ||
                        !verifiedAgent
                      }
                    >
                      {isSubmittingCode ? "처리 중..." : "배정 요청"}
                    </Button>
                  </div>
                  {isVerifyingCode && (
                    <p className="text-sm text-muted-foreground">
                      코드를 확인하는 중...
                    </p>
                  )}
                  {verifiedAgent && (
                    <div className="rounded-md bg-primary/10 p-3 text-sm">
                      <p className="font-medium text-primary">
                        {verifiedAgent.name || "에이전트"}
                        {verifiedAgent.email && ` (${verifiedAgent.email})`}님의
                        코드가 확인되었습니다.
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        배정 요청 버튼을 클릭하여 에이전트를 배정하세요.
                      </p>
                    </div>
                  )}
                  {agentCode.length === 6 &&
                    !verifiedAgent &&
                    !isVerifyingCode && (
                      <p className="text-sm text-destructive">
                        유효하지 않은 코드입니다. 다시 확인해주세요.
                      </p>
                    )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">내 프로필</TabsTrigger>
              <TabsTrigger
                value="housing"
                disabled={!tabAccess.canAccessHousing}
                className={!tabAccess.canAccessHousing ? "opacity-50" : ""}
              >
                주거옵션
                {!tabAccess.canAccessHousing && (
                  <Lock className="ml-1 h-3 w-3" />
                )}
              </TabsTrigger>
              <TabsTrigger
                value="checklist"
                disabled={!tabAccess.canAccessChecklist}
                className={!tabAccess.canAccessChecklist ? "opacity-50" : ""}
              >
                체크리스트
                {!tabAccess.canAccessChecklist && (
                  <Lock className="ml-1 h-3 w-3" />
                )}
              </TabsTrigger>
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
                {!tabAccess.canAccessHousing ? (
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertTitle>
                      {tabAccess.isDevelopment
                        ? "개발 중인 기능입니다"
                        : "에이전트 승인이 필요합니다"}
                    </AlertTitle>
                    <AlertDescription>
                      {tabAccess.isDevelopment
                        ? "이 기능은 현재 개발 중입니다. 곧 이용하실 수 있습니다."
                        : "주거옵션 기능을 이용하시려면 에이전트가 승인되어야 합니다."}
                    </AlertDescription>
                  </Alert>
                ) : (
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
                )}
              </TabsContent>

              <TabsContent value="checklist" className="space-y-6">
                {!tabAccess.canAccessChecklist ? (
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertTitle>
                      {tabAccess.isDevelopment
                        ? "개발 중인 기능입니다"
                        : "에이전트 승인이 필요합니다"}
                    </AlertTitle>
                    <AlertDescription>
                      {tabAccess.isDevelopment
                        ? "이 기능은 현재 개발 중입니다. 곧 이용하실 수 있습니다."
                        : "체크리스트 기능을 이용하시려면 에이전트가 승인되어야 합니다."}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <ChecklistTab
                    movingDate={clientData.movingDate}
                    initialData={
                      checklistData.length > 0 ? checklistData : undefined
                    }
                    onSave={handleSaveChecklist}
                    isLoading={isLoadingChecklist}
                    onRefresh={loadChecklistData}
                  />
                )}
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

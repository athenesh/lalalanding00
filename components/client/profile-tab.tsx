"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, UserCheck, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// 가족 구성원 인터페이스
interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  birthDate: Date | undefined;
  phone: string;
  email: string;
  notes: string;
  authorizedClerkUserId?: string; // 권한 부여된 경우 Clerk User ID
}

// 비상연락망 인터페이스
interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phoneKr: string;
  email: string;
  kakaoId: string;
}

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  occupation: string;
  movingDate: Date | undefined;
  relocationType: string; // 이주 목적 (주재원, 학업, 출장)
  movingType: string; // 이주 형태 (가족 동반, 단독 이주)
  birthDate: Date | undefined;
  familyMembers: FamilyMember[];
  emergencyContacts: EmergencyContact[];
}

interface ProfileTabProps {
  initialData?: Partial<ProfileData>;
  onSave?: (data: ProfileData) => void | Promise<void>;
  isSaving?: boolean;
}

export default function ProfileTab({
  initialData,
  onSave,
  isSaving = false,
}: ProfileTabProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ProfileData>({
    name: initialData?.name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    occupation: initialData?.occupation || "",
    movingDate: initialData?.movingDate,
    relocationType: initialData?.relocationType || "",
    movingType: initialData?.movingType || "",
    birthDate: initialData?.birthDate,
    familyMembers: initialData?.familyMembers || [],
    emergencyContacts: initialData?.emergencyContacts || [],
  });

  // 이주 예정일을 년도, 월, 일로 분리
  const [movingYear, setMovingYear] = useState<string>(
    formData.movingDate ? formData.movingDate.getFullYear().toString() : "",
  );
  const [movingMonth, setMovingMonth] = useState<string>(
    formData.movingDate ? (formData.movingDate.getMonth() + 1).toString() : "",
  );
  const [movingDay, setMovingDay] = useState<string>(
    formData.movingDate ? formData.movingDate.getDate().toString() : "",
  );

  // 생년월일을 년도, 월, 일로 분리
  const [birthYear, setBirthYear] = useState<string>(
    formData.birthDate ? formData.birthDate.getFullYear().toString() : "",
  );
  const [birthMonth, setBirthMonth] = useState<string>(
    formData.birthDate ? (formData.birthDate.getMonth() + 1).toString() : "",
  );
  const [birthDay, setBirthDay] = useState<string>(
    formData.birthDate ? formData.birthDate.getDate().toString() : "",
  );

  // 권한 부여 상태 관리 (authorized_clerk_user_id를 키로 사용)
  const [authorizations, setAuthorizations] = useState<
    Map<
      string,
      { id: string; authorized_clerk_user_id: string; email?: string }
    >
  >(new Map());
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // 권한 목록 로드
  useEffect(() => {
    loadAuthorizations();
  }, []);

  const loadAuthorizations = async () => {
    try {
      setIsLoadingAuth(true);
      console.log("[ProfileTab] 권한 목록 로드 시작");

      const response = await fetch("/api/client/authorize");
      if (!response.ok) {
        if (response.status === 404) {
          console.log("[ProfileTab] 권한 목록이 없음");
          setAuthorizations(new Map());
          return;
        }
        throw new Error("Failed to load authorizations");
      }

      const data = await response.json();
      const authMap = new Map<
        string,
        { id: string; authorized_clerk_user_id: string; email?: string }
      >();

      if (data.authorizations && Array.isArray(data.authorizations)) {
        // Clerk API를 통해 각 권한 부여된 사용자의 이메일 가져오기
        for (const auth of data.authorizations) {
          try {
            // 이메일 정보는 나중에 매칭을 위해 저장
            authMap.set(auth.authorized_clerk_user_id, {
              id: auth.id,
              authorized_clerk_user_id: auth.authorized_clerk_user_id,
            });
          } catch {
            // 에러 무시
          }
        }
      }

      setAuthorizations(authMap);
      console.log("[ProfileTab] 권한 목록 로드 성공:", {
        count: authMap.size,
      });
    } catch (error) {
      console.error("[ProfileTab] 권한 목록 로드 실패:", error);
      // 에러는 조용히 처리 (권한 기능이 없어도 프로필은 사용 가능)
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // 권한 부여
  const handleGrantAccess = async (email: string) => {
    if (!email || !email.trim()) {
      toast({
        title: "이메일이 필요합니다",
        description: "배우자의 이메일 주소를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoadingAuth(true);
      console.log("[ProfileTab] 권한 부여 시작:", { email });

      const response = await fetch("/api/client/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // 404 에러인 경우 (배우자 미가입)
        if (response.status === 404) {
          toast({
            title: "배우자 회원가입 필요",
            description:
              errorData.details ||
              "배우자가 먼저 회원가입을 완료해야 권한을 부여할 수 있습니다.",
            variant: "default",
            duration: 5000,
          });
          return;
        }

        throw new Error(errorData.error || "권한 부여에 실패했습니다.");
      }

      const data = await response.json();
      console.log("[ProfileTab] 권한 부여 성공:", data);

      // 권한 목록 새로고침
      await loadAuthorizations();

      // 해당 이메일의 가족 구성원에 authorizedClerkUserId 업데이트
      if (data.authorization) {
        setFormData((prev) => ({
          ...prev,
          familyMembers: prev.familyMembers.map((member) => {
            if (member.email === email.trim()) {
              return {
                ...member,
                authorizedClerkUserId:
                  data.authorization.authorized_clerk_user_id,
              };
            }
            return member;
          }),
        }));
      }

      toast({
        title: "권한 부여 완료",
        description: "배우자에게 권한이 성공적으로 부여되었습니다.",
      });
    } catch (error) {
      console.error("[ProfileTab] 권한 부여 실패:", error);
      toast({
        title: "권한 부여 실패",
        description:
          error instanceof Error
            ? error.message
            : "권한 부여 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // 권한 해제
  const handleRevokeAccess = async (authorizedClerkUserId: string) => {
    try {
      setIsLoadingAuth(true);
      console.log("[ProfileTab] 권한 해제 시작:", { authorizedClerkUserId });

      const response = await fetch("/api/client/authorize", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorized_clerk_user_id: authorizedClerkUserId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "권한 해제에 실패했습니다.");
      }

      console.log("[ProfileTab] 권한 해제 성공");

      // 권한 목록 새로고침
      await loadAuthorizations();

      // 해당 authorizedClerkUserId를 가진 가족 구성원에서 제거
      setFormData((prev) => ({
        ...prev,
        familyMembers: prev.familyMembers.map((member) => {
          if (member.authorizedClerkUserId === authorizedClerkUserId) {
            const { authorizedClerkUserId: _, ...rest } = member;
            return rest;
          }
          return member;
        }),
      }));

      toast({
        title: "권한 해제 완료",
        description: "권한이 성공적으로 해제되었습니다.",
      });
    } catch (error) {
      console.error("[ProfileTab] 권한 해제 실패:", error);
      toast({
        title: "권한 해제 실패",
        description:
          error instanceof Error
            ? error.message
            : "권한 해제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // 배우자 권한 부여 핸들러
  const handleGrantSpouseAccess = async (member: FamilyMember) => {
    await handleGrantAccess(member.email);
  };

  // 재사용 가능한 날짜 입력 핸들러
  const createDateFromInputs = (
    year: string,
    month: string,
    day: string,
  ): Date | undefined => {
    if (year && month && day) {
      const yearNum = parseInt(year, 10);
      const monthNum = parseInt(month, 10);
      const dayNum = parseInt(day, 10);

      // 유효성 검사
      if (
        yearNum >= 1900 &&
        yearNum <= 2100 &&
        monthNum >= 1 &&
        monthNum <= 12 &&
        dayNum >= 1 &&
        dayNum <= 31
      ) {
        try {
          const date = new Date(yearNum, monthNum - 1, dayNum);
          // 날짜가 유효한지 확인 (예: 2월 30일 같은 경우)
          if (
            date.getFullYear() === yearNum &&
            date.getMonth() === monthNum - 1 &&
            date.getDate() === dayNum
          ) {
            return date;
          }
        } catch (error) {
          // 유효하지 않은 날짜는 무시
        }
      }
    }
    return undefined;
  };

  // 날짜 입력 핸들러
  const handleMovingDateChange = (year: string, month: string, day: string) => {
    const date = createDateFromInputs(year, month, day);
    if (date) {
      setFormData((prev) => ({ ...prev, movingDate: date }));
    } else if (!year && !month && !day) {
      // 모든 필드가 비어있으면 날짜를 null로 설정
      setFormData((prev) => ({ ...prev, movingDate: undefined }));
    }
  };

  // 생년월일 입력 핸들러
  const handleBirthDateChange = (year: string, month: string, day: string) => {
    const date = createDateFromInputs(year, month, day);
    if (date) {
      setFormData((prev) => ({ ...prev, birthDate: date }));
    } else if (!year && !month && !day) {
      // 모든 필드가 비어있으면 날짜를 null로 설정
      setFormData((prev) => ({ ...prev, birthDate: undefined }));
    }
  };

  // initialData가 변경될 때 formData 업데이트
  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        name: initialData.name ?? prev.name,
        email: initialData.email ?? prev.email,
        phone: initialData.phone ?? prev.phone,
        occupation: initialData.occupation ?? prev.occupation,
        movingDate: initialData.movingDate ?? prev.movingDate,
        relocationType: initialData.relocationType ?? prev.relocationType,
        movingType: initialData.movingType ?? prev.movingType,
        birthDate: initialData.birthDate ?? prev.birthDate,
        familyMembers: initialData.familyMembers ?? prev.familyMembers,
        emergencyContacts:
          initialData.emergencyContacts ?? prev.emergencyContacts,
      }));

      // 이주 예정일이 변경되면 년도, 월, 일도 업데이트
      if (initialData.movingDate) {
        setMovingYear(initialData.movingDate.getFullYear().toString());
        setMovingMonth((initialData.movingDate.getMonth() + 1).toString());
        setMovingDay(initialData.movingDate.getDate().toString());
      } else {
        setMovingYear("");
        setMovingMonth("");
        setMovingDay("");
      }

      // 생년월일이 변경되면 년도, 월, 일도 업데이트
      if (initialData.birthDate) {
        setBirthYear(initialData.birthDate.getFullYear().toString());
        setBirthMonth((initialData.birthDate.getMonth() + 1).toString());
        setBirthDay(initialData.birthDate.getDate().toString());
      } else {
        setBirthYear("");
        setBirthMonth("");
        setBirthDay("");
      }
    }
  }, [
    initialData?.name,
    initialData?.email,
    initialData?.phone,
    initialData?.occupation,
    initialData?.movingDate,
    initialData?.relocationType,
    initialData?.movingType,
    initialData?.birthDate,
    initialData?.familyMembers,
    initialData?.emergencyContacts,
  ]);

  // 가족 구성원 추가
  const addFamilyMember = () => {
    const newMember: FamilyMember = {
      id: `family-${Date.now()}`,
      name: "",
      relationship: "",
      birthDate: undefined,
      phone: "",
      email: "",
      notes: "",
    };
    setFormData((prev) => ({
      ...prev,
      familyMembers: [...prev.familyMembers, newMember],
    }));
  };

  // 가족 구성원 삭제
  const removeFamilyMember = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      familyMembers: prev.familyMembers.filter((member) => member.id !== id),
    }));
  };

  // 가족 구성원 업데이트
  const updateFamilyMember = (
    id: string,
    field: keyof FamilyMember,
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      familyMembers: prev.familyMembers.map((member) =>
        member.id === id ? { ...member, [field]: value } : member,
      ),
    }));
  };

  // 비상연락망 추가
  const addEmergencyContact = () => {
    if (formData.emergencyContacts.length >= 2) {
      toast({
        title: "최대 2명까지 추가 가능합니다",
        variant: "destructive",
      });
      return;
    }
    const newContact: EmergencyContact = {
      id: `emergency-${Date.now()}`,
      name: "",
      relationship: "",
      phoneKr: "",
      email: "",
      kakaoId: "",
    };
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: [...prev.emergencyContacts, newContact],
    }));
  };

  // 비상연락망 삭제
  const removeEmergencyContact = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter(
        (contact) => contact.id !== id,
      ),
    }));
  };

  // 비상연락망 업데이트
  const updateEmergencyContact = (
    id: string,
    field: keyof EmergencyContact,
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.map((contact) =>
        contact.id === id ? { ...contact, [field]: value } : contact,
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 기본 정보 필수 항목 검증
    if (
      !formData.name ||
      !formData.email ||
      !formData.occupation ||
      !formData.movingDate ||
      !formData.relocationType
    ) {
      toast({
        title: "필수 항목을 입력해주세요",
        description:
          "이름, 이메일, 직업, 이주 예정일, 이주 목적은 필수 항목입니다.",
        variant: "destructive",
      });
      return;
    }

    // 이주 형태 필수 항목 검증
    if (!formData.movingType) {
      toast({
        title: "이주 형태를 선택해주세요",
        description: "가족 동반 또는 단독 이주를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 가족 동반 선택 시 가족 정보 검증
    if (formData.movingType === "가족 동반") {
      if (formData.familyMembers.length === 0) {
        toast({
          title: "가족 정보를 입력해주세요",
          description: "가족 동반 이주 시 최소 1명의 가족 정보가 필요합니다.",
          variant: "destructive",
        });
        return;
      }
      for (const member of formData.familyMembers) {
        if (!member.name || !member.relationship) {
          toast({
            title: "가족 정보를 모두 입력해주세요",
            description: "가족 구성원의 이름과 관계는 필수 항목입니다.",
            variant: "destructive",
          });
          return;
        }
      }
    }

    // 단독 이주 선택 시 비상연락망 검증
    if (formData.movingType === "단독 이주") {
      if (formData.emergencyContacts.length === 0) {
        toast({
          title: "비상연락망을 입력해주세요",
          description: "단독 이주 시 최소 1명의 비상연락망이 필요합니다.",
          variant: "destructive",
        });
        return;
      }
      for (const contact of formData.emergencyContacts) {
        if (!contact.name || !contact.relationship || !contact.phoneKr) {
          toast({
            title: "비상연락망 정보를 모두 입력해주세요",
            description:
              "비상연락망의 이름, 관계, 전화번호(한국)는 필수 항목입니다.",
            variant: "destructive",
          });
          return;
        }
      }
    }

    // 프로필 저장 시도 로그
    console.log("[ProfileTab] 프로필 저장 시도:", {
      name: formData.name,
      email: formData.email,
      occupation: formData.occupation,
      movingDate: formData.movingDate,
      relocationType: formData.relocationType,
      movingType: formData.movingType,
      birthDate: formData.birthDate,
      familyMembers: formData.familyMembers,
      emergencyContacts: formData.emergencyContacts,
    });

    await onSave?.(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 기본 정보 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* 첫 번째 줄: 이름과 생년월일 */}
            <div className="grid grid-cols-12 gap-2 md:gap-4 lg:gap-6">
              <div className="space-y-2 min-w-0 col-span-6">
                <Label htmlFor="name">
                  이름 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="영문이름"
                  required
                  className="w-[93.5%] text-xs md:text-sm lg:text-base"
                />
              </div>

              <div className="space-y-2 min-w-0 overflow-hidden -mx-1 md:-mx-2 lg:mx-0 col-span-6">
                <Label>생년월일</Label>
                <div className="flex items-center gap-0.5 md:gap-1 min-w-0">
                  <div className="flex-1 min-w-0 max-w-[168px] md:max-w-[180px] lg:max-w-[192px]">
                    <Input
                      type="number"
                      placeholder="년도 (예: 1990)"
                      value={birthYear}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, "");
                        setBirthYear(value);
                        handleBirthDateChange(value, birthMonth, birthDay);
                      }}
                      onKeyDown={(e) => {
                        if (
                          !/[0-9]/.test(e.key) &&
                          ![
                            "Backspace",
                            "Delete",
                            "ArrowLeft",
                            "ArrowRight",
                            "Tab",
                          ].includes(e.key)
                        ) {
                          e.preventDefault();
                        }
                      }}
                      min="1900"
                      max="2100"
                      className="text-center text-xs md:text-sm lg:text-base px-2 md:px-3"
                    />
                  </div>
                  <div className="min-w-0 w-10 md:w-12 lg:w-14 flex-shrink-0">
                    <Input
                      type="number"
                      placeholder="월"
                      value={birthMonth}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, "");
                        setBirthMonth(value);
                        handleBirthDateChange(birthYear, value, birthDay);
                      }}
                      onKeyDown={(e) => {
                        if (
                          !/[0-9]/.test(e.key) &&
                          ![
                            "Backspace",
                            "Delete",
                            "ArrowLeft",
                            "ArrowRight",
                            "Tab",
                          ].includes(e.key)
                        ) {
                          e.preventDefault();
                        }
                      }}
                      min="1"
                      max="12"
                      className="text-center text-xs md:text-sm lg:text-base w-full px-1 md:px-2 lg:px-3"
                    />
                  </div>
                  <div className="min-w-0 w-10 md:w-12 lg:w-14 flex-shrink-0">
                    <Input
                      type="number"
                      placeholder="일"
                      value={birthDay}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, "");
                        setBirthDay(value);
                        handleBirthDateChange(birthYear, birthMonth, value);
                      }}
                      onKeyDown={(e) => {
                        if (
                          !/[0-9]/.test(e.key) &&
                          ![
                            "Backspace",
                            "Delete",
                            "ArrowLeft",
                            "ArrowRight",
                            "Tab",
                          ].includes(e.key)
                        ) {
                          e.preventDefault();
                        }
                      }}
                      min="1"
                      max="31"
                      className="text-center text-xs md:text-sm lg:text-base w-full px-1 md:px-2 lg:px-3"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 두 번째 줄: 직업과 이메일 */}
            <div className="grid grid-cols-12 gap-2 md:gap-4 lg:gap-6">
              <div className="space-y-2 col-span-4">
                <Label htmlFor="occupation">
                  직업 <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.occupation}
                  onValueChange={(value) =>
                    setFormData({ ...formData, occupation: value })
                  }
                  required
                >
                  <SelectTrigger id="occupation" className="w-full">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doctor">의사</SelectItem>
                    <SelectItem value="employee">직장인</SelectItem>
                    <SelectItem value="student">학생</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 col-span-8">
                <Label htmlFor="email">
                  이메일 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="example@email.com"
                  required
                  className="text-xs md:text-sm lg:text-base"
                />
              </div>
            </div>

            {/* 세 번째 줄: 이주 목적과 전화번호 */}
            <div className="grid grid-cols-2 gap-2 md:gap-4 lg:gap-6">
              <div className="space-y-2">
                <Label htmlFor="relocationType">
                  이주 목적 <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.relocationType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, relocationType: value })
                  }
                  required
                >
                  <SelectTrigger id="relocationType" className="w-full">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="주재원">주재원</SelectItem>
                    <SelectItem value="학업">학업</SelectItem>
                    <SelectItem value="출장">출장</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">전화번호</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="010-1234-5678"
                  className="text-xs md:text-sm lg:text-base"
                />
              </div>
            </div>

            {/* 네 번째 줄: 이주 예정일 */}
            <div className="space-y-2">
              <Label>
                이주 예정일 <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-1">
                <div className="flex-1 min-w-[60px] max-w-[120px]">
                  <Input
                    type="number"
                    placeholder="년도 (예: 2025)"
                    value={movingYear}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMovingYear(value);
                      handleMovingDateChange(value, movingMonth, movingDay);
                    }}
                    min="1900"
                    max="2100"
                    className="text-center text-xs md:text-sm lg:text-base"
                  />
                </div>
                <div className="min-w-[56px] max-w-[80px] w-14 md:w-20">
                  <Input
                    type="number"
                    placeholder="월"
                    value={movingMonth}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMovingMonth(value);
                      handleMovingDateChange(movingYear, value, movingDay);
                    }}
                    min="1"
                    max="12"
                    className="text-center text-xs md:text-sm lg:text-base w-full"
                  />
                </div>
                <div className="min-w-[56px] max-w-[80px] w-14 md:w-20">
                  <Input
                    type="number"
                    placeholder="일"
                    value={movingDay}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMovingDay(value);
                      handleMovingDateChange(movingYear, movingMonth, value);
                    }}
                    min="1"
                    max="31"
                    className="text-center text-xs md:text-sm lg:text-base w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 이주 형태 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle>이주 형태</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="movingType">
              이주 형태 <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.movingType}
              onValueChange={(value) =>
                setFormData({ ...formData, movingType: value })
              }
              required
            >
              <SelectTrigger id="movingType">
                <SelectValue placeholder="이주 형태를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="가족 동반">가족 동반</SelectItem>
                <SelectItem value="단독 이주">단독 이주</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 가족 정보 입력 (가족 동반 선택 시) */}
          {formData.movingType === "가족 동반" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">가족 정보</Label>
                <Button
                  type="button"
                  onClick={addFamilyMember}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  가족 추가
                </Button>
              </div>
              {formData.familyMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  가족 구성원을 추가해주세요.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.familyMembers.map((member) => (
                    <Card key={member.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">가족 구성원</CardTitle>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFamilyMember(member.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {/* 첫 번째 줄: 이름과 관계 */}
                          <div className="flex flex-row gap-2 md:gap-4 lg:gap-6 items-end">
                            <div className="space-y-2 min-w-0 flex-[1.265]">
                              <Label>
                                이름 <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                value={member.name}
                                onChange={(e) =>
                                  updateFamilyMember(
                                    member.id,
                                    "name",
                                    e.target.value,
                                  )
                                }
                                placeholder="영문이름"
                                required
                                className="text-xs md:text-sm lg:text-base"
                              />
                            </div>
                            <div className="space-y-2 min-w-0 flex-basis-[33.333%] flex-shrink-0">
                              <Label>
                                관계 <span className="text-destructive">*</span>
                              </Label>
                              <Select
                                value={member.relationship}
                                onValueChange={(value) =>
                                  updateFamilyMember(
                                    member.id,
                                    "relationship",
                                    value,
                                  )
                                }
                                required
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="관계 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="배우자">배우자</SelectItem>
                                  <SelectItem value="자녀">자녀</SelectItem>
                                  <SelectItem value="부모">부모</SelectItem>
                                  <SelectItem value="형제자매">
                                    형제자매
                                  </SelectItem>
                                  <SelectItem value="기타">기타</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* 두 번째 줄: 생년월일 */}
                          <div className="space-y-2 min-w-0 overflow-hidden">
                            <Label>생년월일</Label>
                            <div className="flex items-center gap-0.5 md:gap-1 min-w-0">
                              <div className="flex-1 min-w-0 max-w-[110px] md:max-w-[120px] lg:max-w-[130px]">
                                <Input
                                  type="number"
                                  placeholder="년도 (예: 1990)"
                                  value={
                                    member.birthDate
                                      ? member.birthDate
                                          .getFullYear()
                                          .toString()
                                      : ""
                                  }
                                  onChange={(e) => {
                                    const year = e.target.value.replace(
                                      /[^0-9]/g,
                                      "",
                                    );
                                    const month = member.birthDate
                                      ? (
                                          member.birthDate.getMonth() + 1
                                        ).toString()
                                      : "";
                                    const day = member.birthDate
                                      ? member.birthDate.getDate().toString()
                                      : "";
                                    const date = createDateFromInputs(
                                      year,
                                      month,
                                      day,
                                    );
                                    updateFamilyMember(
                                      member.id,
                                      "birthDate",
                                      date,
                                    );
                                  }}
                                  onKeyDown={(e) => {
                                    if (
                                      !/[0-9]/.test(e.key) &&
                                      ![
                                        "Backspace",
                                        "Delete",
                                        "ArrowLeft",
                                        "ArrowRight",
                                        "Tab",
                                      ].includes(e.key)
                                    ) {
                                      e.preventDefault();
                                    }
                                  }}
                                  min="1900"
                                  max="2100"
                                  className="text-center text-xs md:text-sm lg:text-base px-2 md:px-3"
                                />
                              </div>
                              <div className="min-w-0 w-10 md:w-12 lg:w-16 flex-shrink-0">
                                <Input
                                  type="number"
                                  placeholder="월"
                                  value={
                                    member.birthDate
                                      ? (
                                          member.birthDate.getMonth() + 1
                                        ).toString()
                                      : ""
                                  }
                                  onChange={(e) => {
                                    const year = member.birthDate
                                      ? member.birthDate
                                          .getFullYear()
                                          .toString()
                                      : "";
                                    const month = e.target.value.replace(
                                      /[^0-9]/g,
                                      "",
                                    );
                                    const day = member.birthDate
                                      ? member.birthDate.getDate().toString()
                                      : "";
                                    const date = createDateFromInputs(
                                      year,
                                      month,
                                      day,
                                    );
                                    updateFamilyMember(
                                      member.id,
                                      "birthDate",
                                      date,
                                    );
                                  }}
                                  onKeyDown={(e) => {
                                    if (
                                      !/[0-9]/.test(e.key) &&
                                      ![
                                        "Backspace",
                                        "Delete",
                                        "ArrowLeft",
                                        "ArrowRight",
                                        "Tab",
                                      ].includes(e.key)
                                    ) {
                                      e.preventDefault();
                                    }
                                  }}
                                  min="1"
                                  max="12"
                                  className="text-center text-xs md:text-sm lg:text-base w-full px-1 md:px-2 lg:px-3"
                                />
                              </div>
                              <div className="min-w-0 w-10 md:w-12 lg:w-16 flex-shrink-0">
                                <Input
                                  type="number"
                                  placeholder="일"
                                  value={
                                    member.birthDate
                                      ? member.birthDate.getDate().toString()
                                      : ""
                                  }
                                  onChange={(e) => {
                                    const year = member.birthDate
                                      ? member.birthDate
                                          .getFullYear()
                                          .toString()
                                      : "";
                                    const month = member.birthDate
                                      ? (
                                          member.birthDate.getMonth() + 1
                                        ).toString()
                                      : "";
                                    const day = e.target.value.replace(
                                      /[^0-9]/g,
                                      "",
                                    );
                                    const date = createDateFromInputs(
                                      year,
                                      month,
                                      day,
                                    );
                                    updateFamilyMember(
                                      member.id,
                                      "birthDate",
                                      date,
                                    );
                                  }}
                                  onKeyDown={(e) => {
                                    if (
                                      !/[0-9]/.test(e.key) &&
                                      ![
                                        "Backspace",
                                        "Delete",
                                        "ArrowLeft",
                                        "ArrowRight",
                                        "Tab",
                                      ].includes(e.key)
                                    ) {
                                      e.preventDefault();
                                    }
                                  }}
                                  min="1"
                                  max="31"
                                  className="text-center text-xs md:text-sm lg:text-base w-full px-1 md:px-2 lg:px-3"
                                />
                              </div>
                            </div>
                          </div>

                          {/* 세 번째 줄: 이메일 */}
                          <div className="space-y-2">
                            <Label>이메일</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="email"
                                value={member.email}
                                onChange={(e) =>
                                  updateFamilyMember(
                                    member.id,
                                    "email",
                                    e.target.value,
                                  )
                                }
                                placeholder="example@email.com"
                                className="flex-1 text-xs md:text-sm lg:text-base"
                              />
                              {/* 배우자인 경우 권한 부여 버튼 표시 */}
                              {member.relationship === "배우자" &&
                                member.email && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    {(() => {
                                      // 권한이 부여되었는지 확인
                                      const isAuthorized =
                                        member.authorizedClerkUserId &&
                                        authorizations.has(
                                          member.authorizedClerkUserId,
                                        );

                                      return isAuthorized ? (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          onClick={() => {
                                            if (member.authorizedClerkUserId) {
                                              handleRevokeAccess(
                                                member.authorizedClerkUserId,
                                              );
                                            }
                                          }}
                                          disabled={isLoadingAuth}
                                          className="h-9 w-9"
                                          title="권한 해제"
                                        >
                                          <UserX className="h-4 w-4" />
                                        </Button>
                                      ) : (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          onClick={() =>
                                            handleGrantSpouseAccess(member)
                                          }
                                          disabled={
                                            isLoadingAuth || !member.email
                                          }
                                          className="h-9 w-9"
                                          title="권한 부여"
                                        >
                                          <UserCheck className="h-4 w-4" />
                                        </Button>
                                      );
                                    })()}
                                  </div>
                                )}
                            </div>
                          </div>

                          {/* 네 번째 줄: 전화번호 */}
                          <div className="space-y-2">
                            <Label>전화번호</Label>
                            <Input
                              value={member.phone}
                              onChange={(e) =>
                                updateFamilyMember(
                                  member.id,
                                  "phone",
                                  e.target.value,
                                )
                              }
                              placeholder="010-1234-5678"
                              className="text-xs md:text-sm lg:text-base"
                            />
                          </div>

                          {/* 다섯 번째 줄: 메모 */}
                          <div className="space-y-2">
                            <Label>메모</Label>
                            <Input
                              value={member.notes}
                              onChange={(e) =>
                                updateFamilyMember(
                                  member.id,
                                  "notes",
                                  e.target.value,
                                )
                              }
                              placeholder="추가 정보 (선택사항)"
                              className="text-xs md:text-sm lg:text-base"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 비상연락망 정보 입력 (단독 이주 선택 시) */}
          {formData.movingType === "단독 이주" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  비상연락망 ({formData.emergencyContacts.length}/2)
                </Label>
                <Button
                  type="button"
                  onClick={addEmergencyContact}
                  variant="outline"
                  size="sm"
                  disabled={formData.emergencyContacts.length >= 2}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  연락처 추가
                </Button>
              </div>
              {formData.emergencyContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  비상연락망을 추가해주세요. (최대 2명)
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.emergencyContacts.map((contact) => (
                    <Card key={contact.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">비상연락망</CardTitle>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEmergencyContact(contact.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {/* 첫 번째 줄: 이름과 관계 */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>
                                이름 <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                value={contact.name}
                                onChange={(e) =>
                                  updateEmergencyContact(
                                    contact.id,
                                    "name",
                                    e.target.value,
                                  )
                                }
                                placeholder="이름"
                                required
                                className="text-xs md:text-sm lg:text-base"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>
                                관계 <span className="text-destructive">*</span>
                              </Label>
                              <Select
                                value={contact.relationship}
                                onValueChange={(value) =>
                                  updateEmergencyContact(
                                    contact.id,
                                    "relationship",
                                    value,
                                  )
                                }
                                required
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="관계 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="가족">가족</SelectItem>
                                  <SelectItem value="친구">친구</SelectItem>
                                  <SelectItem value="지인">지인</SelectItem>
                                  <SelectItem value="동료">동료</SelectItem>
                                  <SelectItem value="기타">기타</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* 두 번째 줄: 전화번호(한국)와 이메일 */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>
                                전화번호(한국){" "}
                                <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                value={contact.phoneKr}
                                onChange={(e) =>
                                  updateEmergencyContact(
                                    contact.id,
                                    "phoneKr",
                                    e.target.value,
                                  )
                                }
                                placeholder="010-1234-5678"
                                required
                                className="text-xs md:text-sm lg:text-base"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>이메일</Label>
                              <Input
                                type="email"
                                value={contact.email}
                                onChange={(e) =>
                                  updateEmergencyContact(
                                    contact.id,
                                    "email",
                                    e.target.value,
                                  )
                                }
                                placeholder="example@email.com"
                                className="text-xs md:text-sm lg:text-base"
                              />
                            </div>
                          </div>

                          {/* 세 번째 줄: 카카오ID */}
                          <div className="space-y-2">
                            <Label>카카오ID</Label>
                            <Input
                              value={contact.kakaoId}
                              onChange={(e) =>
                                updateEmergencyContact(
                                  contact.id,
                                  "kakaoId",
                                  e.target.value,
                                )
                              }
                              placeholder="카카오톡 ID (선택사항)"
                              className="text-xs md:text-sm lg:text-base"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button type="submit" size="lg" disabled={isSaving}>
          {isSaving ? "저장 중..." : "저장하기"}
        </Button>
      </div>
    </form>
  );
}

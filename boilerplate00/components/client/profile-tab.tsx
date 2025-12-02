"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
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

export default function ProfileTab({ initialData, onSave, isSaving = false }: ProfileTabProps) {
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
        emergencyContacts: initialData.emergencyContacts ?? prev.emergencyContacts,
      }));
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
  const updateFamilyMember = (id: string, field: keyof FamilyMember, value: any) => {
    setFormData((prev) => ({
      ...prev,
      familyMembers: prev.familyMembers.map((member) =>
        member.id === id ? { ...member, [field]: value } : member
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
      emergencyContacts: prev.emergencyContacts.filter((contact) => contact.id !== id),
    }));
  };

  // 비상연락망 업데이트
  const updateEmergencyContact = (id: string, field: keyof EmergencyContact, value: any) => {
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.map((contact) =>
        contact.id === id ? { ...contact, [field]: value } : contact
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 기본 정보 필수 항목 검증
    if (!formData.name || !formData.email || !formData.occupation || !formData.movingDate || !formData.relocationType) {
      toast({
        title: "필수 항목을 입력해주세요",
        description: "이름, 이메일, 직업, 이주 예정일, 이주 목적은 필수 항목입니다.",
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
            description: "비상연락망의 이름, 관계, 전화번호(한국)는 필수 항목입니다.",
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                이름 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="홍길동"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                이메일 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="example@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="010-1234-5678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="occupation">
                직업 <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.occupation}
                onValueChange={(value) => setFormData({ ...formData, occupation: value })}
                required
              >
                <SelectTrigger id="occupation">
                  <SelectValue placeholder="직업을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doctor">의사</SelectItem>
                  <SelectItem value="employee">회사 직원</SelectItem>
                  <SelectItem value="student">학생</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="relocationType">
                이주 목적 <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.relocationType}
                onValueChange={(value) => setFormData({ ...formData, relocationType: value })}
                required
              >
                <SelectTrigger id="relocationType">
                  <SelectValue placeholder="이주 목적을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="주재원">주재원</SelectItem>
                  <SelectItem value="학업">학업</SelectItem>
                  <SelectItem value="출장">출장</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>
                이주 예정일 <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.movingDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.movingDate ? (
                      format(formData.movingDate, "PPP", { locale: ko })
                    ) : (
                      <span>날짜를 선택하세요</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.movingDate}
                    onSelect={(date) => setFormData({ ...formData, movingDate: date })}
                    initialFocus
                    className="pointer-events-auto"
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>생년월일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.birthDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.birthDate ? (
                      format(formData.birthDate, "PPP", { locale: ko })
                    ) : (
                      <span>생년월일을 선택하세요 (선택사항)</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.birthDate}
                    onSelect={(date) => setFormData({ ...formData, birthDate: date })}
                    initialFocus
                    className="pointer-events-auto"
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>
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
              onValueChange={(value) => setFormData({ ...formData, movingType: value })}
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
                <Button type="button" onClick={addFamilyMember} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  가족 추가
                </Button>
              </div>
              {formData.familyMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">가족 구성원을 추가해주세요.</p>
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
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>
                            이름 <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            value={member.name}
                            onChange={(e) => updateFamilyMember(member.id, "name", e.target.value)}
                            placeholder="이름"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>
                            관계 <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={member.relationship}
                            onValueChange={(value) => updateFamilyMember(member.id, "relationship", value)}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="관계 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="배우자">배우자</SelectItem>
                              <SelectItem value="자녀">자녀</SelectItem>
                              <SelectItem value="부모">부모</SelectItem>
                              <SelectItem value="형제자매">형제자매</SelectItem>
                              <SelectItem value="기타">기타</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>생년월일</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !member.birthDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {member.birthDate ? (
                                  format(member.birthDate, "PPP", { locale: ko })
                                ) : (
                                  <span>선택 (선택사항)</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={member.birthDate}
                                onSelect={(date) => updateFamilyMember(member.id, "birthDate", date)}
                                initialFocus
                                locale={ko}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label>전화번호</Label>
                          <Input
                            value={member.phone}
                            onChange={(e) => updateFamilyMember(member.id, "phone", e.target.value)}
                            placeholder="010-1234-5678"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>이메일</Label>
                          <Input
                            type="email"
                            value={member.email}
                            onChange={(e) => updateFamilyMember(member.id, "email", e.target.value)}
                            placeholder="example@email.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>메모</Label>
                          <Input
                            value={member.notes}
                            onChange={(e) => updateFamilyMember(member.id, "notes", e.target.value)}
                            placeholder="추가 정보 (선택사항)"
                          />
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
                <p className="text-sm text-muted-foreground">비상연락망을 추가해주세요. (최대 2명)</p>
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
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>
                            이름 <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            value={contact.name}
                            onChange={(e) => updateEmergencyContact(contact.id, "name", e.target.value)}
                            placeholder="이름"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>
                            관계 <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={contact.relationship}
                            onValueChange={(value) => updateEmergencyContact(contact.id, "relationship", value)}
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
                        <div className="space-y-2">
                          <Label>
                            전화번호(한국) <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            value={contact.phoneKr}
                            onChange={(e) => updateEmergencyContact(contact.id, "phoneKr", e.target.value)}
                            placeholder="010-1234-5678"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>이메일</Label>
                          <Input
                            type="email"
                            value={contact.email}
                            onChange={(e) => updateEmergencyContact(contact.id, "email", e.target.value)}
                            placeholder="example@email.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>카카오ID</Label>
                          <Input
                            value={contact.kakaoId}
                            onChange={(e) => updateEmergencyContact(contact.id, "kakaoId", e.target.value)}
                            placeholder="카카오톡 ID (선택사항)"
                          />
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

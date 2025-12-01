"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  occupation: string;
  movingDate: Date | undefined;
  relocationType: string;
  birthDate: Date | undefined;
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
    birthDate: initialData?.birthDate,
  });

  // initialData가 변경될 때 formData 업데이트 (저장 후 반영)
  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        name: initialData.name ?? prev.name,
        email: initialData.email ?? prev.email,
        phone: initialData.phone ?? prev.phone,
        occupation: initialData.occupation ?? prev.occupation,
        movingDate: initialData.movingDate ?? prev.movingDate,
        relocationType: initialData.relocationType ?? prev.relocationType,
        birthDate: initialData.birthDate ?? prev.birthDate,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.name, initialData?.email, initialData?.phone, initialData?.occupation, initialData?.movingDate, initialData?.relocationType, initialData?.birthDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.occupation || !formData.movingDate || !formData.relocationType) {
      toast({
        title: "필수 항목을 입력해주세요",
        description: "이름, 이메일, 직업, 이주 예정일, 이주 형태는 필수 항목입니다.",
        variant: "destructive",
      });
      return;
    }

    // 프로필 저장 시도 로그
    console.log("[ProfileTab] 프로필 저장 시도:", {
      name: formData.name,
      email: formData.email,
      occupation: formData.occupation,
      movingDate: formData.movingDate,
      relocationType: formData.relocationType,
      birthDate: formData.birthDate,
    });

    // onSave가 async 함수일 수 있으므로 await 처리
    await onSave?.(formData);
    // toast는 onSave 내부에서 처리하도록 변경 (API 호출 성공/실패에 따라)
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
            이주 형태 <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.relocationType}
            onValueChange={(value) => setFormData({ ...formData, relocationType: value })}
            required
          >
            <SelectTrigger id="relocationType">
              <SelectValue placeholder="이주 형태를 선택하세요" />
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
          <Label>
            생년월일
          </Label>
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

      <div className="flex justify-end pt-4">
        <Button type="submit" size="lg" disabled={isSaving}>
          {isSaving ? "저장 중..." : "저장하기"}
        </Button>
      </div>
    </form>
  );
}


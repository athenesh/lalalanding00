import { useState } from "react";
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
}

interface ProfileTabProps {
  initialData?: Partial<ProfileData>;
  onSave?: (data: ProfileData) => void;
}

const ProfileTab = ({ initialData, onSave }: ProfileTabProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ProfileData>({
    name: initialData?.name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    occupation: initialData?.occupation || "",
    movingDate: initialData?.movingDate,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.occupation || !formData.movingDate) {
      toast({
        title: "필수 항목을 입력해주세요",
        description: "이름, 이메일, 직업, 이주 예정일은 필수 항목입니다.",
        variant: "destructive",
      });
      return;
    }

    onSave?.(formData);
    toast({
      title: "저장 완료",
      description: "프로필 정보가 성공적으로 저장되었습니다.",
    });
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
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" size="lg">
          저장하기
        </Button>
      </div>
    </form>
  );
};

export default ProfileTab;

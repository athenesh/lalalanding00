"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

interface HousingData {
  preferredArea: string;
  maxBudget: string;
  housingType: string;
  bedrooms: string;
  bathrooms: string;
}

interface HousingTabProps {
  initialData?: Partial<HousingData>;
  onSave?: (data: HousingData) => void;
}

export default function HousingTab({ initialData, onSave }: HousingTabProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<HousingData>({
    preferredArea: initialData?.preferredArea || "",
    maxBudget: initialData?.maxBudget || "",
    housingType: initialData?.housingType || "apartment",
    bedrooms: initialData?.bedrooms || "2",
    bathrooms: initialData?.bathrooms || "2",
  });

  // initialData가 변경될 때 formData 업데이트 (저장 후 반영)
  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        preferredArea: initialData.preferredArea ?? prev.preferredArea,
        maxBudget: initialData.maxBudget ?? prev.maxBudget,
        housingType: initialData.housingType ?? prev.housingType,
        bedrooms: initialData.bedrooms ?? prev.bedrooms,
        bathrooms: initialData.bathrooms ?? prev.bathrooms,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.preferredArea, initialData?.maxBudget, initialData?.housingType, initialData?.bedrooms, initialData?.bathrooms]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave?.(formData);
    toast({
      title: "저장 완료",
      description: "주거 옵션이 성공적으로 저장되었습니다.",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="area">희망 지역</Label>
          <Input
            id="area"
            value={formData.preferredArea}
            onChange={(e) => setFormData({ ...formData, preferredArea: e.target.value })}
            placeholder="예: 로스앤젤레스, CA"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget">최대 예산 (USD/월)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="budget"
              type="number"
              value={formData.maxBudget}
              onChange={(e) => setFormData({ ...formData, maxBudget: e.target.value })}
              placeholder="3000"
              className="pl-8"
            />
          </div>
          <p className="text-sm text-muted-foreground">💡 월 임대료 기준입니다</p>
        </div>

        <div className="space-y-3">
          <Label>주거 형태</Label>
          <RadioGroup
            value={formData.housingType}
            onValueChange={(value) => setFormData({ ...formData, housingType: value })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="apartment" id="apartment" />
              <Label htmlFor="apartment" className="font-normal cursor-pointer">
                아파트
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="house" id="house" />
              <Label htmlFor="house" className="font-normal cursor-pointer">
                단독주택
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="townhouse" id="townhouse" />
              <Label htmlFor="townhouse" className="font-normal cursor-pointer">
                타운하우스
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>침실 수</Label>
          <div className="flex gap-2 flex-wrap">
            {["Studio", "1", "2", "3", "4+"].map((num) => (
              <Button
                key={num}
                type="button"
                variant={formData.bedrooms === num ? "default" : "outline"}
                onClick={() => setFormData({ ...formData, bedrooms: num })}
                className="flex-1 min-w-[80px]"
              >
                {num}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>욕실 수</Label>
          <div className="flex gap-2 flex-wrap">
            {["1", "1.5", "2", "2.5", "3+"].map((num) => (
              <Button
                key={num}
                type="button"
                variant={formData.bathrooms === num ? "default" : "outline"}
                onClick={() => setFormData({ ...formData, bathrooms: num })}
                className="flex-1 min-w-[80px]"
              >
                {num}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" size="lg">
          저장하기
        </Button>
      </div>
    </form>
  );
}


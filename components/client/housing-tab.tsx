"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface HousingData {
  preferredArea: string;
  maxBudget: string;
  housingType: string[];
  bedrooms: string;
  bathrooms: string;
  furnished: boolean;
  hasWasherDryer: boolean;
  parking: boolean;
  parkingCount: string;
  hasPets: boolean;
  petDetails: string;
  schoolDistrict: boolean;
  workplaceAddress: string;
  additionalNotes: string;
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
    housingType: initialData?.housingType || [],
    bedrooms: initialData?.bedrooms || "2",
    bathrooms: initialData?.bathrooms || "2",
    furnished: initialData?.furnished ?? false,
    hasWasherDryer: initialData?.hasWasherDryer ?? false,
    parking: initialData?.parking ?? false,
    parkingCount: initialData?.parkingCount || "",
    hasPets: initialData?.hasPets ?? false,
    petDetails: initialData?.petDetails || "",
    schoolDistrict: initialData?.schoolDistrict ?? false,
    workplaceAddress: initialData?.workplaceAddress || "",
    additionalNotes: initialData?.additionalNotes || "",
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
        furnished: initialData.furnished ?? prev.furnished,
        hasWasherDryer: initialData.hasWasherDryer ?? prev.hasWasherDryer,
        parking: initialData.parking ?? prev.parking,
        parkingCount: initialData.parkingCount ?? prev.parkingCount,
        hasPets: initialData.hasPets ?? prev.hasPets,
        petDetails: initialData.petDetails ?? prev.petDetails,
        schoolDistrict: initialData.schoolDistrict ?? prev.schoolDistrict,
        workplaceAddress: initialData.workplaceAddress ?? prev.workplaceAddress,
        additionalNotes: initialData.additionalNotes ?? prev.additionalNotes,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialData?.preferredArea,
    initialData?.maxBudget,
    initialData?.housingType,
    initialData?.bedrooms,
    initialData?.bathrooms,
    initialData?.furnished,
    initialData?.hasWasherDryer,
    initialData?.parking,
    initialData?.parkingCount,
    initialData?.hasPets,
    initialData?.petDetails,
    initialData?.schoolDistrict,
    initialData?.workplaceAddress,
    initialData?.additionalNotes,
  ]);

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
        <div className="flex flex-row gap-4">
          <div className="space-y-2 flex-1">
            <Label htmlFor="area">희망 지역</Label>
            <Input
              id="area"
              value={formData.preferredArea}
              onChange={(e) =>
                setFormData({ ...formData, preferredArea: e.target.value })
              }
              placeholder="예: 로스앤젤레스, CA"
            />
          </div>

          <div className="space-y-2 flex-1">
            <Label htmlFor="budget">최대 예산 (USD/월)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="budget"
                type="number"
                value={formData.maxBudget}
                onChange={(e) =>
                  setFormData({ ...formData, maxBudget: e.target.value })
                }
                placeholder="3000"
                className="pl-8"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              💡 월 임대료 기준입니다
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Label>주거 형태</Label>
          <div className="flex flex-row gap-4 flex-wrap">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="apartment"
                checked={formData.housingType.includes("apartment")}
                onCheckedChange={(checked) => {
                  const newTypes = checked
                    ? [...formData.housingType, "apartment"]
                    : formData.housingType.filter(
                        (type) => type !== "apartment",
                      );
                  setFormData({ ...formData, housingType: newTypes });
                }}
              />
              <Label htmlFor="apartment" className="font-normal cursor-pointer">
                아파트
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="house"
                checked={formData.housingType.includes("house")}
                onCheckedChange={(checked) => {
                  const newTypes = checked
                    ? [...formData.housingType, "house"]
                    : formData.housingType.filter((type) => type !== "house");
                  setFormData({ ...formData, housingType: newTypes });
                }}
              />
              <Label htmlFor="house" className="font-normal cursor-pointer">
                단독주택
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="townhouse"
                checked={formData.housingType.includes("townhouse")}
                onCheckedChange={(checked) => {
                  const newTypes = checked
                    ? [...formData.housingType, "townhouse"]
                    : formData.housingType.filter(
                        (type) => type !== "townhouse",
                      );
                  setFormData({ ...formData, housingType: newTypes });
                }}
              />
              <Label htmlFor="townhouse" className="font-normal cursor-pointer">
                타운하우스
              </Label>
            </div>
          </div>
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

      {/* 편의 시설 섹션 */}
      <div className="space-y-4 pt-6 border-t">
        <h3 className="text-lg font-semibold">편의 시설</h3>
        <div className="flex flex-row gap-4 flex-wrap">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="furnished"
              checked={formData.furnished}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, furnished: checked === true })
              }
            />
            <Label htmlFor="furnished" className="font-normal cursor-pointer">
              가구 포함
            </Label>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasWasherDryer"
                checked={formData.hasWasherDryer}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, hasWasherDryer: checked === true })
                }
              />
              <Label
                htmlFor="hasWasherDryer"
                className="font-normal cursor-pointer whitespace-nowrap"
              >
                세탁기/건조기
              </Label>
            </div>
            <span className="text-xs text-muted-foreground ml-6 mt-1">
              세탁기와 건조기가 있는 집은 시세보다 비쌀 수도 있습니다
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="parking"
              checked={formData.parking}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  parking: checked === true,
                  parkingCount: checked === true ? formData.parkingCount : "",
                })
              }
            />
            <Label htmlFor="parking" className="font-normal cursor-pointer">
              주차장
            </Label>
          </div>
        </div>

        {formData.parking && (
          <div className="space-y-3 ml-6">
            <Label>차량 수</Label>
            <div className="flex gap-2 flex-wrap">
              {["1", "2", "3", "4+"].map((num) => (
                <Button
                  key={num}
                  type="button"
                  variant={
                    formData.parkingCount === num ? "default" : "outline"
                  }
                  onClick={() =>
                    setFormData({ ...formData, parkingCount: num })
                  }
                  className="flex-1 min-w-[80px]"
                >
                  {num}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 특별 요구사항 섹션 */}
      <div className="space-y-4 pt-6 border-t">
        <h3 className="text-lg font-semibold">특별 요구사항</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasPets"
              checked={formData.hasPets}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, hasPets: checked === true })
              }
            />
            <Label htmlFor="hasPets" className="font-normal cursor-pointer">
              반려동물
            </Label>
          </div>

          {formData.hasPets && (
            <div className="space-y-2 ml-6">
              <Label htmlFor="petDetails">반려동물 상세</Label>
              <Textarea
                id="petDetails"
                value={formData.petDetails}
                onChange={(e) =>
                  setFormData({ ...formData, petDetails: e.target.value })
                }
                placeholder="예: 강아지 2마리, 고양이 1마리"
                rows={3}
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="schoolDistrict"
              checked={formData.schoolDistrict}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, schoolDistrict: checked === true })
              }
            />
            <Label
              htmlFor="schoolDistrict"
              className="font-normal cursor-pointer"
            >
              학군 중요
            </Label>
          </div>
        </div>
      </div>

      {/* 위치 정보 섹션 */}
      <div className="space-y-4 pt-6 border-t">
        <h3 className="text-lg font-semibold">위치 정보</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workplaceAddress">직장 주소</Label>
            <Input
              id="workplaceAddress"
              value={formData.workplaceAddress}
              onChange={(e) =>
                setFormData({ ...formData, workplaceAddress: e.target.value })
              }
              placeholder="예: 123 Main St, Los Angeles, CA 90001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalNotes">추가 요청사항</Label>
            <Textarea
              id="additionalNotes"
              value={formData.additionalNotes}
              onChange={(e) =>
                setFormData({ ...formData, additionalNotes: e.target.value })
              }
              placeholder="기타 요청사항을 입력해주세요"
              rows={4}
            />
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

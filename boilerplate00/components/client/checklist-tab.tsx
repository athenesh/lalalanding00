"use client";

import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Link as LinkIcon, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

interface ChecklistTabProps {
  initialData?: ChecklistCategory[];
  onSave?: (data: ChecklistCategory[]) => void;
}

export default function ChecklistTab({
  initialData,
  onSave,
}: ChecklistTabProps) {
  const [checklist, setChecklist] = useState<ChecklistCategory[]>(
    initialData || initialChecklist,
  );
  const { toast } = useToast();
  const [noteDialogOpen, setNoteDialogOpen] = useState<{
    categoryId: string;
    itemId: string;
  } | null>(null);
  const [urlDialogOpen, setUrlDialogOpen] = useState<{
    categoryId: string;
    itemId: string;
  } | null>(null);
  const [noteValue, setNoteValue] = useState("");
  const [urlValue, setUrlValue] = useState("");

  // initialData가 변경될 때 checklist 업데이트
  useEffect(() => {
    if (initialData) {
      setChecklist(initialData);
    }
  }, [initialData]);

  const toggleItem = (categoryId: string, itemId: string) => {
    setChecklist((prev) =>
      prev.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              items: category.items.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      completed: !item.completed,
                      completedAt: !item.completed ? new Date() : undefined,
                    }
                  : item,
              ),
            }
          : category,
      ),
    );
  };

  const openNoteDialog = (categoryId: string, itemId: string) => {
    const item = checklist
      .find((cat) => cat.id === categoryId)
      ?.items.find((it) => it.id === itemId);
    setNoteValue(item?.notes || "");
    setNoteDialogOpen({ categoryId, itemId });
  };

  const saveNote = () => {
    if (!noteDialogOpen) return;
    setChecklist((prev) =>
      prev.map((category) =>
        category.id === noteDialogOpen.categoryId
          ? {
              ...category,
              items: category.items.map((item) =>
                item.id === noteDialogOpen.itemId
                  ? { ...item, notes: noteValue }
                  : item,
              ),
            }
          : category,
      ),
    );
    setNoteDialogOpen(null);
    setNoteValue("");
    toast({
      title: "메모 저장 완료",
      description: "메모가 성공적으로 저장되었습니다.",
    });
  };

  const openUrlDialog = (categoryId: string, itemId: string) => {
    const item = checklist
      .find((cat) => cat.id === categoryId)
      ?.items.find((it) => it.id === itemId);
    setUrlValue(item?.referenceUrl || "");
    setUrlDialogOpen({ categoryId, itemId });
  };

  const saveUrl = () => {
    if (!urlDialogOpen) return;
    // URL 유효성 검사
    if (urlValue && !urlValue.match(/^https?:\/\/.+/)) {
      toast({
        title: "URL 형식 오류",
        description:
          "올바른 URL 형식을 입력해주세요 (http:// 또는 https://로 시작)",
        variant: "destructive",
      });
      return;
    }
    setChecklist((prev) =>
      prev.map((category) =>
        category.id === urlDialogOpen.categoryId
          ? {
              ...category,
              items: category.items.map((item) =>
                item.id === urlDialogOpen.itemId
                  ? { ...item, referenceUrl: urlValue || undefined }
                  : item,
              ),
            }
          : category,
      ),
    );
    setUrlDialogOpen(null);
    setUrlValue("");
    toast({
      title: "URL 저장 완료",
      description: "참고 URL이 성공적으로 저장되었습니다.",
    });
  };

  const handleSave = () => {
    onSave?.(checklist);
    toast({
      title: "저장 완료",
      description: "체크리스트가 성공적으로 저장되었습니다.",
    });
  };

  const totalItems = checklist.reduce((sum, cat) => sum + cat.items.length, 0);
  const completedItems = checklist.reduce(
    (sum, cat) => sum + cat.items.filter((item) => item.completed).length,
    0,
  );
  const completionPercentage = Math.round((completedItems / totalItems) * 100);

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">전체 진행률</h3>
          <span className="text-2xl font-bold text-primary">
            {completionPercentage}%
          </span>
        </div>
        <Progress value={completionPercentage} className="h-3" />
        <p className="text-sm text-muted-foreground">
          {completedItems}/{totalItems} 완료
        </p>
      </div>

      <Accordion
        type="multiple"
        defaultValue={["pre-departure", "arrival", "settlement"]}
        className="space-y-4"
      >
        {checklist.map((category) => {
          const categoryCompleted = category.items.filter(
            (item) => item.completed,
          ).length;
          const categoryTotal = category.items.length;
          const categoryPercentage = Math.round(
            (categoryCompleted / categoryTotal) * 100,
          );

          return (
            <AccordionItem
              key={category.id}
              value={category.id}
              className="border border-border rounded-lg bg-card overflow-hidden"
            >
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.emoji}</span>
                    <div className="text-left">
                      <h4 className="font-semibold">{category.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {categoryCompleted}/{categoryTotal} 완료
                      </p>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-primary">
                    {categoryPercentage}%
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <div className="space-y-4 pt-2">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "p-4 rounded-lg border transition-colors",
                        item.completed
                          ? "bg-success/10 border-success/20"
                          : "bg-background border-border",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={item.id}
                          checked={item.completed}
                          onCheckedChange={() =>
                            toggleItem(category.id, item.id)
                          }
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <label
                              htmlFor={item.id}
                              className={cn(
                                "font-medium cursor-pointer",
                                item.completed &&
                                  "line-through text-muted-foreground",
                              )}
                            >
                              {item.title}
                            </label>
                            {item.isRequired && (
                              <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded">
                                필수
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {item.description.map((desc, idx) => (
                              <p key={idx}>{desc}</p>
                            ))}
                          </div>
                          {item.completed && item.completedAt && (
                            <p className="text-xs text-muted-foreground">
                              완료 시간:{" "}
                              {item.completedAt.toLocaleString("ko-KR")}
                            </p>
                          )}
                          <div className="flex items-center gap-2 pt-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                openNoteDialog(category.id, item.id)
                              }
                              className="h-8 gap-1"
                            >
                              <FileText className="h-4 w-4" />
                              {item.notes ? "메모 수정" : "메모 추가"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                openUrlDialog(category.id, item.id)
                              }
                              className="h-8 gap-1"
                            >
                              <LinkIcon className="h-4 w-4" />
                              {item.referenceUrl ? "URL 수정" : "URL 추가"}
                            </Button>
                            {item.referenceUrl && (
                              <a
                                href={item.referenceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline text-sm flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                링크 열기
                              </a>
                            )}
                          </div>
                          {item.notes && (
                            <div className="mt-2 p-2 bg-muted rounded text-sm">
                              <p className="font-medium mb-1">메모:</p>
                              <p className="text-muted-foreground whitespace-pre-wrap">
                                {item.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* 저장 버튼 */}
      <div className="flex justify-end pt-4">
        <Button type="button" onClick={handleSave} size="lg">
          저장하기
        </Button>
      </div>

      {/* 메모 입력 다이얼로그 */}
      <Dialog
        open={noteDialogOpen !== null}
        onOpenChange={(open) => !open && setNoteDialogOpen(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>메모 추가</DialogTitle>
            <DialogDescription>
              이 항목에 대한 메모를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="메모를 입력하세요..."
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(null)}>
              취소
            </Button>
            <Button onClick={saveNote}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* URL 입력 다이얼로그 */}
      <Dialog
        open={urlDialogOpen !== null}
        onOpenChange={(open) => !open && setUrlDialogOpen(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>참고 URL 추가</DialogTitle>
            <DialogDescription>
              이 항목과 관련된 참고 링크를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUrlDialogOpen(null)}>
              취소
            </Button>
            <Button onClick={saveUrl}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

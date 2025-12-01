"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calendar, CheckSquare, MessageSquare, UserPlus, CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface ClientCardProps {
  id: string;
  name: string;
  occupation: string;
  movingDate: string;
  checklistCompletion: number;
  checklistTotal: number;
  checklistCompleted: number;
  lastChatTime?: string;
  isUnassigned?: boolean;
  isProfileComplete?: boolean;
  onAssign?: () => void;
}

export default function ClientCard({
  id,
  name,
  occupation,
  movingDate,
  checklistCompletion,
  checklistTotal,
  checklistCompleted,
  lastChatTime,
  isUnassigned = false,
  isProfileComplete = false,
  onAssign,
}: ClientCardProps) {
  const router = useRouter();

  const occupationLabels: Record<string, string> = {
    doctor: "의사",
    employee: "회사 직원",
    student: "학생",
  };

  const daysUntilMoving = movingDate
    ? Math.ceil(
        (new Date(movingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const handleCardClick = (e: React.MouseEvent) => {
    // 할당 버튼 클릭 시에는 카드 클릭 이벤트 방지
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    if (!isUnassigned) {
      router.push(`/agent/client/${id}`);
    }
  };

  return (
    <Card 
      className={`client-card ${!isUnassigned ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold">{name}</h3>
              {isProfileComplete !== undefined && (
                <Badge variant={isProfileComplete ? "default" : "secondary"} className="gap-1 text-xs">
                  {isProfileComplete ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      프로필 완료
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3" />
                      프로필 미완료
                    </>
                  )}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {occupationLabels[occupation] || occupation}
              {movingDate && ` · ${new Date(movingDate).toLocaleDateString('ko-KR')} 이주 예정`}
              {!movingDate && " · 이주 예정일 미입력"}
            </p>
          </div>
          {daysUntilMoving !== null && (
            <Badge variant="secondary" className="gap-1">
              <Calendar className="h-3 w-3" />
              D-{daysUntilMoving}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isUnassigned ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {isProfileComplete
                ? "프로필이 완료된 클라이언트입니다."
                : "프로필 작성이 완료되지 않았습니다."}
            </div>
            {onAssign && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onAssign();
                }}
                className="w-full gap-2"
                variant="default"
              >
                <UserPlus className="h-4 w-4" />
                내 클라이언트로 추가
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">준비 진행도</span>
                <span className="font-semibold">{checklistCompletion}%</span>
              </div>
              <Progress value={checklistCompletion} className="h-2" />
            </div>

            <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckSquare className="h-4 w-4" />
                <span>체크리스트: {checklistCompleted}/{checklistTotal} 완료</span>
              </div>
            </div>

            {lastChatTime && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span>최근 채팅: {lastChatTime}</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}


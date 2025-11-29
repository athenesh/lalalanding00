"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, CheckSquare, MessageSquare } from "lucide-react";
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
}: ClientCardProps) {
  const router = useRouter();

  const occupationLabels: Record<string, string> = {
    doctor: "의사",
    employee: "회사 직원",
    student: "학생",
  };

  const daysUntilMoving = Math.ceil(
    (new Date(movingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card 
      className="client-card cursor-pointer" 
      onClick={() => router.push(`/agent/client/${id}`)}
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold">{name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {occupationLabels[occupation]} · {new Date(movingDate).toLocaleDateString('ko-KR')} 이주 예정
            </p>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Calendar className="h-3 w-3" />
            D-{daysUntilMoving}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  );
}


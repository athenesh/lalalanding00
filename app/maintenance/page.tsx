import { Wrench } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
            <Wrench className="h-10 w-10 text-warning" />
          </div>
          <CardTitle className="text-3xl">서비스 점검 중</CardTitle>
          <CardDescription className="text-base">
            현재 서비스 점검 중입니다.
            <br />
            잠시 후 다시 이용해 주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>점검 시간 동안 서비스를 이용하실 수 없습니다.</p>
            <p className="mt-2">오후 8시 전까지 정상화될 예정입니다.</p>
          </div>
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              문의사항이 있으시면 에이전트의 연락처로 연락해 주세요.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            미국 이주 준비 플랫폼
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            체계적인 이주 준비와 효율적인 클라이언트 관리를 위한 올인원 솔루션
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-xl transition-all duration-200 cursor-pointer group" onClick={() => navigate('/agent/dashboard')}>
            <CardHeader className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Briefcase className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">에이전트</CardTitle>
              <CardDescription className="text-base">
                여러 클라이언트를 효율적으로 관리하고 이주 준비를 지원하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" size="lg">
                에이전트로 시작하기
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-all duration-200 cursor-pointer group" onClick={() => navigate('/client/home')}>
            <CardHeader className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                <Users className="h-8 w-8 text-success" />
              </div>
              <CardTitle className="text-2xl">클라이언트</CardTitle>
              <CardDescription className="text-base">
                체계적인 준비 과정을 통해 안전한 미국 이주를 시작하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-success hover:bg-success/90" size="lg">
                클라이언트로 시작하기
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>LA/OC 지역 한인 이주 지원 전문 플랫폼</p>
        </div>
      </div>
    </div>
  );
};

export default Index;

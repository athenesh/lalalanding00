"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

/**
 * 기존 역할 선택 페이지는 더 이상 사용되지 않습니다.
 * 역할별 회원가입 페이지로 리다이렉트합니다.
 */
export default function SelectRolePage() {
  const router = useRouter();
  const { userId } = useAuth();

  useEffect(() => {
    // 로그인한 사용자는 랜딩 페이지로 리다이렉트
    // (랜딩 페이지에서 역할에 따라 적절한 페이지로 리다이렉트됨)
    if (userId) {
      router.push("/");
    } else {
      // 로그인하지 않은 사용자도 랜딩 페이지로 리다이렉트
      router.push("/");
    }
  }, [userId, router]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">리다이렉트 중...</p>
      </div>
    </div>
  );
}
  const [selectedRole, setSelectedRole] = useState<"agent" | "client" | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const { userId } = useAuth();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!selectedRole || !userId) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/set-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to set role");
      }

      // 역할에 따라 적절한 페이지로 리다이렉트
      if (selectedRole === "agent") {
        router.push("/agent/dashboard");
      } else {
        router.push("/client/home");
      }
    } catch (error) {
      console.error("Error setting role:", error);
      alert("역할 설정에 실패했습니다. 다시 시도해주세요.");
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
      <div className="w-full max-w-md space-y-8 p-8 border rounded-lg shadow-lg">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">역할 선택</h1>
          <p className="text-gray-600 dark:text-gray-400">
            회원가입을 완료하기 위해 역할을 선택해주세요.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setSelectedRole("agent")}
            className={`w-full p-6 border-2 rounded-lg text-left transition-all ${
              selectedRole === "agent"
                ? "border-primary bg-primary/5"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedRole === "agent"
                    ? "border-primary bg-primary"
                    : "border-gray-300"
                }`}
              >
                {selectedRole === "agent" && (
                  <div className="w-3 h-3 rounded-full bg-white"></div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-lg">에이전트</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  클라이언트의 미국 이주를 지원하는 전문가
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedRole("client")}
            className={`w-full p-6 border-2 rounded-lg text-left transition-all ${
              selectedRole === "client"
                ? "border-primary bg-primary/5"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedRole === "client"
                    ? "border-primary bg-primary"
                    : "border-gray-300"
                }`}
              >
                {selectedRole === "client" && (
                  <div className="w-3 h-3 rounded-full bg-white"></div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-lg">클라이언트</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  미국 이주를 준비하는 의사/직원/학생
                </p>
              </div>
            </div>
          </button>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!selectedRole || loading}
          className="w-full"
        >
          {loading ? "처리 중..." : "다음"}
        </Button>
      </div>
    </div>
  );
}


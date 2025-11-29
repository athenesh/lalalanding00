import { SignUp } from "@clerk/nextjs";

export default function AgentSignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">에이전트 회원가입</h1>
          <p className="text-gray-600 dark:text-gray-400">
            클라이언트의 미국 이주를 지원하는 전문가로 가입하세요
          </p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg",
            },
          }}
          fallbackRedirectUrl="/sign-up/agent/complete"
          signInFallbackRedirectUrl="/sign-in"
          routing="path"
          path="/sign-up/agent"
        />
      </div>
    </div>
  );
}


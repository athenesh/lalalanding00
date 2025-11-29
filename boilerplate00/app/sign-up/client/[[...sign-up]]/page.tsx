import { SignUp } from "@clerk/nextjs";

export default function ClientSignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">클라이언트 회원가입</h1>
          <p className="text-gray-600 dark:text-gray-400">
            미국 이주를 준비하는 의사/직원/학생으로 가입하세요
          </p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg",
            },
          }}
          fallbackRedirectUrl="/sign-up/client/complete"
          signInFallbackRedirectUrl="/sign-in"
          routing="path"
          path="/sign-up/client"
        />
      </div>
    </div>
  );
}


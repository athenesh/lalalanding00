"use client";

import { SignedOut, SignInButton, SignedIn, UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import React from "react";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const { isLoaded } = useAuth();

  // 인증 상태가 로드되지 않았으면 아무것도 렌더링하지 않음
  if (!isLoaded) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold text-foreground hover:opacity-80 transition-opacity">
          LalaLanding
        </Link>
        <div className="flex gap-4 items-center">
          <SignedOut>
            <SignInButton mode="modal">
              <Button>로그인</Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

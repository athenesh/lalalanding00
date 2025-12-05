"use client";

import { UserButton } from "@clerk/nextjs";

interface HeaderProps {
  title: string;
  userName?: string;
}

export default function Header({ title, userName }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
        </div>
        
        {userName && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{userName}</span>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        )}
      </div>
    </header>
  );
}


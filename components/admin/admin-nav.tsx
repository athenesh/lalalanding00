"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  BarChart3,
  Settings,
} from "lucide-react";

const navItems = [
  {
    title: "대시보드",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "클라이언트",
    href: "/admin/clients",
    icon: Users,
  },
  {
    title: "에이전트",
    href: "/admin/agents",
    icon: UserCheck,
  },
  {
    title: "통계/분석",
    href: "/admin/analytics",
    icon: BarChart3,
  },
  {
    title: "설정",
    href: "/admin/settings",
    icon: Settings,
  },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="w-64 border-r border-border bg-card p-4">
      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}


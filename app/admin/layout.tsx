import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/admin/admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 관리자 권한 확인
  await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <div className="flex-1">{children}</div>
    </div>
  );
}


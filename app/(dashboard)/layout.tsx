import Sidebar from "@/components/sidebar";
import DashboardGuard from "@/components/dashboard-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardGuard>
      <div className="min-h-screen bg-black flex">
        <Sidebar />

        <main className="flex-1">{children}</main>
      </div>
    </DashboardGuard>
  );
}
"use client";

import { AdminSidebar } from "@/components/admin-sidebar";
import { Toaster } from "@/components/ui/sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-app-bg flex min-h-[100dvh] text-slate-100">
      <AdminSidebar />
      <main className="min-w-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  );
}

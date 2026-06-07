"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  AppWindow,
  ScrollText,
  LogOut,
  Shield,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "仪表盘", icon: LayoutDashboard },
  { href: "/admin/users", label: "用户管理", icon: Users },
  { href: "/admin/roles", label: "角色管理", icon: ShieldCheck },
  { href: "/admin/applications", label: "应用管理", icon: AppWindow },
  { href: "/admin/audit-logs", label: "操作日志", icon: ScrollText },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      const match = document.cookie.match(/admin_token=([^;]+)/);
      const token = match ? match[1] : null;
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // ignore logout API errors
    }
    document.cookie = "admin_token=; path=/; max-age=0";
    document.cookie = "admin_refresh_token=; path=/; max-age=0";
    localStorage.removeItem("admin_user");
    router.push("/admin/login");
  }

  const [adminUser, setAdminUser] = useState<{ username?: string; roles?: string[] }>({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const data = JSON.parse(localStorage.getItem("admin_user") || "{}");
        setAdminUser(data);
      } catch {
        // ignore
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <aside className="w-64 min-h-screen bg-slate-900/95 border-r border-slate-800/50 flex flex-col backdrop-blur">
      {/* Brand */}
      <div className="p-5 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-500/20">
            <Shield className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">User Service</h1>
            <p className="text-[11px] text-slate-500">管理后台</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5">
        <p className="px-3 pt-2 pb-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">导航</p>
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150",
                isActive
                  ? "bg-blue-500/10 text-blue-400 font-medium shadow-sm shadow-blue-500/5"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              <item.icon className={cn("w-4 h-4", isActive && "text-blue-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info + Logout */}
      <div className="p-3 border-t border-slate-800/50">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
            {adminUser.username ? adminUser.username.charAt(0).toUpperCase() : "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{adminUser.username || "Admin"}</p>
            <p className="text-[11px] text-slate-500 truncate">{adminUser.roles?.length ? adminUser.roles.join(", ") : "管理员"}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all duration-150 w-full"
        >
          <LogOut className="w-4 h-4" />
          退出登录
        </button>
      </div>
    </aside>
  );
}

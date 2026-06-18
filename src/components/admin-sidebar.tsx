"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, type CSSProperties } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  AppWindow,
  UserCog,
  ScrollText,
  BookOpenText,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "仪表盘", description: "服务概览", icon: LayoutDashboard, adminOnly: true },
  { href: "/admin/users", label: "用户管理", description: "账号与状态", icon: Users, adminOnly: true },
  { href: "/admin/application-users", label: "应用用户", description: "应用内成员", icon: UserCog, appAdminOnly: true },
  { href: "/admin/roles", label: "角色管理", description: "权限配置", icon: ShieldCheck, adminOnly: true },
  { href: "/admin/applications", label: "应用管理", description: "密钥与回调", icon: AppWindow, adminOnly: true },
  { href: "/admin/integration-docs", label: "接入文档", description: "登录与授权", icon: BookOpenText, adminOnly: true },
  { href: "/admin/audit-logs", label: "操作日志", description: "审计追踪", icon: ScrollText, adminOnly: true },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  const [adminUser, setAdminUser] = useState<{
    username?: string;
    roles?: string[];
    isAdmin?: boolean;
    managedApplications?: Array<{ id: string; name: string }>;
  }>({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const data = JSON.parse(localStorage.getItem("admin_user") || "{}");
        const savedCollapsed = localStorage.getItem("admin_sidebar_collapsed");
        setAdminUser(data);
        setIsCollapsed(savedCollapsed === "true");
      } catch {
        // ignore
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function toggleSidebar() {
    const nextCollapsed = !isCollapsed;
    setIsCollapsed(nextCollapsed);
    localStorage.setItem("admin_sidebar_collapsed", String(nextCollapsed));
  }

  function updateTogglePosition(event: ReactPointerEvent<HTMLButtonElement>) {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const handleHalfHeight = 22;
    const y = Math.min(
      Math.max(event.clientY - rect.top, handleHalfHeight),
      rect.height - handleHalfHeight
    );

    button.style.setProperty("--admin-sidebar-toggle-y", `${y}px`);
  }

  const ADMIN_ROLES = ["超级管理员", "admin", "管理员"];
  const isGlobalAdmin =
    adminUser.isAdmin ||
    adminUser.roles?.some((role) => ADMIN_ROLES.includes(role)) ||
    false;
  const hasManagedApplications = Boolean(adminUser.managedApplications?.length);
  const roleLabel = adminUser.roles?.length
    ? adminUser.roles.join(", ")
    : hasManagedApplications
      ? "应用管理员"
      : "管理员";
  const visibleNavItems = navItems.filter((item) => {
    if (item.adminOnly) return isGlobalAdmin;
    if (item.appAdminOnly) return hasManagedApplications && !isGlobalAdmin;
    return true;
  });

  return (
    <aside
      className={cn(
        "admin-sidebar group/sidebar sticky top-0 flex h-[100dvh] w-[76px] shrink-0 flex-col border-r border-white/10 transition-[width] duration-200 lg:w-72",
        isCollapsed && "lg:w-[76px]"
      )}
    >
      <button
        type="button"
        aria-label={isCollapsed ? "展开侧边栏" : "折叠侧边栏"}
        title={isCollapsed ? "展开侧边栏" : "折叠侧边栏"}
        onClick={toggleSidebar}
        onPointerEnter={updateTogglePosition}
        onPointerMove={updateTogglePosition}
        style={{ "--admin-sidebar-toggle-y": "50%" } as CSSProperties}
        className="admin-sidebar-toggle group/toggle hidden lg:flex"
      >
        <span className="admin-sidebar-toggle-handle absolute left-1/2 top-[var(--admin-sidebar-toggle-y)] -translate-x-1/2 -translate-y-1/2">
          {isCollapsed ? <PanelLeftOpen className="size-3" /> : <PanelLeftClose className="size-3" />}
        </span>
      </button>

      <div className={cn("border-b border-white/10 px-3 py-4 lg:px-5", isCollapsed && "lg:px-3")}>
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-blue-300/25 bg-blue-300/10 text-blue-200 shadow-[0_0_0_1px_rgb(255_255_255/0.04)]">
            <Shield className="size-5" />
          </div>
          <div className={cn("hidden min-w-0 lg:block", isCollapsed && "lg:hidden")}>
            <p className="truncate text-base font-semibold tracking-tight text-slate-50">
              User Service
            </p>
            <p className="mt-0.5 text-xs text-slate-500">统一身份与权限中枢</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4 lg:px-3">
        <p className={cn("hidden px-3 pb-2 text-xs font-medium text-slate-500 lg:block", isCollapsed && "lg:hidden")}>
          工作区
        </p>
        {visibleNavItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "group relative flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 lg:justify-start",
                isCollapsed && "lg:justify-center lg:px-0",
                isActive
                  ? "bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/20 dark:bg-blue-300/10 dark:text-blue-100 dark:ring-blue-300/20"
                  : "text-slate-500 hover:bg-white/[0.045] hover:text-slate-200"
              )}
            >
              <item.icon className={cn("size-4 shrink-0", isActive && "text-blue-600 dark:text-blue-200")} />
              <span className={cn("hidden min-w-0 lg:block", isCollapsed && "lg:hidden")}>
                <span className="block truncate font-medium">{item.label}</span>
                <span
                  className={cn(
                    "mt-0.5 block truncate text-xs",
                    isActive ? "text-blue-700/70 dark:text-blue-100/60" : "text-slate-600 group-hover:text-slate-500"
                  )}
                >
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-2 lg:p-3">
        <ThemeToggle
          className={cn(
            "mb-2 w-full px-0 lg:px-3",
            isCollapsed && "lg:px-0 [&_span]:hidden"
          )}
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            title={adminUser.username || "Admin"}
            className={cn(
              "flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-2 text-left outline-none transition-all duration-150 hover:bg-white/[0.055] focus-visible:ring-2 focus-visible:ring-blue-400/35 lg:justify-start lg:p-3",
              isCollapsed && "lg:justify-center lg:p-2"
            )}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-semibold text-blue-100 ring-1 ring-white/10">
              {adminUser.username ? adminUser.username.charAt(0).toUpperCase() : "A"}
            </div>
            <div className={cn("hidden min-w-0 flex-1 lg:block", isCollapsed && "lg:hidden")}>
              <p className="truncate text-sm font-medium text-slate-200">
                {adminUser.username || "Admin"}
              </p>
              <p className="truncate text-xs text-slate-500">
                {roleLabel}
              </p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="end"
            sideOffset={10}
            className="w-64 border border-white/10 bg-white p-2 text-slate-900 shadow-2xl dark:bg-slate-950 dark:text-slate-100"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 py-2">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-sm font-semibold text-blue-100 ring-1 ring-white/10">
                    {adminUser.username ? adminUser.username.charAt(0).toUpperCase() : "A"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {adminUser.username || "Admin"}
                    </p>
                    <p className="truncate text-xs font-normal text-slate-500">
                      {roleLabel}
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={handleLogout}
                className="px-2 py-2 text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-300 dark:focus:bg-red-500/10 dark:focus:text-red-200"
              >
                <LogOut className="size-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  AppWindow,
  ShieldCheck,
  ScrollText,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin-page-header";

interface Stats {
  userCount: number;
  appCount: number;
  roleCount: number;
  recentLogs: Array<{
    id: string;
    action: string;
    resource: string;
    createdAt: string;
    user: { username: string } | null;
  }>;
}

const actionLabels: Record<string, string> = {
  LOGIN: "登录",
  LOGOUT: "登出",
  REGISTER: "注册",
  CREATE_USER: "创建用户",
  UPDATE_USER: "更新用户",
  DISABLE_USER: "禁用用户",
  CREATE_ROLE: "创建角色",
  UPDATE_ROLE: "更新角色",
  DELETE_ROLE: "删除角色",
  CREATE_APP: "创建应用",
  UPDATE_APP: "更新应用",
  ASSIGN_ROLES: "分配角色",
  AUTH_CODE_EXCHANGE: "授权码兑换",
};

const actionColors: Record<string, string> = {
  LOGIN: "bg-green-500/10 text-green-400",
  LOGOUT: "bg-slate-500/10 text-slate-400",
  REGISTER: "bg-blue-500/10 text-blue-400",
  CREATE_USER: "bg-blue-500/10 text-blue-400",
  UPDATE_USER: "bg-amber-500/10 text-amber-400",
  DISABLE_USER: "bg-red-500/10 text-red-400",
  CREATE_ROLE: "bg-violet-500/10 text-violet-400",
  CREATE_APP: "bg-blue-500/10 text-blue-400",
  ASSIGN_ROLES: "bg-indigo-500/10 text-indigo-400",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, appsRes, rolesRes, logsRes] = await Promise.all([
          adminFetch("/api/users?pageSize=1"),
          adminFetch("/api/applications"),
          adminFetch("/api/roles"),
          adminFetch("/api/audit-logs?pageSize=10"),
        ]);

        setStats({
          userCount: usersRes.data?.total || 0,
          appCount: appsRes.success ? (appsRes.data?.length || 0) : 0,
          roleCount: rolesRes.data?.length || 0,
          recentLogs: logsRes.data?.items || [],
        });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const cards = [
    { title: "用户总数", value: stats?.userCount ?? "-", icon: Users, caption: "已纳入统一身份体系", link: "/admin/users" },
    { title: "接入应用", value: stats?.appCount ?? "-", icon: AppWindow, caption: "正在使用认证能力", link: "/admin/applications" },
    { title: "角色数量", value: stats?.roleCount ?? "-", icon: ShieldCheck, caption: "可分配权限集合", link: "/admin/roles" },
    { title: "近期操作", value: stats?.recentLogs?.length ?? "-", icon: ScrollText, caption: "最近 10 条审计记录", link: "/admin/audit-logs" },
  ];

  return (
    <div className="space-y-7">
      <AdminPageHeader
        title="仪表盘"
        description="查看用户、应用、角色与审计活动的关键运行状态。"
        icon={LayoutDashboard}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link key={card.title} href={card.link}>
            <Card className="admin-panel group cursor-pointer py-0 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300/25 hover:bg-white/[0.065]">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-400">{card.title}</p>
                    <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-50">
                      {loading ? (
                        <span className="inline-block h-8 w-12 animate-pulse rounded-lg bg-white/10" />
                      ) : (
                        card.value
                      )}
                    </div>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-xl border border-blue-300/20 bg-blue-300/10 text-blue-200">
                    <card.icon className="size-5" />
                  </div>
                </div>
                <p className="mt-4 text-xs leading-5 text-slate-500">{card.caption}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="admin-panel py-0">
        <CardHeader className="flex flex-row items-center justify-between border-b border-white/10 px-5 py-4">
          <CardTitle className="text-base font-semibold text-slate-50">最近操作</CardTitle>
          <Link href="/admin/audit-logs" className="flex items-center gap-1 text-sm text-blue-200 transition-colors hover:text-blue-100">
            查看全部 <ArrowRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-white/[0.055]" />
              ))}
            </div>
          ) : stats?.recentLogs?.length ? (
            <div className="divide-y divide-white/[0.06]">
              {stats.recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col gap-2 px-2 py-3 transition-colors hover:bg-white/[0.035] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-200">
                      {log.user?.username || "系统"}
                    </span>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${actionColors[log.action] || "bg-slate-500/10 text-slate-400"}`}>
                      {actionLabels[log.action] || log.action}
                    </span>
                    <span className="truncate text-xs text-slate-500">
                      {log.resource}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-slate-500">
                    {new Date(log.createdAt).toLocaleString("zh-CN")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">暂无操作记录</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

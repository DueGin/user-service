"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, AppWindow, ShieldCheck, ScrollText, ArrowRight } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import Link from "next/link";

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
  CREATE_APP: "bg-cyan-500/10 text-cyan-400",
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
          appCount: usersRes.success ? (appsRes.data?.length || 0) : 0,
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
    { title: "用户总数", value: stats?.userCount ?? "-", icon: Users, gradient: "from-blue-500 to-blue-600", bgGlow: "bg-blue-500/5", link: "/admin/users" },
    { title: "接入应用", value: stats?.appCount ?? "-", icon: AppWindow, gradient: "from-emerald-500 to-teal-600", bgGlow: "bg-emerald-500/5", link: "/admin/applications" },
    { title: "角色数量", value: stats?.roleCount ?? "-", icon: ShieldCheck, gradient: "from-violet-500 to-purple-600", bgGlow: "bg-violet-500/5", link: "/admin/roles" },
    { title: "操作日志", value: stats?.recentLogs?.length ?? "-", icon: ScrollText, gradient: "from-amber-500 to-orange-600", bgGlow: "bg-amber-500/5", link: "/admin/audit-logs" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">仪表盘</h1>
        <p className="text-slate-400 text-sm mt-1">用户基础服务总览</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link key={card.title} href={card.link}>
            <Card className="group relative overflow-hidden bg-slate-900/60 border-slate-800/50 hover:border-slate-700/80 transition-all duration-200 cursor-pointer">
              <div className={`absolute top-0 right-0 w-24 h-24 ${card.bgGlow} rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500`} />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                <CardTitle className="text-sm font-medium text-slate-400">
                  {card.title}
                </CardTitle>
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-sm`}>
                  <card.icon className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold text-white tracking-tight">
                  {loading ? (
                    <span className="inline-block w-8 h-8 bg-slate-800 rounded animate-pulse" />
                  ) : card.value}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="bg-slate-900/60 border-slate-800/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-white">最近操作</CardTitle>
          <Link href="/admin/audit-logs" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
            查看全部 <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-800/50 rounded animate-pulse" />
              ))}
            </div>
          ) : stats?.recentLogs?.length ? (
            <div className="space-y-1">
              {stats.recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-200">
                      {log.user?.username || "系统"}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${actionColors[log.action] || "bg-slate-500/10 text-slate-400"}`}>
                      {actionLabels[log.action] || log.action}
                    </span>
                    <span className="text-xs text-slate-500">
                      {log.resource}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {new Date(log.createdAt).toLocaleString("zh-CN")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-8">暂无操作记录</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

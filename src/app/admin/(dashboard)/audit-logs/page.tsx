"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollText } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin-page-header";

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  detail: Record<string, unknown> | null;
  ip: string | null;
  traceId: string | null;
  createdAt: string;
  user: { id: string; username: string } | null;
}

interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const actionLabels: Record<string, string> = {
  REGISTER: "注册", LOGIN: "登录", LOGOUT: "登出",
  CREATE_USER: "创建用户", UPDATE_USER: "更新用户", DISABLE_USER: "禁用用户",
  CREATE_ROLE: "创建角色", UPDATE_ROLE: "更新角色", DELETE_ROLE: "删除角色",
  CREATE_APPLICATION: "创建应用", UPDATE_APPLICATION: "更新应用", DISABLE_APPLICATION: "禁用应用",
  REGENERATE_API_KEY: "重置密钥", AUTH_CODE_EXCHANGE: "授权码兑换", ASSIGN_ROLES: "分配角色",
};

const actionColors: Record<string, string> = {
  REGISTER: "bg-green-500/10 text-green-400 border-green-500/20",
  LOGIN: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  LOGOUT: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  CREATE_USER: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  UPDATE_USER: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  DISABLE_USER: "bg-red-500/10 text-red-400 border-red-500/20",
  CREATE_ROLE: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  UPDATE_ROLE: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  DELETE_ROLE: "bg-red-500/10 text-red-400 border-red-500/20",
  CREATE_APPLICATION: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  UPDATE_APPLICATION: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  DISABLE_APPLICATION: "bg-red-500/10 text-red-400 border-red-500/20",
  REGENERATE_API_KEY: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  AUTH_CODE_EXCHANGE: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ASSIGN_ROLES: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [traceIdFilter, setTraceIdFilter] = useState("");

  const fetchLogs = useCallback(
    async (page = 1) => {
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: "20" });
        if (actionFilter && actionFilter !== "all") params.set("action", actionFilter);
        if (resourceFilter && resourceFilter !== "all") params.set("resource", resourceFilter);
        if (traceIdFilter.trim()) params.set("traceId", traceIdFilter.trim());

        const res = await adminFetch(`/api/audit-logs?${params}`);
        if (res.success) {
          setLogs(res.data.items);
          setPagination({
            total: res.data.total,
            page: res.data.page,
            pageSize: res.data.pageSize,
            totalPages: res.data.totalPages,
          });
        }
      } catch {
        toast.error("获取日志失败");
      } finally {
        setLoading(false);
      }
    },
    [actionFilter, resourceFilter, traceIdFilter]
  );

  const loadLogs = useCallback(
    async (page = 1) => {
      setLoading(true);
      await fetchLogs(page);
    },
    [fetchLogs]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchLogs();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="操作日志"
        description="按操作类型、资源类型和 Trace ID 追踪系统审计记录。"
        icon={ScrollText}
      />

      <Card className="admin-panel py-0">
        <CardHeader className="border-b border-white/10 px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Select value={actionFilter} onValueChange={(v) => setActionFilter(v ?? "all")}>
              <SelectTrigger className="admin-field h-9 w-full text-sm lg:w-48">
                <SelectValue placeholder="筛选操作类型" />
              </SelectTrigger>
              <SelectContent className="admin-select-content">
                <SelectItem value="all">全部操作</SelectItem>
                <SelectItem value="REGISTER">注册</SelectItem>
                <SelectItem value="LOGIN">登录</SelectItem>
                <SelectItem value="LOGOUT">登出</SelectItem>
                <SelectItem value="UPDATE_USER">更新用户</SelectItem>
                <SelectItem value="DISABLE_USER">禁用用户</SelectItem>
                <SelectItem value="CREATE_ROLE">创建角色</SelectItem>
                <SelectItem value="CREATE_APPLICATION">创建应用</SelectItem>
                <SelectItem value="REGENERATE_API_KEY">重置密钥</SelectItem>
              </SelectContent>
            </Select>
            <Select value={resourceFilter} onValueChange={(v) => setResourceFilter(v ?? "all")}>
              <SelectTrigger className="admin-field h-9 w-full text-sm lg:w-40">
                <SelectValue placeholder="筛选资源" />
              </SelectTrigger>
              <SelectContent className="admin-select-content">
                <SelectItem value="all">全部资源</SelectItem>
                <SelectItem value="user">用户</SelectItem>
                <SelectItem value="session">会话</SelectItem>
                <SelectItem value="role">角色</SelectItem>
                <SelectItem value="user_role">用户角色</SelectItem>
                <SelectItem value="application">应用</SelectItem>
                <SelectItem value="auth_code">授权码</SelectItem>
              </SelectContent>
            </Select>
            <input
              type="text"
              placeholder="搜索 Trace ID..."
              value={traceIdFilter}
              onChange={(e) => setTraceIdFilter(e.target.value)}
              className="admin-field h-9 w-full rounded-lg px-3 text-sm lg:w-56"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="px-5 text-xs font-medium text-slate-500">时间</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">用户</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">操作</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">资源</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">详情</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">IP</TableHead>
                <TableHead className="pr-5 text-xs font-medium text-slate-500">Trace ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <>
                  {[1,2,3,4,5].map(i => (
                    <TableRow key={i} className="border-white/[0.06]">
                      {[1,2,3,4,5,6,7].map(j => (
                        <TableCell key={j} className={j === 1 ? "pl-5" : j === 7 ? "pr-5" : ""}><div className="h-4 w-full animate-pulse rounded bg-white/[0.055]" /></TableCell>
                      ))}
                    </TableRow>
                  ))}
                </>
              ) : logs.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="text-center text-slate-500 py-16 text-sm">暂无日志记录</TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="border-white/[0.06] transition-colors hover:bg-white/[0.035]">
                    <TableCell className="whitespace-nowrap pl-5 text-sm tabular-nums text-slate-400">
                      {new Date(log.createdAt).toLocaleString("zh-CN")}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-slate-200">{log.user?.username || "系统"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] ${actionColors[log.action] || "text-slate-400"}`}>
                        {actionLabels[log.action] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">{log.resource}</TableCell>
                    <TableCell className="text-slate-500 text-xs max-w-[300px] truncate font-mono">
                      {log.detail ? JSON.stringify(log.detail) : "-"}
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs font-mono">{log.ip || "-"}</TableCell>
                    <TableCell className="max-w-[180px] truncate pr-5 font-mono text-xs text-slate-500" title={log.traceId || ""}>
                      {log.traceId ? (
                        <button
                          onClick={() => { navigator.clipboard.writeText(log.traceId!); toast.success("已复制 Trace ID"); }}
                          className="hover:text-blue-400 transition-colors cursor-pointer"
                        >
                          {log.traceId.slice(0, 8)}...
                        </button>
                      ) : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">
              <span className="text-xs text-slate-500">
                共 {pagination.total} 条 · 第 {pagination.page}/{pagination.totalPages} 页
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={pagination.page <= 1} onClick={() => loadLogs(pagination.page - 1)} className="admin-secondary-button h-8 text-xs">
                  上一页
                </Button>
                <Button size="sm" variant="outline" disabled={pagination.page >= pagination.totalPages} onClick={() => loadLogs(pagination.page + 1)} className="admin-secondary-button h-8 text-xs">
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

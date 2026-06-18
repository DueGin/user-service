"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppWindow, Plus, Edit, Ban, RefreshCw, Eye, EyeOff, Copy } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin-page-header";

type ApplicationAccessMode = "OPEN" | "MEMBERS_ONLY" | "ADMINS_ONLY";

interface UserOption {
  id: string;
  username: string;
  email: string | null;
  status: string;
}

interface Application {
  id: string;
  name: string;
  description: string | null;
  apiKey: string;
  apiSecret?: string;
  status: string;
  accessMode: ApplicationAccessMode;
  callbackUrl: string | null;
  allowedOrigins: string[];
  createdAt: string;
  administrators: UserOption[];
}

const accessModeLabels: Record<ApplicationAccessMode, string> = {
  OPEN: "开放登录",
  MEMBERS_ONLY: "仅应用成员",
  ADMINS_ONLY: "仅应用管理员",
};

export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editApp, setEditApp] = useState<Application | null>(null);
  const [form, setForm] = useState<{
    name: string;
    description: string;
    callbackUrl: string;
    allowedOrigins: string;
    accessMode: ApplicationAccessMode;
    adminUserIds: string[];
  }>({
    name: "",
    description: "",
    callbackUrl: "",
    allowedOrigins: "",
    accessMode: "OPEN",
    adminUserIds: [],
  });
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [activeUsers, setActiveUsers] = useState<UserOption[]>([]);

  const fetchApps = useCallback(async () => {
    try {
      const res = await adminFetch("/api/applications");
      if (res.success) setApps(res.data);
    } catch {
      toast.error("获取应用列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadApps = useCallback(async () => {
    setLoading(true);
    await fetchApps();
  }, [fetchApps]);

  const fetchActiveUsers = useCallback(async () => {
    try {
      const res = await adminFetch("/api/users?pageSize=100&status=ACTIVE");
      if (res.success) setActiveUsers(res.data.items || []);
    } catch {
      toast.error("获取管理员账号列表失败");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchApps();
      void fetchActiveUsers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchApps, fetchActiveUsers]);

  function openCreate() {
    setEditApp(null);
    setForm({
      name: "",
      description: "",
      callbackUrl: "",
      allowedOrigins: "",
      accessMode: "OPEN",
      adminUserIds: [],
    });
    setShowForm(true);
  }

  function openEdit(app: Application) {
    setEditApp(app);
    setForm({
      name: app.name,
      description: app.description || "",
      callbackUrl: app.callbackUrl || "",
      allowedOrigins: app.allowedOrigins.join("\n"),
      accessMode: app.accessMode,
      adminUserIds: app.administrators.map((user) => user.id),
    });
    setShowForm(true);
  }

  function toggleAdminUser(userId: string, checked: boolean | "indeterminate") {
    setForm((prev) => ({
      ...prev,
      adminUserIds: checked
        ? Array.from(new Set([...prev.adminUserIds, userId]))
        : prev.adminUserIds.filter((id) => id !== userId),
    }));
  }

  function administratorSummary(app: Application) {
    if (app.administrators.length === 0) return "未指派";
    const names = app.administrators.map((user) => user.username);
    return names.length > 2 ? `${names.slice(0, 2).join("、")} 等 ${names.length} 人` : names.join("、");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      description: form.description || undefined,
      callbackUrl: form.callbackUrl || undefined,
      allowedOrigins: form.allowedOrigins
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      accessMode: form.accessMode,
      adminUserIds: form.adminUserIds,
    };

    try {
      const url = editApp ? `/api/applications/${editApp.id}` : "/api/applications";
      const method = editApp ? "PUT" : "POST";
      const res = await adminFetch(url, { method, body: JSON.stringify(payload) });
      if (res.success) {
        toast.success(editApp ? "应用更新成功" : "应用创建成功");
        if (!editApp && res.data.apiSecret) {
          setSecrets((prev) => ({ ...prev, [res.data.id]: res.data.apiSecret }));
          setShowSecret((prev) => ({ ...prev, [res.data.id]: true }));
          toast.info("请妥善保存 API Secret，后续无法再次查看");
        }
        setShowForm(false);
        setEditApp(null);
        void loadApps();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("操作失败");
    }
  }

  async function handleRegenerateKey(app: Application) {
    if (!confirm(`确认重新生成 "${app.name}" 的密钥？旧密钥将立即失效。`)) return;
    try {
      const res = await adminFetch(`/api/applications/${app.id}/regenerate-key`, { method: "POST" });
      if (res.success) {
        toast.success("密钥已重新生成");
        setSecrets((prev) => ({ ...prev, [app.id]: res.data.apiSecret }));
        setShowSecret((prev) => ({ ...prev, [app.id]: true }));
        void loadApps();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("操作失败");
    }
  }

  async function handleDisable(app: Application) {
    if (!confirm(`确认禁用应用 "${app.name}"？`)) return;
    try {
      const res = await adminFetch(`/api/applications/${app.id}`, { method: "DELETE" });
      if (res.success) {
        toast.success("应用已禁用");
        void loadApps();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("操作失败");
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("已复制到剪贴板");
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="应用管理"
        description="配置接入应用、访问模式与应用管理员"
        icon={AppWindow}
        action={
          <Button onClick={openCreate} className="admin-primary-button">
            <Plus className="w-4 h-4 mr-2" />
            创建应用
          </Button>
        }
      />

      <Card className="admin-panel py-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="px-5 text-xs font-medium text-slate-500">应用名</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">管理员</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">访问模式</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">API Key</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">API Secret</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">状态</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">回调 URL</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">创建时间</TableHead>
                <TableHead className="pr-5 text-xs font-medium text-slate-500">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <TableRow key={i} className="border-white/[0.06]">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((j) => (
                        <TableCell key={j} className={j === 1 ? "pl-5" : j === 9 ? "pr-5" : ""}>
                          <div className="h-4 animate-pulse rounded bg-white/[0.055]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </>
              ) : apps.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={9} className="text-center text-slate-500 py-16 text-sm">
                    暂无应用
                  </TableCell>
                </TableRow>
              ) : (
                apps.map((app) => (
                  <TableRow key={app.id} className="border-white/[0.06] transition-colors hover:bg-white/[0.035]">
                    <TableCell className="pl-5">
                      <div>
                        <div className="text-slate-200 font-medium text-sm">{app.name}</div>
                        {app.description && <div className="text-xs text-slate-500 mt-0.5">{app.description}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-400">{administratorSummary(app)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-white/10 text-[11px] text-slate-300">
                        {accessModeLabels[app.accessMode]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <code className="rounded-md border border-white/10 bg-slate-950/35 px-2 py-1 font-mono text-xs text-slate-300">
                          {app.apiKey.slice(0, 16)}...
                        </code>
                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard(app.apiKey)} className="h-6 w-6 p-0 text-slate-400" title="复制 API Key">
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {secrets[app.id] ? (
                        <div className="flex items-center gap-1">
                          <code className="rounded-md border border-white/10 bg-slate-950/35 px-2 py-1 font-mono text-xs text-slate-300">
                            {showSecret[app.id] ? secrets[app.id] : "********"}
                          </code>
                          <Button size="sm" variant="ghost" onClick={() => setShowSecret((p) => ({ ...p, [app.id]: !p[app.id] }))} className="h-6 w-6 p-0 text-slate-400" title={showSecret[app.id] ? "隐藏" : "显示"}>
                            {showSecret[app.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => copyToClipboard(secrets[app.id])} className="h-6 w-6 p-0 text-slate-400" title="复制 API Secret">
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs">已隐藏</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={app.status === "ACTIVE" ? "default" : "destructive"} className="text-[11px]">
                        {app.status === "ACTIVE" ? "正常" : "已禁用"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm max-w-[200px] truncate">
                      {app.callbackUrl || "-"}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm tabular-nums">
                      {new Date(app.createdAt).toLocaleString("zh-CN")}
                    </TableCell>
                    <TableCell className="pr-5">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(app)} className="text-slate-400 hover:text-blue-500" title="编辑">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleRegenerateKey(app)} className="text-slate-400 hover:text-yellow-400" title="重新生成密钥">
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        {app.status === "ACTIVE" && (
                          <Button size="sm" variant="ghost" onClick={() => handleDisable(app)} className="text-slate-400 hover:text-red-400" title="禁用">
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditApp(null);
        }}
      >
        <DialogContent className="admin-panel text-slate-100 shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg text-slate-50">{editApp ? "编辑应用" : "创建应用"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">应用名 *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="admin-field h-10" required />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">描述</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="admin-field" rows={2} />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">访问模式</Label>
              <Select
                value={form.accessMode}
                onValueChange={(value) => setForm({ ...form, accessMode: value as ApplicationAccessMode })}
              >
                <SelectTrigger className="admin-field h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="admin-select-content">
                  <SelectItem value="OPEN">开放登录</SelectItem>
                  <SelectItem value="MEMBERS_ONLY">仅应用成员</SelectItem>
                  <SelectItem value="ADMINS_ONLY">仅应用管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">回调 URL</Label>
              <Input value={form.callbackUrl} onChange={(e) => setForm({ ...form, callbackUrl: e.target.value })} placeholder="https://your-app.com/callback" className="admin-field h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">允许的 Origins（每行一个）</Label>
              <Textarea
                value={form.allowedOrigins}
                onChange={(e) => setForm({ ...form, allowedOrigins: e.target.value })}
                placeholder={"https://your-app.com\nhttps://staging.your-app.com"}
                className="admin-field"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">应用管理员 *</Label>
              {activeUsers.length === 0 ? (
                <p className="text-xs text-red-300">暂无可用账号，请先在用户管理中创建或启用账号。</p>
              ) : (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-white/10 bg-slate-950/25 p-2">
                  {activeUsers.map((user) => (
                    <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/[0.04]">
                      <Checkbox
                        checked={form.adminUserIds.includes(user.id)}
                        onCheckedChange={(checked: boolean | "indeterminate") => toggleAdminUser(user.id, checked)}
                      />
                      <span className="text-sm text-slate-300">{user.username}</span>
                      {user.email && <span className="truncate text-xs text-slate-500">{user.email}</span>}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="admin-secondary-button">取消</Button>
              <Button type="submit" className="admin-primary-button" disabled={form.adminUserIds.length === 0}>{editApp ? "保存" : "创建"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

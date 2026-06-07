"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppWindow, Plus, Edit, Ban, RefreshCw, Eye, EyeOff, Copy } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { toast } from "sonner";

interface Application {
  id: string;
  name: string;
  description: string | null;
  apiKey: string;
  apiSecret?: string;
  status: string;
  callbackUrl: string | null;
  allowedOrigins: string[];
  createdAt: string;
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editApp, setEditApp] = useState<Application | null>(null);
  const [form, setForm] = useState({ name: "", description: "", callbackUrl: "", allowedOrigins: "" });
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [secrets, setSecrets] = useState<Record<string, string>>({});

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchApps();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchApps]);

  function openCreate() {
    setEditApp(null);
    setForm({ name: "", description: "", callbackUrl: "", allowedOrigins: "" });
    setShowForm(true);
  }

  function openEdit(app: Application) {
    setEditApp(app);
    setForm({
      name: app.name,
      description: app.description || "",
      callbackUrl: app.callbackUrl || "",
      allowedOrigins: app.allowedOrigins.join("\n"),
    });
    setShowForm(true);
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
    if (!confirm(`确认禁用应用 "${app.name}" ？`)) return;
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
            <AppWindow className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">应用管理</h1>
            <p className="text-slate-400 text-sm mt-0.5">管理接入的第三方应用及其 API 密钥</p>
          </div>
        </div>
        <Button onClick={openCreate} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm shadow-blue-500/20">
          <Plus className="w-4 h-4 mr-2" />
          创建应用
        </Button>
      </div>

      <Card className="bg-slate-900/60 border-slate-800/50">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800/50 hover:bg-transparent">
                <TableHead className="text-slate-500 text-xs font-semibold uppercase tracking-wider">应用名</TableHead>
                <TableHead className="text-slate-500 text-xs font-semibold uppercase tracking-wider">API Key</TableHead>
                <TableHead className="text-slate-500 text-xs font-semibold uppercase tracking-wider">API Secret</TableHead>
                <TableHead className="text-slate-500 text-xs font-semibold uppercase tracking-wider">状态</TableHead>
                <TableHead className="text-slate-500 text-xs font-semibold uppercase tracking-wider">回调URL</TableHead>
                <TableHead className="text-slate-500 text-xs font-semibold uppercase tracking-wider">创建时间</TableHead>
                <TableHead className="text-slate-500 text-xs font-semibold uppercase tracking-wider">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <>
                  {[1,2,3].map(i => (
                    <TableRow key={i} className="border-slate-800/30">
                      {[1,2,3,4,5,6,7].map(j => (
                        <TableCell key={j}><div className="h-4 bg-slate-800/50 rounded animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))}
                </>
              ) : apps.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="text-center text-slate-500 py-16 text-sm">暂无应用，点击上方按钮创建</TableCell>
                </TableRow>
              ) : (
                apps.map((app) => (
                  <TableRow key={app.id} className="border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                    <TableCell>
                      <div>
                        <div className="text-slate-200 font-medium text-sm">{app.name}</div>
                        {app.description && <div className="text-xs text-slate-500 mt-0.5">{app.description}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <code className="text-xs text-slate-300 bg-slate-800/60 px-2 py-1 rounded font-mono">
                          {app.apiKey.slice(0, 16)}...
                        </code>
                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard(app.apiKey)} className="h-6 w-6 p-0 text-slate-400">
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {secrets[app.id] ? (
                        <div className="flex items-center gap-1">
                          <code className="text-xs text-slate-300 bg-slate-800/60 px-2 py-1 rounded font-mono">
                            {showSecret[app.id] ? secrets[app.id] : "••••••••••"}
                          </code>
                          <Button size="sm" variant="ghost" onClick={() => setShowSecret((p) => ({ ...p, [app.id]: !p[app.id] }))} className="h-6 w-6 p-0 text-slate-400">
                            {showSecret[app.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => copyToClipboard(secrets[app.id])} className="h-6 w-6 p-0 text-slate-400">
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
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(app)} className="text-slate-400 hover:text-white" title="编辑">
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{editApp ? "编辑应用" : "创建应用"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">应用名 *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10 bg-slate-800/50 border-slate-700 focus:border-blue-500" required />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">描述</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-slate-800/50 border-slate-700 focus:border-blue-500" rows={2} />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">回调 URL</Label>
              <Input value={form.callbackUrl} onChange={(e) => setForm({ ...form, callbackUrl: e.target.value })} placeholder="https://your-app.com/callback" className="h-10 bg-slate-800/50 border-slate-700 focus:border-blue-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">允许的 Origins（每行一个）</Label>
              <Textarea value={form.allowedOrigins} onChange={(e) => setForm({ ...form, allowedOrigins: e.target.value })} placeholder="https://your-app.com
https://staging.your-app.com" className="bg-slate-800/50 border-slate-700 focus:border-blue-500" rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-slate-700 text-slate-400 hover:text-white">取消</Button>
              <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">{editApp ? "保存" : "创建"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

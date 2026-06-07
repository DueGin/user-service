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
import { Plus, Edit, Trash2, ShieldCheck } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { toast } from "sonner";

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  createdAt: string;
  _count: { userRoles: number };
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: "", description: "", permissions: "" });

  const fetchRoles = useCallback(async () => {
    try {
      const res = await adminFetch("/api/roles");
      if (res.success) setRoles(res.data);
    } catch {
      toast.error("获取角色列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    await fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchRoles();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchRoles]);

  function openCreate() {
    setEditRole(null);
    setForm({ name: "", description: "", permissions: "" });
    setShowForm(true);
  }

  function openEdit(role: Role) {
    setEditRole(role);
    setForm({
      name: role.name,
      description: role.description || "",
      permissions: Array.isArray(role.permissions) ? role.permissions.join(", ") : "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      description: form.description || undefined,
      permissions: form.permissions
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      const url = editRole ? `/api/roles/${editRole.id}` : "/api/roles";
      const method = editRole ? "PUT" : "POST";
      const res = await adminFetch(url, {
        method,
        body: JSON.stringify(payload),
      });
      if (res.success) {
        toast.success(editRole ? "角色更新成功" : "角色创建成功");
        setShowForm(false);
        void loadRoles();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("操作失败");
    }
  }

  async function handleDelete(role: Role) {
    if (!confirm(`确认删除角色 "${role.name}" ？此操作不可恢复。`)) return;
    try {
      const res = await adminFetch(`/api/roles/${role.id}`, { method: "DELETE" });
      if (res.success) {
        toast.success("角色已删除");
        void loadRoles();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("删除失败");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">角色管理</h1>
            <p className="text-slate-400 text-sm mt-0.5">管理系统角色及权限配置</p>
          </div>
        </div>
        <Button onClick={openCreate} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm shadow-blue-500/20">
          <Plus className="w-4 h-4 mr-2" />
          创建角色
        </Button>
      </div>

      <Card className="bg-slate-900/60 border-slate-800/50">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800/50 hover:bg-transparent">
                <TableHead className="text-slate-500 text-xs font-semibold uppercase tracking-wider">角色名</TableHead>
                <TableHead className="text-slate-500 text-xs font-semibold uppercase tracking-wider">描述</TableHead>
                <TableHead className="text-slate-500 text-xs font-semibold uppercase tracking-wider">权限</TableHead>
                <TableHead className="text-slate-500 text-xs font-semibold uppercase tracking-wider">用户数</TableHead>
                <TableHead className="text-slate-500 text-xs font-semibold uppercase tracking-wider">创建时间</TableHead>
                <TableHead className="text-slate-500 text-xs font-semibold uppercase tracking-wider">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <>
                  {[1,2,3].map(i => (
                    <TableRow key={i} className="border-slate-800/30">
                      {[1,2,3,4,5,6].map(j => (
                        <TableCell key={j}><div className="h-4 bg-slate-800/50 rounded animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))}
                </>
              ) : roles.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="text-center text-slate-500 py-16 text-sm">暂无角色，点击上方按钮创建</TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role.id} className="border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                    <TableCell className="text-slate-200 font-medium text-sm">{role.name}</TableCell>
                    <TableCell className="text-slate-300">{role.description || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap max-w-xs">
                        {Array.isArray(role.permissions) && role.permissions.length > 0 ? (
                          role.permissions.slice(0, 3).map((p: string) => (
                            <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                          ))
                        ) : (
                          <span className="text-slate-500 text-sm">无</span>
                        )}
                        {Array.isArray(role.permissions) && role.permissions.length > 3 && (
                          <Badge variant="secondary" className="text-xs">+{role.permissions.length - 3}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">{role._count.userRoles}</TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {new Date(role.createdAt).toLocaleString("zh-CN")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(role)} className="text-slate-400 hover:text-white">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(role)} className="text-slate-400 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
            <DialogTitle className="text-lg">{editRole ? "编辑角色" : "创建角色"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">角色名 *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10 bg-slate-800/50 border-slate-700 focus:border-blue-500" required />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">描述</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-slate-800/50 border-slate-700 focus:border-blue-500" rows={2} />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">权限（逗号分隔）</Label>
              <Textarea value={form.permissions} onChange={(e) => setForm({ ...form, permissions: e.target.value })} placeholder="user:read, user:write, role:manage" className="bg-slate-800/50 border-slate-700 focus:border-blue-500" rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-slate-700 text-slate-400 hover:text-white">取消</Button>
              <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">{editRole ? "保存" : "创建"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

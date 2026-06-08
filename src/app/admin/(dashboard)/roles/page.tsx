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
import { AdminPageHeader } from "@/components/admin-page-header";

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
      <AdminPageHeader
        title="角色管理"
        description="定义角色说明与权限集合，并追踪每个角色的使用范围。"
        icon={ShieldCheck}
        action={
          <Button onClick={openCreate} className="admin-primary-button">
            <Plus className="w-4 h-4 mr-2" />
            创建角色
          </Button>
        }
      />

      <Card className="admin-panel py-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="px-5 text-xs font-medium text-slate-500">角色名</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">描述</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">权限</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">用户数</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">创建时间</TableHead>
                <TableHead className="pr-5 text-xs font-medium text-slate-500">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <>
                  {[1,2,3].map(i => (
                    <TableRow key={i} className="border-white/[0.06]">
                      {[1,2,3,4,5,6].map(j => (
                        <TableCell key={j} className={j === 1 ? "pl-5" : j === 6 ? "pr-5" : ""}><div className="h-4 animate-pulse rounded bg-white/[0.055]" /></TableCell>
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
                  <TableRow key={role.id} className="border-white/[0.06] transition-colors hover:bg-white/[0.035]">
                    <TableCell className="pl-5 text-sm font-medium text-slate-200">{role.name}</TableCell>
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
                    <TableCell className="pr-5">
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(role)} className="text-slate-400 hover:text-blue-500">
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
        <DialogContent className="admin-panel text-slate-100 shadow-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg text-slate-50">{editRole ? "编辑角色" : "创建角色"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">角色名 *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="admin-field h-10" required />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">描述</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="admin-field" rows={2} />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">权限（逗号分隔）</Label>
              <Textarea value={form.permissions} onChange={(e) => setForm({ ...form, permissions: e.target.value })} placeholder="user:read, user:write, role:manage" className="admin-field" rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="admin-secondary-button">取消</Button>
              <Button type="submit" className="admin-primary-button">{editRole ? "保存" : "创建"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Edit, Ban, UserPlus, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { adminFetch } from "@/lib/admin-api";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin-page-header";

interface User {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  roles: Array<{ id: string; name: string }>;
}

interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ username: "", email: "", phone: "", status: "", password: "" });
  const [allRoles, setAllRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [userRoleIds, setUserRoleIds] = useState<string[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ username: "", password: "", email: "", phone: "" });

  const fetchUsers = useCallback(async (page = 1) => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (search) params.set("search", search);
      const res = await adminFetch(`/api/users?${params}`);
      if (res.success) {
        setUsers(res.data.items);
        setPagination({
          total: res.data.total,
          page: res.data.page,
          pageSize: res.data.pageSize,
          totalPages: res.data.totalPages,
        });
      }
    } catch {
      toast.error("获取用户列表失败");
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadUsers = useCallback(async (page = 1) => {
    setLoading(true);
    await fetchUsers(page);
  }, [fetchUsers]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchUsers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchUsers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await adminFetch("/api/users", {
        method: "POST",
        body: JSON.stringify(createForm),
      });
      if (res.success) {
        toast.success("用户创建成功");
        setShowCreate(false);
        setCreateForm({ username: "", password: "", email: "", phone: "" });
        void loadUsers();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("创建失败");
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    try {
      // Only send password if it's not empty
      const payload: Record<string, string> = {
        username: editForm.username,
        email: editForm.email,
        phone: editForm.phone,
        status: editForm.status,
      };
      if (editForm.password) payload.password = editForm.password;
      const res = await adminFetch(`/api/users/${editUser.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (res.success) {
        toast.success("用户更新成功");
        setEditUser(null);
        void loadUsers();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("更新失败");
    }
  }

  async function handleDisable(user: User) {
    if (!confirm(`确认禁用用户 "${user.username}" ？`)) return;
    try {
      const res = await adminFetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (res.success) {
        toast.success("用户已禁用");
        void loadUsers();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("操作失败");
    }
  }

  async function openEdit(user: User) {
    setEditUser(user);
    setEditForm({
      username: user.username,
      email: user.email || "",
      phone: user.phone || "",
      status: user.status,
      password: "",
    });
    // Load all roles and user's current roles
    try {
      const [rolesRes, userRolesRes] = await Promise.all([
        adminFetch("/api/roles"),
        adminFetch(`/api/users/${user.id}/roles`),
      ]);
      if (rolesRes.success) setAllRoles(rolesRes.data);
      if (userRolesRes.success) setUserRoleIds(userRolesRes.data.map((r: { id: string }) => r.id));
    } catch {
      // ignore
    }
  }

  async function handleSaveRoles() {
    if (!editUser || userRoleIds.length === 0) {
      toast.error("请至少选择一个角色");
      return;
    }
    setSavingRoles(true);
    try {
      const res = await adminFetch(`/api/users/${editUser.id}/roles`, {
        method: "POST",
        body: JSON.stringify({ roleIds: userRoleIds }),
      });
      if (res.success) {
        toast.success("角色分配成功");
        void loadUsers();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("角色分配失败");
    } finally {
      setSavingRoles(false);
    }
  }

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    ACTIVE: { label: "正常", variant: "default" },
    DISABLED: { label: "已禁用", variant: "destructive" },
    DELETED: { label: "已删除", variant: "secondary" },
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="用户管理"
        description="维护账号资料、登录状态与角色授权关系。"
        icon={UserPlus}
        action={
          <Button onClick={() => setShowCreate(true)} className="admin-primary-button">
          <UserPlus className="w-4 h-4 mr-2" />
          创建用户
          </Button>
        }
      />

      <Card className="admin-panel py-0">
        <CardHeader className="border-b border-white/10 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="搜索用户名、邮箱、手机号..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadUsers()}
                className="admin-field h-9 pl-10 text-sm"
              />
            </div>
            <Button variant="outline" onClick={() => loadUsers()} className="admin-secondary-button h-9">
              搜索
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="px-5 text-xs font-medium text-slate-500">用户名</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">邮箱</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">手机号</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">角色</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">状态</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">创建时间</TableHead>
                <TableHead className="pr-5 text-xs font-medium text-slate-500">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <>
                  {[1,2,3,4,5].map(i => (
                    <TableRow key={i} className="border-white/[0.06]">
                      {[1,2,3,4,5,6,7].map(j => (
                        <TableCell key={j} className={j === 1 ? "pl-5" : j === 7 ? "pr-5" : ""}><div className="h-4 animate-pulse rounded bg-white/[0.055]" /></TableCell>
                      ))}
                    </TableRow>
                  ))}
                </>
              ) : users.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="text-center text-slate-500 py-16 text-sm">暂无用户数据</TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className="border-white/[0.06] transition-colors hover:bg-white/[0.035]">
                    <TableCell className="pl-5 text-sm font-medium text-slate-200">{user.username}</TableCell>
                    <TableCell className="text-slate-400 text-sm">{user.email || "-"}</TableCell>
                    <TableCell className="text-slate-400 text-sm">{user.phone || "-"}</TableCell>
                    <TableCell>
                      {user.roles.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {user.roles.map((r) => (
                            <Badge key={r.id} variant="secondary" className="text-xs">
                              {r.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">无</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusMap[user.status]?.variant || "default"} className="text-[11px]">
                        {statusMap[user.status]?.label || user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm tabular-nums">
                      {new Date(user.createdAt).toLocaleString("zh-CN")}
                    </TableCell>
                    <TableCell className="pr-5">
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(user)} className="text-slate-400 hover:text-blue-500">
                          <Edit className="w-4 h-4" />
                        </Button>
                        {user.status === "ACTIVE" && (
                          <Button size="sm" variant="ghost" onClick={() => handleDisable(user)} className="text-slate-400 hover:text-red-400">
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

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">
              <span className="text-xs text-slate-500">
                共 {pagination.total} 条 · 第 {pagination.page}/{pagination.totalPages} 页
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => loadUsers(pagination.page - 1)}
                  className="admin-secondary-button h-8 text-xs"
                >
                  上一页
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadUsers(pagination.page + 1)}
                  className="admin-secondary-button h-8 text-xs"
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="admin-panel text-slate-100 shadow-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg text-slate-50">创建用户</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">用户名 *</Label>
              <Input value={createForm.username} onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })} className="admin-field h-10" required />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">密码 *</Label>
              <Input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className="admin-field h-10" required />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">邮箱</Label>
              <Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} className="admin-field h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">手机号</Label>
              <Input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} className="admin-field h-10" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="admin-secondary-button">取消</Button>
              <Button type="submit" className="admin-primary-button">创建</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="admin-panel text-slate-100 shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg text-slate-50">编辑用户</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">用户名</Label>
              <Input value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} className="admin-field h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">邮箱</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="admin-field h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">手机号</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="admin-field h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">重置密码（留空则不修改）</Label>
              <Input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="输入新密码" className="admin-field h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">状态</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v ?? "ACTIVE" })}>
                <SelectTrigger className="admin-field h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="admin-select-content">
                  <SelectItem value="ACTIVE">正常</SelectItem>
                  <SelectItem value="DISABLED">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditUser(null)} className="admin-secondary-button">取消</Button>
              <Button type="submit" className="admin-primary-button">保存</Button>
            </div>
          </form>

          {/* Role Assignment */}
          <div className="mt-2 border-t border-white/10 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-blue-200" />
              <Label className="text-slate-300 font-medium text-sm">角色分配</Label>
            </div>
            {allRoles.length === 0 ? (
              <p className="text-slate-500 text-sm">暂无可分配角色，请先在角色管理中创建</p>
            ) : (
              <div className="space-y-2">
                {allRoles.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={userRoleIds.includes(role.id)}
                      onCheckedChange={(checked: boolean | "indeterminate") => {
                        setUserRoleIds((prev) =>
                          checked ? [...prev, role.id] : prev.filter((id) => id !== role.id)
                        );
                      }}
                    />
                    <span className="text-slate-300 text-sm">{role.name}</span>
                  </label>
                ))}
                <Button
                  size="sm"
                  onClick={handleSaveRoles}
                  disabled={savingRoles}
                  className="admin-primary-button mt-2"
                >
                  {savingRoles ? "保存中..." : "保存角色"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

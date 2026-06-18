"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Ban, CheckCircle2, Link2, Plus, Search, UserCog } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin-page-header";

interface ApplicationOption {
  id: string;
  name: string;
  status: string;
}

interface ApplicationUser {
  id: string;
  appId: string;
  appName: string;
  userId: string;
  username: string;
  email: string | null;
  phone: string | null;
  userStatus: string;
  membershipStatus: "ACTIVE" | "DISABLED";
  lastLoginAt: string | null;
  createdAt: string;
}

interface EligibleUser {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  status: string;
  membershipStatus: "ACTIVE" | "DISABLED" | null;
}

interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function ApplicationUsersPage() {
  const [items, setItems] = useState<ApplicationUser[]>([]);
  const [applications, setApplications] = useState<ApplicationOption[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [selectedAppId, setSelectedAppId] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    appId: "",
    userId: "",
  });
  const [userSearch, setUserSearch] = useState("");
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);
  const [eligibleLoading, setEligibleLoading] = useState(false);

  const activeApplications = useMemo(
    () => applications.filter((app) => app.status === "ACTIVE"),
    [applications]
  );

  const fetchApplicationUsers = useCallback(
    async (page = 1) => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "20",
        });
        if (search) params.set("search", search);
        if (selectedAppId) params.set("appId", selectedAppId);
        if (status !== "all") params.set("status", status);

        const res = await adminFetch(`/api/application-users?${params}`);
        if (res.success) {
          setForbidden(false);
          setItems(res.data.items);
          setApplications(res.data.applications);
          setPagination({
            total: res.data.total,
            page: res.data.page,
            pageSize: res.data.pageSize,
            totalPages: res.data.totalPages,
          });

          if (!selectedAppId && res.data.selectedAppId) {
            setSelectedAppId(res.data.selectedAppId);
          }

          if (!createForm.appId && res.data.applications?.length) {
            const firstActive = res.data.applications.find(
              (app: ApplicationOption) => app.status === "ACTIVE"
            );
            if (firstActive) {
              setCreateForm((prev) => ({ ...prev, appId: firstActive.id }));
            }
          }
        } else {
          if (res.error === "无权管理应用成员" || res.error === "无权管理该应用") {
            setForbidden(true);
          }
          toast.error(res.error || "获取应用用户失败");
        }
      } catch {
        toast.error("获取应用用户失败");
      } finally {
        setLoading(false);
      }
    },
    [createForm.appId, search, selectedAppId, status]
  );

  const loadApplicationUsers = useCallback(
    async (page = 1) => {
      setLoading(true);
      await fetchApplicationUsers(page);
    },
    [fetchApplicationUsers]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchApplicationUsers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchApplicationUsers]);

  function openCreate() {
    const defaultAppId =
      selectedAppId || activeApplications[0]?.id || applications[0]?.id || "";
    setCreateForm({
      appId: defaultAppId,
      userId: "",
    });
    setUserSearch("");
    setEligibleUsers([]);
    setShowCreate(true);
  }

  async function searchEligibleUsers() {
    if (!createForm.appId) {
      toast.error("请先选择应用");
      return;
    }
    if (!userSearch.trim()) {
      toast.error("请输入用户名、邮箱或手机号");
      return;
    }

    setEligibleLoading(true);
    try {
      const params = new URLSearchParams({
        appId: createForm.appId,
        search: userSearch.trim(),
      });
      const res = await adminFetch(`/api/application-users/eligible-users?${params}`);
      if (res.success) {
        setEligibleUsers(res.data);
      } else {
        toast.error(res.error || "搜索用户失败");
      }
    } catch {
      toast.error("搜索用户失败");
    } finally {
      setEligibleLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await adminFetch("/api/application-users", {
        method: "POST",
        body: JSON.stringify({
          appId: createForm.appId,
          userId: createForm.userId,
        }),
      });

      if (res.success) {
        toast.success("应用成员关联成功");
        setShowCreate(false);
        void loadApplicationUsers();
      } else {
        toast.error(res.error || "创建失败");
      }
    } catch {
      toast.error("创建失败");
    }
  }

  async function handleToggleStatus(item: ApplicationUser) {
    const nextStatus = item.membershipStatus === "ACTIVE" ? "DISABLED" : "ACTIVE";
    const label = nextStatus === "DISABLED" ? "禁用" : "启用";
    if (!confirm(`确认${label} "${item.username}" 在 "${item.appName}" 中的访问？`)) return;

    try {
      const res = await adminFetch(`/api/application-users/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.success) {
        toast.success(`已${label}`);
        void loadApplicationUsers(pagination.page);
      } else {
        toast.error(res.error || "操作失败");
      }
    } catch {
      toast.error("操作失败");
    }
  }

  const membershipStatusMap = {
    ACTIVE: { label: "可访问", variant: "default" as const },
    DISABLED: { label: "已禁用", variant: "destructive" as const },
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="应用用户"
        description="管理接入应用下的成员关系与访问状态。"
        icon={UserCog}
        action={
          <Button
            onClick={openCreate}
            className="admin-primary-button"
            disabled={activeApplications.length === 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            关联成员
          </Button>
        }
      />

      {forbidden ? (
        <div className="rounded-lg border border-red-300/20 bg-red-500/10 px-5 py-8 text-sm text-red-100">
          当前账号没有应用成员管理权限。
        </div>
      ) : (
      <Card className="admin-panel py-0">
        <CardHeader className="border-b border-white/10 px-5 py-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_220px_160px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="搜索用户名、邮箱、手机号..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadApplicationUsers()}
                className="admin-field h-9 pl-10 text-sm"
              />
            </div>
            <Select value={selectedAppId} onValueChange={(value) => setSelectedAppId(value || "")}>
              <SelectTrigger className="admin-field h-9">
                <SelectValue placeholder="选择应用" />
              </SelectTrigger>
              <SelectContent className="admin-select-content">
                {applications.map((app) => (
                  <SelectItem key={app.id} value={app.id}>
                    {app.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => setStatus(value || "all")}>
              <SelectTrigger className="admin-field h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="admin-select-content">
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="ACTIVE">可访问</SelectItem>
                <SelectItem value="DISABLED">已禁用</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => loadApplicationUsers()}
              className="admin-secondary-button h-9"
            >
              搜索
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="px-5 text-xs font-medium text-slate-500">用户</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">应用</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">邮箱</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">手机号</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">应用状态</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">最近登录</TableHead>
                <TableHead className="pr-5 text-xs font-medium text-slate-500">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i} className="border-white/[0.06]">
                      {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                        <TableCell
                          key={j}
                          className={j === 1 ? "pl-5" : j === 7 ? "pr-5" : ""}
                        >
                          <div className="h-4 animate-pulse rounded bg-white/[0.055]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </>
              ) : items.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="py-16 text-center text-sm text-slate-500">
                    暂无应用用户数据
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-white/[0.06] transition-colors hover:bg-white/[0.035]"
                  >
                    <TableCell className="pl-5 text-sm font-medium text-slate-200">
                      {item.username}
                    </TableCell>
                    <TableCell className="text-sm text-slate-400">{item.appName}</TableCell>
                    <TableCell className="text-sm text-slate-400">{item.email || "-"}</TableCell>
                    <TableCell className="text-sm text-slate-400">{item.phone || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={membershipStatusMap[item.membershipStatus].variant}
                        className="text-[11px]"
                      >
                        {membershipStatusMap[item.membershipStatus].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-slate-400">
                      {item.lastLoginAt
                        ? new Date(item.lastLoginAt).toLocaleString("zh-CN")
                        : "-"}
                    </TableCell>
                    <TableCell className="pr-5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleStatus(item)}
                        className={
                          item.membershipStatus === "ACTIVE"
                            ? "text-slate-400 hover:text-red-400"
                            : "text-slate-400 hover:text-emerald-400"
                        }
                        title={item.membershipStatus === "ACTIVE" ? "禁用" : "启用"}
                      >
                        {item.membershipStatus === "ACTIVE" ? (
                          <Ban className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </Button>
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
                  onClick={() => loadApplicationUsers(pagination.page - 1)}
                  className="admin-secondary-button h-8 text-xs"
                >
                  上一页
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadApplicationUsers(pagination.page + 1)}
                  className="admin-secondary-button h-8 text-xs"
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="admin-panel text-slate-100 shadow-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg text-slate-50">关联应用成员</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-slate-300">所属应用 *</Label>
              <Select
                value={createForm.appId}
                onValueChange={(value) => {
                  setCreateForm({ appId: value || "", userId: "" });
                  setEligibleUsers([]);
                }}
              >
                <SelectTrigger className="admin-field h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="admin-select-content">
                  {activeApplications.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-slate-300">选择已有账号 *</Label>
              <div className="flex gap-2">
                <Input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void searchEligibleUsers();
                    }
                  }}
                  placeholder="搜索用户名、邮箱或手机号"
                  className="admin-field h-10"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void searchEligibleUsers()}
                  className="admin-secondary-button h-10"
                  disabled={eligibleLoading}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <div className="max-h-56 space-y-2 overflow-auto pr-1">
                {eligibleUsers.map((user) => {
                  const disabled = Boolean(user.membershipStatus);
                  const selected = createForm.userId === user.id;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setCreateForm({ ...createForm, userId: user.id })}
                      className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        selected
                          ? "border-blue-300/50 bg-blue-300/10 text-blue-100"
                          : "border-white/10 bg-white/[0.025] text-slate-200 hover:bg-white/[0.045]"
                      } ${disabled ? "cursor-not-allowed opacity-55" : ""}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{user.username}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {user.email || user.phone || "未设置联系方式"}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-500">
                        {user.membershipStatus === "ACTIVE"
                          ? "已关联"
                          : user.membershipStatus === "DISABLED"
                            ? "已禁用"
                            : selected
                              ? "已选择"
                              : "可关联"}
                      </span>
                    </button>
                  );
                })}
                {!eligibleLoading && userSearch && eligibleUsers.length === 0 && (
                  <p className="py-4 text-center text-sm text-slate-500">没有找到可关联账号</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreate(false)}
                className="admin-secondary-button"
              >
                取消
              </Button>
              <Button type="submit" className="admin-primary-button" disabled={!createForm.userId}>
                <Link2 className="mr-2 h-4 w-4" />
                关联
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

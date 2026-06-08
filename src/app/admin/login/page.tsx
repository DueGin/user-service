"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Fingerprint, KeyRound, Loader2, ScrollText, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AdminLoginPage() {
  const router = useRouter();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "登录失败");
        return;
      }

      // Check if user has admin role
      const ADMIN_ROLES = ["超级管理员", "admin", "管理员"];
      const userRoles: string[] = data.data.user?.roles || [];
      const hasAdminRole = userRoles.some((r: string) => ADMIN_ROLES.includes(r));
      if (!hasAdminRole) {
        // Logout the session since non-admin should not stay logged in to admin
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${data.data.accessToken}` },
        });
        setError("权限不足，仅管理员可登录后台");
        return;
      }

      document.cookie = `admin_token=${data.data.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}`;
      document.cookie = `admin_refresh_token=${data.data.refreshToken}; path=/; max-age=${60 * 60 * 24 * 7}`;
      localStorage.setItem("admin_user", JSON.stringify(data.data.user));

      router.push("/admin");
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-app-bg relative flex min-h-[100dvh] overflow-hidden text-slate-100">
      <div className="fixed right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <div className="hidden flex-1 items-center justify-center lg:flex">
        <div className="max-w-lg px-12">
          <div className="mb-10 flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-xl border border-blue-300/25 bg-blue-300/10 text-blue-200">
              <Shield className="size-7" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-50">User Service</h1>
              <p className="text-sm text-slate-400">统一身份、权限与审计中枢</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
              <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-blue-300/10 text-blue-200">
                <Fingerprint className="size-5" />
              </div>
              <div>
                <h3 className="font-medium text-slate-50">统一认证中心</h3>
                <p className="mt-1 text-sm leading-6 text-slate-400">集中管理用户身份，支持多应用单点登录。</p>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
              <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-blue-300/10 text-blue-200">
                <KeyRound className="size-5" />
              </div>
              <div>
                <h3 className="font-medium text-slate-50">精细权限控制</h3>
                <p className="mt-1 text-sm leading-6 text-slate-400">基于角色分配访问范围，降低误授权风险。</p>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
              <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-blue-300/10 text-blue-200">
                <ScrollText className="size-5" />
              </div>
              <div>
                <h3 className="font-medium text-slate-50">安全审计追踪</h3>
                <p className="mt-1 text-sm leading-6 text-slate-400">记录关键操作，方便排查、追踪与合规复盘。</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="admin-panel w-full max-w-[420px]">
          <CardHeader className="text-center space-y-5 pb-2">
            <div className="mx-auto flex size-14 items-center justify-center rounded-xl border border-blue-300/25 bg-blue-300/10 text-blue-200 lg:hidden">
              <Shield className="size-7" />
            </div>
            <div>
              <CardTitle className="text-2xl tracking-tight text-slate-50">管理后台登录</CardTitle>
              <CardDescription className="mt-2 text-slate-400">
                请使用管理员账号登录系统
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">
                  <AlertTriangle className="size-4 shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="account" className="text-slate-300 text-sm font-medium">
                  账号
                </Label>
                <Input
                  id="account"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="用户名 / 邮箱 / 手机号"
                  className="admin-field h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300 text-sm font-medium">
                  密码
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="admin-field h-11"
                  required
                />
              </div>
              <Button
                type="submit"
                className="admin-primary-button h-11 w-full font-medium"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    登录中...
                  </span>
                ) : "登 录"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

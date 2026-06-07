"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";

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
    <div className="min-h-screen flex relative overflow-hidden bg-slate-950">
      {/* Decorative background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-800/30 rounded-full blur-3xl" />
      </div>

      {/* Left brand panel */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative z-10">
        <div className="max-w-md px-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">User Service</h1>
              <p className="text-sm text-slate-400">统一用户基础服务</p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-400 text-lg font-bold">1</span>
              </div>
              <div>
                <h3 className="text-white font-medium">统一认证中心</h3>
                <p className="text-slate-400 text-sm mt-1">集中管理用户身份，支持多应用单点登录</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-indigo-400 text-lg font-bold">2</span>
              </div>
              <div>
                <h3 className="text-white font-medium">精细权限控制</h3>
                <p className="text-slate-400 text-sm mt-1">基于角色的访问控制，灵活分配管理权限</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-violet-400 text-lg font-bold">3</span>
              </div>
              <div>
                <h3 className="text-white font-medium">安全审计追踪</h3>
                <p className="text-slate-400 text-sm mt-1">全链路操作日志，确保系统安全合规</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center relative z-10 p-4">
        <Card className="w-full max-w-[420px] shadow-2xl border-slate-800 bg-slate-900/80 backdrop-blur-xl">
          <CardHeader className="text-center space-y-5 pb-2">
            <div className="lg:hidden mx-auto w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl text-white tracking-tight">管理后台登录</CardTitle>
              <CardDescription className="text-slate-400 mt-2">
                请使用管理员账号登录系统
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
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
                  className="h-11 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
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
                  className="h-11 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg shadow-blue-500/25 transition-all"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
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

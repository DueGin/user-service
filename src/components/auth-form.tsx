"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, Shield } from "lucide-react";

export interface AuthFormProps {
  mode: "login" | "register";
  onSuccess: (data: {
    accessToken: string;
    refreshToken: string;
    user: { id: string; username: string; email?: string };
  }) => void;
  onError?: (message: string) => void;
  switchUrl?: string;
  appName?: string;
  appId?: string;
}

export function AuthForm({ mode, onSuccess, onError, switchUrl, appName, appId }: AuthFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Login fields
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");

  // Register additional fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "register" && password !== confirmPassword) {
        setError("两次输入的密码不一致");
        return;
      }

      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { account, password, appId: appId || undefined }
          : { username, password, email: email || undefined, appId: appId || undefined };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!data.success) {
        const msg = data.error || "操作失败";
        setError(msg);
        onError?.(msg);
        return;
      }

      if (mode === "register") {
        // Auto-login after register
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ account: username, password, appId: appId || undefined }),
        });
        const loginData = await loginRes.json();
        if (loginData.success) {
          onSuccess(loginData.data);
        } else {
          onSuccess({
            accessToken: "",
            refreshToken: "",
            user: data.data,
          });
        }
      } else {
        onSuccess(data.data);
      }
    } catch {
      const msg = "网络错误，请稍后重试";
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <Card className="admin-panel mx-auto w-full max-w-md text-slate-100">
      <CardHeader className="text-center space-y-5 pb-2">
        <div className="mx-auto flex size-14 items-center justify-center rounded-xl border border-blue-300/25 bg-blue-300/10 text-blue-200">
          <Shield className="size-7" />
        </div>
        <div>
          <CardTitle className="text-xl tracking-tight text-slate-50">
            {isLogin ? "登录" : "注册"}
          </CardTitle>
          <CardDescription className="mt-1.5 text-slate-400">
            {appName
              ? `通过 User Service ${isLogin ? "登录" : "注册"}以继续使用 ${appName}`
              : `${isLogin ? "登录您的账号" : "创建新账号"}`}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">
              <AlertTriangle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          {isLogin ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="account" className="text-sm font-medium text-slate-300">账号</Label>
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
                <Label htmlFor="password" className="text-sm font-medium text-slate-300">密码</Label>
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
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-slate-300">用户名</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="3-32位字母、数字、下划线"
                  className="admin-field h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-300">邮箱（选填）</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="admin-field h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-300">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少6位"
                  className="admin-field h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-300">确认密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  className="admin-field h-11"
                  required
                />
              </div>
            </>
          )}

          <Button type="submit" className="admin-primary-button h-11 w-full" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                处理中...
              </span>
            ) : isLogin ? "登 录" : "注 册"}
          </Button>

          {switchUrl && (
            <p className="pt-1 text-center text-sm text-slate-500">
              {isLogin ? "还没有账号？" : "已有账号？"}
              <a
                href={switchUrl}
                className="ml-1 font-medium text-blue-200 hover:text-blue-100"
              >
                {isLogin ? "立即注册" : "去登录"}
              </a>
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

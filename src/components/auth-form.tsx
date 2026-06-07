"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";

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
}

export function AuthForm({ mode, onSuccess, onError, switchUrl, appName }: AuthFormProps) {
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
          ? { account, password }
          : { username, password, email: email || undefined };

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
          body: JSON.stringify({ account: username, password }),
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
    <Card className="w-full max-w-md mx-auto shadow-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 backdrop-blur-xl">
      <CardHeader className="text-center space-y-5 pb-2">
        <div className="mx-auto w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <div>
          <CardTitle className="text-xl text-slate-900 dark:text-white tracking-tight">
            {isLogin ? "登录" : "注册"}
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400 mt-1.5">
            {appName
              ? `通过 User Service ${isLogin ? "登录" : "注册"}以继续使用 ${appName}`
              : `${isLogin ? "登录您的账号" : "创建新账号"}`}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              {error}
            </div>
          )}

          {isLogin ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="account" className="text-sm font-medium">账号</Label>
                <Input
                  id="account"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="用户名 / 邮箱 / 手机号"
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="h-11"
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">用户名</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="3-32位字母、数字、下划线"
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">邮箱（选填）</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少6位"
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">确认密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  className="h-11"
                  required
                />
              </div>
            </>
          )}

          <Button type="submit" className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                处理中...
              </span>
            ) : isLogin ? "登 录" : "注 册"}
          </Button>

          {switchUrl && (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 pt-1">
              {isLogin ? "还没有账号？" : "已有账号？"}
              <a
                href={switchUrl}
                className="text-blue-600 dark:text-blue-400 hover:underline ml-1 font-medium"
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

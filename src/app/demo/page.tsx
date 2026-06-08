"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
  SquareArrowOutUpRight,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";

interface DemoRole {
  id: string;
  name: string;
  description?: string | null;
}

interface DemoUser {
  id: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  status?: string;
  roles?: DemoRole[];
}

interface DemoSession {
  authenticated: boolean;
  error?: string | null;
  canRefresh: boolean;
  user?: DemoUser | null;
  config: {
    appId: string;
    callbackUrl: string;
    userServiceBaseUrl: string;
    configured: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const demoSteps = [
  {
    title: "业务系统发起登录",
    detail: "跳转到 User Service 默认登录页，并带上 app_id、redirect_uri、state。",
  },
  {
    title: "用户完成统一登录",
    detail: "用户在 /auth/login 输入账号密码，认证成功后回跳到 Demo 回调接口。",
  },
  {
    title: "Demo 后端兑换 token",
    detail: "回调接口校验 state，再用 appId + apiSecret 调 /api/auth/exchange。",
  },
  {
    title: "业务系统建立会话",
    detail: "Demo 将 token 写入 httpOnly cookie，前台只感知自己的业务登录态。",
  },
];

const errorLabels: Record<string, string> = {
  "demo-config-missing": "Demo 应用配置不完整，请检查 DEMO_APP_ID、DEMO_APP_SECRET、USER_SERVICE_BASE_URL。",
  "demo-app-not-found": "Demo 应用不存在或已禁用，请在应用管理中创建并启用对应 appId。",
  "demo-app-prepare-failed": "Demo 应用准备失败，请确认数据库连接正常。",
  "missing-code": "回调缺少授权码 code。",
  "invalid-state": "state 校验失败，可能是重复回调或登录请求已过期。",
  "exchange-request-failed": "Demo 后端请求授权码兑换接口失败。",
  "access-token-missing": "accessToken 不存在，但 refreshToken 仍可用于刷新。",
  "session-request-failed": "Demo 查询当前用户失败，请确认 User Service 正在运行。",
  "session-invalid": "当前 Demo 登录态已失效。",
};

function getErrorLabel(error?: string | null) {
  if (!error) return "";
  const decoded = decodeURIComponent(error);
  return errorLabels[decoded] || decoded;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[140px_1fr] sm:items-center">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <code className="break-all font-mono text-xs text-slate-800">{value || "-"}</code>
    </div>
  );
}

function SkeletonPanel() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-14 animate-pulse rounded-lg bg-slate-200/80" />
      ))}
    </div>
  );
}

function DemoContent() {
  const searchParams = useSearchParams();
  const [session, setSession] = useState<DemoSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingAction, setWorkingAction] = useState<"refresh" | "logout" | null>(null);

  const queryNotice = useMemo(() => {
    const error = searchParams.get("error");
    if (error) return { type: "error" as const, text: getErrorLabel(error) };
    if (searchParams.get("login") === "success") {
      return { type: "success" as const, text: "登录成功，Demo 系统已建立自己的业务会话。" };
    }
    return null;
  }, [searchParams]);

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/demo/auth/session", { cache: "no-store" });
      const data = (await res.json()) as ApiResult<DemoSession>;
      if (data.success && data.data) {
        setSession(data.data);
      } else {
        toast.error(data.error || "读取 Demo 会话失败");
      }
    } catch {
      toast.error("读取 Demo 会话失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSession();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadSession]);

  async function copyValue(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} 已复制`);
  }

  async function handleRefresh() {
    setWorkingAction("refresh");
    try {
      const res = await fetch("/api/demo/auth/refresh", { method: "POST" });
      const data = (await res.json()) as ApiResult<{ accessToken: string; refreshToken: string }>;
      if (!data.success) {
        toast.error(data.error || "刷新失败");
      } else {
        toast.success("Demo 登录态已刷新");
      }
      await loadSession();
    } catch {
      toast.error("刷新失败");
    } finally {
      setWorkingAction(null);
    }
  }

  async function handleLogout() {
    setWorkingAction("logout");
    try {
      await fetch("/api/demo/auth/logout", { method: "POST" });
      toast.success("已退出 Demo 系统");
      await loadSession();
    } catch {
      toast.error("退出失败");
    } finally {
      setWorkingAction(null);
    }
  }

  const userInitial = session?.user?.username?.charAt(0).toUpperCase() || "U";
  const sessionError = getErrorLabel(session?.error);

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] text-slate-950">
      <div className="mx-auto flex min-h-[100dvh] max-w-[1440px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-slate-950 text-white">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">业务系统 Demo</p>
              <p className="text-xs text-slate-500">第三方系统接入 User Service 示例</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/integration-docs"
              className="hidden h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
            >
              接入文档
              <SquareArrowOutUpRight className="size-4" />
            </Link>
            <Link
              href="/admin/applications"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-950 bg-slate-950 px-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              应用管理
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </header>

        <section className="grid flex-1 gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start">
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <Badge className="mb-4 border-slate-200 bg-slate-100 text-slate-700" variant="outline">
                    OAuth-like authorization code demo
                  </Badge>
                  <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                    用当前 User Service 登录一个独立业务系统
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                    这个页面模拟第三方业务系统。点击登录后会跳到默认登录页，成功后回调到 Demo 后端兑换 token，并建立自己的业务会话。
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="/api/demo/auth/start"
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 active:translate-y-px"
                  >
                    <LogIn className="size-4" />
                    通过 User Service 登录
                  </a>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    onClick={loadSession}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    重载状态
                  </Button>
                </div>
              </div>
            </div>

            {queryNotice ? (
              <div
                className={
                  queryNotice.type === "success"
                    ? "rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
                    : "rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                }
              >
                {queryNotice.text}
              </div>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
              <Card className="rounded-xl border-slate-200 bg-white py-0 shadow-sm">
                <CardHeader className="border-b border-slate-200 px-5 py-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserRound className="size-4 text-blue-600" />
                    Demo 业务会话
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  {loading ? (
                    <SkeletonPanel />
                  ) : session?.authenticated ? (
                    <div className="space-y-5">
                      <div className="flex items-start gap-4">
                        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-lg font-semibold text-white">
                          {userInitial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-semibold text-slate-950">{session.user?.username}</h2>
                            <Badge className="bg-emerald-100 text-emerald-700">已登录</Badge>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            {session.user?.email || session.user?.phone || "当前账号未设置邮箱或手机号"}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <InfoRow label="用户 ID" value={session.user?.id || ""} />
                        <InfoRow label="账号状态" value={session.user?.status || "ACTIVE"} />
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-medium text-slate-500">角色</p>
                        <div className="flex flex-wrap gap-2">
                          {session.user?.roles?.length ? (
                            session.user.roles.map((role) => (
                              <Badge key={role.id} className="bg-blue-50 text-blue-700" variant="secondary">
                                {role.name}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="border-slate-200 text-slate-500">
                              暂无角色
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          className="bg-slate-950 text-white hover:bg-slate-800"
                          onClick={handleRefresh}
                          disabled={workingAction !== null || !session.canRefresh}
                        >
                          {workingAction === "refresh" ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <RefreshCw className="size-4" />
                          )}
                          刷新 token
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-red-200 bg-white text-red-700 hover:bg-red-50"
                          onClick={handleLogout}
                          disabled={workingAction !== null}
                        >
                          {workingAction === "logout" ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <LogOut className="size-4" />
                          )}
                          退出 Demo
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
                      <div className="flex items-start gap-3">
                        <KeyRound className="mt-0.5 size-5 text-slate-500" />
                        <div>
                          <h2 className="font-semibold text-slate-900">Demo 系统当前未登录</h2>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            点击上方按钮会跳转到当前系统提供的默认登录页：
                            <code className="mx-1 rounded bg-white px-1 py-0.5 font-mono text-xs">/auth/login</code>
                            。登录成功后会自动回到 Demo。
                          </p>
                          {sessionError ? (
                            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                              {sessionError}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl border-slate-200 bg-white py-0 shadow-sm">
                <CardHeader className="border-b border-slate-200 px-5 py-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BadgeCheck className="size-4 text-blue-600" />
                    接入配置
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-5">
                  {loading ? (
                    <SkeletonPanel />
                  ) : session ? (
                    <>
                      <InfoRow label="appId" value={session.config.appId} />
                      <InfoRow label="callbackUrl" value={session.config.callbackUrl} />
                      <InfoRow label="User Service" value={session.config.userServiceBaseUrl} />
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          onClick={() => copyValue(session.config.callbackUrl, "callbackUrl")}
                        >
                          <Copy className="size-4" />
                          复制回调地址
                        </Button>
                        <Badge
                          className={
                            session.config.configured
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }
                        >
                          {session.config.configured ? "配置完整" : "配置缺失"}
                        </Badge>
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>

          <aside className="space-y-5">
            <Card className="rounded-xl border-slate-200 bg-white py-0 shadow-sm">
              <CardHeader className="border-b border-slate-200 px-5 py-4">
                <CardTitle className="text-base">授权链路</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="space-y-4">
                  {demoSteps.map((step, index) => (
                    <div key={step.title} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="flex size-7 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                          {index + 1}
                        </div>
                        {index < demoSteps.length - 1 ? <div className="mt-2 h-full w-px bg-slate-200" /> : null}
                      </div>
                      <div className="pb-1">
                        <h3 className="text-sm font-semibold text-slate-950">{step.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-slate-200 bg-white py-0 shadow-sm">
              <CardHeader className="border-b border-slate-200 px-5 py-4">
                <CardTitle className="text-base">token 摘要</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-5">
                {loading ? (
                  <SkeletonPanel />
                ) : (
                  <>
                    <InfoRow label="accessToken" value={session?.tokens.accessToken || ""} />
                    <InfoRow label="refreshToken" value={session?.tokens.refreshToken || ""} />
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                      <CheckCircle2 className="mr-2 inline size-4 text-emerald-600" />
                      Demo 前台只展示摘要，真实 token 存在 httpOnly cookie 中。
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </aside>
        </section>
      </div>
      <Toaster />
    </main>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={<SkeletonPage />}>
      <DemoContent />
    </Suspense>
  );
}

function SkeletonPage() {
  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] text-slate-950">
      <div className="mx-auto flex min-h-[100dvh] max-w-[1440px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-slate-950 text-white">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">业务系统 Demo</p>
              <p className="text-xs text-slate-500">第三方系统接入 User Service 示例</p>
            </div>
          </div>
        </header>
        <section className="grid flex-1 gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start">
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="h-28 animate-pulse rounded-lg bg-slate-200/80" />
            </div>
            <Card className="rounded-xl border-slate-200 bg-white py-0 shadow-sm">
              <CardContent className="p-5">
                <SkeletonPanel />
              </CardContent>
            </Card>
          </div>
          <Card className="rounded-xl border-slate-200 bg-white py-0 shadow-sm">
            <CardContent className="p-5">
              <SkeletonPanel />
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

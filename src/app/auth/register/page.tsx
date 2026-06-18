"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthForm } from "@/components/auth-form";
import { postAuthMessage, AUTH_SUCCESS_EVENT, AUTH_ERROR_EVENT } from "@/lib/embed-auth";
import { ThemeToggle } from "@/components/theme-toggle";

function RegisterContent() {
  const searchParams = useSearchParams();
  const [successUsername, setSuccessUsername] = useState<string | null>(null);
  const [authorizationError, setAuthorizationError] = useState<string | null>(null);
  const appId = searchParams.get("app_id") || "";
  const redirectUri = searchParams.get("redirect_uri") || "";
  const mode = searchParams.get("mode") || "redirect";
  const state = searchParams.get("state") || "";
  const origin = searchParams.get("origin") || "";
  const appName = searchParams.get("app_name") || "";

  function buildSwitchUrl() {
    const params = new URLSearchParams();
    if (appId) params.set("app_id", appId);
    if (redirectUri) params.set("redirect_uri", redirectUri);
    if (mode) params.set("mode", mode);
    if (state) params.set("state", state);
    if (origin) params.set("origin", origin);
    if (appName) params.set("app_name", appName);
    return `/auth/login?${params.toString()}`;
  }

  async function handleSuccess(data: {
    accessToken: string;
    refreshToken: string;
    user: { id: string; username: string; email?: string };
  }) {
    setAuthorizationError(null);

    if (mode === "embed" && origin) {
      postAuthMessage(
        {
          type: AUTH_SUCCESS_EVENT,
          token: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        },
        origin
      );
      return;
    }

    if (mode === "redirect" && redirectUri && appId && data.accessToken) {
      try {
        const res = await fetch("/api/auth/authorize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.accessToken}`,
          },
          body: JSON.stringify({ appId, redirectUri, state }),
        });
        const result = await res.json();
        if (result.success) {
          const url = new URL(redirectUri);
          url.searchParams.set("code", result.data.code);
          if (state) url.searchParams.set("state", state);
          window.location.assign(url.toString());
          return;
        }
        setAuthorizationError(result.error || "生成授权码失败，请检查应用配置和回调地址。");
        return;
      } catch {
        setAuthorizationError("生成授权码失败，请确认认证服务和应用配置可用。");
        return;
      }
    }

    setSuccessUsername(data.user.username);
  }

  function handleError(message: string) {
    if (mode === "embed" && origin) {
      postAuthMessage({ type: AUTH_ERROR_EVENT, error: message }, origin);
    }
  }

  if (successUsername) {
    return (
      <div className="admin-app-bg flex min-h-[100dvh] items-center justify-center p-4 text-slate-100">
        <div className="admin-panel px-10 py-8 text-center">
          <h2 className="text-2xl font-semibold text-slate-50">注册成功</h2>
          <p className="mt-2 text-slate-400">欢迎，{successUsername}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-app-bg flex min-h-[100dvh] items-center justify-center overflow-hidden p-4">
      <div className="fixed right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <AuthForm
        mode="register"
        onSuccess={handleSuccess}
        onError={handleError}
        switchUrl={buildSwitchUrl()}
        appName={appName || undefined}
        appId={appId || undefined}
      />
      {authorizationError ? (
        <div className="fixed bottom-4 left-1/2 z-20 w-[min(92vw,520px)] -translate-x-1/2 rounded-xl border border-red-300/30 bg-red-950/85 px-4 py-3 text-sm leading-6 text-red-100 shadow-2xl backdrop-blur">
          {authorizationError}
        </div>
      ) : null}
    </div>
  );
}

export default function AuthRegisterPage() {
  return (
    <Suspense fallback={<div className="admin-app-bg flex min-h-[100dvh] items-center justify-center text-sm text-slate-400">加载中...</div>}>
      <RegisterContent />
    </Suspense>
  );
}

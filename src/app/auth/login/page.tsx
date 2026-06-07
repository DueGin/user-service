"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthForm } from "@/components/auth-form";
import { postAuthMessage, AUTH_SUCCESS_EVENT, AUTH_ERROR_EVENT } from "@/lib/embed-auth";

function LoginContent() {
  const searchParams = useSearchParams();
  const [successUsername, setSuccessUsername] = useState<string | null>(null);
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
    return `/auth/register?${params.toString()}`;
  }

  async function handleSuccess(data: {
    accessToken: string;
    refreshToken: string;
    user: { id: string; username: string; email?: string };
  }) {
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

    if (mode === "redirect" && redirectUri && appId) {
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
      } catch {
        // fall through
      }
    }

    // Fallback: just show success
    setSuccessUsername(data.user.username);
  }

  function handleError(message: string) {
    if (mode === "embed" && origin) {
      postAuthMessage({ type: AUTH_ERROR_EVENT, error: message }, origin);
    }
  }

  if (successUsername) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">登录成功</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">欢迎，{successUsername}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-950 p-4">
      {/* Decorative background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-500/8 rounded-full blur-3xl" />
      </div>
      <AuthForm
        mode="login"
        onSuccess={handleSuccess}
        onError={handleError}
        switchUrl={buildSwitchUrl()}
        appName={appName || undefined}
      />
    </div>
  );
}

export default function AuthLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <LoginContent />
    </Suspense>
  );
}

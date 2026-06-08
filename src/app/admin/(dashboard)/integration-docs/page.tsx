"use client";

import Link from "next/link";
import {
  AppWindow,
  ArrowRightLeft,
  BookOpenText,
  CheckCircle2,
  Code2,
  ExternalLink,
  KeyRound,
  Layers3,
  MessageSquareCode,
  RotateCw,
  ShieldCheck,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const redirectLoginUrl = `GET {USER_SERVICE}/auth/login?app_id={appId}&redirect_uri={callbackUrl}&mode=redirect&state={state}&app_name={appName}`;

const redirectCallback = `GET {callbackUrl}?code={authorizationCode}&state={state}`;

const exchangeRequest = `POST {USER_SERVICE}/api/auth/exchange
Content-Type: application/json

{
  "code": "{authorizationCode}",
  "appId": "{appId}",
  "apiSecret": "{apiSecret}"
}`;

const exchangeResponse = `{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": {
      "id": "user_id",
      "username": "zhangsan",
      "email": "user@example.com",
      "roles": ["admin"]
    }
  }
}`;

const embedSnippet = `const authUrl =
  "{USER_SERVICE}/auth/login" +
  "?app_id={appId}" +
  "&mode=embed" +
  "&origin=" + encodeURIComponent(window.location.origin) +
  "&app_name=" + encodeURIComponent("{appName}");

window.open(authUrl, "user-service-auth", "width=450,height=600");

window.addEventListener("message", (event) => {
  if (event.origin !== "{USER_SERVICE_ORIGIN}") return;

  if (event.data.type === "AUTH_SUCCESS") {
    const { token, refreshToken, user } = event.data;
    // 保存 token，并完成当前系统登录态初始化
  }

  if (event.data.type === "AUTH_ERROR") {
    console.error(event.data.error);
  }
});`;

const refreshRequest = `POST {USER_SERVICE}/api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "{refreshToken}"
}`;

const params = [
  { name: "app_id", required: "必填", note: "应用管理中创建应用后得到的应用 ID。" },
  { name: "redirect_uri", required: "重定向模式必填", note: "用户登录后回跳到业务系统的地址。" },
  { name: "mode", required: "可选", note: "redirect 或 embed，默认 redirect。" },
  { name: "state", required: "推荐", note: "业务系统生成的随机字符串，用于防重放和恢复登录前状态。" },
  { name: "origin", required: "嵌入模式必填", note: "iframe 或弹窗所在页面的源，用于 postMessage 和 frame-ancestors。" },
  { name: "app_name", required: "可选", note: "展示在登录/注册页上的应用名称。" },
];

const prerequisites = [
  "在应用管理中创建接入应用，保存 appId 与 apiSecret。",
  "配置 callbackUrl，重定向模式会校验回调地址的 origin。",
  "嵌入模式需要将业务系统域名加入 allowedOrigins，并在 URL 中传入 origin。",
  "业务系统后端保存 apiSecret，浏览器端不要暴露该密钥。",
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/60 p-4 text-xs leading-6 text-slate-300">
      <code>{children}</code>
    </pre>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BookOpenText;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-blue-300/20 bg-blue-300/10 text-blue-200">
        <Icon className="size-4" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-slate-50">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
      </div>
    </div>
  );
}

export default function IntegrationDocsPage() {
  return (
    <div className="space-y-7">
      <AdminPageHeader
        title="接入文档"
        description="当前系统已提供给第三方系统使用的默认登录页，支持重定向授权码模式与嵌入式登录模式。"
        icon={BookOpenText}
        action={
          <>
            <Link
              href="/demo"
              className="admin-secondary-button inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium"
            >
              <ExternalLink className="size-4" />
              打开 Demo
            </Link>
            <Link
              href="/admin/applications"
              className="admin-primary-button inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium"
            >
              <AppWindow className="size-4" />
              应用管理
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="admin-panel py-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">默认登录页</p>
                <p className="mt-2 font-mono text-lg font-semibold text-slate-50">/auth/login</p>
              </div>
              <Badge className="bg-green-500/10 text-green-400">已提供</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              外部系统可直接跳转到该页面完成统一账号登录。
            </p>
          </CardContent>
        </Card>

        <Card className="admin-panel py-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">默认注册页</p>
                <p className="mt-2 font-mono text-lg font-semibold text-slate-50">/auth/register</p>
              </div>
              <Badge className="bg-blue-500/10 text-blue-400">可选</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              登录页会保留接入参数并引导新用户切换到注册页。
            </p>
          </CardContent>
        </Card>

        <Card className="admin-panel py-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">推荐模式</p>
                <p className="mt-2 text-lg font-semibold text-slate-50">重定向授权码</p>
              </div>
              <ShieldCheck className="size-5 text-blue-200" />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              apiSecret 仅在业务系统后端兑换 token，适合正式系统接入。
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="admin-panel py-0">
        <CardHeader className="border-b border-white/10 px-5 py-4">
          <SectionTitle
            icon={KeyRound}
            title="接入前准备"
            description="先在后台创建应用，再把应用凭据和回调地址交给业务系统。"
          />
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {prerequisites.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-400" />
                <span className="text-sm leading-6 text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="admin-panel py-0">
          <CardHeader className="border-b border-white/10 px-5 py-4">
            <SectionTitle
              icon={ArrowRightLeft}
              title="模式 A：重定向授权码模式"
              description="业务系统跳转到默认登录页，登录成功后拿到授权码，再由后端兑换 token。"
            />
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            <div>
              <CardTitle className="mb-3 text-sm text-slate-200">1. 跳转到默认登录页</CardTitle>
              <CodeBlock>{redirectLoginUrl}</CodeBlock>
            </div>
            <div>
              <CardTitle className="mb-3 text-sm text-slate-200">2. 登录成功后回调业务系统</CardTitle>
              <CodeBlock>{redirectCallback}</CodeBlock>
            </div>
            <div>
              <CardTitle className="mb-3 text-sm text-slate-200">3. 后端用授权码兑换 token</CardTitle>
              <CodeBlock>{exchangeRequest}</CodeBlock>
            </div>
            <div>
              <CardTitle className="mb-3 text-sm text-slate-200">4. 兑换成功返回</CardTitle>
              <CodeBlock>{exchangeResponse}</CodeBlock>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-panel py-0">
          <CardHeader className="border-b border-white/10 px-5 py-4">
            <SectionTitle
              icon={Layers3}
              title="模式 B：嵌入式登录模式"
              description="适合 iframe 或弹窗登录，登录结果通过 postMessage 返回父页面或 opener。"
            />
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            <CodeBlock>{embedSnippet}</CodeBlock>
            <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/10 p-4">
              <div className="flex items-start gap-3">
                <MessageSquareCode className="mt-0.5 size-4 shrink-0 text-yellow-400" />
                <p className="text-sm leading-6 text-slate-300">
                  嵌入模式返回的事件类型为 <code className="font-mono text-yellow-300">AUTH_SUCCESS</code> 或{" "}
                  <code className="font-mono text-yellow-300">AUTH_ERROR</code>。业务系统必须校验{" "}
                  <code className="font-mono text-yellow-300">event.origin</code>，避免接收非认证服务来源的消息。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="admin-panel py-0">
        <CardHeader className="border-b border-white/10 px-5 py-4">
          <SectionTitle
            icon={Code2}
            title="登录页参数"
            description="这些参数会在登录页与注册页之间自动保留。"
          />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">参数</th>
                  <th className="px-5 py-3 font-medium">要求</th>
                  <th className="px-5 py-3 font-medium">说明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {params.map((param) => (
                  <tr key={param.name}>
                    <td className="px-5 py-4 font-mono text-xs text-blue-200">{param.name}</td>
                    <td className="px-5 py-4 text-slate-300">{param.required}</td>
                    <td className="px-5 py-4 leading-6 text-slate-400">{param.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="admin-panel py-0">
          <CardHeader className="border-b border-white/10 px-5 py-4">
            <SectionTitle
              icon={RotateCw}
              title="刷新登录态"
              description="accessToken 过期后，业务系统可使用 refreshToken 获取新的 token。"
            />
          </CardHeader>
          <CardContent className="p-5">
            <CodeBlock>{refreshRequest}</CodeBlock>
          </CardContent>
        </Card>

        <Card className="admin-panel py-0">
          <CardHeader className="border-b border-white/10 px-5 py-4">
            <SectionTitle
              icon={ExternalLink}
              title="公开入口"
              description="业务系统只需要拼接认证服务域名和下面的路径即可使用默认页面。"
            />
          </CardHeader>
          <CardContent className="space-y-3 p-5">
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs text-slate-500">登录</p>
              <p className="mt-2 font-mono text-sm text-slate-200">{"{USER_SERVICE}/auth/login"}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs text-slate-500">注册</p>
              <p className="mt-2 font-mono text-sm text-slate-200">{"{USER_SERVICE}/auth/register"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

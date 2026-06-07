# User Service — 用户基础服务

基于 Next.js 15 + PostgreSQL + Prisma 构建的用户管理系统。提供用户注册/登录、角色权限、应用接入（API Key）、操作审计等能力，并为第三方应用提供公开的登录/注册页面。

## 快速开始

### 1. 环境准备

- Node.js >= 20
- PostgreSQL 数据库

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env`，填写数据库连接和 JWT 密钥：

```bash
cp .env.example .env
```

### 4. 数据库迁移

```bash
npx prisma migrate dev --name init
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

---

## 系统架构

| 模块 | 路径 | 说明 |
|------|------|------|
| 管理后台 | `/admin` | 用户/角色/应用/日志管理 |
| 公开登录页 | `/auth/login` | 第三方应用可用 |
| 公开注册页 | `/auth/register` | 第三方应用可用 |
| REST API | `/api/*` | 所有后端接口 |

---

## API 接口一览

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/logout` | 用户登出 |
| POST | `/api/auth/refresh` | 刷新 Token |
| GET | `/api/auth/me` | 获取当前用户 |
| POST | `/api/auth/authorize` | 生成授权码 |
| POST | `/api/auth/exchange` | 授权码换 Token |

### 用户管理（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/users` | 用户列表（分页/搜索） |
| GET | `/api/users/:id` | 用户详情 |
| PUT | `/api/users/:id` | 更新用户 |
| DELETE | `/api/users/:id` | 禁用用户 |
| GET | `/api/users/:id/roles` | 获取用户角色 |
| POST | `/api/users/:id/roles` | 分配角色 |

### 角色管理（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/roles` | 角色列表 |
| POST | `/api/roles` | 创建角色 |
| GET | `/api/roles/:id` | 角色详情 |
| PUT | `/api/roles/:id` | 更新角色 |
| DELETE | `/api/roles/:id` | 删除角色 |

### 应用管理（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/applications` | 应用列表 |
| POST | `/api/applications` | 创建应用 |
| GET | `/api/applications/:id` | 应用详情 |
| PUT | `/api/applications/:id` | 更新应用 |
| DELETE | `/api/applications/:id` | 禁用应用 |
| POST | `/api/applications/:id/regenerate-key` | 重新生成密钥 |

### 审计日志（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/audit-logs` | 查询日志（分页/筛选） |

---

## 第三方应用接入指南

### 前置条件

1. 在管理后台「应用管理」中创建应用，获取 `appId`、`apiKey`、`apiSecret`
2. 配置好回调 URL（`callbackUrl`）和允许的域名（`allowedOrigins`）

### 模式 A：重定向模式（推荐）

类似 OAuth 授权码流程：

```
1. 将用户重定向到：
   GET {USER_SERVICE}/auth/login?app_id={appId}&redirect_uri={callbackUrl}&mode=redirect&state={随机字符串}

2. 用户完成登录后，会重定向回您的应用：
   GET {callbackUrl}?code={授权码}&state={state}

3. 您的后端使用授权码换取 Token：
   POST {USER_SERVICE}/api/auth/exchange
   Body: { "code": "xxx", "appId": "xxx", "apiSecret": "xxx" }

4. 返回：
   { "success": true, "data": { "accessToken": "...", "refreshToken": "...", "user": {...} } }
```

### 模式 B：嵌入式模式（iframe / 弹窗）

```javascript
// 打开 iframe 或弹窗
const authUrl = `${USER_SERVICE}/auth/login?app_id=${appId}&mode=embed&origin=${encodeURIComponent(window.location.origin)}`;

// iframe 方式
const iframe = document.createElement('iframe');
iframe.src = authUrl;
document.body.appendChild(iframe);

// 或弹窗方式
window.open(authUrl, 'auth', 'width=450,height=600');

// 监听登录结果
window.addEventListener('message', (event) => {
  if (event.origin !== USER_SERVICE_ORIGIN) return;

  if (event.data.type === 'AUTH_SUCCESS') {
    const { token, refreshToken, user } = event.data;
    // 处理登录成功
  }

  if (event.data.type === 'AUTH_ERROR') {
    console.error(event.data.error);
  }
});
```

### 使用 API Key 调用接口

管理类接口需要在请求头中携带 API Key：

```
x-api-key: ak_xxxxxxxxxxxx
```

---

## 技术栈

- **Next.js 15** (App Router) + React 19
- **TypeScript**
- **PostgreSQL** + Prisma ORM
- **JWT** (access/refresh token) + Session
- **TailwindCSS 4** + shadcn/ui + Lucide Icons
- **Zod** 参数校验
- **bcryptjs** 密码加密

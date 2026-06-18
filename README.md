# User Service — 用户基础服务

基于 Next.js + PostgreSQL + Prisma 构建的统一账号与 SSO 服务。提供用户注册/登录、角色权限、应用接入（API Key）、应用管理员指派、应用成员管理、操作审计等能力，并为其他自有应用提供公开的登录/注册页面。

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
| 管理后台 | `/admin` | 统一账号、角色、应用接入、审计管理 |
| 应用用户管理 | `/admin/application-users` | 应用管理员管理自己应用下的成员关系 |
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
| GET | `/api/applications/:id/managers` | 获取应用管理员 |
| POST | `/api/applications/:id/managers` | 指派应用管理员 |

### 应用成员管理（需应用管理员）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/application-users` | 当前应用管理员可管理的应用成员列表 |
| POST | `/api/application-users` | 将已有统一账号关联为应用成员 |
| PUT | `/api/application-users/:id` | 启用或禁用应用成员 |
| DELETE | `/api/application-users/:id` | 禁用应用成员 |
| GET | `/api/application-users/eligible-users` | 搜索可关联的已有统一账号 |

### 审计日志（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/audit-logs` | 查询日志（分页/筛选） |

---

## 第三方应用接入指南

### 前置条件

1. 在管理后台「应用管理」中创建应用，并从已有统一账号中选择一个或多个应用管理员，同时配置访问模式
2. 获取 `appId`、`apiKey`、`apiSecret`
3. 配置好回调 URL（`callbackUrl`）和允许的域名（`allowedOrigins`）

### 账号与应用成员关系

- 统一账号是全局身份，一个用户可以同时属于多个接入应用。
- 应用成员关系按 `appId + userId` 独立记录，应用 A 禁用用户不会影响应用 B。
- `OPEN` 模式下，用户首次通过某个应用登录或授权时，如果没有成员关系，会自动创建该应用下的 `ACTIVE` 成员关系。
- `MEMBERS_ONLY` 模式只允许已有 `ACTIVE` 应用成员登录。
- `ADMINS_ONLY` 模式只允许该应用的应用管理员登录。
- 如果用户已经在某个应用中被禁用，后续登录或授权不会自动重新启用，必须由该应用管理员手动启用。
- 应用管理员只能关联已有统一账号为应用成员，不能创建全局账号、管理全局角色或修改应用密钥。

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

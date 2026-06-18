# CI/CD 部署说明

本文档说明 `user-service` 的 GitHub Actions 流水线、Docker Compose 部署方式，以及测试环境和生产环境需要配置的参数。

## 文件说明

| 文件 | 说明 |
| --- | --- |
| `.github/workflows/deploy-test.yml` | 测试环境部署流水线，仅手动触发 |
| `.github/workflows/deploy-production.yml` | 生产环境部署流水线，仅手动触发，必须填写发布版本号 |
| `Dockerfile` | 应用镜像构建文件 |
| `docker-compose.yml` | 测试和生产服务器使用的 Compose 文件，不包含 PostgreSQL |
| `.env.example` | 服务器 `.env` 文件的参考模板 |

## 流水线触发规则

两条流水线都只支持手动触发，不会在 push、tag 或 merge 时自动部署。

### 测试环境

流水线文件：

```text
.github/workflows/deploy-test.yml
```

触发路径：

```text
GitHub -> Actions -> Deploy Test -> Run workflow
```

输入参数：

| 参数 | 是否必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| 无 | 否 | 无 | 运行时选择 GitHub 提供的分支或 ref 即可 |

镜像标签：

```text
ghcr.io/<owner>/<repo>:test-<commit-sha>
ghcr.io/<owner>/<repo>:test
```

实际部署的镜像是：

```text
ghcr.io/<owner>/<repo>:test-<commit-sha>
```

### 生产环境

流水线文件：

```text
.github/workflows/deploy-production.yml
```

触发路径：

```text
GitHub -> Actions -> Deploy Production -> Run workflow
```

输入参数：

| 参数 | 是否必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `version` | 是 | 无 | 发布版本号。可以填写 `1.0.0` 或 `v1.0.0`，流水线会自动保证最终镜像标签带 `v` 前缀 |

版本号规则：

| 输入 | 最终版本标签 |
| --- | --- |
| `1.0.0` | `v1.0.0` |
| `v1.0.0` | `v1.0.0` |

生产镜像标签：

```text
ghcr.io/<owner>/<repo>:v<version>
ghcr.io/<owner>/<repo>:production-<commit-sha>
ghcr.io/<owner>/<repo>:production
ghcr.io/<owner>/<repo>:latest
```

实际部署的镜像是：

```text
ghcr.io/<owner>/<repo>:v<version>
```

## CI/CD 部署配置项

两条流水线分别绑定 GitHub Environment：

| 流水线 | Environment |
| --- | --- |
| `deploy-test.yml` | `test` |
| `deploy-production.yml` | `production` |

需要在 GitHub 仓库中进入：

```text
Settings -> Environments
```

分别创建：

- `test`
- `production`

两个 Environment 使用相同的配置项名称，但值应按环境分别填写。

GitHub Actions 里只配置部署过程必需的信息。应用运行时变量、数据库、JWT、域名、端口等都放在服务器 `COMPOSE_DIR/.env` 中维护。

CI/CD 侧配置项总览：

| 配置项 | 位置 | 是否必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `version` | `Deploy Production` 手动触发输入 | 生产部署必填 | 无 | 生产镜像版本号，会自动补 `v` 前缀 |
| `SSH_HOST` | Environment Secret | 是 | 无 | 部署服务器 IP 或域名 |
| `SSH_PORT` | Environment Secret | 否 | `22` | SSH 端口 |
| `SSH_USERNAME` | Environment Secret | 是 | 无 | SSH 登录用户名 |
| `SSH_PASSWORD` | Environment Secret | 是 | 无 | SSH 登录密码 |
| `GHCR_USERNAME` | Environment Secret | 是 | 无 | 服务器登录 GHCR 使用的用户名 |
| `GHCR_TOKEN` | Environment Secret | 是 | 无 | 服务器登录 GHCR 使用的 token |
| `COMPOSE_DIR` | Environment Variable | 是 | 无 | 服务器上存放 `docker-compose.yml` 和 `.env` 的目录 |

## Environment Secrets

两个 Environment 只需要配置以下 Secrets：

| Secret 名称 | 是否必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `SSH_HOST` | 是 | 无 | 部署服务器 IP 或域名 |
| `SSH_PORT` | 否 | `22` | SSH 端口，不配置时 workflow 使用 `22` |
| `SSH_USERNAME` | 是 | 无 | SSH 登录用户名 |
| `SSH_PASSWORD` | 是 | 无 | SSH 登录密码 |
| `GHCR_USERNAME` | 是 | 无 | 服务器登录 GHCR 使用的用户名 |
| `GHCR_TOKEN` | 是 | 无 | 服务器登录 GHCR 使用的 token |

说明：

- `SSH_*` 用于 GitHub Actions 通过 SSH 登录目标服务器。
- `GHCR_USERNAME` 和 `GHCR_TOKEN` 用于服务器执行 `docker login ghcr.io`，然后拉取 GHCR 镜像。
- workflow 构建并推送镜像时使用 GitHub 内置的 `GITHUB_TOKEN`，不需要你额外配置。
- 如果 GHCR package 是私有的，`GHCR_TOKEN` 至少需要具备读取 package 的权限。

## Environment Variables

两个 Environment 只需要配置以下 Variables：

| Variable 名称 | 是否必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `COMPOSE_DIR` | 是 | 无 | 服务器上存放 `docker-compose.yml` 和 `.env` 的目录 |

建议目录：

| Environment | `COMPOSE_DIR` 示例 |
| --- | --- |
| `test` | `/opt/user-service-test` |
| `production` | `/opt/user-service` |

流水线会自动创建 `COMPOSE_DIR`，并把仓库中的 `docker-compose.yml` 上传到该目录。

## 服务器前置条件

测试服务器和生产服务器都需要提前安装：

- Docker
- Docker Compose v2
- 可以通过账号密码 SSH 登录
- 部署用户可以执行 `docker` 和 `docker compose`

可在服务器上验证：

```bash
docker --version
docker compose version
```

如果部署用户执行 Docker 命令提示权限不足，需要把该用户加入 `docker` 用户组，或按服务器安全策略配置 Docker 权限。

## 测试和生产 `.env`

流水线只会上传 `docker-compose.yml`，不会上传 `.env`，避免把密钥提交进仓库。

你需要在每个环境的 `COMPOSE_DIR` 下手动创建 `.env`：

```bash
cd /opt/user-service
nano .env
```

运行时配置不放在 GitHub Actions 或 GitHub Environment 中。请以仓库根目录的 `.env.example` 为模板，把数据库、JWT、域名、端口等配置写入服务器 `.env`。

最小示例：

```env
POSTGRES_HOST="db.example.com"
POSTGRES_PORT="5432"
POSTGRES_USER="user_service"
POSTGRES_PASSWORD="replace-with-strong-db-password"
POSTGRES_DB="user_service"
POSTGRES_SCHEMA="public"

JWT_SECRET="replace-with-strong-secret"
JWT_REFRESH_SECRET="replace-with-strong-refresh-secret"
USER_SERVICE_BASE_URL="https://user-service.example.com"
USER_SERVICE_PORT="3000"
USER_SERVICE_CONTAINER_NAME="user-service"
```

如果外部 PostgreSQL 要求 SSL：

```env
POSTGRES_SSLMODE="require"
```

如果需要添加其他连接参数：

```env
POSTGRES_URL_EXTRA_PARAMS="connect_timeout=10"
```

容器启动时会由 `docker-entrypoint.sh` 自动生成应用和 Prisma 需要的 `DATABASE_URL`。如果你确实需要完全自定义连接串，也可以直接配置：

```env
DATABASE_URL="postgresql://user:password@db.example.com:5432/user_service?schema=public&sslmode=require"
```

测试环境和生产环境必须使用不同的数据库、JWT 密钥和域名。

## Docker Compose 文件

测试和生产环境使用：

```text
docker-compose.yml
```

该文件只包含 `user-service` 服务，不包含 PostgreSQL。数据库应使用独立 PostgreSQL，并通过服务器 `.env` 中的 `POSTGRES_*` 拆分配置指定。

## 部署流程

两条流水线的核心流程一致：

1. 手动触发 workflow。
2. 拉取代码。
3. 安装 Node.js 20。
4. 执行 `npm ci`。
5. 执行 `npx prisma generate`。
6. 执行 `npm run lint`。
7. 执行 `npm test`。
8. 执行 `npm run build`。
9. 登录 GHCR。
10. 构建并推送 Docker 镜像。
11. 通过 SSH 登录服务器。
12. 创建 `COMPOSE_DIR`。
13. 上传 `docker-compose.yml`。
14. 在服务器登录 GHCR。
15. 设置本次部署镜像 `USER_SERVICE_IMAGE`。
16. 执行 `docker compose config --quiet`。
17. 执行 `docker compose pull user-service`。
18. 执行 `docker compose run --rm user-service npx prisma migrate deploy`。
19. 执行 `docker compose up -d user-service`。
20. 执行 `docker image prune -f` 清理未使用镜像。

## 首次部署步骤

### 1. 准备 GitHub Environment

在 GitHub 仓库中创建：

- `test`
- `production`

并分别配置本文档中的 Secrets 和 Variables。

### 2. 准备服务器目录

测试环境示例：

```bash
sudo mkdir -p /opt/user-service-test
sudo chown -R deploy:deploy /opt/user-service-test
```

生产环境示例：

```bash
sudo mkdir -p /opt/user-service
sudo chown -R deploy:deploy /opt/user-service
```

这里的 `deploy` 需要替换为实际的 `SSH_USERNAME`。

### 3. 创建服务器 `.env`

在每个环境的 `COMPOSE_DIR` 下创建 `.env`，并填入对应环境的数据库、JWT、域名等配置。

### 4. 确认服务器可以拉取 GHCR 镜像

在服务器上手动验证一次：

```bash
echo "<GHCR_TOKEN>" | docker login ghcr.io -u "<GHCR_USERNAME>" --password-stdin
```

### 5. 手动触发流水线

测试环境：

```text
GitHub -> Actions -> Deploy Test -> Run workflow
```

生产环境：

```text
GitHub -> Actions -> Deploy Production -> Run workflow -> 填写 version
```

## 手动回滚

如果需要回滚，可以在服务器 `.env` 中临时指定旧镜像：

```env
USER_SERVICE_IMAGE="ghcr.io/<owner>/<repo>:v<old-version>"
```

然后执行：

```bash
cd /opt/user-service
docker compose pull user-service
docker compose up -d user-service
```

如果是数据库迁移导致的问题，需要单独评估数据回滚策略。Prisma 的 `migrate deploy` 不会自动回滚已执行的迁移。

## 常见问题

### `COMPOSE_DIR is required`

说明 GitHub Environment Variable 没有配置 `COMPOSE_DIR`，或者 workflow 没有绑定到正确的 Environment。

检查：

- `Settings -> Environments -> test -> Variables`
- `Settings -> Environments -> production -> Variables`

### 生产环境版本号没有 `v` 前缀

正常。输入 `1.0.0` 时，workflow 会自动转换成 `v1.0.0`。

### `docker login ghcr.io` 失败

检查：

- `GHCR_USERNAME` 是否正确。
- `GHCR_TOKEN` 是否正确。
- `GHCR_TOKEN` 是否有读取 package 的权限。
- GHCR package 如果是私有的，部署账号是否有访问权限。

### `docker compose pull user-service` 失败

通常是镜像不存在或 GHCR 权限不足。

检查 Actions 日志中 `Build and push image` 是否成功，以及服务器上的 `docker login ghcr.io` 是否成功。

### `prisma migrate deploy` 失败

通常是数据库连接失败或迁移 SQL 执行失败。

检查：

- 服务器 `.env` 中的 `POSTGRES_HOST`、`POSTGRES_PORT`、`POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_DB`、`POSTGRES_SCHEMA`。
- 数据库网络是否对部署服务器开放。
- 数据库用户是否有迁移权限。
- Prisma migration 文件是否完整提交。

### 服务启动后访问失败

检查：

```bash
cd <COMPOSE_DIR>
docker compose ps
docker compose logs -f user-service
```

同时检查：

- `USER_SERVICE_PORT` 是否和服务器防火墙、反向代理配置一致。
- `USER_SERVICE_BASE_URL` 是否为当前环境的真实访问地址。
- 数据库、JWT、第三方应用配置是否正确。

## 安全建议

- `production` Environment 建议开启审批保护，避免误触发生产部署。
- 测试环境和生产环境不要复用数据库、JWT 密钥、GHCR token。
- 不要把服务器 `.env` 提交到仓库。
- 定期轮换 `SSH_PASSWORD` 和 `GHCR_TOKEN`。
- 条件允许时，后续可把 SSH 密码登录改为 SSH 私钥登录。

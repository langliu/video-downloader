# video-downloader

该项目基于 [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack) 创建，这是一个现代化的 TypeScript
技术栈，整合了 React、TanStack Start、Hono、ORPC 等技术。

## 功能特性

- **TypeScript** - 类型安全和改进的开发体验
- **TanStack Start** - 带有 TanStack Router 的 SSR 框架
- **TailwindCSS** - 实用优先的 CSS 框架，用于快速 UI 开发
- **shadcn/ui** - 可复用的 UI 组件
- **Hono** - 轻量级、高性能的服务端框架
- **oRPC** - 端到端类型安全的 API，集成了 OpenAPI
- **workers** - 运行环境
- **Drizzle** - TypeScript 优先的 ORM
- **SQLite/Turso** - 数据库引擎
- **Authentication** - Better-Auth 认证系统
- **Biome** - 代码检查和格式化工具
- **Husky** - Git 钩子，用于代码质量控制
- **Turborepo** - 优化的 monorepo 构建系统

## 快速开始

首先，安装依赖：

```bash
bun install
```

## 数据库设置

该项目使用 Drizzle ORM 和 SQLite 数据库。

1. 启动本地 SQLite 数据库：
   在本地开发中，Cloudflare D1 数据库会作为 `wrangler dev` 命令的一部分自动运行。

    ```shell
    bun db:generate
    cd apps/server && wrangler d1 migrations apply video-downloader --local
    ```

2. 如需要，请在 `apps/server` 目录下更新你的 `.env` 文件中的连接详情。

3. 将 schema 应用到数据库：

```bash
bun db:push
```

然后，启动开发服务器：

```bash
bun dev
```

在浏览器中打开 [http://localhost:3001](http://localhost:3001) 查看网页应用。
API 运行在 [http://localhost:3000](http://localhost:3000)。

## 部署到 Cloudflare 之前

当你准备将应用部署到 Cloudflare Workers 时，你需要进行一些更改：

- 更改你的 url 环境变量以匹配 Cloudflare 生成的 `*.workers.dev` 域名：

```bash
# apps/web/.env
SERVER_URL={your-production-server-domain}

# apps/server/.env
CORS_ORIGIN={your-production-web-domain}
BETTER_AUTH_URL={your-production-server-domain}
```

- 在 `apps/server/src/lib/auth.ts` 文件中，取消注释 `session.cookieCache` 和 `advanced.crossSubDomainCookies` 部分，并将
  `<your-workers-subdomain>` 替换为你的实际 workers 子域名。这些设置对于确保 cookie 在 web 和 server 域名之间正确传输是必需的。

## 部署 (Cloudflare Wrangler)

- Web 部署: cd apps/web && bun deploy
- Server 开发: cd apps/server && bun dev
- Server 部署: cd apps/server && bun deploy

## 项目结构

```
video-downloader/
├── apps/
│   ├── web/         # 前端应用 (React + TanStack Start)
│   └── server/      # 后端 API (Hono, ORPC)
├── packages/
│   ├── api/         # API 层 / 业务逻辑
│   ├── auth/        # 认证配置和逻辑
│   └── db/          # 数据库 schema 和查询
```

## 可用脚本

- `bun dev`: 以开发模式启动所有应用
- `bun build`: 构建所有应用
- `bun dev:web`: 仅启动 web 应用
- `bun dev:server`: 仅启动 server
- `bun check-types`: 检查所有应用的 TypeScript 类型
- `bun db:push`: 将 schema 变更推送到数据库
- `bun db:studio`: 打开数据库管理界面
- `cd apps/server && bun db:local`: 启动本地 SQLite 数据库
- `bun check`: 运行 Biome 格式化和代码检查

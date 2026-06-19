# 个人技术雷达

一个结构化的个人知识库与公开技术雷达。粘贴一段 X 帖 / GitHub README / 文章正文，由 Claude 按统一 schema 生成知识卡片入库；首页公开展示已发布卡片，`/library` 是管理员私库。

- **管理员**（单一邮箱）：可调用 AI 生成、手动编辑、CRUD。
- **登录用户**：可对任意可见卡片点 ♥ 收藏。
- **OAuth**：GitHub + Google（NextAuth v5）。
- **存储**：SQLite + Prisma。
- **AI**：Anthropic Claude（默认 `claude-sonnet-4-6`）。

## 数据模型

```
KnowledgeCard
  ├─ title, summary, body (Markdown)
  ├─ sourceType (github|x|article|video|tool|idea|manual)
  ├─ sourceUrl
  ├─ category (github-project | ai-coding | agent-engineering | context-engineering
  │            | frontend | iot | product-thinking | content-idea | career | tool | thinking)
  ├─ tags (CSV)
  ├─ score (0-100), priority (P0|P1|P2|P3)
  ├─ shouldSave (是否入库), publish (是否公开)
  └─ rawInput (管理员粘贴的原始输入，用于复跑)
```

Frontmatter 契约定义在 `prompts/tech-radar-agent.md`，字段名与表列名一一对应。改 schema 必须同时改提示词。

## 系统提示词

`prompts/tech-radar-agent.md` 是核心契约——

- 后端 `/admin/new` AI 生成时作为 `system` 注入到 Claude；
- 也可直接复制到 [claude.ai](https://claude.ai) 的 Project Settings 当 system 用；
- 输出唯一一份 frontmatter + Markdown body，可被 `gray-matter` 直接解析。

修改提示词时记得跑一次「AI 生成」验证字段仍能落库。

## 启动

```bash
# 1. 安装依赖
pnpm install

# 2. 复制环境模板
cp .env.example .env
# 在 .env 里填：
#   AUTH_SECRET         openssl rand -base64 32
#   ADMIN_EMAIL         你的 OAuth 邮箱（唯一管理员）
#   AUTH_GITHUB_ID      https://github.com/settings/developers
#   AUTH_GITHUB_SECRET
#   AUTH_GOOGLE_ID      https://console.cloud.google.com/apis/credentials
#   AUTH_GOOGLE_SECRET
#   ANTHROPIC_API_KEY   AI 生成必填
#   ANTHROPIC_MODEL     可选，默认 claude-sonnet-4-6

# 3. 建表
pnpm db:push

# 4. 跑
pnpm dev
```

OAuth 回调：

- GitHub: `http://localhost:3000/api/auth/callback/github`
- Google: `http://localhost:3000/api/auth/callback/google`

## 路由

| 路径 | 访问权 | 说明 |
|---|---|---|
| `/` | 公开 | 仅 `publish: true` 卡片，按优先级排序 |
| `/cards/[id]` | 公开（如 publish=true）/ 管理员 | 卡片详情，Markdown 渲染 |
| `/library` | 仅管理员 | 完整私库（所有 `shouldSave: true`） |
| `/admin` | 仅管理员 | CRUD 列表 |
| `/admin/new` | 仅管理员 | AI 生成（粘贴输入）+ 手动编辑 |
| `/admin/[id]/edit` | 仅管理员 | 编辑全部字段 |
| `/favorites` | 登录用户 | 自己 ♥ 过的卡片 |

## 工作流

1. 看到值得记录的内容（X 帖 / GitHub / 文章 / 想法）。
2. 进 `/admin/new`，把链接或正文粘到「AI 生成」框，点生成。
3. Claude 按 `prompts/tech-radar-agent.md` 输出 frontmatter + Markdown body。
4. 后端 `gray-matter` 解析，落 SQLite，跳转到 `/cards/[id]`。
5. 想公开就编辑勾上 `publish` → 首页出现。

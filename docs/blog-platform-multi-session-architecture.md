# 博客平台全栈开发 - 多会话 Agent 协作架构

> **版本**: 1.0.0
> **日期**: 2024-01-29
> **状态**: 设计中

---

## 目录

1. [概述](#概述)
2. [背景与动机](#背景与动机)
3. [核心概念](#核心概念)
4. [架构设计](#架构设计)
5. [协议规范](#协议规范)
6. [工作流程](#工作流程)
7. [通信机制](#通信机制)
8. [状态同步策略](#状态同步策略)
9. [实现方案](#实现方案)
10. [技术栈](#技术栈)
11. [项目结构](#项目结构)
12. [执行流程](#执行流程)
13. [实施计划](#实施计划)
14. [验证标准](#验证标准)

---

## 概述

### 目标

设计并实现多会话 Agent 协作架构，解决单会话上下文污染问题，实现：

- **上下文隔离**：每个 Agent 运行在独立会话中
- **状态同步**：会话间状态同步机制
- **协调管理**：主协调器 Agent 管理分布式会话

### 应用场景

本架构用于博客平台的全栈开发，演示如何通过多个独立 Agent 会话协作完成：
- 领域建模与类型定义
- RESTful API 设计
- 后端服务实现（NestJS）
- 前端界面实现（Next.js）

---

## 背景与动机

### 单会话模式的局限性

| 局限性 | 描述 | 影响 |
|--------|------|------|
| **上下文污染** | 多个 Agent 共享同一对话上下文 | Token 消耗快，上下文混乱 |
| **隔离性差** | Agent 间可能互相干扰 | 调试困难，错误传播 |
| **扩展受限** | 受单会话上下文 token 限制 | 无法无限并行 |

### 多会话架构的核心价值

- **上下文隔离**：每个 Agent 有独立的上下文空间
- **无限并行**：理论上可启动任意数量的会话
- **持久化状态**：会话完成后的状态可被后续复用
- **易于调试**：每个会话有独立的日志和历史

---

## 核心概念

### 1. 会话 (Session)

**定义**：独立的 Claude Code 对话上下文

**特点**：
- 拥有独立的 token 预算
- 拥有独立的消息历史
- 可被唯一标识（Session ID）

**生命周期**：

```
创建 → 执行任务 → 输出状态 → 完成/暂停
```

### 2. 主协调器 (Coordinator)

**职责**：

| 职责 | 描述 |
|------|------|
| 任务分发 | 根据依赖关系分配任务给合适的会话 |
| 状态管理 | 收集、验证、存储会话输出状态 |
| 冲突检测 | 检测会话间的输出冲突 |
| 依赖触发 | 当依赖满足时自动触发后续任务 |
| 报告生成 | 生成执行报告和验证结果 |

### 3. 状态存储 (State Store)

**目的**：持久化会话输出，供其他会话读取

**存储内容**：
- 会话输出状态（JSON 格式）
- 任务契约文件（Markdown 格式）
- 完成信号文件
- 锁文件

---

## 架构设计

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      主协调器会话                             │
│                   (Coordinator Session)                      │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ 任务分发器  │  │ 状态管理器  │  │ 冲突检测器  │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ 会话 1       │   │ 会话 2       │   │ 会话 N       │
│ 领域建模     │   │ API 设计     │   │ 前端开发     │
├─────────────┤   ├─────────────┤   ├─────────────┤
│ • 独立上下文 │   │ • 独立上下文 │   │ • 独立上下文 │
│ • 读取契约   │   │ • 读取契约   │   │ • 读取契约   │
│ • 输出状态   │   │ • 输出状态   │   │ • 输出状态   │
└─────────────┘   └─────────────┘   └─────────────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │  状态存储       │
                  │  (State Store)  │
                  │                │
                  │ • agent-states/ │
                  │   ├─ domain.json│
                  │   ├─ api.json   │
                  │   └─ ui.json    │
                  └────────────────┘
```

### 数据流图

```
┌──────────────┐
│ 主协调器     │
│ 读取配置     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 分析依赖     │
│ 构建执行图   │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ 并行启动独立会话                      │
│ • 会话 A: 领域建模                    │
│ • 会话 B: API 设计                    │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ 会话执行任务                          │
│ • 读取任务契约                        │
│ • 读取依赖状态                        │
│ • 执行开发工作                        │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ 输出状态文件                          │
│ • outputs/{agent-name}-{id}.json     │
│ • signals/{agent-name}-{id}.done     │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ 主协调器收集状态                      │
│ • 轮询 signals/ 目录                  │
│ • 读取 outputs/ 目录                  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ 验证与冲突检测                        │
│ • 运行类型检查                        │
│ • 检测类型冲突                        │
│ • 检测文件冲突                        │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ 解决冲突或报告用户                    │
│ • 自动修复（如可能）                  │
│ • 生成冲突报告                        │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ 触发依赖任务                          │
│ • 检查依赖是否满足                    │
│ • 启动下一批会话                      │
└──────────────────────────────────────┘
```

---

## 协议规范

### 会话输出格式

每个会话完成后必须输出状态文件到 `agent-states/outputs/` 目录：

**文件名格式**: `{agent-name}-{timestamp}.json`

**内容格式**：

```json
{
  "session_id": "domain-modeler-001",
  "agent_name": "domain-modeler",
  "agent_type": "executor",
  "status": "completed",
  "timestamp": "2024-01-29T10:00:00Z",

  "outputs": {
    "files_created": [
      "packages/shared/src/types/user.ts",
      "packages/shared/src/types/post.ts",
      "packages/shared/src/types/comment.ts"
    ],
    "files_modified": [],
    "apis_declared": [],
    "types_defined": ["User", "Post", "Comment", "BaseEntity"]
  },

  "dependencies": {
    "requires": [],
    "consumed": []
  },

  "provides": [
    {
      "name": "domain-types",
      "location": "packages/shared/src/types/",
      "files": ["user.ts", "post.ts", "comment.ts", "base.ts"],
      "validation": ["tsc --noEmit"]
    }
  ],

  "validation": {
    "self_check": "passed",
    "commands_run": [
      {"cmd": "tsc --noEmit", "exit_code": 0, "output": "..."}
    ],
    "integration_tests": []
  },

  "next_actions": [],
  "blockers": [],

  "metadata": {
    "token_usage": 12345,
    "duration_seconds": 300,
    "retry_count": 0,
    "workspace_root": "/Users/yichen/Desktop/yichen-Toys/my"
  }
}
```

### 主协调器配置

**文件**: `agent-states/coordinator-config.json`

```json
{
  "project_name": "blog-platform",
  "workspace_root": "/Users/yichen/Desktop/yichen-Toys/my",
  "state_store_path": "agent-states",
  "version": "1.0.0",

  "agents": [
    {
      "name": "domain-modeler",
      "type": "executor",
      "description": "领域建模专家，设计业务类型定义",

      "session_init": "你是一个领域建模专家。你的任务是为博客平台设计业务类型定义。",

      "task_contract": "agent-states/contracts/domain-task.md",
      "output_template": "agent-states/templates/session-state-template.json",

      "dependencies": [],
      "priority": 1,
      "timeout_minutes": 15,
      "retry_max": 3,

      "validation_rules": {
        "required_outputs": ["packages/shared/src/types/*.ts"],
        "commands": ["tsc --noEmit"],
        "success_criteria": ["all_types_defined", "compiles_successfully"]
      }
    },
    {
      "name": "api-designer",
      "type": "executor",
      "description": "API 设计专家，设计 RESTful API",

      "session_init": "你是一个 API 设计专家。你的任务是为博客平台设计 RESTful API。",

      "task_contract": "agent-states/contracts/api-task.md",
      "output_template": "agent-states/templates/session-state-template.json",

      "dependencies": [],
      "priority": 1,
      "timeout_minutes": 15,
      "retry_max": 3,

      "validation_rules": {
        "required_outputs": ["docs/api-contract.md"],
        "commands": [],
        "success_criteria": ["all_endpoints_defined", "contracts_complete"]
      }
    },
    {
      "name": "backend-developer",
      "type": "executor",
      "description": "NestJS 后端开发专家",

      "session_init": "你是一个 NestJS 后端开发专家。实现 API 契约中定义的所有端点。",

      "task_contract": "agent-states/contracts/backend-task.md",
      "output_template": "agent-states/templates/session-state-template.json",

      "dependencies": ["domain-types", "api-contract"],
      "priority": 2,
      "timeout_minutes": 30,
      "retry_max": 3,

      "validation_rules": {
        "required_outputs": ["packages/backend/src/**/*.ts"],
        "commands": ["cd packages/backend && npm run build"],
        "success_criteria": ["builds_successfully", "all_endpoints_implemented"]
      }
    },
    {
      "name": "frontend-developer",
      "type": "executor",
      "description": "Next.js 前端开发专家",

      "session_init": "你是一个 Next.js 前端开发专家。基于 API 契约实现 UI。",

      "task_contract": "agent-states/contracts/frontend-task.md",
      "output_template": "agent-states/templates/session-state-template.json",

      "dependencies": ["api-contract"],
      "priority": 2,
      "timeout_minutes": 30,
      "retry_max": 3,

      "validation_rules": {
        "required_outputs": ["packages/frontend/**/*.{ts,tsx}"],
        "commands": ["cd packages/frontend && npm run build"],
        "success_criteria": ["builds_successfully", "all_pages_implemented"]
      }
    }
  ],

  "conflict_resolution": {
    "type_mismatch": "update_domain_model",
    "file_conflict": "manual_merge",
    "priority": ["backend", "frontend", "contract"]
  },

  "execution": {
    "polling_interval_seconds": 5,
    "max_parallel_sessions": 10,
    "fail_fast": false
  }
}
```

### 状态值规范

| 字段 | 类型 | 允许值 | 说明 |
|------|------|--------|------|
| `status` | string | `completed`, `failed`, `blocked`, `in_progress`, `paused` | 会话状态 |
| `agent_type` | string | `planner`, `executor`, `validator` | Agent 类型 |
| `self_check` | string | `passed`, `failed`, `skipped` | 自检结果 |

---

## 工作流程

### 阶段 1：初始化（主协调器）

```bash
# 1. 创建状态存储目录
mkdir -p agent-states/{contracts,outputs,signals,locks,templates,logs}

# 2. 读取配置文件
jq '.' agent-states/coordinator-config.json

# 3. 分析依赖关系，构建执行图
#    - domain-modeler: 无依赖
#    - api-designer: 无依赖
#    - backend-developer: 依赖 domain-types, api-contract
#    - frontend-developer: 依赖 api-contract

# 4. 识别可并行执行的 Agent 组
#    第1批: [domain-modeler, api-designer] (可并行)
#    第2批: [backend-developer, frontend-developer] (可并行，等第1批完成)
```

### 阶段 2：并行启动会话

```bash
# 主协调器同时启动多个独立会话

# 会话 1：领域建模
claude-code \
  --session-id="domain-modeler-$(date +%s)" \
  --prompt="从 agent-states/contracts/domain-task.md 读取任务并执行" \
  --output-state="agent-states/outputs/domain-modeler-$(date +%s).json" \
  &

# 会话 2：API 设计（与会话 1 并行）
claude-code \
  --session-id="api-designer-$(date +%s)" \
  --prompt="从 agent-states/contracts/api-task.md 读取任务并执行" \
  --output-state="agent-states/outputs/api-designer-$(date +%s).json" \
  &

# 主协调器等待两会话完成...
wait
```

### 阶段 3：状态收集与验证

```bash
# 主协调器执行

# 1. 轮询 signals/ 目录，检查完成信号
while [ ! -f "agent-states/signals/domain-modeler-*.done" ] || \
      [ ! -f "agent-states/signals/api-designer-*.done" ]; do
  sleep 5
done

# 2. 读取状态文件
DOMAIN_STATE=$(ls agent-states/outputs/domain-modeler-*.json | tail -1)
API_STATE=$(ls agent-states/outputs/api-designer-*.json | tail -1)

jq '.' "$DOMAIN_STATE"
jq '.' "$API_STATE"

# 3. 运行验证规则
cd packages/shared && tsc --noEmit

# 4. 检测冲突
node scripts/detect-conflicts.js \
  --state1 "$DOMAIN_STATE" \
  --state2 "$API_STATE"
```

### 阶段 4：冲突解决

**示例冲突报告**：

```json
{
  "conflicts": [
    {
      "type": "type_mismatch",
      "severity": "error",
      "source": "api-designer",
      "target": "domain-modeler",
      "details": {
        "entity": "User",
        "field": "name",
        "expected": "username",
        "actual": "name"
      },
      "resolution": {
        "action": "update_domain_model",
        "description": "修改 packages/shared/src/types/user.ts：name → username",
        "auto_fixable": true
      }
    }
  ],
  "summary": {
    "total": 1,
    "errors": 1,
    "warnings": 0,
    "auto_fixable": 1
  }
}
```

### 阶段 5：依赖触发

```bash
# 当 domain-types 和 api-contract 都验证通过后
# 主协调器触发下一批 Agent

# 会话 3：后端开发（依赖 domain-types, api-contract）
claude-code \
  --session-id="backend-dev-$(date +%s)" \
  --prompt="读取 agent-states/outputs/domain-modeler-*.json 和 api-designer-*.json，实现后端 API" \
  --dependency-states="$DOMAIN_STATE,$API_STATE" \
  --output-state="agent-states/outputs/backend-dev-$(date +%s).json" \
  &

# 会话 4：前端开发（与后端并行，依赖 api-contract）
claude-code \
  --session-id="frontend-dev-$(date +%s)" \
  --prompt="读取 agent-states/outputs/api-designer-*.json，实现前端 UI" \
  --dependency-states="$API_STATE" \
  --output-state="agent-states/outputs/frontend-dev-$(date +%s).json" \
  &

# 等待完成
wait
```

---

## 通信机制

### 主协调器 → 子会话

#### 方式 1：任务契约文件

**目录**: `agent-states/contracts/`

**任务书模板**：

```markdown
# 任务：领域建模

## 任务 ID
domain-modeler-001

## 上下文
- **项目**: 博客平台
- **目标**: 定义业务实体类型
- **工作空间**: /Users/yichen/Desktop/yichen-Toys/my

## 依赖
读取以下文件：
- agent-states/bootstrap/project-context.md
- agent-states/requirements/business-requirements.md

## 输出要求

### 必须创建的文件
1. `packages/shared/src/types/user.ts` - User 类型定义
2. `packages/shared/src/types/post.ts` - Post 类型定义
3. `packages/shared/src/types/comment.ts` - Comment 类型定义
4. `packages/shared/src/types/base.ts` - 基础类型定义

### 必须定义的类型
- `User`: id, username, email, passwordHash, createdAt
- `Post`: id, title, content, excerpt, authorId, createdAt, updatedAt, commentCount
- `Comment`: id, content, authorId, postId, createdAt, updatedAt
- `BaseEntity`: id, createdAt, updatedAt

### 状态输出
完成任务后，输出状态到：
```
agent-states/outputs/domain-modeler-001-state.json
```

## 验收标准
- [ ] TypeScript 编译通过（`tsc --noEmit`）
- [ ] 包含所有必需字段
- [ ] 字段类型正确
- [ ] 状态文件格式正确

## 超时
15 分钟后自动暂停，写入 `.paused` 文件

## 错误处理
如遇阻塞问题，在状态文件的 `blockers` 字段中记录。
```

#### 方式 2：状态查询命令

子会话可以主动查询依赖状态：

```bash
# 查询领域建模状态
cat agent-states/outputs/domain-modeler-001-state.json | jq '.outputs'

# 检查是否完成
test -f agent-states/signals/domain-modeler-001.done
```

### 子会话 → 主协调器

#### 方式：状态文件输出 + 信号文件

```bash
# 子会话完成时写入状态文件
cat > agent-states/outputs/domain-modeler-001-state.json << 'EOF'
{
  "session_id": "domain-modeler-001",
  "status": "completed",
  ...
}
EOF

# 创建完成信号（通知主协调器）
touch agent-states/signals/domain-modeler-001.done

# 可选：写入日志
echo "$(date): domain-modeler-001 completed" >> agent-states/logs/coordinator.log
```

---

## 状态同步策略

### 1. 拉取模式 (Pull-based)

**机制**:
- 子会话完成任务后写入状态文件
- 主协调器定期轮询检查状态文件

**优点**:
- 简单可靠
- 易于调试
- 无需额外服务

**缺点**:
- 有延迟（取决于轮询间隔）
- 空轮询浪费资源

### 2. 推送模式 (Push-based)

**机制**:
- 子会话完成时主动调用主协调器 API
- 主协调器立即处理新状态

**优点**:
- 实时性好
- 无空轮询

**缺点**:
- 需要额外服务（HTTP API）
- 增加复杂度

### 3. 混合模式 (推荐)

**机制**:
- 状态文件持久化（Pull 的可靠性）
- 信号文件通知（Push 的实时性）

**工作流程**:
```
子会话 → 写入状态文件 → 创建信号文件 → 主协调器检测到信号 → 读取状态
```

**实现**:
```javascript
// 主协调器轮询逻辑
setInterval(() => {
  const pendingAgents = getPendingAgents();
  pendingAgents.forEach(agent => {
    const signalFile = `agent-states/signals/${agent.sessionId}.done`;
    if (fs.existsSync(signalFile)) {
      collectState(agent);
    }
  });
}, config.pollingInterval * 1000);
```

---

## 实现方案

### 方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **纯文件系统** | 简单、可靠、易调试 | 轮询延迟、跨机器差 | ⭐⭐⭐⭐⭐ |
| **SQLite** | 支持复杂查询、事务保证 | 需要额外依赖、调试复杂 | ⭐⭐⭐ |
| **Redis** | 高性能、支持 Pub/Sub | 需要额外服务 | ⭐⭐⭐ |
| **Git Commits** | 版本控制、分布式 | 污染 Git 历史 | ⭐⭐ |

### 推荐：纯文件系统方案

**目录结构**:
```
agent-states/
├── contracts/           # 任务契约文件
│   ├── domain-task.md
│   ├── api-task.md
│   ├── backend-task.md
│   └── frontend-task.md
│
├── outputs/            # 会话输出状态
│   ├── domain-modeler-001.json
│   ├── api-designer-001.json
│   ├── backend-dev-001.json
│   └── frontend-dev-001.json
│
├── signals/            # 完成信号（空文件）
│   ├── domain-modeler-001.done
│   ├── api-designer-001.done
│   └── ...
│
├── locks/              # 文件锁（防止并发冲突）
│   └── coordinator.lock
│
├── templates/          # 状态文件模板
│   └── session-state-template.json
│
├── logs/               # 日志文件
│   ├── coordinator.log
│   └── agent-001.log
│
├── reports/            # 生成的报告
│   ├── conflict-report.json
│   └── execution-report.html
│
├── schemas/            # JSON Schema 验证
│   └── session-state.json
│
└── coordinator-config.json  # 主配置文件
```

---

## 技术栈

```
语言: TypeScript (前后端统一)
后端: NestJS 10.x (装饰器驱动，自动生成 OpenAPI)
前端: Next.js 14+ (App Router + Server Components)
数据库: Lowdb (纯 JavaScript JSON 数据库)
包管理: pnpm workspace (简化 monorepo)
类型生成: openapi-typescript-codegen
状态存储: 文件系统 (JSON)
会话通信: 信号文件 + 状态文件轮询
```

---

## 项目结构

```
my/
├── packages/
│   ├── shared/              # 共享类型定义
│   │   ├── src/
│   │   │   └── types/       # User、Post、Comment 等业务类型
│   │   └── package.json
│   │
│   ├── backend/             # 后端代码
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/    # 认证模块
│   │   │   │   ├── posts/   # 文章模块
│   │   │   │   └── comments/# 评论模块
│   │   │   └── main.ts
│   │   └── package.json
│   │
│   └── frontend/            # 前端代码
│       ├── app/
│       │   ├── (auth)/      # 登录/注册页面
│       │   └── (main)/      # 主界面
│       ├── components/
│       └── lib/
│           └── api/         # API 客户端
│
├── agent-states/            # 多会话状态存储
│   ├── contracts/           # 任务契约
│   ├── outputs/            # 会话输出
│   ├── signals/            # 完成信号
│   ├── locks/              # 文件锁
│   ├── templates/          # 模板
│   ├── logs/               # 日志
│   ├── reports/            # 报告
│   ├── schemas/            # Schema
│   └── coordinator-config.json
│
├── scripts/                 # 自动化脚本
│   ├── coordinator.js      # 主协调器
│   ├── launch-session.sh   # 会话启动器
│   └── sync-state.js       # 状态同步工具
│
├── docs/
│   ├── agent-protocol.md        # Agent 通信协议定义
│   ├── api-contract.md          # API 契约文档
│   └── multi-session-architecture.md  # 多会话架构文档
│
├── pnpm-workspace.yaml
└── package.json
```

---

## 执行流程

### 单会话模式 vs 多会话模式

#### 单会话模式（当前实现）

```
1. 初始化 Monorepo 结构
2. 阶段 1：并行启动领域建模 + API 设计 Agent（同一会话）
3. 阶段 2：后端开发 Agent 实现 API（同一会话）
4. 阶段 3：前端开发 Agent 实现 UI（与阶段 2 并行，同一会话）
5. 阶段 4：集成验证
```

#### 多会话模式（设计目标）

```
1. 主协调器初始化状态存储
2. 阶段 1：并行启动会话 A（领域建模）+ 会话 B（API 设计）
3. 主协调器收集状态，验证冲突
4. 阶段 2：并行启动会话 C（后端开发）+ 会话 D（前端开发）
5. 主协调器最终集成验证
```

### 多会话版本执行流程

#### 阶段 1：架构规划（并行会话）

**主协调器同时启动 2 个独立会话：**

| 会话 ID | Agent | 任务 | 输出 |
|---------|-------|------|------|
| domain-001 | 领域建模 | 设计业务类型 | `packages/shared/src/types/*.ts` |
| api-001 | API 设计 | 设计 RESTful 接口 | `docs/api-contract.md` |

**关键**：两个会话完全隔离，互不干扰

#### 阶段 2：后端开发（独立会话）

| 会话 ID | Agent | 任务 | 输出 |
|---------|-------|------|------|
| backend-001 | 后端开发 | 实现 Controller + Service | `packages/backend/src/modules/*` |

#### 阶段 3：前端开发（独立会话，与阶段 2 并行）

| 会话 ID | Agent | 任务 | 输出 |
|---------|-------|------|------|
| frontend-001 | 前端开发 | 基于 API 契约开发 UI | `packages/frontend/*` |

**关键**：前端基于 API 契约开发，使用 Mock 数据，不等后端实现完成

#### 阶段 4：集成验证（主协调器）

- 主协调器读取所有会话状态
- 合并输出，检测冲突
- 运行端到端测试
- 生成验证报告

---

## 实施计划

### Step 1: 创建状态存储结构

**文件**: `agent-states/coordinator-config.json`

主协调器配置，定义所有 Agent 及其依赖关系。

**文件**: `agent-states/contracts/*.md`

为每个 Agent 创建任务契约文件：
- `domain-task.md` - 领域建模任务
- `api-task.md` - API 设计任务
- `backend-task.md` - 后端开发任务
- `frontend-task.md` - 前端开发任务

### Step 2: 实现主协调器脚本

**文件**: `scripts/coordinator.js`

功能：
1. 读取配置文件
2. 分析依赖关系，构建执行图
3. 启动子会话（通过 shell 调用）
4. 轮询状态文件
5. 验证输出
6. 触发依赖任务
7. 生成最终报告

### Step 3: 实现会话启动脚本

**文件**: `scripts/launch-session.sh`

功能：
1. 创建新的 Claude Code 会话
2. 加载任务契约
3. 读取依赖状态
4. 执行任务
5. 输出状态文件

### Step 4: 创建状态模板

**文件**: `agent-states/templates/session-state-template.json`

状态文件模板，确保所有会话输出格式一致。

### Step 5-8: 测试与验证

- Step 5: 测试单会话流程
- Step 6: 测试并行会话
- Step 7: 测试依赖触发
- Step 8: 完整流程测试

---

## 验证标准

### 功能验证

```bash
# 启动单个会话
./scripts/launch-session.sh domain-modeler

# 验证输出
cat agent-states/outputs/domain-modeler-001-state.json
```

### 技术验证

```bash
# 类型检查
cd packages/backend && npm run type-check
cd packages/frontend && npm run type-check
```

### 架构验证

| 验证项 | 方法 | 成功标准 |
|--------|------|----------|
| **上下文隔离** | 检查会话日志 | 每个会话有独立的消息历史 |
| **状态同步** | 检查状态文件 | 状态正确写入和读取 |
| **冲突检测** | 制造冲突并检测 | 正确识别冲突类型 |
| **依赖触发** | 观察执行顺序 | 依赖任务正确等待和触发 |
| **并发安全** | 并行启动 10+ 会话 | 无文件锁冲突 |

### 成功标准

#### MVP（最小可行产品）

- [ ] 主协调器可以启动子会话
- [ ] 子会话可以读取任务契约
- [ ] 子会话可以输出状态文件
- [ ] 主协调器可以收集状态
- [ ] 基本的冲突检测

#### 完整功能

- [ ] 自动依赖触发
- [ ] 自动冲突解决
- [ ] 超时处理
- [ ] 失败重试
- [ ] 进度可视化
- [ ] 日志记录
- [ ] 测试报告生成

---

## 附录

### A. 关键演示点

1. **真正的上下文隔离**：每个 Agent 在独立会话中运行
2. **无限并行能力**：不受单会话 token 限制
3. **状态持久化**：会话输出可被后续复用
4. **自动冲突检测**：主协调器检测并解决冲突
5. **依赖驱动触发**：自动触发依赖任务
6. **结构化输出**：统一的 JSON 格式便于解析

### B. 依赖声明规则

1. **显式声明依赖**：每个 Agent 必须列出所有依赖
2. **依赖类型**：
   - `types`: 需要导入的类型定义
   - `files`: 需要读取的具体文件
   - `services`: 需要运行的服务（如数据库）
   - `states`: 需要读取的其他会话状态文件

3. **冲突解决**：
   - 如果多个 Agent 修改同一文件，主协调器执行三路合并
   - 如果无法自动合并，暂停并通知用户
   - 优先级：后端 > 前端 > 契约（可配置）

### C. 触发器规则

- Agent 完成时自动触发依赖其输出的 Agent
- 超时时间：单个 Agent 最多 10 分钟
- 失败重试：最多 3 次
- 超时后自动暂停，写入 `.paused` 状态文件

### D. 核心功能

#### 用户认证
- 注册
- 登录
- 登出

#### 文章管理
- 创建文章
- 查看文章列表
- 查看文章详情
- 编辑文章（作者本人）
- 删除文章（作者本人）

#### 评论系统
- 为文章添加评论
- 查看文章的评论列表

---

**文档版本**: 1.0.0
**最后更新**: 2024-01-29
**维护者**: Claude Code

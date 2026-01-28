# 多会话 Agent 协作架构设计文档

> **版本**: 1.0.0
> **日期**: 2024-01-29
> **作者**: Claude Code
> **状态**: 设计中

---

## 目录

1. [概述](#概述)
2. [核心概念](#核心概念)
3. [架构设计](#架构设计)
4. [协议规范](#协议规范)
5. [工作流程](#工作流程)
6. [通信机制](#通信机制)
7. [状态同步策略](#状态同步策略)
8. [实现方案](#实现方案)
9. [关键文件](#关键文件)
10. [验证步骤](#验证步骤)
11. [风险与挑战](#风险与挑战)

---

## 概述

### 背景与动机

当前单会话并行 Agent 模式存在以下局限性：

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
  --prompt="读取 agent-states/outputs/domain-modeler-*.json 和 api-designer-*..json，实现后端 API" \
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

**任务书模板**:

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

**实现**:
```javascript
// 子会话完成时
const response = await fetch('http://localhost:3000/api/coordinator/state', {
  method: 'POST',
  body: JSON.stringify(stateData)
});
```

### 3. 混合模式 (推荐)

**机制**:
- 状态文件持久化（Pull 的可靠性）
- 信号文件通知（Push 的实时性）

**工作流程**:
```
子会话 → 写入状态文件 → 创建信号文件 → 主协调器检测到信号 → 读取状态
```

**实现**:
```bash
# 子会话
echo '{...}' > outputs/agent-001.json
touch signals/agent-001.done

# 主协调器
while true; do
  for signal in signals/*.done; do
    if [ -f "$signal" ]; then
      sessionId=$(basename "$signal" .done)
      collectState "$sessionId"
      rm "$signal"  # 清理信号文件
    fi
  done
  sleep 5
done
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

## 关键文件

### 配置文件

#### `agent-states/coordinator-config.json`
主协调器配置，定义所有 Agent 及其依赖关系。

### 脚本文件

#### `scripts/coordinator.js`
主协调器脚本，自动化协调逻辑。

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 读取配置
const config = JSON.parse(
  fs.readFileSync('agent-states/coordinator-config.json', 'utf8')
);

// 分析依赖，构建执行图
function buildExecutionGraph(config) {
  // TODO: 实现依赖图构建
  return {
    batches: [
      ['domain-modeler', 'api-designer'],
      ['backend-developer', 'frontend-developer']
    ]
  };
}

// 启动会话
function launchSession(agentName) {
  const agent = config.agents.find(a => a.name === agentName);
  const sessionId = `${agentName}-${Date.now()}`;

  console.log(`Launching session: ${sessionId}`);

  const child = spawn('claude-code', [
    `--session-id=${sessionId}`,
    `--prompt=从 ${agent.task_contract} 读取任务并执行`,
    `--output-state=agent-states/outputs/${sessionId}.json`
  ]);

  return { sessionId, child };
}

// 主循环
async function main() {
  const graph = buildExecutionGraph(config);

  for (const batch of graph.batches) {
    console.log(`Starting batch: ${batch.join(', ')}`);

    // 并行启动会话
    const sessions = batch.map(name => launchSession(name));

    // 等待完成
    await Promise.all(
      sessions.map(s => waitForCompletion(s.sessionId))
    );
  }
}

main().catch(console.error);
```

#### `scripts/launch-session.sh`
会话启动脚本，用于手动启动单个会话。

```bash
#!/bin/bash
set -e

AGENT_NAME=$1
SESSION_ID="${AGENT_NAME}-$(date +%s)"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "Launching session: $SESSION_ID"

# 读取 Agent 配置
AGENT_CONFIG=$(jq ".agents[] | select(.name == \"$AGENT_NAME\")" agent-states/coordinator-config.json)

# 启动 Claude Code 会话
claude-code \
  --session-id="$SESSION_ID" \
  --prompt="从 agent-states/contracts/${AGENT_NAME}-task.md 读取任务并执行" \
  --output-state="agent-states/outputs/${SESSION_ID}.json" \
  2>&1 | tee "agent-states/logs/${SESSION_ID}.log"

# 创建完成信号
touch "agent-states/signals/${SESSION_ID}.done"

echo "Session completed: $SESSION_ID"
```

### 任务契约文件

#### `agent-states/contracts/domain-task.md`
领域建模任务契约。

#### `agent-states/contracts/api-task.md`
API 设计任务契约。

#### `agent-states/contracts/backend-task.md`
后端开发任务契约。

#### `agent-states/contracts/frontend-task.md`
前端开发任务契约。

### 模板文件

#### `agent-states/templates/session-state-template.json`
状态文件模板，确保所有会话输出格式一致。

---

## 验证步骤

### 功能验证

#### 1. 单会话功能测试

```bash
# 启动单个会话
./scripts/launch-session.sh domain-modeler

# 验证输出
cat agent-states/outputs/domain-modeler-*.json | jq '.'

# 验证文件创建
ls -la packages/shared/src/types/

# 验证类型检查
cd packages/shared && tsc --noEmit
```

#### 2. 并行会话功能测试

```bash
# 启动多个会话（并行）
./scripts/launch-session.sh domain-modeler &
DOMAIN_PID=$!
./scripts/launch-session.sh api-designer &
API_PID=$!

# 等待完成
wait $DOMAIN_PID $API_PID

# 验证状态
./scripts/sync-state.js --check

# 验证两个会话独立运行
cat agent-states/logs/domain-modeler-*.log
cat agent-states/logs/api-designer-*.log
```

#### 3. 依赖触发功能测试

```bash
# 启动主协调器（会自动触发依赖）
./scripts/coordinator.js

# 观察执行顺序
tail -f agent-states/logs/coordinator.log

# 应该看到：
# 1. domain-modeler 和 api-designer 同时启动
# 2. 等待两者完成
# 3. backend-developer 和 frontend-developer 同时启动
```

#### 4. 冲突检测功能测试

```bash
# 人为制造冲突
# 1. 修改 domain-modeler 输出，设置 name 字段
# 2. 修改 api-designer 输出，要求 username 字段
# 3. 运行协调器

./scripts/coordinator.js

# 检查冲突报告
cat agent-states/reports/conflict-report.json | jq '.'

# 应该检测到类型不匹配冲突
```

### 技术验证

#### 1. 状态文件格式验证

```bash
# 验证 JSON 格式
for file in agent-states/outputs/*.json; do
  echo "Validating $file"
  jq '.' "$file" > /dev/null
done

# 使用 ajv 验证 Schema
npm install -g ajv-cli
ajv validate \
  -s agent-states/schemas/session-state.json \
  -d agent-states/outputs/*.json
```

#### 2. 类型检查验证

```bash
# 后端类型检查
cd packages/backend
npm run type-check

# 前端类型检查
cd packages/frontend
npm run type-check

# 共享类型检查
cd packages/shared
tsc --noEmit
```

#### 3. 集成测试验证

```bash
# 启动后端
cd packages/backend
npm run start &
BACKEND_PID=$!

# 等待后端启动
sleep 5

# 启动前端
cd packages/frontend
npm run dev &
FRONTEND_PID=$!

# 运行端到端测试
npm run test:e2e

# 清理
kill $BACKEND_PID $FRONTEND_PID
```

### 架构验证

| 验证项 | 方法 | 成功标准 |
|--------|------|----------|
| **上下文隔离** | 检查会话日志 | 每个会话有独立的消息历史 |
| **状态同步** | 检查状态文件 | 状态正确写入和读取 |
| **冲突检测** | 制造冲突并检测 | 正确识别冲突类型 |
| **依赖触发** | 观察执行顺序 | 依赖任务正确等待和触发 |
| **并发安全** | 并行启动 10+ 会话 | 无文件锁冲突 |

---

## 风险与挑战

### 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 会话间通信不稳定 | 高 | 中 | 使用文件系统作为可靠存储，添加重试机制 |
| 状态文件损坏 | 高 | 低 | 添加 JSON Schema 验证，备份机制 |
| 并发写入冲突 | 中 | 低 | 使用文件锁 (flock) |
| 轮询延迟 | 低 | 高 | 优化轮询间隔，使用信号文件 |
| 内存泄漏 | 中 | 低 | 定期清理旧状态文件 |

### 实施挑战

| 挑战 | 解决方案 |
|------|----------|
| 如何创建独立会话 | 使用 Claude Code CLI 的 `--session` 参数 |
| 如何通知主协调器 | 信号文件 + 轮询（混合模式） |
| 如何处理超时 | 定时检查 + 写入 `.paused` 文件 |
| 如何调试冲突 | 详细的日志文件 + 冲突报告 |
| 如何恢复中断的任务 | 检查 `.paused` 文件，支持断点续传 |

### 最佳实践

1. **状态文件命名**: 使用 `{agent-name}-{timestamp}.json` 格式，避免冲突
2. **日志记录**: 每个会话输出独立日志文件
3. **清理策略**: 定期清理超过 7 天的状态文件
4. **版本控制**: 状态文件不应提交到 Git（添加到 `.gitignore`）
5. **错误处理**: 状态文件必须包含错误详情（如有）

---

## 附录

### A. 状态文件 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [
    "session_id",
    "agent_name",
    "status",
    "timestamp",
    "outputs",
    "dependencies",
    "provides"
  ],
  "properties": {
    "session_id": { "type": "string" },
    "agent_name": { "type": "string" },
    "agent_type": { "enum": ["planner", "executor", "validator"] },
    "status": { "enum": ["completed", "failed", "blocked", "in_progress", "paused"] },
    "timestamp": { "type": "string", "format": "date-time" },
    "outputs": {
      "type": "object",
      "properties": {
        "files_created": { "type": "array", "items": { "type": "string" } },
        "files_modified": { "type": "array", "items": { "type": "string" } },
        "apis_declared": { "type": "array" },
        "types_defined": { "type": "array", "items": { "type": "string" } }
      }
    },
    "dependencies": {
      "type": "object",
      "properties": {
        "requires": { "type": "array", "items": { "type": "string" } },
        "consumed": { "type": "array", "items": { "type": "string" } }
      }
    },
    "provides": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "location": { "type": "string" },
          "validation": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "validation": {
      "type": "object",
      "properties": {
        "self_check": { "enum": ["passed", "failed", "skipped"] },
        "commands": { "type": "array" }
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "token_usage": { "type": "number" },
        "duration_seconds": { "type": "number" },
        "retry_count": { "type": "number" }
      }
    }
  }
}
```

### B. 项目结构

```
my/
├── packages/
│   ├── shared/              # 共享类型定义
│   ├── backend/             # 后端代码
│   └── frontend/            # 前端代码
│
├── agent-states/            # 多会话状态存储（新增）
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
├── scripts/                 # 自动化脚本（新增）
│   ├── coordinator.js      # 主协调器
│   ├── launch-session.sh   # 会话启动器
│   └── sync-state.js       # 状态同步工具
│
├── docs/
│   ├── agent-protocol.md
│   ├── api-contract.md
│   └── multi-session-architecture.md  # 本文档
│
├── pnpm-workspace.yaml
└── package.json
```

### C. 相关文档

- [Agent 通信协议 v2.0](./agent-protocol.md) - 更新后的协议规范
- [API 契约文档](./api-contract.md) - 完整的 API 定义

---

**文档版本**: 1.0.0
**最后更新**: 2024-01-29
**维护者**: Claude Code

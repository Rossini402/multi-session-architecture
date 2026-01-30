# 多会话 Agent 协作架构 v2.0

> **版本**: 2.0.0 (Enhanced with GSD Best Practices)
> **日期**: 2024-01-30
> **状态**: 设计中

---

## 概述

本架构融合了 **多会话并行** 与 **GSD (Get Shit Done)** 的成熟模式，旨在：

1. **解决上下文污染** - 每个 Agent 在独立会话中运行，拥有独立的 200k token 预算
2. **自动化优先** - Claude 自动化所有可通过 CLI/API 完成的工作
3. **结构化交互** - 通过 Checkpoint 机制处理需要人工介入的点
4. **智能偏差处理** - 自动修复 bug 和关键缺失功能
5. **状态持久化** - 会话完成后的状态可被后续复用

---

## 目录

1. [核心概念](#核心概念)
2. [架构设计](#架构设计)
3. [Checkpoint 协议](#checkpoint-协议)
4. [Deviation 处理规则](#deviation-处理规则)
5. [TDD 执行流程](#tdd-执行流程)
6. [会话输出格式](#会话输出格式)
7. [通信机制](#通信机制)
8. [工作流程](#工作流程)
9. [实施计划](#实施计划)

---

## 核心概念

### 1. 会话 (Session)

**定义**：独立的 Claude Code 对话上下文

**特点**：
- 拥有独立的 200k token 预算
- 拥有独立的消息历史
- 可被唯一标识（Session ID）
- 可被暂停和恢复

**生命周期**：

```
创建 → 执行任务 → Checkpoint（可选）→ 输出状态 → 完成/暂停
```

### 2. 主协调器 (Coordinator)

**职责**：

| 职责 | 描述 |
|------|------|
| 任务分发 | 根据依赖关系分配任务给合适的会话 |
| 状态管理 | 收集、验证、存储会话输出状态 |
| 冲突检测 | 检测会话间的输出冲突 |
| 依赖触发 | 当依赖满足时自动触发后续任务 |
| Checkpoint 处理 | 处理会话中的 Checkpoint 信号 |
| 报告生成 | 生成执行报告和验证结果 |

### 3. 状态存储 (State Store)

**目的**：持久化会话输出，供其他会话读取

**存储内容**：
- 会话输出状态（JSON 格式）
- 任务契约文件（Markdown 格式）
- Checkpoint 信号文件
- 完成信号文件
- 锁文件

### 4. Checkpoint（检查点）

**定义**：会话执行中需要人工介入或验证的点

**类型**：
1. **checkpoint:human-verify** (90%) - 人工验证 Claude 自动化的结果
2. **checkpoint:decision** (9%) - 人工做出架构/技术选择
3. **checkpoint:human-action** (1%) - 真正无法避免的手动步骤

**黄金法则**：
> **如果 Claude 可以自动化，它就必须自动化。**
> Checkpoint 只用于验证和决策，不用于手动工作。

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
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │Checkpoint  │  │ Deviation  │  │   TDD      │            │
│  │  处理器     │  │  处理器     │  │  协调器     │            │
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
│ • Checkpoint │   │ • Checkpoint │   │ • Checkpoint │
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
                  │   ├─ ui.json    │
                  │   ├─ checkpoints/│
                  │   └─ signals/   │
                  └────────────────┘
```

### 执行流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                        主协调器启动                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  分析依赖，构建执行图          │
         │  - 识别可并行执行的会话组      │
         │  - 检查依赖状态               │
         └───────────────┬───────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  并行启动独立会话              │
         │  - 会话 A: 领域建模            │
         │  - 会话 B: API 设计            │
         └───────────────┬───────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  会话执行任务                  │
         │  - 读取任务契约               │
         │  - 读取依赖状态               │
         │  - 执行开发工作               │
         │  - 处理 Deviations           │
         │  - 遇到 Checkpoint → 暂停     │
         └───────────────┬───────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  Checkpoint?                  │
         │  ├─ 是 → 等待用户响应         │
         │  │       ├─ human-verify     │
         │  │       ├─ decision         │
         │  │       └─ human-action     │
         │  └─ 否 → 继续                │
         └───────────────┬───────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  输出状态文件                  │
         │  - outputs/{agent}-{id}.json │
         │  - signals/{agent}-{id}.done │
         └───────────────┬───────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  主协调器收集状态              │
         │  - 轮询 signals/ 目录         │
         │  - 读取 outputs/ 目录         │
         └───────────────┬───────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  验证与冲突检测                │
         │  - 运行类型检查               │
         │  - 检测类型冲突               │
         │  - 检测文件冲突               │
         │  - 应用 Deviation 规则       │
         └───────────────┬───────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  解决冲突或触发依赖任务        │
         │  - 自动修复（如可能）          │
         │  - 生成冲突报告               │
         │  - 触发依赖任务               │
         └───────────────────────────────┘
```

---

## Checkpoint 协议

### 类型定义

#### checkpoint:human-verify (90%)

**用途**：Claude 完成自动化工作后，人工确认是否正确

**使用场景**：
- 视觉 UI 检查（布局、样式、响应式）
- 交互流程测试（点击流程、用户流程）
- 功能验证（功能是否按预期工作）
- 音频/视频播放质量
- 动画流畅度
- 可访问性测试

**结构**：

```xml
<task type="checkpoint:human-verify" gate="blocking">
  <what-built>[Claude 自动化并部署/构建的内容]</what-built>
  <how-to-verify>
    [确切的验证步骤 - URL、命令、预期行为]
  </how-to-verify>
  <resume-signal>[如何继续 - "approved"、"yes" 或描述问题]</resume-signal>
</task>
```

**示例 - Vercel 部署**：

```xml
<!-- Claude 自动化部署 -->
<task type="auto">
  <name>部署到 Vercel</name>
  <action>运行 `vercel --yes` 创建项目并部署，捕获部署 URL</action>
  <verify>vercel ls 显示部署，curl {url} 返回 200</verify>
  <done>应用已部署，URL 已捕获</done>
</task>

<!-- 人工验证 -->
<task type="checkpoint:human-verify" gate="blocking">
  <what-built>已部署到 https://myapp-abc123.vercel.app</what-built>
  <how-to-verify>
    访问 https://myapp-abc123.vercel.app 并确认：
    - 首页正常加载，无错误
    - 登录表单可见
    - 浏览器 DevTools 无控制台错误
  </how-to-verify>
  <resume-signal>输入 "approved" 继续，或描述需要修复的问题</resume-signal>
</task>
```

**示例 - 响应式布局**：

```xml
<!-- Claude 自动化构建 -->
<task type="auto">
  <name>构建响应式仪表板布局</name>
  <action>使用 Tailwind 响应式类创建侧边栏、头部和内容区</action>
  <verify>npm run build 成功，无 TypeScript 错误</verify>
</task>

<task type="auto">
  <name>启动开发服务器</name>
  <action>后台运行 `npm run dev`，等待 "ready" 消息</action>
  <verify>curl http://localhost:3000 返回 200</verify>
  <done>开发服务器运行在 http://localhost:3000</done>
</task>

<!-- 人工验证 -->
<task type="checkpoint:human-verify" gate="blocking">
  <what-built>响应式仪表板布局 - 开发服务器运行在 http://localhost:3000</what-built>
  <how-to-verify>
    访问 http://localhost:3000/dashboard 并验证：
    1. 桌面 (>1024px)：侧边栏在左侧，内容在右侧
    2. 平板 (768px)：侧边栏折叠为汉堡菜单
    3. 移动 (375px)：单列布局，底部导航出现
    4. 任何尺寸下无布局偏移或横向滚动
  </how-to-verify>
  <resume-signal>输入 "approved" 或描述布局问题</resume-signal>
</task>
```

#### checkpoint:decision (9%)

**用途**：人工做出影响实现方向的选择

**使用场景**：
- 技术选型（使用哪个认证提供商、哪个数据库）
- 架构决策（monorepo vs 独立仓库）
- 设计选择（配色方案、布局方式）
- 功能优先级（构建哪个变体）
- 数据模型决策（schema 结构）

**结构**：

```xml
<task type="checkpoint:decision" gate="blocking">
  <decision>[正在决定的内容]</decision>
  <context>[为什么这个决定很重要]</context>
  <options>
    <option id="option-a">
      <name>[选项名称]</name>
      <pros>[优点]</pros>
      <cons>[缺点]</cons>
    </option>
    <option id="option-b">
      <name>[选项名称]</name>
      <pros>[优点]</pros>
      <cons>[缺点]</cons>
    </option>
  </options>
  <resume-signal>[如何指示选择]</resume-signal>
</task>
```

**示例 - 认证提供商选择**：

```xml
<task type="checkpoint:decision" gate="blocking">
  <decision>选择认证提供商</decision>
  <context>应用需要用户认证。有三个选项，各有不同的权衡。</context>
  <options>
    <option id="supabase">
      <name>Supabase Auth</name>
      <pros>与使用的 Supabase 数据库内置集成，免费额度慷慨，行级安全集成</pros>
      <cons>UI 可定制性较差，受 Supabase 生态限制</cons>
    </option>
    <option id="clerk">
      <name>Clerk</name>
      <pros>精美的预构建 UI，最佳开发者体验，优秀文档</pros>
      <cons>10k MAU 后收费，供应商锁定</cons>
    </option>
    <option id="nextauth">
      <name>NextAuth.js</name>
      <pros>免费，自托管，最大控制权，广泛采用</pros>
      <cons>更多设置工作，自己管理安全更新</cons>
    </option>
  </options>
  <resume-signal>选择: supabase, clerk, 或 nextauth</resume-signal>
</task>
```

#### checkpoint:human-action (1%)

**用途**：真正的无法避免的手动步骤，或 Claude 在自动化过程中遇到认证门

**使用场景**：
- **认证门** - Claude 尝试使用 CLI/API 但需要凭据继续（这不是失败）
- 邮箱验证链接（账户创建需要点击邮箱链接）
- 短信 2FA 代码（手机验证）
- 手动账户审批（平台需要人工审核才能访问 API）
- 信用卡 3D Secure 流程（基于 Web 的支付授权）

**结构**：

```xml
<task type="checkpoint:human-action" gate="blocking">
  <action>[人类必须做什么 - Claude 已经完成了所有可自动化的工作]</action>
  <instructions>
    [Claude 已经自动化的内容]
    [唯一需要人工操作的一步]
  </instructions>
  <verification>[Claude 之后可以检查什么]</verification>
  <resume-signal>[如何继续]</resume-signal>
</task>
```

**示例 - 邮箱验证**：

```xml
<task type="auto">
  <name>通过 API 创建 SendGrid 账户</name>
  <action>使用 SendGrid API 创建子账户并发送验证邮件</action>
  <verify>API 返回 201，账户已创建</verify>
  <done>账户已创建，验证邮件已发送</done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <action>完成 SendGrid 账户的邮箱验证</action>
  <instructions>
    我已创建账户并请求验证邮件。
    检查收件箱中的 SendGrid 验证链接并点击。
  </instructions>
  <verification>SendGrid API 密钥有效：curl 测试成功</verification>
  <resume-signal>邮箱验证完成后输入 "done"</resume-signal>
</task>
```

**示例 - 认证门（动态 Checkpoint）**：

```xml
<!-- Claude 尝试自动化，遇到认证错误时动态创建 checkpoint -->

<task type="auto">
  <name>部署到 Vercel</name>
  <action>运行 `vercel --yes` 部署</action>
  <verify>vercel ls 显示部署，curl 返回 200</verify>
</task>

<!-- 如果 vercel 返回 "Error: Not authenticated"，Claude 动态创建 checkpoint -->

<task type="checkpoint:human-action" gate="blocking">
  <action>验证 Vercel CLI 以便我继续部署</action>
  <instructions>
    我尝试部署但遇到认证错误。
    运行: vercel login
    这将打开浏览器 - 完成认证流程。
  </instructions>
  <verification>vercel whoami 返回你的账户邮箱</verification>
  <resume-signal>认证完成后输入 "done"</resume-signal>
</task>

<!-- 认证后，Claude 重试部署 -->

<task type="auto">
  <name>重试 Vercel 部署</name>
  <action>运行 `vercel --yes`（现已认证）</action>
  <verify>vercel ls 显示部署，curl 返回 200</verify>
</task>
```

### Checkpoint 执行协议

当会话遇到 `type="checkpoint:*"` 时：

1. **立即停止** - 不继续下一个任务
2. **清晰显示 Checkpoint** - 使用下面的格式
3. **等待用户响应** - 不要臆测完成
4. **尽可能验证** - 检查文件、运行测试等
5. **恢复执行** - 只在确认后继续下一个任务

**显示格式**：

```
╔═══════════════════════════════════════════════════════╗
║  CHECKPOINT: 需要验证                                  ║
╚═══════════════════════════════════════════════════════╝

进度: 5/8 任务完成
任务: 响应式仪表板布局

已构建: /dashboard 处的响应式仪表板

验证方式:
  1. 运行: npm run dev
  2. 访问: http://localhost:3000/dashboard
  3. 桌面 (>1024px): 侧边栏可见，内容填充剩余空间
  4. 平板 (768px): 侧边栏折叠为图标
  5. 移动 (375px): 侧边栏隐藏，出现汉堡菜单

────────────────────────────────────────────────────────
→ 你的操作: 输入 "approved" 或描述问题
────────────────────────────────────────────────────────
```

### 认证门处理

**关键**：当 Claude 尝试 CLI/API 并遇到认证错误时，这不是失败 - 这是一个需要人工输入来解锁自动化的门。

**模式**：Claude 尝试自动化 → 认证错误 → 创建 checkpoint → 你认证 → Claude 重试 → 继续

**门协议**：
1. 识别这不是失败 - 缺少认证是预期的
2. 停止当前任务 - 不要重复重试
3. 动态创建 checkpoint:human-action
4. 提供确切的认证步骤
5. 验证认证有效
6. 重试原始任务
7. 正常继续

### 自动化原则

**规则**：如果有 CLI/API，Claude 就做它。永远不要让人类做可自动化的工作。

| 操作 | 可自动化？ | Claude 做吗？ |
|------|-----------|-------------|
| 部署到 Vercel | 是 (`vercel`) | 是 |
| 创建 Stripe webhook | 是 (API) | 是 |
| 写 .env 文件 | 是 (Write 工具) | 是 |
| 创建 Upstash 数据库 | 是 (`upstash`) | 是 |
| 运行测试 | 是 (`npm test`) | 是 |
| 启动开发服务器 | 是 (`npm run dev`) | 是 |
| 向 Convex 添加环境变量 | 是 (`npx convex env set`) | 是 |
| 点击邮箱验证链接 | 否 | 否 |
| 输入信用卡 3DS | 否 | 否 |
| 在浏览器中完成 OAuth | 否 | 否 |
| 视觉验证 UI 是否正确 | 否 | 否 |
| 测试交互用户流程 | 否 | 否 |

---

## Deviation 处理规则

在执行任务时，**你一定会发现计划中没有的工作**。这是正常的。

自动应用这些规则。在 Summary 文档中跟踪所有偏差。

---

### 规则 1：自动修复 Bug

**触发**：代码不能按预期工作（错误行为、错误输出、错误）

**动作**：立即修复，跟踪到 Summary

**示例**：
- 返回错误数据的 SQL 查询
- 逻辑错误（条件反转、差一错误、无限循环）
- 类型错误、空指针异常、未定义引用
- 验证损坏（接受无效输入、拒绝有效输入）
- 安全漏洞（SQL 注入、XSS、CSRF、不安全认证）
- 竞争条件、死锁
- 内存泄漏、资源泄漏

**流程**：
1. 内联修复 bug
2. 添加/更新测试以防止回归
3. 验证修复有效
4. 继续任务
5. 在偏差列表中跟踪：`[规则 1 - Bug] [描述]`

**无需用户许可**。Bug 必须修复才能正确操作。

---

### 规则 2：自动添加缺失的关键功能

**触发**：代码缺少正确性、安全性或基本操作所需的基本功能

**动作**：立即添加，跟踪到 Summary

**示例**：
- 缺少错误处理（无 try/catch、未处理的 promise 拒绝）
- 无输入验证（接受恶意数据、类型强制问题）
- 缺少 null/undefined 检查（边缘情况下崩溃）
- 受保护路由上无认证
- 缺少授权检查（用户可以访问其他人的数据）
- 无 CSRF 保护、缺少 CORS 配置
- 公共 API 上无限流
- 缺少必需的数据库索引（导致超时）
- 无错误日志（无法调试生产环境）

**流程**：
1. 内联添加缺失功能
2. 为新功能添加测试
3. 验证有效
4. 继续任务
5. 在偏差列表中跟踪：`[规则 2 - 缺失关键] [描述]`

**关键 = 正确/安全/高性能操作所需**
**无需用户许可**。这些不是"功能" - 它们是基本正确性的要求。

---

### 规则 3：自动修复阻塞问题

**触发**：某些东西阻止你完成当前任务

**动作**：立即修复以解除阻塞，跟踪到 Summary

**示例**：
- 缺少依赖（未安装包、导入失败）
- 错误类型阻止编译
- 错误的导入路径（文件移动、错误的相对路径）
- 缺少环境变量（应用无法启动）
- 数据库连接配置错误
- 构建配置错误（webpack、tsconfig 等）
- 代码中引用的缺失文件
- 阻止模块解析的循环依赖

**流程**：
1. 修复阻塞问题
2. 验证任务现在可以继续
3. 继续任务
4. 在偏差列表中跟踪：`[规则 3 - 阻塞] [描述]`

**无需用户许可**。没有它无法完成任务。

---

### 规则 4：询问架构变更

**触发**：修复/添加需要重大结构修改

**动作**：停止，呈现给用户，等待决策

**示例**：
- 添加新数据库表（不仅仅是列）
- 主要 schema 变更（更改主键、拆分表）
- 引入新服务层或架构模式
- 切换库/框架（React → Vue、REST → GraphQL）
- 更改认证方法（sessions → JWT）
- 添加新基础设施（消息队列、缓存层、CDN）
- 更改 API 契约（端点的破坏性更改）
- 添加新部署环境

**流程**：
1. 停止当前任务
2. 返回需要架构决策的 checkpoint
3. 包括：发现什么、提议的更改、为什么需要、影响、替代方案
4. 等待协调器获取用户决策
5. 使用决策的新代理继续

**需要用户决策**。这些更改影响系统设计。

---

### 规则优先级（多个规则可能适用时）

1. **规则 4 适用** → 停止并返回 checkpoint（架构决策）
2. **规则 1-3 适用** → 自动修复，跟踪到 Summary
3. **真正不确定哪个规则** → 应用规则 4（返回 checkpoint）

**边缘情况指导**：
- "此验证缺失" → 规则 2（对安全至关重要）
- "这在 null 时崩溃" → 规则 1（bug）
- "需要添加表" → 规则 4（架构）
- "需要添加列" → 规则 1 或 2（取决于：修复 bug 或添加关键字段）

**不确定时**：问自己"这是否影响正确性、安全性或完成任务的能力？"
- **是** → 规则 1-3（自动修复）
- **可能** → 规则 4（返回 checkpoint 供用户决策）

---

## TDD 执行流程

当执行带有 `tdd="true"` 属性的任务时，遵循 RED-GREEN-REFACTOR 循环。

### RED 阶段 - 编写失败的测试

1. **检查测试基础设施**（如果是第一个 TDD 任务）：
   - 从 package.json/requirements.txt/etc 检测项目类型
   - 如果需要，安装最小测试框架（Jest、pytest、Go 测试等）
   - 这是 RED 阶段的一部分

2. **RED - 编写失败的测试**：
   - 读取 `<behavior>` 元素获取测试规范
   - 如果不存在则创建测试文件
   - 编写描述预期行为的测试
   - 运行测试 - **必须失败**（如果通过，测试错误或功能已存在）
   - 提交：`test({phase}-{plan}): 添加 [功能] 的失败测试`

3. **GREEN - 实现以通过**：
   - 读取 `<implementation>` 元素获取指导
   - 编写使测试通过的最小代码
   - 运行测试 - **必须通过**
   - 提交：`feat({phase}-{plan}): 实现 [功能]`

4. **REFACTOR（如需要）**：
   - 如果有明显的改进则清理代码
   - 运行测试 - **必须仍然通过**
   - 仅在更改时提交：`refactor({phase}-{plan}): 清理 [功能]`

**TDD 提交**：每个 TDD 任务产生 2-3 个原子提交（test/feat/refactor）。

**错误处理**：
- RED 阶段测试不失败：在继续之前调查
- GREEN 阶段测试不通过：调试，继续迭代直到绿色
- REFACTOR 阶段测试失败：撤销 refactor

---

## 会话输出格式

每个会话完成后必须输出状态文件到 `agent-states/outputs/` 目录：

**文件名格式**: `{agent-name}-{timestamp}.json`

**内容格式**：

```json
{
  "session_id": "domain-modeler-001",
  "agent_name": "domain-modeler",
  "agent_type": "executor",
  "status": "completed",
  "timestamp": "2024-01-30T10:00:00Z",

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

  "checkpoints": [
    {
      "type": "human-verify",
      "task": "验证类型定义",
      "resolved": true
    }
  ],

  "deviations": [
    {
      "rule": 1,
      "type": "Bug",
      "description": "修复了 User 类型中 email 字段缺少必填标记",
      "files_modified": ["packages/shared/src/types/user.ts"]
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

---

## 通信机制

### 主协调器 → 子会话

#### 任务契约文件

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

## 输出要求

### 必须创建的文件
1. `packages/shared/src/types/user.ts` - User 类型定义
2. `packages/shared/src/types/post.ts` - Post 类型定义
3. `packages/shared/src/types/comment.ts` - Comment 类型定义

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

## Checkpoint 策略
在完成类型定义后，需要人工验证：
- 检查字段是否完整
- 确认类型关系正确
- 验证导出格式

## Deviation 处理
应用以下规则：
1. 自动修复类型错误
2. 自动添加缺失字段
3. 自动修复导入问题
4. 架构变更需人工决策

## 超时
15 分钟后自动暂停，写入 `.paused` 文件

## 错误处理
如遇阻塞问题，在状态文件的 `blockers` 字段中记录。
```

### 子会话 → 主协调器

#### 状态文件输出 + 信号文件

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

# 如需 Checkpoint
touch agent-states/checkpoints/domain-modeler-001-checkpoint
```

---

## 工作流程

### 阶段 1：初始化（主协调器）

```bash
# 1. 创建状态存储目录
mkdir -p agent-states/{contracts,outputs,signals,locks,checkpoints,logs}

# 2. 读取配置文件
jq '.' agent-states/coordinator-config.json

# 3. 分析依赖关系，构建执行图

# 4. 识别可并行执行的 Agent 组
```

### 阶段 2：并行启动会话

```bash
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
```

### 阶段 3：Checkpoint 处理

```bash
# 主协调器轮询 checkpoint 目录
while [ -f "agent-states/checkpoints/*.checkpoint" ]; do
  # 读取 checkpoint 文件
  CHECKPOINT=$(ls agent-states/checkpoints/*.checkpoint | head -1)

  # 显示 checkpoint 给用户
  cat "$CHECKPOINT"

  # 等待用户响应
  read -p "你的响应: " RESPONSE

  # 将响应传递给会话（通过 continuation 文件）
  echo "$RESPONSE" > "agent-states/continuations/$(basename $CHECKPOINT .checkpoint)-response"

  # 删除 checkpoint 信号
  rm "$CHECKPOINT"
done
```

### 阶段 4：状态收集与验证

```bash
# 1. 轮询 signals/ 目录，检查完成信号
while [ ! -f "agent-states/signals/domain-modeler-*.done" ] || \
      [ ! -f "agent-states/signals/api-designer-*.done" ]; do
  sleep 5
done

# 2. 读取状态文件
DOMAIN_STATE=$(ls agent-states/outputs/domain-modeler-*.json | tail -1)
API_STATE=$(ls agent-states/outputs/api-designer-*.json | tail -1)

# 3. 处理 deviations
node scripts/process-deviations.js "$DOMAIN_STATE" "$API_STATE"

# 4. 运行验证规则
cd packages/shared && tsc --noEmit
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
```

---

## 实施计划

### Step 1: 创建状态存储结构

```bash
mkdir -p agent-states/{contracts,outputs,signals,locks,checkpoints,continuations,logs,templates}
```

### Step 2: 创建配置文件

- `agent-states/coordinator-config.json` - 主协调器配置
- `agent-states/templates/session-state-template.json` - 状态文件模板
- `agent-states/templates/checkpoint-template.md` - Checkpoint 模板

### Step 3: 实现主协调器脚本

**文件**: `scripts/coordinator.js`

功能：
1. 读取配置文件
2. 分析依赖关系，构建执行图
3. 启动子会话
4. 轮询 checkpoint 目录
5. 处理 deviations
6. 验证输出
7. 触发依赖任务
8. 生成最终报告

### Step 4: 实现会话启动脚本

**文件**: `scripts/launch-session.sh`

功能：
1. 创建新的 Claude Code 会话
2. 加载任务契约
3. 读取依赖状态
4. 执行任务
5. 处理 Checkpoints
6. 输出状态文件

### Step 5: 创建 Deviation 处理脚本

**文件**: `scripts/process-deviations.js`

功能：
1. 读取会话状态文件
2. 检测 deviations
3. 应用规则
4. 自动修复或生成报告

### Step 6-9: 测试与验证

- Step 6: 测试单会话流程
- Step 7: 测试 Checkpoint 处理
- Step 8: 测试并行会话
- Step 9: 完整流程测试

---

## 验证标准

### 功能验证

```bash
# 启动单个会话
./scripts/launch-session.sh domain-modeler

# 触发 Checkpoint
./scripts/handle-checkpoint.sh

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
| **Checkpoint 处理** | 测试 Checkpoint 流程 | Checkpoint 正确暂停和恢复 |
| **Deviations 处理** | 触发各种偏差 | 正确应用 4 条规则 |
| **冲突检测** | 制造冲突并检测 | 正确识别冲突类型 |
| **依赖触发** | 观察执行顺序 | 依赖任务正确等待和触发 |

### 成功标准

#### MVP（最小可行产品）

- [ ] 主协调器可以启动子会话
- [ ] 子会话可以读取任务契约
- [ ] 子会话可以输出状态文件
- [ ] 主协调器可以处理 Checkpoints
- [ ] 基本的 Deviation 处理
- [ ] 主协调器可以收集状态
- [ ] 基本的冲突检测

#### 完整功能

- [ ] 自动依赖触发
- [ ] 自动冲突解决
- [ ] 完整的 Deviation 规则应用
- [ ] TDD 流程支持
- [ ] 认证门处理
- [ ] 超时处理
- [ ] 失败重试
- [ ] 进度可视化
- [ ] 日志记录
- [ ] 测试报告生成

---

## 附录

### A. GSD 模式对比

| 特性 | GSD | 我们的架构 (v2.0) |
|------|-----|------------------|
| **会话隔离** | 单会话内子 Agent | 独立会话 |
| **Checkpoint** | ✅ 成熟 | ✅ 已整合 |
| **Deviation 规则** | ✅ 4 条规则 | ✅ 已整合 |
| **TDD 流程** | ✅ RED-GREEN-REFACTOR | ✅ 已整合 |
| **认证门处理** | ✅ 动态处理 | ✅ 已整合 |
| **并行能力** | 有限（单会话） | 无限（多会话） |
| **状态持久化** | Markdown 文件 | JSON 文件 |

### B. 关键改进

1. **保留多会话优势**：真正的上下文隔离、无限并行
2. **引入 GSD 成熟模式**：Checkpoint、Deviation 规则、TDD
3. **增强状态存储**：JSON 格式支持更复杂的元数据
4. **改进通信机制**：支持 Checkpoint 双向通信

### C. 迁移路径

从 v1.0 迁移到 v2.0：

1. **更新状态文件格式**：添加 checkpoints、deviations 字段
2. **更新任务契约**：添加 Checkpoint 策略、Deviation 处理
3. **实现 Checkpoint 处理器**：主协调器新增组件
4. **实现 Deviation 处理器**：自动应用 4 条规则
5. **更新会话 Agent**：支持 TDD、认证门

---

**文档版本**: 2.0.0
**最后更新**: 2024-01-30
**维护者**: Claude Code

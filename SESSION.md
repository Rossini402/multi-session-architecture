# 项目上下文 & 会话记录

## 当前状态 (最后更新: 2026-01-29 01:52)

### 进行中工作
- ✅ 领域模型类型定义已完成
- ✅ Zod 验证模式已完成
- ✅ TypeScript 编译验证通过

### 已修改但未提交的文件
```diff
新增文件：
+ packages/shared/src/types/base.ts          # 基础实体类型
+ packages/shared/src/types/user.ts          # 用户类型定义
+ packages/shared/src/types/post.ts          # 文章类型定义
+ packages/shared/src/types/comment.ts       # 评论类型定义
+ packages/shared/src/types/index.ts         # 类型统一导出
+ packages/shared/src/schemas/auth-schemas.ts     # 认证验证模式
+ packages/shared/src/schemas/post-schemas.ts     # 文章验证模式
+ packages/shared/src/schemas/comment-schemas.ts  # 评论验证模式
+ packages/shared/src/schemas/index.ts            # Schema统一导出
+ packages/shared/src/index.ts               # 包主入口
+ packages/shared/dist/*                     # 构建输出文件
```

### 待解决问题
1. 缺少 Tag/Category 实体类型
2. 缺少数据库 Schema（Prisma/Drizzle）
3. 需要添加单元测试验证类型定义

---

## 项目背景

### 核心目标
构建一个 Monorepo 博客平台，实现用户认证、文章 CRUD、评论系统功能。

### 技术栈
| 层级 | 技术 |
|------|------|
| 前端 | React（待实现） |
| 后端 | NestJS（待实现） |
| 类型 | TypeScript 5.3+ |
| 验证 | Zod 3.22+ |
| 包管理 | pnpm workspace |

---

## 架构设计决策记录

### 为什么用这些技术？
- **TypeScript**: 类型安全，避免运行时错误
- **Zod**: 运行时类型验证，与 TS 类型推导无缝集成
- **Monorepo**: 前后端共享类型定义，避免重复劳动
- **BaseEntity 模式**: 提取通用字段（id、时间戳），避免代码重复

### 命名规范
- **实体类型**: 直接用名词，如 `User`, `Post`
- **输入类型**: `XxxInput`，如 `CreatePostInput`
- **响应 DTO**: `XxxResponse`，如 `PostResponse`
- **Zod Schema**: `xxxRequestSchema`, `xxxApiResponseSchema`
- **Schema 推导类型**: `XxxRequest`, `XxxApiResponse`

---

## 部署/运行流程

### 安装依赖
```bash
cd /Users/yichen/Desktop/yichen-Toys/my
pnpm install
```

### 构建 shared 包
```bash
cd packages/shared
pnpm build
```

### 开发模式
```bash
pnpm dev  # 监听文件变化自动编译
```

---

## 已知问题 & 踩坑记录

### 已解决的坑
1. **类型命名冲突**: `types/` 和 `schemas/` 中都有 `PostResponse`/`CommentResponse`
   - **解决方案**: 重命名 Schema 中的响应类型为 `PostApiResponse`/`CommentApiResponse`

### 当前待解决
1. 用户类型中的 `passwordHash` 不应暴露给前端，需要分离实体和 DTO
2. 缺少更丰富的业务类型：Tag、Category、PostStatus、UserRole 已定义但未使用
3. 时间字段在 JSON 序列化时会丢失，需要自定义转换逻辑

---

## 下一步计划

### 当前会话目标
1. ✅ 定义 User、Post、Comment 三大核心实体类型
2. ✅ 创建 Zod 验证模式
3. ✅ 验证 TypeScript 编译通过
4. ⏳ 输出 JSON 报告

### 下一阶段任务
1. 实现 NestJS 后端服务
2. 设计数据库 Schema（Prisma）
3. 实现前端 React 组件

---

## 会话历史

### 2026-01-29 会话
- **主题**: 领域模型类型定义
- **状态**: ✅ 完成
- **成果**:
  - 创建了完整的领域模型类型体系
  - 实现了 Zod 验证模式
  - 解决了类型命名冲突问题
  - 通过了 TypeScript 编译验证

---

## 重要文件路径

### 类型定义
- `/packages/shared/src/types/base.ts` - 基础实体类型
- `/packages/shared/src/types/user.ts` - 用户类型
- `/packages/shared/src/types/post.ts` - 文章类型
- `/packages/shared/src/types/comment.ts` - 评论类型

### 验证模式
- `/packages/shared/src/schemas/auth-schemas.ts` - 认证验证
- `/packages/shared/src/schemas/post-schemas.ts` - 文章验证
- `/packages/shared/src/schemas/comment-schemas.ts` - 评论验证

### 构建输出
- `/packages/shared/dist/` - 编译后的 JS 和 .d.ts 文件

---

## 快速启动指南

```bash
# 1. 进入项目根目录
cd /Users/yichen/Desktop/yichen-Toys/my

# 2. 安装所有依赖
pnpm install

# 3. 构建 shared 包
cd packages/shared
pnpm build

# 4. 在其他包中引用类型
import { User, Post, CreatePostRequest } from "@blog-platform/shared";
```

# 博客平台 RESTful API 契约文档

## 概述

本文档定义了博客平台的所有 API 接口规范，包括请求方法、路径、参数、请求体、响应体以及认证要求。

**Base URL**: `http://localhost:3000/api`

**认证方式**: JWT Bearer Token
- Header: `Authorization: Bearer <token>`
- 未特别标注的端点均需要认证

**通用响应格式**

### 成功响应
```json
{
  "success": true,
  "data": { ... }
}
```

### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述信息",
    "details": { ... } // 可选，额外错误详情
  }
}
```

### 分页响应格式
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

## 错误码定义

| 错误码 | HTTP状态码 | 描述 |
|--------|-----------|------|
| `UNAUTHORIZED` | 401 | 未认证或 token 无效 |
| `FORBIDDEN` | 403 | 无权限访问该资源 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `USER_EXISTS` | 400 | 用户已存在 |
| `INVALID_CREDENTIALS` | 401 | 用户名或密码错误 |
| `POST_NOT_FOUND` | 404 | 文章不存在 |
| `COMMENT_NOT_FOUND` | 404 | 评论不存在 |
| `INTERNAL_SERVER_ERROR` | 500 | 服务器内部错误 |

---

## 认证模块 (Auth)

### 1. 用户注册

**端点**: `POST /api/auth/register`

**认证**: 不需要

**请求体**:
```json
{
  "username": "string (3-20字符)",
  "email": "string (有效邮箱)",
  "password": "string (6-100字符)"
}
```

**请求体验证规则**:
- `username`: 必填，3-20字符，只能包含字母、数字、下划线
- `email`: 必填，有效邮箱格式
- `password`: 必填，6-100字符

**成功响应** (201):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string (UUID)",
      "username": "string",
      "email": "string",
      "createdAt": "string (ISO8601)"
    },
    "token": "string (JWT)"
  }
}
```

**错误响应**:
- `400 VALIDATION_ERROR`: 请求参数验证失败
- `400 USER_EXISTS`: 用户名或邮箱已存在

---

### 2. 用户登录

**端点**: `POST /api/auth/login`

**认证**: 不需要

**请求体**:
```json
{
  "email": "string",
  "password": "string"
}
```

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string (UUID)",
      "username": "string",
      "email": "string",
      "createdAt": "string (ISO8601)"
    },
    "token": "string (JWT)"
  }
}
```

**错误响应**:
- `400 VALIDATION_ERROR`: 请求参数验证失败
- `401 INVALID_CREDENTIALS`: 邮箱或密码错误

---

### 3. 用户登出

**端点**: `POST /api/auth/logout`

**认证**: 需要

**请求体**: 无

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "message": "登出成功"
  }
}
```

**错误响应**:
- `401 UNAUTHORIZED`: 未认证

---

### 4. 获取当前用户信息

**端点**: `GET /api/auth/me`

**认证**: 需要

**请求参数**: 无

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string (UUID)",
      "username": "string",
      "email": "string",
      "createdAt": "string (ISO8601)"
    }
  }
}
```

**错误响应**:
- `401 UNAUTHORIZED`: 未认证或 token 无效

---

## 文章模块 (Posts)

### 5. 获取文章列表

**端点**: `GET /api/posts`

**认证**: 不需要

**查询参数**:
- `page`: number (可选，默认 1) - 页码
- `limit`: number (可选，默认 10) - 每页数量
- `sortBy`: string (可选，默认 'createdAt') - 排序字段，可选值: createdAt, updatedAt, title
- `order`: string (可选，默认 'desc') - 排序方向，可选值: asc, desc
- `search`: string (可选) - 搜索关键词（标题）

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "string (UUID)",
        "title": "string",
        "content": "string",
        "excerpt": "string",
        "author": {
          "id": "string (UUID)",
          "username": "string"
        },
        "createdAt": "string (ISO8601)",
        "updatedAt": "string (ISO8601)",
        "commentCount": number
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

---

### 6. 获取文章详情

**端点**: `GET /api/posts/:id`

**认证**: 不需要

**路径参数**:
- `id`: string (UUID) - 文章 ID

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "post": {
      "id": "string (UUID)",
      "title": "string",
      "content": "string",
      "excerpt": "string",
      "author": {
        "id": "string (UUID)",
        "username": "string",
        "email": "string"
      },
      "createdAt": "string (ISO8601)",
      "updatedAt": "string (ISO8601)",
      "commentCount": number
    }
  }
}
```

**错误响应**:
- `404 POST_NOT_FOUND`: 文章不存在

---

### 7. 创建文章

**端点**: `POST /api/posts`

**认证**: 需要

**请求体**:
```json
{
  "title": "string (1-200字符)",
  "content": "string (1-50000字符)",
  "excerpt": "string (可选，0-500字符)"
}
```

**请求体验证规则**:
- `title`: 必填，1-200字符
- `content`: 必填，1-50000字符
- `excerpt`: 可选，0-500字符（如不提供，系统会自动从 content 中截取前 150 字符）

**成功响应** (201):
```json
{
  "success": true,
  "data": {
    "post": {
      "id": "string (UUID)",
      "title": "string",
      "content": "string",
      "excerpt": "string",
      "author": {
        "id": "string (UUID)",
        "username": "string"
      },
      "createdAt": "string (ISO8601)",
      "updatedAt": "string (ISO8601)",
      "commentCount": 0
    }
  }
}
```

**错误响应**:
- `400 VALIDATION_ERROR`: 请求参数验证失败
- `401 UNAUTHORIZED`: 未认证

---

### 8. 更新文章

**端点**: `PUT /api/posts/:id`

**认证**: 需要

**权限**: 仅文章作者可更新

**路径参数**:
- `id`: string (UUID) - 文章 ID

**请求体**:
```json
{
  "title": "string (可选，1-200字符)",
  "content": "string (可选，1-50000字符)",
  "excerpt": "string (可选，0-500字符)"
}
```

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "post": {
      "id": "string (UUID)",
      "title": "string",
      "content": "string",
      "excerpt": "string",
      "author": {
        "id": "string (UUID)",
        "username": "string"
      },
      "createdAt": "string (ISO8601)",
      "updatedAt": "string (ISO8601)",
      "commentCount": number
    }
  }
}
```

**错误响应**:
- `400 VALIDATION_ERROR`: 请求参数验证失败
- `401 UNAUTHORIZED`: 未认证
- `403 FORBIDDEN`: 无权限（非文章作者）
- `404 POST_NOT_FOUND`: 文章不存在

---

### 9. 删除文章

**端点**: `DELETE /api/posts/:id`

**认证**: 需要

**权限**: 仅文章作者可删除

**路径参数**:
- `id`: string (UUID) - 文章 ID

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "message": "文章删除成功"
  }
}
```

**错误响应**:
- `401 UNAUTHORIZED`: 未认证
- `403 FORBIDDEN`: 无权限（非文章作者）
- `404 POST_NOT_FOUND`: 文章不存在

---

## 评论模块 (Comments)

### 10. 获取文章的评论列表

**端点**: `GET /api/posts/:postId/comments`

**认证**: 不需要

**路径参数**:
- `postId`: string (UUID) - 文章 ID

**查询参数**:
- `page`: number (可选，默认 1) - 页码
- `limit`: number (可选，默认 20) - 每页数量
- `sortBy`: string (可选，默认 'createdAt') - 排序字段，可选值: createdAt
- `order`: string (可选，默认 'asc') - 排序方向，可选值: asc, desc

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "string (UUID)",
        "content": "string",
        "author": {
          "id": "string (UUID)",
          "username": "string"
        },
        "postId": "string (UUID)",
        "createdAt": "string (ISO8601)",
        "updatedAt": "string (ISO8601)"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

**错误响应**:
- `404 POST_NOT_FOUND`: 文章不存在

---

### 11. 创建评论

**端点**: `POST /api/posts/:postId/comments`

**认证**: 需要

**路径参数**:
- `postId`: string (UUID) - 文章 ID

**请求体**:
```json
{
  "content": "string (1-1000字符)"
}
```

**请求体验证规则**:
- `content`: 必填，1-1000字符

**成功响应** (201):
```json
{
  "success": true,
  "data": {
    "comment": {
      "id": "string (UUID)",
      "content": "string",
      "author": {
        "id": "string (UUID)",
        "username": "string"
      },
      "postId": "string (UUID)",
      "createdAt": "string (ISO8601)",
      "updatedAt": "string (ISO8601)"
    }
  }
}
```

**错误响应**:
- `400 VALIDATION_ERROR`: 请求参数验证失败
- `401 UNAUTHORIZED`: 未认证
- `404 POST_NOT_FOUND`: 文章不存在

---

## 数据模型定义

### User (用户)
```typescript
{
  id: string;           // UUID
  username: string;     // 3-20字符
  email: string;        // 邮箱
  createdAt: string;    // ISO8601
}
```

### Post (文章)
```typescript
{
  id: string;           // UUID
  title: string;        // 1-200字符
  content: string;      // 1-50000字符
  excerpt: string;      // 0-500字符
  author: User;
  createdAt: string;    // ISO8601
  updatedAt: string;    // ISO8601
  commentCount: number; // 评论数量
}
```

### Comment (评论)
```typescript
{
  id: string;           // UUID
  content: string;      // 1-1000字符
  author: User;
  postId: string;       // UUID
  createdAt: string;    // ISO8601
  updatedAt: string;    // ISO8601
}
```

### Pagination (分页)
```typescript
{
  page: number;         // 当前页码
  limit: number;        // 每页数量
  total: number;        // 总记录数
  totalPages: number;   // 总页数
}
```

---

## 使用示例

### cURL 示例

#### 注册新用户
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

#### 登录
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

#### 获取文章列表（带 token）
```bash
curl -X GET "http://localhost:3000/api/posts?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 创建文章
```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "我的第一篇文章",
    "content": "这是文章的内容...",
    "excerpt": "这是摘要"
  }'
```

#### 创建评论
```bash
curl -X POST http://localhost:3000/api/posts/POST_ID/comments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "这是一条评论"
  }'
```

---

## 版本历史

- **v1.0.0** (2024-01-29): 初始 API 契约定义

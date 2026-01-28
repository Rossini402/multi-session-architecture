# Agent 通信协议 v1.0

## 目标
定义并行 Agent 之间的通信标准，确保每个 Agent 的输出可被主 Agent 解析和合并。

## 输出格式标准

所有 Agent 必须输出以下 JSON 结构：

```json
{
  "agent": "agent-name",
  "phase": "current-phase",
  "timestamp": "ISO-8601 timestamp",
  "outputs": {
    "files_created": ["path/to/file1.ts", "path/to/file2.ts"],
    "files_modified": ["path/to/file3.ts"],
    "apis_declared": [
      {
        "method": "GET",
        "path": "/api/posts",
        "request_schema": "GetPostsRequest",
        "response_schema": "GetPostsResponse"
      }
    ]
  },
  "dependencies": {
    "requires": ["domain-types", "api-contract"],
    "waiting_for": []
  },
  "provides": ["backend-api"],
  "status": "completed | in_progress | blocked",
  "blockers": ["等待 domain-types 完成"]
}
```

## 依赖声明规则

1. **显式声明依赖**：每个 Agent 必须列出所有依赖
2. **依赖类型**：
   - `types`: 需要导入的类型定义
   - `files`: 需要读取的具体文件
   - `services`: 需要运行的服务（如数据库）

3. **冲突解决**：
   - 如果多个 Agent 修改同一文件，主 Agent 执行三路合并
   - 如果无法自动合并，暂停并通知用户

## 触发器规则

- Agent 完成时自动触发依赖其输出的 Agent
- 超时时间：单个 Agent 最多 10 分钟
- 失败重试：最多 3 次

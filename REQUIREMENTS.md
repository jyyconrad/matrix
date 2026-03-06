# Matrix Mention 功能增强 - 需求与技术分析文档

**文档版本**: v1.0  
**创建时间**: 2026-03-06 22:24  
**最后更新**: 2026-03-06 22:24  
**负责人**: coding agent (@coding:conduit.local)

---

## 📋 目录

1. [项目概述](#1-项目概述)
2. [当前架构分析](#2-当前架构分析)
3. [需求说明](#3-需求说明)
4. [技术方案](#4-技术方案)
5. [与官方 API 兼容性](#5-与官方-api-兼容性)
6. [实施计划](#6-实施计划)
7. [测试计划](#7-测试计划)
8. [风险评估](#8-风险评估)
9. [参考资料](#9-参考资料)

---

## 1. 项目概述

### 1.1 背景

OpenClaw Matrix 扩展当前支持接收带@mention 的消息，但**不支持发送** mention。这导致 Agent 无法在群聊中主动@其他用户或其他 Agent。

### 1.2 目标

在 OpenClaw Matrix 扩展中添加 **mention 发送功能**，使 Agent 能够：
- 在群聊中@特定用户
- 在群聊中@其他 Agent
- 实现多 Agent 公开协作交流

### 1.3 核心原则

**⚠️ 重要**: 本改造必须遵循以下原则：

1. **使用 OpenClaw 官方 API** - 所有修改基于官方 Matrix 扩展代码
2. **保持向后兼容** - 不破坏现有功能
3. **遵循官方规范** - 使用 Matrix 标准 `m.mentions` 字段
4. **便于后续升级** - 代码结构与官方保持一致

---

## 2. 当前架构分析

### 2.1 代码结构

```
/root/.openclaw/extensions/matrix/
├── index.ts                    # 插件入口
├── openclaw.plugin.json        # 插件配置
├── package.json                # 依赖管理
├── CHANGELOG.md                # 更新日志
└── src/
    ├── channel.ts              # Matrix 通道实现
    ├── actions.ts              # message 工具 action 处理
    ├── tool-actions.ts         # Matrix action 路由
    └── matrix/
        ├── send.ts             # 核心发送逻辑 ⭐
        ├── send/
        │   ├── formatting.ts   # 文本格式化 ⭐
        │   ├── types.ts        # 类型定义 ⭐
        │   ├── client.ts       # 客户端管理
        │   ├── media.ts        # 媒体处理
        │   └── ...
        ├── actions/
        │   ├── messages.ts     # sendMatrixMessage ⭐
        │   └── ...
        └── monitor/
            └── mentions.ts     # mention 检测（入站）
```

**⭐ 标记** = 需要修改的文件

### 2.2 消息发送流程

```
Agent 调用
    ↓
message 工具 (openclaw message send)
    ↓
actions.ts (extractToolSend)
    ↓
tool-actions.ts (handleMatrixAction)
    ↓
messages.ts (sendMatrixMessage)
    ↓
send.ts (sendMessageMatrix)
    ↓
formatting.ts (buildTextContent)
    ↓
Matrix Bot SDK (client.sendMessage)
    ↓
Matrix Server
```

### 2.3 当前限制

| 功能 | 状态 | 说明 |
|------|------|------|
| 接收 mention | ✅ 支持 | `mentions.ts` 检测 `m.mentions` 字段 |
| 发送 mention | ❌ 不支持 | 无相关参数和逻辑 |
| 自动检测@语法 | ❌ 不支持 | 无解析逻辑 |

---

## 3. 需求说明

### 3.1 功能需求

#### FR-1: 支持 mentions 参数

**描述**: `message.send` 工具支持 `mentions` 参数

**输入格式**:
```json
{
  "mentions": [
    {
      "userId": "@coding:conduit.local",
      "displayName": "coding"
    }
  ]
}
```

**CLI 参数**:
```bash
--mentions '[{"userId":"@coding:conduit.local","displayName":"coding"}]'
```

#### FR-2: 生成 Matrix mention HTML

**描述**: 自动构建 Matrix 标准 mention HTML 格式

**输出格式**:
```html
<a href="https://matrix.to/#/@coding:conduit.local">coding</a>
```

#### FR-3: 添加 m.mentions 字段

**描述**: 发送时包含 Matrix 标准 `m.mentions` 字段

**格式**:
```json
{
  "m.mentions": {
    "user_ids": ["@coding:conduit.local"]
  }
}
```

#### FR-4: 向后兼容

**描述**: 不传 `mentions` 参数时，行为与现有版本一致

### 3.2 非功能需求

#### NFR-1: 与官方 API 兼容

- 使用 OpenClaw 官方 Matrix 扩展的 API 和类型
- 不修改官方接口签名（只扩展参数）
- 保持与 `@vector-im/matrix-bot-sdk` 的兼容性

#### NFR-2: 代码质量

- TypeScript 类型安全
- 单元测试覆盖率 > 80%
- 遵循现有代码风格

#### NFR-3: 性能

- 不增加显著延迟（< 50ms）
- 不增加内存占用

---

## 4. 技术方案

### 4.1 修改文件清单

| 文件 | 修改类型 | 行数 | 优先级 |
|------|---------|------|--------|
| `src/matrix/send/types.ts` | 新增类型 | +20 | P0 |
| `src/matrix/send/formatting.ts` | 新增函数 | +40 | P0 |
| `src/matrix/send.ts` | 修改逻辑 | +30 | P0 |
| `src/actions.ts` | 参数解析 | +20 | P1 |
| `src/tool-actions.ts` | 参数传递 | +10 | P1 |
| `src/matrix/actions/messages.ts` | 参数传递 | +10 | P1 |

### 4.2 详细实现

#### 4.2.1 类型定义 (`types.ts`)

```typescript
// 新增类型
export type MatrixMention = {
  userId: string;
  displayName?: string;
};

// 修改 MatrixSendOpts
export type MatrixSendOpts = {
  client?: import("@vector-im/matrix-bot-sdk").MatrixClient;
  mediaUrl?: string;
  accountId?: string;
  replyToId?: string;
  threadId?: string | number | null;
  timeoutMs?: number;
  audioAsVoice?: boolean;
  mentions?: MatrixMention[];  // ⭐ 新增
};
```

#### 4.2.2 格式化函数 (`formatting.ts`)

```typescript
// 新增函数
export function buildMentionHtml(userId: string, displayName?: string): string {
  const name = displayName || userId;
  const encodedUserId = encodeURIComponent(userId);
  return `<a href="https://matrix.to/#/${encodedUserId}">${name}</a>`;
}

// 修改 applyMatrixFormatting
export function applyMatrixFormatting(
  content: MatrixFormattedContent,
  body: string,
  mentions?: MatrixMention[]  // ⭐ 新增参数
): void {
  const formatted = markdownToMatrixHtml(body ?? "");
  if (!formatted) {
    return;
  }
  content.format = "org.matrix.custom.html";
  content.formatted_body = formatted;
  
  // ⭐ 添加 mention HTML 到正文
  if (mentions?.length) {
    const mentionHtml = mentions
      .map(m => buildMentionHtml(m.userId, m.displayName))
      .join(" ");
    content.formatted_body += ` ${mentionHtml}`;
  }
}
```

#### 4.2.3 发送逻辑 (`send.ts`)

```typescript
// 修改 buildTextContent 调用
export function buildTextContent(
  body: string,
  relation?: MatrixRelation,
  mentions?: MatrixMention[]  // ⭐ 新增参数
): MatrixTextContent {
  const content: MatrixTextContent = relation
    ? {
        msgtype: MsgType.Text,
        body,
        "m.relates_to": relation,
      }
    : {
        msgtype: MsgType.Text,
        body,
      };
  applyMatrixFormatting(content, body, mentions);  // ⭐ 传递 mentions
  return content;
}

// 修改 sendMessageMatrix
export async function sendMessageMatrix(
  to: string,
  message: string,
  opts: MatrixSendOpts = {},
): Promise<MatrixSendResult> {
  // ... 现有代码 ...
  
  const content = buildTextContent(text, relation, opts.mentions);  // ⭐ 传递 mentions
  
  // ⭐ 添加 m.mentions 字段
  if (opts.mentions?.length) {
    (content as any)["m.mentions"] = {
      user_ids: opts.mentions.map(m => m.userId)
    };
  }
  
  // ... 现有代码 ...
}
```

#### 4.2.4 Action 处理 (`actions.ts`)

```typescript
// 修改 handleAction 中的 send 分支
if (action === "send") {
  const to = readStringParam(params, "to", { required: true });
  const content = readStringParam(params, "message", {
    required: true,
    allowEmpty: true,
  });
  const mediaUrl = readStringParam(params, "media", { trim: false });
  const replyTo = readStringParam(params, "replyTo");
  const threadId = readStringParam(params, "threadId");
  const mentions = readStringParam(params, "mentions");  // ⭐ 新增
  
  return await handleMatrixAction(
    {
      action: "sendMessage",
      to,
      content,
      mediaUrl: mediaUrl ?? undefined,
      replyToId: replyTo ?? undefined,
      threadId: threadId ?? undefined,
      mentions: mentions ? JSON.parse(mentions) : undefined,  // ⭐ 传递
    },
    cfg as CoreConfig,
  );
}
```

#### 4.2.5 Tool Action 路由 (`tool-actions.ts`)

```typescript
// 修改 sendMessage case
case "sendMessage": {
  const to = readStringParam(params, "to", { required: true });
  const content = readStringParam(params, "content", {
    required: true,
    allowEmpty: true,
  });
  const mediaUrl = readStringParam(params, "mediaUrl");
  const replyToId = readStringParam(params, "replyToId");
  const threadId = readStringParam(params, "threadId");
  const mentions = params.mentions as MatrixMention[] | undefined;  // ⭐ 新增
  
  const result = await sendMatrixMessage(to, content, {
    mediaUrl: mediaUrl ?? undefined,
    replyToId: replyToId ?? undefined,
    threadId: threadId ?? undefined,
    mentions: mentions ?? undefined,  // ⭐ 传递
  });
  return jsonResult({ ok: true, result });
}
```

#### 4.2.6 messages.ts

```typescript
// 修改 sendMatrixMessage 签名
export async function sendMatrixMessage(
  to: string,
  content: string,
  opts: MatrixActionClientOpts & {
    mediaUrl?: string;
    replyToId?: string;
    threadId?: string;
    mentions?: MatrixMention[];  // ⭐ 新增
  } = {},
) {
  return await sendMessageMatrix(to, content, {
    mediaUrl: opts.mediaUrl,
    replyToId: opts.replyToId,
    threadId: opts.threadId,
    mentions: opts.mentions,  // ⭐ 传递
    client: opts.client,
    timeoutMs: opts.timeoutMs,
  });
}
```

### 4.3 数据流图

```
┌─────────────────────────────────────────────────────────────┐
│ Agent 调用                                                    │
│ message.send(mentions=[{userId:"@coding:conduit.local"}])   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ actions.ts                                                   │
│ extractToolSend() → { to, mentions }                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ tool-actions.ts                                              │
│ handleMatrixAction(action="sendMessage", mentions=...)      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ messages.ts                                                  │
│ sendMatrixMessage(to, content, { mentions })                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ send.ts                                                      │
│ sendMessageMatrix(to, content, { mentions })                │
│   ↓                                                          │
│   buildTextContent(body, relation, mentions)                │
│     ↓                                                        │
│     applyMatrixFormatting(content, body, mentions)          │
│       - 添加 mention HTML 到 formatted_body                   │
│   ↓                                                          │
│   添加 m.mentions 字段到 content                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Matrix Bot SDK                                               │
│ client.sendMessage(roomId, content)                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Matrix Server                                                │
│ 发送通知给被@用户                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 与官方 API 兼容性

### 5.1 官方依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| `@vector-im/matrix-bot-sdk` | 最新 | Matrix 客户端 SDK |
| `openclaw/plugin-sdk` | 最新 | OpenClaw 插件 SDK |

### 5.2 兼容性保证

#### 5.2.1 向后兼容

- ✅ `mentions` 参数可选，默认 `undefined`
- ✅ 不传 `mentions` 时，行为与现有版本完全一致
- ✅ 不修改现有函数签名（只扩展）

#### 5.2.2 Matrix 标准兼容

- ✅ 使用标准 `m.mentions` 字段 (MSC3952)
- ✅ 使用标准 `matrix.to` 链接格式
- ✅ 兼容加密和非加密房间

#### 5.2.3 OpenClaw 官方 API

- ✅ 使用官方 `message` 工具接口
- ✅ 遵循官方插件架构
- ✅ 代码结构与官方保持一致

### 5.3 升级路径

**当 OpenClaw 官方更新 Matrix 扩展时**:

1. 对比官方代码变更
2. 合并变更到本地代码
3. 保留 `mentions` 相关修改
4. 运行测试验证

**建议**: 在代码中添加注释标记修改位置，便于后续合并。

---

## 6. 实施计划

### 6.1 阶段划分

#### Phase 1: 核心功能 (4 小时)

| 任务 | 时间 | 负责人 | 状态 |
|------|------|--------|------|
| 修改 `types.ts` | 30 分钟 | coding | ⏳ |
| 修改 `formatting.ts` | 1 小时 | coding | ⏳ |
| 修改 `send.ts` | 1 小时 | coding | ⏳ |
| 修改 `actions.ts` | 30 分钟 | coding | ⏳ |
| 修改 `tool-actions.ts` | 30 分钟 | coding | ⏳ |
| 修改 `messages.ts` | 30 分钟 | coding | ⏳ |

#### Phase 2: 测试验证 (2 小时)

| 任务 | 时间 | 负责人 | 状态 |
|------|------|--------|------|
| 编写单元测试 | 1 小时 | coding | ⏳ |
| 集成测试 | 30 分钟 | coding | ⏳ |
| 实际 Matrix 环境测试 | 30 分钟 | coding | ⏳ |

#### Phase 3: 文档和部署 (1 小时)

| 任务 | 时间 | 负责人 | 状态 |
|------|------|--------|------|
| 更新 README.md | 30 分钟 | coding | ⏳ |
| 部署到开发环境 | 15 分钟 | coding | ⏳ |
| Code Review | 15 分钟 | coding | ⏳ |

### 6.2 里程碑

| 里程碑 | 预计时间 | 交付物 |
|--------|----------|--------|
| M1: 核心功能完成 | 4 小时 | 可运行的代码 |
| M2: 测试通过 | 2 小时 | 测试报告 |
| M3: 部署完成 | 1 小时 | 生产环境可用 |

### 6.3 验收标准

- [ ] CLI 支持 `--mentions` 参数
- [ ] Agent 工具支持 `mentions` 参数
- [ ] 发送的消息包含 `m.mentions` 字段
- [ ] 被@用户收到通知
- [ ] 单元测试覆盖率 > 80%
- [ ] 向后兼容（不传 mentions 正常工作）

---

## 7. 测试计划

### 7.1 单元测试

#### 7.1.1 formatting.ts 测试

```typescript
describe("buildMentionHtml", () => {
  it("generates correct HTML for mention", () => {
    const html = buildMentionHtml("@coding:conduit.local", "coding");
    expect(html).toBe(
      '<a href="https://matrix.to/#/%40coding%3Aconduit.local">coding</a>'
    );
  });
  
  it("uses userId as displayName when not provided", () => {
    const html = buildMentionHtml("@coding:conduit.local");
    expect(html).toContain("@coding:conduit.local");
  });
});
```

#### 7.1.2 send.ts 测试

```typescript
describe("sendMessageMatrix with mentions", () => {
  it("includes m.mentions field when mentions provided", async () => {
    const { client, sendMessage } = makeClient();
    await sendMessageMatrix("room:!room:local", "hello", {
      mentions: [{ userId: "@coding:conduit.local" }]
    });
    
    const content = sendMessage.mock.calls[0]?.[1] as any;
    expect(content["m.mentions"]).toEqual({
      user_ids: ["@coding:conduit.local"]
    });
  });
  
  it("does not include m.mentions when mentions not provided", async () => {
    const { client, sendMessage } = makeClient();
    await sendMessageMatrix("room:!room:local", "hello");
    
    const content = sendMessage.mock.calls[0]?.[1] as any;
    expect(content["m.mentions"]).toBeUndefined();
  });
});
```

### 7.2 集成测试

#### 7.2.1 CLI 测试

```bash
# 测试 1: 发送带 mention 的消息
openclaw message send \
  --channel matrix \
  --target "#working:conduit.local" \
  --message "@coding 你怎么看？" \
  --mentions '[{"userId":"@coding:conduit.local","displayName":"coding"}]'

# 验证：coding agent 收到通知
```

#### 7.2.2 Agent 工具测试

```python
# 测试：Agent 调用 message 工具
message.send(
  channel="matrix",
  target="#working:conduit.local",
  message="@coding:conduit.local 这个 API 你怎么看？",
  mentions=[{"userId": "@coding:conduit.local"}]
)
```

### 7.3 测试矩阵

| 场景 | 预期结果 | 状态 |
|------|----------|------|
| 单用户 mention | 用户收到通知 | ⏳ |
| 多用户 mention | 所有用户收到通知 | ⏳ |
| 无 mention | 正常发送，无通知 | ⏳ |
| 加密房间 | mention 正常工作 | ⏳ |
| 群聊 | mention 正常工作 | ⏳ |
| 私聊 | mention 正常工作 | ⏳ |

---

## 8. 风险评估

### 8.1 技术风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| Matrix Bot SDK 不兼容 | 低 | 高 | 先验证 SDK 支持 `m.mentions` |
| 加密房间不支持 | 中 | 中 | 先支持非加密房间 |
| 向后兼容问题 | 低 | 高 | 严格测试不传 mentions 的场景 |

### 8.2 进度风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 代码合并冲突 | 中 | 中 | 定期同步官方代码 |
| 测试环境不可用 | 低 | 中 | 提前准备测试 Matrix 房间 |

### 8.3 应对措施

1. **每日同步**: 每天开始工作前同步官方代码
2. **分支管理**: 在 `feature/matrix-mentions` 分支开发
3. **渐进式部署**: 先在开发环境验证，再部署生产

---

## 9. 参考资料

### 9.1 官方文档

- [OpenClaw Matrix 扩展](https://docs.openclaw.ai/channels/matrix)
- [OpenClaw message 工具](https://docs.openclaw.ai/tools/index#message)
- [Matrix m.mentions MSC3952](https://github.com/matrix-org/matrix-spec-proposals/pull/3952)

### 9.2 代码位置

| 项目 | 路径 |
|------|------|
| **官方 Matrix 扩展** | `/root/.openclaw/extensions/matrix/` |
| **本地开发副本** | `~/work_code/matrix/` |
| **官方文档** | `/root/.openclaw/workspace/docs/openclaw/extensions/matrix/` |

### 9.3 相关文件

- `~/work_code/matrix/src/matrix/send/types.ts` - 类型定义
- `~/work_code/matrix/src/matrix/send/formatting.ts` - 格式化逻辑
- `~/work_code/matrix/src/matrix/send.ts` - 核心发送逻辑
- `~/work_code/matrix/src/actions.ts` - Action 处理
- `~/work_code/matrix/src/tool-actions.ts` - Tool 路由

---

## 附录 A: 命令参考

### A.1 开发命令

```bash
# 安装依赖
cd ~/work_code/matrix
npm install

# 编译 TypeScript
npm run build

# 运行测试
npm test

# 部署到 OpenClaw
cp -r ~/work_code/matrix /root/.openclaw/extensions/matrix-backup
cp -r ~/work_code/matrix/dist /root/.openclaw/extensions/matrix/

# 重启 Gateway
openclaw gateway restart
```

### A.2 测试命令

```bash
# 发送测试消息（CLI）
openclaw message send \
  --channel matrix \
  --target "#working:conduit.local" \
  --message "测试@mention" \
  --mentions '[{"userId":"@coding:conduit.local"}]'

# 验证消息内容（需要 Matrix 客户端）
# 检查 m.mentions 字段是否存在
```

---

## 附录 B: 代码审查清单

- [ ] 类型定义完整且准确
- [ ] 所有函数有 JSDoc 注释
- [ ] 单元测试覆盖率 > 80%
- [ ] 向后兼容（不传 mentions 正常工作）
- [ ] 代码风格与官方一致
- [ ] 无 TypeScript 编译错误
- [ ] 实际 Matrix 环境测试通过
- [ ] 文档更新完成

---

**文档结束**

_最后更新：2026-03-06 22:24_

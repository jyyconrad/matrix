# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是 **OpenClaw Matrix 通道插件**，实现了 Matrix 协议的集成，允许 OpenClaw 与 Matrix 网络中的用户和聊天室进行交互。

## 架构结构

### 核心模块
- **`index.ts`**：插件入口，注册 Matrix 通道插件到 OpenClaw 系统
- **`src/channel.ts`**：核心通道实现，包含插件的所有元数据、配置、安全策略、目录服务、消息处理等
- **`src/config-schema.ts`**：配置结构定义和 Zod 验证规则
- **`src/outbound.ts`**：出站消息处理，将 OpenClaw 消息转换为 Matrix 格式
- **`src/resolve-targets.ts`**：目标地址解析，处理用户/房间 ID 的规范化
- **`src/directory-live.ts`**：实时目录服务，查询 Matrix 网络中的用户和房间
- **`src/tool-actions.ts`**：通道工具动作实现（如反应、投票、固定消息等）

### Matrix 协议层（`src/matrix/`）
- **客户端管理**：`client/` 目录实现客户端连接、认证、存储和生命周期管理
- **消息接收**：`monitor/` 目录处理入站消息、事件解析、媒体处理、提及识别
- **消息发送**：`send/` 目录处理出站消息格式化、目标解析、媒体上传
- **发送队列**：`send-queue.ts` 实现消息发送的队列机制，确保消息可靠传递
- **加密支持**：通过 `@matrix-org/matrix-sdk-crypto-nodejs` 提供端到端加密支持
- **账户管理**：`accounts.ts` 实现多账户隔离和切换
- **凭证管理**：`credentials.ts` 安全处理 Matrix 账号凭证存储
- **工具动作**：`actions/` 目录实现各种 Matrix 特定操作（反应、固定、投票等）

### 关键特性
- 支持一对一私信、群组聊天、线程回复
- 支持消息反应、投票、媒体附件（图片、文件、音频、视频）
- 端到端加密支持（E2EE）
- 灵活的安全策略配置（用户允许列表、房间访问策略、自动加入规则）
- 多账户支持，完全隔离的客户端实例
- 消息队列机制，确保网络波动下的可靠消息传递
- 消息格式转换（Markdown ↔ Matrix HTML）

## 常用命令

> 本项目是 OpenClaw 插件 monorepo 的一部分，所有命令从仓库根目录执行

### 测试
```bash
# 运行所有 Matrix 插件测试
pnpm test matrix

# 运行单个测试文件
pnpm test matrix/src/[test-file-name].test.ts

# 运行测试并查看详细输出
pnpm test matrix --verbose

# 运行实时集成测试（需要配置 Matrix 账户）
pnpm test matrix/src/directory-live.test.ts

# 运行 Matrix 客户端相关测试
pnpm test matrix/src/matrix/client
```

### 类型检查
```bash
pnpm typecheck
```

### Lint
```bash
pnpm lint
```

### 构建
```bash
pnpm build
```

### 开发
```bash
# 启动 OpenClaw 开发环境并加载本地 Matrix 插件
pnpm dev --load-extension=extensions/matrix
```

## 开发要点

1. **配置验证**：所有配置变更需要在 `config-schema.ts` 中定义 Zod 验证规则
2. **消息流向**：
   - 入站消息：Matrix 事件 → `matrix/monitor/handler.ts` → 转换为 OpenClaw 消息格式
   - 出站消息：OpenClaw 消息 → `outbound.ts` → `matrix/send/` → Matrix 网络
3. **消息格式化**：使用 markdown-it 渲染 Markdown 内容，Matrix 原生格式转换在 `matrix/format.ts` 实现
4. **加密支持**：通过 `@matrix-org/matrix-sdk-crypto-nodejs` 提供端到端加密支持，加密逻辑在客户端层自动处理
5. **账户隔离**：多账户支持通过 `resolveMatrixAccount` 系列函数实现，每个账户有独立的客户端实例和存储
6. **安全策略**：
   - DM 安全策略：通过 `buildAccountScopedDmSecurityPolicy` 实现
   - 群组安全策略：支持开放/允许列表两种模式
   - 所有用户输入、房间 ID、用户 ID 在使用前都会经过规范化处理
7. **媒体处理**：媒体上传、下载和格式转换在 `matrix/monitor/media.ts` 和 `matrix/send/media.ts` 实现
8. **错误处理**：客户端连接错误自动重试，消息发送失败会进入重试队列
9. **测试规范**：所有核心功能都需要配套单元测试，协议层功能需要同时包含单元测试和集成测试

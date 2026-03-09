# 核心模块代码地图

**最后更新:** 2026-03-09
**入口点:** src/channel.ts

## 架构

```
src/
├── channel.ts          # 渠道插件核心实现
├── index.ts            # 插件入口
├── runtime.ts          # 运行时环境
├── types.ts            # 类型定义
├── actions.ts          # 消息动作处理
├── outbound.ts         # 出站消息处理
├── resolve-targets.ts  # 目标解析
├── group-mentions.ts   # 群组提及处理
├── directory-live.ts   # 实时目录查询
├── onboarding.ts       # 引导流程
└── secret-input.ts     # 敏感输入处理
```

## 核心模块说明

| 模块 | 用途 | 主要导出 | 关键依赖 |
|------|------|----------|----------|
| `channel.ts` | 插件核心实现，定义所有渠道接口 | `matrixPlugin` | `@openclaw/plugin-sdk`, `./matrix/*` |
| `index.ts` | 插件入口，注册到 OpenClaw 系统 | 默认导出插件对象 | `./src/channel.js`, `./src/runtime.js` |
| `runtime.ts` | 运行时环境管理 | `setMatrixRuntime`, `getMatrixRuntime` |  |
| `types.ts` | 全局类型定义 | `CoreConfig` 等类型 |  |
| `actions.ts` | 消息动作处理 | `matrixMessageActions` |  |
| `outbound.ts` | 出站消息处理管道 | `matrixOutbound` | `./matrix/send.js` |
| `resolve-targets.ts` | 消息目标解析 | `resolveMatrixTargets` |  |
| `group-mentions.ts` | 群组提及和权限处理 | `resolveMatrixGroupRequireMention`, `resolveMatrixGroupToolPolicy` |  |
| `directory-live.ts` | 实时目录查询 | `listMatrixDirectoryPeersLive`, `listMatrixDirectoryGroupsLive` |  |
| `onboarding.ts` | 用户引导流程 | `matrixOnboardingAdapter` |  |
| `secret-input.ts` | 敏感输入规范化 | `normalizeSecretInputString` |  |

## 插件能力

| 能力 | 支持 | 说明 |
|------|------|------|
| 聊天类型 | ✅ 直接消息、群组、线程 | 支持三种聊天模式 |
| 投票 | ✅ | 支持创建和响应投票 |
| 反应 | ✅ | 支持消息表情反应 |
| 线程 | ✅ | 支持线程消息 |
| 媒体 | ✅ | 支持文件和媒体传输 |

## 数据流

```
插件注册 → 配置验证 → 账户启动 → 消息监控 → 入站消息处理 → 业务逻辑 → 出站消息发送
```

## 核心流程

1. **插件加载**：index.ts 注册插件到 OpenClaw 系统
2. **配置初始化**：验证 Matrix  homeserver、访问令牌等配置
3. **客户端启动**：创建 Matrix 客户端连接到 homeserver
4. **消息监控**：启动事件监听器处理 Matrix 事件
5. **入站处理**：解析消息、验证权限、转换为 OpenClaw 内部格式
6. **业务处理**：交给核心代理处理消息
7. **出站处理**：将响应转换为 Matrix 格式并发送

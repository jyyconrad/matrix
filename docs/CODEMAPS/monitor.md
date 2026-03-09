# 监控模块代码地图

**最后更新:** 2026-03-09
**入口点:** src/matrix/monitor/index.ts

## 架构

```
src/matrix/monitor/
├── index.ts                # 监控入口
├── handler.ts              # 事件处理主逻辑
├── events.ts               # 事件类型定义和处理
├── inbound-body.ts         # 入站消息体解析
├── mentions.ts             # 提及检测
├── replies.ts              # 回复处理
├── threads.ts              # 线程管理
├── direct.ts               # 直接消息处理
├── rooms.ts                # 房间信息管理
├── room-info.ts            # 房间信息查询
├── allowlist.ts            # 访问控制白名单
├── access-policy.ts        # 访问策略
├── auto-join.ts            # 自动加入房间
├── location.ts             # 位置跟踪
├── media.ts                # 媒体文件处理
└── types.ts                # 监控相关类型
```

## 模块说明

| 模块 | 用途 | 关键功能 |
|------|------|----------|
| `index.ts` | 监控器入口 | 启动监控、注册事件处理器、管理客户端生命周期 |
| `handler.ts` | 事件处理核心 | 接收 Matrix 事件、路由到对应处理器、构建入站消息 |
| `events.ts` | 事件处理 | 处理各类 Matrix 事件（消息、反应、投票等） |
| `inbound-body.ts` | 消息解析 | 将 Matrix 原始消息转换为 OpenClaw 内部格式 |
| `mentions.ts` | 提及检测 | 检测消息中是否提及机器人、提取提及用户 |
| `replies.ts` | 回复处理 | 处理消息回复关系、构建回复上下文 |
| `threads.ts` | 线程管理 | 处理线程消息、维护线程上下文 |
| `direct.ts` | 直接消息 | 处理一对一私聊消息 |
| `rooms.ts` | 房间管理 | 管理加入的房间列表、房间元数据 |
| `room-info.ts` | 房间信息 | 查询和缓存房间信息、成员列表 |
| `allowlist.ts` | 访问控制 | 用户/房间白名单验证、权限检查 |
| `access-policy.ts` | 策略执行 | 应用安全策略、决定是否处理消息 |
| `auto-join.ts` | 自动加入 | 自动处理房间邀请、加入许可的房间 |
| `location.ts` | 位置跟踪 | 跟踪消息来源位置、房间上下文 |
| `media.ts` | 媒体处理 | 下载、解析和处理消息中的媒体附件 |

## 事件处理流程

```
Matrix 事件 → 事件接收器 → 类型路由 → 访问策略检查 → 白名单验证 →
消息体解析 → 上下文构建 → 传递给核心系统 → 响应处理
```

## 支持的事件类型

| 事件类型 | 处理模块 | 说明 |
|----------|----------|------|
| `m.room.message` | `events.ts` | 普通文本消息 |
| `m.room.message.feedback` | `events.ts` | 消息反馈 |
| `m.reaction` | `events.ts` | 消息反应 |
| `m.room.poll.start` | `events.ts` | 投票开始 |
| `m.room.poll.response` | `events.ts` | 投票响应 |
| `m.room.member` | `auto-join.ts` | 成员事件（邀请等） |
| 媒体消息 | `media.ts` | 图片、文件、音频等媒体 |

## 安全控制

1. **白名单验证**：所有消息来源必须在白名单中
2. **访问策略**：支持开放、白名单、禁止三种群组策略
3. **提及检查**：群组消息需要提及机器人才能触发
4. **权限分级**：不同用户有不同的工具使用权限

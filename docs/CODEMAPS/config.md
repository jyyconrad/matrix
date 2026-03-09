# 配置和账户管理代码地图

**最后更新:** 2026-03-09
**入口点:** src/config-schema.ts, src/matrix/accounts.ts

## 架构

```
src/
├── config-schema.ts        # 配置 schema 定义
├── matrix/
│   ├── accounts.ts         # 账户管理
│   ├── client.ts           # 客户端配置
│   ├── credentials.ts      # 凭证管理
│   └── client-bootstrap.ts # 客户端初始化
└── matrix/monitor/
    └── allowlist.ts        # 白名单配置
```

## 模块说明

| 模块 | 用途 | 关键功能 |
|------|------|----------|
| `config-schema.ts` | 配置验证 | 使用 Zod 定义配置结构、验证配置有效性 |
| `matrix/accounts.ts` | 账户管理 | 多账户支持、账户配置解析、默认账户选择 |
| `matrix/client.ts` | 客户端配置 | 解析认证信息、创建 Matrix 客户端实例 |
| `matrix/credentials.ts` | 凭证管理 | 安全存储和访问访问令牌、密码等敏感信息 |
| `matrix/client-bootstrap.ts` | 客户端初始化 | 启动客户端、处理加密初始化、同步历史消息 |
| `matrix/monitor/allowlist.ts` | 白名单配置 | 解析和规范化白名单、验证用户/房间权限 |

## 配置结构

### 顶层配置
```typescript
interface CoreConfig {
  channels?: {
    matrix?: MatrixConfig
  }
}
```

### Matrix 配置
```typescript
interface MatrixConfig {
  enabled: boolean
  name?: string
  homeserver: string
  userId: string
  accessToken?: string
  password?: string
  deviceName?: string
  initialSyncLimit?: number
  replyToMode?: "off" | "reply" | "thread"
  mediaMaxMb?: number
  dm?: {
    policy?: "allow" | "allowlist" | "deny"
    allowFrom?: string[]
  }
  groupPolicy?: "open" | "allowlist" | "deny"
  groupAllowFrom?: string[]
  groups?: Record<string, GroupConfig>
  rooms?: Record<string, GroupConfig> // 别名，兼容旧配置
}
```

### 群组配置
```typescript
interface GroupConfig {
  requireMention?: boolean
  toolPolicy?: "all" | "allowlist" | "none"
  allowTools?: string[]
  users?: string[]
}
```

## 配置验证流程

```
配置输入 → Zod schema 验证 → 字段规范化 → 敏感信息加密存储 →
账户解析 → 客户端创建 → 连接测试 → 配置生效
```

## 多账户支持

### 账户标识
- 支持多账户配置，每个账户有唯一的 `accountId`
- 默认账户使用 `DEFAULT_ACCOUNT_ID = "default"`
- 账户配置存储在 `channels.matrix.accounts[accountId]` 下

### 账户解析流程
1. 查找指定 `accountId` 的配置
2. 如果未找到，使用默认账户配置
3. 合并全局配置和账户特定配置
4. 验证必填字段（homeserver、认证信息）
5. 返回解析后的账户对象

## 安全特性

1. **敏感信息处理**
   - 访问令牌和密码从不明文日志
   - 支持环境变量注入敏感信息
   - 输入自动规范化和清理

2. **访问控制**
   - 私聊白名单：控制哪些用户可以发起私聊
   - 群组策略：开放/白名单/禁止三种模式
   - 工具权限：按群组配置可用工具列表
   - 提及要求：群组消息需要提及才响应

3. **配置验证**
   - 所有配置项都有 Zod 验证
   - 无效配置提前报错，避免运行时错误
   - 提供清晰的错误提示信息

# Workbench Frontend Result Contract v1（中文）

> Status Note
> 本文档是前端结果契约规划稿，不代表当前仓库里已经稳定产出的实际 contract。
> 当前 agent 应以 [AGENT-EXECUTION-BASELINE.md](D:\Rune Weaver\docs\AGENT-EXECUTION-BASELINE.md) 规定的最小 UI / workbench 边界为准，并以真实 workspace / bridge 输出为先。
> 若本文字段设计与当前实现不一致，应先修正实现基线，再决定是否收口本文档。

## 目的

本文档定义 Rune Weaver 前端可消费的结构化契约。目标是将 workbench 内部复杂的实现对象转换为前端可用的稳定 view model，消除前端对 CLI 文本输出的依赖。

## 顶层结构

Frontend-facing contract 包含以下顶层 section：

```
WorkbenchFrontendResult
├── session           # 会话信息
├── featureSummary    # Feature 概要（主对象）
├── featureCard       # Feature 卡片视图
├── featureDetail    # Feature 详情面板
├── lifecycle         # 生命周期操作
├── routing           # 路由决策
├── governance        # 治理与确认
├── evidence          # 证据层（write evidence）
└── errors            # 错误信息
```

---

## Section 定义

### 1. Session（会话信息）

提供当前会话的基础上下文。

**字段**：

- `sessionId`: string - 会话唯一标识
- `createdAt`: string (ISO) - 创建时间
- `originalRequest`: string - 用户原始请求
- `hostRoot`: string - 目标 host 根路径

**说明**：session 层不暴露 wizard 内部状态，只提供前端展示所需的最小上下文。

---

### 2. FeatureSummary（Feature 概要）

feature 的高层摘要，用于在列表页或主视图快速识别。

**字段**：

- `id`: string - feature 唯一标识
- `displayLabel`: string - 用户可见名称
- `systemLabel`: string - 内部标识
- `summary`: string - 简要描述
- `host`: string - 所属 host

**说明**：这是最小化的 feature 标识信息，供前端在卡片和列表中使用。

---

### 3. FeatureCard（Feature 卡片视图）

用户能在 workbench 中看到的主要卡片对象。

**字段**：

- `id`: string - feature id
- `displayLabel`: string - 显示名称
- `systemLabel`: string - 系统标签
- `summary`: string - 功能摘要
- `host`: string - host 名称
- `status`: "draft" | "needs_clarification" | "ready" | "blocked" - 卡片状态
- `riskLevel`: "low" | "medium" | "high" - 风险等级
- `needsConfirmation`: boolean - 是否需要确认
- `createdAt`: string (ISO) - 创建时间
- `updatedAt`: string (ISO) - 更新时间

**说明**：直接映射到 WORKBENCH-FRONTEND-PLAN 中的 FeatureCardPanel需求。status 统一使用枚举值，避免文本依赖。

---

### 4. FeatureDetail（Feature 详情面板）

展示 feature 的完整信息，包含多个 subsection。

**字段**：

#### 4.1 basicInfo

- `id`: string
- `displayLabel`: string
- `systemLabel`: string
- `intentSummary`: string - 意图摘要
- `hostScope`: string - host 范围
- `createdAt`: string (ISO)
- `updatedAt`: string (ISO)

#### 4.2 status

- `status`: FeatureCardStatus
- `riskLevel`: "low" | "medium" | "high"
- `needsConfirmation`: boolean
- `conflictCount`: number
- `lastConflictSummary`: string

#### 4.3 editableParams

- `knownInputs`: Record<string, unknown> - 已知输入参数
- `missingParams`: string[] - 缺失参数列表
- `canEdit`: boolean - 是否可编辑

#### 4.4 hostOutput

- `host`: string
- `expectedSurfaces`: string[] - 期望的输出表面
- `impactAreas`: string[] - 影响区域
- `integrationPointCount`: number
- `outputSummary`: string - 输出摘要

#### 4.5 patternBindings

- `patterns`: string[] - 绑定的 pattern 列表
- `isBound`: boolean - 是否已绑定

**说明**：detail 层按 subsection 组织，每个 subsection 对应一个前端面板。字段命名与内部 types.ts 保持对齐但不直接暴露内部枚举。

---

### 5. Lifecycle（生命周期操作）

管理 feature 的 create / read / update / archive 操作。

**字段**：

- `cardId`: string
- `currentStage`: FeatureCardStatus
- `persistenceState`: "new" | "runtime" | "persisted"
- `persistedFeatureId`: string | null
- `persistenceReason`: string
- `actions`: Array<{
    kind: "create" | "read" | "update" | "archive"
    enabled: boolean
    reason: string
    nextHint?: string
  }>

**说明**：lifecycle 不暴露具体的 handler 逻辑，只告诉前端"当前可以做什么"和"为什么"。

---

### 6. Routing（路由决策）

告诉前端当前请求应该走哪条路径。

**字段**：

- `decision`: "create" | "update" | "possible_match" | "unclear"
- `confidence`: "high" | "medium" | "low"
- `focus`: {
    type: "newly_created" | "persisted_existing" | "candidate_match" | "runtime_only"
    featureId?: string
    featureLabel?: string
    reason: string
  }
- `handoff`: {
    status: "direct_target" | "candidate_target" | "unresolved"
    targetFeatureId?: string
    targetFeatureLabel?: string
    handoverReason: string
  }

**说明**：routing 屏蔽了内部复杂的 routing 逻辑，只输出决策结果。

---

### 7. Governance（治理与确认）

处理确认流程和发布决策。

**字段**：

#### 7.1 release

- `status`: "not_required" | "awaiting_confirmation" | "released" | "blocked"
- `blockedReason`: string | null
- `requiredConfirmations`: Array<{
    itemId: string
    itemType`: "conflict" | "parameter" | "ownership"
    description: string
    severity`: "high" | "medium" | "low"
    currentValue?: string
    suggestedValue?: string
  }>
- `nextAllowedTransition`: string | null
- `releaseHint`: string
- `canSelfRelease`: boolean

#### 7.2 confirmation

- `actionStatus`: "not_applicable" | "awaiting_items" | "accepted" | "fully_confirmed" | "rejected"
- `acceptedItemIds`: string[]
- `remainingItemCount`: number
- `transitionResult`: "released_to_ready" | "still_blocked" | "not_needed"
- `actionHint`: string
- `canProceed`: boolean

**说明**：governance 是阻塞点可视化的核心，让用户一眼看懂"为什么卡住"和"需要什么才能继续"。

---

### 8. Evidence（证据层）

展示系统准备做什么和实际做了什么。

**字段**：

#### 8.1 affectedSurfaces（规划阶段）

- `surfaces`: Array<{
    surfaceKind`: string
    surfaceId?: string
    description: string
    riskLevel?: "low" | "medium" | "high"
  }>

#### 8.2 touchedOutputs（执行阶段）

- `outputs`: Array<{
    outputKind`: string
    outputPath`: string
    description: string
    status`: "created" | "modified" | "deleted" | "unchanged"
  }>

#### 8.3 generatedFiles（workspace 持久化）

- `files`: Array<{
    path: string
    contentType`: "lua" | "kv" | "ts" | "ui" | "other"
    generatedAt: string (ISO)
  }>

#### 8.4 proposal（蓝图提案）

- `id`: string
- `status`: "draft" | "proposed" | "usable" | "accepted"
- `modules`: Array<{
    id: string
    role: string
    category: string
    patternIds: string[]
  }>
- `confidence`: "high" | "medium" | "low"
- `notes`: string[]
- `issues`: string[]

**说明**：evidence 层让前端能够展示"系统准备怎么做"（affectedSurfaces / proposal）和"系统实际做了什么"（touchedOutputs / generatedFiles）。

---

### 9. Errors（错误信息）

统一的错误呈现。

**字段**：

- `code`: string - 错误码
- `message`: string - 错误信息
- `details`: Record<string, unknown> | null
- `recoverable`: boolean - 是否可恢复

**说明**：错误不暴露内部堆栈，只提供前端可展示的标准化错误信息。

---

## 状态字段标准化

### 统一状态枚举

所有面向前端的 status 字段使用统一枚举：

- `featureStatus`: "draft" | "needs_clarification" | "ready" | "blocked"
- `lifecycleStage`: "intake" | "routing" | "ownership" | "planning" | "generation" | "writing" | "complete"
- `governanceStatus`: "not_required" | "awaiting_confirmation" | "released" | "blocked"
- `routingDecision`: "create" | "update" | "possible_match" | "unclear"

### 统一时间格式

所有时间字段使用 ISO 8601 格式字符串：

- `"2024-01-15T10:30:00.000Z"`

---

## 隐藏的实现细节

以下内容不直接暴露给前端：

- Wizard 内部状态（WizardResult, IntentSchema 内部结构）
- 具体的 generator routing 逻辑
- 内部的 conflict detection 算法细节
- 临时的 debug 字段
- 内部 reference ID（如 internal ID）
- 原始的 LLM prompt/response
- workspace 文件操作细节

**原则**：前端只需要知道"是什么"和"能做什么"，不需要知道"怎么实现的"。

---

## Mock 数据适配

该 contract 适用于 mock-driven 开发：

- 所有字段均为可序列化的 JSON 类型
- 不依赖运行时函数或闭包
- 枚举值覆盖所有可能状态
- 最小字段集和可选字段明确区分

---

## 使用方式

前端消费该 contract 的典型流程：

1. 调用 workbench CLI 或 API
2. 接收 WorkbenchFrontendResult 对象
3. 根据 session 判断是否为新 session
4. 根据 featureCard 判断当前 feature 状态
5. 根据 governance 判断是否被阻塞
6. 根据 evidence 展示预览或实际写入结果

前端不需要解析任何 console 文本。

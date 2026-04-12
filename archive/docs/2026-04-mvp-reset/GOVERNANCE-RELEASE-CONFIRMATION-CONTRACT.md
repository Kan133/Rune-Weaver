# Governance Release And Confirmation Contract

## 目的

本文档定义 Rune Weaver 中 GovernanceRelease 与 ConfirmationAction 的契约规范。

目标是：明确 release status 集合与转换语义、标准化 confirmation item schema、定义 confirmation action 的输入输出语义、澄清前端展示字段、为后续动作闭环提供稳定契约。

本文档不修改实际 workbench 实现，仅记录契约规范。

---

## 一、Release Contract（GovernanceRelease）

### 1.1 Release Status 集合

定义以下七种状态：

- **not_required**：不需要治理释放。触发条件为 handler 已就绪，无冲突无确认需求。
- **awaiting_confirmation**：等待确认。触发条件为已发起确认流程，等待用户响应。
- **released**：已释放。触发条件为已完成治理释放，可进入下一阶段。
- **blocked**：已阻塞。触发条件为存在阻塞项，但原因未明确归类。
- **blocked_by_conflict**：被冲突阻塞。触发条件为存在 feature 间冲突，需要用户确认。
- **blocked_pending_confirmation**：待确认阻塞。触发条件为需要用户确认某些参数或条件。
- **blocked_by_governance**：被治理阻塞。触发条件为未确定更新目标或违反治理策略。

### 1.2 Blocked Reason 表达

blockedReason 字段为 string | null 类型。

表达规则：
- 仅在 status 为阻塞类时填充
- 使用用户可理解的中文描述
- 格式：{问题类别}: {具体原因}
- 示例：存在未解决的冲突，需要确认、未确定更新目标

### 1.3 Next Allowed Transition

nextAllowedTransition 字段为 string | null 类型。

表达规则：
- 指明用户下一步可执行的动作标签
- 使用以下标准值之一：
  - requires_confirmation - 需要确认
  - ready_for_dry_run - 可进入 dry-run
  - blocked - 阻塞中，无下一步
- 仅在阻塞类 status 时填充

### 1.4 其他字段

- requiredConfirmations: RequiredConfirmationItem[] - 需要确认的项列表
- releaseHint: string - 释放提示，供前端展示
- canSelfRelease: boolean - 是否可自行释放（无需人工确认）

---

## 二、Confirmation Item Contract（RequiredConfirmationItem）

### 2.1 Item Schema

字段说明：

- **itemId**：唯一标识符，格式建议为 {类型}_{序号}，如 conflict_0、parameter_1
- **itemType**：项类型，分为三类：
  - conflict - feature 间的冲突项
  - parameter - 参数或配置需要确认
  - ownership - 所有权相关需要确认
- **description**：用户可理解的描述文本，应包含具体问题说明
- **severity**：严重程度等级：
  - high - 必须确认才能继续
  - medium - 建议确认
  - low - 提示性确认
- **currentValue**：当前值，可选字段，用于展示现有状态
- **suggestedValue**：建议值，可选字段，用于展示推荐方案

### 2.2 展示优先级

severity 字段决定前端展示顺序和强调程度。high 优先展示使用醒目样式，medium 次之使用普通样式，low 最后展示使用次要样式。

---

## 三、Confirmation Action Contract

### 3.1 输入语义

函数签名为 createConfirmationAction(governanceRelease: GovernanceRelease, confirmedItemIds: string[])。

输入说明：
- governanceRelease：当前治理释放对象，包含待确认项列表
- confirmedItemIds：用户已确认的项 ID 数组，顺序无关

### 3.2 输出语义

输出字段说明：

- **actionStatus**：确认动作状态
- **targetItemIds**：用户已确认的项 ID 列表
- **acceptedItems**：已确认项列表，包含 itemId、confirmedAt（ISO 8601 时间戳）、note（可选备注）
- **remainingItems**：剩余待确认项列表
- **transitionResult**：转换结果
- **actionHint**：动作提示，供前端展示
- **canProceed**：是否可以继续执行下一步

### 3.3 actionStatus 解释

- **not_applicable**：不适用，当前不需要确认流程
- **awaiting_items**：等待确认项，已发起但未收到任何确认
- **partially_accepted**：部分接受，部分项已确认
- **accepted**：已接受，所有项已确认或不需要确认
- **partially_confirmed**：部分确认，部分项已确认
- **fully_confirmed**：全部确认，所有项已完成确认
- **rejected**：已拒绝，用户未完成必要确认

### 3.4 transitionResult 解释

- **released_to_ready**：已释放至就绪状态，可以进入下一阶段
- **still_blocked**：仍被阻塞，存在未确认项
- **not_needed**：不需要，当前状态不需要确认流程

### 3.5 canProceed 解释

布尔值。true 表示可以继续执行下一步（写入或 dry-run），false 表示存在未完成的确认项不能继续。

判断逻辑：当 remainingItems.length === 0 时为 true，否则为 false。

---

## 四、前端展示语义

### 4.1 GovernanceRelease 展示字段

前端应展示以下字段：

1. releaseStatus - 使用 GOVERNANCE_LABELS.releaseStatus 映射为中文标签
2. blockedReason - 仅在阻塞类 status 时显示
3. requiredConfirmations - 列表展示每个确认项：
   - itemType - 使用 GOVERNANCE_LABELS.confirmationType 映射
   - description - 直接展示描述文本
   - severity - 使用 GOVERNANCE_LABELS.severity 映射，并决定样式优先级
   - currentValue / suggestedValue - 可选展示
4. nextAllowedTransition - 展示下一允许动作
5. releaseHint - 展示释放提示
6. canSelfRelease - 展示是否可以自释放

### 4.2 ConfirmationAction 展示字段

前端应展示以下字段：

1. actionStatus - 使用 CONFIRMATION_LABELS.actionStatus 映射为中文标签
2. targetItemIds - 展示用户确认的项 ID 列表
3. acceptedItems - 列表展示已确认项，包含 itemId、confirmedAt（格式化时间）、note（可选备注）
4. remainingItems - 列表展示剩余待确认项
5. transitionResult - 使用 CONFIRMATION_LABELS.transitionResult 映射
6. canProceed - 决定是否可以显示"继续"按钮
7. actionHint - 展示动作提示

### 4.3 标签映射表

**GOVERNANCE_LABELS.releaseStatus**：

- not_required → 不需要
- awaiting_confirmation → 等待确认
- released → 已释放
- blocked → 已阻塞
- blocked_by_conflict → 被冲突阻塞
- blocked_pending_confirmation → 待确认阻塞
- blocked_by_governance → 被治理阻塞

**GOVERNANCE_LABELS.confirmationType**：

- conflict → 冲突
- parameter → 参数
- ownership → 所有权

**GOVERNANCE_LABELS.severity**：

- high → 高
- medium → 中
- low → 低

**CONFIRMATION_LABELS.actionStatus**：

- not_applicable → 不适用
- awaiting_items → 等待项
- partially_accepted → 部分接受
- accepted → 已接受
- partially_confirmed → 部分确认
- fully_confirmed → 全部确认
- rejected → 已拒绝

**CONFIRMATION_LABELS.transitionResult**：

- released_to_ready → 已释放至就绪
- still_blocked → 仍被阻塞
- not_needed → 不需要

---

## 五、TypeScript 类型草案

以下为基于当前实现的类型建议，可供前端类型定义参考：

```typescript
// Release Status
export type GovernanceReleaseStatus =
  | "not_required"
  | "awaiting_confirmation"
  | "released"
  | "blocked"
  | "blocked_by_conflict"
  | "blocked_pending_confirmation"
  | "blocked_by_governance";

// Confirmation Item
export interface RequiredConfirmationItem {
  itemId: string;
  itemType: "conflict" | "parameter" | "ownership";
  description: string;
  severity: "high" | "medium" | "low";
  currentValue?: string;
  suggestedValue?: string;
}

// Governance Release
export interface GovernanceRelease {
  status: GovernanceReleaseStatus;
  blockedReason?: string | null;
  requiredConfirmations: RequiredConfirmationItem[];
  nextAllowedTransition?: string | null;
  releaseHint: string;
  canSelfRelease: boolean;
}

// Confirmation Action Status
export type ConfirmationActionStatus =
  | "not_applicable"
  | "awaiting_items"
  | "partially_accepted"
  | "accepted"
  | "partially_confirmed"
  | "fully_confirmed"
  | "rejected";

// Confirmed Item
export interface ConfirmedItem {
  itemId: string;
  confirmedAt: string;
  note?: string;
}

// Transition Result
export type TransitionResult =
  | "released_to_ready"
  | "still_blocked"
  | "not_needed";

// Confirmation Action
export interface ConfirmationAction {
  actionStatus: ConfirmationActionStatus;
  targetItemIds: string[];
  acceptedItems: ConfirmedItem[];
  remainingItems: RequiredConfirmationItem[];
  transitionResult: TransitionResult;
  actionHint: string;
  canProceed: boolean;
}
```

---

## 六、契约稳定性保障

### 6.1 不允许的变更

以下行为会破坏契约稳定性：随意添加新的 status 值而不更新文档、修改现有 status 的语义、更改字段名称或类型、修改标签映射表而不同步更新文档。

### 6.2 允许的扩展

- 在 GovernanceReleaseStatus 中添加新的阻塞类型（需同步更新本文档）
- 在 RequiredConfirmationItem 中添加新的 itemType（需同步更新标签映射）
- 在 ConfirmationActionStatus 中添加新的状态（需同步更新标签映射）

### 6.3 版本管理

本契约采用语义化版本。主版本号变更表示不兼容的字段修改，次版本号变更表示向后兼容的新增，补丁版本号变更表示文档修正。

当前版本：1.0.0

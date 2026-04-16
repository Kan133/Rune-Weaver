# Blueprint Pattern Resolution

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-15
> Read when: understanding Blueprint-to-pattern resolution behavior
> Do not use for: current product status, current module-need seam authority, or final pattern selection by itself

## 目的

定义从 `Blueprint` 到 `SelectedPattern[]` 的解析规则，建立编排设计到 Pattern 选型的最小链路。

## 输入

### 1. Blueprint.modules
模块列表，每个模块包含：
- `category`: trigger | data | rule | effect | ui | resource | integration
- `role`: 职责描述
- `inputs/outputs`: 输入输出接口

### 2. Blueprint.patternHints
Pattern 建议列表，包含：
- `category`: pattern 类别
- `suggestedPatterns`: 建议的 pattern ID 列表
- `rationale`: 选择理由

### 3. Blueprint.sourceIntent.normalizedMechanics
归一化机制标记：
- `trigger`: 需要输入触发
- `candidatePool`: 需要候选项池
- `weightedSelection`: 需要加权随机
- `playerChoice`: 需要玩家选择
- `uiModal`: 需要模态界面
- `outcomeApplication`: 需要结果应用
- `resourceConsumption`: 需要资源消耗

## 解析策略

### 策略 1: 直接匹配（优先级最高）
如果 `patternHints` 提供了 `suggestedPatterns`，直接使用。

### 策略 2: 类别映射（备用）
基于 `module.category` 映射到通用 pattern：

| category | 默认 pattern |
|----------|-------------|
| trigger | input.key_binding |
| data | data.weighted_pool |
| rule | rule.selection_flow |
| effect | effect.dash |
| resource | resource.basic_pool |
| ui | ui.selection_modal |
| integration | unresolved by default; if the normalized need is specifically narrow selection-state sync, bias toward `integration.state_sync_bridge` and still verify host binding / bridge policy |

### 策略 3: 机制推断（补充）
基于 `normalizedMechanics` 补充 pattern：

| mechanic | 推断 pattern |
|----------|-------------|
| trigger | input.key_binding |
| candidatePool | data.weighted_pool |
| weightedSelection | data.weighted_pool |
| playerChoice | rule.selection_flow |
| uiModal | ui.selection_modal |
| outcomeApplication | effect.modifier_applier |
| resourceConsumption | effect.resource_consume |

## 当前 narrow truth 注记

- `resourceConsumption -> effect.resource_consume` does not mean broad admitted `resource/cost` support by itself
- 当前 honest canonical path 仍然是窄路径：
  - same-feature
  - single `input.key_binding`
  - single compatible `resource.basic_pool`
  - single `effect.resource_consume`
- `integration` 也不是一律 unresolved:
  - 对于 narrow selection-state sync，`integration.state_sync_bridge` 已经是 honest current mapping candidate
  - 但它当前 truthful downstream state 仍然只是 routed + deliberately elided + no standalone bridge file emitted
- 以上两条都不能被写成 broad family admission

## 输出

```typescript
interface SelectedPattern {
  patternId: string;
  role: string;
  parameters?: Record<string, unknown>;
  priority: "required" | "preferred" | "fallback";
  source: "hint" | "category" | "mechanic";
}
```

## 冲突解决

1. **重复 Pattern**: 相同 `patternId` 合并，保留最高优先级
2. **参数冲突**: 保留第一个，记录警告
3. **缺失绑定**: 标记为 `fallback`，提示需要人工确认

## 限制

- 不新增领域专用 Pattern（如 talent-only, card-only）
- 优先使用通用 mechanic patterns
- 本轮不做复杂参数推断（如具体数值）

# Talent Draw Case - Workstream A: IntentSchema Audit

**Document Version**: 1.0  
**Date**: 2026-04-12  
**Status**: Canonical Audit Report  

---

## 1. Scope

本文档是对 Talent Draw frozen case 的 IntentSchema 表达能力审计。

### 1.1 审计目标

- 基于 frozen case 手写一份 canonical IntentSchema
- 评估当前 IntentSchema 是否足以完整表达这个 case
- 列出 schema gap，而不是偷偷脑补

### 1.2 审计边界

| 在范围内 | 不在范围内 |
|---------|-----------|
| IntentSchema 结构表达能力 | Blueprint 层设计 |
| NormalizedMechanics 词汇覆盖 | Pattern 选择/映射 |
| 需求澄清能力 | Generator 实现 |
| 约束表达机制 | Host 实现细节 |

### 1.3 参考文档

- [CANONICAL-CASE-TALENT-DRAW.md](./CANONICAL-CASE-TALENT-DRAW.md) - 唯一 case truth
- [WIZARD-INTENT-CONTRACT.md](../WIZARD-INTENT-CONTRACT.md) - Intent 契约
- [SCHEMA.md](../SCHEMA.md) - Schema 定义
- [core/schema/types.ts](../../core/schema/types.ts) - 类型实现

---

## 2. Canonical IntentSchema Draft

基于 frozen case，手写的 canonical IntentSchema 如下：

```json
{
  "version": "1.0",
  "host": {
    "kind": "dota2-x-template",
    "projectRoot": "<project-root>"
  },
  "request": {
    "rawPrompt": "实现一个天赋抽取系统：按F4打开天赋选择界面，从天赋池中随机抽取3个天赋供玩家选择，玩家选择一个后应用效果并永久移除，未选中的返回池中。天赋有稀有度（R/SR/SSR/UR），稀有度影响抽取权重和视觉效果。",
    "goal": "实现一个完整的天赋抽取系统，包含触发、加权抽取、玩家选择、效果应用和池管理",
    "nameHint": "talent_draw"
  },
  "classification": {
    "intentKind": "standalone-system",
    "confidence": "high"
  },
  "requirements": {
    "functional": [
      "F4按键触发天赋选择界面",
      "从天赋池中按稀有度权重随机抽取3个候选天赋",
      "玩家从3个候选中选择1个",
      "选中的天赋立即应用其效果",
      "选中的天赋永久从池中移除",
      "未选中的天赋返回池中供后续抽取",
      "天赋池不足3个时显示占位符"
    ],
    "interactions": [
      "按键触发 → UI显示",
      "UI显示 → 玩家选择",
      "玩家选择 → 效果应用",
      "玩家选择 → 池状态更新"
    ],
    "dataNeeds": [
      "天赋定义数据（ID、名称、稀有度、效果）",
      "剩余可用天赋池状态",
      "已选择天赋记录",
      "当前抽取的候选列表"
    ],
    "outputs": [
      "天赋选择UI",
      "选中天赋的效果应用",
      "池状态更新"
    ]
  },
  "constraints": {
    "requiredPatterns": [],
    "forbiddenPatterns": [],
    "hostConstraints": [
      "Dota2 X-Template 宿主"
    ],
    "nonFunctional": [
      "MVP版本：始终可用，无需高级动画",
      "稀有度视觉区分：背景色（绿/蓝/紫/红）"
    ]
  },
  "uiRequirements": {
    "needed": true,
    "surfaces": [
      "modal - 天赋选择界面"
    ],
    "feedbackNeeds": [
      "稀有度视觉区分",
      "天赋信息展示（ID、名称、效果描述）",
      "池不足时的空槽占位符"
    ]
  },
  "normalizedMechanics": {
    "trigger": true,
    "candidatePool": true,
    "weightedSelection": true,
    "playerChoice": true,
    "uiModal": true,
    "outcomeApplication": true,
    "resourceConsumption": true
  },
  "openQuestions": [
    "权重抽取的精确语义：是按权重直接抽取天赋，还是先按权重选稀有度再从该稀有度中随机选？",
    "状态持久化范围：单局游戏内持久还是跨游戏会话持久？",
    "UI交互模式：点击卡牌即选择，还是需要确认按钮？"
  ],
  "resolvedAssumptions": [
    "假设效果应用到玩家英雄",
    "假设单局游戏内持久化（MVP范围）",
    "假设点击卡牌即选择（简化交互）"
  ],
  "isReadyForBlueprint": true
}
```

---

## 3. Expressiveness Audit

### 3.1 机制表达评估矩阵

| Talent Draw 机制 | IntentSchema 表达方式 | 表达能力 | 备注 |
|-----------------|---------------------|---------|------|
| **F4 触发** | `normalizedMechanics.trigger = true` | ✅ 自然表达 | 配合 `requirements.functional` 描述按键 |
| **三选一 UI** | `normalizedMechanics.uiModal = true` + `playerChoice = true` | ⚠️ 部分表达 | 无法表达"恰好3个槽位"的数量约束 |
| **稀有度** | `requirements.dataNeeds` 字符串描述 | ⚠️ 勉强表达 | 无结构化的稀有度系统表达 |
| **权重抽取** | `normalizedMechanics.weightedSelection = true` | ✅ 自然表达 | 类型已支持此标记 |
| **持久化天赋池** | `normalizedMechanics.candidatePool = true` | ⚠️ 部分表达 | 无法表达池的持久化语义 |
| **已选中永久移除** | `normalizedMechanics.resourceConsumption = true` | ⚠️ 部分表达 | 无法表达"永久移除"vs"临时消耗"的区别 |
| **未选中回池** | 无直接表达位 | ❌ 无法表达 | 需要在 `functional` 中文字描述 |
| **少于三个时空位 placeholder** | 无直接表达位 | ❌ 无法表达 | 边界情况处理无 schema 位 |
| **当前占位符效果** | 无直接表达位 | ❌ 无法表达 | 效果定义无结构化表达 |
| **未来可扩展天赋池** | 无直接表达位 | ❌ 无法表达 | 扩展性声明无 schema 位 |

### 3.2 详细分析

#### 3.2.1 能自然表达的机制

**触发器 (trigger)**
- `normalizedMechanics.trigger = true` 直接标记
- `requirements.functional` 可补充具体按键信息
- **结论**: 完全满足

**加权抽取 (weightedSelection)**
- `normalizedMechanics.weightedSelection = true` 直接标记
- 类型定义已支持（[types.ts:75](../../core/schema/types.ts#L75)）
- **结论**: 完全满足

**玩家选择 (playerChoice)**
- `normalizedMechanics.playerChoice = true` 直接标记
- 配合 `uiModal` 表达选择交互
- **结论**: 完全满足

**结果应用 (outcomeApplication)**
- `normalizedMechanics.outcomeApplication = true` 直接标记
- **结论**: 完全满足

#### 3.2.2 只能勉强表达的机制

**三选一 UI**
- `uiModal` + `playerChoice` 可表达"有选择UI"
- 但无法表达"恰好3个槽位"的数量约束
- 需要在 `functional` 字符串中补充
- **Gap**: 缺少 `slotCount` 或类似的数量表达

**稀有度系统**
- 只能在 `dataNeeds` 中字符串描述："天赋定义数据（ID、名称、稀有度、效果）"
- 无法表达稀有度与权重、视觉效果、效果的关联
- **Gap**: 缺少结构化的稀有度系统表达

**持久化天赋池**
- `candidatePool` 标记存在，但无法区分"持久化池"vs"临时池"
- 无法表达池的生命周期语义
- **Gap**: 缺少池持久化语义表达

**永久移除 vs 临时消耗**
- `resourceConsumption` 标记存在，但无法区分移除类型
- 无法表达"选中永久移除"vs"未选中返回池"的不同行为
- **Gap**: 缺少资源消耗类型区分

#### 3.2.3 当前根本没有表达位的机制

**未选中回池规则**
- 这是池管理的核心规则，但 IntentSchema 无表达位
- 只能在 `functional` 字符串中描述
- **Gap**: 缺少 `poolManagement` 或 `returnToPool` 机制标记

**边界情况处理（池不足时空位）**
- "少于三个时空位 placeholder" 是重要的边界情况
- IntentSchema 无结构化表达位
- **Gap**: 缺少 `fallbackBehavior` 或边界情况表达

**占位符效果定义**
- 稀有度与占位符效果的映射（R→力量+10, SR→敏捷+10...）
- IntentSchema 无法结构化表达效果定义
- **Gap**: 缺少效果定义结构

**未来可扩展性声明**
- "未来可扩展天赋池" 是产品级约束
- IntentSchema 无扩展性声明位
- **Gap**: 缺少 `extensibility` 或扩展点声明

---

## 4. Clear Gaps

### 4.1 Gap 汇总表

| Gap ID | 缺失能力 | 影响范围 | 严重程度 |
|--------|---------|---------|---------|
| G1 | 槽位数量约束 | UI 需求表达 | 中 |
| G2 | 稀有度系统结构 | 数据模型表达 | 高 |
| G3 | 池持久化语义 | 状态管理表达 | 中 |
| G4 | 资源消耗类型区分 | 池管理规则表达 | 高 |
| G5 | 未选中回池规则 | 核心机制表达 | 高 |
| G6 | 边界情况处理 | 完整性表达 | 中 |
| G7 | 效果定义结构 | 数据模型表达 | 中 |
| G8 | 扩展性声明 | 产品约束表达 | 低 |

### 4.2 Gap 详细说明

#### G1: 槽位数量约束

**问题**: 无法表达"恰好3个槽位"的数量约束

**当前变通**: 在 `functional` 字符串中描述

**影响**: Blueprint 层无法从 schema 直接获知槽位数量，需要解析字符串

#### G2: 稀有度系统结构

**问题**: 无法结构化表达稀有度与权重、视觉效果、效果的关联

**当前变通**: 在 `dataNeeds` 中字符串描述

**影响**: 
- 无法自动验证稀有度配置完整性
- Blueprint 层需要额外解析

#### G3: 池持久化语义

**问题**: 无法区分"持久化池"vs"临时池"

**当前变通**: 在 `functional` 中文字描述

**影响**: 无法表达池的生命周期语义

#### G4: 资源消耗类型区分

**问题**: `resourceConsumption` 无法区分"永久移除"vs"临时消耗"

**当前变通**: 在 `functional` 中描述

**影响**: 核心机制"选中永久移除"无法精确表达

#### G5: 未选中回池规则

**问题**: 无表达位描述"未选中返回池"的行为

**当前变通**: 在 `functional` 中描述

**影响**: 这是 Talent Draw 的核心规则，但 IntentSchema 无法标记

#### G6: 边界情况处理

**问题**: 无法表达"池不足时空位 placeholder"的边界情况

**当前变通**: 在 `functional` 中描述

**影响**: 边界情况可能被遗漏

#### G7: 效果定义结构

**问题**: 无法结构化定义天赋效果

**当前变通**: 在 `dataNeeds` 中字符串描述

**影响**: 效果配置无法自动验证

#### G8: 扩展性声明

**问题**: 无法声明"未来可扩展天赋池"的产品约束

**当前变通**: 无

**影响**: 产品级约束无法在 schema 层追踪

---

## 5. Minimal Schema Extensions

### 5.1 扩展优先级

| 优先级 | Gap ID | 扩展建议 | 复杂度 |
|-------|--------|---------|--------|
| P0 | G5 | 添加 `poolManagement` 机制标记 | 低 |
| P0 | G4 | 扩展 `resourceConsumption` 为枚举类型 | 中 |
| P1 | G1 | 添加 `slotCount` 参数 | 低 |
| P1 | G6 | 添加 `fallbackBehavior` 标记 | 低 |
| P2 | G2 | 添加 `raritySystem` 结构 | 高 |
| P2 | G7 | 添加效果定义扩展点 | 高 |
| P3 | G3 | 添加池持久化语义 | 中 |
| P3 | G8 | 添加扩展性声明字段 | 低 |

### 5.2 最小扩展方案

#### 5.2.1 P0: 核心机制扩展

**扩展 NormalizedMechanics**:

```typescript
export interface NormalizedMechanics {
  trigger?: boolean;
  candidatePool?: boolean;
  weightedSelection?: boolean;
  playerChoice?: boolean;
  uiModal?: boolean;
  outcomeApplication?: boolean;
  resourceConsumption?: boolean;
  
  // P0 新增
  poolManagement?: boolean;  // 池管理规则（选中移除、未选中返回）
}
```

**扩展 resourceConsumption 语义**:

```typescript
// 方案A: 保持布尔值，通过 functional 描述类型
// 方案B: 扩展为枚举（破坏性变更）
resourceConsumptionType?: "temporary" | "permanent" | "conditional";
```

**推荐**: 方案A，保持向后兼容

#### 5.2.2 P1: 参数化扩展

**添加 slotCount 到 UIRequirementSummary**:

```typescript
export interface UIRequirementSummary {
  needed: boolean;
  surfaces?: string[];
  feedbackNeeds?: string[];
  
  // P1 新增
  slotCount?: number;  // 选择槽位数量
}
```

**添加 fallbackBehavior 标记**:

```typescript
export interface NormalizedMechanics {
  // ... 现有字段
  
  // P1 新增
  fallbackBehavior?: boolean;  // 边界情况处理
}
```

#### 5.2.3 P2: 结构化扩展（可选）

**添加 raritySystem 到 requirements**:

```typescript
export interface IntentRequirements {
  functional: string[];
  interactions?: string[];
  dataNeeds?: string[];
  outputs?: string[];
  
  // P2 新增（可选）
  raritySystem?: {
    tiers: string[];           // ["R", "SR", "SSR", "UR"]
    weightMapping?: Record<string, number>;  // {"R": 40, "SR": 30, ...}
    visualMapping?: Record<string, string>;  // {"R": "green", ...}
  };
}
```

### 5.3 扩展影响评估

| 扩展 | 破坏性 | 实现成本 | 下游影响 |
|-----|-------|---------|---------|
| poolManagement 标记 | 无 | 低 | BlueprintBuilder 需识别 |
| resourceConsumptionType | 无（可选字段） | 中 | PatternResolver 需处理 |
| slotCount | 无（可选字段） | 低 | UIBuilder 需读取 |
| fallbackBehavior 标记 | 无 | 低 | BlueprintBuilder 需识别 |
| raritySystem 结构 | 无（可选字段） | 高 | 多层需要处理 |

---

## 6. Final Verdict

### 6.1 裁决结论

> **IntentSchema is not yet sufficient for this case**

### 6.2 裁决依据

#### 关键缺失

1. **G5: 未选中回池规则** - 这是 Talent Draw 的核心机制，IntentSchema 无表达位
2. **G4: 资源消耗类型区分** - "选中永久移除"vs"未选中返回池"无法区分

#### 次要缺失

3. **G1: 槽位数量约束** - 无法表达"恰好3个槽位"
4. **G6: 边界情况处理** - 无法表达池不足时的行为

#### 可接受变通

5. **G2: 稀有度系统** - 可通过 `dataNeeds` 字符串描述
6. **G3: 池持久化语义** - 可通过 `functional` 描述
7. **G7: 效果定义** - 可通过 `dataNeeds` 描述
8. **G8: 扩展性声明** - 可在 `constraints.nonFunctional` 中描述

### 6.3 最小可行扩展

要使 IntentSchema 足以表达 Talent Draw case，需要：

1. **必须**: 添加 `poolManagement` 机制标记
2. **必须**: 扩展 `resourceConsumption` 语义或添加消耗类型字段
3. **建议**: 添加 `slotCount` 参数
4. **建议**: 添加 `fallbackBehavior` 标记

### 6.4 当前状态总结

| 维度 | 状态 |
|-----|------|
| 核心触发机制 | ✅ 足够 |
| 加权抽取机制 | ✅ 足够 |
| 玩家选择机制 | ✅ 足够 |
| 结果应用机制 | ✅ 足够 |
| 池管理规则 | ❌ 不足 |
| 数量约束 | ⚠️ 勉强 |
| 边界情况 | ❌ 不足 |
| 稀有度系统 | ⚠️ 勉强 |

---

## Appendix A: NormalizedMechanics 当前定义

来源: [core/schema/types.ts:72-80](../../core/schema/types.ts#L72-L80)

```typescript
export interface NormalizedMechanics {
  trigger?: boolean;
  candidatePool?: boolean;
  weightedSelection?: boolean;
  playerChoice?: boolean;
  uiModal?: boolean;
  outcomeApplication?: boolean;
  resourceConsumption?: boolean;
}
```

## Appendix B: Talent Draw 机制完整清单

来源: [CANONICAL-CASE-TALENT-DRAW.md](./CANONICAL-CASE-TALENT-DRAW.md)

| 机制 | 描述 |
|-----|------|
| 触发器 | F4 按键触发 |
| 抽取规则 | 每次抽取恰好3个槽位，候选天赋必须唯一 |
| 选择规则 | 玩家只能选择1个，选中立即应用效果 |
| 永久移除 | 选中的天赋永久从池中移除 |
| 返回池中 | 未选中的天赋返回池中 |
| 池不足规则 | 剩余<3时显示所有+占位符 |
| 稀有度模型 | R(40)/SR(30)/SSR(20)/UR(10) 权重 |
| 天赋池数据 | 每稀有度10个，共40个唯一天赋 |
| UI需求 | 3个卡牌槽位，稀有度视觉区分 |
| 状态追踪 | 剩余池、已选择、当前候选 |

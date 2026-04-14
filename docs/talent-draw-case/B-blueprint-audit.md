# Talent Draw Case - Workstream B: Canonical Blueprint Audit

## 1. Scope

本文档是 Talent Draw Case 的 Workstream B 审计报告。

### 1.1 审计目标

评估 Rune Weaver 的 Blueprint 层是否足以承接 Talent Draw Case。

### 1.2 审计边界

| 边界 | 说明 |
|------|------|
| **在范围内** | Blueprint 结构能力、Pattern Hint 机制、模块类别体系、连接语义、验证流程 |
| **不在范围内** | Generator 实现、Host Realization 细节、最终代码产物、运行时行为 |

### 1.3 权威输入

- **Case Truth**: [CANONICAL-CASE-TALENT-DRAW.md](./CANONICAL-CASE-TALENT-DRAW.md)
- **Blueprint 契约**: [BLUEPRINT-ORCHESTRATION-CONTRACT.md](../BLUEPRINT-ORCHESTRATION-CONTRACT.md)
- **验证规范**: [BLUEPRINT-VALIDATION.md](../BLUEPRINT-VALIDATION.md)
- **Pattern 解析**: [BLUEPRINT-PATTERN-RESOLUTION.md](../BLUEPRINT-PATTERN-RESOLUTION.md)
- **复合基线**: [COMPOSITE-BLUEPRINT-BASELINE.md](../COMPOSITE-BLUEPRINT-BASELINE.md)

### 1.4 审计原则

1. `/D:/Rune Weaver/docs/talent-draw-case/CANONICAL-CASE-TALENT-DRAW.md` 是唯一 case truth
2. 不允许改 case 规则来迎合 Blueprint
3. 不允许把"后面代码能手补"当成 Blueprint 已足够
4. 不允许把 generator 缺口伪装成 Blueprint 缺口，反之亦然

---

## 2. Canonical Blueprint Draft

基于 frozen case 手写的 canonical Blueprint：

```json
{
  "id": "talent_draw_system_v1",
  "version": "1.0.0",
  "summary": {
    "name": "Talent Draw System",
    "description": "Player presses F4 to open a three-choice talent selection UI. System draws 3 unique candidates from remaining pool by rarity weight. Player selects 1 talent which applies immediately and is permanently removed. Unselected talents return to pool.",
    "sourceIntentKind": "standalone_system",
    "confidence": 1.0
  },
  "host": {
    "kind": "dota2-x-template",
    "target": "dota2"
  },
  "modules": [
    {
      "id": "mod_trigger_f4",
      "role": "Capture F4 key input and emit draw request event",
      "category": "trigger",
      "responsibilities": [
        "Register F4 key binding",
        "Emit draw request event on keypress",
        "Normalize input for downstream consumption"
      ],
      "patternHints": ["input.key_binding"],
      "parameters": {
        "key": "F4",
        "triggerMode": "keypress",
        "eventName": "talent_draw_request"
      }
    },
    {
      "id": "mod_pool_talents",
      "role": "Manage talent pool state and provide weighted draw capability",
      "category": "data",
      "responsibilities": [
        "Hold all talent definitions (40 talents: R/SR/SSR/UR)",
        "Track remaining eligible talent IDs",
        "Track selected/owned talent IDs",
        "Perform weighted random draw by rarity",
        "Ensure no duplicate candidates in single draw",
        "Return unselected talents to pool"
      ],
      "patternHints": ["data.weighted_pool"],
      "parameters": {
        "entries": "talent_definitions",
        "weights": {
          "R": 40,
          "SR": 30,
          "SSR": 20,
          "UR": 10
        },
        "tiers": ["R", "SR", "SSR", "UR"],
        "choiceCount": 3,
        "drawMode": "multiple_without_replacement",
        "duplicatePolicy": "forbid"
      }
    },
    {
      "id": "mod_flow_selection",
      "role": "Orchestrate draw-display-select-apply lifecycle",
      "category": "rule",
      "responsibilities": [
        "Receive draw request from trigger",
        "Request candidates from pool",
        "Pass candidates to UI for display",
        "Receive player selection from UI",
        "Apply selected talent effect",
        "Remove selected talent from pool permanently",
        "Return unselected talents to pool",
        "Handle pool exhaustion (< 3 remaining)"
      ],
      "patternHints": ["rule.selection_flow"],
      "parameters": {
        "choiceCount": 3,
        "selectionPolicy": "single",
        "applyMode": "immediate",
        "removalPolicy": "permanent_for_selected",
        "returnPolicy": "return_unselected"
      }
    },
    {
      "id": "mod_ui_selection",
      "role": "Display three-choice talent selection modal",
      "category": "ui",
      "responsibilities": [
        "Render 3 card slots with rarity-based visual distinction",
        "Display talent ID, name, and placeholder effect",
        "Show empty slot placeholders when pool < 3",
        "Capture player selection",
        "Emit selection result event"
      ],
      "patternHints": ["ui.selection_modal"],
      "parameters": {
        "choiceCount": 3,
        "layoutPreset": "card_tray",
        "selectionMode": "single",
        "dismissBehavior": "selection_only",
        "payloadShape": "card_with_rarity"
      }
    },
    {
      "id": "mod_effect_apply",
      "role": "Apply selected talent effect to player",
      "category": "effect",
      "responsibilities": [
        "Receive selected talent payload",
        "Apply stat modifier based on rarity",
        "R: Strength +10",
        "SR: Agility +10",
        "SSR: Intelligence +10",
        "UR: All Attributes +10"
      ],
      "patternHints": ["effect.modifier_applier"],
      "parameters": {
        "targetScope": "local_player_hero",
        "modifierSource": "rarity_based",
        "modifiers": {
          "R": { "attribute": "strength", "value": 10 },
          "SR": { "attribute": "agility", "value": 10 },
          "SSR": { "attribute": "intelligence", "value": 10 },
          "UR": { "attribute": "all", "value": 10 }
        }
      }
    },
    {
      "id": "mod_state_tracking",
      "role": "Track and persist talent selection state",
      "category": "resource",
      "responsibilities": [
        "Maintain selected_talents list",
        "Maintain remaining_pool list",
        "Sync state across server/client",
        "Persist state for session lifetime"
      ],
      "patternHints": ["resource.basic_pool"],
      "parameters": {
        "resourceId": "talent_state",
        "persistMode": "session",
        "syncMode": "server_to_client"
      }
    }
  ],
  "connections": [
    {
      "id": "conn_trigger_to_flow",
      "from": "mod_trigger_f4",
      "to": "mod_flow_selection",
      "type": "event",
      "purpose": "Forward draw request event to selection flow"
    },
    {
      "id": "conn_pool_to_flow",
      "from": "mod_pool_talents",
      "to": "mod_flow_selection",
      "type": "data",
      "purpose": "Provide weighted draw capability and pool state"
    },
    {
      "id": "conn_flow_to_ui",
      "from": "mod_flow_selection",
      "to": "mod_ui_selection",
      "type": "visual",
      "purpose": "Pass candidates to UI for display"
    },
    {
      "id": "conn_ui_to_flow",
      "from": "mod_ui_selection",
      "to": "mod_flow_selection",
      "type": "event",
      "purpose": "Return player selection to flow"
    },
    {
      "id": "conn_flow_to_effect",
      "from": "mod_flow_selection",
      "to": "mod_effect_apply",
      "type": "control",
      "purpose": "Trigger effect application for selected talent"
    },
    {
      "id": "conn_flow_to_pool",
      "from": "mod_flow_selection",
      "to": "mod_pool_talents",
      "type": "state",
      "purpose": "Update pool state (remove selected, return unselected)"
    },
    {
      "id": "conn_effect_to_state",
      "from": "mod_effect_apply",
      "to": "mod_state_tracking",
      "type": "state",
      "purpose": "Record applied talent in state"
    },
    {
      "id": "conn_pool_to_state",
      "from": "mod_pool_talents",
      "to": "mod_state_tracking",
      "type": "state",
      "purpose": "Sync pool state to tracking"
    }
  ],
  "uiPlan": {
    "requiredSurfaces": [
      {
        "id": "talent_selection_modal",
        "kind": "selection_modal",
        "required": true,
        "requiresDesignSpec": true,
        "designSpecRef": "talent-draw-ui-spec"
      }
    ]
  },
  "validationContracts": [
    {
      "id": "vc_unique_draw",
      "rule": "All candidates in single draw must be unique",
      "severity": "error"
    },
    {
      "id": "vc_pool_exhaustion",
      "rule": "When remaining < 3, show all remaining with empty placeholders",
      "severity": "error"
    },
    {
      "id": "vc_permanent_removal",
      "rule": "Selected talent must never appear in future draws",
      "severity": "error"
    },
    {
      "id": "vc_return_unselected",
      "rule": "Unselected talents must return to pool",
      "severity": "error"
    }
  ],
  "uncertainties": [],
  "blockers": []
}
```

---

## 3. System Decomposition

### 3.1 必需模块/子系统分析

基于 frozen case 的系统分解：

| 子系统 | Case 需求 | Blueprint 模块 | 类别 |
|--------|----------|----------------|------|
| **输入触发** | F4 键触发抽取 | `mod_trigger_f4` | trigger |
| **抽取池状态** | 40 天赋池、稀有度权重、剩余/已选追踪 | `mod_pool_talents` | data |
| **权重抽取逻辑** | 稀有度加权、不重复、恰好 3 个 | `mod_pool_talents` + `mod_flow_selection` | data + rule |
| **UI 展示** | 三选一界面、稀有度视觉、空槽占位 | `mod_ui_selection` | ui |
| **选择确认** | 玩家选 1 个、返回选择结果 | `mod_ui_selection` + `mod_flow_selection` | ui + rule |
| **效果应用** | 选中天赋立即生效 | `mod_effect_apply` | effect |
| **已选天赋记录** | 永久移除、状态持久化 | `mod_state_tracking` + `mod_pool_talents` | resource + data |

### 3.2 数据流分解

```
[F4 Keypress]
     ↓ event
[Selection Flow] ←→ data → [Talent Pool]
     ↓ visual          ↑ state
[UI Modal] ──────→ event (selection)
     ↓
[Selection Flow] ──→ control → [Effect Applier]
     ↓ state                    ↓ state
[Talent Pool] (update)    [State Tracking]
```

### 3.3 状态需求分解

| 状态类型 | 内容 | 生命周期 | Blueprint 表达位置 |
|----------|------|----------|-------------------|
| **天赋定义** | 40 个天赋 ID、稀有度、名称、效果 | 静态配置 | `mod_pool_talents.parameters.entries` |
| **剩余池** | 当前有资格抽取的天赋 ID 列表 | 动态、递减 | `mod_pool_talents` outputs `pool_state` |
| **已选集合** | 已选择并应用的天赋 ID 列表 | 动态、递增 | `mod_state_tracking` |
| **当前候选** | 本轮抽取的 3 个候选 | 瞬态、单轮 | `mod_flow_selection` ↔ `mod_ui_selection` |
| **UI 状态** | Modal 开/关、选中状态 | 瞬态 | `mod_ui_selection` outputs `modal_state` |

---

## 4. Blueprint Adequacy Audit

### 4.1 模块类别体系审计

| 类别 | Case 需求 | Blueprint 支持 | 评估 |
|------|----------|----------------|------|
| `trigger` | F4 键触发 | ✅ 类别存在，稳定映射到 `input.key_binding` | **充足** |
| `data` | 天赋池、权重抽取 | ✅ 类别存在，稳定映射到 `data.weighted_pool` | **部分充足** |
| `rule` | 抽取-展示-选择-应用流程 | ✅ 类别存在，稳定映射到 `rule.selection_flow` | **结构充足** |
| `ui` | 三选一 Modal | ✅ 类别存在，稳定映射到 `ui.selection_modal` | **充足** |
| `effect` | 天赋效果应用 | ⚠️ 类别存在，但多态类别需语义消歧 | **需评估** |
| `resource` | 状态追踪 | ⚠️ 类别存在，但多态类别需语义消歧 | **需评估** |

### 4.2 Pattern Hint 机制审计

| 检查项 | 状态 | 说明 |
|--------|------|------|
| Pattern Hint 来源限制 | ✅ | 仅从 catalog 提取，禁止发明 |
| Pattern Hint 可审查性 | ✅ | 显式声明在 `patternHints[]` |
| 交集语义 | ✅ | `finalPatterns = patternIds[] ∩ resolvedPatterns` |

### 4.3 连接语义审计

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 连接类型支持 | ✅ | `data`, `event`, `control`, `state`, `visual` 均支持 |
| 模块引用验证 | ✅ | `from/to` 必须指向存在的模块 |
| 循环依赖检测 | ✅ | Warning 级别检测 |

### 4.4 验证流程审计

| 验证阶段 | 支持状态 | Case 相关检查 |
|----------|----------|---------------|
| 结构验证 | ✅ | ID 唯一性、模块存在性、连接合法性 |
| 语义验证 | ✅ | 孤立模块检测、循环依赖检测、模块链完整性 |
| 统计检查 | ✅ | 模块数量、依赖深度、连接密度 |

### 4.5 UI Plan 审计

| 检查项 | 状态 | 说明 |
|--------|------|------|
| UI Surface 定义 | ✅ | `requiredSurfaces[]` 支持 |
| Design Spec 引用 | ✅ | `designSpecRef` 支持 |
| UI-模块一致性 | ✅ | 验证器检查 UI 模块与 uiPlan 对应 |

### 4.6 关键能力评估

#### 4.6.1 池状态与剩余集合

| 需求 | Blueprint 表达能力 | 评估 |
|------|-------------------|------|
| 初始池定义 | `parameters.entries`, `parameters.weights`, `parameters.tiers` | ✅ 充足 |
| 剩余池追踪 | `outputs.pool_state` | ✅ 结构支持 |
| 动态池更新 | 连接 `type: state` 到 pool 模块 | ⚠️ 语义需明确 |

**问题**: `data.weighted_pool` 的 `pool_state` output 定义为 "Optional current pool state if the implementation tracks mutation"，但 Case 要求**必须**追踪池状态变化（已选移除、未选返回）。Blueprint 层可以表达这个需求，但 Pattern 层需要明确支持。

#### 4.6.2 稀有度和权重

| 需求 | Blueprint 表达能力 | 评估 |
|------|-------------------|------|
| 稀有度定义 | `parameters.tiers` | ✅ 充足 |
| 权重映射 | `parameters.weights` | ✅ 充足 |
| 稀有度-权重关联 | 对象结构 `{"R": 40, "SR": 30, ...}` | ✅ 充足 |

#### 4.6.3 抽取生命周期

| 需求 | Blueprint 表达能力 | 评估 |
|------|-------------------|------|
| 触发 → 抽取 | 连接 `trigger → rule` | ✅ 充足 |
| 抽取 → 展示 | 连接 `rule → ui` | ✅ 充足 |
| 展示 → 选择 | 连接 `ui → rule` (双向) | ✅ 充足 |
| 选择 → 应用 | 连接 `rule → effect` | ✅ 充足 |
| 应用 → 池更新 | 连接 `rule → data` (state) | ⚠️ 语义需明确 |

**问题**: "选择后更新池状态"的生命周期在 Blueprint 连接中可以表达，但 `rule.selection_flow` Pattern 需要明确定义其与 `data.weighted_pool` 的交互语义。

#### 4.6.4 UI 三选一交互

| 需求 | Blueprint 表达能力 | 评估 |
|------|-------------------|------|
| 候选数量 | `parameters.choiceCount: 3` | ✅ 充足 |
| 单选模式 | `parameters.selectionMode: single` | ✅ 充足 |
| 候选输入 | `inputs.candidates` | ✅ 充足 |
| 选择输出 | `outputs.selected_payload` | ✅ 充足 |

#### 4.6.5 占位符空槽

| 需求 | Blueprint 表达能力 | 评估 |
|------|-------------------|------|
| 条件渲染逻辑 | ❌ 无直接表达 | **缺口** |
| 空槽占位符 | ❌ 无直接表达 | **缺口** |

**问题**: Blueprint 层目前没有机制表达条件性 UI 渲染逻辑（"当池 < 3 时显示空槽占位符"）。这属于 UI 行为逻辑，可能需要：
- 在 `ui.selection_modal` Pattern 中作为参数/行为定义
- 或在 `validationContracts` 中作为约束声明

#### 4.6.6 后续可扩展 Talent Definitions

| 需求 | Blueprint 表达能力 | 评估 |
|------|-------------------|------|
| 天赋定义外置 | `parameters.entries: "talent_definitions"` | ✅ 充足（引用） |
| 定义结构扩展 | 无限制 | ✅ 充足 |

---

## 5. Clear Gaps

### 5.1 Blueprint 层缺口（按优先级）

#### GAP-B1: 条件性 UI 行为表达 [HIGH]

**问题描述**: Blueprint 层无法表达"当池 < 3 时显示空槽占位符"的条件性 UI 行为。

**影响范围**: 
- 验收标准 #10："若剩余天赋少于 3 个，空槽显示占位符"

**当前状态**:
- `ui.selection_modal` Pattern 的 `payloadShape: card_with_rarity` 无法表达空槽语义
- Blueprint 连接语义不支持条件分支

**建议方案**:
1. **方案 A**: 在 `ui.selection_modal` Pattern 中添加 `placeholderBehavior` 参数
   ```json
   "placeholderBehavior": {
     "enabled": true,
     "emptySlotCount": "auto"  // 或具体数字
   }
   ```
2. **方案 B**: 在 `validationContracts` 中声明约束，由下游实现解析

**缺口类型**: Blueprint 结构扩展

---

#### GAP-B2: 池状态变更语义 [MEDIUM]

**问题描述**: `data.weighted_pool` Pattern 的 `pool_state` output 定义为可选，但 Case 要求必须追踪池状态变更。

**影响范围**:
- 验收标准 #9："选中天赋不会在后续抽取中再次出现"
- 验收标准 #4："未选的 2 个天赋返回池中"

**当前状态**:
- `data.weighted_pool` Pattern draft 中 `pool_state` 定义:
  > "Optional current pool state if the implementation tracks mutation"
- Blueprint 可以表达状态连接，但 Pattern 层没有强制要求状态追踪

**建议方案**:
1. 在 `data.weighted_pool` Pattern 中添加 `stateTrackingMode` 参数:
   ```json
   "stateTrackingMode": {
     "type": "enum",
     "enumValues": ["none", "session", "persistent"],
     "default": "none"
   }
   ```
2. 当 `stateTrackingMode !== "none"` 时，`pool_state` output 变为必需

**缺口类型**: Pattern 参数扩展（非 Blueprint 结构缺口）

---

#### GAP-B3: 选择流程与池交互语义 [MEDIUM]

**问题描述**: `rule.selection_flow` Pattern 需要明确定义其与 `data.weighted_pool` 的交互语义（移除已选、返回未选）。

**影响范围**:
- 验收标准 #8, #9, #4 的完整生命周期

**当前状态**:
- `rule.selection_flow` 在 P0-06 列出，但**无 Pattern Draft**
- 无法确认 Pattern 是否支持:
  - `removalPolicy: permanent_for_selected`
  - `returnPolicy: return_unselected`

**建议方案**:
1. 创建 `rule.selection_flow` Pattern Draft
2. 明确定义以下参数:
   ```json
   "removalPolicy": {
     "type": "enum",
     "enumValues": ["none", "temporary", "permanent"],
     "default": "none"
   },
   "returnPolicy": {
     "type": "enum", 
     "enumValues": ["discard_all", "return_unselected", "return_all"],
     "default": "discard_all"
   }
   ```

**缺口类型**: Pattern 定义缺失（非 Blueprint 结构缺口）

---

#### GAP-B4: 效果应用多态消歧 [LOW]

**问题描述**: `effect` 是多态类别，`effect.modifier_applier` 需要语义消歧。

**影响范围**:
- 验收标准 #8："选中天赋效果生效"

**当前状态**:
- `effect.modifier_applier` 在 Pattern Resolution 文档中作为 `outcomeApplication` 的推断 Pattern
- 但**无 Pattern Draft**，无法确认参数支持

**建议方案**:
1. 创建 `effect.modifier_applier` Pattern Draft
2. 定义 `modifierSource` 和 `modifiers` 参数结构

**缺口类型**: Pattern 定义缺失（非 Blueprint 结构缺口）

---

### 5.2 非 Blueprint 层缺口（记录但不计入审计结论）

以下缺口属于 Generator 或 Pattern 层，不属于 Blueprint 结构缺口：

| 缺口 | 层级 | 说明 |
|------|------|------|
| `rule.selection_flow` Pattern Draft 缺失 | Pattern | P0-06 已列出，需创建 |
| `effect.modifier_applier` Pattern Draft 缺失 | Pattern | 需创建 |
| `data.weighted_pool` 状态追踪参数不足 | Pattern | 参数扩展 |
| 天赋定义数据结构 | Generator | entries 引用的具体数据 |

---

## 6. Minimal Blueprint Extensions

### 6.1 必需扩展

#### EXT-B1: UI 条件行为参数

**扩展位置**: `ui.selection_modal` Pattern 参数

**扩展内容**:
```typescript
interface UISelectionModalParams {
  // ... existing params
  placeholderBehavior?: {
    enabled: boolean;
    emptySlotMode: "hide" | "show_placeholder" | "auto";
    placeholderPayload?: object;
  };
}
```

**影响**: Blueprint 需要支持传递此参数到 Pattern。

---

#### EXT-B2: 状态追踪强制标记

**扩展位置**: `data.weighted_pool` Pattern 参数

**扩展内容**:
```typescript
interface DataWeightedPoolParams {
  // ... existing params
  stateTrackingMode?: "none" | "session" | "persistent";
}
```

**影响**: 当 `stateTrackingMode !== "none"` 时，`pool_state` output 变为必需。

---

### 6.2 可选扩展

#### EXT-B3: 验证合约增强

**扩展位置**: Blueprint `validationContracts`

**扩展内容**:
```typescript
interface ValidationContract {
  id: string;
  rule: string;
  severity: "error" | "warning";
  // 新增
  scope?: "blueprint" | "pattern" | "runtime";
  verificationHint?: string;
}
```

**影响**: 允许在 Blueprint 层声明运行时行为约束。

---

### 6.3 不需要的扩展

以下内容**不需要**在 Blueprint 层扩展：

| 项目 | 原因 |
|------|------|
| 领域专用模块类型 | 违反通用性原则 |
| 条件连接语法 | 过度复杂化 Blueprint |
| 运行时状态机定义 | 属于 Pattern/Generator 层 |

---

## 7. Final Verdict

### 7.1 审计结论

**Blueprint is sufficient with minor structural additions.**

### 7.2 结论依据

| 评估维度 | 结论 | 说明 |
|----------|------|------|
| 模块类别体系 | ✅ 充足 | 6 个类别完整覆盖 Case 需求 |
| Pattern Hint 机制 | ✅ 充足 | 支持显式声明和交集语义 |
| 连接语义 | ✅ 充足 | 5 种连接类型覆盖所有交互场景 |
| 验证流程 | ✅ 充足 | 三阶段验证支持结构/语义/统计检查 |
| UI Plan | ✅ 充足 | 支持必需 Surface 和 Design Spec 引用 |
| 条件 UI 行为 | ⚠️ 需扩展 | 需在 Pattern 参数层补充 |
| 状态追踪语义 | ⚠️ 需扩展 | 需在 Pattern 参数层补充 |

### 7.3 关键发现

1. **Blueprint 结构本身足够**: 
   - 模块、连接、验证合约、UI Plan 的基础结构可以完整表达 Talent Draw Case
   - 不需要引入新的 Blueprint 层概念

2. **Pattern 层需要补充**:
   - `rule.selection_flow` Pattern Draft 需创建
   - `effect.modifier_applier` Pattern Draft 需创建
   - 现有 Pattern 参数需要扩展以支持 Case 特定需求

3. **Blueprint- Pattern 边界清晰**:
   - Blueprint 负责结构表达
   - Pattern 负责行为语义
   - Case 需求的行为逻辑应在 Pattern 参数中定义，而非 Blueprint 结构中

### 7.4 阻塞项

**无 Blueprint 层阻塞项。**

Talent Draw Case 可以进入下一阶段（Pattern Resolution / Assembly），前提是：
1. 创建 `rule.selection_flow` Pattern Draft
2. 创建 `effect.modifier_applier` Pattern Draft
3. 扩展 `ui.selection_modal` 和 `data.weighted_pool` 参数

### 7.5 下一步建议

| 优先级 | 行动 | 责任层 |
|--------|------|--------|
| P0 | 创建 `rule.selection_flow` Pattern Draft | Pattern |
| P0 | 创建 `effect.modifier_applier` Pattern Draft | Pattern |
| P1 | 扩展 `ui.selection_modal` 参数支持 placeholder | Pattern |
| P1 | 扩展 `data.weighted_pool` 参数支持状态追踪模式 | Pattern |
| P2 | 增强 `validationContracts` 支持运行时约束声明 | Blueprint |

---

## Appendix A: Pattern Draft Status

| Pattern ID | 状态 | Draft 文件 |
|------------|------|-----------|
| `input.key_binding` | ✅ 存在 | `adapters/dota2/patterns/drafts/input-key-binding.pattern.md` |
| `data.weighted_pool` | ✅ 存在 | `adapters/dota2/patterns/drafts/data-weighted-pool.pattern.md` |
| `ui.selection_modal` | ✅ 存在 | `adapters/dota2/patterns/drafts/ui-selection-modal.pattern.md` |
| `rule.selection_flow` | ❌ 缺失 | P0-06 已列出，需创建 |
| `effect.modifier_applier` | ❌ 缺失 | 需创建 |
| `resource.basic_pool` | ❌ 缺失 | P0-04 已列出，需创建 |

---

## Appendix B: Case 验收标准 vs Blueprint 支持

| # | 验收标准 | Blueprint 支持 | 缺口 |
|---|----------|---------------|------|
| 1 | IntentSchema 表达 | N/A (Wizard 阶段) | - |
| 2 | Blueprint 表达 | ✅ 充足 | - |
| 3 | Generator 产物 | N/A (Generator 阶段) | - |
| 4 | Host 写入 | N/A (Assembly 阶段) | - |
| 5 | Host 启动 | N/A (Host 阶段) | - |
| 6 | F4 触发 UI | ✅ 充足 | - |
| 7 | 三选一交互 | ✅ 充足 | - |
| 8 | 效果应用 | ⚠️ Pattern 缺失 | `effect.modifier_applier` |
| 9 | 永久移除 | ⚠️ Pattern 缺失 | `rule.selection_flow` |
| 10 | 空槽占位 | ⚠️ 参数缺失 | `ui.selection_modal` placeholder |

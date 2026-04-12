# Talent Draw Case - Workstream C: Generator Gap Audit

**Document Version**: 1.0  
**Audit Date**: 2026-04-12  
**Case Truth**: [CANONICAL-CASE-TALENT-DRAW.md](./CANONICAL-CASE-TALENT-DRAW.md)  
**Auditor**: Generator Gap Audit Agent

---

## 1. Scope

本审计报告专注于 Rune Weaver 当前 generator/realization 路径对 **Talent Draw Case** 的覆盖度分析。

### 1.1 审计边界

| 在范围内 | 不在范围内 |
|---------|-----------|
| Generator 产出能力分析 | IntentSchema/Blueprint 设计缺口 |
| Pattern 到代码的映射覆盖度 | 玩法逻辑实现细节 |
| Generator routing 支持度 | 新 Pattern 设计提案 |
| Must-have vs Nice-to-have gap 分类 | 实际代码编写 |

### 1.2 依赖文档

- [CANONICAL-CASE-TALENT-DRAW.md](./CANONICAL-CASE-TALENT-DRAW.md) - 唯一 case truth
- [GENERATOR-ROUTING-CONTRACT.md](../GENERATOR-ROUTING-CONTRACT.md) - Generator 路由契约
- [GENERATOR-ROUTING-SCHEMA.md](../GENERATOR-ROUTING-SCHEMA.md) - Generator 路由 schema
- [DOTA2-TS-GENERATOR-BOUNDARY.md](../DOTA2-TS-GENERATOR-BOUNDARY.md) - TS generator 边界
- [DOTA2-KV-GENERATOR-SCOPE.md](../DOTA2-KV-GENERATOR-SCOPE.md) - KV generator 范围
- [DOTA2-TS-LUA-AUTHORING-PATHS.md](../DOTA2-TS-LUA-AUTHORING-PATHS.md) - TS/LUA 编写路径
- [HOST-REALIZATION-CONTRACT.md](../HOST-REALIZATION-CONTRACT.md) - Host realization 契约
- [ASSEMBLY-HOST-MAPPING.md](../ASSEMBLY-HOST-MAPPING.md) - Assembly 到 Host 映射
- [AGENT-EXECUTION-BASELINE.md](../AGENT-EXECUTION-BASELINE.md) - Agent 执行基线

---

## 2. Coverage Matrix

### 2.1 Talent Draw 功能需求 vs Generator 支持

| # | 功能需求 | 相关 Pattern | Generator | 支持度 | 说明 |
|---|---------|-------------|-----------|--------|------|
| 1 | 输入绑定代码 (F4) | `input.key_binding` | TS Generator | ✅ 完整 | 已有 `generateKeyBindingCode()` |
| 2 | 状态池/数据定义 | `data.weighted_pool` | TS Generator | ✅ 完整 | 已有 `generateWeightedPoolCode()`，支持 entries/tiers 参数 |
| 3 | 稀有度权重逻辑 | `data.weighted_pool` | TS Generator | ✅ 完整 | 支持 weight/tier 参数，有 `drawByTier()` 方法 |
| 4 | UI 三选一卡面 | `ui.selection_modal` | UI Generator | ⚠️ 部分 | 有基础组件，但缺少 placeholder 卡槽逻辑 |
| 5 | 选择回调 | `rule.selection_flow` | TS Generator | ✅ 完整 | 已有 `generateSelectionFlowCode()`，支持回调机制 |
| 6 | 效果应用 | `effect.modifier_applier` | TS + KV Generator | ⚠️ 部分 | 有 modifier 应用框架，但缺少动态效果生成 |
| 7 | 已选中永久移除 | 无专门 Pattern | - | ❌ 缺失 | `data.weighted_pool` 有 `remove()` 方法，但缺少持久化状态管理 |
| 8 | 未选中回池 | 无专门 Pattern | - | ❌ 缺失 | 需要在业务逻辑中实现，非 generator 职责 |
| 9 | 少于三个时 placeholder UI | `ui.selection_modal` | UI Generator | ⚠️ 部分 | 组件有 `items.length === 0` 处理，但无显式 placeholder 卡槽 |
| 10 | 客户端-服务器通信 | 无专门 Pattern | - | ⚠️ 部分 | 有 XNetTable 同步框架，但缺少完整事件流 |
| 11 | 状态持久化 | 无专门 Pattern | - | ❌ 缺失 | Workspace 只持久化 feature 元数据，不持久化运行时状态 |

### 2.2 Pattern 到 Generator 路由映射

| Pattern ID | Realization Type | Generator Family | hostTarget | 状态 |
|------------|-----------------|------------------|------------|------|
| `input.key_binding` | `ts` | `dota2-ts` | `dota2.server` | ✅ |
| `data.weighted_pool` | `ts` | `dota2-ts` | `dota2.server` | ✅ |
| `rule.selection_flow` | `ts` | `dota2-ts` | `dota2.server` | ✅ |
| `ui.selection_modal` | `ui` | `dota2-ui` | `dota2.panorama` | ✅ |
| `effect.modifier_applier` | `ts` + `kv` | `dota2-ts` + `dota2-kv` | `dota2.server` | ⚠️ |

### 2.3 多类型组合路由支持

Talent Draw 需要的组合：`kv + ts + ui`

| 组合类型 | Routing Schema 支持 | 说明 |
|---------|-------------------|------|
| `kv` | ✅ | 单类型路由 |
| `ts` | ✅ | 单类型路由 |
| `ui` | ✅ | 单类型路由 |
| `kv+ts` | ✅ | 双类型组合，已定义 |
| `kv+lua` | ✅ | 双类型组合，已定义 |
| `kv+ts+ui` | ⚠️ 未显式定义 | 需要拆分为多个 realization units 或扩展 schema |

---

## 3. Current Generator Strengths

### 3.1 已具备的核心能力

#### 3.1.1 TS Generator (Dota2TSGenerator)

**位置**: [adapters/dota2/generator/index.ts](../../adapters/dota2/generator/index.ts)

| 能力 | 实现函数 | 支持度 |
|------|---------|--------|
| 按键绑定 | `generateKeyBindingCode()` | ✅ 完整 |
| 加权池 | `generateWeightedPoolCode()` | ✅ 完整，支持 entries/tiers 参数注入 |
| 选择流程 | `generateSelectionFlowCode()` | ✅ 完整，支持 choiceCount/selectionPolicy |
| 冲刺效果 | `generateDashEffectCode()` | ✅ 完整 |
| 资源池 | `generateResourcePoolCode()` | ✅ 完整 |

**关键代码片段** (加权池支持 case-specific 数据):

```typescript
// T172-R1: Use entry.parameters for case-specific data if available
const caseParams = entry.parameters as { 
  entries?: Array<{ id: string; label: string; description: string; weight: number; tier?: string }>, 
  tiers?: string[] 
} | undefined;
const entries = caseParams?.entries;
const tiers = caseParams?.tiers;
```

#### 3.1.2 KV Generator (Dota2KVGenerator)

**位置**: [adapters/dota2/generator/kv/index.ts](../../adapters/dota2/generator/kv/index.ts)

| 能力 | 支持度 | 说明 |
|------|--------|------|
| Ability KV 块生成 | ✅ | 纯函数，无副作用 |
| 静态属性 (cooldown, manaCost, castRange) | ✅ | 完整支持 |
| AbilitySpecial | ✅ | 支持动态属性 |
| Hero/Item KV | ❌ | v1 范围外 |

#### 3.1.3 UI Generator (Dota2UIGenerator)

**位置**: [adapters/dota2/generator/index.ts](../../adapters/dota2/generator/index.ts#L792-L971)

| 能力 | 实现函数 | 支持度 |
|------|---------|--------|
| 选择模态框 | `generateSelectionModalComponent()` | ⚠️ 部分 |
| 按键提示 | `generateKeyHintComponent()` | ✅ 完整 |
| 资源条 | `generateResourceBarComponent()` | ✅ 完整 |
| LESS 样式 | `generateLessStyles()` | ✅ 基础 |

**选择模态框当前支持**:
- ✅ items 数组渲染
- ✅ title/description 参数
- ✅ onSelect/onConfirm 回调
- ✅ tier 样式类
- ⚠️ 无显式 placeholder 卡槽
- ⚠️ 无动态卡槽数量处理

#### 3.1.4 Lua Generator (Dota2LuaGenerator)

**位置**: [adapters/dota2/generator/lua-ability/index.ts](../../adapters/dota2/generator/lua-ability/index.ts)

| 能力 | 支持度 | 说明 |
|------|--------|------|
| `dota2.short_time_buff` 模式 | ✅ | T121 验证通过 |
| 同文件 ability + modifier | ✅ | T19 pattern |
| buff/debuff archetype | ✅ | 支持 "buff" / "dot" |
| 动态效果配置 | ⚠️ | 需要通过 modifierFunctions 参数注入 |

### 3.2 Pattern Catalog 覆盖

**位置**: [adapters/dota2/patterns/index.ts](../../adapters/dota2/patterns/index.ts)

当前可用 Patterns:

| Category | Pattern ID | 状态 |
|----------|-----------|------|
| input | `input.key_binding` | ✅ |
| data | `data.weighted_pool` | ✅ |
| rule | `rule.selection_flow` | ✅ |
| effect | `effect.dash` | ✅ |
| effect | `effect.modifier_applier` | ✅ |
| effect | `effect.resource_consume` | ✅ |
| resource | `resource.basic_pool` | ✅ |
| ui | `ui.selection_modal` | ✅ |
| ui | `ui.key_hint` | ✅ |
| ui | `ui.resource_bar` | ✅ |
| ability | `dota2.short_time_buff` | ✅ |

---

## 4. Must-Have Gaps

### 4.1 GAP-1: 状态持久化机制缺失

**问题**: Talent Draw 需要持久化以下状态：
- 已选中的 talent IDs（永久移除）
- 剩余可抽取的 talent IDs
- 当前玩家拥有的 talents

**当前状态**:
- `RuneWeaverWorkspace` 只持久化 feature 元数据
- `data.weighted_pool` 的 `remove()` 方法只在内存中生效
- 游戏重启后池状态会重置

**影响**: 验收标准 #9（选中的 talent 在后续抽取中不再出现）无法满足

**解决方案方向**:
1. 扩展 `resource.basic_pool` pattern 支持持久化
2. 或新增 `data.persistent_pool` pattern
3. 利用 Dota2 的 `CustomNetTables` 或存档系统

**优先级**: **MUST-HAVE** (阻塞验收)

### 4.2 GAP-2: 客户端-服务器事件流不完整

**问题**: Talent Draw 需要完整的客户端-服务器通信：
- 服务器 → 客户端：发送候选 talents
- 客户端 → 服务器：发送选择结果
- 服务器 → 客户端：确认效果应用

**当前状态**:
- `rule.selection_flow` 有 `sendToClient()` 方法框架
- 使用 XNetTable 作为传输层
- 缺少完整的事件监听/响应机制

**关键代码** (当前框架):

```typescript
// 发送到客户端
private sendToClient(playerId: number, options: SelectionOption[]): void {
  if ((GameRules as any).XNetTable) {
    (GameRules as any).XNetTable.SetTableValue(
      "rune_weaver_selection",
      `player_${playerId}`,
      { options, status: "waiting" }
    );
  }
}
```

**缺失部分**:
- 客户端选择事件的监听器注册
- 服务器端事件处理回调
- 错误处理和重试机制

**影响**: 验收标准 #7（玩家能从 3 个候选中选择 1 个）可能不稳定

**解决方案方向**:
1. 扩展 `rule.selection_flow` 添加完整事件流
2. 或新增 `network.event_channel` pattern
3. 利用 `CustomGameEventManager.RegisterListener`

**优先级**: **MUST-HAVE** (阻塞验收)

### 4.3 GAP-3: 动态效果生成能力不足

**问题**: Talent Draw 的效果根据稀有度动态变化：
- R: Strength +10
- SR: Agility +10
- SSR: Intelligence +10
- UR: All Attributes +10

**当前状态**:
- `effect.modifier_applier` pattern 存在
- 但 generator 产出的是静态 modifier 应用代码
- 缺少根据 talent tier 动态选择效果的能力

**关键代码** (当前 modifier_applier):

```typescript
// effect.modifier_applier 参数
parameters: [
  { name: "modifierId", type: "string", required: true, description: "modifier 定义标识" },
  { name: "duration", type: "number", required: false, description: "持续时间（秒）" },
  { name: "stacks", type: "number", required: false, description: "初始层数" },
]
```

**缺失部分**:
- 动态效果映射表
- 根据 tier 选择效果的逻辑
- 效果参数化注入

**影响**: 验收标准 #8（选中的 talent 效果应用）需要人工补写

**解决方案方向**:
1. 扩展 `effect.modifier_applier` 支持 `effectMap` 参数
2. 或在 `rule.selection_flow` 回调中注入效果选择逻辑
3. 人工补写效果映射表，后续 productize

**优先级**: **MUST-HAVE** (阻塞验收)

### 4.4 GAP-4: 三类型组合路由未显式支持

**问题**: Talent Draw 需要 `kv + ts + ui` 三类型组合

**当前状态**:
- Routing Schema v1 只显式定义了双类型组合
- `kv+ts+ui` 需要拆分为多个 realization units

**Routing Schema 当前支持**:

```typescript
type RealizationType = 
  | "kv" | "ts" | "ui" | "lua" 
  | "kv+lua" | "kv+ts" 
  | "shared-ts" | "bridge-only";
```

**影响**: 需要手动拆分或扩展 schema

**解决方案方向**:
1. 扩展 `RealizationType` 添加 `kv+ts+ui`
2. 或将 Talent Draw 拆分为 3 个独立的 realization units
3. 在 Host Realization 层处理组合

**优先级**: **MUST-HAVE** (阻塞路由)

---

## 5. Nice-to-Have Gaps

### 5.1 GAP-5: Placeholder UI 卡槽

**问题**: 当剩余 talent < 3 时，需要显示 placeholder

**当前状态**:
- `ui.selection_modal` 有 `items.length === 0` 时返回 null
- 无显式 placeholder 卡槽渲染

**影响**: 验收标准 #10（少于 3 个 talent 时，空槽显示 placeholder）

**解决方案方向**:
1. 扩展 `ui.selection_modal` 支持 `placeholderCount` 参数
2. 在客户端组件中添加 placeholder 渲染逻辑

**优先级**: **NICE-TO-HAVE** (可人工补写)

### 5.2 GAP-6: 效果描述文本生成

**问题**: UI 卡面需要显示效果描述

**当前状态**:
- `data.weighted_pool` 的 entries 有 `description` 字段
- 但效果描述需要与实际效果同步

**影响**: UI 显示可能不一致

**优先级**: **NICE-TO-HAVE** (可人工维护)

### 5.3 GAP-7: 稀有度视觉效果

**问题**: 不同稀有度需要不同背景色

**当前状态**:
- `ui.selection_modal` 有 `tier-${tier.toLowerCase()}` 样式类
- 需要在 LESS 中定义对应样式

**解决方案方向**:
1. 扩展 `generateLessStyles()` 支持稀有度样式
2. 或在 case-specific 参数中注入

**优先级**: **NICE-TO-HAVE** (可人工补写)

### 5.4 GAP-8: 抽取动画

**问题**: MVP 不需要高级动画，但未来可能需要

**当前状态**:
- UI 组件有基础结构
- 无动画相关代码

**优先级**: **NICE-TO-HAVE** (明确不在 MVP 范围)

---

## 6. Minimal Product Capability Plan

### 6.1 Phase 1: 阻塞项解决 (MUST-HAVE)

| # | Gap | 解决方案 | 工作量估计 | 依赖 |
|---|-----|---------|-----------|------|
| 1 | GAP-4 | 扩展 Routing Schema 或拆分 realization units | 小 | 无 |
| 2 | GAP-2 | 扩展 `rule.selection_flow` 添加完整事件流 | 中 | GAP-4 |
| 3 | GAP-3 | 在 selection_flow 回调中注入效果映射逻辑 | 中 | GAP-2 |
| 4 | GAP-1 | 利用 CustomNetTables 实现状态持久化 | 中 | GAP-2 |

### 6.2 Phase 2: 体验优化 (NICE-TO-HAVE)

| # | Gap | 解决方案 | 工作量估计 |
|---|-----|---------|-----------|
| 5 | GAP-5 | 扩展 `ui.selection_modal` 支持 placeholder | 小 |
| 6 | GAP-7 | 扩展 LESS generator 支持稀有度样式 | 小 |
| 7 | GAP-6 | 效果描述同步机制 | 小 |

### 6.3 人工补写路径

对于以下内容，建议先人工补写，后续 productize：

1. **效果映射表**: 在服务器代码中硬编码 tier → effect 映射
2. **Placeholder UI**: 在客户端组件中手动添加 placeholder 渲染
3. **稀有度样式**: 在 LESS 文件中手动定义 tier 颜色

### 6.4 Generator 扩展建议

#### 6.4.1 扩展 `rule.selection_flow`

```typescript
// 建议新增参数
parameters: [
  // 现有参数...
  { name: "effectMap", type: "Record<string, string>", required: false, 
    description: "tier → modifierId 映射" },
  { name: "persistState", type: "boolean", required: false, 
    description: "是否持久化池状态", defaultValue: true },
]
```

#### 6.4.2 扩展 `ui.selection_modal`

```typescript
// 建议新增参数
parameters: [
  // 现有参数...
  { name: "placeholderCount", type: "number", required: false, 
    description: "placeholder 卡槽数量" },
  { name: "showPlaceholder", type: "boolean", required: false, 
    description: "是否显示 placeholder", defaultValue: true },
]
```

---

## 7. Final Verdict

### 7.1 结论

> **Generator path can support a first runnable version with targeted gap closure.**

### 7.2 理由

1. **基础 Pattern 覆盖度高**: 11 个核心 Patterns 中，Talent Draw 所需的 5 个关键 Patterns 已存在且实现完整
2. **Generator 架构成熟**: TS/KV/UI Generator 都有清晰的边界和纯函数实现
3. **参数化支持**: T172-R1 引入的 `entry.parameters` 机制支持 case-specific 数据注入
4. **Gaps 可控**: 4 个 MUST-HAVE gaps 都有明确的解决路径，工作量中等

### 7.3 风险项

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 状态持久化需要 Dota2 特定知识 | 中 | 参考 `CustomNetTables` 文档和现有实现 |
| 三类型组合路由需要 schema 扩展 | 低 | 可先拆分为独立 units |
| 效果映射需要业务逻辑 | 低 | 先人工补写，后续 productize |

### 7.4 下一步行动

1. **立即**: 扩展 Routing Schema 支持 `kv+ts+ui` 或确认拆分策略
2. **短期**: 扩展 `rule.selection_flow` 添加事件流和效果映射
3. **中期**: 实现状态持久化机制
4. **后续**: Productize 人工补写的部分

---

## Appendix A: Generator 代码位置索引

| Generator | 文件路径 |
|-----------|---------|
| TS Generator | [adapters/dota2/generator/index.ts](../../adapters/dota2/generator/index.ts) |
| KV Generator | [adapters/dota2/generator/kv/index.ts](../../adapters/dota2/generator/kv/index.ts) |
| Lua Generator | [adapters/dota2/generator/lua-ability/index.ts](../../adapters/dota2/generator/lua-ability/index.ts) |
| Pattern Catalog | [adapters/dota2/patterns/index.ts](../../adapters/dota2/patterns/index.ts) |
| Host Realization | [adapters/dota2/realization/index.ts](../../adapters/dota2/realization/index.ts) |
| Generator Routing | [adapters/dota2/routing/index.ts](../../adapters/dota2/routing/index.ts) |
| Assembler | [adapters/dota2/assembler/index.ts](../../adapters/dota2/assembler/index.ts) |

## Appendix B: 验收标准对照

| # | 验收标准 | Generator 支持 | Gap |
|---|---------|--------------|-----|
| 1 | IntentSchema 表示 | N/A (上游) | - |
| 2 | Blueprint 表示 | N/A (上游) | - |
| 3 | 生成 write plan + artifacts | ✅ | - |
| 4 | 写入 Dota2 host | ✅ | - |
| 5 | Host 启动 | N/A (运行时) | - |
| 6 | F4 打开 UI | ✅ | - |
| 7 | 选择 1/3 候选 | ⚠️ | GAP-2 |
| 8 | 效果应用 | ⚠️ | GAP-3 |
| 9 | 永久移除 | ❌ | GAP-1 |
| 10 | Placeholder UI | ⚠️ | GAP-5 |

---

*End of Audit Report*

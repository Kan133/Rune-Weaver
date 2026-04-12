# Talent Draw Implementation Planning Report

**Document Version**: 1.0
**Date**: 2026-04-12
**Status**: Canonical Implementation Planning Report
**Case Truth**: [CANONICAL-CASE-TALENT-DRAW.md](./CANONICAL-CASE-TALENT-DRAW.md)

---

## 1. Executive Summary

本报告是 Talent Draw Case 的 Implementation Planning Report，明确 Rune Weaver 下一步应该如何推进，才能让 Talent Draw case 由 Rune Weaver 自己生成并运行，而不是依赖人工补核心结构。

### 核心结论

| 维度 | 结论 |
|------|------|
| **第一优先级补什么** | **Pattern 层** - 参数扩展 |
| **阻塞验收标准** | #7, #8, #9, #10 |
| **最小变更面** | 3 个 Pattern 参数扩展 + 3 个 Generator 扩展 |
| **First Runnable Milestone** | 完成 Phase 1 阻塞项后可进入代码实现 |
| **Final Verdict** | **Rune Weaver can proceed directly into implementation after this planning round** |

### 关键发现

1. **真正的第一阻塞层是 Pattern 层**，而非 IntentSchema 或 Blueprint
2. **池管理规则**（选中永久移除、未选中返回池）是跨层一致的核心缺口
3. **状态持久化**是运行时层的关键缺失，需要 CustomNetTables 支持
4. **最小可行路径**需要 3 个 Pattern 参数扩展 + 3 个 Generator 扩展

---

## 2. Confirmed Product Principles

以下原则作为本轮 planning 的硬约束：

| # | 原则 | 来源 |
|---|------|------|
| 1 | Talent Draw case 必须由 Rune Weaver 自己跑通 | TALENT-DRAW-IMPLEMENTATION-PLAN.md |
| 2 | 允许使用 Rune Weaver 内置 LLM 做局部补全 | TALENT-DRAW-IMPLEMENTATION-PLAN.md L37-41 |
| 3 | 不能依赖人工补核心结构 | TALENT-DRAW-IMPLEMENTATION-PLAN.md L43-47 |
| 4 | 不能把手工写 runtime state model 当成可接受主路径 | TALENT-DRAW-IMPLEMENTATION-PLAN.md L56-58 |
| 5 | 不能把手工写 selection flow wiring 当成可接受主路径 | TALENT-DRAW-IMPLEMENTATION-PLAN.md L59-61 |
| 6 | 不能把手工补 UI/server 主连接当成可接受主路径 | TALENT-DRAW-IMPLEMENTATION-PLAN.md L62-64 |
| 7 | "永久移除"定义为：从当前 session 的 remaining pool 中移除，加入 ownedTalentIds，不删除静态 talent definitions | TALENT-DRAW-IMPLEMENTATION-PLAN.md L95-101 |
| 8 | MVP 只需单局游戏内持久化 | TALENT-DRAW-IMPLEMENTATION-PLAN.md L103-108 |

---

## 3. True First-Priority Gaps

### 3.1 Gap 分类

| Gap 类型 | 定义 | 数量 | 阻塞程度 |
|---------|------|------|---------|
| **Structural Gaps** | Pattern 参数定义缺失 | 3 | **阻塞** |
| **Generator Gaps** | Generator 产出能力缺失 | 3 | **阻塞** |
| **Runtime Gaps** | 运行时机制缺失 | 2 | 阻塞但可人工补位 |
| **Later Nice-to-Have Gaps** | MVP 后续优化 | 4 | 不阻塞 |

### 3.2 Structural Gaps（Pattern 层）

| Gap ID | Pattern | 缺失参数 | 阻塞验收标准 | 优先级 |
|--------|---------|---------|-------------|--------|
| SG-1 | `rule.selection_flow` | `removalPolicy`, `returnPolicy`, `effectMap`, `persistState`, `eventChannel` | #7, #8, #9 | **P0** |
| SG-2 | `ui.selection_modal` | `placeholderBehavior`, `dynamicSlotCount` | #10 | **P1** |
| SG-3 | `data.weighted_pool` | `stateTrackingMode`, `duplicatePolicy` | #9 | **P0** |

### 3.3 Generator Gaps

| Gap ID | Generator | 缺失能力 | 阻塞验收标准 | 优先级 |
|--------|-----------|---------|-------------|--------|
| GG-1 | TS Generator | 客户端-服务器事件流代码生成 | #7 | **P0** |
| GG-2 | TS Generator | 效果映射代码生成 | #8 | **P0** |
| GG-3 | TS Generator | 状态持久化代码生成 | #9 | **P0** |
| GG-4 | UI Generator | Placeholder 卡槽渲染 | #10 | **P1** |

### 3.4 Runtime Gaps

| Gap ID | 缺失机制 | 解决方案 | 是否可人工补位 |
|--------|---------|---------|---------------|
| RG-1 | CustomNetTables 状态同步 | Generator 生成 CustomNetTables 调用代码 | 是（但应 productize） |
| RG-2 | 效果映射表（tier → modifier） | 在 selection_flow 回调中硬编码 | 是（但应 productize） |

### 3.5 Later Nice-to-Have Gaps

| Gap ID | 描述 | 延迟原因 |
|--------|------|---------|
| NH-1 | 效果描述文本同步 | 可人工维护 |
| NH-2 | 稀有度视觉效果（LESS 样式） | 可人工定义 |
| NH-3 | 抽取动画 | 明确不在 MVP 范围 |
| NH-4 | 跨游戏会话持久化 | MVP 只需单局持久 |

---

## 4. Minimum Runtime State Contract

### 4.1 Must-Have States

| 状态名 | 类型 | 持久化范围 | 验收标准关联 |
|--------|------|-----------|-------------|
| `talentDefinitions` | 静态配置 | 永久（KV 文件） | 基础数据源 |
| `remainingTalentIds` | 动态持久化 | 单局游戏内 | #9 永久移除 |
| `ownedTalentIds` | 动态持久化 | 单局游戏内 | #9 永久移除 |
| `currentChoiceIds` | 瞬态 | 内存临时 | #7 三选一交互 |

### 4.2 State Layer Assignment

| 状态 | Pattern 层 | Generator 层 | Runtime 层 |
|------|-----------|--------------|------------|
| `talentDefinitions` | 定义 schema | 生成 KV catalog | 加载/读取 |
| `remainingTalentIds` | 定义持久化语义 | 生成状态初始化 | CustomNetTables 读写 |
| `ownedTalentIds` | 定义持久化语义 | 生成状态初始化 | CustomNetTables 读写 |
| `currentChoiceIds` | 定义瞬态语义 | 生成选择流程 | 临时存储 |

### 4.3 TypeScript Interface

```typescript
interface TalentDefinition {
  id: string;
  rarity: "R" | "SR" | "SSR" | "UR";
  name: string;
  description: string;
  effectType: "str" | "agi" | "int" | "all";
  effectValue: number;
}

interface TalentDrawState {
  remainingTalentIds: string[];
  ownedTalentIds: string[];
  currentChoiceIds: string[];
}

interface TalentSystemState {
  definitions: TalentDefinition[];
  rarityWeights: { R: 40; SR: 30; SSR: 20; UR: 10 };
  runtime: TalentDrawState;
}
```

### 4.4 State Persistence Strategy

| 状态 | 持久化方式 | 实现位置 |
|------|-----------|----------|
| `talentDefinitions` | 静态 KV 文件 | `scripts/npc/npc_abilities_custom.txt` |
| `remainingTalentIds` | CustomNetTables | `CustomNetTables:SetTableValue("talent_draw", "remaining", ...)` |
| `ownedTalentIds` | CustomNetTables | `CustomNetTables:SetTableValue("talent_draw", "owned", ...)` |
| `currentChoiceIds` | 内存临时变量 | Lua/TS runtime variable |

---

## 5. Required Pattern Contract Changes

### 5.1 `rule.selection_flow` Parameter Extensions

**当前参数**：
- `choiceCount`: number
- `selectionPolicy`: enum
- `applyMode`: enum

**需要新增**：

| 参数名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| `removalPolicy` | enum | 否 | `none` \| `temporary` \| `permanent` |
| `returnPolicy` | enum | 否 | `discard_all` \| `return_unselected` \| `return_all` |
| `effectMap` | Record<string, string> | 否 | tier → modifierId 映射 |
| `persistState` | boolean | 否 | 是否持久化池状态 |
| `eventChannel` | string | 否 | 客户端-服务器事件通道名称 |

### 5.2 `ui.selection_modal` Parameter Extensions

**当前参数**：
- `choiceCount`: number
- `layoutPreset`: enum
- `selectionMode`: enum
- `dismissBehavior`: enum

**需要新增**：

| 参数名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| `placeholderBehavior` | object | 否 | 空槽占位符行为配置 |
| `placeholderBehavior.enabled` | boolean | 是 | 是否启用占位符 |
| `placeholderBehavior.emptySlotMode` | enum | 是 | `hide` \| `show_placeholder` \| `auto` |
| `dynamicSlotCount` | boolean | 否 | 是否支持动态卡槽数量 |

### 5.3 `data.weighted_pool` Parameter Extensions

**当前参数**：
- `entries`: array
- `weights`: object
- `tiers`: string[]
- `choiceCount`: number

**需要新增**：

| 参数名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| `stateTrackingMode` | enum | 否 | `none` \| `session` \| `persistent` |
| `duplicatePolicy` | enum | 否 | `allow` \| `forbid` |

### 5.4 `resource.basic_pool` - 不扩展

**决策**：不扩展 `resource.basic_pool`，在 `data.weighted_pool` 中添加状态追踪能力即可。

**原因**：
1. `data.weighted_pool` 更适合天赋池场景
2. 避免两个 Pattern 功能重叠
3. 减少变更面

---

## 6. Required Generator / Realization Changes

### 6.1 Generator Extension Priority

| 优先级 | Generator | 扩展内容 | 阻塞验收标准 |
|--------|-----------|---------|-------------|
| **P0** | TS Generator | `generateSelectionFlowCode()` 添加事件监听器 + 效果映射 | #7, #8 |
| **P0** | TS Generator | `generateWeightedPoolCode()` 添加状态持久化 | #9 |
| **P1** | UI Generator | `generateSelectionModalComponent()` 添加 placeholder 卡槽 | #10 |

### 6.2 `rule.selection_flow` Generator Changes

**位置**：[adapters/dota2/generator/index.ts#L600-L748](../../adapters/dota2/generator/index.ts#L600-L748)

**需要新增**：
1. 客户端事件监听器注册：`CustomGameEventManager.RegisterListener`
2. 效果应用逻辑：根据 `effectMap` 应用 modifier
3. 池状态变更回调：`remove()` + `syncToNetTable()`

### 6.3 `data.weighted_pool` Generator Changes

**位置**：[adapters/dota2/generator/index.ts#L433-L594](../../adapters/dota2/generator/index.ts#L433-L594)

**需要新增**：
1. 状态追踪字段：`remainingIds: Set<string>`, `ownedIds: Set<string>`
2. NetTable 同步：`syncStateToNetTable()`
3. 修改 `remove()` 方法：同步更新状态

### 6.4 `ui.selection_modal` Generator Changes

**位置**：[adapters/dota2/generator/index.ts#L870-L971](../../adapters/dota2/generator/index.ts#L870-L971)

**需要新增**：
1. 固定卡槽数量：支持 `slotCount` 参数
2. Placeholder 渲染：当 `items.length < slotCount` 时显示占位符

### 6.5 Routing Schema - 无需扩展

**决策**：不扩展 `RealizationType` 枚举添加 `kv+ts+ui`。

**解决方案**：拆分为 4 个独立 realization units：
- Unit 1: `input.key_binding` → ts
- Unit 2: `data.weighted_pool` → shared-ts
- Unit 3: `rule.selection_flow` → ts
- Unit 4: `ui.selection_modal` → ui

---

## 7. Allowed LLM Assistance Boundary

### 7.1 允许 LLM 补全

| 范围 | 具体内容 | 契约约束 |
|------|---------|---------|
| Talent Entry List | 生成 R001-R010, SR001-SR010, SSR001-SSR010, UR001-UR010 | 必须遵循 `TalentDefinition` schema |
| Placeholder Descriptions | 生成每个 talent 的 name/description | 必须与稀有度效果对应 |
| Effect Mapping Table | 填充 tier → modifier 映射表 | 必须遵循固定契约 |
| UI Copy | 卡片标题、确认按钮文本、空槽提示文本 | 必须在已定义的 UI 结构内 |
| Rarity Styles | LESS 中的 tier 颜色定义 | 必须遵循稀有度颜色契约 |

### 7.2 禁止 LLM 决策

| 范围 | 原因 | 必须由谁决定 |
|------|------|-------------|
| Runtime State Model | 决定 `TalentDrawState` 应该包含什么字段 | Generator Product Capability |
| Pool Mutation Logic | 决定 `remove()` 后如何同步状态 | Generator Product Capability |
| UI-Server Communication | 决定事件流如何设计 | Generator Product Capability |
| Blueprint Structure | 决定应该有哪些模块 | IntentSchema → Blueprint Pipeline |
| Module Boundaries | 决定模块如何拆分 | Blueprint Authoring |
| Realization Type | 决定某个模块应该用 kv/ts/ui | Host Realization Policy |

---

## 8. First Runnable Milestone

### 8.1 定义

First Runnable Milestone 是指：**Talent Draw 可以在 Dota2 Tools 中运行并满足验收标准 #6-#10**。

### 8.2 最小代码路径

```
IntentSchema
    ↓
Blueprint (4 modules)
    ├── module-1: input.key_binding → ts → server_ts
    ├── module-2: data.weighted_pool → shared-ts → shared_ts
    ├── module-3: rule.selection_flow → ts → server_ts
    └── module-4: ui.selection_modal → ui → panorama_tsx + panorama_less
    ↓
HostRealizationPlan (4 units)
    ↓
GeneratorRoutingPlan (5+ routes)
    ↓
Generators
    ├── Dota2TSGenerator → server_ts/*.ts
    ├── Dota2TSGenerator → shared_ts/*.ts
    └── Dota2UIGenerator → panorama/*.tsx + *.less
    ↓
WritePlan → Dota2 Host
    ↓
Dota2 Tools Runtime Validation
```

### 8.3 最小产出物

| 文件 | 来源 | 必须包含 |
|------|------|---------|
| `scripts/vscripts/rune_weaver/talent_draw_binding.ts` | TS Generator | F4 按键绑定 |
| `scripts/vscripts/rune_weaver/talent_pool.ts` | TS Generator | 加权池 + 状态追踪 |
| `scripts/vscripts/rune_weaver/talent_selection_flow.ts` | TS Generator | 选择流程 + 事件处理 |
| `content/panorama/layout/custom_game/talent_modal.xml` | UI Generator | 三卡槽布局 |
| `content/panorama/scripts/custom_game/talent_modal.ts` | UI Generator | 客户端逻辑 |
| `content/panorama/styles/custom_game/talent_modal.css` | UI Generator | 稀有度样式 |

### 8.4 验收标准达成路径

| # | 验收标准 | 实现路径 | Phase |
|---|---------|---------|-------|
| 6 | F4 打开 UI | `input.key_binding` ✅ | - |
| 7 | 选择 1/3 候选 | `rule.selection_flow` + 事件流 | Phase 1 |
| 8 | 效果应用 | `rule.selection_flow` + 效果映射 | Phase 1 |
| 9 | 永久移除 | `data.weighted_pool` + 状态持久化 | Phase 1 |
| 10 | Placeholder UI | `ui.selection_modal` + placeholder | Phase 1 |

---

## 9. Recommended Execution Order

### Phase 1: 阻塞项解决（MUST-HAVE）

| # | 任务 | 层级 | 工作量 | 阻塞验收标准 |
|---|------|------|--------|-------------|
| 1 | 扩展 `rule.selection_flow` Pattern 参数 | Pattern | 小 | #7, #8, #9 |
| 2 | 扩展 `data.weighted_pool` Pattern 参数 | Pattern | 小 | #9 |
| 3 | 扩展 `ui.selection_modal` Pattern 参数 | Pattern | 小 | #10 |
| 4 | 扩展 `generateSelectionFlowCode()` 添加事件监听器 | Generator | 中 | #7 |
| 5 | 扩展 `generateSelectionFlowCode()` 添加效果映射 | Generator | 中 | #8 |
| 6 | 扩展 `generateWeightedPoolCode()` 添加状态持久化 | Generator | 中 | #9 |
| 7 | 扩展 `generateSelectionModalComponent()` 添加 placeholder | Generator | 小 | #10 |

### Phase 2: 运行时验证

| # | 任务 | 说明 |
|---|------|------|
| 1 | 生成代码并写入 Dota2 host | 使用 CLI `dota2 run` |
| 2 | 在 Dota2 Tools 中启动 | 验证 F4 触发 |
| 3 | 验证 10 条验收标准 | 逐条测试 |

### Phase 3: 体验优化（NICE-TO-HAVE）

| # | 任务 | 优先级 |
|---|------|--------|
| 1 | 效果描述文本同步 | 低 |
| 2 | 稀有度视觉效果（LESS 样式） | 低 |
| 3 | 抽取动画 | 明确不在 MVP |

---

## 10. Risks

### 10.1 高风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| Pattern 参数设计不合理导致 Generator 无法正确路由 | 高 | 中 | 参考 Generator 代码结构设计参数 |
| 状态持久化需要 Dota2 CustomNetTables 特定知识 | 中 | 高 | 参考 XNetTable 现有实现 |
| 客户端-服务器事件流需要正确的 PlayerID 传递 | 中 | 中 | 在 RegisterListener 中正确处理 event.PlayerID |

### 10.2 中风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 效果映射需要 modifier 预定义 | 中 | 中 | 先硬编码 4 个基础 modifier |
| UI 组件需要正确的 panorama API | 中 | 低 | 使用 Dota2 Panorama 标准组件 |

### 10.3 不确定项

| 不确定项 | 当前假设 | 验证方法 |
|---------|---------|---------|
| XNetTable 是否支持复杂对象 | 假设支持 `{ remainingIds: string[], ownedIds: string[] }` | 需要在 Dota2 中验证 |
| CustomGameEventManager 是否需要预注册 | 假设可以在运行时注册 | 需要在 Dota2 中验证 |
| `currentChoiceIds` 是否需要持久化到 CustomNetTables | 假设不需要（瞬态） | 测试 UI 重渲染场景 |

---

## 11. Final Verdict

### 11.1 结论

> **Rune Weaver can proceed directly into implementation after this planning round**

### 11.2 理由

1. **IntentSchema 可以变通**：字符串描述虽然不完美，但足以传递信息
2. **Blueprint 结构足够**：模块、连接、验证合约、UI Plan 的基础结构完整
3. **Pattern 层缺口已明确**：3 个 Pattern 需要参数扩展，工作量可控
4. **Generator 层有基础能力**：TS/KV/UI Generator 都有清晰的边界和纯函数实现
5. **最小可行路径已明确**：Phase 1 阻塞项解决后即可进入代码实现

### 11.3 第一优先级应该补什么？

**答案**：**Pattern 层参数扩展**

**具体行动**：
1. 扩展 `rule.selection_flow` Pattern 参数（5 个新参数）
2. 扩展 `data.weighted_pool` Pattern 参数（2 个新参数）
3. 扩展 `ui.selection_modal` Pattern 参数（2 个新参数）

### 11.4 进入代码实现前的检查清单

| # | 检查项 | 状态 |
|---|--------|------|
| 1 | IntentSchema 可以表达 Talent Draw 需求 | ✅ 可变通 |
| 2 | Blueprint 结构可以承载 Talent Draw 模块 | ✅ 充足 |
| 3 | Pattern 参数定义已明确 | ✅ 本报告已定义 |
| 4 | Generator 扩展点已明确 | ✅ 本报告已定义 |
| 5 | LLM 补全边界已明确 | ✅ 本报告已定义 |
| 6 | First Runnable Milestone 已定义 | ✅ 本报告已定义 |

### 11.5 不需要额外 Contract Round

本报告已经：
1. 明确了 Runtime State Contract
2. 明确了 Pattern Contract Changes
3. 明确了 Generator Extension Plan
4. 明确了 LLM Assistance Boundary
5. 明确了 First Runnable Milestone

**可以直接进入代码实现阶段**。

---

## Appendix A: Gap 跨层映射

| Case 需求 | Pattern Gap | Generator Gap | Runtime Gap |
|----------|-------------|---------------|-------------|
| 选中永久移除 | SG-1, SG-3 | GG-3 | RG-1 |
| 未选中返回池 | SG-1 | - | - |
| 池不足时 placeholder | SG-2 | GG-4 | - |
| 效果应用 | SG-1 | GG-2 | RG-2 |
| 状态追踪 | SG-3 | GG-3 | RG-1 |

## Appendix B: 验收标准完整映射

| # | 验收标准 | Pattern 支持 | Generator 支持 | 最终状态 |
|---|---------|-------------|---------------|---------|
| 1 | IntentSchema 表达 | ⚠️ 可变通 | N/A | ✅ 可接受 |
| 2 | Blueprint 表达 | ✅ 充足 | N/A | ✅ 通过 |
| 3 | Generator 产物 | N/A | ✅ | ✅ 通过 |
| 4 | Host 写入 | N/A | ✅ | ✅ 通过 |
| 5 | Host 启动 | N/A | N/A | ✅ 通过 |
| 6 | F4 触发 UI | ✅ | ✅ | ✅ 通过 |
| 7 | 三选一交互 | ⚠️ SG-1 | ⚠️ GG-1 | ⚠️ 需补 |
| 8 | 效果应用 | ⚠️ SG-1 | ⚠️ GG-2 | ⚠️ 需补 |
| 9 | 永久移除 | ⚠️ SG-3 | ⚠️ GG-3 | ⚠️ 需补 |
| 10 | Placeholder UI | ⚠️ SG-2 | ⚠️ GG-4 | ⚠️ 需补 |

## Appendix C: 参考文档

- [CANONICAL-CASE-TALENT-DRAW.md](./CANONICAL-CASE-TALENT-DRAW.md) - 唯一 case truth
- [TALENT-DRAW-IMPLEMENTATION-PLAN.md](./TALENT-DRAW-IMPLEMENTATION-PLAN.md) - 实现计划
- [A-intentschema-audit.md](./A-intentschema-audit.md) - IntentSchema 审计
- [B-blueprint-audit.md](./B-blueprint-audit.md) - Blueprint 审计
- [C-generator-gap-audit.md](./C-generator-gap-audit.md) - Generator Gap 审计
- [FINAL-consolidated-report.md](./FINAL-consolidated-report.md) - 汇总报告
- [AGENT-EXECUTION-BASELINE.md](../AGENT-EXECUTION-BASELINE.md) - Agent 执行基线
- [CURRENT-EXECUTION-PLAN.md](../CURRENT-EXECUTION-PLAN.md) - 当前执行计划

---

*End of Implementation Planning Report*

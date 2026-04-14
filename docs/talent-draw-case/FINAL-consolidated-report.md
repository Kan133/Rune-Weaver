# Talent Draw Case - Final Consolidated Report

**Document Version**: 1.0
**Date**: 2026-04-12
**Status**: Canonical Consolidation Report
**Case Truth**: [CANONICAL-CASE-TALENT-DRAW.md](./CANONICAL-CASE-TALENT-DRAW.md)

---

## 1. Executive Summary

本报告汇总 Workstream A (IntentSchema)、B (Blueprint)、C (Generator) 三份审计结果，明确 Talent Draw case 的真正瓶颈层，并产出可执行的下一阶段 implementation plan。

### 核心结论

| 维度 | 结论 |
|------|------|
| **IntentSchema 层** | 不足以完整表达，但可通过字符串描述变通 |
| **Blueprint 层** | 结构足够，需要 Pattern 参数扩展 |
| **Pattern 层** | **第一阻塞层** - 关键 Pattern Draft 缺失 |
| **Generator 层** | 有基础能力，但依赖 Pattern 层补齐 |
| **Host/Runtime 层** | 状态持久化机制缺失，需要产品化或人工补位 |

### 关键发现

1. **真正的第一阻塞层是 Pattern 层**，而非 IntentSchema 或 Blueprint
2. **池管理规则**（选中永久移除、未选中返回池）是跨层一致的核心缺口
3. **状态持久化**是运行时层的关键缺失
4. **最小可行路径**需要 4 个 Pattern Draft 创建 + 2 个 Pattern 参数扩展 + 运行时补位

---

## 2. A/B/C Agreement Matrix

### 2.1 一致结论

| # | 一致结论 | A | B | C |
|---|---------|---|---|---|
| 1 | 基础触发机制（F4 按键）可以表达/支持 | ✅ | ✅ | ✅ |
| 2 | 加权抽取机制有基础支持 | ✅ | ✅ | ✅ |
| 3 | 池管理规则（选中永久移除、未选中返回池）是核心缺口 | ✅ G5 | ✅ GAP-B3 | ✅ GAP-1 |
| 4 | UI placeholder 是需要处理的边界情况 | ✅ G6 | ✅ GAP-B1 | ✅ GAP-5 |
| 5 | 效果应用需要扩展 | ✅ G7 | ✅ GAP-B4 | ✅ GAP-3 |
| 6 | 玩家选择机制有基础支持 | ✅ | ✅ | ✅ |
| 7 | 稀有度权重参数可传递 | ⚠️ | ✅ | ✅ |

### 2.2 层级分工一致

| 层级 | 职责边界 | A/B/C 共识 |
|------|---------|-----------|
| IntentSchema | 需求表达、机制标记 | 字符串描述可变通，结构化表达有缺口 |
| Blueprint | 模块分解、连接定义、Pattern Hint | 结构足够，Pattern Hint 机制完善 |
| Pattern | 行为语义、参数定义、Generator 映射 | **关键 Pattern Draft 缺失** |
| Generator | 代码产出、路由分发 | 有基础能力，依赖 Pattern 层 |
| Host/Runtime | 状态持久化、事件流、效果应用 | 需要产品化或人工补位 |

---

## 3. Conflict Analysis

### 3.1 表面冲突（非真正冲突）

| 冲突描述 | A 的结论 | B 的结论 | 分析 |
|---------|---------|---------|------|
| Schema 表达能力 | "不足以表达" | "结构足够" | **非冲突**：A 评估 IntentSchema 层的结构化表达，B 评估 Blueprint 层的结构能力。两者评估对象不同。 |
| 稀有度系统 | "勉强表达" | "充足" | **非冲突**：A 关注 IntentSchema 层的结构化表达，B 关注 Blueprint 层的参数传递。Blueprint 可通过 `parameters.weights` 传递，但 IntentSchema 无结构化字段。 |
| Generator 可行性 | - | - | C 认为 "可以支持"，但 A 认为 IntentSchema "不足"。**非冲突**：A 评估产品层表达能力，C 评估技术实现可能性。 |

### 3.2 真正差异（需要决策）

| 差异描述 | 涉及层 | 需要决策 |
|---------|-------|---------|
| 效果定义位置 | IntentSchema vs Pattern | 效果映射表应该在 IntentSchema 层结构化表达，还是在 Pattern 参数中定义？**建议**：在 Pattern 参数中定义（`effect.modifier_applier.effectMap`），保持 IntentSchema 简洁。 |
| 状态持久化责任 | Pattern vs Host/Runtime | 状态持久化是 Pattern 层职责还是 Host/Runtime 层职责？**建议**：Pattern 层定义持久化语义（`stateTrackingMode`），Host/Runtime 层实现具体机制。 |
| Placeholder UI 处理 | Blueprint vs Generator | Placeholder 逻辑应该在 Blueprint 层声明还是在 Generator 层硬编码？**建议**：在 Pattern 参数中声明（`ui.selection_modal.placeholderBehavior`），Generator 根据参数生成代码。 |

### 3.3 冲突解决矩阵

| 冲突/差异 | 解决方案 | 决策依据 |
|----------|---------|---------|
| 效果定义位置 | Pattern 参数层 | 保持 IntentSchema 简洁，允许 case-specific 参数注入 |
| 状态持久化责任 | Pattern 定义语义 + Host/Runtime 实现 | 分离关注点，Pattern 定义"需要什么"，Host/Runtime 决定"如何实现" |
| Placeholder UI 处理 | Pattern 参数声明 | 参数化优于硬编码，支持未来扩展 |

---

## 4. True Bottleneck Layer

### 4.1 瓶颈层判定

经过 A/B/C 三层审计，**真正的第一阻塞层是 Pattern 层**。

#### 判定依据

| 层级 | 状态 | 是否阻塞 | 理由 |
|------|------|---------|------|
| **IntentSchema** | ⚠️ 不足 | **否** | 可通过字符串描述变通，不阻塞实现 |
| **Blueprint** | ✅ 足够 | **否** | 结构完整，连接语义清晰，验证流程完善 |
| **Pattern** | ❌ 缺失 | **是** | 关键 Pattern Draft 缺失，Generator 无法正确路由 |
| **Generator** | ⚠️ 部分 | **否** | 有基础能力，依赖 Pattern 层补齐 |
| **Host/Runtime** | ❌ 缺失 | **是** | 状态持久化机制缺失，但可人工补位 |

#### 为什么 Pattern 层是第一阻塞层

1. **Blueprint 可以表达需求**：模块、连接、验证合约、UI Plan 的基础结构完整
2. **IntentSchema 可以变通**：字符串描述虽然不完美，但足以传递信息
3. **Generator 有基础能力**：TS/KV/UI Generator 都有清晰的边界和纯函数实现
4. **Pattern Draft 缺失导致链条断裂**：
   - `rule.selection_flow` 无 Pattern Draft → Generator 无法生成选择流程代码
   - `effect.modifier_applier` 无完整参数定义 → Generator 无法生成动态效果映射
   - `resource.basic_pool` 无 Pattern Draft → 状态持久化语义不明确

### 4.2 阻塞链分析

```
Pattern Draft 缺失
       ↓
Generator 无法正确路由
       ↓
代码产出不完整
       ↓
运行时行为不正确
       ↓
验收标准无法满足
```

### 4.3 各层 Gap 汇总

#### IntentSchema Layer Gaps (A)

| Gap ID | 缺失能力 | 严重程度 | 是否阻塞 |
|--------|---------|---------|---------|
| G5 | 未选中回池规则表达位 | 高 | 否（可变通） |
| G4 | 资源消耗类型区分 | 高 | 否（可变通） |
| G1 | 槽位数量约束 | 中 | 否（可变通） |
| G6 | 边界情况处理表达 | 中 | 否（可变通） |
| G2 | 稀有度系统结构 | 高 | 否（可变通） |
| G3 | 池持久化语义 | 中 | 否（可变通） |
| G7 | 效果定义结构 | 中 | 否（可变通） |
| G8 | 扩展性声明 | 低 | 否（可变通） |

#### Blueprint Layer Gaps (B)

| Gap ID | 缺失能力 | 严重程度 | 是否阻塞 |
|--------|---------|---------|---------|
| GAP-B1 | 条件性 UI 行为表达 | 高 | 否（Pattern 参数可解决） |
| GAP-B2 | 池状态变更语义 | 中 | 否（Pattern 参数可解决） |
| GAP-B3 | 选择流程与池交互语义 | 中 | **是**（Pattern Draft 缺失） |
| GAP-B4 | 效果应用多态消歧 | 低 | **是**（Pattern Draft 缺失） |

#### Generator Layer Gaps (C)

| Gap ID | 缺失能力 | 严重程度 | 是否阻塞 |
|--------|---------|---------|---------|
| GAP-1 | 状态持久化机制 | 高 | 是（运行时） |
| GAP-2 | 客户端-服务器事件流 | 高 | 是（运行时） |
| GAP-3 | 动态效果生成 | 高 | 是（运行时） |
| GAP-4 | 三类型组合路由 | 高 | 否（可拆分） |
| GAP-5 | Placeholder UI 卡槽 | 中 | 否（可人工补写） |
| GAP-6 | 效果描述文本 | 低 | 否（可人工维护） |
| GAP-7 | 稀有度视觉效果 | 低 | 否（可人工补写） |
| GAP-8 | 抽取动画 | 低 | 否（明确不在 MVP） |

---

## 5. Recommended Execution Order

### 5.1 执行顺序原则

1. **先补 Pattern 层**：解除第一阻塞层
2. **再补 Generator 参数**：使 Generator 能正确路由
3. **后补运行时能力**：状态持久化、事件流
4. **最后人工补位**：效果映射、Placeholder UI、稀有度样式

### 5.2 Phase 1: Pattern Draft 创建 [P0]

| # | Pattern ID | 当前状态 | 需要定义的参数 | 阻塞验收标准 |
|---|-----------|---------|--------------|-------------|
| 1 | `rule.selection_flow` | ❌ 缺失 | `removalPolicy`, `returnPolicy`, `effectMap`, `persistState` | #7, #8, #9 |
| 2 | `effect.modifier_applier` | ⚠️ 部分 | `modifierSource`, `modifiers`, `effectMap` | #8 |
| 3 | `resource.basic_pool` | ❌ 缺失 | `resourceId`, `persistMode`, `syncMode` | #9 |

### 5.3 Phase 2: Pattern 参数扩展 [P1]

| # | Pattern ID | 需要扩展的参数 | 目的 |
|---|-----------|--------------|------|
| 1 | `ui.selection_modal` | `placeholderBehavior`, `placeholderCount` | 支持验收标准 #10 |
| 2 | `data.weighted_pool` | `stateTrackingMode`, `persistState` | 支持池状态追踪 |

### 5.4 Phase 3: Generator 扩展 [P2]

| # | Generator | 需要扩展 | 目的 |
|---|-----------|---------|------|
| 1 | TS Generator | 扩展 `generateSelectionFlowCode()` 支持 `effectMap` | 动态效果映射 |
| 2 | TS Generator | 添加状态持久化代码生成 | 支持验收标准 #9 |
| 3 | UI Generator | 扩展 `generateSelectionModalComponent()` 支持 placeholder | 支持验收标准 #10 |

### 5.5 Phase 4: 运行时补位 [P3]

| # | 补位内容 | 方式 | 优先级 |
|---|---------|------|-------|
| 1 | 效果映射表 | 人工硬编码 tier → effect | 高 |
| 2 | 客户端-服务器事件流 | 利用 CustomNetTables | 高 |
| 3 | Placeholder UI | 人工补写渲染逻辑 | 中 |
| 4 | 稀有度样式 | 人工定义 LESS 样式 | 低 |

---

## 6. Minimal Implementation Path

### 6.1 最小可行路径定义

**目标**：以最小工作量让 Talent Draw case 跑通 10 条验收标准。

### 6.2 路径步骤

```
Step 1: 创建 Pattern Drafts (Phase 1)
   ├── rule.selection_flow
   ├── effect.modifier_applier
   └── resource.basic_pool

Step 2: 扩展 Pattern 参数 (Phase 2)
   ├── ui.selection_modal.placeholderBehavior
   └── data.weighted_pool.stateTrackingMode

Step 3: Generator 路由验证 (Phase 3)
   ├── 确认 kv+ts+ui 组合路由
   └── 验证参数注入路径

Step 4: 运行时补位 (Phase 4)
   ├── 效果映射表 (tier → modifier)
   ├── CustomNetTables 状态同步
   └── Placeholder UI 渲染

Step 5: 端到端验证
   └── 运行 10 条验收标准
```

### 6.3 验收标准 vs 实现路径

| # | 验收标准 | 实现路径 | Phase |
|---|---------|---------|-------|
| 1 | IntentSchema 表达 | 字符串描述变通 | - |
| 2 | Blueprint 表达 | 现有结构足够 | - |
| 3 | Generator 产物 | 现有能力足够 | - |
| 4 | Host 写入 | 现有能力足够 | - |
| 5 | Host 启动 | 现有能力足够 | - |
| 6 | F4 触发 UI | `input.key_binding` ✅ | - |
| 7 | 三选一交互 | `rule.selection_flow` + 事件流 | Phase 1 + 4 |
| 8 | 效果应用 | `effect.modifier_applier` + 效果映射 | Phase 1 + 4 |
| 9 | 永久移除 | `resource.basic_pool` + 状态持久化 | Phase 1 + 4 |
| 10 | Placeholder UI | `ui.selection_modal` 参数扩展 | Phase 2 + 4 |

### 6.4 工作量估计

| Phase | 工作项 | 估计工作量 |
|-------|-------|-----------|
| Phase 1 | 3 个 Pattern Draft 创建 | 中 |
| Phase 2 | 2 个 Pattern 参数扩展 | 小 |
| Phase 3 | Generator 验证和扩展 | 中 |
| Phase 4 | 运行时补位 | 中 |
| Phase 5 | 端到端验证 | 小 |
| **总计** | | **中等** |

---

## 7. Risks and Deferred Items

### 7.1 风险项

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| Pattern 参数设计不合理导致 Generator 无法正确路由 | 高 | 中 | 参考 C 审计中的 Generator 代码结构设计参数 |
| 状态持久化需要 Dota2 特定知识 | 中 | 高 | 参考 CustomNetTables 文档和现有实现 |
| 三类型组合路由需要 schema 扩展 | 低 | 中 | 可先拆分为独立 realization units |
| 效果映射需要业务逻辑知识 | 低 | 低 | 先人工补写，后续 productize |

### 7.2 延迟项（明确不在 MVP 范围）

| 延迟项 | 原因 | 后续处理 |
|-------|------|---------|
| IntentSchema 结构化扩展 | 字符串描述可变通 | 后续版本 productize |
| 高级动画 | 明确不在 MVP | 后续版本 |
| 跨游戏会话持久化 | MVP 只需单局持久 | 后续版本 |
| 完整的 rollback 机制 | AGENT-EXECUTION-BASELINE 明确延迟 | 后续里程碑 |
| 完整的 regenerate 机制 | AGENT-EXECUTION-BASELINE 明确延迟 | 后续里程碑 |

### 7.3 技术债务

| 债务项 | 来源 | 后续处理 |
|-------|------|---------|
| IntentSchema 字符串描述代替结构化表达 | A 审计 G1-G8 | 后续版本 productize |
| 效果映射表硬编码 | C 审计 GAP-3 | 后续版本 productize |
| Placeholder UI 人工补写 | C 审计 GAP-5 | 后续版本 productize |
| 稀有度样式人工定义 | C 审计 GAP-7 | 后续版本 productize |

---

## 8. Final Verdict

### 8.1 Rune Weaver 当前距离让 Talent Draw case 跑通还差多少？

**评估**：**中等距离**

| 维度 | 当前状态 | 差距 |
|------|---------|------|
| IntentSchema | ⚠️ 可变通 | 小（字符串描述可接受） |
| Blueprint | ✅ 足够 | 无 |
| Pattern | ❌ 缺失 | **中**（3 个 Draft 需创建） |
| Generator | ⚠️ 部分 | 小（参数扩展） |
| Host/Runtime | ❌ 缺失 | **中**（状态持久化需实现） |

**关键差距**：
1. 3 个 Pattern Draft 需要创建
2. 2 个 Pattern 参数需要扩展
3. 状态持久化机制需要实现
4. 效果映射需要人工补位

### 8.2 第一优先级应该补什么？

**答案**：**Pattern 层**

**理由**：
1. Pattern 层是第一阻塞层
2. Pattern Draft 缺失导致 Generator 无法正确路由
3. Pattern 参数定义是后续所有工作的基础

**具体行动**：
1. 创建 `rule.selection_flow` Pattern Draft
2. 创建 `effect.modifier_applier` Pattern Draft（完整参数定义）
3. 创建 `resource.basic_pool` Pattern Draft

### 8.3 接下来是否应该进入代码实现阶段？

**答案**：**是，但需要按顺序**

**前提条件**：
1. ✅ IntentSchema 可以变通（字符串描述）
2. ✅ Blueprint 结构足够
3. ❌ Pattern Draft 缺失（需要先补）

**进入条件**：
- 完成 Phase 1（Pattern Draft 创建）
- 完成 Phase 2（Pattern 参数扩展）

### 8.4 如果进入，实现顺序是什么？

**实现顺序**：

```
1. Pattern Draft 创建
   ├── rule.selection_flow
   ├── effect.modifier_applier
   └── resource.basic_pool

2. Pattern 参数扩展
   ├── ui.selection_modal.placeholderBehavior
   └── data.weighted_pool.stateTrackingMode

3. Generator 验证
   ├── 确认路由路径
   └── 验证参数注入

4. 运行时实现
   ├── 效果映射表
   ├── CustomNetTables 状态同步
   └── Placeholder UI

5. 端到端验证
   └── 10 条验收标准
```

---

## Appendix A: Gap 跨层映射

| Case 需求 | IntentSchema Gap | Blueprint Gap | Pattern Gap | Generator Gap | Runtime Gap |
|----------|-----------------|---------------|-------------|---------------|-------------|
| 选中永久移除 | G4, G5 | GAP-B3 | `rule.selection_flow` Draft 缺失 | GAP-1 | 状态持久化 |
| 未选中返回池 | G5 | GAP-B3 | `rule.selection_flow` Draft 缺失 | - | - |
| 池不足时 placeholder | G6 | GAP-B1 | `ui.selection_modal` 参数缺失 | GAP-5 | - |
| 效果应用 | G7 | GAP-B4 | `effect.modifier_applier` 参数不足 | GAP-3 | 效果映射 |
| 稀有度权重 | G2 | - | - | - | - |
| 状态追踪 | G3 | GAP-B2 | `resource.basic_pool` Draft 缺失 | GAP-1 | 状态持久化 |

## Appendix B: 验收标准完整映射

| # | 验收标准 | A 评估 | B 评估 | C 评估 | 最终状态 |
|---|---------|--------|--------|--------|---------|
| 1 | IntentSchema 表达 | ⚠️ 可变通 | N/A | N/A | ✅ 可接受 |
| 2 | Blueprint 表达 | N/A | ✅ 充足 | N/A | ✅ 通过 |
| 3 | Generator 产物 | N/A | N/A | ✅ | ✅ 通过 |
| 4 | Host 写入 | N/A | N/A | ✅ | ✅ 通过 |
| 5 | Host 启动 | N/A | N/A | N/A | ✅ 通过 |
| 6 | F4 触发 UI | ✅ | ✅ | ✅ | ✅ 通过 |
| 7 | 三选一交互 | ⚠️ | ✅ | ⚠️ GAP-2 | ⚠️ 需补 |
| 8 | 效果应用 | ⚠️ G7 | ⚠️ GAP-B4 | ⚠️ GAP-3 | ⚠️ 需补 |
| 9 | 永久移除 | ❌ G4, G5 | ⚠️ GAP-B3 | ❌ GAP-1 | ❌ 需补 |
| 10 | Placeholder UI | ❌ G6 | ⚠️ GAP-B1 | ⚠️ GAP-5 | ⚠️ 需补 |

## Appendix C: 参考文档

- [CANONICAL-CASE-TALENT-DRAW.md](./CANONICAL-CASE-TALENT-DRAW.md) - 唯一 case truth
- [A-intentschema-audit.md](./A-intentschema-audit.md) - IntentSchema 审计
- [B-blueprint-audit.md](./B-blueprint-audit.md) - Blueprint 审计
- [C-generator-gap-audit.md](./C-generator-gap-audit.md) - Generator Gap 审计
- [AGENT-EXECUTION-BASELINE.md](../AGENT-EXECUTION-BASELINE.md) - Agent 执行基线
- [CURRENT-EXECUTION-PLAN.md](../CURRENT-EXECUTION-PLAN.md) - 当前执行计划

---

*End of Consolidated Report*

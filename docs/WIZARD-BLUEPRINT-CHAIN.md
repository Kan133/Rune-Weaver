# Wizard -> Blueprint 最小链路设计

## 1. 文档目的

本文档定义 Rune Weaver 中 `Wizard -> IntentSchema -> Blueprint` 的最小链路设计。

它回答三个问题：
1. IntentSchema 如何映射到 Blueprint
2. 哪些字段直接传递，哪些需要规则补全
3. 链路中的缺口和假设是什么

---

## 2. 链路总览

```
自然语言需求
    ↓
[Wizard Layer]
    ↓ (LLM 生成 + 归一化)
IntentSchema
    ↓ (Builder 转换)
Blueprint
    ↓ (Pattern Resolution)
AssemblyPlan
    ↓ (Assembler)
Host Output
```

---

## 3. IntentSchema -> Blueprint 输入输出边界

### 3.1 直接映射字段（Direct Mapping）

| IntentSchema 字段 | Blueprint 字段 | 说明 |
|------------------|----------------|------|
| `version` | `version` | 版本透传 |
| `host` | `host` | 宿主描述透传 |
| `request.userGoal` | `summary.description` | 目标描述 |
| `classification.intentKind` | `summary.sourceIntentKind` | 意图类型 |
| `classification.confidence` | `summary.confidence` | 置信度 |
| `constraints.hard` | `validationContracts` | 硬约束转为验证合约 |

### 3.2 规则转换字段（Rule-based Transform）

| IntentSchema | Blueprint | 转换规则 |
|--------------|-----------|----------|
| `requirements.functional[]` | `modules[]` | 每个 functional req 生成一个模块 |
| `requirements.interaction[]` | `modules[]` + `connections[]` | 交互需求生成输入模块和连接 |
| `requirements.ui.surfaces[]` | `modules[]` + `uiPlan` | UI 需求生成 UI 模块和 UI 计划 |
| `requirements.data.collections[]` | `modules[]` (data_pool) | 数据需求生成数据模块 |

### 3.3 需要补全的字段（Builder Inference）

| Blueprint 字段 | 补全来源 | 补全规则 |
|---------------|----------|----------|
| `id` | 自动生成 | `{intentKind}_{timestamp}` |
| `summary.name` | `request.userGoal` | 截断前20字符 |
| `modules[].id` | `requirements[].id` | 添加前缀 `mod_` |
| `modules[].kind` | `functional[].type` | 类型映射表 |
| `modules[].preferredPatterns` | `modules[].kind` | Pattern 建议表 |
| `connections[]` | 模块类型推断 | 输入→流程→UI 的自动连接 |

---

## 4. 类型映射规则

### 4.1 FunctionalRequirement.type -> BlueprintModule.kind

```typescript
const typeToKind: Record<string, BlueprintModule['kind']> = {
  "effect": "effect",
  "resource_system": "resource_system",
  "input_binding": "input_binding",
  "selection_flow": "selection_flow",
  "data_pool": "data_pool",
  "rule_flow": "rule_engine",
  "ui_surface": "ui_surface",
  "progression": "modifier",
  "other": "custom",
};
```

### 4.2 Module.kind -> Pattern 建议

```typescript
const kindToPattern: Record<string, string> = {
  "input_binding": "input.key_binding",
  "data_pool": "data.weighted_pool",
  "selection_flow": "rule.selection_flow",
  "effect": "effect.dash",          // 注意：这是默认，实际应根据 effect 类型
  "resource_system": "resource.basic_pool",
  "ui_surface": "ui.selection_modal", // 注意：根据 surface.type 变化
};
```

---

## 5. 模块连接规则

### 5.1 自动连接策略

Builder 按以下规则自动推断模块间连接：

```
输入模块 (input_binding) 
    → 流程/效果模块 (selection_flow, effect, rule_engine)
    [连接类型: event]

数据模块 (data_pool)
    → 流程/效果模块
    [连接类型: data]

流程/效果模块
    → UI 模块 (ui_surface)
    [连接类型: visual]
```

### 5.2 连接规则的限制

**当前版本不处理**：
- 复杂的条件分支连接
- 循环依赖
- 多对多连接（只处理一对多）
- 动态连接（运行时决定）

---

## 6. 尚未自动化的缺口

### 6.1 当前缺口清单

| 缺口 | 位置 | 影响 | 临时处理 | 长期方案 |
|------|------|------|----------|----------|
| Effect 类型细分 | Builder.suggestPatterns | effect.dash 是默认，无法区分 effect 具体类型 | 默认使用 effect.dash | 需要更多 functional 参数或 sub-type |
| UI 类型细分 | uiSurfaceToModule | 所有 UI 都建议 ui.selection_modal | 根据 surface.type 建议对应 pattern | 完善 UI 类型到 Pattern 的映射 |
| 模块参数深度映射 | functionalReqToModule | parameters 直接透传，无转换 | 直接透传 | 需要参数规范映射表 |
| 连接条件 | buildConnections | 无条件连接所有匹配模块 | 全部连接 | 需要约束条件判断 |
| 资源依赖推断 | buildModules | 不会自动添加资源消耗模块 | 手动在 functional 中声明 | 需要资源分析规则 |

### 6.2 需要人工假设的字段

Builder 在以下场景需要假设：

1. **模块职责描述**
   - 来源：`functional.summary`
   - 假设：summary 足以描述职责
   - 风险：可能过于简化

2. **Pattern 优先级**
   - 来源：`kind`
   - 假设：每种 kind 有默认首选 Pattern
   - 风险：可能不符合具体需求

3. **连接方向**
   - 来源：模块类型推断
   - 假设：输入→流程→UI 是标准流向
   - 风险：复杂流程可能需要反向或双向

---

## 7. 通用性保持设计

### 7.1 避免领域专用 Blueprint

正确的做法：
```typescript
// ✅ 通过参数表达领域差异
{
  id: "mod_selection",
  kind: "selection_flow",
  params: { 
    choiceCount: 3,
    domainContext: "talent" // 仅影响 UI 文案，不改变结构
  },
  preferredPatterns: [{ id: "rule.selection_flow" }]
}
```

错误的做法：
```typescript
// ❌ 领域专用的 Blueprint 结构
{
  id: "mod_talent_selection",  // 领域专用命名
  kind: "talent_selection_flow", // 领域专用类型
  // ...
}
```

### 7.2 Selection 家族的 Blueprint 示例

**天赋三选一**、**卡牌三选一**、**装备升级三选一** 的 Blueprint 结构应基本一致：

```typescript
// 三个 case 的 Blueprint 都应包含：
modules: [
  { kind: "input_binding", ... },     // 不同 key
  { kind: "data_pool", ... },          // 不同 pool 内容
  { kind: "selection_flow", ... },     // 相同结构
  { kind: "ui_surface", ... },         // 相同结构
]
connections: [
  { from: "input", to: "selection", type: "event" },
  { from: "data", to: "selection", type: "data" },
  { from: "selection", to: "ui", type: "visual" },
]
```

差异仅在：
- `params` 中的参数值（key、pool 内容）
- `preferredPatterns` 可能额外包含资源消耗 Pattern（卡牌 case）

---

## 8. 验证点

### 8.1 Blueprint 级验证

| 验证项 | 检查内容 | 验证器 |
|--------|----------|--------|
| 模块完整性 | 每个模块有 id/kind/summary | BlueprintValidator |
| 连接合法性 | from/to 指向存在的模块 | BlueprintValidator |
| Pattern 建议有效性 | preferredPatterns 指向存在的 Pattern | PatternResolver |
| UI 一致性 | uiPlan 与 ui_surface 模块一致 | BlueprintValidator |
| 约束覆盖 | validationContracts 覆盖 constraints | BlueprintValidator |

### 8.2 Ready for Assembly 检查

Blueprint 可进入 Assembly 阶段的条件：

- [ ] 所有模块有明确的 kind
- [ ] 所有模块有至少一个 preferredPattern
- [ ] 连接无悬空（所有 from/to 有效）
- [ ] 有明确的 host 绑定信息
- [ ] validationContracts 无 error 级别问题

---

## 9. CLI 接口设计

### 9.1 命令设计

```bash
# 从自然语言直接生成 Blueprint
rune-weaver blueprint "做一个按Q键的冲刺技能"

# 从已保存的 IntentSchema 生成 Blueprint
rune-weaver blueprint --from tmp/intent-schema.json

# 输出到文件
rune-weaver blueprint "..." --output tmp/blueprint.json

# JSON 模式
rune-weaver blueprint "..." --json

# 验证 Blueprint
rune-weaver blueprint validate tmp/blueprint.json
```

### 9.2 输出格式

终端摘要模式：
```
📋 Blueprint: micro_feature_a3f2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
来源意图: micro-feature (置信度 95%)
模块数: 3
连接数: 2

🔧 模块:
  • mod_input_q (input_binding)
    推荐 Pattern: input.key_binding
  • mod_func_0 (effect)
    推荐 Pattern: effect.dash
  • mod_ui_key_hint (ui_surface)
    推荐 Pattern: ui.key_hint

🔗 连接:
  input_q → func_0 (event)
  func_0 → ui_key_hint (visual)

✅ Ready for Assembly: 是
```

---

## 10. 与现有代码的对应

| 设计组件 | 代码位置 | 状态 |
|----------|----------|------|
| IntentSchema 类型 | `core/schema/types.ts` | ✅ 已存在 |
| Blueprint 类型 | `core/schema/types.ts` | ✅ 已存在 |
| BlueprintBuilder | `core/blueprint/builder.ts` | ✅ 已存在 |
| Blueprint 验证 | `core/blueprint/validator.ts` | ⚠️ 需增强 |
| CLI 入口 | `apps/cli/blueprint-cli.ts` | 🆕 需新增 |

---

## 11. 下一步工作

1. **T045**: 实现 Blueprint CLI 入口
2. **T046**: 增强 Blueprint 验证和评审产物
3. **未来**: 根据实际运行数据优化映射规则

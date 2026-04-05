# Blueprint 验证与评审指南

## 概述

本文档定义 Blueprint 的结构验证规则和评审标准，确保从 IntentSchema 生成的 Blueprint 符合装配要求。

## 验证阶段

Blueprint 验证分为以下几个阶段：

1. **结构验证 (Structural Validation)**
2. **语义验证 (Semantic Validation)**
3. **统计检查 (Statistical Analysis)**

---

## 1. 结构验证

### 1.1 基本信息验证

| 检查项 | 级别 | 说明 |
|--------|------|------|
| version | Error | Blueprint 必须有版本号 |
| id | Error | Blueprint 必须有唯一标识符 |
| summary | Error | Blueprint 必须有描述信息 |
| summary.name | Warning | 建议添加名称便于识别 |
| host | Error | 必须指定目标宿主环境 |

### 1.2 模块验证

#### 必填字段

| 检查项 | 级别 | 说明 |
|--------|------|------|
| 模块存在性 | Error | 至少需要一个模块 |
| module.id | Error | 每个模块必须有唯一 ID |
| 模块 ID 唯一性 | Error | 不允许重复模块 ID |

#### 建议字段

| 检查项 | 级别 | 说明 |
|--------|------|------|
| module.summary | Warning | 模块描述有助于理解 |
| module.responsibilities | Warning | 明确模块职责边界 |

### 1.3 连接验证

| 检查项 | 级别 | 说明 |
|--------|------|------|
| connection.id | Error | 连接必须有唯一 ID |
| 连接 ID 唯一性 | Error | 不允许重复连接 ID |
| connection.from | Error | 必须指定来源模块 |
| connection.to | Error | 必须指定目标模块 |
| from 模块存在性 | Error | 来源模块必须在 modules 中 |
| to 模块存在性 | Error | 目标模块必须在 modules 中 |
| 自连接 | Warning | 模块连接到自己需要检查 |

#### 连接类型标准

推荐使用的标准连接类型：

- `data` - 数据传输
- `event` - 事件触发
- `control` - 控制流
- `state` - 状态同步
- `visual` - 视觉更新

非标准类型会触发 Warning，但不会被阻止。

### 1.4 UI 计划验证

| 场景 | 检查项 | 级别 |
|------|--------|------|
| 有 UI 模块但无 uiPlan | Error | 必须为 UI 模块提供计划 |
| 有 uiPlan 但无 UI 模块 | Warning | 检查是否需要 UI 模块 |
| requiredSurfaces 为空 | Warning | 添加 UI 界面描述 |
| surface.id 缺失 | Error | 每个 surface 必须有 ID |
| requiresDesignSpec 但无 designSpecRef | Warning | 补充设计规格引用 |

---

## 2. 语义验证

### 2.1 依赖关系验证

| 检查项 | 级别 | 说明 |
|--------|------|------|
| 孤立模块 | Warning | 无连接的模块需检查必要性 |
| 循环依赖 | Warning | 可能存在逻辑循环 |

### 2.2 模块链完整性

对于典型的技能/系统 Blueprint，期望的结构：

```
[input_binding] → [flow/data] → [effect]
                      ↓
                  [ui_surface]
```

验证检查：
- 是否有输入模块（input_binding）
- 是否有效果模块（effect）或数据处理模块
- UI 模块是否与主流程连接

---

## 3. 统计检查

### 3.1 模块数量

| 指标 | 阈值 | 级别 | 建议 |
|------|------|------|------|
| 模块数量 | > 10 | Warning | 拆分为多个 Blueprint |
| 依赖深度 | > 5 | Warning | 简化依赖关系 |

### 3.2 模块类型分布

健康的 Blueprint 应该包含：

- **输入模块**: 至少 1 个（除非被动系统）
- **效果/处理模块**: 至少 1 个
- **UI 模块**: 根据需求（0-N 个）

### 3.3 连接密度

计算连接密度：
```
density = connections.length / modules.length
```

| 密度 | 评价 |
|------|------|
| < 0.5 | 模块过于分散 |
| 0.5 - 2.0 | 正常范围 |
| > 2.0 | 连接复杂，需要检查 |

---

## 4. 评审清单

### 4.1 创建者自查清单

在提交 Blueprint 前，请确认：

- [ ] 所有 Error 级别问题已解决
- [ ] 每个模块都有明确的责任边界
- [ ] 连接关系符合逻辑流向
- [ ] UI 计划与实际模块对应
- [ ] 模块 ID 命名清晰（如 `dash_input`, `dash_effect`）

### 4.2 评审者检查清单

- [ ] 结构验证通过（valid = true）
- [ ] 模块分解合理，符合单一职责原则
- [ ] 连接类型使用正确
- [ ] 统计指标在合理范围内
- [ ] 与 IntentSchema 的意图一致

---

## 5. 常见问题与修复

### Q1: "存在 UI 模块，但缺少 uiPlan"

**原因**: Blueprint 包含 `ui_surface` 类型的模块，但没有 `uiPlan` 字段。

**修复**:
```typescript
{
  uiPlan: {
    requiredSurfaces: [
      { id: "selection_modal", type: "modal", purpose: "选择界面" }
    ]
  }
}
```

### Q2: "模块 'xxx' 没有与其他模块连接"

**原因**: 模块定义了但未在 connections 中引用。

**修复**: 添加适当的连接，或删除不必要的模块。

### Q3: "可能存在循环依赖"

**原因**: 模块 A → B → C → A 形成循环。

**修复**: 
- 检查逻辑是否真的需要循环
- 考虑使用事件机制解耦
- 重新设计模块边界

---

## 6. 验证 API

### validateBlueprint

```typescript
import { validateBlueprint } from "./core/blueprint/validator.js";

const result = validateBlueprint(blueprint);

// result.valid: boolean
// result.errors: ValidationIssue[]
// result.warnings: ValidationIssue[]
// result.stats: BlueprintStats
```

### CLI 验证

```bash
# 验证 Blueprint 文件
npm run cli -- blueprint validate --from tmp/blueprint.json

# JSON 输出
npm run cli -- blueprint validate --from tmp/blueprint.json --json
```

---

## 7. 验证结果解读

### 结果状态

| valid | errors | warnings | 含义 |
|-------|--------|----------|------|
| true | 0 | 0 | ✅ 完全通过，可直接装配 |
| true | 0 | N | ⚠️ 通过，但有建议优化项 |
| false | N | - | ❌ 未通过，需修复错误 |

### 问题严重度

- **Error**: 阻止装配的结构性问题
- **Warning**: 建议优化，但不阻止装配

---

## 8. 与 Assembly 的衔接

只有通过验证（valid = true）的 Blueprint 才能进入 Assembly 阶段：

```
IntentSchema → Blueprint → [验证] → AssemblyPlan → WritePlan → 代码生成
                              ↓
                         valid = true ? 继续
                         valid = false ? 返回修复
```

---

## 附录：验证规则版本

- **Version**: 0.1
- **Last Updated**: 2026-04-05
- **Applies to**: Blueprint v0.1

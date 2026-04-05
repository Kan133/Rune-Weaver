# ⚠️ 此文档已归档 (ARCHIVED)
# Rune Weaver Agent Bootstrap

## 1. 文档目的

本文档是给后续 agent 的直接执行说明。

它不再讨论产品愿景，而是明确：

- 当前代码库应先搭什么骨架
- 第一阶段先实现哪些对象和流程
- 每个里程碑如何验收
- 哪些事情现在绝对不要做

如果 agent 只看一份文档就开始动手，优先看这份。

---

## 2. 当前任务总目标

当前阶段的唯一总目标是：

`建立 Rune Weaver 的最小可运行主链路，并以 Dota2 作为首个宿主完成 MVP 验证。`

主链路定义为：

`CLI -> Wizard -> IntentSchema -> Blueprint -> Pattern Resolution -> AssemblyPlan -> Dota2 Adapter -> Validation`

任何工作如果不能明显推进这条链路，应降低优先级。

---

## 3. 当前仓库状态判断

从现有文档看，项目目前处于“概念已收敛，但实现尚未重建”的状态。

因此当前 agent 的职责不是修修补补旧实现，而是：

- 按新文档约束建立新的骨架
- 用最小实现验证关键边界
- 保持后续可扩张，但不做过度抽象

---

## 4. 开工前必须遵守的文档基线

开始开发前，agent 必须以以下文档为基准：

- [PRODUCT.md](/D:/Rune%20Weaver/PRODUCT.md)
- [ARCHITECTURE.md](/D:/Rune%20Weaver/ARCHITECTURE.md)
- [SCHEMA.md](/D:/Rune%20Weaver/SCHEMA.md)
- [DEVELOPMENT-GUIDE.md](/D:/Rune%20Weaver/DEVELOPMENT-GUIDE.md)
- [PATTERN-SPEC.md](/D:/Rune%20Weaver/PATTERN-SPEC.md)
- [PATTERN-AUTHORING-GUIDE.md](/D:/Rune%20Weaver/PATTERN-AUTHORING-GUIDE.md)

如果代码设计与这些文档冲突，优先修改代码方向，而不是绕开文档。

---

## 5. 第一阶段推荐目录骨架

当前不要求一次建成复杂 monorepo，但至少应建立职责清楚的基础目录。

推荐最小骨架：

```text
core/
  schema/
  blueprint/
  wizard/
  pipeline/
  validation/
  patterns/

adapters/
  dota2/
    patterns/
    assembler/
    validator/
    scanner/
    ui/

apps/
  cli/

examples/
  micro-feature/
  standalone-system/
  cross-system/
```

如果你更倾向 package 化，也可以先用：

```text
packages/
  core-schema/
  core-blueprint/
  core-wizard/
  core-pipeline/
  adapter-dota2/
  app-cli/
```

关键不是目录名，而是不要把 Core 与 Dota2 实现混在一起。

---

## 6. 第一批必须创建的对象

第一批代码层面必须建立的对象如下。

## 6.1 Schema Layer

必须实现：

- `HostDescriptor`
- `IntentSchema`
- `IntentClassification`
- `IntentRequirements`
- `IntentConstraints`
- `CompletionState`
- `ValidationIssue`

目标：

- 让 Wizard 有稳定输出目标

## 6.2 Blueprint Layer

必须实现：

- `Blueprint`
- `BlueprintModule`
- `BlueprintConnection`
- `UIPlan`
- `ValidationContract`
- `PatternReference`

目标：

- 让实现编排层有稳定结构

## 6.3 Assembly Bridge

必须实现：

- `AssemblyPlan`
- `ResolvedPatternBinding`
- `GenerationTarget`
- `ExtensionPoint`

目标：

- 让 Pattern Resolution 和 Adapter Assembly 之间有明确桥接层

## 6.4 Validation Layer

必须实现：

- `validateIntentSchema()`
- `validateBlueprint()`
- `ValidationIssue[]` 统一输出

目标：

- 让系统从第一天开始就有护栏

---

## 7. 第一阶段必须实现的最小流程

在对象定义完成后，第一阶段至少要实现下面这个流程：

### Step 1: CLI 输入

允许用户输入一段自然语言需求。

### Step 2: Intent Classification

系统对需求进行初步分类：

- `micro-feature`
- `standalone-system`
- `cross-system-composition`
- `unknown`

### Step 3: Wizard Question Pass

不是要求做出完整智能问答系统，但至少要实现：

- 信息不足时追问
- 信息够用时停止追问
- 输出 `IntentSchema`

### Step 4: Schema Validation

输出 `IntentSchema` 后立刻校验：

- 是否 ready for blueprint
- 是否还有 blocking issue

### Step 5: Blueprint Build

将 `IntentSchema` 转换为最小 `Blueprint`。

### Step 6: Blueprint Validation

校验：

- 是否有模块
- 是否有连接
- 是否有明显缺项

### Step 7: Pattern Resolution

给每个关键模块分配 Pattern。

### Step 8: AssemblyPlan Build

生成最小 `AssemblyPlan`。

此时即使还没完整输出 Dota2 代码，也算主链路前半段成立。

---

## 8. 第一批 Pattern 范围

当前不要急着建立大量 Pattern。

只需要先做能够支撑三个 MVP 用例的最小 Pattern 集。

建议首批 Pattern：

### 输入相关

- `input.key_binding`

### 数据相关

- `data.weighted_pool`

### 规则相关

- `rule.selection_flow`

### UI 相关

- `ui.selection_modal`
- `ui.key_hint`
- `ui.resource_bar`

### 效果相关

- `effect.dash`
- `effect.resource_consume`

### 系统相关

- `resource.basic_pool`

首批 Pattern 不求完美，但必须符合 `PATTERN-SPEC.md`。

---

## 9. 三个固定 MVP 用例

所有 agent 都应围绕这三个固定用例开发，不允许每个人随意定义自己的 demo。

## 用例 A：微功能

建议示例：

- 一个按键触发的小型位移或效果技能

最低要求：

- 有输入
- 有效果
- 无复杂 UI 依赖

目的：

- 验证最小能力链路

## 用例 B：独立系统

建议示例：

- 三选一天赋抽取系统

最低要求：

- 有数据池
- 有选择流程
- 有 UI 需求

目的：

- 验证系统级蓝图编排能力

## 用例 C：跨系统组合

建议示例：

- 输入 + 资源 + 效果 + UI 联动功能

最低要求：

- 至少包含 3 类模块
- 至少有 2 条连接

目的：

- 验证 Blueprint 的组合表达能力

---

## 10. 每个里程碑的明确交付

## Milestone 1: Core Models Ready

必须交付：

- Schema 类型定义
- Blueprint 类型定义
- AssemblyPlan 类型定义
- ValidationIssue 类型定义

验收标准：

- [ ] 存在明确的类型文件
- [ ] 能构造合法示例
- [ ] 能构造非法示例
- [ ] Validator 可产出统一问题格式

## Milestone 2: Wizard to Schema Ready

必须交付：

- CLI 输入路径
- 分类器
- Wizard 基础追问逻辑
- IntentSchema 输出

验收标准：

- [ ] 微功能请求可生成 Schema
- [ ] 独立系统请求可生成 Schema
- [ ] 跨系统组合请求可生成 Schema
- [ ] 信息不足时会追问
- [ ] 信息足够时 `isReadyForBlueprint = true`

## Milestone 3: Schema to Blueprint Ready

必须交付：

- Blueprint Builder
- Blueprint Validator

验收标准：

- [ ] 三个固定用例都能生成 Blueprint
- [ ] Blueprint 至少包含 modules 与 connections
- [ ] Blueprint 校验失败时返回结构化问题

## Milestone 4: Pattern Resolution Ready

必须交付：

- PatternMeta
- 最小 Pattern Catalog
- Pattern Resolver
- AssemblyPlan Builder

验收标准：

- [ ] Blueprint 关键模块可解析到 Pattern
- [ ] 缺 Pattern 时不静默失败
- [ ] 能输出 `AssemblyPlan`

## Milestone 5: Dota2 Adapter Ready

必须交付：

- Dota2 Pattern 实现骨架
- Dota2 Assembler 骨架
- Dota2 Validator 骨架

验收标准：

- [ ] 至少一个用例可进入 Dota2 Adapter
- [ ] 输出结果有明确 target 列表
- [ ] 宿主侧验证能运行并给出报告

## Milestone 6: UI Branch Ready

必须交付：

- UI need detection
- UIDesignSpec 基础生成
- Dota2 UI adapter hook

验收标准：

- [ ] 独立系统用例能分出 UI 规格层
- [ ] UI 不再依赖主 assembler 硬编码布局

---

## 11. 验证标准如何确定

你的问题是：agent 开发后的验证标准该如何确定？

建议按下面这套固定方法确定。

## 11.1 以“是否推进主链路”为第一判断标准

如果一个改动不能让以下链路更完整、更稳定：

`CLI -> Wizard -> Schema -> Blueprint -> Pattern Resolution -> AssemblyPlan -> Dota2 Adapter -> Validation`

它的优先级就应该下降。

## 11.2 以“是否维护边界”为第二判断标准

每次交付都要检查：

- Core 是否被 Dota2 私货污染
- Schema 是否被实现细节污染
- Blueprint 是否被模板细节污染
- UI 是否回流为硬编码
- Gap Fill 是否被提前滥用

## 11.3 以“是否可重复通过固定用例”为第三判断标准

每个里程碑至少要在三个固定用例上重复验证。

没有固定用例回归，就无法知道系统是否真的进步。

---

## 12. 推荐的交付报告模板

每个 agent 完成一次开发后，建议按下面格式汇报：

```md
## 本次目标

## 修改范围

## 新增或完成的对象

## 主链路推进情况
- CLI:
- Wizard:
- Schema:
- Blueprint:
- Pattern Resolution:
- AssemblyPlan:
- Dota2 Adapter:
- Validation:

## 验收结果
- 结构标准:
- 流程标准:
- 质量标准:

## 三个固定用例结果
- 用例A:
- 用例B:
- 用例C:

## 已知风险

## 下一步建议
```

这样后续 agent 接手时上下文会稳定得多。

---

## 13. 当前阶段禁止事项

以下事情在当前阶段明确禁止优先做：

- 提前做 code-level gap fill
- 把 Pattern 写成一堆无元数据模板
- 直接从自然语言生成 Dota2 文件
- 为了“看起来能跑”而绕过 Schema / Blueprint / AssemblyPlan
- 提前投入大型编辑器
- 为未来多宿主过度抽象，影响当前 Dota2 MVP 落地

---

## 14. 第一轮建议的具体任务拆分

如果现在就让 agent 开始开发，我建议第一轮只做下面 4 个任务：

### 任务 1

实现 `core/schema` 和 `core/validation` 的最小类型与校验。

### 任务 2

实现 `core/blueprint` 和 `core/pipeline` 的最小 builder。

### 任务 3

实现 `apps/cli` 的最小 Wizard 主流程。

### 任务 4

实现 `adapters/dota2` 的最小 Pattern Catalog 与 AssemblyPlan 消费骨架。

这 4 个任务完成后，再进入下一轮细化。

---

## 15. 当前结论

对于后续 agent，当前最重要的执行准则可以压缩成一句话：

`优先建立中间层和主链路，不要用宿主实现细节或自由代码生成绕过系统设计。`

如果一项工作不能强化：

- `IntentSchema`
- `Blueprint`
- `AssemblyPlan`
- `Validator`

那它大概率不是当前阶段最值得做的事。

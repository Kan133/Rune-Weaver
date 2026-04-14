# 系统总架构（中文）

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: on-phase-change
> Last verified: 2026-04-14
> Read when: discussing long-range product architecture or future system layers beyond the current shipped baseline
> Do not use for: current execution layering, current milestone scope, or current authority boundaries

本文描述的是长期目标架构，而不是当前 baseline truth。
当前执行链与当前 authority boundary 仍以 [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md) 等 baseline docs 为准。

## 目的

本文用于描述 Rune Weaver 的**最终产品总架构**。

它回答的不是“当前哪条执行链已经实现”，而是：

- Rune Weaver 最终应由哪些层组成
- 用户如何进入系统
- LLM、Wizard、治理层、宿主层分别处于什么位置
- 数据如何在产品层、规划层、执行层、状态层之间流动

这份文档是总架构文档。

如需查看当前已实现/已验证的执行链，请参考：

- [ARCHITECTURE.md](D:/Rune%20Weaver/docs/ARCHITECTURE.md)

如需查看阶段路线，请参考：

- [PHASE-ROADMAP-ZH.md](D:/Rune%20Weaver/docs/PHASE-ROADMAP-ZH.md)
- [ROADMAP.md](D:/Rune%20Weaver/docs/ROADMAP.md)

如需查看产品定位，请参考：

- [PRODUCT.md](D:/Rune%20Weaver/docs/PRODUCT.md)

---

## 一句话定义

**Rune Weaver 的最终形态，不是一个“更会生成代码的聊天工具”，而是一个由产品入口、受控规划、功能治理、宿主落地和生命周期状态共同组成的 Feature Construction Platform。**

它的核心不是“让 LLM 拼代码块”，而是：

- 让用户提出功能目标
- 让系统提出受控结构方案
- 让系统在写入前承担治理责任
- 让功能以可审阅、可回退、可演进的方式进入活项目

---

## 总体分层

Rune Weaver 的最终总架构，建议稳定为六层。

### Layer 1：Product Interface

这是用户看见的产品层。

包含：

- Workbench
- Main Wizard
- UI Wizard
- Review / Confirm Surface
- Feature Management Surface

这一层负责：

- 接住用户需求
- 把复杂结构翻译成可输入、可确认、可理解的产品界面

这一层不应：

- 直接决定宿主实现细节
- 直接执行写入
- 直接暴露底层宿主术语作为默认产品语言

### Layer 2：Intent And Intake

这是从用户输入进入正式结构的过渡层。

包含：

- User Request
- Intake Session
- UI Intake Bundle
- Scene / Map Reference Input
- IntentSchema

这一层负责：

- 把自然语言和结构化补问结果转成正式输入对象
- 明确缺失信息与待确认点

这一层不应：

- 直接决定最终 Blueprint
- 直接决定 host realization

### Layer 3：Planning And Proposal

这是结构提案层。

包含：

- Blueprint Proposal
- Blueprint LLM
- Structured Experience Retrieval
- Contract Gating
- Final Blueprint

这一层负责：

- 根据输入与经验层提出结构方案
- 在 proposal 与 final blueprint 之间建立清晰边界

这一层的关键原则是：

- LLM 只能提案
- final Blueprint 必须经过 contract / governance / host checks

### Layer 4：Governance

这是 Rune Weaver 与普通 vibe coding 工具真正拉开差距的层。

包含：

- Feature Identity
- Ownership Model
- Integration Point Registry
- Conflict Governance
- Feature Review
- Lifecycle Impact Checks

这一层负责：

- 判断一个功能是否应被允许写入
- 判断它会不会与已有功能冲突
- 判断写入后是否仍可 update / regenerate / rollback

这一层不应：

- 退化成纯展示层
- 只在 runtime 出错后才出现

### Layer 5：Host Realization And Execution

这是正式执行链。

包含：

- Pattern Resolution
- AssemblyPlan
- HostRealizationPlan
- GeneratorRoutingPlan
- Generators
- WritePlan
- Write Executor

这一层负责：

- 把最终 Blueprint 落成宿主可接受的 artifacts

这一层不应：

- 重做意图理解
- 重做规划判断
- 越权改写治理结论

### Layer 6：Validation And State

这是结果确认与生命周期状态层。

包含：

- Static Validation
- Host Validation
- Runtime-facing Validation
- Validation Report
- Workspace State
- Feature Record
- Rollback / Regenerate State

这一层负责：

- 说明系统做了什么
- 说明结果是否可接受
- 保存 feature 生命周期语义

---

## 两条主数据流

Rune Weaver 最终应同时存在两条主数据流：

### 1. 用户与规划主流

`User Request -> Workbench -> Main Wizard -> optional UI Wizard / optional scene reference intake -> IntentSchema -> Blueprint Proposal -> Contract/Governance/Host Checks -> Final Blueprint`

这条流负责：

- 让需求进入系统
- 让结构被提出、审查、确认

### 2. 宿主执行主流

`Final Blueprint -> Pattern Resolution -> AssemblyPlan -> HostRealizationPlan -> GeneratorRoutingPlan -> Generators -> WritePlan -> Write Executor -> Validation Report -> Workspace State / Feature Record`

这条流负责：

- 把已确认结构变成正式生成物
- 记录其结果与生命周期影响

---

## 关键对象

最终总架构里，至少应长期稳定这几类对象：

- `UserRequest`
- `IntakeSession`
- `UIIntakeBundle`
- `IntentSchema`
- `BlueprintProposal`
- `Blueprint`
- `AssemblyPlan`
- `HostRealizationPlan`
- `GeneratorRoutingPlan`
- `WritePlan`
- `ValidationReport`
- `FeatureRecord`
- `WorkspaceState`

这些对象的意义是：

- 产品层、规划层、执行层、状态层各自有稳定边界
- 不把所有责任挤进一个大对象里

---

## LLM 在总架构中的位置

LLM 的最终位置应当被严格限制在：

- `Intent / Intake` 辅助
- `Blueprint Proposal` 辅助
- `Structured Experience` 检索辅助
- `Review` 解释辅助

LLM 不应成为：

- final Blueprint authority
- host realization authority
- write authority
- lifecycle / legality 最终裁决者

一句话：

- **LLM 负责提案与解释**
- **系统 contract 负责裁决与执行**

---

## Wizard 在总架构中的位置

最终应有两个层级的 Wizard：

### Main Wizard

负责：

- 整体需求 intake
- 缺参补问
- 判断是否进入专项分支

### UI Wizard

负责：

- UI 结构澄清
- interaction intensity
- information density
- style direction

它是 Main Wizard 下的专项 intake 分支，不是独立产品线。

---

## Gap Fill 在总架构中的位置

Gap Fill 应位于：

- `Planning` 与 `Execution` 之间的低风险补全辅助层
- 或 `Review / Confirm` 之后的受控局部补全层

它的前提必须是：

- 主结构已确定

它不应承担：

- 新机制设计
- 新 host rule
- 新 integration point

---

## Structured Experience Layer 的位置

经验层不应是裸 RAG，而应是：

- 带成熟度
- 带宿主边界
- 带适用范围
- 带验证状态

的结构化辅助层。

它服务于：

- Wizard 默认值
- Blueprint proposal
- Review recommendation
- 低风险 gap-fill hints

它不能反向定义：

- contract
- host policy
- conflict governance

---

## Host-aware 的最终分层

为了避免 Dota2 污染产品主干，最终必须稳定坚持三层：

### 1. Product Universal Layer

通用产品能力。

例如：

- feature lifecycle
- review
- governance
- intent / blueprint
- scene reference 的通用表达

### 2. Host Contract Layer

宿主承接通用能力的方式。

例如：

- ownership policy
- integration point model
- host capability matrix
- validation policy

### 3. Host Pack Layer

具体宿主实现。

例如：

- Dota2 generators
- Dota2 paths
- Dota2 adapters

这三层若不分开，Rune Weaver 很容易退化成：

- “Dota2 产品外壳”

而不是：

- “支持多个相似宿主的产品系统”

---

## 前端在最终总架构中的角色

前端不应只是一个聊天框。

最终前端至少应承担：

- feature intake
- feature review
- conflict explanation
- validation summary
- feature management
- rollback / regenerate / update 入口

也就是说，前端最终更接近：

- `Rune Weaver Workbench`

而不是：

- 通用聊天 UI

---

## 最终产品与当前执行链的关系

当前 [ARCHITECTURE.md](D:/Rune%20Weaver/docs/ARCHITECTURE.md) 仍然重要，
因为它清楚描述了当前主线执行链：

- `Wizard -> IntentSchema -> Blueprint -> Resolution -> Assembly -> Realization -> Routing -> Generation -> Write -> Validation -> Workspace`

但它更适合被理解为：

- **当前执行链架构基线**

而本文更适合被理解为：

- **最终产品总架构文档**

两者不冲突，但职责不同。

---

## 最终一句话

**Rune Weaver 的最终总架构，应当是“产品入口 + 受控规划 + 功能治理 + 宿主落地 + 生命周期状态”五者共同成立的系统。**

如果少了其中任何一层，它都很容易退化成：

- 更会说术语的代码生成器
- 或更重的宿主专用工程系统

# Feature Boundary And Relationship Guardrails（中文）

> Status Note
> 本文档是 feature 边界与关系建模的 guardrails，属于治理参考，不是当前实现状态的单一事实来源。
> 当前 agent 执行应优先遵循 [AGENT-EXECUTION-BASELINE.md](D:\Rune Weaver\docs\AGENT-EXECUTION-BASELINE.md)、[HANDOFF.md](D:\Rune Weaver\docs\HANDOFF.md) 与 [WORKSPACE-MODEL.md](D:\Rune Weaver\docs\WORKSPACE-MODEL.md)。
> 若本文与当前 README-target MVP 范围冲突，以 host separation、workspace-backed feature create/update/delete、minimum conflict governance 为准。

## 目的

本文用于明确 Rune Weaver 中：

- `feature` 到底是什么
- `feature` 的大小边界应如何判断
- `sub-feature / capability slice` 应如何理解
- 跨 `feature` 的耦合应如何被建模和治理
- 用户分批次输入时，系统应如何避免把同一 feature 错当成多个新 feature

本文是产品与治理边界文档，不是当前实现说明。

---

## 一句话定义

**Feature 是一个对用户可命名、可审查、可更新、可回滚的功能单元。**

它不是：

- 单个 prompt
- 单次输入
- 单个 pattern
- 单个代码文件
- 单个局部 patch

Rune Weaver 的主对象是 `feature`，不是 prompt、patch 或 answer。

---

## Feature 的大小边界

Feature 不应定义得过小，也不应无限膨胀。

更合理的判断方式是看它是否同时满足下面几个条件：

### 1. 用户是否会把它当成一个完整能力来命名

例如：

- 一个冲刺技能
- 一个天赋抽取系统
- 一个区域触发的选择流程
- 一个组合技系统

如果用户会把它当成“一个东西”来讨论，它通常更像一个 feature。

### 2. 它是否有共同的 review 与 lifecycle 边界

如果这些部分通常一起被问：

- 它想做什么
- 它会影响什么
- 它如何更新
- 它如何回滚

那么它们更应该属于同一个 feature。

### 3. 强行拆开后是否会让治理变差

如果把它拆得太细会导致：

- feature identity 混乱
- update / regenerate / rollback 边界断裂
- 用户难以理解“哪个才是这项功能”

那就不应该拆太细。

---

## 复杂 feature 仍然可以是一个 feature

一个 feature 可以内部很复杂。

例如：

- `Q/W/E` 都有二段
- `R` 会根据不同二段顺序组合出不同技能

这更像：

- 一个复合 feature
- 或一个 system-like feature

它对外仍然可以是一个稳定 feature，例如：

- `combo_skill_system`

但它内部应允许分出多个子能力面。

---

## Sub-feature / Capability Slice

Rune Weaver 不应把世界硬分成：

- feature
- 非 feature

更合理的是允许 feature 内部存在次级结构：

### Feature

对用户稳定可见、可管理的主对象。

### Capability Slice / Sub-feature

feature 内部的子能力面，用于表达较复杂 feature 的内部结构。

例如：

- `q_second_cast`
- `w_second_cast`
- `e_second_cast`
- `r_combo_resolution`

这些 slice 可以有：

- 自己的作用
- 自己的 impact
- 自己的 integration points

但默认不应直接取代主 feature 的身份。

### Module / Pattern Realization

更底层的执行结构，不应直接暴露成主产品对象。

---

## 用户的一次输入不等于一个新 feature

这是必须明确的产品原则。

用户经常会分批次思考需求：

- 第一次只说一部分
- 第二次补一个分支
- 第三次再加一个组合规则

所以：

**一次新的输入，不应被默认理解成一个新的 feature。**

系统应支持至少三种判断：

### 1. Create New Feature

明显是新的功能单元。

### 2. Update Existing Feature

明显是在扩展或修改已有 feature。

### 3. Possible Existing Feature Match

系统不能完全确定，但应提示：

- 这次请求可能是在扩展已有 feature `X`
- 你要继续更新它，还是创建一个新 feature

这条能力对小白用户尤其重要。

---

## 跨 Feature 耦合是正常情况，不应回避

真实项目中，新 feature 经常需要使用旧 feature 的：

- 数据
- 接口
- hook
- 状态
- UI surface
- scene anchor
- shared registry

也可能需要绑定 host 中已有的地图 trigger / anchor 命名对象。
这类绑定应被视为 feature 上下文或 host reference 的一部分，而不是脱离 feature 单独漂浮的地图配置。

Rune Weaver 不应假装这些耦合不存在。

更合理的做法是：

**把跨 feature 耦合从隐式关系变成显式关系。**

---

## Feature Relationship Model

至少应允许下面这些关系：

### `uses`

新 feature 使用旧 feature 的公开能力，但不修改旧 feature 的 owned areas。

这是最理想的关系。

### `depends_on`

新 feature 的成立依赖已有 feature 或其公开 surface。

### `extends`

新请求更像是在扩展已有 feature，而不是纯新建。

### `touches`

新 feature 会触碰已有 feature 已拥有的边界，但不一定彻底重写它。

### `conflicts_with`

两个 feature 在 integration point、ownership 或关键行为上冲突。

---

## 三种跨 Feature 情况必须区分

这点非常关键。

### 1. Uses

新 feature 使用旧 feature 的公开能力。

例如：

- 复用已有 selection modal
- 复用已有 talent pool
- 复用已有 shared data registry

这类关系通常：

- 可继续
- 但应在 review 里明确展示 dependency

### 2. Extends

新 feature 不是完全独立，而是在扩展已有 feature。

例如：

- 给已有 combo system 增加一个新分支
- 给已有 talent system 增加新的抽取规则

这类关系通常应优先引导为：

- update existing feature
- 或 feature extension

而不是默认 new feature。

### 3. Touches / Mutates

新 feature 会修改旧 feature 的 owned surface。

例如：

- 改已有 feature 的 hook 注册
- 改已有 feature 的共享状态结构
- 改已有 feature 的 UI mount 逻辑

这类关系风险最高。

通常应落到：

- needs_confirmation
- 或更高风险时 block

---

## 跨 Feature 治理的原则

Rune Weaver 不应把跨 feature 耦合理解成简单的“允许 / 不允许”二选一。

更合理的治理顺序应是：

1. 先识别是否涉及已有 feature
2. 判断是 `uses / depends_on / extends / touches / conflicts_with` 哪一类
3. 再决定：
   - safe
   - needs_review
   - needs_confirmation
   - blocked

---

## 小白用户场景下的产品要求

小白用户很可能会：

- 忘记点 update
- 误把同一 feature 的补充需求当成新 feature
- 不理解为什么这次请求和之前的功能有关

所以系统不应把 feature identity 只交给用户手工决定。

系统至少应能基于下面这些线索做候选匹配与提醒：

- feature label / summary
- ownership overlap
- integration point overlap
- capability overlap
- scene / anchor overlap
- wording similarity

目标不是替用户完全拍板，而是：

- 避免误新建
- 避免把同一系统切碎
- 避免把真实侵入伪装成普通新增

---

## 这不意味着要做 AGI

Rune Weaver 不需要理解整个代码库，才处理 feature relationship。

它只需要在自己已知、已声明、已拥有的 feature 边界内，识别：

- 这次请求更像 new feature
- update existing feature
- related feature
- cross-feature dependency / extension / touch

这仍然是受控治理，不是全局语义理解。

---

## 最终产品面必须出现什么

如果 Rune Weaver 真要成为 feature lifecycle platform，最终 review / management 面里必须出现一块：

### Related Features

至少展示：

- uses
- depends_on
- extends
- touches
- conflicts_with

否则跨 feature 耦合会继续停留在隐式状态。

在涉及地图触发的 host 中，还应有一块可见的：

### Host References / Scene Bindings

至少展示：

- 当前 feature 绑定了哪些 trigger / anchor
- 它们来自哪个 host
- 哪些是只读命名对象
- 哪些绑定允许在 feature 工作面中切换或修改

这不是地图编辑器，而是 feature 对 host 命名对象的受控绑定表达。

---

## 当前不应过度实现的地方

虽然这些边界必须先定义，但当前不应过早把它做成：

- 完整 feature graph engine
- 完整自动 feature matching system
- 完整全局 relationship resolver
- 全自动 feature merge / split system

当前更合理的是：

- 先把边界定义清楚
- 再在 Phase 3 中把 feature lifecycle 和 relationship 逐步产品化

---

## 最终一句话

**Rune Weaver 中的 feature 应该是用户级、生命周期级、可治理的主对象；复杂 feature 可以内部包含多个 capability slices；跨 feature 耦合不应被忽略，而应被建模成显式 relationship，并进入 review / governance。**

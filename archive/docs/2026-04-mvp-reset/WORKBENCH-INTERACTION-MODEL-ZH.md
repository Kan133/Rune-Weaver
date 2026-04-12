# Workbench Interaction Model（中文）

> Status Note
> 本文档描述的是较完整的产品交互目标形态，不等同于当前已经收口的 workbench 实现。
> 当前 agent 若需要判断前端/交互边界，应优先参考 [AGENT-EXECUTION-BASELINE.md](D:\Rune Weaver\docs\AGENT-EXECUTION-BASELINE.md) 中的 README-target MVP 边界，以及实际 workspace / bridge / workbench 代码现状。
> 若本文与当前实现冲突，应把它视为 planning reference，而不是立即执行合同。

## 目的

本文用于明确 Rune Weaver 最终产品交互应如何组织，尤其是：

- 对话入口应该扮演什么角色
- `feature` 卡片为什么是主对象
- 点开 feature 后哪些内容应可编辑
- 地图 trigger / anchor 这类 host 命名对象应如何进入 feature 工作面

本文是产品交互边界文档，不是当前实现说明。

---

## 一句话判断

**Rune Weaver 的最终交互不应是“纯聊天”，也不应是“纯表单”；更合理的形态是：总控对话入口 + feature 卡片工作区 + feature 详情 / lifecycle 面板。**

---

## 主交互结构

Rune Weaver 最终应至少有三层主交互：

### 1. 总控对话入口

总控 agent 更像：

- 客服
- intake 协调者
- review 解释者
- feature 路由器

它负责：

- 接住自然语言需求
- 判断更像 `new feature`、`update existing feature` 还是 `possible existing feature match`
- 触发 wizard 式补问
- 解释 risk / conflict / next step

但它**不应**成为唯一交互方式。

### 2. Feature 卡片工作区

`feature` 卡片应是用户真正看到的主对象。

每张卡片至少应表达：

- feature 名称
- feature 状态
- host
- 风险/待确认状态
- 最近变更
- 是否可 update / regenerate / rollback

命名建议：

- 系统提供 `system label`
- 用户可编辑 `display label`
- 系统内部保留稳定 `feature id`

### 3. Feature 详情 / Lifecycle 面板

点开卡片后，用户进入该 feature 的工作面。

这里不应直接暴露底层 blueprint/schema 细节，而应优先呈现用户可理解、可操作的层次：

- Feature Summary
- Review / Impact
- Editable Parameters
- Suggested / Inferred Values
- Related Features
- Lifecycle Actions
- Host References / Scene Bindings

---

## Feature 详情面应包含什么

### 1. Feature Summary

显示：

- 这个 feature 是什么
- 解决什么问题
- 当前会影响哪里
- 当前依赖或关联哪些 feature

### 2. Review / Impact

显示：

- ownership
- integration points
- conflict status
- host impact
- pending confirmations

### 3. Editable Parameters

这部分允许改动用户级、review 级、低风险参数，而不是默认暴露底层执行结构。

优先可编辑的内容包括：

- 数值参数
- title / label / description / copy
- duration / cooldown / choiceCount
- 某些显式输入参数
- 已识别的简单条件

### 4. Suggested / Inferred Values

这里展示系统建议，但不把它们伪装成最终真值。

例如：

- gap-fill suggestions
- experience-backed suggestions
- inferred defaults

用户应能：

- accept
- override
- clear

### 5. Related Features

这里应显式展示：

- uses
- depends_on
- extends
- touches
- conflicts_with

### 6. Lifecycle Actions

这里至少应有：

- update
- regenerate
- rollback
- compare
- inspect changes

### 7. Host References / Scene Bindings

这里应展示 feature 绑定到的 host 命名对象，例如：

- trigger zone
- spawn point
- area anchor
- marker
- waypoint

并允许在受控范围内修改：

- 当前绑定目标
- anchor 名称
- anchor kind
- 绑定到另一个已存在的命名对象

---

## 关于地图 Trigger / Anchor 的产品判断

### 核心判断

**部分 feature 应允许在卡片/详情面中修改其绑定的地图 trigger / anchor reference。**

这在 Dota2 这类 host 中是合理且必要的，因为很多 feature 的触发条件并不只是按键，而是：

- trigger zone
- spawn point
- area anchor
- marker
- waypoint
- 其他来自 Hammer 或类似地图编辑器中的命名对象

### 这应如何进入产品

这类内容应作为：

- feature 的可见上下文
- feature 的可编辑绑定引用
- host-aware execution 的一部分

进入 feature 详情面。

用户在 feature 卡片里应能看到并修改：

- 当前绑定的是哪个地图 trigger / anchor
- anchor 的名字
- anchor kind
- 必要时切换到另一个已存在的命名对象

### 这不意味着什么

这**不意味着** Rune Weaver 要变成地图编辑器。

仍然必须保持边界：

- Rune Weaver 可以编辑 **reference binding**
- Rune Weaver 不负责完整 map editing
- Rune Weaver 不默认生成复杂坐标/体积/path graph 系统
- Rune Weaver 不应伪装成 Hammer 替代品

更准确地说：

**Rune Weaver 应支持“feature 绑定到已有地图命名对象”，而不是“直接编辑地图几何与逻辑本体”。**

---

## 小白用户下的产品要求

面向小白时，系统不应要求用户先理解：

- Hammer
- host 内部 bridge
- trigger wiring
- scene reference schema

他们更需要看到的是：

- 这个 feature 现在绑定到哪个触发区域
- 它能不能改到另一个区域
- 改完会影响什么

所以地图 trigger / anchor 的编辑，不应藏在底层 schema 里，而应进入 feature 工作面。

---

## 一句话结论

**Rune Weaver 的最终交互应以 feature 卡片为主对象；总控对话负责进入系统，feature 详情面负责 review / parameter / relationship / lifecycle；对部分 feature，地图 trigger / anchor reference 也应成为可见且可修改的 feature 绑定项，但这仍是 host-aware reference editing，而不是地图编辑。**

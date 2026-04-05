# UI-ROADMAP

## 目标

Rune Weaver 的主目标仍然是 `NL-to-Code`。

UI 不是独立于代码主线的新产品，而是游戏宿主中的一个重要代码输出面。

因此 UI 路线图的目标不是“做一个 UI 平台”，而是让 UI 在主链路中变得：

- 可澄清
- 可结构化
- 可复用
- 可绑定到宿主

## 当前判断

第一轮通用 Wizard 不足以完整覆盖 UI。

原因：

- 机制需求主要解决 trigger / effect / resource / flow
- UI 需求还包含布局、密度、反馈、风格、注意力分配
- 这些变量高度个性化，且最容易退化成 uncontrolled gap fill

所以 UI 需要独立的澄清层，但仍然从属于主链路。

## UI 在主链路中的位置

推荐结构：

```text
User Request
  -> Wizard
  -> IntentSchema
  -> Blueprint
  -> UI Need Detection
  -> UI Wizard
  -> UIDesignSpec
  -> AssemblyPlan
  -> Dota2 UI Adapter
```

注意：

- `UI Need Detection` 可以先由主 Wizard 负责
- `UI Wizard` 只在需要时进入
- `UIDesignSpec` 不是业务规则层

## 两段式澄清

### 第一段：主 Wizard

负责回答：

- 是否需要 UI
- 没有 UI 是否会导致结果不可感知
- 需要哪类 surface

这一步只产出粗粒度 `uiRequirements`。

### 第二段：UI Wizard

只在这些情况下进入：

- 明确需要 UI
- 没有 UI 则无法测试或感知结果
- 用户明确提出视觉、布局或交互要求

它负责产出：

- `UIDesignSpec`

## UI 与 Gap Fill 的关系

UI 某种程度上与 gap fill 有关，但不能等同。

### 不属于 gap fill 的部分

UI 主体应由以下内容承接：

- UI patterns
- UIDesignSpec
- host binding templates

例如：

- `ui.selection_modal`
- `ui.key_hint`
- `ui.resource_bar`

这些不应依赖自由生成。

### 接近 gap fill 的部分

只有 UI 尾部个性化更接近 constrained gap fill，例如：

- copy hints
- style token 补全
- 微交互差异
- 局部布局变体

这意味着：

- UI 主体 = pattern + spec
- UI 尾部个性化 = constrained gap fill 可能介入

## UI 的三层结构

### 1. UI mechanic

解决“做什么 UI”：

- modal
- hint
- resource bar

### 2. UI host binding

解决“如何落到宿主”：

- TSX
- LESS
- Panorama bridge
- event / nettable data flow

### 3. UI design support

解决“如何呈现”：

- 布局
- 信息密度
- 风格
- 反馈方式

## 当前推荐 UI pattern family

当前应保持小而稳：

- `ui.selection_modal`
- `ui.key_hint`
- `ui.resource_bar`

可后续新增：

- `ui.toast`
- `ui.overlay_panel`

当前不应新增：

- `ui.talent_screen`
- `ui.card_builder`
- `ui.hero_dashboard`

这些容易退化成领域模板。

## UI 路线阶段

### U1

主 Wizard 识别 `uiRequirements`，UI 依赖默认模板与最小 `UIDesignSpec`。

目标：

- 让结果可感知
- 让系统型需求可测试

### U2

加入最小 UI Wizard。

重点只问：

- surface 类型
- 信息密度
- 强打断还是弱提示
- 风格偏向
- 关键文案元素

### U3

再考虑 constrained gap fill 介入 UI 尾部个性化。

## 当前结论

Rune Weaver 后续应把 UI 作为 `NL-to-Code` 主线中的一个独立能力面来建设，但不能让 UI 反过来盖过主产品的 code pipeline。

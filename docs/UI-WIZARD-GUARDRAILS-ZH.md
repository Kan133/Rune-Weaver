# UI Wizard 约束框架（中文）

## 目的

本文档用于明确 Rune Weaver 中 `UI Wizard` 的产品边界与架构边界，避免在 Phase 2 / Phase 3 推进过程中把 UI 需求处理错误地做成：

- 一个独立产品线
- 一个伪 Blueprint 生成器
- 一个泛化 gap-fill 黑洞
- 一个被 Dota2 UI 细节反向污染的专项系统

这份文档只定义边界，不定义完整实现方案。

---

## 一句话定义

**UI Wizard 是主 Wizard 体系下的一个专项 intake / 澄清分支，用于在需要时收集高价值 UI 结构信息。**

它不是：

- 一个独立的 UI 产品
- 一个直接生成 Blueprint 的 agent
- 一个 host realization planner
- 一个任意生成 UI 代码的系统

---

## UI Wizard 为什么需要存在

Rune Weaver 不应把 UI 直接并入通用 gap-fill，原因是 UI 中有一部分问题不是“补缺”，而是“结构澄清”。

例如：

- 这是 modal 还是弱提示？
- 是强打断还是轻反馈？
- 需要多少信息密度？
- 是强调选择，还是强调状态展示？

这些问题如果不先澄清，直接交给 gap-fill 或自由生成，很容易退化成 uncontrolled generation。

因此：

- UI 的局部文案和尾部细节可以交给 gap-fill
- 但 UI 的结构性判断需要一个单独的澄清层

这就是 UI Wizard 存在的理由。

---

## UI Wizard 不是什么

UI Wizard 必须明确不是下面这些东西。

### 1. 不是独立产品线

UI 仍然是 Rune Weaver 主 feature pipeline 的一个输出面，而不是一条与主产品并列的产品线。

UI Wizard 的存在是为了辅助主 feature 构建，不是为了做一个“独立 UI 生成器”。

### 2. 不是第二个主 Wizard

主 Wizard 负责：

- 整体需求 intake
- feature 方向判断
- 是否需要 UI
- 是否需要专项澄清

UI Wizard 只在必要时进入，负责专项 UI 澄清。

它不应接管主 Wizard 的职责。

### 3. 不是 Blueprint 生成器

UI Wizard 不应直接输出：

- Blueprint
- patternIds
- realization decisions
- generator routing
- file paths
- host API plans

这些都不属于它的职责。

### 4. 不是自由 UI 代码生成器

UI Wizard 不应承担：

- 任意布局设计
- 完整页面生成
- 大块前端自由代码规划
- 脱离 pattern / spec 的 UI 直接实现

否则它会迅速失去边界。

---

## UI Wizard 在主链路中的位置

推荐位置如下：

`User Request -> Main Wizard -> UI Need Detection -> UI Wizard (optional) -> Intent / UI Intake Bundle -> Blueprint -> Pattern Resolution -> Assembly -> Realization -> Routing -> Generation`

关键点：

- `UI Need Detection` 首先由主 Wizard 负责
- `UI Wizard` 只在需要时进入
- UI Wizard 产出的是结构化 UI 澄清结果
- 它不能越过主链路直接控制后续实现

---

## UI Wizard 的进入条件

UI Wizard 只应在以下情况进入：

### 1. 明确需要 UI

例如：

- 用户明确要求一个面板、弹窗、提示、状态条
- 没有 UI 则功能无法被玩家感知或测试

### 2. UI 是功能体验中的必要感知面

例如：

- 选择型玩法
- 强提示型玩法
- 状态展示型玩法

### 3. 用户明确提出呈现/交互要求

例如：

- 要弹窗
- 要提示条
- 要一个状态面
- 要强调某种风格或交互强度

如果不满足这些条件，不应强行进入 UI Wizard。

---

## UI Wizard 应收集什么

UI Wizard 只应收集高价值、低歧义、能显著提升后续结构质量的问题。

### 应优先收集的内容

- 是否需要 UI
- 需要什么 surface 类型
- interaction intensity
- information density
- style direction
- key copy intent

### 更具体地说，可以问的类型

- 这是弹窗、提示、状态条还是叠层面板？
- 这是强打断型交互，还是弱提示型反馈？
- 内容是简洁为主，还是信息密集为主？
- 风格更偏功能性、神秘感、科技感还是别的？
- 有没有必须出现的标题、说明、按钮文本？

---

## UI Wizard 不应收集什么

UI Wizard 不应深入到下面这些层。

### 1. 业务规则

例如：

- 选择后如何应用到英雄
- 奖励如何结算
- 资源如何扣除

这些属于：

- rule
- effect
- data

层，不属于 UI Wizard。

### 2. host 实现细节

例如：

- 用 TSX 还是别的
- 哪个 bridge 文件要改
- 用哪个 generator family

这些属于 host-aware realization 与 generation，不应进入 UI Wizard。

### 3. 任意设计细节

例如：

- 精确像素布局
- 全套视觉规范
- 大量动效策略

这些会让 UI Wizard 膨胀成独立 UI 设计系统，应避免。

---

## UI Wizard 与 UI Pattern 的关系

UI Wizard 不是 UI Pattern 的替代品。

### UI Pattern 负责

- 这个 UI 是什么功能形态
- 它属于哪类 surface
- 它需要怎样的基本交互骨架

例如：

- `ui.selection_modal`
- `ui.key_hint`
- `ui.resource_bar`

### UI Wizard 负责

- 在这些功能形态里澄清需求
- 帮用户表达：
  - 更偏 modal 还是 hint
  - 更偏简洁还是密集
  - 更偏强提示还是弱提示

所以：

- UI Pattern 是结构原语
- UI Wizard 是结构澄清入口

---

## UI Wizard 与 UIDesignSpec 的关系

UI Wizard 不应直接等于 UIDesignSpec，但它应当为 UIDesignSpec 提供高价值输入。

更合理的关系是：

- UI Wizard 收集高价值选择与偏好
- 这些结果进入一个结构化的 UI intake bundle
- 后续再由系统转换为更正式的 UI spec / design hints

也就是说：

- UI Wizard 是 intake
- UIDesignSpec 是结构化表达

两者不是同一个层。

---

## UI Wizard 与 gap-fill 的关系

这是最关键的边界之一。

### UI Wizard 负责

- 结构性澄清
- 高价值选择
- 明确交互强度
- 明确信息密度
- 明确呈现方向

### gap-fill 负责

- 微文案补全
- style token 缺省
- 小布局变体
- 局部交互细节
- 局部 copy / hint 补足

一句话：

- `UI Wizard` 负责先把结构说清楚
- `gap-fill` 负责在结构已确定后做局部补缺

因此：

**UI Wizard 不能被并入通用 gap-fill。**

但：

**UI gap-fill 可以作为 UI Wizard 之后的低风险补缺层存在。**

---

## UI Wizard 的风险边界

如果做错，UI Wizard 最容易滑向下面四种坏形态。

### 1. 变成第二个主 Wizard

表现为：

- 重复问主需求问题
- 抢主 Wizard 的 intake 职责

### 2. 变成 Blueprint 轻规划器

表现为：

- 开始推断 patternIds
- 开始推断 host outputs
- 开始推断结构落地路径

### 3. 变成自由 UI 生成器

表现为：

- 开始任意发散布局
- 开始主导完整 UI 代码设计

### 4. 变成 Dota2 UI 专用工具

表现为：

- 默认用 Panorama 术语说话
- 默认按 Dota2 的界面习惯组织问题
- 把宿主细节带回产品通用层

这四种情况都必须避免。

---

## 宿主污染防线

UI Wizard 必须保持宿主中立。

### 允许宿主影响的层

- host pack 内的 UI adapter
- host-specific rendering templates
- host-specific implementation notes

### 不允许宿主污染的层

- UI Wizard 的通用问题模型
- UI intake 结构
- UI 需求语言
- 产品前台默认 review 语言

这意味着：

- Dota2 可以是第一套 UI host pack
- 但不能反向定义 UI Wizard 的通用表达

---

## Phase 2 的接入方式

UI Wizard 不应在 Phase 2 一开始就做成完整系统。

推荐节奏如下：

### Phase 2A

只做：

- UI Need Detection
- UI Wizard 最小问题集
- 明确进入条件
- 明确输出 bundle

### Phase 2B

再做：

- UI Wizard 与 review surface 联动
- UI intake 对 Blueprint proposal 的辅助

### Phase 2C

最后再考虑：

- UI-specific constrained gap-fill
- 更成熟的 spec 生成
- 更多 pattern family 支持

---

## 判断某个 UI 需求应不应该进 UI Wizard 的快速规则

可以用这四个问题快速判断。

### 1. 这个问题是不是在决定 UI 功能形态？

如果是，倾向进入 UI Wizard。

### 2. 这个问题是不是在决定 UI 的交互强度或感知方式？

如果是，倾向进入 UI Wizard。

### 3. 这个问题是不是只是局部文案/样式缺失？

如果是，倾向交给 gap-fill。

### 4. 这个问题是不是业务规则、数据逻辑或宿主实现细节？

如果是，不属于 UI Wizard。

---

## 最终一句话

Rune Weaver 的 `UI Wizard` 应该被定义为：

**主 Wizard 体系下、仅在必要时进入的 UI 专项澄清层。它负责结构澄清，不负责实现规划；它先于 gap-fill，但不取代 pattern、spec 或 host adapter。**

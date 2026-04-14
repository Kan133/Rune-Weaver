# Gap Fill 约束框架（中文）

## 文档状态

本文档是 Rune Weaver 当前的 `Gap Fill Boundary v0` 主边界文档。

- 当前 gap fill 的产品边界与工程边界，以本文档为准
- `GAP-FILL-POLICY.md` 保留为较早期的 future-policy / historical reference
- 如果两份文档表述冲突，以本文档为准

本文档定义的是：

- gap fill 可以做什么
- gap fill 不能做什么
- gap fill 与 pattern / wizard / clarification / governance 的边界
- 当前实现状态与未实现状态

本文档不定义完整实现方案，也不承诺终版能力。

## 一句话定义

**Gap Fill 是对已确定 feature 结构的局部、低风险、受控补全。**

它不是：

- 新机制发明层
- 缺失 pattern 的长期替代品
- 越过 governance / ownership / host boundary 的逃逸通道
- 一个“系统不懂就自由生成”的黑箱

## 为什么需要 Gap Fill

Rune Weaver 不可能把所有细节都提前抽象成 pattern、contract 或 schema。

真实 feature 构建过程中，总会存在一些较小、较局部、但又不值得立即升级成新 pattern 的缺口，例如：

- 参数默认值
- 局部文案
- 已有结构中的小桥接
- 已明确机制中的局部实现缺口

如果系统完全不承接这些缺口，用户会被迫：

- 手工补大量尾部细节
- 把过小差异硬塞进不合适的 pattern
- 或频繁要求新增本不该立即升级的 pattern

因此 gap fill 需要存在，但必须被严格约束。

## 产品边界

### Gap Fill 允许做什么

Gap fill 当前允许承接三类能力：

1. 参数补全
- 为已存在结构补齐低风险参数
- 例如：`duration`、`cooldown`、`choiceCount`、`title`、`description`

2. 结构/桥接补全
- 在主结构已经成立时，补局部 glue / bridge 缺口
- 例如：局部接线、局部 wrapper、局部 import / index refresh 这类不改变 feature 本质的补全

3. 已明确机制的实现补全
- 当用户已经明确说出了某个机制，但 blueprint / proposal 尚未完整表达其局部实现细节时，gap fill 可以补这部分实现缺口
- 重点是：它只能实现“用户已明确提出”的东西，不能发明新机制

### Gap Fill 不能做什么

Gap fill 必须禁止以下行为：

1. 发明用户没说的核心机制
- 不能凭空新增机制、规则、玩法、能力系统

2. 改写 feature intent
- 不能为了贴合现有 pattern 而静默改变用户想做的功能

3. 擅自决定 ownership / host boundary
- 不能自己决定 feature 属于谁、应该挂到哪里、越过哪些主机策略

4. 长期替代本该 patternize 的高频结构
- 如果某类补法稳定重复出现，它就不应长期停留在 gap fill 中

## 工程边界

### Pattern-first but not Pattern-limited

Rune Weaver 的 gap fill 应该是：

- `pattern-first`
- 但不是 `pattern-limited`

意思是：

- 系统优先依赖已有 pattern / blueprint / host-aware structure
- 但当 pattern 之间仍有局部缺口时，gap fill 可以承接局部补全

这并不意味着：

- gap fill 可以替代完整 pattern 家族
- 或在 pattern 缺失时直接自由生成一整套新结构

### Gap Fill 与 Pattern 的分工

Pattern 负责：

- 机制原语
- 稳定结构
- 可复用的 host-aware capability

Gap Fill 负责：

- 已存在结构内部的局部补全
- 让 feature 更完整、更接近真实实现
- 避免因为极小差异而过早新建 pattern

一句话：

- pattern 解决“这是什么机制”
- gap fill 解决“这个已成立机制里还有哪些局部细节没被说清”

### Gap Fill 与 Wizard / Clarification 的分工

以下问题不应由 gap fill 静默解决，应进入 wizard / clarification：

- feature 核心骨架不明确
- 触发方式不明确
- 目标类型不明确
- 结果类型不明确
- ownership / integration 存在冲突
- 多种解释都合理且会显著改变 feature 本质

只有当主结构已经基本明确时，gap fill 才应介入。

### Gap Fill 与 Governance 的分工

Gap fill 不能绕过：

- ownership boundary
- conflict detection
- integration policy
- review / confirm 流程

一句话：

**Gap Fill 可以补缺，但不能越权。**

## v0 分类

### Category A - Safe Auto-Fill

定义：

- 安全、低风险、规则化的自动补全

典型内容：

- `duration`
- `cooldown`
- `choiceCount`

特点：

- 不改变 feature 本质
- 可使用 rule-based defaults
- 风险相对最低

### Category B - LLM-Infer

定义：

- 基于上下文推断的人类可读内容补全

典型内容：

- `title`
- `description`
- labels
- display text

特点：

- 当前 real LLM 白名单只包含很窄的一部分
- 必须显式保留低/中置信度语义
- 不能扩展成核心机制推断

### Category C - Structural / Bridge Fill

定义：

- 在主结构已成立时，补局部 bridge / glue 缺口

约束：

- 只能补局部 glue
- 不能补会改变 feature 机制含义的连接决策
- 一旦这种补法稳定重复出现，应升级成 pattern

当前状态：

- 已定义
- 尚未形成成熟实现

### Category D - Explicit-Mechanic Realization

定义：

- 对用户已明确提出、但 blueprint 尚未完整表达的局部机制细节进行实现补全

约束：

- 必须能回溯到用户原始表述
- 不能由系统自由发明
- 不能把核心机制设计偷偷塞进 gap fill

当前状态：

- 已定义
- 尚未形成语义干净的实现切口

### Category E - Clarification Required

定义：

- 不适合静默补全，必须回 clarification 的缺口

典型内容：

- pattern 缺口
- integration 缺口
- ownership 缺口
- capability 骨架缺口

当前状态：

- 代码层已有最小表达
- 但目前只是**最小、启发式、条件触发的 boundary expression**
- 不是成熟的 clarification system

### Category F - Pattern Escalation Candidate

定义：

- 不适合长期停留在 gap fill，应升级为 pattern 的重复补法

判定原则：

- 高频重复出现
- 多次以相同方式补齐
- 同类 feature 中稳定复现
- 已经从“补缺口”演变成“稳定模块模板”

当前状态：

- 已定义
- 尚未形成代码级 tracking / escalation 机制

## 当前实现状态

### 已有基础实现

1. Category A
- 已有基础 rule-based 参数补全

2. Category B
- 已有最小 real LLM path
- 当前白名单应保持窄范围
- 当前 accepted implementation 只应理解为：
  - `title`
  - `description`

3. Category E
- 已有最小代码边界表达
- 但目前仍是启发式、保守、待验证状态

### 尚未成熟或尚未落地

- Category C
- Category D
- Category F

### 当前不应过度承诺的点

1. Category E 不是成熟 clarification system
- 它只是当前最小边界表达

2. Category B 不是广义 real LLM gap fill
- 当前只是窄白名单路径

3. Category C / D 尚未进入可信实现阶段
- 后续必须先选窄切口验证
- 不能直接泛化扩张

## 快速判断一个问题应不应该进入 Gap Fill

遇到一个缺口时，可以先问：

1. 主结构已经确定了吗？
- 如果没有，先不要进入 gap fill

2. 它是在改骨架，还是补细节？
- 改骨架不是 gap fill

3. 它是否需要新的 pattern / host rule / integration primitive？
- 如果需要，就不是 gap fill

4. 如果删掉这部分，feature 本质会改变吗？
- 如果会改变，那就不是 gap fill

## 什么时候一个 Gap Fill 应升级为 Pattern

如果某个 gap fill 满足下面特征，就不应长期停留在 gap fill：

- 高频重复出现
- 语义稳定清晰
- 多个 case 都在复用
- 已经不再是局部补缺，而是稳定结构
- 需要独立 validation / governance

这时更合适的方向是：

- core pattern
- canonical composition
- feature preset

## 当前落地规则

在没有进一步实现前，后续扩展应遵守：

1. 新增 gap kind 前，先判断它属于 A/B/C/D/E/F 哪一类
2. 不允许为了保某条样例，把 real LLM whitelist 粗暴放宽
3. 不允许为了“先有边界表达”，对每个 module 无脑注入 clarification gaps
4. 不允许把尚未稳定的 D 类切口包装成已成立能力
5. 如果与旧 policy 文档冲突，以本文档为准

## 结论

Rune Weaver 当前的 gap fill 应被定义为：

- 对已成立 feature 结构的局部、低风险、受控补全
- pattern-first but not pattern-limited
- 能承接参数补全、结构/桥接补全、已明确机制的实现补全
- 但不能发明核心机制、改写 feature intent、越过 ownership / governance 边界

这就是当前的 `Gap Fill Boundary v0`。

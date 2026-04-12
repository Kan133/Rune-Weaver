# 宿主扩展约束框架（中文）

## 目的

本文档用于给 Rune Weaver 的 Phase 2 / Phase 3 提供一套明确的约束框架，避免在扩展宿主、引入产品化能力和增强智能化时，被当前 Dota2 宿主实现反向污染产品主干。

这份文档重点回答三件事：

- 什么样的宿主值得 Rune Weaver 支持
- 新宿主进入时，哪些东西可以改，哪些东西不能动
- 如何避免“每增加一个宿主，就要重写半个产品”

本文档不是实现方案文档，而是架构守门文档。

---

## 一句话原则

**Dota2 只能是 Rune Weaver 的第一个 host pack，不能是 Rune Weaver 的产品本体。**

任何 Phase 2 / Phase 3 的设计，都必须先满足这个原则。

---

## Rune Weaver 适合支持的宿主类型

Rune Weaver 不应该追求支持“所有宿主”，而应优先支持满足下列条件的宿主。

### 条件 1：feature 是持续叠加的

宿主中的项目会持续增加：

- 新功能
- 新规则
- 新 UI
- 新数据池
- 新触发逻辑

如果宿主中的需求大多只是一次性脚本或短期生成任务，Rune Weaver 的价值会很弱。

### 条件 2：单个 feature 不难，但组合容易失控

适合 Rune Weaver 的宿主，通常不是“算法超难”，而是：

- 单个功能看起来都能做
- 但多个功能叠加后容易出现：
  - 冲突
  - 回归
  - ownership 混乱
  - update / rollback 风险

这类宿主最能体现 Rune Weaver 的差异。

### 条件 3：宿主有相对稳定的结构与落地点

至少要能较稳定地识别：

- 写入路径
- 接入点
- 生命周期
- 聚合点
- ownership boundary

如果宿主没有稳定结构，Rune Weaver 的 deterministic engine 很难成立。

### 条件 4：宿主允许建立治理层

Rune Weaver 真正的优势不是“生成代码”，而是“治理功能演进”。

因此宿主至少应允许建立：

- feature-level review
- ownership 追踪
- 冲突检测
- regenerate / rollback 语义

如果宿主天然无法承接这些治理能力，就不适合支持。

### 条件 5：目标用户处于中间区间

Rune Weaver 最适合的不是：

- 纯 demo 作者
- 也不是拥有完整平台团队的大厂项目

最适合的是：

- 项目已经复杂
- feature 会持续叠加
- 后期维护很痛
- 但团队又没有成熟平台能力

---

## 不适合优先支持的宿主类型

下列宿主类型，不应作为 Rune Weaver 的优先扩展方向。

### 1. 纯 CRUD / 页面型宿主

如果核心需求只是：

- 加页面
- 加接口
- 改表单

那普通脚手架或普通 vibe coding 往往更合适。

### 2. 超大规模基础设施宿主

例如：

- 数据库内核
- 编译器
- 超复杂后端平台

这些系统的难点主要是：

- correctness
- 性能
- 并发
- 算法

并不是 Rune Weaver 当前优势区间。

### 3. 极小型一次性项目

如果项目生命周期很短，且没有后续 feature 治理需求，Rune Weaver 的重链路不划算。

---

## 三层分离原则

为避免宿主污染产品主干，Rune Weaver 必须长期坚持三层分离。

### 第一层：产品通用层

这一层是 Rune Weaver 的核心本体，应尽量不带宿主专属语义。

包括：

- Intent
- Blueprint
- module categories
- parameters
- feature lifecycle
- review model
- conflict model
- orchestration model
- scene/world reference 的通用表达

这一层一旦被宿主术语污染，后续扩宿主就会越来越难。

### 第二层：宿主 contract 层

这一层负责回答“通用 feature 语义如何被某个宿主承接”。

包括：

- realization policy
- routing policy
- ownership policy
- validation policy
- integration point model
- host capability matrix

这一层是宿主与产品主干之间的桥。

### 第三层：host pack 层

这一层才是宿主具体实现。

例如 Dota2 的：

- generators
- paths
- bridge handling
- registry handling
- validation details

以后 Warcraft3、Roblox 或其他宿主，也应以同样形式存在于这一层。

---

## 绝对不要做的四种污染

### 1. 术语污染

不允许把宿主专属术语直接提升为产品通用概念。

例如：

- `ability`
- `modifier`
- `kv`
- `lua`
- `panorama`

这些可以存在于 host pack / host contract 层，但不应直接成为产品主层的抽象中心。

### 2. schema 污染

不允许在通用 schema 中直接长出宿主专属字段。

通用 schema 应表达：

- trigger
- data
- rule
- ui
- effect
- parameters
- references
- lifecycle

而不是某个宿主的具体文件格式或概念。

### 3. planning 污染

不允许 Blueprint planning、Wizard 或 LLM 提案逻辑默认依赖某一个宿主的思维方式。

例如：

- 默认按 Dota2 术语拆功能
- 默认按 Dota2 风格命名模块
- 默认把 Dota2 的结构当成“通用 feature 结构”

这会让第二个宿主从一开始就处于劣势。

### 4. review / UX 污染

前台产品面不应默认暴露宿主专家术语。

默认用户看到的应当是：

- 功能
- 模块
- 风险
- 影响
- 冲突

而不是：

- KV
- Lua
- modifier
- registry fragment

宿主细节应是下钻信息，而不是默认界面语言。

---

## 新宿主准入前必须回答的 10 个问题

任何新宿主进入前，至少要先回答下面 10 个问题。

### 1. 这个宿主的核心痛点是不是 feature 持续叠加，而不是一次性生成？

如果不是，不值得进入。

### 2. 这个宿主有没有稳定的结构边界？

至少要能识别：

- 写入路径
- 落地点
- 聚合点
- ownership 边界

### 3. 这个宿主能否建立 lifecycle 语义？

至少要评估：

- create
- update
- regenerate
- rollback

是否有成立基础。

### 4. 这个宿主有没有足够稳定的 integration points？

如果宿主的接入点极不稳定，Rune Weaver 难以提供治理价值。

### 5. 这个宿主能否支持 reviewable write？

如果写入结果不可审阅、不可对比、不可追踪，Rune Weaver 的优势会大幅下降。

### 6. 这个宿主能否做基本验证？

至少需要某种形式的：

- 结构验证
- 构建验证
- 运行前验证
- runtime surface 观察

### 7. 这个宿主的用户是否真的会感知后期治理痛点？

如果用户永远停留在“快速出 demo”，Rune Weaver 的价值很难成立。

### 8. 这个宿主的实现是否会要求修改产品主层语义？

如果必须改动：

- Blueprint 主语义
- module categories
- lifecycle 定义

才支持得了，那说明宿主不适合当前阶段进入。

### 9. 这个宿主能否主要通过 host pack + host contract 引入？

如果不能，而是必须大规模改 core，说明扩展成本过高。

### 10. 这个宿主是否有明确的 Phase 1/2 价值验证场景？

必须能说清：

- Rune Weaver 在这个宿主里究竟解决哪个真实痛点
- 不是只说“理论上可扩展”

---

## 新能力准入规则

除了宿主本身，未来 Phase 2 / Phase 3 还会增加很多能力。任何新能力进入前，也应先过下面的判断。

### 规则 1：先问它属于 Core、Host Contract 还是 Host Pack

如果定位不清，不允许直接实现。

### 规则 2：先问它解决的是通用 feature 问题，还是某个宿主的特例问题

通用问题进产品主层，宿主特例进 host pack。

### 规则 3：先问它会不会改变已有 lifecycle 语义

如果会，就不能当作“小能力”随手加进去。

### 规则 4：先问它是否引入新的 pairwise complexity

如果一个设计天然要求维护大量两两兼容关系，应优先重构为平台规则，而不是直接落地。

### 规则 5：先问它是否会让 Dota2 变成默认思维方式

如果答案是“会”，就必须重做抽象。

---

## 复杂度控制原则

Rune Weaver 后续会引入：

- pattern
- feature
- case
- presets
- host packs
- conflict rules

如果组织不好，复杂度会迅速爆炸。

因此必须坚持下面原则。

### 原则 1：不要维护 pattern 两两兼容矩阵

不要主要依赖：

- pattern A 和 B 是否兼容
- pattern A 和 C 是否冲突

这种 pairwise 维护方式。

应优先维护：

- pattern 自身属性
- 平台级组合规则
- 少量例外规则

### 原则 2：case 经验不能反向定义底层 contract

case 是经验层，不是宪法层。

### 原则 3：host-specific 例外不能直接长进 Core

否则一个宿主会污染所有宿主。

### 原则 4：review 面和执行面必须分层

前台产品面应优先展示：

- 功能
- 风险
- 影响

宿主细节应按需下钻。

---

## Phase 2 / Phase 3 执行约束

### Phase 2 允许做什么

- Wizard
- Blueprint LLM planning
- 受控 gap fill
- feature conflict governance
- hook composition contract
- scene / map reference

但必须满足：

- 先做通用表达
- 再做 Dota2 host pack 落地
- 不允许直接把 Dota2 方案写成产品默认定义

### Phase 3 允许做什么

- 更强 graph orchestration
- self-healing
- 多宿主扩展
- 更成熟的世界引用与外部资产引用

但仍需满足：

- host pack 不得反向侵蚀产品主层
- conflict governance 必须依赖平台规则，而不是宿主 patch
- 新智能能力不能破坏 review / rollback / ownership 边界

---

## 后续使用方式

从 Phase 2 开始，任何涉及以下事项的设计、评审或实现前，都应先对照本文档检查：

- 新宿主引入
- 新 Wizard 能力
- 新 Blueprint planning 能力
- 新 conflict governance 能力
- 新 scene/world reference 能力
- 新 host-specific 功能扩展

如果某项设计无法通过本文档中的宿主准入与污染检查，就不应直接推进实现。

---

## 最终一句话

Rune Weaver 后续要想扩宿主、扩能力，而又不被 Dota2 反向绑死，必须长期坚持：

**产品通用层、宿主 contract 层、具体 host pack 层三层分离，并以宿主准入与污染检查作为 Phase 2 / 3 的持续守门规则。**

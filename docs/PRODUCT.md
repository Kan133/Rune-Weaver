# PRODUCT

## 产品定义

Rune Weaver 是一个 `NL-to-Code` 编织引擎。

它的目标不是“让模型直接写一堆宿主代码”，而是把自然语言需求稳定转成一组受控中间层，再落到宿主可消费的代码输出。

当前首个真实宿主是 Dota2 `x-template`。

## 当前主链路

`自然语言 -> IntentSchema -> Blueprint -> Pattern Resolution -> AssemblyPlan -> Dota2 Adapter -> Host Write / Run`

在 Dota2 宿主中，代码输出主要分成四类：

- server
- shared
- ui
- bridge

UI 是代码输出面的一个重要子集，不是独立于主产品的新主线。

## MVP 验证目标

当前 MVP 主要验证四件事：

1. 自然语言需求能否稳定澄清成 `IntentSchema`
2. 不同题材需求能否复用共享的 mechanic patterns，而不是每次新造模板
3. `Blueprint -> AssemblyPlan -> Dota2 host` 能否形成受控、可验证的代码落地链路
4. 无开发基础用户能否完成一次最小闭环：
   `init -> create -> run`

## 不是什么

Rune Weaver 当前不是：

- 任意自然语言直接生成整项目代码的黑盒代理
- 以 UI 设计为中心的独立产品
- 任意宿主旧文件智能改写器
- 依赖 code-level gap fill 才能工作的系统

## 术语表

### Wizard

负责澄清需求，不直接写宿主代码。输出目标是 `IntentSchema`。

### IntentSchema

需求澄清层。负责表达目标、约束、归一化 mechanics、未解决问题以及是否 ready for blueprint。

### Blueprint

结构化编排设计。负责表达模块、连接、pattern hints、假设与验证要求，不直接等于宿主代码。

### Pattern

可复用、可参数化、可验证、可组合、可绑定到宿主实现的 mechanic 构件。

### Pattern Catalog

可用 pattern 的索引和元数据集合。

### AssemblyPlan

写入前的最后一层结构化计划。负责表达：

- 选中了哪些 pattern
- 需要生成哪些代码产物
- 需要哪些 bridge updates
- 是否 ready for host write

### Adapter

宿主适配层。当前主要是 Dota2 Adapter。

### UIDesignSpec

UI 呈现层规范。负责布局、密度、样式与交互呈现，不承载业务规则本身。

### Gap Fill

用于承接无法仅靠 schema + pattern 参数化表达的局部缺口。当前不作为主链路核心能力。

## 宿主粒度原则

在 Dota2 宿主方向上，Rune Weaver 只拥有：

- `game/scripts/src/rune_weaver/**`
- `content/panorama/src/rune_weaver/**`
- 少量明确允许的一次性桥接点

Rune Weaver 不负责：

- 用户原有业务代码
- 任意宿主旧文件的智能改写
- 任意 merge 或全项目重构

## UI 的产品定位

UI 不是独立于代码主线的产品方向。

更准确地说：

- server 负责机制和状态
- shared 负责结构与共享约束
- ui 负责可感知结果与交互
- bridge 负责接入宿主入口

所以 UI 是 `NL-to-Code` 在游戏宿主中的一个重要输出面。

## UI 路线结论

第一轮通用 Wizard 不足以完整覆盖 UI 个性化需求。

后续推荐采用两段式：

- 主 Wizard 先判断是否需要 UI，以及需要哪类 surface
- 只有在需要时，再进入轻量 UI Wizard，产出 `UIDesignSpec`

这意味着：

- UI 主体继续由 pattern + spec 承接
- UI 的尾部个性化才可能进入 constrained gap fill

## 当前结论

Rune Weaver 当前应被理解为：

一个以 CLI 为入口、以 Dota2 为首个真实宿主、通过 `IntentSchema -> Blueprint -> AssemblyPlan` 将自然语言稳定转成宿主代码输出的受控生成系统。

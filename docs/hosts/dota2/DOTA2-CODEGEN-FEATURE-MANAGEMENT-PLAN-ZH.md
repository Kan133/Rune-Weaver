# Dota2 Codegen + Feature Management Plan v1

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: temporary
> Last verified: 2026-04-14
> Read when: understanding older Dota2 mainline planning context or comparing historical Dota2 codegen direction
> Do not use for: current execution ordering, current lifecycle baseline, or proof of shipped Dota2 scope

## 目标

当前主线不是把 Rune Weaver 做成完整控制平台，而是先把一条足够完整、足够可验证的垂直主线做透：

- Dota2 code generation
- feature management

这条主线要尽量完整，但不能让 Dota2 反向污染 core pipeline。

## 当前产品定义

当前产品核心有三点：

1. `pattern + blueprint + constrained gap fill` 的结构性实现能力
2. 面向 `feature object` 的交互与管理模式
3. host-aware 但 host-isolated 的落地能力

这意味着当前开发目标不是：

- 继续扩更重的 governance 产品化
- 先做总控 LLM / orchestration
- 先追求多 host

而是：

- 先把 Dota2 这条完整主线跑通
- 并证明 feature-first 的交互和管理方式是成立的

## 成功标准

这一阶段成功，不靠“做了多少外围系统”衡量，而靠下面几件事：

1. 用户可以描述一个 Dota2 feature，并得到结构化 proposal
2. proposal 可以通过 pattern / blueprint / gap fill 进入可写入路径
3. 系统可以把 feature 写入 Dota2 host，并能稳定管理这个 feature
4. feature 可以被查看、更新、重生成，且结果仍可解释
5. failure corpus 能真实反映 proposal / pattern / gap fill / runtime 的问题

## 主线范围

### In Scope

- Dota2 pattern catalog 的可用主链
- proposal -> blueprint -> write 的主路径稳定性
- feature create / inspect / update / regenerate
- constrained gap fill 的最小可用能力
- runtime verification
- failure corpus / structured review signals

### Deferred

- full governance productization
- richer confirmation / release workflows
- global orchestrator / control-plane LLM
- multi-host expansion
- heavier frontend polish beyond mainline support

## 重点能力

### 1. Proposal Stability

需要持续提高：

- proposal 生成成功率
- module role / category / pattern suggestion 质量
- invalid pattern suggestion 可见性
- runtime provider compatibility

这是整条链的入口质量。

### 2. Pattern Mainline Integrity

需要保持：

- canonical available pattern source
- builder / resolver / proposal side validation 一致
- core pattern id 引用不漂移

这条线决定系统有没有稳定骨架。

### 3. Constrained Gap Fill

当前只需要最小可用能力，而不是无限扩张。

重点是：

- Category A 保持稳定
- Category B 真正可观察、可验证
- Category E 作为最小边界表达继续收紧
- Category C / D 暂缓大面积铺开

### 4. Dota2 Host Realization

需要重点看：

- 写入路径稳定性
- 生成物是否落到正确 host outputs
- Dota2-specific patterns 是否真的能转成可工作的宿主代码

这是“生成是否真的有用”的关键。

### 5. Feature Management

当前主线必须逐步形成：

- create
- inspect
- update
- regenerate

不要求先把所有治理层做完，但必须让 feature 成为第一公民对象，而不是一次性输出。

### 6. Failure Corpus

当前已经有最小结构，下一步要靠真实样本驱动：

- proposal 问题
- invalid pattern ids
- Category B unfilled
- Category E
- degraded / fallback

这会决定后续优先修哪里。

## 约束原则

### 1. 不让 Dota2 反污染 core

每次加能力时都要判断：

- 这是 core 概念
- 还是 Dota2 adapter 逻辑

如果只是 Dota2 特例，不应该直接塞进 core pipeline。

### 2. 不让 gap fill 替代 pattern

gap fill 只能做受控补齐，不能长期替代高频 pattern。

### 3. 不把 feature 管理退化成文件管理

用户操作的对象必须仍然是 feature，而不是散落的宿主文件。

### 4. 以 failure-driven 方式补强

后续增强优先级要由：

- runtime verification
- corpus
- repeated failure mode

来决定，而不是凭感觉扩很多能力。

## 推荐推进顺序

### Step 1. Proposal / Runtime / Corpus 收稳

重点：

- proposal 稳定性
- provider compatibility
- Category B runtime truth
- corpus 批量采样

### Step 2. Pattern 主链收稳

重点：

- canonical source
- proposal-side validation
- invalid pattern observability
- shared pattern constants

### Step 3. Dota2 写入主线收稳

重点：

- create / write
- regenerate / update
- host realization 可解释性

### Step 4. Feature Management 主线收稳

重点：

- feature object inspection
- lifecycle actions
- update/regenerate continuity

### Step 5. 定向补强高频缺口

只根据真实失败样本去补：

- pattern
- prompt
- gap fill
- host adapter behavior

## 当前判断

如果把当前阶段目标收缩为：

- Dota2 code generation
- feature management

同时暂缓：

- 完整 governance 产品化
- 总控 LLM / orchestration

那么当前项目更接近：

- “正在构建一个可验证的垂直产品核”

而不是：

- “试图一次做完整平台”

## 下一步

当前最值的下一步不是再扩大范围，而是继续沿主线推进：

1. reviewable failure corpus batch
2. proposal / provider / Category B success rate
3. Dota2 write-path and feature lifecycle continuity

等这三条更稳以后，再决定要不要把更重的 governance / control-plane 重新提到前面。

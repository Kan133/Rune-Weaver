# 结构化经验层约束框架（中文）

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: temporary
> Last verified: 2026-04-14
> Read when: evaluating future structured-experience-layer design or RAG/preset organization
> Do not use for: current baseline contract authority, current host policy, or execution routing

## 目的

本文档用于明确 Rune Weaver 中 `case / feature / preset / example / pattern 经验层` 的组织边界，避免在 Phase 2 / Phase 3 推进过程中把经验资产做成：

- 一个裸 RAG 文本堆
- 一个隐式规则系统
- 一个反向污染 Blueprint / contract 的知识黑箱

这份文档只定义边界，不定义完整实现方案。

---

## 一句话定义

**结构化经验层是 Rune Weaver 的辅助知识层，用于提高提案质量、默认值质量和产品体验质量，但不能取代 contract、policy 和治理层。**

---

## 为什么必须有经验层

如果只有：

- schema
- pattern
- contract
- policy

Rune Weaver 会越来越像：

- 一个硬而死的工程系统

这会导致：

- case 推进越来越依赖写死 builder
- Wizard 很难给出高质量默认值
- LLM proposal 缺乏现实经验支撑

因此经验层是必要的。

---

## 为什么不能只是裸 RAG

如果只把所有历史 case、feature、文档、prompt 塞进一个 RAG 池里，会出现：

- 经验互相污染
- 成熟度无法区分
- host 适配范围不清
- 模型把经验误当规则

所以 Rune Weaver 的经验层必须是：

**结构化的、带成熟度和适用边界的经验层**

而不是纯文本记忆池。

---

## 经验层与规则层的边界

### 规则层负责

- schema
- policy
- host ownership
- realization contract
- routing contract
- lifecycle contract
- conflict governance

### 经验层负责

- 更好的默认值
- 更合理的 case 拆解建议
- 更好的 Wizard 提问
- 更真实的 feature 参考

一句话：

- 规则层决定什么是合法的
- 经验层帮助系统更好地提出候选

---

## 经验层应包含哪些资产类型

### 1. Pattern 资产

这是能力原语层。

例如：

- core patterns
- canonical patterns
- pattern examples
- pattern compatibility hints

### 2. Case 资产

这是场景模板层。

例如：

- 单次天赋选择
- 区域触发刷兵
- 装备购买与应用

它们用于帮助：

- Wizard
- Blueprint planning
- 参数默认值建议

### 3. Feature 资产

这是历史运行与治理层。

例如：

- 已落地 feature 的结构
- 已验证 feature 的 ownership 经验
- 已知高风险点

它们更适合帮助：

- review
- validation
- conflict governance

### 4. Preset 资产

例如：

- 参数预设
- UI 文案预设
- 低风险默认组合

它们更适合帮助：

- Wizard
- gap-fill
- onboarding

---

## 经验层不应做什么

### 1. 不应反向定义底层 contract

不能因为某个 case 以前这么做过，就把它写成系统默认规则。

### 2. 不应替代 pattern 模型

经验层不能长期承载本应升级为 pattern 的稳定机制。

### 3. 不应替代冲突治理

经验层可以提示“这里以前常见冲突”，但不能最终裁决是否合法。

### 4. 不应直接决定写入

经验层永远不能跳过：

- contract checks
- governance checks
- write safety checks

---

## 结构化字段建议

经验资产至少应具备一部分结构化标签，而不是只有自然语言说明。

例如：

- host
- feature type
- patterns used
- module shape
- parameter presets
- validation status
- maturity
- known risks
- example prompt

这样经验层才能被：

- Wizard
- Blueprint LLM
- review
- gap-fill

安全使用。

---

## 成熟度层级建议

经验资产不应一视同仁。

至少建议区分：

- core
- verified
- canonical
- preset
- community
- experimental

这样系统才能知道：

- 哪些可以默认优先使用
- 哪些只能作为候选参考
- 哪些不能进入主干默认路径

---

## 与 Wizard 的关系

经验层应帮助 Wizard：

- 更好地补问
- 更好地给默认值
- 更好地推荐 case shape

但不能让 Wizard 直接把经验当成规则。

---

## 与 Blueprint LLM 的关系

经验层可以给 LLM 提供更真实的 proposal 参考。

但 LLM 不能因为召回了一个经验样本，就绕过：

- schema
- policy
- host checks
- governance

---

## 与 Gap Fill 的关系

经验层可以提供：

- 常见默认参数
- 常见 copy 风格
- 常见局部 patch 例子

但不能让 gap-fill 因为“看起来像以前的例子”就升级成新机制。

---

## 宿主污染防线

结构化经验层最容易被第一宿主污染。

必须明确：

- Dota2 的经验只能作为 Dota2 host 经验
- 不能自动升格为通用经验
- 经验项必须带 host 边界

否则第二宿主一进来，整个经验层都会天然偏向 Dota2。

---

## Phase 2 接入顺序

### Phase 2A

先建立：

- 经验层资产类型
- 基本成熟度标记
- 基本 host 标签

### Phase 2B

再接入：

- Wizard defaulting
- Blueprint proposal retrieval

### Phase 2C

最后再接入：

- review recommendations
- richer gap-fill suggestions
- cross-case pattern hints

---

## 最终一句话

Rune Weaver 的 `结构化经验层` 应该被定义为：

**一个带有成熟度、宿主边界和适用范围标签的辅助知识层。它用于提高提案与补全质量，但不能替代 contract、pattern、治理层和写入裁决。**

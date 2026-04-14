# Blueprint + LLM 约束框架（中文）

## 目的

本文档用于明确 Rune Weaver 中 `LLM 参与 Blueprint` 的边界，避免在 Phase 2 / Phase 3 推进过程中把 Blueprint LLM 做成：

- 自由生成图的黑盒
- 绕过 contract 的超级规划器
- 经验层反向定义系统主干的通道
- 把 Dota2 当前经验直接写死成“通用 Blueprint 常识”的入口

这份文档只定义边界，不定义完整实现方案。

---

## 一句话定义

**LLM 在 Blueprint 中的角色是 proposal 层，而不是 final authority。**

也就是说：

- LLM 可以提案
- 系统必须审核
- 最终进入正式 pipeline 的必须是受控 Blueprint

---

## 为什么需要 LLM 参与

如果 Blueprint 长期完全不让 LLM 参与，只靠：

- 固定 builder
- 固定 heuristics
- 固定 pattern mapping

那长期会出现：

- blueprint 模板数量爆炸
- 新 case 推进越来越依赖写死 builder 规则
- 灵活性越来越低

因此 Phase 2 以后让 LLM 参与 Blueprint planning 是必要的。

---

## 为什么不能让 LLM 全权负责

因为如果 Blueprint 直接由 LLM 自由决定：

- 可重复性下降
- contract 漂移加剧
- host-specific 污染更容易渗入
- conflict / lifecycle / ownership 更难治理

所以：

- 不用 LLM，系统会越来越硬
- 让 LLM 全权负责，系统会越来越漂

正确方向只能是：

**LLM 提案，系统裁决。**

---

## LLM 可以做什么

### 1. 提出 Blueprint 草案

例如：

- 建议 modules
- 建议 module roles
- 建议连接关系
- 建议参数组织方式

### 2. 帮助做 case 拆解

例如：

- 用户需求应拆成几个模块
- 哪些功能应分属 trigger / data / rule / ui / effect

### 3. 参考经验层给出候选

例如：

- 借鉴已有 case preset
- 借鉴验证过的 feature shape

### 4. 标出潜在不确定点

例如：

- 哪些地方需要用户确认
- 哪些地方存在多种可行结构

---

## LLM 不可以做什么

### 1. 不得直接成为 final Blueprint

LLM 产出的只能是 proposal，不应直接跳过审查进入 execution。

### 2. 不得单独决定 host realization

例如：

- 不得决定最终输出落到什么 host target
- 不得决定 generator family
- 不得决定写入路径

### 3. 不得单独决定 conflict 合法性

它可以提示风险，但不能单独决定：

- 是否允许共存
- 是否阻止写入
- 谁拥有某个 integration point

### 4. 不得越过 product / phase boundary

例如：

- 在 Phase 2 过早做出 graph orchestration 假设
- 直接把未来 scene/world model 硬写进 Blueprint 核心

---

## Proposal 与 Final Blueprint 的边界

### Proposal 应包含

- modules 建议
- connections 建议
- parameter placement 建议
- uncertainty notes

### Final Blueprint 必须满足

- schema validation
- contract admissibility
- host policy checks
- conflict pre-check
- lifecycle safety baseline

如果 proposal 过不了这些门，就不能进入 final Blueprint。

---

## 与经验层 / RAG 的关系

LLM 可以使用经验层，但经验层不能成为宪法。

### 可以使用的经验层

- case presets
- verified examples
- feature templates
- parameter defaults

### 不允许发生的事

- “因为某个 case 以前这样做过，所以现在必须这样做”
- “因为 RAG 召回了 Dota2 的经验，所以通用 Blueprint 就变成 Dota2 风格”

经验层只能帮助 proposal 变好，不能反向定义底层规则。

---

## 与 Main Wizard 的关系

Main Wizard 负责：

- 需求 intake
- 缺参补问
- 是否需要专项分支

Blueprint LLM 负责：

- 在 intake 之后提出结构化方案

所以：

- Wizard 是输入整理层
- Blueprint LLM 是结构提案层

两者不应混成一个黑盒。

---

## 与 Gap Fill 的关系

Gap-fill 发生在：

- 主结构已经确定之后

Blueprint LLM 发生在：

- 主结构尚在规划阶段

因此：

- Blueprint LLM 不能被 gap-fill 替代
- gap-fill 也不能提前承担结构规划职责

---

## 宿主污染防线

Blueprint LLM 最容易被当前第一宿主污染。

必须明确防止：

- 默认按 Dota2 术语拆模块
- 默认按 Dota2 习惯命名 feature
- 默认把 Dota2 的落地方式视为通用 feature 结构

允许宿主进入的层只有：

- host-aware admissibility checks
- host-specific realization feasibility checks

不允许宿主定义：

- 通用 Blueprint 语言
- 通用 module categories
- 通用产品逻辑

---

## Phase 2 接入顺序

推荐顺序如下：

### Phase 2A

先不做 Blueprint LLM，只把：

- Wizard
- governance baseline
- review baseline

做起来。

### Phase 2B

再引入：

- Blueprint proposal agent v1
- basic contract gating

### Phase 2C

最后再扩大：

- richer proposal reasoning
- structured experience retrieval
- more mature uncertainty handling

---

## 最终一句话

Rune Weaver 中的 `Blueprint + LLM` 应该被定义为：

**一个受 contract、policy、host admissibility 和治理层共同约束的结构提案层。LLM 负责提出更灵活的 feature 结构候选，但不能越权成为最终 Blueprint 的唯一裁决者。**

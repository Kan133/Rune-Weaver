# PATTERN-PIPELINE

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-14
> Read when: understanding the pattern candidate -> draft -> admission pipeline
> Do not use for: current backlog priority, host-specific implementation notes, or pattern admission authority by itself

## 目标

这份文档定义 Rune Weaver 的 pattern 自动化流程。

重点不是“如何写一个超长 prompt”，而是：

- candidate 如何产生
- draft 如何规范化
- admission 如何阻止坏 pattern 入库
- catalog 如何保持稳定

## 1. 基本结论

Pattern 自动化应采用受控 pipeline，而不是让单个 agent 写完后直接入库。

推荐流程：

`candidate -> draft -> admission -> catalog`

必要时可拆成三个角色：

- extractor
- author
- reviewer

## 2. 四阶段流程

### 2.1 Candidate Extraction

输入来源可以是：

- 参考文档
- 旧代码
- 宿主 API / 教程
- 已有实现中的重复机制

输出不是正式 pattern，而是：

- `PatternCandidate`

它至少要说明：

- 候选机制名称
- 观察到的职责
- 来源材料
- 是否可能复用
- 当前疑问

### 2.2 Draft Authoring

这一步把 candidate 规范化成 draft。

产物必须至少包含：

- identity
- responsibilities
- nonGoals
- parameters
- dependencies
- validationHints
- hostBindings
- examples

### 2.3 Admission Check

这一步决定草案能否进入 catalog。

最低检查应包括：

- 字段完整性
- 是否是领域专用伪 pattern
- 是否与现有 pattern 重复
- 是否把宿主 API 错当 core pattern
- host binding 是否合法

draft 通过 admission 前，不应视为正式 pattern。

### 2.4 Catalog Integration

只有通过 admission 的 pattern 才能进入正式 catalog。

进入 catalog 后，需要同步：

- pattern validate
- draft check
- resolver 可用集合
- gap / backlog 文档

## 3. 三类角色建议

### 3.1 Pattern Extractor

职责：

- 从 references / code / docs 中提取候选机制
- 识别重复出现的 mechanic
- 不直接决定入库

### 3.2 Pattern Author

职责：

- 把 candidate 变成合规 draft
- 规范 identity / contract / host binding
- 明确 nonGoals 与 examples

### 3.3 Pattern Reviewer / Admission

职责：

- 检查 draft 是否满足规范
- 判断是否与现有 catalog 冲突或重复
- 拒绝领域专用伪 pattern

这一步可以是：

- 规则化校验
- 轻量人工 review
- 二者组合

## 4. 六条硬规则

### Rule 1

先问：这是不是 mechanic。

如果它只是：

- API
- KV 字段
- enum
- helper function

通常不应做成 pattern。

### Rule 2

先问：它能否跨题材复用。

如果它只能服务：

- 天赋
- 卡牌
- 锻造

其中一个领域名字，那大概率不是好 pattern。

### Rule 3

责任与非目标必须能说清。

如果说不清：

- 负责什么
- 不负责什么

就不应入库。

### Rule 4

先扫描 catalog，优先复用，不优先新增。

新需求首先判断：

- 是否是已有 pattern 组合
- 是否是参数扩展
- 是否是 host binding 扩充

### Rule 5

Host 细节不能冒充 core mechanic。

Dota2 API / Panorama / KV / NetTable / modifier property 这些属于 host binding 材料，不是 pattern 本体。

### Rule 6

Agent 只负责草案，不负责真理。

正式入库必须经过 admission。

## 5. Candidate 的最小结构

建议最小结构：

```ts
interface PatternCandidate {
  proposedId: string;
  summary: string;
  sourceRefs: string[];
  repeatedMechanic: string;
  likelyCategory: string;
  possibleParameters: string[];
  notes?: string[];
}
```

## 6. Draft 的最小结构

Draft 至少应覆盖：

- `id`
- `summary`
- `responsibilities`
- `nonGoals`
- `parameters`
- `dependencies`
- `validationHints`
- `hostBindings`
- `examples`

## 7. Admission 的最低门槛

当前最低门槛建议：

- `id` 存在
- `summary` 存在
- `responsibilities` 存在
- `nonGoals` 存在
- `parameters` 存在
- `hostBindings` 存在

以下可以保留为较弱门槛，但仍建议存在：

- `examples`
- `antiPatterns`

## 8. UI Pattern 的特殊说明

UI pattern 也走同一条 pipeline。

不要因为它是 UI 就绕过 core pattern 规则。

因此：

- `ui.selection_modal` 可以是 pattern
- `ui.talent_screen` 不应直接成为 pattern

UI 的视觉差异更多应进入：

- `UIDesignSpec`
- constrained gap fill

而不是 catalog 膨胀。

## 9. 与现有文档的关系

这份文档负责“流程层”。

它与其他 pattern 文档的关系如下：

- `PATTERN-MODEL.md`
  - 解决“pattern 是什么”
- `PATTERN-SPEC.md`
  - 解决“什么样的 pattern 合格”
- `PATTERN-AUTHORING-GUIDE.md`
  - 解决“如何撰写 draft”
- `PATTERN-PIPELINE.md`
  - 解决“draft 如何进入 catalog”

## 10. 当前结论

在新项目里，pattern 自动化应建立在：

- 明确模型
- 明确流程
- 明确 admission

之上。

不要再依赖单个超长 skill prompt 去同时完成：

- 候选发现
- 抽象建模
- 重复检查
- 最终入库

那样不稳，也不利于后续扩展到其他宿主。

# 宿主能力矩阵约束框架（中文）

## 目的

本文档用于明确 Rune Weaver 在未来支持多个宿主时，应该如何用“能力矩阵”而不是“宿主硬编码”来组织支持范围。

它的目标是避免：

- 每加一个宿主就改半个产品
- 把宿主特例写进产品主层
- 误把“部分支持”写成“完整支持”

---

## 一句话定义

**宿主能力矩阵是 Rune Weaver 用来描述“某个宿主目前支持哪些通用能力、缺哪些能力、哪些能力仍受限制”的中间层。**

它不是宿主实现本身，而是宿主 contract 层的一部分。

---

## 为什么需要能力矩阵

未来 Rune Weaver 不会只有一个宿主。

如果每次扩宿主都靠：

- 人工记忆
- 零散文档
- Dota2 经验外推

那很快就会失控。

能力矩阵的价值在于：

- 明确一个宿主“现在能做什么”
- 明确一个宿主“还不能做什么”
- 明确一个宿主“哪些能力是部分支持”

这样产品与规划层都能少犯错。

---

## 能力矩阵不是什么

### 1. 不是宿主实现清单

它不替代 generator、adapter、routing 实现文档。

### 2. 不是产品主层 schema

它不应反向定义通用 feature 模型。

### 3. 不是 marketing 文案

它的职责是诚实表达能力边界，而不是夸大支持范围。

---

## 应记录的能力类型

能力矩阵应尽量记录通用 feature capability，而不是宿主特有术语。

例如更合理的能力表达是：

- supports_triggered_feature
- supports_ui_surface
- supports_shared_data
- supports_effect_runtime
- supports_reviewable_write
- supports_regenerate
- supports_conflict_detection
- supports_scene_reference
- supports_runtime_validation

而不是直接写：

- supports_kv
- supports_panorama
- supports_modifier

后者只能作为宿主内部实现细节。

---

## 能力状态建议

一个能力不应只有“支持 / 不支持”两档。

建议至少有：

- supported
- partial
- experimental
- blocked
- not-planned

这样可以避免把宿主能力说得过满。

---

## 谁使用能力矩阵

### 1. Wizard / Blueprint planning

用来避免提出宿主当前无法承接的 feature shape。

### 2. Review / Validation

用来解释为什么某些能力当前还不该执行。

### 3. Host extension planning

用来判断一个新宿主是否值得继续投入。

---

## 与 Host Pack 的关系

能力矩阵不是 host pack 本身，但 host pack 应该能映射到能力矩阵。

一句话：

- host pack 负责“怎么做”
- 能力矩阵负责“现在做到什么程度”

---

## 宿主污染防线

能力矩阵必须保持宿主中立的表达层。

例如：

- 可以说“支持 UI surface”
- 不应把 “Panorama” 写成通用能力名

否则 Dota2 会反向定义产品语言。

---

## 最终一句话

Rune Weaver 的 `宿主能力矩阵` 应该被定义为：

**一个位于产品主层与宿主实现层之间的能力边界表达层，用于诚实描述每个宿主当前能承接哪些通用 feature capability，以及哪些能力仍然部分支持、实验性支持或尚不支持。**

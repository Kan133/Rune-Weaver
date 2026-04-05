# Dota Data Ingestion

## 1. 目的

本文件定义如何将 `ModDota/dota-data` 接入 Rune Weaver 的资料体系。

目标不是把仓库原样塞进 `knowledge/`，而是：

- 将原始仓库存放到 `references/`
- 将对开发有用的 API 与类型信息整理为 `knowledge/`
- 为后续 Pattern 提取、Host Mapping、Dota2 Adapter 开发提供稳定知识底座

---

## 2. 存放规则

### 原始资料

原始仓库存放到：

`references/dota2/dota-data/`

这里保留仓库原样结构，不做手改，不与加工后的知识混放。

### 加工后知识

加工后的知识存放到：

`knowledge/dota2-host/api/`

这里存放经过筛选、切分、归类后的可消费内容。

---

## 3. 为什么要分 references 和 knowledge

`dota-data` 是原始语料，不应直接视为系统可消费知识。

原因：

- 原始仓库结构按上游项目组织，不按 Rune Weaver 开发任务组织
- 原始资料通常粒度过粗，后续 agent 很难直接消费
- 我们需要的是“按用途整理后的宿主 API 知识”，而不是“又一份原始仓库”

因此：

- `references/` 负责保留来源
- `knowledge/` 负责提供可消费视图

---

## 4. 第一版整理范围

当前不需要把 `dota-data` 全量重写成一套新文档。

第一版只整理对当前开发最有价值的内容：

- `abilities`
- `modifiers`
- `events`
- `units`
- `items`
- `enums`
- `panorama`
- `common-types`

这些分类应服务于当前主链路：

- Wizard / Blueprint 之后的 Dota2 Host Mapping
- Pattern 提取与 Pattern 编写
- AssemblyPlan 到宿主写入边界的落地

---

## 5. knowledge 目标结构

建议结构如下：

```text
knowledge/
  dota2-host/
    api/
      README.md
      abilities/
        README.md
      modifiers/
        README.md
      events/
        README.md
      units/
        README.md
      items/
        README.md
      enums/
        README.md
      panorama/
        README.md
      common-types/
        README.md
```

每个子目录下先允许只有 `README.md`，不要求第一天就拆满。

---

## 6. 每类知识应该如何写

每个分类的 `README.md` 应尽量统一为以下结构：

1. 这一类知识解决什么问题
2. 对 Rune Weaver 哪些模块有用
3. 当前优先看的上游来源有哪些
4. 关键 API / 类型 / 约束摘要
5. 适合支撑哪些 Pattern
6. 当前缺口

这意味着知识整理不是“复制文档”，而是“提炼成开发可用摘要”。

---

## 7. 当前最值得优先整理的内容

如果时间有限，优先级建议如下：

### P0

- `abilities`
- `modifiers`
- `events`
- `panorama`

原因：

- 当前 Pattern 与 AssemblyPlan 已经开始逼近真实宿主写入
- 这几类最直接支撑 Dota2 Adapter 和 Host Mapping

### P1

- `units`
- `items`
- `enums`

### P2

- `common-types`
- 更细粒度专题整理

---

## 8. 与 Pattern 的关系

`dota-data` 整理后的知识主要用于两件事：

1. 支撑 Dota2 Host API 理解
2. 为 Pattern host binding 提供依据

它不应直接替代 Pattern。

也就是说：

- `knowledge` 说明“宿主有什么能力”
- `pattern` 说明“这些能力如何被组合成可复用机制”

---

## 9. 与当前阶段的关系

这项工作值得现在做，但不应阻塞主线。

当前建议定位：

- 作为并行知识同步任务推进
- 不阻塞当前 `AssemblyPlan -> Host Write Mapping`

原因：

- 它会提升宿主知识质量
- 但主链路当前更关键的是写入边界与桥接规划

---

## 10. 第一轮完成标准

第一轮不要求把 `dota-data` 全量消化。

完成标准可以收敛为：

1. 原始仓库已进入 `references/dota2/dota-data/`
2. `knowledge/dota2-host/api/` 目录已建立
3. 至少完成 4 个 P0 分类的 README
4. 每个 README 都能指出：
   - 主要来源
   - 关键 API / 类型
   - 对当前 Pattern / Host Mapping 的用途

只要达到这四条，就足以作为当前阶段的 API 知识基线。

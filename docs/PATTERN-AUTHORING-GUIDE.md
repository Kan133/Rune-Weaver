# Rune Weaver Pattern 提取与撰写指南

## 1. 文档目的

本文档用于指导人类开发者和 LLM agent 为 Rune Weaver 提取、整理、撰写 Dota2 Pattern。

它回答：

1. 一个候选机制能否提炼为 Pattern
2. 如何从 Dota2 资料或实现中抽取 Pattern
3. 如何写出一个可入库的 Pattern
4. 如何避免把 Pattern 写成杂乱模板

---

## 2. 使用前提

本指南依赖：

- `PRODUCT.md`
- `ARCHITECTURE.md`
- `SCHEMA.md`
- `PATTERN-SPEC.md`

如果这些文档中的定义与当前 Pattern 写法冲突，以这些文档为准，而不是以旧实现习惯为准。

---

## 3. Pattern 提取的目标

Pattern 提取不是把已有 Dota2 代码“搬运进仓库”。

Pattern 提取的目标是：

- 从已有实现中抽出稳定职责
- 去除项目专属噪音
- 找到可复用参数
- 找到可组合边界
- 写成可被 Blueprint / Resolver / Assembler 消费的结构

提取后的 Pattern 应该服务于：

- 可复用
- 可组合
- 可验证
- 可由 agent 理解和调用

---

## 4. 何时适合提取为 Pattern

以下情况通常适合提取为 Pattern：

- 它解决的是重复出现的问题
- 它的职责相对稳定
- 它可以通过参数表达主要变化
- 它可以被多个功能复用
- 它可以被明确地说明输入、输出、依赖、约束

例如：

- 输入绑定
- 加权抽取池
- 资源条 UI
- 三选一选择弹窗
- 基础效果壳层

以下情况通常不适合直接提取为通用 Pattern：

- 某个项目专属剧情逻辑
- 强依赖具体地图流程的特殊状态机
- 只有一次性用途的大型硬编码脚本
- 职责混杂且难以拆开的巨型模块

---

## 5. Pattern 提取流程

推荐使用以下六步流程。

## Step 1: 找职责

先不要看模板怎么写，先回答：

`这段实现真正稳定解决的问题是什么？`

如果一句话说不清楚职责，就说明还不适合提取。

## Step 2: 去噪音

把以下内容从候选实现中剥离：

- 项目专属命名
- 一次性硬编码数值
- 地图私有流程
- 临时 workaround
- 与主职责无关的副逻辑

## Step 3: 找参数

识别哪些部分应成为 Pattern 参数。

常见参数来源：

- 数值
- 方向
- 触发条件
- UI 展示数量
- 稀有度层级
- 样式预设

## Step 4: 找边界

回答：

- 这个 Pattern 的输入是什么
- 输出是什么
- 依赖什么
- 不负责什么

## Step 5: 找宿主落点

在 Dota2 中明确它落在哪：

- server
- client
- ui
- shared
- config

## Step 6: 写成规范对象

最后再写：

- metadata
- params
- constraints
- examples
- validation hints
- host binding

---

## 6. 推荐撰写格式

一个 Dota2 Pattern 至少应有以下信息：

### 6.1 基本信息

- `id`
- `name`
- `category`
- `summary`

### 6.2 职责

- `responsibilities`
- `nonGoals`

### 6.3 参数

- `params`

### 6.4 输入输出

- `inputs`
- `outputs`

### 6.5 约束

- `constraints`
- `dependencies`

### 6.6 Dota2 绑定信息

- 宿主侧文件或模板
- 所在侧别
- 对 Panorama / KV / wiring 的依赖说明

### 6.7 示例

- 一个标准用例
- 一个不适用用例

### 6.8 验证

- 至少写出最基本的验证点

---

## 7. LLM 提取时的行为要求

如果由 LLM 或 agent 执行 Pattern 提取，必须遵循以下要求：

### 7.1 先抽象，再写 Pattern

不要先复制代码，再事后硬套 metadata。

正确顺序是：

1. 描述职责
2. 描述边界
3. 找参数
4. 写 PatternMeta
5. 最后补宿主实现

### 7.2 不得把“完整系统”直接命名成单个通用 Pattern

例如：

- “天赋抽取系统”通常不是一个单独 Pattern

更合理的拆法可能是：

- input binding
- weighted pool
- selection modal
- rule flow
- talent apply flow

### 7.3 不得省略 non-goals

如果不写 `nonGoals`，Pattern 边界会不断膨胀。

### 7.4 不得只交模板不交元数据

没有 PatternMeta 的模板，不应视为正式 Pattern。

### 7.5 不得把临时 workaround 当成规范能力

例如：

- 某次为修复编译问题加的特殊 hack
- 某个旧项目中的脏注入方式

这些可以记录在 notes 中，但不应直接写成 Pattern 的标准行为。

---

## 8. Dota2 Pattern 提取特别规则

由于当前 MVP 先做 Dota2，提取 Dota2 Pattern 时应特别注意：

### 8.1 区分语义层与宿主层

先描述：

- 这是个什么功能构件

再描述：

- 它在 Dota2 中如何实现

而不是一开始就把 Pattern 写成：

- 某个 TS 文件
- 某个 Panorama 组件
- 某个 KV block

### 8.2 Panorama 相关 Pattern 单独谨慎

UI Pattern 必须额外说明：

- 功能职责
- 交互职责
- 布局自由度
- 样式自由度

不要把具体像素布局直接写死进通用 Pattern 定义。

### 8.3 资源系统与规则系统优先高于花哨效果

优先提取：

- 可复用系统骨架
- 输入桥
- 资源同步
- 选择流程
- 数据池

次优先才是：

- 很花哨但复用性低的单个特效逻辑

### 8.4 先支持 MVP 用例相关 Pattern

优先服务以下三类用例：

- 微功能
- 独立系统
- 跨系统组合

如果一个候选 Pattern 无法支撑这三类中的任何一种，优先级应降低。

---

## 9. 推荐的 Pattern 入库模板

下面给出一个可供人和 agent 使用的 Pattern 记录模板。

```md
# Pattern: {name}

## Basic
- id:
- category:
- host:
- version:

## Summary
- summary:

## Responsibilities
- ...

## Non-goals
- ...

## Parameters
- name:
  - type:
  - required:
  - description:

## Inputs
- ...

## Outputs
- ...

## Constraints
- ...

## Dependencies
- ...

## Dota2 Binding
- side:
- implementation assets:
- notes:

## Examples
- standard case:
- edge case:
- not suitable for:

## Validation
- required checks:
- host checks:
- smoke hints:
```

---

## 10. 常见错误

### 错误 1：把 Pattern 写成一个大系统

错误做法：

- 一个 Pattern 同时负责输入、数据池、规则、UI、应用逻辑

正确做法：

- 按职责拆分成多个可组合 Pattern

### 错误 2：只有模板，没有语义

错误做法：

- 交一个模板目录，但没有职责、参数、输入输出说明

正确做法：

- 模板只是宿主绑定的一部分，必须有 PatternMeta

### 错误 3：参数太少

错误做法：

- 每遇到一个变化就新建一个 Pattern

正确做法：

- 先判断该变化是否应被参数化

### 错误 4：参数太多

错误做法：

- 把任何细节都做成参数，结果 Pattern 失去边界

正确做法：

- 只参数化主要变体，把次级差异交给 UI Spec 或扩展点

### 错误 5：把历史 hack 升格成标准

错误做法：

- 某个 workaround 直接被写入 Pattern 规范

正确做法：

- 记录 hack，但不要默认它是规范能力

---

## 11. Pattern 入库验收标准

一个新 Pattern 被认为可入库，至少应满足：

1. 职责清楚
2. 边界清楚
3. 参数可用
4. 输入输出明确
5. 依赖与约束明确
6. Dota2 宿主落点明确
7. 有至少一个标准示例
8. 有基础验证说明

建议对每个 Pattern 都做一个简化验收表：

```md
- [ ] 职责清楚
- [ ] 非目标清楚
- [ ] 参数完整
- [ ] 输入输出明确
- [ ] 依赖明确
- [ ] 宿主落点明确
- [ ] 示例存在
- [ ] 验证说明存在
```

---

## 12. 给 Agent 的直接指令

如果 agent 要提取或撰写 Dota2 Pattern，应遵循以下固定顺序：

1. 先写一句职责定义
2. 写 non-goals
3. 写参数
4. 写输入输出
5. 写依赖和冲突
6. 再补 Dota2 host binding
7. 最后补示例与验证

不得反过来先从代码模板开始。

---

## 13. 当前结论

当前阶段，Pattern 提取与撰写的真正目标不是“收集更多模板”，而是：

`建立一套能被 Rune Weaver 核心编排层稳定理解和消费的 Dota2 功能构件体系。`

如果一个提取结果不能进入：

- Pattern Catalog
- Pattern Resolver
- AssemblyPlan

那它就还不算真正完成了 Pattern 化。

# Feature Review 约束框架（中文）

## 目的

本文档用于明确 Rune Weaver 中 `Feature Review` 的产品边界，避免在 Phase 2 / Phase 3 推进过程中把 review 做成：

- 传统 PR code review 的翻版
- 只给专家看的底层 diff 面
- 一堆用户看不懂的实现细节堆叠
- 纯解释层，没有执行责任

这份文档只定义边界，不定义完整实现方案。

---

## 一句话定义

**Feature Review 是 Rune Weaver 在执行前后向用户展示“这个功能将做什么、影响什么、风险是什么、是否值得继续”的产品面。**

它不是传统意义上的 code review，而是：

- feature diff
- impact review
- validation review
- lifecycle review

的组合。

---

## 为什么它必须存在

Rune Weaver 如果只有：

- 需求输入
- 自动生成
- 写入完成

那用户最终感知到的仍然会很接近普通 vibe coding。

Rune Weaver 要想建立产品差异，必须有一个地方明确展示：

- 这个 feature 会生成什么
- 会影响哪些面
- 有什么冲突或风险
- 哪些值仍是默认或占位
- 是否适合执行

这就是 Feature Review 的价值。

---

## Feature Review 不是什么

### 1. 不是传统 PR Code Review

它不是为了评估：

- 代码风格
- 语法优雅性
- 局部实现是否“好看”

它首先关注的是 feature 作为产品单元的影响。

### 2. 不是宿主专家面板

不能默认向所有用户直接暴露：

- routeKind
- generator family
- exact host patch segment
- Dota2 专项术语

这些可以存在，但应该是下钻信息。

### 3. 不是纯解释层

Feature Review 不只是“给你看一眼”。

它必须和：

- confirm
- block
- rollback
- regenerate

这些动作建立关系。

---

## Feature Review 至少应该覆盖什么

### 1. Feature 意图

例如：

- 这个 feature 想做什么
- 它属于哪类能力

### 2. 结构影响

例如：

- 生成了哪些模块
- 会改哪些输出面
- 会写哪些文件范围

### 3. 风险与冲突

例如：

- 是否与已有 feature 冲突
- 是否存在 ownership 风险
- 是否存在未确认默认值

### 4. 验证状态

例如：

- 代码级验证是否通过
- host-facing 验证是否通过
- 哪些环节仍受环境/toolchain 限制

### 5. 生命周期影响

例如：

- 这次是 create、update 还是 regenerate
- 后续 rollback 是否仍可成立

---

## 必须分层的用户视图

Feature Review 不能只有一种视图。

### 默认视图：面向普通用户

重点展示：

- 功能会做什么
- 会影响哪些系统面
- 哪些值需要确认
- 有什么风险
- 是否建议继续

### 专家视图：面向高级用户 / agent

可下钻展示：

- modules
- ownership
- integration points
- host-specific outputs
- generated artifacts
- conflicts and policies

如果不分层，review 很容易变成“把底层责任转嫁给用户”。

---

## Feature Review 与 Code Review 的关系

可以把 Code Review 理解为专家下钻层，但不是默认主层。

也就是说：

- Feature Review 是主面
- Code Review 是下钻面

Rune Weaver 的产品价值，不应建立在“用户自己读生成代码判断有没有问题”上。

---

## Feature Review 与 Conflict Governance 的关系

Feature Review 是冲突治理的前台呈现面之一。

冲突治理负责：

- detect
- explain
- propose
- confirm

Feature Review 负责把这些结果以用户可理解的方式展示出来。

所以：

- 冲突治理不是 review 本身
- 但 review 必须承接冲突治理结果

---

## Feature Review 与 Lifecycle 的关系

Feature Review 必须能明确告诉用户：

- 这次是创建、更新还是重生成
- 会不会影响已有 feature
- 这次执行后回退是否仍然安全

否则 Rune Weaver 的 lifecycle 价值很难被用户感知。

---

## Feature Review 与 Wizard 的关系

Wizard 是前置输入面。

Feature Review 是执行前后的确认与审阅面。

它们解决的问题不同：

- Wizard 解决“你想做什么”
- Review 解决“系统准备怎么做，以及这样做意味着什么”

不能把它们混成一个步骤。

---

## 宿主污染防线

Feature Review 必须保持宿主中立的主视图。

### 主视图允许说的

- 这个功能会影响哪些面
- 这个功能会和什么冲突
- 这个功能会写哪些受控范围

### 不应默认说的

- `npc_abilities_custom.txt`
- `Panorama bridge`
- `kv+lua`
- `modifier_applier`

这些都可以在专家下钻层出现，但不能成为默认 review 语言。

---

## Phase 2 接入顺序

### Phase 2A

先做：

- 最小 Feature Review
- 默认视图
- 基本影响说明
- 基本风险提示

### Phase 2B

再做：

- 冲突结果展示
- lifecycle 说明
- expert drill-down

### Phase 2C

最后再做：

- richer diff surface
- more mature comparison
- recovery / rollback suggestions

---

## 最终一句话

Rune Weaver 的 `Feature Review` 应该被定义为：

**在执行前后向用户展示 feature 级意图、影响、风险、验证状态与生命周期语义的主产品面。它优先服务于“让我知道系统准备对项目做什么”，而不是“让我自己读代码判断会不会坏”。**

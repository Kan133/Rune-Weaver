# Pattern Spec

## 1. 文档目的

本文档定义 Rune Weaver 中“一个合格的 Pattern 到底是什么”。

它回答四个问题：
- Pattern 是什么
- Pattern 不是什么
- 一个 Pattern 至少要包含哪些信息
- 如何判断一个 Pattern 是通用机制，还是只是换名字的专用模板

这份文档是：
- Pattern Catalog 的上位约束
- Pattern Resolver 的输入契约
- Pattern Authoring 的规范依据
- 后续通用性验证的判断基线

---

## 2. 本文档与其他 Pattern 文档的边界

Pattern 相关文档只保留三类：

### `PATTERN-SPEC.md`

负责：
- 定义 Pattern 的元模型
- 定义合格标准
- 定义“抽象是否成立”的判断规则

不负责：
- 教你怎么提取资料
- 排具体优先级

### `PATTERN-AUTHORING-GUIDE.md`

负责：
- 如何从资料或实现中提取 Pattern
- 如何写出可入库的 Pattern 草案

不负责：
- 定义 Pattern 的上位模型
- 决定先做哪些 Pattern

### `PATTERN-BACKLOG.md`

负责：
- 当前阶段先做哪些 Pattern
- 每个 Pattern 服务哪个 MVP 用例
- 优先级与候选清单

不负责：
- 充当正式规范
- 替代 Pattern 结构定义

---

## 3. Pattern 的定义

Pattern 是一个：

`可复用、可参数化、可验证、可组合、可落到宿主实现的功能构件。`

一个 Pattern 不只是模板文件，也不只是代码片段。

一个合格 Pattern 至少应同时包含：
- 语义职责
- 边界
- 参数
- 输入/输出
- 约束与依赖
- 宿主绑定
- 示例
- 验证方式

如果缺少这些信息中的大部分，它更像：
- 草稿
- 模板
- 碎片实现

而不是 Rune Weaver 的正式 Pattern。

---

## 4. Pattern 不是什么

Pattern 不应被写成以下东西：

- 一个完整大系统
- 一组没有元数据的模板文件
- 一个只在单项目里成立的历史 hack
- 一个只因为题材不同就重新命名的“新模式”

例如：
- `talent_selection_flow`
- `card_selection_flow`
- `forge_selection_flow`

如果它们只是同一个选择骨架换皮，正确做法应是复用：
- `data.weighted_pool`
- `rule.selection_flow`
- `ui.selection_modal`

而不是继续新增专用 Pattern。

---

## 5. 合格 Pattern 的必要属性

一个合格 Pattern 至少要满足以下七条。

### 5.1 有明确职责

必须能回答：

`它稳定解决的到底是什么问题？`

### 5.2 有明确边界

必须能回答：

`它负责什么，不负责什么？`

### 5.3 有参数化接口

主要变体应通过参数表达，而不是每次新增一个近似 Pattern。

### 5.4 有输入与输出

必须说明：
- 需要什么输入
- 产出什么输出

### 5.5 有约束与依赖

必须说明：
- 使用条件
- 冲突条件
- 对其他 Pattern 或宿主能力的依赖

### 5.6 有宿主落点

在当前阶段，至少要能说明它如何落到 Dota2 Adapter。

### 5.7 有验证方式

必须告诉系统：

`如何判断这个 Pattern 被正确使用了。`

---

## 6. Pattern 的五层结构

推荐把一个完整 Pattern 理解为五层。

### Layer 1: Identity

说明它是谁：
- `id`
- `name`
- `category`
- `summary`

### Layer 2: Semantics

说明它在语义上做什么：
- `responsibilities`
- `capabilities`
- `nonGoals`

### Layer 3: Contract

说明它怎么被使用：
- `params`
- `inputs`
- `outputs`
- `constraints`
- `dependencies`

### Layer 4: Host Binding

说明它如何落到具体宿主：
- server 落点
- UI 落点
- config/KV 落点
- wiring 要求

### Layer 5: Validation & Examples

说明它如何被理解和验证：
- examples
- anti-patterns
- validation hints

---

## 7. 建议的 PatternMeta

```ts
export interface PatternMeta {
  id: string;
  name: string;
  category: PatternCategory;
  summary: string;
  responsibilities: string[];
  nonGoals?: string[];
  capabilities: string[];
  supportedHosts: string[];
  params?: PatternParam[];
  inputs?: PatternIO[];
  outputs?: PatternIO[];
  constraints?: PatternConstraint[];
  dependencies?: PatternDependency[];
  hostBindings?: HostBindingRef[];
  examples?: PatternExample[];
  validation?: PatternValidationSpec;
  tags?: string[];
  version: string;
}
```

---

## 8. 通用性要求

Rune Weaver 的 Pattern 体系不能只支持“很多不同名字的系统”，而必须支持：

`同骨架不同皮的需求，复用同一组机制 Pattern。`

所以 Pattern 规范本身必须约束这种通用性。

### 8.1 优先抽象机制，不优先抽象题材

优先抽象：
- candidate pool
- weighted selection
- player choice
- modal UI
- outcome application

不优先抽象：
- 天赋题材
- 卡牌题材
- 锻造题材

### 8.2 领域词不应直接变成新 Pattern

如果一个新需求只是：
- 候选对象名字变了
- UI 文案变了
- 结果对象变了

那优先应修改：
- 参数
- 数据
- overlay

而不是新增新 Pattern。

### 8.3 Pattern 应尽量服务“机制家族”

一个 Pattern 最好能服务一类机制家族，而不是只服务一个单独场景。

例如：
- `rule.selection_flow`

应能服务：
- 天赋三选一
- 卡牌三选一
- 装备升级三选一

---

## 9. 家族验证原则

为了判断 Pattern 抽象是否成立，后续应使用家族用例验证。

家族用例指：

`共享底层机制骨架，但领域表述不同的一组需求。`

当前建议至少验证三类家族：

### Selection 家族

案例：
- 天赋三选一
- 卡牌三选一
- 装备升级三选一

预期共享：
- `data.weighted_pool`
- `rule.selection_flow`
- `ui.selection_modal`

### Resource 家族

案例：
- 技能消耗法力
- 抽卡消耗货币
- 锻造消耗材料

预期共享：
- `resource.basic_pool`
- `effect.resource_consume`
- `ui.resource_bar`

### Trigger 家族

案例：
- 按键触发
- 事件触发
- 回合开始触发

预期共享：
- 主功能 Pattern 不变
- 只替换触发侧 Pattern

---

## 10. 失败信号

如果出现以下情况，说明 Pattern 抽象失败或不足。

### 10.1 不断新增题材专用 Pattern

例如：
- `talent_draw_flow`
- `card_draw_flow`
- `forge_upgrade_flow`

### 10.2 参数过少

每遇到一个变体就必须新增 Pattern。

### 10.3 参数过多

一个 Pattern 试图吞掉整个系统，导致边界失控。

### 10.4 宿主绑定反向主导语义

Pattern 被写成：
- 某个 TS 文件
- 某个 XML 片段
- 某个 KV block

而不是先写清它的语义职责。

### 10.5 无法被 Resolver 和 AssemblyPlan 消费

如果一个 Pattern 草案无法进入：
- Pattern Catalog
- Pattern Resolver
- AssemblyPlan

那它仍然不是成熟 Pattern。

---

## 11. Dota2 宿主的额外要求

当前宿主是 Dota2，所以 Pattern 还应额外说明：

- 落在 server / ui / shared / config 的哪一侧
- 是否依赖 Panorama
- 是否依赖 KV
- 是否依赖特定 wiring
- 是否依赖 x-template 工程结构

这部分属于 `hostBindings` 的扩展说明，而不是 Pattern 的全部定义。

---

## 12. 入库最低标准

一个 Pattern 正式入库前，至少要满足：

- [ ] 职责清晰
- [ ] 非目标清晰
- [ ] 参数完整
- [ ] 输入/输出明确
- [ ] 约束与依赖明确
- [ ] 宿主落点明确
- [ ] 至少有一个标准示例
- [ ] 至少有基础验证说明

如果大部分项做不到，就仍应停留在 draft。

---

## 13. 结论

Rune Weaver 的 Pattern 不是模板库，而是：

`一组带有语义职责、参数接口、组合约束、宿主绑定和验证能力的可复用功能构件。`

它的好坏，不取决于数量有多少，而取决于：

- 是否边界清晰
- 是否可参数化
- 是否可复用
- 是否能支撑同骨架不同皮的需求复用

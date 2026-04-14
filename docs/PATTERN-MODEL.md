# PATTERN-MODEL

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-14
> Read when: aligning pattern semantics, host binding boundaries, and resolver behavior
> Do not use for: current execution priority or host-specific implementation detail by itself

## 目标

这份文档定义 Rune Weaver 的 pattern 模型，重点说明：

1. Rune Weaver 本身是否应该有 pattern
2. `PatternContract` 与 `HostBinding` 的区别
3. `RealizationFamily` 与 pattern / host 的关系
4. `FillSlot` 应该落在哪一层

## 1. 基本结论

Rune Weaver 应该有自己的 semantic pattern contract。

宿主相关信息不是 pattern 的替代品，而是 pattern 的落地层。

因此：

- Rune Weaver 不是“只有宿主 pattern，没有 semantic contract”
- Dota2 pattern 不应替代 `PatternContract`
- 未来其他宿主应尽量复用同一批 semantic contracts，只替换 `HostBinding`

## 2. 两层 pattern 模型

### 2.1 PatternContract

`PatternContract` 描述：

- 这个机制是什么
- 负责什么
- 不负责什么
- 需要哪些 capabilities / traits
- 输入输出与 invariants 是什么
- 如何参与 `ModuleNeed -> Pattern Resolution -> AssemblyPlan`
- 哪些 variability 要通过 `FillSlot` 显式声明

它不应该直接描述：

- Dota2 API 名
- Panorama 组件路径
- KV 字段名
- 宿主文件路径
- 具体桥接文件

典型例子：

- `input.key_binding`
- `data.weighted_pool`
- `rule.selection_flow`
- `effect.dash`
- `ui.selection_modal`

### 2.2 HostBinding

`HostBinding` 描述：

- 这个 `PatternContract` 在指定宿主上如何落地
- 需要哪些宿主能力
- 允许哪些 `RealizationFamily`
- preferred family 是什么
- 对该宿主的限制是什么
- 哪些 override 仍是 exception path

在当前 Dota2 宿主中，host binding 主要关联：

- `game/scripts/src/rune_weaver/**`
- `content/panorama/src/rune_weaver/**`
- 少量受控 bridge 点

`HostBinding overridePolicy` 只能是 exception policy。
它不能恢复成 `pattern id -> family` 主路由。

## 3. Pattern Resolver 消费什么

Pattern Resolution 现在应消费 canonical `ModuleNeed`。

主路径是：

`ModuleNeed -> capability fit -> realization family -> routed outputs -> fill slots`

这意味着：

- `ModuleNeed` 是唯一 module-level seam
- `explicitPatternHints` 不是主路由
- `explicitPatternHints` 只能在 capability / invariants / outputs / state / family evaluation 已经形成 tie set 后参与
- `ModuleNeed.boundedVariability` 只会下游映射到 declared `FillSlot`

## 4. RealizationFamily 的位置

`RealizationFamily` 不是 pattern identity，也不是 generator switch 的别名。

它是 `HostRealization` 的 policy vocabulary，用来回答：

- 这个 pattern / module 在当前 host 上应该归入哪类实现家族
- routed outputs 应该如何被稳定地决定

统一 precedence 是：

`host policy -> HostBinding constraints -> ModuleNeed compatibility -> family -> routed outputs -> fill`

这条 precedence 不应被 hints 或 overrides 打破。

## 5. FillSlot 的位置

`FillSlot` 是 pattern contract 的 bounded variability surface。

它负责：

- 文本
- 数值
- payload
- 受控 formula
- 有边界的 callback fragment

它不负责：

- 是否存在这个 module
- 选择哪个 pattern
- 选择哪个 realization family
- 选择哪个 generator family
- host write targets

如果系统需要 `FillSlot` 决定这些内容，说明上游的 `ModuleNeed` / `PatternContract` / `HostBinding` 还不够清楚。

## 6. UI Pattern 的位置

UI pattern 仍然是 core semantic contract，不是宿主专有 pattern。

例如：

- `ui.selection_modal`
- `ui.key_hint`
- `ui.resource_bar`

它们描述的是 UI 的功能形态，而不是某个宿主页面。

它们在 Dota2 上的 binding 才描述：

- TSX 模板
- LESS 模板
- HUD root 接线
- NetTable / event 数据流

所以：

- UI pattern 属于 semantic contract family
- Panorama / TSX / LESS 属于 host binding
- 风格、密度、文案偏好属于 `UIDesignSpec`

## 7. 正式 Pattern 的三层组成

### Layer A: Identity

用于说明它是谁：

- `id`
- `summary`
- `semanticCategory`
- `tags`

### Layer B: Contract

用于说明它解决什么以及怎么被消费：

- `responsibilities`
- `nonGoals`
- `capabilities`
- `traits`
- `inputs`
- `outputs`
- `invariants`
- `compositionRules`
- `fillSlots`

### Layer C: Host Binding

用于说明它如何落地到某个宿主：

- `hostType`
- `allowedFamilies`
- `preferredFamily`
- `hostRestrictions`
- `overridePolicy`

## 8. Dota2 Pattern 的正确理解

当前项目里常说的 “Dota2 pattern” 更准确地应理解为：

- 一个 `PatternContract`
- 外加 Dota2 `HostBinding`

它不是另一套独立 pattern 哲学。

如果一个条目只有：

- Dota2 API
- Panorama 技术细节
- KV 字段片段

但没有稳定的 semantic contract，

那它更像：

- host notes
- adapter reference
- implementation fragment

而不是正式 pattern。

## 9. 不应进入 Pattern 的东西

以下内容通常不应直接变成 pattern：

- 单个 API
- 单个 enum
- 单个 KV 字段
- 单个 helper function
- 纯宿主路径约定
- 单一项目里的历史 workaround

这些内容应该进入：

- host binding notes
- knowledge
- adapter implementation notes

## 10. 与现有文档的关系

这份文档负责“模型层”。

它与其他 pattern 文档的职责划分如下：

- `PATTERN-MODEL.md`
  - 定义 `PatternContract` / `HostBinding` / `RealizationFamily` / `FillSlot` 的位置
- `PATTERN-SPEC.md`
  - 定义合格 pattern 的最小标准
- `PATTERN-AUTHORING-GUIDE.md`
  - 定义如何提取并撰写 draft
- `PATTERN-PIPELINE.md`
  - 定义 `candidate -> draft -> admission -> catalog`
- `PATTERN-GAPS.md`
  - 记录当前 catalog 缺口
- `PATTERN-BACKLOG.md`
  - 记录当前优先级

## 11. 当前结论

Rune Weaver 的 pattern 体系应继续坚持：

- semantic contract 优先
- host binding 后附
- family-driven realization
- `explicitPatternHints` 只做 tie-break
- overridePolicy 只做 exception path
- `FillSlot` 只做 bounded completion
- 不让宿主 API 冒充 pattern
- 不让领域名词直接膨胀为新 pattern

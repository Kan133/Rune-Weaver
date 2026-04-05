# PATTERN-MODEL

## 目标

这份文档定义 Rune Weaver 的 pattern 模型，重点说明：

1. Rune Weaver 本身是否应该有 pattern
2. `core pattern` 与 `host binding` 的区别
3. UI pattern 应该落在哪一层
4. 正式 pattern 应由哪些部分组成

## 1. 基本结论

Rune Weaver **应该有自己的 core pattern**。

宿主相关信息不是 pattern 的替代品，而是 pattern 的落地层。

因此：

- Rune Weaver 不是“只有宿主 pattern，没有 core pattern”
- Dota2 pattern 不应替代 core pattern
- 未来 Roblox 或其他宿主应尽量复用同一批 core pattern，只替换 host binding

## 2. 两层 pattern 模型

### 2.1 Core Mechanic Pattern

`core pattern` 描述：

- 这个机制是什么
- 负责什么
- 不负责什么
- 输入输出是什么
- 参数与依赖是什么
- 如何参与 blueprint / assembly 组合

它**不应该**直接描述：

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

### 2.2 Host Binding

`host binding` 描述：

- 这个 core pattern 在指定宿主上如何落地
- 需要哪些宿主能力
- 需要哪些文件区域
- 需要哪些 bridge / event / table / config
- 对该宿主的限制是什么

在当前 Dota2 宿主中，host binding 主要关联：

- `game/scripts/src/rune_weaver/**`
- `content/panorama/src/rune_weaver/**`
- 少量受控 bridge 点

## 3. UI Pattern 的位置

UI pattern 仍然是 **core pattern**，不是宿主专有 pattern。

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

- UI pattern 属于 core pattern family
- Panorama / TSX / LESS 属于 host binding
- 风格、密度、文案偏好属于 `UIDesignSpec`

## 4. 正式 Pattern 的三层组成

### Layer A: Identity

用于说明它是谁：

- `id`
- `category`
- `summary`
- `tags`

### Layer B: Mechanic Contract

用于说明它解决什么以及怎么被消费：

- `responsibilities`
- `nonGoals`
- `parameters`
- `inputs`
- `outputs`
- `dependencies`
- `validationHints`

### Layer C: Host Binding

用于说明它如何落地到某个宿主：

- `hostType`
- `targetArea`
- `implementationNotes`
- `adapterRequirements`

## 5. Dota2 Pattern 的正确理解

当前项目里常说的 “Dota2 pattern” 更准确地应理解为：

- 一个 core pattern
- 外加 Dota2 host binding 信息

它不是另一套独立 pattern 哲学。

如果一个条目只有：

- Dota2 API
- Panorama 技术细节
- KV 字段片段

但没有稳定的 mechanic contract，

那它更像：

- host notes
- adapter reference
- implementation fragment

而不是正式 pattern。

## 6. 不应进入 Pattern 的东西

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

## 7. 与现有文档的关系

这份文档负责“模型层”。

它与其他 pattern 文档的职责划分如下：

- `PATTERN-MODEL.md`
  - 定义 `core pattern` / `host binding`
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

## 8. 当前结论

Rune Weaver 的 pattern 体系应继续坚持：

- core mechanic 优先
- host binding 后附
- UI pattern 仍是 core pattern
- 不让宿主 API 冒充 pattern
- 不让领域名词直接膨胀为新 pattern

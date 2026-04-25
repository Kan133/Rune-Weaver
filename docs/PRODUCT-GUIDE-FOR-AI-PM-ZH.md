> Status: active-reference
> Audience: humans
> Doc family: baseline
> Update cadence: on-phase-change
> Last verified: 2026-04-25
> Read when: explaining Rune Weaver to AI product managers, external collaborators, or non-technical stakeholders
> Do not use for: same-day execution priority, blocker truth, or superseding README's current capability boundary

# Rune Weaver 产品集介绍（给 AI 产品经理）

## 一句话定位

**Rune Weaver 是一个受约束的 Feature Construction Platform。**

它要解决的不是“让模型多写一点代码”，而是把一句自然语言需求稳定地转成一个：

- 可审阅
- 可验证
- 可维护
- 可继续演进
- 可作为一等 feature 管理

的功能单元。

它不是聊天式代码生成器，也不是“更花哨的 vibe coding UI”。它更像一条 feature-first 的受控产品化生产线。

## 这份文档给谁看

这份文档面向：

- AI 产品经理
- 产品 owner
- 外部协作者
- 不直接读实现代码，但需要理解产品边界和工作方式的人

它负责解释 Rune Weaver 的产品定位、工作流和方法论。

它**不是**同日执行队列，也**不是**最新 blocker 看板。当前公开能力边界以 [README.md](/D:/Rune%20Weaver/README.md) 为准；同日主线 truth 以 session-sync 和 current plan 为准。

## 核心术语

| 术语 | 产品语言解释 |
| --- | --- |
| `Feature` | Rune Weaver 管理的基本单位。它不是散落文件，而是一个可以被创建、更新、验证、删除、追踪责任边界的功能。 |
| `Host` | 功能最终落地的真实项目环境，例如某个具体游戏宿主。 |
| `IntentSchema` | 把用户自然语言需求整理成结构化意图的结果。它的作用不是直接生成代码，而是先把“真正想做什么”说清楚。 |
| `Blueprint` / `FinalBlueprint` | 经过规范化和约束校验后的确定性结构描述。它决定功能骨架和 owned scope，但不等于最终宿主代码。 |
| `Family` / `Pattern` | Rune Weaver 复用与治理机制的稳定单元。它们是 reuse truth，不是 prompt 的临时别名。 |
| `ArtifactSynthesis` | 在 target surfaces 固定后，为 guided-native / exploratory 路径生成 owned candidate artifacts 的过程。 |
| `LocalRepair` | 只在受限边界里做 bounded patch / muscle fill，不负责重新定义整体架构。 |
| `Governance Read-Model` | 为 bridge、CLI inspect、workbench、connected host 提供统一治理投影的产品读模型；它投影已有 truth，不创造新的 authority。 |

## Rune Weaver 产品集总览

如果从 AI 产品经理的视角看，Rune Weaver 不是一个单点工具，而是一套围绕“功能被如何生产和治理”组织起来的产品集。

它大致由六层能力组成：

1. 需求理解层  
   负责接收用户描述，识别目标功能、触发方式、状态变化、约束和缺失信息。

2. 结构化规划层  
   负责把自然语言需求整理成 `IntentSchema`，再规范化为可审阅的 `Blueprint`。

3. 复用与策略选择层  
   负责根据 family / pattern / source truth 选择合适的实现骨架，而不是靠 case 名称或 prompt 手感做决定。

4. 宿主落地层  
   负责决定这个功能如何在具体 host 中实现，保持 host 边界、bridge 点和写入治理清晰。

5. 生成与验证层  
   负责 synthesis、bounded local repair、host validation、runtime validation 与最终 commit gate。

6. 生命周期与产品投影层  
   负责 feature 的 create / update / regenerate / rollback / repair / review，以及将同一 canonical truth 投影到 CLI、bridge、workbench、connected-host。

`CLI`、`Wizard`、`Workbench` 在这里更像不同入口：

- `CLI` 是当前 authoritative lifecycle path
- `Wizard` 是结构化理解入口
- `Workbench` 是 product entry / orchestration / review shell

产品本体不是这些入口本身，而是这条 feature-first 的受控构建链路。

## Feature-first 工作流

Rune Weaver 的核心理念不是“先写文件”，而是“先生产和治理 feature”。

一个简化后的链路是：

1. 用户描述目标功能
2. 系统整理 `IntentSchema` 与 clarification signals
3. 形成 `Blueprint`
4. 决定 family / pattern / source-backed path
5. 进入 host realization / routing / synthesis / bounded repair
6. 进入 validate / doctor / final commit gate
7. 将结果写入 workspace truth，并投影到 product surfaces

所以 Rune Weaver 真正管理的是：

- 这个功能是什么
- 它由哪些结构组成
- 它落在哪个宿主边界里
- 它是否与已有功能冲突
- 它之后如何继续 update / regenerate / rollback / review

而不是“这一轮模型碰巧改了哪几个文件”。

## 为什么它不是 vibe coding

Rune Weaver 和 vibe coding 的区别，不在于界面是不是聊天框，而在于系统把什么当成第一等对象。

| 对比点 | 常见 vibe coding | Rune Weaver |
| --- | --- | --- |
| 工作对象 | 文件、代码片段、一次性 patch | `feature` 及其生命周期 |
| 工作方式 | prompt 直接驱动生成 | 先结构化意图，再受控落地 |
| 风险暴露 | 冲突常在后期暴露 | 通过治理、review、validate 尽量前置暴露 |
| 结果形态 | 先写出来，再回头判断影响 | 先判断边界、ownership、依赖、可写性，再进入写入 |
| 后续演进 | 常退化成“再改一遍” | 支持 create / update / regenerate / rollback / bounded repair |

Rune Weaver 不试图替代一切生成工具。

更准确的说法是：

**当需求从“一次性生成”转向“持续 feature 演进”时，Rune Weaver 的价值才开始明显。**

## 泛化能力如何成立

Rune Weaver 追求的泛化，不是“遇到一个新 case 就补一段产品代码”，而是让更多需求落在同一套受支持的机制骨架上。

当前更合理的理解方式是：

- `Blueprint / Family / Pattern / Routing` 负责**骨架泛化**
- `ArtifactSynthesis / LocalRepair / source truth` 负责**骨架确定后的实现变体**

这意味着系统优先回答：

- 这是不是同一种功能骨架
- 它需要哪些模块
- 模块之间怎么连接
- 它该落到宿主的哪类路径里

然后才去回答：

- 候选池具体怎么组织
- catalog 从哪里来
- 权重、稀有度、展示外观怎么特化

### 一个当前已证明的例子

目前 Dota2 上已经证明的一类泛化边界，是本地 choose-one `selection_pool` 抽取骨架。

它已经能覆盖的不是单一 case，而是一类结构：

- 有触发入口
- 系统准备候选项
- 玩家从若干候选中选一个
- 结果写回当前 feature / host 状态
- UI 和 review surface 可解释

在这条骨架里：

- `talent` 类本地抽取可以闭合
- `equipment` / native-item 抽取也可以通过 honest `external_catalog` object truth 闭合
- 但“展示多个候选却没说玩家是选一个还是直接批量结算”的 ambiguous weighted-card ask，仍会被 honest clarification 卡住

这个例子重要的地方不在于支持了某个 case，而在于它说明：

- 系统不是靠 `equipment_draw_demo` 这种 case 特判闭合
- 系统允许 feature-owned membership 与 `external_catalog` object truth 共存
- 系统仍能在真正不可约歧义上保持 honest block

## 当前 Step 7 的产品化意义

Step 7 并不是再造第二套治理 authority，而是把已存在 truth 统一投影到产品面。

当前已经落地的产品化 truth 包括：

- bridge export 带 root-level `governanceReadModel`
- connected-host status 在 workspace 存在时返回 adapter-owned `governanceReadModel`
- CLI inspect / doctor wording / workbench UI 优先消费同一投影
- compatibility-only fallback 只剩 legacy display boundary
- stale payload refresh 只走 `export-bridge`

这意味着产品面不再需要分别猜：

- feature lifecycle
- reusable governance
- grounding
- repairability

而是统一读取同一个投影。

但这条读模型仍然有明确边界：

- 它投影现有 canonical truth
- 它不创造新的 lifecycle authority
- 它不改变 runtime semantics
- 它不自动提升 reusable admission
- 它还没有被上抬到 `core/**`

## 对 AI 产品经理意味着什么

如果你是 AI 产品经理，Rune Weaver 最适合的提需求方式不是一句模糊愿望，而是尽量把下面几类信息讲清楚：

- 这个 feature 的目标 outcome 是什么
- 它由什么触发
- 它会引入哪些状态或对象变化
- 它有哪些必须成立的不变量
- 它要接入哪些现有系统、界面或 catalog
- 哪些地方允许变化，哪些地方不允许

更好的输入像是：

- “玩家按下 F4 后看到 3 个候选，必须选择其中一个，结果立即生效，并在界面中显示当前持有结果。”

而不是：

- “给我做一个很酷的成长系统，顺便都接好。”

同时也要有一个合理预期：

- Rune Weaver 不是“任何一句话都能直接变成任意复杂系统”
- 它更像一个把需求转成受控功能结构的产品化系统
- 当需求超出当前支持边界时，理想表现是 honest block，而不是假装全能

## 当前诚实边界

截至当前公开口径，Rune Weaver 的边界应与 [README.md](/D:/Rune%20Weaver/README.md) 保持一致：

- Dota2 是当前唯一可信主线
- CLI 仍是 authoritative lifecycle path
- Workbench 是 product entry / orchestration / review shell，不是独立 lifecycle authority
- Workbench、bridge、connected host 现在优先消费统一的 governance read-model
- compatibility-only 只剩 legacy display boundary
- `export-bridge` 是唯一 stale payload refresh lane
- exploratory / guided-native 输出仍可能需要 review
- War3 仍是次线探索，不应被描述成已稳定交付宿主

这也是这份文档与 README 的分工：

- [README.md](/D:/Rune%20Weaver/README.md) 负责当前产品边界与诚实能力声明
- 本文档负责解释产品方法论、工作流和 feature-first 逻辑
- session-sync / current plan 负责同日执行 truth，不由本文档承担

## 进一步阅读

- [README.md](/D:/Rune%20Weaver/README.md)
- [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
- [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)
- [DEMO-PATHS.md](/D:/Rune%20Weaver/docs/DEMO-PATHS.md)

如果你要理解 Rune Weaver 今天到底已经交付到哪里，请先读 README。  
如果你要理解 Rune Weaver 为什么这样设计、为什么它强调 feature-first 和受控泛化，再回来看这份文档。

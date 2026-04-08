# 阶段路线图（中文）

## 目的

本文档用于明确 Rune Weaver 的阶段划分，并回答下面几个问题：

- 每个 Phase 的核心目标是什么
- 每个 Phase 主要应该做什么
- 每个 Phase 的验收标准是什么
- 哪些能力不应该过早引入
- 当前项目究竟处在哪个阶段

这份文档是对 [ROADMAP.md](/D:/Rune%20Weaver/docs/ROADMAP.md) 的中文补充，但会更强调产品与工程的实际边界，而不是只列路线。

---

## 总体判断

Rune Weaver 的阶段不应按“做了多少功能”划分，而应按下面三件事划分：

- 系统在什么层面已经可靠
- 用户需要承担多少结构与工程判断
- 新 case 的推进主要依赖系统主干，还是依赖 case-specific 内容

可以把三个阶段理解为：

1. Phase 1：系统能不能成立
2. Phase 2：普通用户能不能稳定使用
3. Phase 3：系统能不能规模化、智能化扩展

这三个阶段的差别，不只是功能多寡，而是产品形态完全不同。

---

## Phase 1

### 核心目标

建立一个可信的 feature construction 底座，使至少一个真实 composite case 能通过正式 pipeline 闭环，并且剩余问题主要落在 case-specific 细节，而不是系统级 blocker。

换句话说，Phase 1 要解决的问题不是“让小白也能随便用”，而是：

**让 Rune Weaver 证明自己不是只能吐 placeholder skeleton，而是能正式构建一个最小真实 feature。**

### 主要应该做什么

- 建立并稳定主 pipeline：
  - `Natural Language -> IntentSchema -> Blueprint -> Pattern Resolution -> Assembly -> Realization -> Routing -> Generation -> Write`
- 建立 host-aware 的正式落地路径：
  - write executor
  - workspace state
  - lifecycle safety
- 建立 composite backbone：
  - `input`
  - `data`
  - `rule`
  - `ui`
  - `effect`
- 建立最小参数流，让 case-specific 数据能通过正式 pipeline 进入生成物
- 证明 placeholder case 可以闭环
- 证明最小真实 case 也可以在当前 backbone 上闭环
- 建立真实 host 写入、结构验证、运行前验证的基线

### 当前语境下的更具体目标

如果把“最小 talent-drafting-like case 的正式闭环”视为当前 Phase 1 的目标，那么 Phase 1 至少应包含：

1. 当前 backbone 能表达并闭环：
   - `input.key_binding`
   - `data.weighted_pool`
   - `rule.selection_flow`
   - `ui.selection_modal`
   - `dota2.short_time_buff`
2. placeholder case 可以通过正式 pipeline 落地
3. case-specific 参数可以通过正式 pipeline 进入生成物
4. data-inclusive composite 不再暴露新的系统级 blocker
5. real-environment write/build-ready baseline 已建立
6. talent-drafting-like 最小真实 case 已能在当前 backbone 上成立

### 当前阶段判断

当前更准确的状态是：

**Phase 1 的 architecture goals 与 case-construction goals 已基本收口。**

Rune Weaver 已经证明：

- composite backbone 成立
- data-inclusive composite 成立
- placeholder case 可以正式落地
- case-specific 参数可以进入生成物
- parameterized talent-drafting path 已恢复到 5-module backbone
- code-level formal pipeline closure 已成立

当前剩余未收口项主要是：

- toolchain / environment
- full CLI / runtime / client closure
- 明确属于 Phase 2 的产品化能力

这些剩余项已经不再属于“系统主干能不能成立”的问题。

### 验收标准

Phase 1 可以视为完成，至少要满足：

1. 系统主干稳定，新增加一个接近真实的 composite case 时，不再需要频繁修改系统骨架
2. 至少一个真实目标 case 能通过正式 pipeline 闭环
3. 剩余问题主要落在：
   - 参数填充
   - UI 文案/样式
   - 数据内容
   - 环境/toolchain
   而不是 assembly / realization / routing / generator 主干
4. worker agent 不需要频繁回到“修系统主干”才能继续推进 case

### 不该过早引入什么

Phase 1 不应重投入：

- LangGraph 或复杂 agent orchestration
- 完整产品化 UI Wizard
- 强 self-healing / 强自动 gap fill
- 完整 hook composition framework
- map editor / scene graph / world editing
- 完整 semantic incremental update 体系

### 为什么不该过早引入

因为 Phase 1 的目标不是产品化，而是底座成立。

如果过早引入这些能力，会把：

- 系统 contract 问题
- case-specific 问题
- orchestration 问题
- agent 决策问题

混在一起，反而不利于收口。

---

## Phase 2

### 核心目标

让系统从“能做一个 case”升级到“能稳定做很多 case，而且普通用户不必理解太多内部结构”。

这是 Rune Weaver 从“工程底座”走向“受控产品化系统”的阶段。

### 主要应该做什么

- 引入更强但受控的 Wizard
- 让 LLM 参与 Blueprint planning，但必须受 schema / contract / policy 约束
- 建立更成熟的 case authoring 流程：
  - module-level guided authoring
  - parameter-guided authoring
  - 更好的 validation / correction loop
- 引入受控 gap fill：
  - 缺参数时给建议
  - 缺 connection 时给建议
  - 缺 patternIds 时给 deterministic fallback
- 引入 hook / integration point composition contract
- 引入 feature conflict governance：
  - detect
  - explain
  - propose
  - confirm
- 引入 map anchor / scene reference 的最小只读引用能力
- 建立更适合非专家的参数面、review 面和风险提示面

### 为什么这是 Phase 2

因为 Rune Weaver 真正面对小白，不是靠“再加一个输入框”，而是要做到：

- 用户不理解 pattern，也能描述需求
- 用户不理解 routing，也能确认风险
- 系统能解释冲突，而不是把责任甩给用户
- 用户看到的是功能与影响，而不是底层 schema

这些都属于产品化能力，而不是 Phase 1 的系统主干能力。

### 关于地图命名实体 / 区域引用

未来像下面这类需求：

- 在某个区域开始刷兵
- 英雄进入某个区域后触发事件
- 在地图中的某个命名点位刷出单位

第一版不应建模成普通 `position`，也不应和现有 `input trigger` 混淆。

更合理的第一版模型应接近：

- `map_anchor_ref`
- 或 `scene_reference`

它的语义应是：

- 用户先在 Hammer / 地图编辑器里放置并命名对象
- Rune Weaver 在代码里引用这个命名对象
- Rune Weaver 第一版只消费这个引用，不编辑地图

所以这项能力更适合放在 **Phase 2 早期**。

第一版应支持：

- 名称引用
- 锚点类型
- host 信息

第一版不应支持：

- 地图编辑
- 坐标/体积/路径的完整建模
- scene graph orchestration

### 验收标准

Phase 2 可以视为建立，至少要满足：

1. 新增一个小到中等复杂度 case 时，不需要频繁回到系统主干修骨架
2. 非专家用户可以在受控 Wizard / authoring flow 中完成需求输入
3. LLM 可以参与 Blueprint proposal，但不会破坏 contract 稳定性
4. 常见组合冲突有明确策略：
   - 可聚合
   - 需互斥
   - 需用户确认
5. 系统主要问题从“主干能不能成立”转向“需求建模与内容质量”

### 不该过早引入什么

Phase 2 仍不应过早全面引入：

- 完整自由形态的 graph orchestration
- 强自愈式 multi-step agent recovery
- 大规模自动 gap fill
- 多 host 平台化扩展

### 为什么不该过早引入

因为 Phase 2 的重点仍然是“受控产品化”，不是“最大化智能化”。

如果过早追求全自动化，会削弱：

- 可控性
- 可解释性
- 可审阅性
- 故障定位能力

---

## Phase 3

### 核心目标

让系统从“受控可用”升级为“平台化、规模化、可智能扩展”的通用产品。

### 主要应该做什么

- 引入更强的 graph / agent orchestration
- 引入更成熟的 gap fill / self-healing
- 支持更多复杂 case 和跨系统组合
- 支持更复杂的 integration point composition / conflict resolution
- 支持更丰富的 world interaction / scene reference / external asset reference
- 强化 review / repair / re-planning / rollback / explanation surfaces
- 为未来多 host 扩展留出清晰结构

### 验收标准

Phase 3 可以视为建立，至少要满足：

1. 用户提出一个新需求时，系统主要依赖既有能力组合完成，而不是频繁需要人工架构介入
2. 复杂 case 可以通过系统自校正与受控 repair 稳定推进
3. 主要瓶颈不再是“系统不会做”，而是“策略怎么选、质量怎么权衡”
4. 平台具备较高程度的通用性与规模化能力

### 不该牺牲什么

即使到了 Phase 3，也不应牺牲：

- contract clarity
- reviewability
- rollback safety
- host ownership boundary

这些仍然是产品可信度的底线。

---

## 面向小白产品还需要补哪些能力

如果目标是“通用、面向小白”的产品，除了 Wizard / LLM / gap fill / hook composition 之外，还至少需要以下能力。

### 1. 可解释性

系统要能回答：

- 它生成了什么
- 为什么这么生成
- 哪些地方是推断
- 哪些地方是占位
- 哪些地方需要用户确认

### 2. 可恢复性

系统要让用户知道：

- 失败发生在哪
- 可以回退到哪
- 能不能只重做某个模块

### 3. 产品化参数面

用户不应直接面对原始 schema，而应面对：

- 候选数量
- 效果持续时间
- 触发方式
- 锚点名称
- 是否允许重复

### 4. 冲突检测与建议

系统应能提示：

- 哪两个能力在争同一个 hook / integration point
- 哪些应合并
- 哪些应互斥
- 哪些必须让用户确认

### 5. 外部资产与环境依赖管理

未来如果涉及：

- map anchor
- icon
- sound
- particle
- localization
- UI asset

都需要受控引用方式，而不是临时散落在 host 中。

### 6. 环境与验证可视化

系统要能清楚告诉用户：

- 当前失败是代码问题还是环境问题
- 还缺哪些 toolchain
- 是否已经进入可测试状态

---

## 当前建议

基于当前状态，建议按下面的方式推进：

1. Phase 1：把最小 talent-drafting-like case 推到第一版真实可用
2. Phase 2：把“开发者协作式系统”推进到“受控产品化系统”
3. Phase 3：再进入更强的智能化、平台化和规模化阶段

当前不建议在 Phase 1 尾声就重投入：

- LangGraph
- 完整 Wizard 产品化
- 强 gap fill
- 全量 hook composition system

当前更合理的是：

- 完成 Phase 1 case-specific 收口
- 明确 Phase 1 的正式边界
- 然后在 Phase 2 再有节奏地引入更高层能力

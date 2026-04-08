# Phase 2 执行计划（中文）

## 目的

本文用于把 Rune Weaver 的 `Phase 2` 从“方向讨论”收束成一份可执行的阶段计划。

这份计划的目标不是写实现细节，而是明确：

- Phase 2 到底要解决什么问题
- 执行顺序应该是什么
- 每一步的边界与验收标准是什么
- 为什么这个顺序能避免 Rune Weaver 退化成“专业领域 RAG + 特调 prompt 的 vibe coding”

如需查看更高层的阶段划分，请同时参考：

- [PHASE-ROADMAP-ZH.md](D:/Rune%20Weaver/docs/PHASE-ROADMAP-ZH.md)
- [PRODUCT.md](D:/Rune%20Weaver/docs/PRODUCT.md)

如需查看约束边界，请同时参考：

- [HOST-EXTENSION-GUARDRAILS-ZH.md](D:/Rune%20Weaver/docs/HOST-EXTENSION-GUARDRAILS-ZH.md)
- [UI-WIZARD-GUARDRAILS-ZH.md](D:/Rune%20Weaver/docs/UI-WIZARD-GUARDRAILS-ZH.md)
- [GAP-FILL-GUARDRAILS-ZH.md](D:/Rune%20Weaver/docs/GAP-FILL-GUARDRAILS-ZH.md)
- [FEATURE-CONFLICT-GOVERNANCE-GUARDRAILS-ZH.md](D:/Rune%20Weaver/docs/FEATURE-CONFLICT-GOVERNANCE-GUARDRAILS-ZH.md)
- [BLUEPRINT-LLM-GUARDRAILS-ZH.md](D:/Rune%20Weaver/docs/BLUEPRINT-LLM-GUARDRAILS-ZH.md)
- [FEATURE-REVIEW-GUARDRAILS-ZH.md](D:/Rune%20Weaver/docs/FEATURE-REVIEW-GUARDRAILS-ZH.md)
- [STRUCTURED-EXPERIENCE-LAYER-GUARDRAILS-ZH.md](D:/Rune%20Weaver/docs/STRUCTURED-EXPERIENCE-LAYER-GUARDRAILS-ZH.md)
- [HOST-CAPABILITY-MATRIX-GUARDRAILS-ZH.md](D:/Rune%20Weaver/docs/HOST-CAPABILITY-MATRIX-GUARDRAILS-ZH.md)

---

## Phase 2 的一句话定义

**Phase 2 的目标不是让 Rune Weaver 更聪明，而是让它从“Phase 1 的 feature construction 底座”升级为“受控产品化工作台”。**

换句话说，Phase 2 要解决的不是：

- 再做一个更会说垂类术语的生成器
- 再堆一个更大的 system prompt
- 再加一个裸 RAG

而是：

- 让普通用户能进入受控 authoring 流程
- 让系统开始承担 feature 治理责任
- 让 LLM 参与规划，但不能越权
- 让 Phase 1 建好的正式链路继续保持稳定

---

## Phase 2 的核心成功标准

Phase 2 成功，不以“接了多少 LLM 能力”衡量，而以这四件事衡量：

1. 普通用户可以在不理解 `pattern / routing / realization` 的前提下，完成一次受控 feature intake。
2. 系统在写入前能发现至少一类真实 feature 冲突，并给出明确处理方案。
3. LLM 能参与 Blueprint proposal，但不能绕过 contract / governance / host checks。
4. 新增小到中等复杂度 case 的推进，主要靠受控 authoring、proposal 和 content fill，而不是继续修改系统主干。

---

## Phase 2 的总原则

### 原则 1：先治理，再智能

如果 Phase 2 一开始先上：

- 大 RAG
- 强 prompt
- 放开的 Blueprint LLM

那 Rune Weaver 很容易退化成：

- 一个更懂垂类术语的生成器

而不是：

- 一个真正能治理 feature 演进的产品

因此 Phase 2 的顺序必须是：

- 先建立产品入口与治理层
- 再让 LLM 进入规划层

### 原则 2：构建优先，治理护航

Rune Weaver 不能过度偏向“治理至上”。

用户来不是为了被治理，而是为了：

- 做出功能
- 安全地把功能加进活项目

所以治理层必须是保护层，而不是主体验。

### 原则 3：前端在 Phase 2 就进入

前端不能等到 Phase 3。

如果没有前端工作台，Phase 2 就只能继续验证专家流，而无法验证：

- 非专家能否稳定输入需求
- 非专家能否理解 review
- 非专家能否理解风险与确认步骤

但 Phase 2 的前端应当是：

- workbench
- wizard
- review / confirm surface

而不是一开始就做成完整平台 UI。

### 原则 4：Dota2 是第一宿主，不是产品本体

Phase 2 里的任何新能力，都必须先经过一个检查：

- 这是通用产品能力，还是 Dota2 特例？

如果是 Dota2 特例，就应留在 host contract / host pack 层，不应污染产品主层。

---

## Phase 2 的执行顺序

我建议把 Phase 2 分成九步，而不是一口气并行推进所有方向。

---

## Step 1：Workbench + Main Wizard v1

### 目标

把 Rune Weaver 从“专家协作式 CLI/agent 流程”，推进到“最小受控产品入口”。

### 应做什么

- 建立最小前端工作台
- 建立主 Wizard v1
- 建立产品化参数面 v1
- 建立最小 review 入口
- 建立 feature 列表或 feature 管理基础视图

### 这里的前端应包含什么

- 需求输入面
- feature 列表
- 基本 review / summary 面
- 基本风险提示面
- 基本确认/取消动作

### Main Wizard v1 应解决什么

- 用户如何描述需求
- 缺哪些关键参数
- 是否需要 UI 专项 intake
- 是否需要 scene/world reference
- 当前输入是否足以进入 Blueprint proposal

### 这里不该做什么

- 不做图编辑器
- 不做自由拖拽 Blueprint 设计器
- 不做复杂 agent 可视化
- 不做全自动 planning

### 验收标准

- 非专家用户能完成一次受控需求输入
- 用户不需要理解 `pattern / routing / realization`
- 系统能明确告诉用户“还缺什么”
- 有最小可用的 workbench 入口，而不再只是 CLI

---

## Step 2：UI Wizard v1

### 目标

把 UI 的结构澄清从通用 gap-fill 中分离出来，建立专项 UI intake 分支。

### 应做什么

- 在主 Wizard 中加入 `UI need detection`
- 在必要时进入 `UI Wizard`
- 只收集高价值 UI 结构信息
- 产出结构化 UI intake bundle

### UI Wizard v1 应收集什么

- surface 类型
- interaction intensity
- information density
- style direction
- key copy intent

### UI Wizard v1 不该做什么

- 不直接生成 Blueprint
- 不决定 host realization
- 不做自由 UI 代码生成
- 不把 Dota2 UI 术语抬成产品语言

### 验收标准

- 用户无需理解 UI pattern 也能完成最小 UI 澄清
- UI 不再被粗暴塞进通用 gap-fill
- UI Wizard 与 Main Wizard 的职责分离清楚

---

## Step 3：Feature Governance Foundation

### 目标

建立 Rune Weaver 与普通专业 RAG/vibe coding 的第一道真正差异。

### 应做什么

- feature identity baseline
- feature ownership baseline
- integration point registry baseline
- feature-level impact baseline
- review baseline

### 这一层要回答什么

- 这个 feature 拥有什么
- 它影响哪些输出面
- 它占用哪些 integration points
- 它与已有 feature 的关系是什么

### 为什么这是 Phase 2 的关键转折点

如果没有这一步，后面的：

- Wizard
- LLM proposal
- structured experience
- gap-fill

都会更像“更会生成代码”，而不是“更会负责项目”。

### 这里不该做什么

- 不一次性做全套 conflict governance
- 不做全量 pairwise compatibility matrix
- 不做复杂自动修复

### 验收标准

- feature 不再只是写入行为，而是有可识别身份的构建单元
- 系统能说清一个 feature 的基本 ownership / impact
- 后续冲突治理有稳定承接点

---

## Step 4：Feature Conflict Governance v1

### 目标

让系统在写入前开始真正承担治理责任。

### 第一批只聚焦什么

只聚焦：

- **共享接入点冲突**

例如：

- shared hook
- integration point
- UI mount point
- registry / dispatcher 入口

### 系统必须能形成的最小闭环

1. detect
2. explain
3. propose
4. confirm / block

### 分工

- deterministic engine：负责合法性与冲突检测
- orchestrator：负责翻译、解释、提出方案
- 用户：负责在多合法方案中做业务意图选择

### 这一阶段不该做什么

- 不做所有冲突类型
- 不做平衡性冲突治理
- 不做 graph 级复杂自动调和

### 验收标准

- 系统能在写入前发现至少一类真实冲突
- 用户能看懂冲突原因与建议方案
- Rune Weaver 在“多 feature 共存”上出现可感知差异

---

## Step 5：Feature Review v1

### 目标

把治理结果和 feature 影响转译成用户可理解的产品面。

### 应做什么

- feature intent summary
- impact summary
- conflict/risk summary
- validation summary
- lifecycle summary
- default user view
- expert drill-down

### Review v1 的重点

不是 code review，而是：

- 这个功能会做什么
- 会影响什么
- 有什么风险
- 是否建议执行

### 这里不该做什么

- 不让普通用户默认直面底层 host 术语
- 不把 review 做成纯代码 diff 面
- 不把冲突理解责任转嫁给用户

### 验收标准

- 普通用户看得懂默认 review
- 专家可以下钻到底层细节
- review 真正参与 confirm / block，而不是展示后就结束

---

## Step 6：Blueprint LLM Planning v1

### 目标

让 LLM 正式参与 Blueprint proposal，但不破坏 contract 和治理层。

### 应做什么

- Blueprint proposal agent
- proposal vs final Blueprint 分离
- schema validation
- contract gating
- host admissibility checks
- conflict pre-check

### LLM 在这里的职责

- 提 proposal
- 提 uncertainty notes
- 借助经验层给出更合理结构候选

### LLM 不得做什么

- 不得直接成为 final Blueprint
- 不得绕过治理与 host checks
- 不得把 Dota2 经验写成通用 planning 语言

### 验收标准

- LLM proposal 可用但受控
- 系统能拒绝不合法 proposal
- 新 case 推进更多依赖 proposal + fill，而不是继续改主干

---

## Step 7：Structured Experience Layer v1

### 目标

把 case / feature / preset / example 组织成结构化经验层，而不是裸 RAG。

### 应做什么

- 定义经验资产类型
- 定义成熟度标签
- 定义 host 标签
- 定义可被 Wizard / Blueprint / review / gap-fill 使用的结构化字段

### 经验层可以服务谁

- Wizard defaulting
- Blueprint proposal
- review recommendation
- low-risk gap-fill hints

### 这里不该做什么

- 不让经验层反向定义 contract
- 不让经验层成为隐式规则系统
- 不让 Dota2 经验默认外推成通用经验

### 验收标准

- 经验层不是裸文本池
- 经验项有成熟度与适用范围
- Wizard / Blueprint / review 可以安全使用经验层

---

## Step 8：Gap Fill v1

### 目标

把局部、低风险、受控补全正式纳入产品，但不让它演化成新机制黑洞层。

### 应做什么

- 参数级补缺
- 局部实现变体
- 受控局部 patch
- 与 review / confirm 联动

### Gap Fill v1 的边界

- 必须发生在结构已确定之后
- 不承接新机制
- 不承接新 host rule
- 不承接新 integration point

### 这里不该做什么

- 不做自由 patch 系统
- 不做 system-wide auto-heal
- 不做“系统没建模的都丢 gap-fill”

### 验收标准

- gap-fill 真正只处理局部补缺
- 不再被当成兜底黑洞层
- 与 UI Wizard、Blueprint planning、治理层边界清楚

---

## Step 9：Scene / Map Reference v1

### 目标

让 Rune Weaver 从纯 code-side feature construction，进入最小 world-side named reference。

### 应做什么

- `map_anchor_ref` / `scene_reference` 最小只读引用
- host capability 对应检查
- Wizard 中的 anchor/reference 输入面
- review 中的 reference summary

### 第一版只做什么

- 引用外部命名对象
- 不编辑地图
- 不做坐标系统
- 不做 scene graph orchestration

### 验收标准

- 用户能在不理解底层结构的前提下引用宿主世界对象
- 这类引用不污染通用 schema 和产品语言

---

## Phase 2 结束时应达到的状态

如果 Phase 2 成功，Rune Weaver 应至少具备下面这几个特征：

1. 它已经不是只能靠专家/agent 驱动的内部工程系统。
2. 它已有最小 workbench、Wizard、review 与 confirm 面。
3. 它开始能够在多 feature 共存时承担一部分治理责任。
4. LLM 已进入 planning 层，但还没有获得越权地位。
5. gap-fill 已被正式收紧，不再是无边界兜底层。
6. scene / map reference 已以最小只读方式进入系统。

---

## Phase 2 不该过早引入什么

以下能力即使在 Phase 2，也不应过早重投入：

- 完整 graph orchestration
- 强自愈式 multi-step auto-repair
- 大规模自由型 gap-fill
- 大而全的多宿主同时推进
- scene graph / 地图编辑
- 复杂 balance/AI 设计自动化

原因很简单：

- 这些能力一旦过早进入，会迅速把产品主干再次拖回高不确定状态
- 也会让 Dota2 第一宿主的细节反向污染通用层

---

## Phase 2 与普通“专业 RAG + 特调 prompt”的真正区别

Phase 2 如果做对了，Rune Weaver 的差异不应是：

- 更懂 Dota2
- 更会说术语
- 更像专家代码生成器

而应是：

1. 它有工作台，不只是聊天框。
2. 它有 feature review，不只是代码输出。
3. 它有 conflict governance，不是让用户写完后自己 debug。
4. 它有 lifecycle / ownership / host-aware 约束，不是一次性生成。
5. 它让 LLM 做提案，不让 LLM 当宪法。

---

## 最终一句话

**Phase 2 的本质，是把 Rune Weaver 从“已经证明主干成立的 feature construction 底座”，推进为“一个能够受控 intake、受控 planning、受控 review、受控治理的产品工作台”。**

它必须比“专业领域 RAG + prompt”更稳，但这个“稳”不能只体现在架构词汇上，而要体现在：

- 用户更容易输入
- 系统更容易解释
- 冲突更早暴露
- 项目更不容易被写坏


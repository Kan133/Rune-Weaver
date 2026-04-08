# Phase 2 执行清单（中文）

## 目的

本文用于把 [PHASE2-PLAN-ZH.md](D:/Rune%20Weaver/docs/PHASE2-PLAN-ZH.md) 进一步收束成一份**执行清单**。

这份文档不是任务分发清单，也不是直接给 worker agent 的工作包。

它的作用是：

- 明确 Phase 2 应按什么顺序推进
- 明确每一项的进入条件与完成条件
- 明确哪些项可以并行思考，哪些项不能抢跑
- 为后续由 lead agent 逐项生成 prompt 提供上位依据

也就是说：

- 本文是 `lead agent -> prompt generation` 的依据
- 不是 `worker agent -> 直接执行实现` 的依据

---

## 使用方式

后续推进 Phase 2 时，建议始终采用下面的节奏：

1. 先依据本文确认当前应推进到哪一项。
2. 由 lead agent 基于当前项生成窄 scope prompt。
3. 由外部 agent 执行该 prompt。
4. 把 agent 输出交回 lead agent 审查。
5. 只有当前项被接受，才进入下一项。

不要直接把整份清单丢给 worker agent 执行。

---

## 伴随式治理

Phase 2 不应暂停下来做一轮“大治理”，而应采用伴随式治理：

- 每推进一个窄项，先检查当前边界是否清楚
- 实现完成后立刻做一次短复审
- 只有通过复审，才进入下一项

伴随式治理的目标不是让系统更保守，而是避免：

- 通用层被 Dota2 语义污染
- Wizard / UI Wizard / gap-fill / Blueprint LLM 互相越界
- 治理层反客为主，压过 feature construction
- 为追求速度而堆出 God file / God service / 特判矩阵

---

## 屎山信号

进入 Phase 2 后，lead / orchestrator 每完成一个窄项都应检查以下信号：

- 是否开始把产品层、治理层、执行层揉进同一服务或文件
- 是否开始在通用层直接长出 Dota2-specific 字段、术语或分支
- 是否出现大量 `if host === 'dota2'` 式扩张
- 是否让经验层 / RAG / preset 直接影响最终写入裁决
- 是否把本应升级为 pattern / contract 的能力塞进 gap-fill
- 是否开始维护 pattern 两两兼容矩阵，而不是平台规则
- 是否为了赶功能而绕过 review / confirm / governance gate
- 是否出现用户前台必须理解宿主细节、文件路径、pattern 内部概念才能继续操作

只要其中任一信号持续出现，就不应继续横向扩 Phase 2 能力，而应先做小范围收口。

---

## Phase 2 的总目标

Phase 2 结束时，Rune Weaver 应该从：

- Phase 1 的 feature construction 底座

推进为：

- 一个具备受控 intake、受控 review、最小冲突治理、受控 LLM proposal、受控补缺与最小世界引用能力的产品工作台

它不应退化成：

- 专业领域 RAG + 特调 prompt
- 更会说术语的 vibe coding
- 纯治理后台

---

## Phase 2A：产品入口成立

### 目标

让 Rune Weaver 从“专家主导的执行链”进入“非专家可进入的受控产品入口”。

### 本阶段应完成的事项

- 建立 Workbench v1
- 建立 Main Wizard v1
- 建立 UI need detection
- 建立 UI Wizard v1
- 建立最小 Feature Review v1

### 本阶段的核心问题

- 用户能否在不理解 `pattern / routing / realization` 的前提下输入需求
- 用户能否看懂“系统准备做什么”
- UI 是否有独立但受控的结构澄清入口

### 本阶段必须守住的边界

- 不做完整前端平台
- 不做 Blueprint 图编辑器
- 不做自由 UI 生成器
- 不做大而全的 review 面

### 本阶段完成的判断标准

- 存在最小 workbench 入口
- Main Wizard 已经能承接一般需求输入
- UI Wizard 已作为专项 intake 分支进入体系
- 用户可以看到最小 review / summary / confirm 面
- 本阶段未出现明显屎山信号；如出现，也已在进入 2B 前完成收口

### 本阶段未完成前，不应抢跑的事项

- 不应提前放开 Blueprint LLM
- 不应提前做 gap-fill 主导的 authoring
- 不应提前把复杂 conflict governance 拉进来

---

## Phase 2B：治理层成立

### 目标

建立 Rune Weaver 与普通专业 RAG / vibe coding 的第一道真正差异。

### 本阶段应完成的事项

- 建立 feature identity baseline
- 建立 ownership baseline
- 建立 integration point registry baseline
- 建立 Feature Conflict Governance v1
- 建立更完整的 review / confirm / block 闭环

### 本阶段的核心问题

- 系统能否在写入前发现至少一类真实 feature 冲突
- 系统能否解释“为什么不能直接写”
- 系统能否把冲突翻译成人话，而不是底层术语

### 本阶段冲突治理的优先范围

第一批只聚焦：

- 共享接入点冲突

例如：

- shared hook
- integration point
- mount point
- registry / dispatcher 入口

### 本阶段必须守住的边界

- 不做平衡性冲突治理
- 不做 graph 级复杂调和
- 不做 pairwise compatibility matrix 主导的设计
- 不把所有治理责任推给用户手动 debug

### 本阶段完成的判断标准

- feature 具备可识别身份
- 关键 integration point 已有 registry 或等价记录面
- 至少一类真实冲突可在写入前被 detect / explain / propose / confirm
- review 面能够承接冲突结果
- 治理层仍然是保护层，而不是压过构建流程的主体验
- 本阶段未出现明显屎山信号；如出现，也已在进入 2C 前完成收口

### 本阶段未完成前，不应抢跑的事项

- 不应让 LLM 直接参与 final Blueprint 决策
- 不应让经验层先于治理层成为主要决策依据

---

## Phase 2C：受控智能层成立

### 目标

在不破坏主干与治理层的前提下，引入受控规划能力与受控补缺能力。

### 本阶段应完成的事项

- Blueprint LLM Proposal v1
- Structured Experience Layer v1
- Gap Fill v1
- Scene / Map Reference v1

### 本阶段的核心问题

- LLM 能否只做 proposal，而不越权成为宪法
- 经验层能否不变成裸 RAG
- gap-fill 能否只做局部、低风险、后结构补全
- scene/world reference 能否以最小只读方式进入系统

### 本阶段必须守住的边界

- 不放开 free-form graph generation
- 不让经验层反向定义 contract
- 不让 gap-fill 承担新机制设计
- 不做地图编辑
- 不做 scene graph orchestration

### 本阶段完成的判断标准

- LLM proposal 可以被系统约束和拒绝
- 经验层已有结构化资产类型与成熟度边界
- gap-fill 的边界已经在实现与产品面上都成立
- scene/map reference 已能以最小只读引用方式工作
- 智能层没有绕过治理层或宿主分层
- Phase 2 完结时没有明显屎山信号被带入下一阶段

---

## 三阶段之间的依赖关系

### 2A 先于 2B

原因：

- 如果没有产品入口与基本 review 面，治理层的结果没有产品承接面

### 2B 先于 2C

原因：

- 如果没有治理层，LLM、经验层和 gap-fill 都会把系统推回“更聪明的生成器”

### 2C 不能反向改写 2A / 2B 的边界

原因：

- 受控智能层必须建立在已清晰的产品入口与治理层之上

---

## Phase 2 的阶段关口

为了避免执行偏移，建议把 Phase 2 视为三个必须通过的关口，而不是连续模糊推进。

### 关口 1：2A 关口

只有当下面几件事同时成立，才进入 2B：

- Workbench v1 可用
- Main Wizard v1 可用
- UI Wizard v1 已进入体系
- Review v1 至少能承接输入结果与执行前摘要

### 关口 2：2B 关口

只有当下面几件事同时成立，才进入 2C：

- feature identity 成立
- ownership baseline 成立
- integration point registry baseline 成立
- 至少一类真实冲突能在写入前被 detect / explain / propose / confirm

### 关口 3：2C 关口

当下面几件事成立时，可视为 Phase 2 完成：

- Blueprint LLM proposal 受控成立
- structured experience layer 受控成立
- gap-fill 受控成立
- scene/map reference 最小只读引用成立

---

## 后续 prompt 生成原则

后续每次给 worker agent 下发 prompt 时，应遵守下面几条：

### 原则 1

一次只推进清单中的一个当前项，不混推进多个关口。

### 原则 2

prompt 必须显式写明：

- 当前项属于 2A / 2B / 2C 的哪一阶段
- 当前项不应越过哪些边界
- 当前项完成后如何验收

### 原则 3

若某次输出触碰了：

- Dota2 污染通用层
- LLM 越权
- gap-fill 黑洞化
- UI Wizard 脱离 Main Wizard
- 治理层压过构建主体验

则该项不能接受，即使实现看起来“很能跑”。

### 原则 4

prompt 中应显式提醒 agent：

- 本轮实现完成后需要自查屎山信号
- 若发现产品层 / 治理层 / 执行层混叠，应先收口，不继续横向扩项

---

## 最终一句话

**Phase 2 的执行不应靠一次性总包推进，而应按 `2A -> 2B -> 2C` 的顺序逐关通过，再由 lead agent 为每一关里的当前项单独生成 prompt、审查结果、决定是否进入下一项。**

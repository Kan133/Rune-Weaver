# Phase 3 执行计划 v1（中文）

## 目的

本文用于把 Rune Weaver 的 `Phase 3` 从"方向讨论"收束成一份可执行的阶段计划。

这份计划的目标不是写实现细节，而是明确：

- Phase 3 到底要解决什么问题
- 执行顺序应该是什么
- 每一步的边界与验收标准是什么
- 为什么这个阶段聚焦于 feature lifecycle platformization 而不是更强的 agent orchestration

如需查看更高层的阶段划分，请同时参考：

- [PHASE-ROADMAP-ZH.md](D:/Rune%20Weaver/docs/PHASE-ROADMAP-ZH.md)
- [PRODUCT.md](D:/Rune%20Weaver/docs/PRODUCT.md)

如需查看约束边界，请同时参考：

- [HOST-EXTENSION-GUARDRAILS-ZH.md](D:/Rune%20Weaver/docs/HOST-EXTENSION-GUARDRAILS-ZH.md)
- [UI-WIZARD-GUARDRAILS-ZH.md](D:/Rune%20Weaver/docs/UI-WIZARD-GUARDRAILS-ZH.md)
- [FEATURE-BOUNDARY-RELATIONSHIP-GUARDRAILS-ZH.md](D:/Rune%20Weaver/docs/FEATURE-BOUNDARY-RELATIONSHIP-GUARDRAILS-ZH.md)
- [WORKBENCH-INTERACTION-MODEL-ZH.md](D:/Rune%20Weaver/docs/WORKBENCH-INTERACTION-MODEL-ZH.md)

---

## Phase 3 的一句话定义

**Phase 3 的目标不是让 Rune Weaver 更强的 agent orchestration，而是让它从"Phase 2 的受控产品化工作台"升级为"单 host 上的 feature lifecycle platform v1"。**

换句话说，Phase 3 要解决的不是：

- 引入 LangGraph 或更复杂的 agent graph
- 做更强的 self-healing 智能层
- 做全自动 feature 关系推理
- 支持多 host 扩展

而是：

- 让 feature lifecycle 成为第一公民
- 让 governance 从 review-layer baseline 升级为产品级边界管理
- 让用户在单 host 上能自然地 create / review / update / regenerate / rollback feature
- 让 feature 关系显式建模并可管理

---

## Phase 3 核心成功标准

Phase 3 成功，不以"接了多少 orchestration 能力"衡量，而以这四件事衡量：

1. 用户能在单 host 上自然完成 feature 的完整生命周期管理。
2. Feature 关系（uses / depends_on / extends / touches / conflicts_with）能显式建模并可视化。
3. 高频 case 在单 host 上明显顺手，不需要频繁人工介入。
4. Governance 整合进产品边界而非仅在 review 层。

---

## Phase 3 主线规划

### 主线 1：Feature Lifecycle v1

**目标**：让 feature 的 create / review / update / regenerate / rollback / history 成为第一公民。

**关键子项**：

- Feature 元数据结构化存储（不是散文件）
- Feature 列表页与卡片视图
- Feature 参数编辑与更新流
- Feature 版本历史与 rollback 基础
- Feature 归档

**验收**：用户能在 UI 上完成一个 feature 从创建到更新的完整流程。

---

### 主线 2：Feature Relationship v1

**目标**：让 feature 之间的关系显式建模并可管理。

**关键子项**：

- Feature 关系类型定义（uses / depends_on / extends / touches / conflicts_with）
- 关系可视化与编辑 UI
- 跨 feature 冲突检测基础
- 关系变更追踪

**验收**：两个相关 feature 能建立关系，并在一方变更时提示潜在影响。

---

### 主线 3：Workbench Product UI v1

**目标**：让 workbench 从"调试工具"升级为"产品化工作台"。

**关键子项**：

- 总控对话入口
- Feature 卡片工作区
- Feature 详情 / lifecycle 面板
- Gap-fill 交互优化
- Proposal 评审 UI

**验收**：用户主要交互集中在上述三个面板，不需要频繁切换到底层调试视图。

---

### 主线 4：Pattern Coverage + Stabilization（可选）

**目标**：补齐单 host 上高频 pattern 的覆盖与稳定。

**关键子项**：

- 补齐 KV / TS 路由的更多 case
- 完善 scene reference / hook composition 基础
- 持续 stabilization（减少 mock conflict overblocking）

**验收**：非必须，但能显著提升"明显好用"感受。

---

## In Scope / Out Of Scope

### In Scope

- 单 host 上的 feature lifecycle 完整实现
- Feature 关系建模与可视化
- Workbench 产品化 UI 改造
- Governance 产品边界升级
- 高频 pattern 覆盖补齐

### Out Of Scope

- 多 host 扩展
- LangGraph 或复杂 agent graph
- 全自动 feature 关系推理
- 完整地图编辑能力
- 完整的 auto feature graph

---

## 推荐推进顺序

### 第一步：Feature Lifecycle v1 model + Workbench shell co-design

**原因**：不做空 lifecycle，不做空 UI，而是让两者一起成形。lifecycle object model 是主轴，UI shell 是承载面。先确定对象模型（含字段 / status / action），再让 UI 承载这些对象。不是先做大 UI 装饰层，而是对象模型与 shell 同步推进。

**产出**：Feature Card 最小模型 + Feature Detail 面板基础框架 + Lifecycle Action v1 + 最小可演示流程。

---

### 第二步：Feature Relationship v1

**原因**：Relationship 是 governance 升级的关键。跨 feature 耦合必须显式建模，这是 Phase 3 和 Phase 2 的核心区别。

**产出**：关系类型定义、可视化、变更检测基础。

---

### 第三步：Pattern Coverage + Stabilization

**原因**：这是"明显好用"的加速器。如果 lifecycle 和 relationship 已经通顺，这一步能显著提升高频 case 的体验。

**产出**：更多 pattern 覆盖、更少 overblocking。

---

## 阶段完成标准

### 必须满足

- 用户能在单 host 上自然 create / review / update feature
- Feature 关系能显式建模并可视化
- Workbench 主要交互集中在三个面板
- Governance 不再仅在 review 层，而是产品边界

### 期望改善

- 不容易误建重复 feature
- 能在卡片中管理参数、gap-fill、host reference
- 高频 case 推进更顺畅

### 不需要在本阶段完全成熟

- 多 host 扩展能力
- 复杂的自动化关系推理
- 完整的 LangGraph 集成
- 全地图编辑能力

---

## 时间预估

**总预估**：约 4 到 6 周

- Workbench Product UI v1 基础：约 1 周
- Feature Lifecycle v1 核心：约 1.5 周
- Feature Relationship v1：约 1.5 周
- Pattern Coverage + Stabilization：约 0.5 到 1 周（可选）
- Buffer：约 0.5 周

---

## 风险提示

### 最大风险：过早引入复杂 orchestration

**避免方式**：严格按主线顺序推进，不在 lifecycle 和 relationship 还没通顺时就引入 LangGraph 或复杂 agent graph。

### 次要风险：UI 改造占用太多时间

**避免方式**：先做最小可用 UI，确保核心 lifecycle 和 relationship 功能可演示，再逐步美化。

---

## 下一步

本文档为 Phase 3 plan v1。接下来需要：

- 确认主线的优先级顺序是否符合实际
- 拆出第一批 1-2 周的细粒度 task
- 确认 Workbench Product UI 的技术方案

---

## Phase 3 第 1 周执行计划

**Week 1 状态：已完成**（D308）

**Write Path 验证：forced-validation runtime 已通过**（D416）

### 第 1 周的核心目标

**目标收敛**：不做空 lifecycle，不做空 UI，而是让两者一起成形。

**第 1 周最关键的一件事**：把 Feature Lifecycle v1 的最小对象模型和 Workbench shell 的基础框架一起设计、一起落成，让用户能看到一个具体的 feature 卡片，并能进行最基本的 create/read 操作。

**为什么这是正确的第一刀**：

- 单独做 lifecycle model 容易做成"后台数据表"
- 单独做 UI shell 容易做成"空壳子"
- 两者一起做，才能让 model 有 UI 承载，UI 有 model 基础，形成正向反馈

---

### 第 1 周最小交付物

**交付物 1：Feature Card 最小模型**

- feature id
- display label（用户可见名称）
- system label（内部标识）
- summary（简要描述）
- host
- status（draft / pending / active / archived）
- last updated
- risk / needs confirmation 标记

**交付物 2：Feature Detail 面板最小 sections**

Week-1 必须有：
- 基本信息 section（id / display label / system label / summary / host / status）
- 状态 / 风险 section（status / risk / needs confirmation 标记）
- 可编辑参数 section（展示当前参数 key-value，可直接编辑）
- host / output summary section（当前 feature 会落到哪些 host outputs）

Week-1 可简化：
- pattern bindings section（secondary structural section）

**交付物 3：Lifecycle Action 模型 v1**

- create：创建新 feature
- read：查看 feature 详情
- update：修改 feature 参数
- archive：归档 feature（软删除，不做物理删除）

**交付物 4：最小可演示流程**

- 用户通过对话入口发起"创建一个 dash ability"
- 系统返回 draft 状态的 feature card
- 用户可以在 detail 面板查看 / 编辑参数

---

### Co-Design 方式

**lifecycle model 和 workbench shell 应如何一起设计**：

- 先定义最小 Feature Card 模型（含用户级、管理级字段）
- 再根据字段设计 UI 展示（card view / detail panel）
- 然后定义最小 action（create / read / update / archive）
- 最后串通最小演示流程（对话入口 -> card -> detail）

**什么应该定义 UI**：

- Feature Card 的字段列表决定 card view 展示什么
- Feature Detail 的 sections 决定 panel 的结构
- Status 字段决定卡片的视觉状态（draft / pending / active / archived）

**card 和 detail 的字段分层原则**：

- Card 优先展示用户级、管理级信息：id / display label / system label / summary / host / status / last updated / risk 标记
- Detail Panel 承载结构级信息：Pattern 绑定、参数 key-value、输出产物
- Week-1 不把 Pattern 绑定放入 card 核心字段，而是放入 detail panel

**什么不应该先做**：

- 不做完整的 CRUD，只做 create + read + minimal update
- 不做 relationship 相关功能
- 不做复杂的 status 转换逻辑
- 不做版本历史 / rollback

---

### 本周明确不做的事

- 不做复杂 relationship inference
- 不做完整地图编辑
- 不做 LangGraph orchestration
- 不做大规模 pattern expansion
- 不做 versioning / rollback
- 不做跨 feature 冲突检测
- 不做 gap-fill 深度集成

---

### 建议顺序

**第一步**：定义 Feature Card 最小字段集

- 确定哪些字段是第一周必须有的
- 确定字段的数据类型和约束

**第二步**：设计 Feature Detail 面板基础 sections

- 基本信息 section
- Pattern 绑定 section
- 参数展示 section

**第三步**：定义 Lifecycle Action v1

- create action 的输入输出
- read action 的查询逻辑
- minimal update action 的参数修改

**第四步**：串通最小演示流程

- 对话入口接收 "create feature" 意图
- 生成 draft 状态 feature
- 在 card view 展示
- 在 detail panel 可查看

**可选并行**：如果 UI 框架已有基础，可以和第三步并行开发 card / detail 组件

**为什么这个顺序**：

- 第一步确定数据模型，是所有后续工作的基础
- 第二步让模型有展示载体
- 第三步让卡片可操作
- 第四步让整个流程可演示

---

### 风险提示

**最大风险**：lifecycle model 和 UI shell 脱节

**避免方式**：两者必须一起讨论、一起确认。每次 UI 改动要回溯到 model，model 改动要看是否影响 UI。

**次要风险**：在最小模型上纠结太久

**避免方式**：第一周只求"能演示"，不求"完美"。字段可以后续加，逻辑可以后续改。

---

### 下一步

第 1 周计划确认后，需要：

- 拆出第一周的细粒度 task
- 确认 UI 框架选型
- 确认存储方案（是否复用现有 workspace model）

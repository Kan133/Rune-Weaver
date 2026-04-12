# PRODUCT

## 目的

本文档用于重新定义 Rune Weaver 的产品目标、产品边界、核心竞争力与最终形态。

这份文档不再只从“架构优雅性”出发，而是从更现实的产品问题出发：

- 用户为什么要用 Rune Weaver，而不是继续用 Cursor / Cline 一类工具
- Rune Weaver 解决的到底是不是一个真实痛点
- 它的护城河是不是用户能感知到的价值
- 它在 Host-aware 路线下是否还能规模化
- 当模型持续变强时，它是否仍然成立

> Status Note
>
> `PRODUCT.md` 同时包含长期产品目标与阶段性判断。
> 当前 agent 执行时，若本文件与 [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md) 或 [ROADMAP.md](/D:/Rune%20Weaver/docs/ROADMAP.md) 在“当前已交付能力”上冲突，请以后两者为准。

如需查看阶段路线，请同时参考：

- [PHASE-ROADMAP-ZH.md](/D:/Rune%20Weaver/docs/PHASE-ROADMAP-ZH.md)

---

## 一句话定位

Rune Weaver 不是一个“更重的 vibe coding 工具”。

它的最终目标是：

**在一个已经活着的真实项目里，安全地构建、更新、审阅、回退和组合 feature。**

更完整一点说：

**Rune Weaver 是一个面向真实项目的、受约束的 Feature Construction Platform。**

它不试图在所有场景都替代 Cursor/Cline。

它真正要赢的场景不是“5 分钟从零生成一个 MVP”，而是：

- 项目已经存在
- 功能在持续叠加
- 生成结果需要长期维护
- 多个 feature 需要共存
- 出问题必须能解释、回退、继续演进

---

## Rune Weaver 不是什么

Rune Weaver 不应被定义为：

- 一个通用聊天式代码生成器
- 一个“更工程化一点的 vibe coding UI”
- 一个单纯的 MCP server
- 一个只会输出代码片段的 agent 工具
- 一个“模型不可靠，所以加一堆中间层”的技术炫技系统

MCP 可以是 Rune Weaver 的接入方式之一，但不是产品本体。

Rune Weaver 的本体，是一条正式、受约束、可审阅的 feature 构建链路。

---

## 先回答最尖锐的问题：它卖的是维生素还是止痛药

如果 Rune Weaver 只会说：

- 更可控
- 更可维护
- 更工程化
- contract 更优雅

那它卖的是维生素，不是止痛药。

这不够。

Rune Weaver 必须把自己的价值压缩成一个更具体的止痛场景：

### Rune Weaver 的止痛场景

**当项目已经不是一次性 demo，而是一个在持续演进的功能系统时，Rune Weaver 比普通 vibe coding 更不容易把项目搞坏。**

具体来说，Rune Weaver 应该专门解决下面这类问题：

### 场景 A：在已有项目中增加第 N 个功能

项目里已经有很多历史 feature，用户现在要新增一个功能，这个功能会同时碰到：

- gameplay logic
- UI
- shared data
- host-specific outputs
- 现有 feature 的 ownership boundary

普通 vibe coding 常见问题是：

- 功能能写出来，但影响范围不清楚
- 改了哪个共享点很难说清
- 后续 regenerate / rollback 没语义
- 结果能跑，但项目越来越难维护

Rune Weaver 如果成立，应该在这类场景里更强。

### 场景 B：更新一个已经存在且已部署过的功能

例如：

- 现有 talent feature 要加一个候选项
- 要改 UI 文案
- 要调 buff 参数
- 要保持历史 rollback 语义

普通 vibe coding 很容易退化成：

- 再写一版差不多的代码
- 或直接 patch 一堆文件

Rune Weaver 的理想形态应当是：

- 识别这是已有 feature 的 update
- 只改它拥有的部分
- review 影响范围
- 保持后续 regenerate / rollback 能成立

### 场景 C：多个 feature 单独正确，但组合冲突

例如：

- Feature A 和 Feature B 都能单独运行
- 但它们共享同一个 hook / integration point / owned segment

普通 vibe coding 经常是：

- 先写 A
- 再写 B
- 冲突到 runtime 才暴露

Rune Weaver 的目标应该是：

- 在写入前发现冲突
- 告诉用户冲突在哪里
- 给出合并 / 互斥 / 替换建议
- 再让用户确认是否执行

只有当 Rune Weaver 能在这些场景里明显优于普通 vibe coding，它才是在卖止痛药，而不是维生素。

---

## 与 Vibe Coding 的真正区别

Rune Weaver 和 vibe coding 的区别，不应靠“界面是不是聊天框”来定义。

用户看见的界面，最终可能仍然像：

- 需求输入
- 结构确认
- 执行

但**产品价值不在界面皮相，而在系统在关键场景下能做什么。**

### 普通 vibe coding 更适合什么

- 从零快速试点子
- 做一个短平快 MVP
- 修一个局部函数
- 写一个一次性脚本

### Rune Weaver 更适合什么

- 向一个活项目持续加入新功能
- 更新一个已有功能而不是重写它
- 在多个 feature 共存时保持可治理性
- 把生成行为纳入 review / rollback / lifecycle

所以 Rune Weaver 不应宣称“全面替代 vibe coding”。

更准确的定位是：

**当需求从“一次性生成”转向“持续 feature 演进”时，Rune Weaver 的价值才开始显著。**

---

## Token、速度、稳定性、灵活性的真实比较

### 1. Token 消耗

Rune Weaver 的首轮 token 消耗大概率会比普通 vibe coding 更高。

原因是它要经过：

- planning
- contract gating
- host-aware mapping
- review / validation

这不是缺陷，而是它的代价结构不同。

但 Rune Weaver 不能拿“我们 token 更贵”当卖点。

它必须证明：

**虽然首轮更重，但在真实 feature 演进场景里，总返工成本更低。**

### 2. 稳定性

Rune Weaver 的目标稳定性应高于普通 vibe coding，但这必须表现在用户可感知结果上：

- 不容易静默改坏已有功能
- 影响范围更清晰
- 失败原因更可解释
- 回滚更可信

### 3. 灵活性

需要区分两种灵活性：

- 即时灵活性：vibe coding 更强
- 可积累的系统灵活性：Rune Weaver 更强

Rune Weaver 不应在“任何需求都能立刻试写”上竞争，而应在“被纳入系统后能持续维护”上竞争。

### 4. 可维护性

这是 Rune Weaver 的真实强项之一。

但它不该用“可维护性”这个抽象词自卖自夸，而应该翻译成用户能感知的结果：

- 以后还能改
- 改的时候知道自己改了什么
- 回滚时不害怕
- 新功能加进来时不容易把旧功能打坏

---

## 产品真正的护城河

Rune Weaver 的护城河不是：

- 我们用了多少 agent
- 我们用了哪个大模型
- 我们是不是比别人多一层 Blueprint

真正的护城河应该是下面这些能力的组合。

### 1. Feature Lifecycle Governance

普通工具很擅长“先写出来”。

Rune Weaver 如果要有壁垒，必须擅长：

- create
- update
- regenerate
- rollback

而且这些能力必须建立在同一套正式链路之上。

### 2. Host-aware Feature Construction

Rune Weaver 的真正难点，不是写代码，而是把功能安全地落到具体 host 里。

这意味着它必须理解：

- 哪些 surface 要协同
- 哪些文件由谁拥有
- 哪些 bridge 点允许接入
- 哪些输出必须被统一管理

这是普通聊天式代码工具天然不擅长的。

### 3. Feature Composition Governance

最终产品必须处理的不只是“单 feature 构建”，而是“多个 feature 如何共存”。

这包括：

- integration point 冲突
- hook 争用
- ownership 冲突
- feature-level 互斥或聚合

如果 Rune Weaver 能把这件事做成产品能力，那才是真壁垒。

### 4. Reviewability / Traceability / Recoverability

用户必须能看到：

- 改了什么
- 为什么改
- 影响到哪里
- 有什么风险
- 怎么撤回

contract 本身不是用户价值，但 contract 保障出来的这些能力，就是用户价值。

---

## Host-aware：护城河，还是绞索

答案是：**两者都是。**

### 它为什么是护城河

因为多数工具只能回答：

- “我能生成代码”

但 Rune Weaver 想回答的是：

- “这段功能该落在哪个 host surface”
- “它会影响哪些 bridge / registry / lifecycle”
- “它和已有 feature 的关系是什么”

这是真实工程问题。

### 它为什么也是绞索

如果每支持一个新的 host，都需要重写半套系统，那 Rune Weaver 就会滑向：

- 重度定制化
- 难以规模化
- 更像专业服务，而不是平台

所以 Rune Weaver 必须坚持下面这个分层：

### 上层：host-agnostic feature construction model

尽量稳定：

- intent
- blueprint
- module grouping
- parameters
- review / governance
- lifecycle semantics

### 下层：host-specific realization pack

按 host 变化：

- realization policy
- routing policy
- generator families
- ownership paths
- host validations

如果做不到这层分离，Host-aware 会变成绞索。

### Host 准入边界

Rune Weaver 不应假设所有 host 都值得支持。

一个 host 至少要满足：

- 有足够稳定的结构
- 有可识别的 ownership / lifecycle 边界
- 有可验证的落地点
- 有足够 metadata / policy 可用

没有这些前提的 host，不应该强行支持。

---

## 如果大模型变强，Rune Weaver 会不会失效

这是一个必须正视的问题。

Rune Weaver 不能把自身价值建立在一个静态假设上：

- “LLM 永远不可靠，所以一定需要重链路”

这是危险的。

更合理的判断是：

### Rune Weaver 的“约束需求”是动态的

如果未来模型变得更稳定、更可复现、更擅长结构化输出，那么 Rune Weaver 不应固执地维持最重链路。

它应该允许自己“降维”。

### Rune Weaver 的长期价值不应押在“模型不行”

而应押在：

- 项目级 feature governance
- lifecycle safety
- host-aware 落地
- conflict governance
- review / rollback / traceability

也就是说：

- 模型越强，Rune Weaver 的 planning / generation 层可以变轻
- 但治理层、策略层、执行约束层依然有价值

最终如果模型真的足够强，Rune Weaver 应该能退化成：

- policy layer
- governance layer
- lifecycle layer
- host-aware execution layer

而不是被自己的重链路绑死。

---

## 最终产品形态

Rune Weaver 最终不应只是：

- 一个 CLI
- 一个聊天框
- 一个 MCP server

它更像：

**一个前台统一、后台分层的功能构建平台。**

### 前台：产品工作台

承担：

- 需求输入
- 结构确认
- 参数补全
- 冲突提示
- review / diff
- 执行与验证结果
- rollback / update / regenerate 入口

### 中层：总控与规划

承担：

- 需求理解
- Blueprint proposal
- gap fill 提议
- 冲突解释与裁决建议
- 链路调度

### 后台：deterministic engine

承担：

- schema validation
- pattern resolution
- assembly
- realization
- routing
- generators
- write
- workspace
- lifecycle safety

### 外部接入层

支持：

- CLI
- API
- MCP
- IDE integration

这里再次强调：

- MCP 是接口
- 不是产品定义

---

## 是否需要总控 Agent

需要。

但总控 agent 不是一个全能的“超级 coder”，也不应该是宪法制定者。

Rune Weaver 需要的是一个：

**orchestrator / control-plane / lead agent**

它负责：

- 理解需求
- 组织链路
- 解释风险
- 组织 review
- 发现需要用户确认的点

但它不应该越权决定：

- 核心 contract
- host policy
- ownership boundary
- deterministic validation 规则

一句话：

- agent 是 worker 和 orchestrator
- contract 才是宪法

---

## 是否需要子 Agent

可以有，但必须受严格约束。

### 可以交给子 agent 的

- Blueprint proposal
- 受限 code generation 候选
- UI 内容填充
- 文档同步
- 验证分析
- 受限 gap fill 建议

### 不该交给子 agent 自由决定的

- 核心 contract
- host policy
- feature composition policy
- hook conflict 规则
- 生命周期安全语义

子 agent 不是问题，越权才是问题。

---

## 是否需要 Code Review

需要，但 Rune Weaver 更需要的不是传统 PR review，而是：

**feature review**

它关注的不是“这段代码优不优雅”，而是：

- 这个 feature 想做什么
- 系统生成了哪些模块
- 改了哪些文件
- 影响了哪些面
- 有哪些冲突风险
- 哪些值仍是默认或占位
- 是否适合 create / update / regenerate / rollback

这会是 Rune Weaver 前台产品面中非常重要的一层。

---

## 面向小白用户的现实判断

当前 Rune Weaver 不是一个小白产品。

这件事必须诚实。

它现在更像：

- 一个工程化 feature construction 底座
- 一个接近完成 Phase 1 的系统骨架

而不是：

- 一个已经做好的普通用户产品

所以不要把 Phase 1 的系统能力误写成“小白可用性已成立”。

真正面向小白，还需要：

- Wizard
- 受控 gap fill
- 分层 review 面
- 冲突产品化解释
- 产品化参数面
- 环境与验证可视化

这些都更接近 Phase 2。

---

## 产品的最小可行性验证（MVP）到底是什么

Rune Weaver 的 MVP 不应是：

- “能生成一段代码”
- “能做一个 demo”

它至少应该证明两件事：

### 1. 同一类 feature 能在正式链路中被持续演进

而不是一次性生成后就失控。

### 2. 新增 case 越来越主要靠填内容，而不是继续改系统主干

如果这两点不成立，Rune Weaver 就只是一个更重的模板生成器。

---

## 当前产品判断

当前 Rune Weaver 最准确的状态是：

**一个已经基本完成 Phase 1 架构与 case-construction 收口的 feature construction 底座。**

它已经证明：

- composite backbone 可以成立
- data-inclusive composite 可以成立
- placeholder case 可以通过正式 pipeline 闭环
- case-specific 参数可以通过正式 pipeline 进入生成物
- 最小 talent-drafting-like case 已能在当前 backbone 上闭环

它还没有证明：

- 完整小白产品成立
- 完整 feature conflict governance 已成立
- 完整 host 扩展模型已验证
- runtime / client / environment 闭环已全部完成

---

## 最终一句话定位

Rune Weaver 不是一个为了“更优雅地生成代码”而存在的产品。

它的最终目标是：

**在一个持续演进的真实项目里，把自然语言需求转化为可构建、可审阅、可验证、可回退的 feature。**

# Rune Weaver

Rune Weaver 不是一个“更重的 vibe coding 工具”。

它的目标是：

**在一个已经活着的真实项目里，安全地构建、更新、审阅、回退和组合 feature。**

更准确地说，Rune Weaver 是一个面向真实项目的、受约束的 **Feature Construction Platform**。

---

## 它解决什么问题

Rune Weaver 不试图在所有场景都替代 Cursor / Cline。

它真正要解决的是这类问题：

- 项目已经存在，不是一次性 demo
- 功能在持续叠加
- 多个 feature 需要共存
- 改一个功能可能影响别的功能
- 结果需要可审阅、可回退、可继续演进

换句话说，Rune Weaver 不是为了“5 分钟吐一个 MVP”，而是为了：

- 向一个活项目持续加功能
- 更新已有功能，而不是每次重写一版
- 在多 feature 共存时尽量不把项目搞坏

---

## 它不是什么

Rune Weaver 不应被理解为：

- 通用聊天式代码生成器
- 任意宿主上的自由改写工具
- 一个单纯的 MCP server
- 一个“让 LLM 搭积木拼代码块”的产品

MCP 可以是接入方式之一，但不是产品本体。

Rune Weaver 的本体是一条正式、受约束、可审阅的 feature 构建链路。

---

## 最适合的宿主区间

Rune Weaver 当前最适合的不是所有软件项目，而是这类宿主：

- 中等复杂度
- feature 持续叠加
- 规则和约束很多
- 单个功能不一定难，但组合很容易失控
- 后期维护痛感明显
- 宿主有相对稳定的结构、入口和 ownership boundary

当前第一真实宿主是：

- **Dota2 Custom Game / x-template / test1**

但 Dota2 不是产品本体，只是第一套 host pack。

未来更合理的相邻宿主区间包括：

- Warcraft 3 地图
- 部分 Roblox 玩法项目
- 其他规则密集、功能持续叠加、host 边界较稳定的内容型宿主

---

## Rune Weaver 的真正优势

Rune Weaver 的优势不在“模型更聪明”，而在下面这些能力的组合：

- **Feature Lifecycle**
  - create
  - update
  - regenerate
  - rollback
- **Host-aware Construction**
  - 知道该写到哪里
  - 知道哪些路径/桥接点被允许
  - 知道哪些输出必须协同
- **Feature Review**
  - 不是只看代码片段
  - 而是看这个 feature 会改什么、影响什么、风险是什么
- **Feature Composition Governance**
  - 在写入前发现一部分真实冲突
  - 而不是等代码写完后让用户自己 debug

Rune Weaver 的目标不是“比 vibe coding 更会说术语”，而是：

**当项目进入持续 feature 演进阶段时，比普通 vibe coding 更不容易把项目搞坏。**

---

## 当前系统状态

当前项目状态应被理解为：

- **Phase 1 的 architecture goals 与 case-construction goals 已基本完成**
- 但 **runtime / client / toolchain closure** 仍未全部完成

当前已经成立的关键能力包括：

- 正式主链路：
  - `Natural Language -> IntentSchema -> Blueprint -> Pattern Resolution -> Assembly -> Realization -> Routing -> Generation -> Write`
- composite backbone 已建立并验证：
  - `trigger`
  - `data`
  - `rule`
  - `ui`
  - `effect`
- 最小 talent-drafting-like case 已在正式 pipeline 中闭环
- case-specific parameter flow 已打通
- parameterized talent-drafting path 已恢复到 5-module backbone
- code-level formal-pipeline closure 已确认

当前仍不应被过度宣称为已完成的部分：

- 完整 runtime / client playability closure
- 全部 toolchain/environment 闭环
- 小白产品已完成
- Phase 2 的 Wizard / Blueprint LLM / conflict governance / scene reference 已实现

---

## 当前与未来的分层

Rune Weaver 的长期结构不应是“一个 Dota2 专用生成器”，而应是三层：

- **Product Universal Layer**
  - 产品入口
  - Wizard / Review / Governance
  - feature lifecycle
- **Host Contract Layer**
  - host capability
  - realization policy
  - routing / ownership / validation policy
- **Host Pack Layer**
  - Dota2 generators
  - Dota2 paths
  - Dota2 write / validation specifics

这也是后续避免“加一个宿主要改半个产品”的关键。

---

## 当前高层链路

### 产品与规划主流

```text
User Request
  -> Workbench
  -> Main Wizard
  -> optional UI Wizard / optional scene reference intake
  -> IntentSchema
  -> Blueprint Proposal
  -> Contract / Governance / Host Checks
  -> Final Blueprint
```

### 执行主流

```text
Final Blueprint
  -> Pattern Resolution
  -> AssemblyPlan
  -> HostRealizationPlan
  -> GeneratorRoutingPlan
  -> Generators
  -> WritePlan
  -> Write Executor
  -> Validation Report
  -> Workspace State / Feature Record
```

---

## Phase 2 方向

Phase 2 不是“让 Rune Weaver 更像自由生成器”，而是让它从工程底座进入受控产品化。

核心方向包括：

- Workbench / Main Wizard v1
- UI Wizard v1
- Feature Governance Foundation
- Feature Conflict Governance v1
- Feature Review v1
- Blueprint LLM Proposal v1
- Structured Experience Layer v1
- Gap Fill v1
- Scene / Map Reference v1

Phase 2 的原则是：

- **先治理层，再智能层**
- **构建优先，治理是保护层**
- **Dota2 是第一宿主，不是产品本体**

---

## 仓库结构

- `core/`
  - 通用 schema、planning、pipeline、wizard、llm
- `adapters/`
  - 宿主实现层，当前以 Dota2 为主
- `apps/cli/`
  - 当前 CLI 入口
- `docs/`
  - source-of-truth 文档
- `references/`
  - 宿主参考资料
- `skills/`
  - 本地 Codex skill
- `archive/`
  - 归档内容

---

## 建议阅读顺序

如果你第一次进入这个仓库，建议按下面顺序阅读：

1. [docs/HANDOFF.md](./docs/HANDOFF.md)
2. [docs/PRODUCT.md](./docs/PRODUCT.md)
3. [docs/SYSTEM-ARCHITECTURE-ZH.md](./docs/SYSTEM-ARCHITECTURE-ZH.md)
4. [docs/PHASE-ROADMAP-ZH.md](./docs/PHASE-ROADMAP-ZH.md)
5. [docs/PHASE2-PLAN-ZH.md](./docs/PHASE2-PLAN-ZH.md)
6. [docs/PHASE2-EXECUTION-CHECKLIST-ZH.md](./docs/PHASE2-EXECUTION-CHECKLIST-ZH.md)

如果你要看当前已验证的执行链，再看：

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

## 开发

要求：

- Node.js 18+

安装：

```bash
npm install
```

常用命令：

```bash
npm run check-types
npm run cli -- --help
```

---

## 当前最自然的下一步

如果按当前路线继续推进，最自然的方向不是“再加更多 Dota2 特例”，而是：

- 按 `PHASE2-PLAN-ZH` 与 `PHASE2-EXECUTION-CHECKLIST-ZH` 推进 Phase 2
- 优先建立受控产品入口、治理层和 review 面
- 再引入 Blueprint LLM proposal、structured experience、gap-fill、scene reference

---

## 说明

- 当前 README 是入口摘要，不是完整设计文档
- 更完整的判断、边界与计划，都在 `docs/` 下
- Rune Weaver 的方向始终是：
  - **受控构建**
  - **受控治理**
  - **受控写入**
  - **受控演进**

而不是自由生成。

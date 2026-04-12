# Rune Weaver Demo Paths

> Status Note
> This document defines demo and walkthrough paths, not the active execution queue.
> For current implementation priority, use [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md).

本文档定义 Rune Weaver 的演示路径，面向外部用户和内部协作者。

> **当前状态说明**  
> 本文档基于 README-target MVP 的当前实现状态编写。关于当前能力边界的权威定义，请参阅 [AGENT-EXECUTION-BASELINE.md](./AGENT-EXECUTION-BASELINE.md)。

---

## Demo Gate 分层

本项目的演示路径按成熟度分为三层：

| 分层 | 标识 | 说明 | 适用场景 |
|------|------|------|----------|
| **External-Safe** | ✅ | 可用于对外演示，已稳定可用 | 潜在用户、技术决策者、公开演示 |
| **Internal-Only** | ⚠️ | 仅限内部演示，存在已知限制 | 内部协作者、开发团队、架构评审 |
| **Deferred** | ⏸️ | 延迟实现，暂不演示 | 未来规划、技术储备 |

**演示原则：**
- External-Safe 路径可以自信地展示给外部用户
- Internal-Only 路径必须明确说明限制，不得对外承诺
- Deferred 路径不应在正式演示中出现

---

## 1. 面向外部用户的 Demo Path

### 1.1 最小 Create 路径（推荐）✅ External-Safe

> **Demo Gate: External-Safe**  
> 此路径已稳定可用，可用于对外演示。CLI 是 authoritative lifecycle path。

**演示目标**  
展示 Rune Weaver 的核心价值：用自然语言描述功能 → 自动生成代码 → 统一管理功能

**面向谁**  
潜在用户（Dota2 模组开发者）、技术决策者

**前置条件**
- 本地已配置 LLM API Key（ANTHROPIC_API_KEY 或 OPENAI_API_KEY）
- 已准备干净的 Dota2 项目目录（dota2-x-template 规范）
- 已运行 `npm install`

**展示步骤**

| 步骤 | 动作 | 展示内容 |
|------|------|----------|
| 1 | 介绍产品 | "Rune Weaver 是一个用自然语言描述功能、自动生成代码、统一管理功能的工具" |
| 2 | 初始化宿主 | `npm run cli -- dota2 init --host <path>` |
| 3 | 创建 feature | `npm run cli -- dota2 run "做一个按Q键触发的冲刺技能，冷却8秒" --host <path>` |
| 4 | 展示输出 | Feature Identity / Ownership / Integration Points / Conflict Check |
| 5 | 展示 workspace | `rune-weaver.workspace.json` 文件内容 |
| 6 | 展示 list | `npm run cli -- dota2 --list --host <path>` 列出已创建的功能 |

**预期看到的结果**
- 控制台显示完整的 feature lifecycle 输出
- workspace JSON 文件包含 feature record
- Feature 作为一等公民被统一管理

**当前限制（必须说明）**
- `update` 仅支持 owned-scope 内的选择性重写
- `delete` 仅支持 owned-scope 内的文件删除

**风险点**
- LLM 服务不可用时可能降级到 fallback proposal
- 代码生成质量和覆盖面仍在演进

**不要承诺什么 / 不适合对外承诺什么**

| 能力 | 外部演示时 | 必须说明的限制 |
|------|-----------|---------------|
| 代码生成 | ⚠️ 可以说"代码生成已产品级可用" | 需说明仍在演进中，质量覆盖面持续扩展 |
| 文件写入 | ✅ 可以说"文件已真实写入" | `--write` 模式已支持真实文件写入 |
| 冲突治理 | ✅ 可以说"workspace-backed 冲突检测已可用" | workspace-backed 冲突检测已实现 |
| Wizard 交互 | ⚠️ 只能说"基础实现" | 可能降级到 fallback，不能说"完整的 Wizard 对话已可用" |

**演示时应避免的表述：**
- ❌ "系统会生成可运行的 Lua/KV 代码"
- ❌ "写入后可以直接在 Dota2 中测试"
- ✅ "系统会生成结构化的功能定义，代码生成正在完善中"
- ✅ "文件已真实写入，冲突检测已可用"

---

### 1.2 Examples 验证路径（无需 LLM）✅ External-Safe

> **Demo Gate: External-Safe**  
> 此路径已稳定可用，可用于对外演示。无需 LLM 配置，适合快速验证安装和基础功能。

**演示目标**  
展示 Rune Weaver 核心数据结构和验证链路，无需 LLM 配置

**展示步骤**
```bash
npm run examples
```

**预期结果**
```
============================================================
█      Rune Weaver - MVP 用例验证                          █
============================================================

示例 A: 微功能 - Q键冲刺技能
============================================================
📝 用户需求: 做一个按Q键触发的朝鼠标方向冲刺技能，冷却8秒
📄 IntentSchema: 分类: micro-feature | 置信度: 0.95
🏗️  Blueprint: 模块数: 4 | 连接数: 2
📦 AssemblyPlan: Pattern 绑定: 4 个
🔍 Dota2 宿主验证: 结果: ✅ 通过 | 错误: 0, 警告: 0

✅ 示例 A 验证通过
============================================================

... (示例 B、C 类似输出)

============================================================
█      ✅ 所有 MVP 用例验证通过                            █
============================================================
```

**适用场景**
- 快速验证安装是否正确
- 无 LLM 配置时的基础演示
- CI/CD 自动化验证

**不要承诺什么 / 不适合对外承诺什么**

| 能力 | 外部演示时 | 必须说明的限制 |
|------|-----------|---------------|
| 完整链路 | ❌ 不能说"这就是完整产品" | 这只是静态验证，没有 LLM、没有代码生成 |
| 端到端能力 | ❌ 不能说"从需求到代码都已可用" | 仅展示数据结构和验证逻辑 |
| 可扩展性 | ⚠️ 只能说"架构支持扩展" | 新增 case 仍需开发工作 |

**演示时应避免的表述：**
- ❌ "这就是 Rune Weaver 的完整功能"
- ❌ "不需要 LLM 也能完成所有功能"
- ❌ "这些示例就是产品能做的事"
- ✅ "这些示例展示了核心数据结构和验证链路，完整功能需要 LLM 和代码生成支持"

---

## 2. 面向内部协作者的 Demo Path

### 2.1 CLI 完整链路 ✅ External-Safe

> **Demo Gate: External-Safe**  
> CLI 是 authoritative lifecycle path，可用于对外演示。

**演示目标**  
验证 CLI 的完整数据流

**面向谁**  
后端/CLI 开发者、架构师、QA、潜在用户

**展示步骤**

| 步骤 | 命令 | 验证点 |
|------|------|--------|
| 1 | `npm run cli -- dota2 run "做一个冲刺技能" --host <path>` | Feature Identity 生成 |
| 2 | `npm run cli -- dota2 --list --host <path>` | Workspace 读取功能 |
| 3 | `npm run cli -- dota2 --inspect <featureId> --host <path>` | Feature 详情查看 |
| 4 | `npm run cli -- dota2 --delete <featureId> --host <path>` | Delete 预览（不带 --confirm） |
| 5 | 检查 workspace JSON | 验证 feature record 结构 |

**当前能力说明**
- `create` 已支持真实文件写入，`generatedFiles` 和 `entryBindings` 已可用
- `update` 已实现选择性文件重写
- `delete` 已实现真实文件删除 + bridge 刷新

**不要承诺什么 / 不适合对外承诺什么**

| 能力 | 外部演示时 | 必须说明的限制 |
|------|-----------|---------------|
| 产品级入口 | ✅ 可以说"CLI 是 authoritative lifecycle path" | CLI 已是产品级主入口 |
| 真实写入 | ✅ 可以说"文件已经真实写入" | `generatedFiles` 和 `entryBindings` 已支持真实写入 |
| 数据一致性 | ✅ 可以说"workspace 记录与文件一致" | 记录与真实文件的一致性已保证 |
| update/delete | ✅ 可以说"update/delete 已可用" | 已实现真实文件操作和生命周期管理 |

**演示时应避免的表述：**
- ❌ "workbench 是产品级主入口"
- ❌ "UI 是独立执行系统"
- ✅ "CLI 是 authoritative lifecycle path，workbench/UI 是可视化/编排层"

---

### 2.2 Workbench UI 可视化演示 ⚠️ Partial Product Entry

> **Demo Gate: Partial Product Entry**  
> UI 已接通真实 CLI 调用，但仅覆盖部分功能。演示时需明确说明已接通和未接通的能力边界。

**演示目标**  
展示 workspace-backed feature registry 的可视化界面

**面向谁**  
前端开发者、产品/设计师、技术管理者

**展示步骤**

| 步骤 | 动作 | 展示内容 |
|------|------|----------|
| 1 | 启动 UI | `cd apps/workbench-ui && npm run dev` |
| 2 | 展示 FeatureList | 左侧 feature 列表，显示状态、revision、更新时间 |
| 3 | 展示 FeatureDetail | 选中 feature 后展示详情 |
| 4 | 展示场景切换 | Create / Update / Governance-Blocked / Write-Success |

**当前能力边界**
- ✅ 已接通：Host scan, Host status check, Initialize, Create (dry-run)
- ⚠️ 未接通：Project naming, Launch configuration
- ✅ 架构定位：UI → CLI Bridge，所有操作通过 dota2-cli 执行

**可以承诺什么 / 必须说明的边界**

| 能力 | 外部演示时 | 必须说明的限制 |
|------|-----------|---------------|
| Host scan | ✅ 可以说"真实扫描宿主路径" | 仅验证路径有效性，不修改文件 |
| Host status | ✅ 可以说"真实检查集成状态" | 仅读取状态，不执行修复 |
| Initialize | ✅ 可以说"真实执行项目初始化" | 会创建真实文件和目录结构 |
| Create dry-run | ✅ 可以说"真实预览生成结果" | 仅预览，不写入文件（dry-run 模式） |
| Project naming | ❌ 不能说"可以创建项目" | 未接通 CLI，仅前端验证格式 |
| Launch config | ❌ 不能说"可以配置启动参数" | 功能延迟到后续 phase |

**演示时应避免的表述：**
- ❌ "UI 是独立执行系统"（正确：UI → CLI Bridge，所有操作通过 dota2-cli 执行）
- ❌ "可以创建真实功能"（正确：当前仅支持 dry-run 模式，预览不写入）
- ❌ "所有功能都已接通"（正确：Project naming 和 Launch config 未接通）
- ✅ "CLI 是 authoritative lifecycle path，UI 是可视化/编排层"

---

## 3. 当前状态 vs 目标状态对照

| 能力 | 现在能可靠展示 | 内部演示但不对外承诺 | 目标状态暂未完成 |
|------|---------------|---------------------|-----------------|
| **create** | dry-run 模式下的完整 proposal 链路；workspace 记录写入；`--write` 模式下的真实文件写入 | - | 产品级代码生成和写入 |
| **update** | owned-scope 选择性重写 | - | 跨 feature 修改支持 |
| **delete** | owned-scope 文件删除 + bridge 刷新 | - | cascade delete 支持 |
| **governance** | workspace-backed conflict check | - | 完整的跨 feature 冲突治理 |
| **regenerate** ⏸️ | 概念展示 | - | 完整实现（deferred） |
| **rollback** ⏸️ | 概念展示 | - | 完整实现（deferred） |
| **UI** | Partial Product Entry（已接通部分 CLI 调用） | 完整的 backend contract + 所有功能接通 | 产品级可用入口 |

> **Deferred 能力说明**  
> `regenerate` 和 `rollback` 标记为 ⏸️ Deferred，暂不在演示范围内。这些能力已规划但尚未开始实现。

---

## 4. Demo Asset 建议

### 4.1 最值得截图的页面/输出

| Asset | 来源 | 说明 |
|-------|------|------|
| **Workbench CLI 输出** | `npm run workbench` 控制台 | 展示完整的 lifecycle 输出 |
| **Feature Card** | workbench-ui 左侧列表 | 展示 feature 作为一等公民 |
| **Feature Detail** | workbench-ui 右侧面板 | 展示 feature 完整信息 |
| **Workspace JSON** | `rune-weaver.workspace.json` | 展示结构化持久化状态 |

### 4.2 最值得录屏的 flow

**"创建一个冲刺技能" 完整链路：**

1. 用户输入自然语言
2. 系统展示 Feature Identity / Ownership / Integration Points
3. 系统展示 Conflict Check
4. 系统展示 Blueprint Proposal
5. 系统展示 Gap Fill 结果
6. 系统展示 Lifecycle Actions
7. 系统展示 Governance Release
8. 切换到 UI 界面，展示新创建的 feature

### 4.3 最能体现价值的输出

| 价值点 | 对应输出 |
|--------|----------|
| **Feature 是一等公民** | FeatureCard 和 FeatureDetail |
| **Host Separation** | `generatedFiles` 路径都在 `rune_weaver/` 目录下 |
| **冲突检测** | Conflict Check 输出 |
| **可解释性** | Blueprint Proposal 和 Gap Fill 输出 |

---

## 5. 演示注意事项

### 5.1 Demo Gate 快速参考

| 演示路径 | 状态 | 对外演示 | 内部演示 |
|---------|------|---------|---------|
| 1.1 最小 Create 路径 | ✅ External-Safe | ✅ 可演示 | ✅ 可演示 |
| 1.2 Examples 验证路径 | ✅ External-Safe | ✅ 可演示 | ✅ 可演示 |
| 2.1 CLI 完整链路 | ✅ External-Safe | ✅ 可演示 | ✅ 可演示 |
| 2.2 Workbench UI 可视化演示 | ⚠️ Partial Product Entry | ⚠️ 可演示（需说明边界） | ✅ 可演示 |
| regenerate / rollback | ⏸️ Deferred | ❌ 不演示 | ❌ 不演示 |

### 5.2 必须说明的限制

- `update` 仅支持 owned-scope 内的操作
- `delete` 仅支持 owned-scope 内的操作

### 5.3 不建议演示的内容

- 不要演示 `regenerate` 或 `rollback`（deferred）
- 不要演示语义级 incremental update（deferred）
- 不要承诺当前已实现所有 README 描述的功能

### 5.4 演示失败时的降级方案

| 场景 | 降级方案 |
|------|----------|
| LLM 不可用 | 使用 `npm run examples` 展示静态验证 |
| `--write` 失败 | 使用 dry-run 模式展示 proposal 链路 |
| UI 无法启动 | 使用 CLI 输出截图 |

---

## 附录：相关文档

- [AGENT-EXECUTION-BASELINE.md](./AGENT-EXECUTION-BASELINE.md) - 当前 MVP 边界定义
- [MVP-EXECUTION-QUEUE.md](./MVP-EXECUTION-QUEUE.md) - 执行队列
- [WORKSPACE-MODEL.md](./WORKSPACE-MODEL.md) - Workspace 模型定义

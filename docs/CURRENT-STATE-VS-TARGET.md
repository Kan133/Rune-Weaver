# Current State vs Target State

> Status Note
> This document is a narrative/reference view, not the active execution queue.
> For current execution priority, use [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md).

本文档明确区分 Rune Weaver 的当前实现状态与目标状态，确保产品叙述真实可信。

> **权威参考**  
> 本文档基于 [AGENT-EXECUTION-BASELINE.md](./AGENT-EXECUTION-BASELINE.md) 和 [ROADMAP.md](./ROADMAP.md) 编写。如有冲突，以后两者为准。

---

## 1. 当前项目状态总览

```
Phase 1 (Host-Separated Construction Baseline): 基本完成 ✅
Phase 2 (README-Target MVP): 进行中 🚧
Phase 3 (Extended Lifecycle): 未开始 ⏸️
```

### 1.1 已完成的基线能力

- ✅ Host ownership boundary 已建立
- ✅ Workspace state file 已存在
- ✅ Bridge export 到 workbench-ui 已可用
- ✅ root/build/typecheck baseline 已通过
- ✅ Workbench UI 可可视化 workspace/bridge 数据

### 1.2 正在进行的核心工作

根据 [MVP-EXECUTION-QUEUE.md](./MVP-EXECUTION-QUEUE.md)：

| Packet | 任务 | 状态 |
|--------|------|------|
| A | Workspace Truth And Product-Grade `create` | 进行中（关键路径） |
| B | Owned-Scope `update` | 等待 Packet A |
| C | Real `delete` And Unload | 等待 Packet A |
| D | Minimum Governance v1 | 等待 Packet A |
| E | Canonical Verification Flow | 等待 A/B/C/D |

---

## 2. 详细能力对照表

### 2.1 Create 能力

| 维度 | 当前状态 | 目标状态 | 差距说明 |
|------|----------|----------|----------|
| **Workspace 记录** | ✅ 可写入 feature record | ✅ 完整记录 | 已达成 |
| **Feature ID** | ✅ 生成 stable ID | ✅ 保持稳定 | 已达成 |
| **Selected Patterns** | ⚠️ 部分记录 | ✅ 真实记录 | Packet A 进行中 |
| **Generated Files** | ⚠️ 部分记录 | ✅ 真实文件列表 | Packet A 进行中 |
| **Entry Bindings** | ⚠️ 部分记录 | ✅ 真实绑定 | Packet A 进行中 |
| **代码生成** | ⚠️ 基础实现 | ✅ 产品级生成 | 需要完善 |
| **文件写入** | ⚠️ 部分实现 | ✅ 完整写入 | Packet A 进行中 |

**当前可演示内容：**
- ✅ dry-run 模式下的完整 proposal 链路
- ✅ workspace 记录写入
- ⚠️ `--write` 模式（需说明限制）

**当前不建议承诺的内容：**
- ❌ 产品级代码生成
- ❌ 完整的文件写入和 bridge 更新

---

### 2.2 Update 能力

| 维度 | 当前状态 | 目标状态 | 差距说明 |
|------|----------|----------|----------|
| **Metadata Update** | ✅ 可更新 workspace 记录 | ✅ 支持 | 已达成 |
| **Owned-Artifact Rewrite** | ❌ 未实现 | ✅ 重写 owned files | Packet B |
| **Bridge Binding Update** | ❌ 未实现 | ✅ 更新 bridge | Packet B |
| **Revision Tracking** | ⚠️ 基础实现 | ✅ 完整版本 | 需要完善 |
| **Semantic Update** | ❌ 不支持（deferred） | ❌ 不在 MVP 范围 | N/A |

**当前可演示内容：**
- ✅ metadata-only update（workspace 记录更新）

**当前不建议承诺的内容：**
- ❌ 真正的 feature update（保持 featureId，重写 owned files）
- ❌ Semantic incremental update（deferred）

---

### 2.3 Delete 能力

| 维度 | 当前状态 | 目标状态 | 差距说明 |
|------|----------|----------|----------|
| **Workspace Record Removal** | ✅ 可移除记录 | ✅ 支持 | 已达成 |
| **File Deletion** | ❌ 未实现 | ✅ 删除 owned files | Packet C |
| **Bridge Unload** | ❌ 未实现 | ✅ 刷新 bridge | Packet C |
| **Dependency Check** | ⚠️ 基础实现 | ✅ 完整检查 | Packet C |

**当前可演示内容：**
- ✅ workspace 记录移除
- ✅ delete 预览（不带 `--confirm`）

**当前不建议承诺的内容：**
- ❌ 真正的 unload（删除文件 + 刷新 bridge）

---

### 2.4 Governance 能力

| 维度 | 当前状态 | 目标状态 | 差距说明 |
|------|----------|----------|----------|
| **Ownership Overlap Detection** | ⚠️ mock-driven | ✅ workspace-backed | Packet D |
| **Bridge Point Contention** | ⚠️ mock-driven | ✅ workspace-backed | Packet D |
| **Target Ambiguity Detection** | ⚠️ 基础实现 | ✅ 完整检测 | Packet D |
| **Dependency Risk Check** | ⚠️ 基础实现 | ✅ 完整检查 | Packet D |

**当前可演示内容：**
- ✅ mock-driven conflict detection
- ✅ governance blocked 场景演示

**当前不建议承诺的内容：**
- ❌ 完整的 workspace-backed conflict governance

---

### 2.5 Deferred 能力（明确不在当前 MVP）

以下能力已明确 deferred，当前不应承诺：

| 能力 | 状态 | 说明 |
|------|------|------|
| **Regenerate** | ⏸️ Deferred | 不在 README-target MVP |
| **Rollback** | ⏸️ Deferred | 不在 README-target MVP |
| **Semantic Incremental Update** | ⏸️ Deferred | 不在 README-target MVP |
| **Second Host** | ⏸️ Deferred | 不在 README-target MVP |
| **Full UI/Workbench Contract** | ⏸️ Deferred | 不在 README-target MVP |

---

## 3. README 描述与当前现实对照

### 3.1 已准确描述的段落

| README 段落 | 准确度 | 说明 |
|-------------|--------|------|
| "当前状态说明" (L9-L28) | ✅ 准确 | 明确区分目标与当前边界 |
| "Rune Weaver 不是什么" (L186-L191) | ✅ 准确 | 四个否定性定义与 BASELINE 一致 |
| "代码库结构" (L195-L202) | ✅ 准确 | 事实性陈述 |
| "快速开始" (L205-L215) | ✅ 准确 | 标准项目描述 |

### 3.2 需要调整描述的段落

| README 段落 | 当前问题 | 建议调整 |
|-------------|----------|----------|
| "用户视角的完整流程" (L31-L62) | 描述目标形态，但可能误导为已实现 | 添加醒目提示："⚠️ 上述流程为产品目标形态，当前 MVP 仅支持基础能力" |
| "Gap Fill" (L66-L87) | 详细描述但未实现 | 移至"未来能力"章节或添加标注 |
| "和 Vibe Coding 的区别" (L123-L137) | 冲突处理描述超前 | 改为"目标是在写入前检查冲突，当前版本提供基础检测" |
| "核心优势" (L140-L183) | 四条优势均为目标状态 | 添加当前实现状态标注 |

---

## 4. 演示边界指南

### 4.1 可以公开演示的内容

- ✅ `npm run examples` - 静态验证链路
- ✅ `npm run workbench` dry-run 模式 - 完整 proposal 链路
- ✅ `--list` 和 `--inspect` 命令 - workspace 查询
- ✅ Workbench UI mock data 可视化
- ✅ Feature 作为一等公民的概念展示

### 4.2 可以内部演示但需说明限制的内容

- ⚠️ `--write` 模式 - 需说明文件写入仍在完善
- ⚠️ `--delete` 命令 - 需说明仅移除记录，不删除文件
- ⚠️ Governance blocked 场景 - 需说明当前为 mock-driven

### 4.3 不建议演示的内容

- ❌ `regenerate` 或 `rollback`
- ❌ Semantic incremental update
- ❌ 声称当前已实现所有 README 描述的功能
- ❌ 声称冲突治理已完全产品级

---

## 5. 对外沟通话术建议

### 5.1 一句话介绍（当前可用）

> "Rune Weaver 是一个面向 Dota2 模组开发者的功能构建工具，它能把自然语言需求转化为结构化的功能定义，并统一管理这些功能的生命周期。"

### 5.2 当前能力描述

> "当前版本已完成基础架构和核心数据流，支持从自然语言输入到 workspace 记录的完整链路。`create` 的基础版本已可用，`update` 和 `delete` 正在完善中。"

### 5.3 必须提及的限制

> "需要注意的是，当前版本仍处于 MVP 阶段：
> - 代码生成和文件写入功能仍在完善
> - `update` 和 `delete` 尚未完全产品级
> - 冲突治理当前为演示级别，非完整实现
> - `regenerate` 和 `rollback` 计划在后续版本实现"

---

## 6. 下一步里程碑

根据 [MVP-EXECUTION-QUEUE.md](./MVP-EXECUTION-QUEUE.md)：

1. **Packet A 完成标志**：`create` 可持久化 truthful workspace state
2. **Packet B 完成标志**：`update` 实现 owned-artifact rewrite
3. **Packet C 完成标志**：`delete` 实现 true unload
4. **Packet D 完成标志**：conflict checks 转为 workspace-backed
5. **Packet E 完成标志**：提供可重复的 create/update/delete/conflict walkthrough

当 Packet A-E 全部完成时，README-target MVP 即达成。

---

## 附录：相关文档

- [AGENT-EXECUTION-BASELINE.md](./AGENT-EXECUTION-BASELINE.md) - 当前 MVP 边界
- [MVP-EXECUTION-QUEUE.md](./MVP-EXECUTION-QUEUE.md) - 执行队列
- [ROADMAP.md](./ROADMAP.md) - 阶段规划
- [DEMO-PATHS.md](./DEMO-PATHS.md) - 演示路径

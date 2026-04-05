# Rune Weaver Tasks

## 1. 目的

本文件只保留当前真实状态、当前有效任务、以及 agent 下一步执行边界。

历史完成记录见：
- [TASKS-COMPLETED.md](/D:/Rune%20Weaver/archive/TASKS-COMPLETED.md)

---

## 2. 当前主链路状态

当前主链路：

`CLI -> Wizard -> IntentSchema -> Blueprint -> Pattern Resolution -> AssemblyPlan -> Dota2 Adapter -> Validation`

当前已经成立：
- `Wizard -> IntentSchema` 可用真实 Kimi 冒烟
- Pattern Core 已站稳
- 通用性验证已完成
- `Wizard -> Blueprint` 已打通
- `Blueprint -> AssemblyPlan` 已打通
- 真实 Pattern Catalog 当前为 10 个
- `dash_ability` 与 `talent_selection` 已能进入可信 Assembly 阶段

当前正式宿主：
- `D:\test1`
- 类型：`dota2-x-template`

---

## 3. 当前真实结论

**T067 Host Planning Correctness 修复已完成**。

修复内容：
1. ✅ `HOST_CONTEXT_AVAILABLE` 升为硬门槛（severity: error）
   - 当 `hostRoot = NOT_SET` 时，`readyForHostWrite = false`

2. ✅ `bridgePlan.hostFile` 修正为真实宿主相对路径
   - 移除 `server/...`、`ui/...` 等伪路径

3. ✅ `rwOwned` 判定修正
   - RW 自有文件 (`rune_weaver/*`) → `rwOwned: true`
   - 宿主入口文件 (`modules/index.ts`, `hud/script.tsx`) → `rwOwned: false`

验证结果：

| 场景 | hostRoot | readyForHostWrite |
|------|----------|-------------------|
| 未提供 | NOT_SET | ❌ NO |
| 已提供 | D:\test1 | ✅ YES |

**结论**：Host Planning 现在真实可信，可作为 Write 前计划。

结论：
- 当前还不能进入真实 Write Executor

---

## 4. 已完成里程碑

以下阶段已完成并通过复审：
- `T022`
- `T023`
- `T041`
- `T042`
- `T043`
- `T047`
- `T048`
- `T049`
- `T050`
- `T051`
- `T052`
- `T053`
- `T054`
- `T055`
- `T056`
- `T057`
- `T058`
- `T059`
- `T060`
- `T061`
- `T062`

以下阶段已开始，但未通过最终复审：
- `T063`
- `T064`
- `T065`
- `T066`
- `T067`

---

## 5. 当前有效任务

### T067 Host Planning Correctness 修复

目标：
- 把当前 host planning 从“基本可用”修到“真实可作为 Write 前计划”

已完成：

1. ✅ `HOST_CONTEXT_AVAILABLE` 升为硬门槛
   - severity 从 `warning` 改为 `error`
   - 当 host context 未提供时，`readyForHostWrite = false`

2. ✅ 修正 `bridgePlan.hostFile`
   - 输出真实宿主相对路径
   - 不再出现 `server/...`、`ui/...` 等伪路径

3. ✅ 修正 `rwOwned` 判定
   - RW 自有文件 (`rune_weaver/*`) → `rwOwned: true`
   - 宿主入口文件 (`modules/index.ts`, `hud/script.tsx`) → `rwOwned: false`

4. ✅ 重新生成 review artifacts
   - dash_ability (微功能)
   - talent_selection_system (系统型)

验收结果：
- ✅ `npm.cmd run check-types` 通过
- ✅ `hostRoot` 未提供时，`readyForHostWrite = false`
- ✅ `hostRoot` 提供时，`readyForHostWrite = true`
- ✅ `bridgePlan.hostFile` 为正确宿主相对路径
- ✅ `rwOwned` 判定正确
- `rwOwned` 标记正确
- 至少 2 个 review artifact 反映修复结果

当前状态：
- [x] 已完成

---

### K001-K004 Dota2 API 知识提炼 ✅ DONE

目标：
- 从 dota-data 参考资料中提炼 Events、Panorama、Common-Types、Enums 知识

已完成：

| 任务 | 分类 | 输出文件 | 关键内容 |
|------|------|----------|----------|
| K001 | Events | [events/README.md](./knowledge/dota2-host/api/events/README.md) | Trigger/Bridge/System Flow 事件分类 |
| K002 | Panorama | [panorama/README.md](./knowledge/dota2-host/api/panorama/README.md) | Panel Events / CSS / NetTable 映射 |
| K003 | Common Types | [common-types/README.md](./knowledge/dota2-host/api/common-types/README.md) | Primitives / Nominal / Object 类型 |
| K004 | Enums | [enums/README.md](./knowledge/dota2-host/api/enums/README.md) | 游戏机制 / 伤害 / 目标筛选 枚举 |

验收结果：
- ✅ 4 个 README 文件已创建在 `knowledge/dota2-host/api/`
- ✅ 每个文件包含：来源映射、用途分析、Pattern 关联、缺口标注
- ✅ 未直接复制 JSON，而是提炼为可消费的知识摘要

---

### T024 规划 Dota2 Adapter 的下一步真实落地点

目标：
- 在 Host Planning 收口后，明确 Dota2 adapter 下一阶段的真实落地点

当前状态：
- [x] 已拆分为 T024-A/B/C/D

约束：
- 不提前扩 Write Executor
- 不提前扩 hero binding
- 不提前扩 editor / gap fill / 多宿主

---

### T024-A Scanner 状态模型收紧 ✅ DONE

目标：
- Scanner 不再只回答"是不是 x-template"
- 而要回答"这个宿主目前处于什么 Rune Weaver 接入状态"

已完成：
- ✅ 实现了 `checkHostStatus()` 完整状态检查
- ✅ 输出结构包含：`hostType`, `initialized`, `workspaceStatus`, `bridgeStatus`, `issues`
- ✅ 检查了：受支持宿主、初始化状态、workspace、命名空间、server/ui bridge 接线
- ✅ 提供了 `getHostStatusSummary()` 结构化输出

产物：
- `adapters/dota2/scanner/host-status.ts`
- `adapters/dota2/scanner/project-scan.ts` (基础扫描逻辑)
- 更新 `adapters/dota2/scanner/index.ts` 导出

---

#### T024-A-R1 Scanner 依赖清理 ✅ DONE

问题：
- `host-status.ts` 导入 `scanDota2Project` 从 `./index.js`
- `index.ts` 导出 `host-status.ts` 的内容
- 形成循环依赖: `host-status -> index -> host-status`

修复：
- ✅ 新建 `project-scan.ts` 存放基础扫描逻辑
- ✅ `host-status.ts` 直接依赖 `project-scan.js`
- ✅ `index.ts` 作为 barrel 只负责导出

修复后依赖结构：
```
index.ts
├── project-scan.ts (基础扫描)
└── host-status.ts (完整状态检查)
    └── project-scan.ts
```

验收：
- ✅ `npm run check-types` 通过
- ✅ 无循环依赖
- ✅ 对外导出语义不变

---

### T024-B Assembler 最小真实落地范围定义 ✅ DONE

目标：
- 明确 assembler 第一阶段到底负责什么，不负责什么

已完成：
- ✅ 输出文档：`docs/DOTA2-ASSEMBLER-SCOPE.md`
- ✅ 明确第一阶段只负责：server/shared/ui 骨架生成
- ✅ 明确不负责：任意旧文件 merge、自由代码生成、任意宿主文件改写

---

### T024-C UI Adapter 第一批支持面 ✅ DONE

目标：
- 把 UI adapter 的第一批支持范围收紧成可执行集合

已完成：
- ✅ 明确只支持 3 个 Pattern：`ui.selection_modal`, `ui.key_hint`, `ui.resource_bar`
- ✅ 每个 Pattern 的最小输出形态、宿主目录、依赖 bridge 已定义
- ✅ 输出文档：`docs/DOTA2-UI-ADAPTER-SCOPE.md`

---

### T024-D Write Executor Phase 1 边界 ✅ DONE

目标：
- 先把 Phase 1 应做什么固定下来

已完成：
- ✅ 输出文档：`docs/DOTA2-WRITE-EXECUTOR-PHASE1.md`
- ✅ 明确 Phase 1 允许：RW 自有文件写入、索引刷新、`inject_once`
- ✅ 明确 Phase 1 不支持：任意宿主旧文件智能改写、任意 merge、全项目重构

---

## 6. 当前优先级

按以下顺序推进：

1. `T067`
2. `T024`

---

## 7. 当前禁止抢跑事项

当前阶段不应优先做：
- 真实 Write Executor 扩张
- code-level gap fill
- editor
- hero binding
- 大规模新 pattern 扩张
- 多宿主抽象
- LangChain / LangGraph 引入

---

## 8. LLM 联调注意事项

- 当前优先使用 `openai-compatible` provider
- `api.txt` 只用于本地人工测试参考，不进入正式配置流
- `kimi-k2.5` 开启思考模式时只接受 `temperature = 1`
- 若使用 `temperature = 0.6`，必须关闭思考模式
- 已验证可用配置：
  - `model = kimi-k2.5`
  - `thinking = { "type": "disabled" }`
  - `temperature = 0.6`

---

## 9. 任务汇报格式

```md
## Task
- id:
- title:

## 目标

## 实际完成

## 修改范围

## 运行结果
- 执行命令:
- 结果:

## 验收结果
- 结构标准:
- 流程标准:
- 质量标准:

## 固定用例影响
- 用例A:
- 用例B:
- 用例C:

## 风险与后续
```

---

## 10. 文档读取约束

后续 agent 执行时，必须遵守：

1. 读取文档优先使用文件读取工具，不要依赖 PowerShell 默认直出判断文档是否乱码
2. 如果必须在 PowerShell 终端直接查看 UTF-8 文档，先执行：
   `chcp 65001`

说明：
- 当前仓库核心文档已确认是 UTF-8
- 之前出现的乱码主要来自 PowerShell 默认代码页 `936 (GBK)` 与 UTF-8 不匹配

# Completed Tasks Archive

本文件记录已完成并已接受的阶段性任务，避免根目录 [TASKS.md](/D:/Rune%20Weaver/TASKS.md) 持续膨胀。

## 命名规则

- `Txxx`
  - 主线实现、架构收口、宿主集成任务
- `Kxxx`
  - knowledge 提炼与切片任务
- `Uxxx`
  - UI 路线、UI 规范、UI adapter 相关任务
- `Dxxx`
  - 文档与编码清理任务
- `P-SKILL-xx`
  - pattern skill / pipeline 升级任务
- `T024-A/B/C/D`
  - 某个主任务下拆分出来的子任务

## 已完成主线阶段

### T001-T021

早期 CLI、schema、examples、基础验证链路。

### T022-T023

Pattern Core 收口。

完成内容：
- 升级 `PatternMeta`
- 建立 draft -> catalog 准入检查
- 对齐首批试点 pattern

### T041-T043

通用性验证阶段。

完成内容：
- 用 family cases 验证“同骨架，不同皮”
- 证明系统不应退化成领域专用模板

### T047-T051

Wizard -> Blueprint 模型对齐与 CLI 收口。

完成内容：
- 新版 `IntentSchema / Blueprint` 对齐
- Blueprint review artifact
- Blueprint CLI 状态语义修复
- stdout / stderr 机器消费边界说明

### T052-T067

Assembly 与 Host Planning 真实性阶段。

完成内容：
- `Blueprint -> Pattern Resolution -> AssemblyPlan` 跑通
- resolver 收紧到只允许 catalog 内真实 pattern
- 修复 fallback 与弱匹配
- 补齐真实 pattern gap
- 建立 host write mapping / bridge planning / readiness gate
- 修复 `readyForHostWrite`
- 修复 `hostRoot`、`bridgePlan.hostFile`、`rwOwned`
- 收紧 scanner 状态模型
- 清理 scanner 循环依赖风险

### T024-A / T024-B / T024-C / T024-D / T024-A-R1

Dota2 Adapter 下一阶段真实落地点规划。

完成内容：
- `T024-A`
  - scanner 状态模型收紧
- `T024-A-R1`
  - 清理 scanner barrel 循环依赖
- `T024-B`
  - 定义 Dota2 assembler 第一阶段范围
- `T024-C`
  - 定义 UI adapter 第一批支持面
- `T024-D`
  - 定义 Write Executor Phase 1 边界

### T068-T070

`AssemblyPlan -> UI Adapter` 集成。

完成内容：
- 识别 `AssemblyPlan` 中的 UI pattern
- 生成可审查的 UI artifacts
- 生成 UI review artifact
- 建立 UI readiness gate
- 完成 `ui.selection_modal` / `ui.key_hint` / `ui.resource_bar` 的最小集成

### T071-T073

`AssemblyPlan -> Server/Shared Generator` 集成。

完成内容：
- 识别 server/shared 相关 pattern
- 生成可审查的 server/shared 骨架代码产物
- 生成 code review artifact
- 建立 server/shared readiness gate
- 与 UI adapter 形成对称的受控生成链路

## 已完成 UI 任务

### U001-U004

UI Pattern Strategy 收口。

完成内容：
- 编写 [UI-PATTERN-STRATEGY.md](/D:/Rune%20Weaver/docs/UI-PATTERN-STRATEGY.md)
- 明确 `UI Pattern / UIDesignSpec / constrained gap fill` 三层边界
- 明确保留的 UI family：
  - `ui.selection_modal`
  - `ui.key_hint`
  - `ui.resource_bar`
- 明确当前禁止的领域专用 UI pattern
- 明确 UI Wizard 最小问题集合

结论：
- UI 继续从属于 `NL-to-Code` 主线
- UI 主体由 `pattern + spec + host binding` 承接

### U005-U007

Dota2 UI Adapter Template 收口。

完成内容：
- 编写 [DOTA2-UI-TEMPLATE-SCOPE.md](/D:/Rune%20Weaver/docs/DOTA2-UI-TEMPLATE-SCOPE.md)
- 编写 [UIDESIGNSPEC-TO-TEMPLATE-MAPPING.md](/D:/Rune%20Weaver/docs/UIDESIGNSPEC-TO-TEMPLATE-MAPPING.md)
- 编写 [DOTA2-UI-ADAPTER-IMPLEMENTATION-NOTES.md](/D:/Rune%20Weaver/docs/DOTA2-UI-ADAPTER-IMPLEMENTATION-NOTES.md)
- 定义 3 个核心 UI pattern 的 TSX / LESS 模板边界
- 定义 `UIDesignSpec` 的规则化映射

### U008-U011

Dota2 UI Adapter 最小模板实现。

完成内容：
- 创建 `adapters/dota2/ui/templates/**`
- 实现 style/copy mappings
- 实现最小 UI generator
- 实现 `refreshUIIndex()`
- 支持模板与 `UIDesignSpec` 驱动的最小代码生成

## 已完成 Knowledge 任务

### K001-K004

Dota2 API 知识提炼。

完成内容：
- `events`
- `panorama`
- `common-types`
- `enums`

输出位置：
- [knowledge/dota2-host/api/events/README.md](/D:/Rune%20Weaver/knowledge/dota2-host/api/events/README.md)
- [knowledge/dota2-host/api/panorama/README.md](/D:/Rune%20Weaver/knowledge/dota2-host/api/panorama/README.md)
- [knowledge/dota2-host/api/common-types/README.md](/D:/Rune%20Weaver/knowledge/dota2-host/api/common-types/README.md)
- [knowledge/dota2-host/api/enums/README.md](/D:/Rune%20Weaver/knowledge/dota2-host/api/enums/README.md)

### K005-K007

ModDota 文档任务导向切片。

完成内容：
- Panorama 切片
- Scripting TypeScript 切片
- Scripting Systems 切片

输出位置：
- [knowledge/dota2-host/slices/panorama](/D:/Rune%20Weaver/knowledge/dota2-host/slices/panorama)
- [knowledge/dota2-host/slices/scripting-typescript](/D:/Rune%20Weaver/knowledge/dota2-host/slices/scripting-typescript)
- [knowledge/dota2-host/slices/scripting-systems](/D:/Rune%20Weaver/knowledge/dota2-host/slices/scripting-systems)

## 已完成文档与治理任务

### D001

核心文档编码问题调查与清理结论。

结论：
- 核心文档本身是 UTF-8
- 终端乱码主要来自 PowerShell 默认代码页 `936 (GBK)` 与 UTF-8 不匹配

执行约束：
1. 读文档优先使用文件读取工具
2. 如需在 PowerShell 中直接查看 UTF-8 文档，先执行 `chcp 65001`

### P-SKILL-01~05

`pattern-author` skill 三阶段升级与兼容性修复。

完成内容：
- 固定三阶段输出：
  - `PatternCandidate`
  - `PatternDraft`
  - `AdmissionChecklist`
- 更新 `pattern-draft-checklist`
- 保持单 skill，不提前拆成 extractor / author / reviewer
- 修复 skill 编码与兼容性问题，恢复到当前项目基线

### P-GAP-01~03

Gap-driven pattern extraction review 阶段性收口。

完成内容：
- 重新确认：
  - `effect.modifier_applier` 是有效 pattern，但已是既成事实
  - `rule.player_selection` 不应新增 pattern，应继续通过 mapping 解决
- 证明 `archive/PATTERN-GAPS.md` 不再适合作为后续新增 pattern 的主要驱动

结论：
- 后续如需新增 pattern，应由以下来源驱动：
  - 新的 assembly / host write / UI adapter 真实缺口
  - 新的 generalization family case
  - 明确的 candidate / reference-fragment review

## 仓库状态里程碑

### Repository Backup

已完成：
- 编写根 [README.md](/D:/Rune%20Weaver/README.md)
- 增加 `.gitignore`
- 初始化本地 git 仓库
- 首次提交：
  - `1c4b2fe Initial backup`
- 推送到 GitHub：
  - `https://github.com/Kan133/Rune-Weaver.git`

## 当前已站稳的能力

- `Wizard -> IntentSchema`
- `IntentSchema -> Blueprint`
- `Blueprint -> Pattern Resolution`
- `Pattern Resolution -> AssemblyPlan`
- Dota2 host planning
- 最小真实 pattern catalog
- Dota2 API knowledge baseline
- `AssemblyPlan -> UI Adapter`
- `AssemblyPlan -> Server/Shared Generator`

## 备注

- 本归档只记录已完成并已接受的阶段
- 当前进行中的任务应保留在 [TASKS.md](/D:/Rune%20Weaver/TASKS.md)

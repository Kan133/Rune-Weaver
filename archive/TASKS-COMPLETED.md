# Completed Tasks Archive

本文档用于保存已完成任务的阶段性历史，避免根目录 [TASKS.md](/D:/Rune%20Weaver/TASKS.md) 过长。

## 任务命名规则

- `Txxx`
  - 主线实现与架构任务
  - 例如 Wizard、Blueprint、Pattern、Assembly、Dota2 Adapter、Host Planning
- `Kxxx`
  - Knowledge 任务
  - 例如 `dota-data` 提炼、ModDota 文档切片、知识目录整理
- `Uxxx`
  - UI 路线与 UI 规范任务
  - 例如 UI pattern strategy、UI Wizard 边界、UIDesignSpec 收敛
- `Dxxx`
  - 文档与编码清理任务
  - 例如核心文档编码确认、入口文档清理

## 已完成阶段

### T001-T021

早期 CLI / schema / 主链路静态骨架阶段。

大意：

- 建立最小代码骨架
- 修复 CLI 运行链路
- 建立最小 examples / verify 流程

### T022-T023

Pattern Core 收口。

完成内容：

- 升级 `PatternMeta`
- 建立 draft -> catalog 准入检查
- 对齐首批试点 pattern

### T041-T043

通用性验证阶段。

完成内容：

- 用 family cases 验证同骨架不同皮是否成立
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

完成内容大意：

- `Blueprint -> Pattern Resolution -> AssemblyPlan` 跑通
- 收紧 resolver，只允许 catalog 中真实存在的 pattern
- 修复弱匹配和 fallback
- 补齐真实 pattern gap
- 建立 host write mapping、bridge planning、host readiness gate
- 修复 `readyForHostWrite`
- 修复 `hostRoot`、`bridgePlan.hostFile`、`rwOwned`
- 收紧 `scanner` 状态模型
- 清理 `scanner` 的循环依赖风险

### T024-A / T024-B / T024-C / T024-D

Dota2 Adapter 下一阶段真实落地点规划。

完成内容：

- `T024-A`
  - scanner 状态模型收紧
  - 后续补了 `T024-A-R1` 清理循环依赖
- `T024-B`
  - 定义 Dota2 assembler 第一阶段范围
- `T024-C`
  - 定义 UI adapter 第一批支持面
- `T024-D`
  - 定义 Write Executor Phase 1 边界

## 已完成知识任务

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

## 已完成文档任务

### D001

核心文档编码问题调查与清理结论。

结论：

- 核心文档本身是 UTF-8
- 终端乱码主要来自 PowerShell 默认代码页 `936 (GBK)` 与 UTF-8 不匹配

执行约束：

1. 读取文档优先使用文件读取工具
2. 如果必须在 PowerShell 中直接查看 UTF-8 文档，先执行 `chcp 65001`

## 已完成 UI 任务

### U001-U004

UI Pattern Strategy 收口阶段。

完成内容：

- 编写 [UI-PATTERN-STRATEGY.md](/D:/Rune%20Weaver/docs/UI-PATTERN-STRATEGY.md)
- 明确 UI Pattern 的定义
- 明确 `UI Pattern / UIDesignSpec / constrained gap fill` 三层边界
- 明确当前保留的 UI pattern family：
  - `ui.selection_modal`
  - `ui.key_hint`
  - `ui.resource_bar`
- 明确当前不应新增的领域专用 UI pattern
- 明确 UI Wizard 的最小问题集合
- 给出 UI 分层判断表

结论：

- UI 继续从属于 `NL-to-Code` 主线
- UI 主体应由 `pattern + spec + host binding` 承接
- UI 的尾部个性化才允许进入 constrained gap fill

### U005-U007

Dota2 UI Adapter Template 收口阶段。

完成内容：

- 编写 [DOTA2-UI-TEMPLATE-SCOPE.md](/D:/Rune%20Weaver/docs/DOTA2-UI-TEMPLATE-SCOPE.md)
- 编写 [UIDESIGNSPEC-TO-TEMPLATE-MAPPING.md](/D:/Rune%20Weaver/docs/UIDESIGNSPEC-TO-TEMPLATE-MAPPING.md)
- 编写 [DOTA2-UI-ADAPTER-IMPLEMENTATION-NOTES.md](/D:/Rune%20Weaver/docs/DOTA2-UI-ADAPTER-IMPLEMENTATION-NOTES.md)
- 明确 3 个核心 UI pattern 的 TSX / LESS 模板边界
- 明确 `UIDesignSpec` 到模板的规则化映射
- 明确下一轮 UI adapter 实现应先做什么、后做什么、不做什么

结论：

- 当前更适合先做 UI adapter 模板代码
- 暂不优先做真实 UI Wizard
- 继续坚持 UI 从属于 `NL-to-Code` 主线

### P-GAP-01~03

Gap-driven pattern extraction review 阶段性收口。

完成内容：

- 使用三阶段 `pattern-author` 流程复核 `PATTERN-GAPS.md`
- 重新确认：
  - `effect.modifier_applier` 是有效 pattern，但已是既成事实
  - `rule.player_selection` 不应新增 pattern，应继续由 mapping 解决
- 证明当前 `PATTERN-GAPS.md` 已基本收口

结论：

- 后续不再建议继续按 `PATTERN-GAPS.md` 做新一轮 pattern 提取
- 之后若要新增 pattern，应改由以下来源驱动：
  - 新的 assembly / host write / UI adapter 真实缺口
  - 新的 generalization family case
  - 明确的 candidate / reference-fragment review

## 当前可以认为已站稳的能力

- `Wizard -> IntentSchema`
- `IntentSchema -> Blueprint`
- `Blueprint -> Pattern Resolution`
- `Pattern Resolution -> AssemblyPlan`
- Dota2 host planning
- 最小真实 pattern catalog
- Dota2 API 知识基线

## 备注

- 当前进行中的任务不应写入本归档
- 归档只保存已经完成并被接受的阶段

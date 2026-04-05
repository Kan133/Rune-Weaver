# Temp Progress

## 当前阶段

Rune Weaver 当前主轴已统一为：

`NL -> IntentSchema -> Blueprint -> Pattern Resolution -> AssemblyPlan -> Dota2 Adapter -> Host Write / Run`

首个真实宿主：

- `D:\test1`
- 类型：`dota2-x-template`

## 已站稳的部分

- `Wizard -> IntentSchema`
- `IntentSchema -> Blueprint`
- `Blueprint -> Pattern Resolution`
- `Pattern Resolution -> AssemblyPlan`
- Host planning / bridge planning / host readiness gate
- 最小真实 pattern catalog
- Dota2 API knowledge baseline
- ModDota 任务导向切片
- UI pattern strategy / UI spec strategy

## 当前固定边界

- 产品主目标：`NL-to-Code`
- UI 是 code output 的一个重要子集，不是独立主线
- Rune Weaver 只拥有：
  - `game/scripts/src/rune_weaver/**`
  - `content/panorama/src/rune_weaver/**`
  - 少量受控桥接点
- `script.tsx` 是 `UI entry root`，不是全部 UI 的唯一位置

## 当前真实 catalog

- `input.key_binding`
- `data.weighted_pool`
- `rule.selection_flow`
- `effect.dash`
- `effect.modifier_applier`
- `effect.resource_consume`
- `resource.basic_pool`
- `ui.selection_modal`
- `ui.key_hint`
- `ui.resource_bar`

## 当前正在进行中的任务

### U008-U011

目标：

- 创建 `adapters/dota2/ui/templates/**`
- 实现最小 style/copy mappings
- 实现最小 UI generator
- 实现 `refreshUIIndex()`

当前约束：

- 不写宿主文件
- 不扩真实 UI Wizard
- 不新增 UI pattern
- 不扩 Write Executor

## 之后最可能的下一步

二选一：

1. 先把 UI adapter 接进 `AssemblyPlan`
2. 再推进 `Write Executor Phase 1`

当前更倾向：

- 先把 UI adapter 接进 `AssemblyPlan`

## 文档读取约束

- 优先使用文件读取工具
- PowerShell 直接查看 UTF-8 文档前先执行 `chcp 65001`

# Dota2 Host API Knowledge

本目录存放从 `dota-data` 提炼出的 Dota2 宿主 API 知识入口。

上游原始仓库：

`references/dota2/dota-data/`

当前已接入的关键原始文件：

- `files/vscripts/api.json`
- `files/vscripts/api-types.json`
- `files/vscripts/enums.json`
- `files/events.json`
- `files/engine-enums.json`
- `files/panorama/events.json`
- `files/panorama/enums.json`
- `files/panorama/css.json`

## 当前分类

- [abilities](./abilities/README.md) - 技能数据（待完善）
- [modifiers](./modifiers/README.md) - 修改器数据（待完善）
- [events](./events/README.md) - ✅ 已提炼（K001）
- [units](./units/README.md) - 单位数据（待完善）
- [items](./items/README.md) - 物品数据（待完善）
- [enums](./enums/README.md) - ✅ 已提炼（K004）
- [panorama](./panorama/README.md) - ✅ 已提炼（K002）
- [common-types](./common-types/README.md) - ✅ 已提炼（K003）

## 当前判断

对于 Rune Weaver 当前阶段，最有价值的是：

- ✅ `events` - 已提炼，支撑 Trigger Pattern 和 Bridge Planning
- ✅ `panorama` - 已提炼，支撑 UI Pattern 实现
- ✅ `common-types` - 已提炼，支撑 Adapter Typing
- ✅ `enums` - 已提炼，支撑参数约束和校验

原因：

- 当前重点是 `AssemblyPlan -> Host Mapping -> Host Write`
- 这几类最直接支撑：
  - Dota2 host binding
  - server / ui bridge planning
  - adapter typing
  - event / trigger 接线

## K001-K004 完成状态

| 任务 | 分类 | 状态 | 关键内容 |
|------|------|------|----------|
| K001 | events | ✅ 完成 | Trigger/Bridge/System Flow 事件分类 |
| K002 | panorama | ✅ 完成 | Panel Events / CSS / NetTable 映射 |
| K003 | common-types | ✅ 完成 | Primitives / Nominal / Object 类型 |
| K004 | enums | ✅ 完成 | 游戏机制 / 伤害 / 目标筛选 枚举 |

## K005-K007 切片完成状态

| 任务 | 分类 | 状态 | 关键内容 |
|------|------|------|----------|
| K005 | panorama slices | ✅ 完成 | Panorama 任务导向知识切片 |
| K006 | typescript slices | ✅ 完成 | Scripting TypeScript 知识切片 |
| K007 | systems slices | ✅ 完成 | Scripting Systems 知识切片 |

### K005 Panorama 切片清单

- `knowledge/dota2-host/slices/panorama/hud-entry-and-root.md`
- `knowledge/dota2-host/slices/panorama/panel-events-and-interaction.md`
- `knowledge/dota2-host/slices/panorama/custom-nettables-and-dataflow.md`
- `knowledge/dota2-host/slices/panorama/styles-and-css-patterns.md`
- `knowledge/dota2-host/slices/panorama/selection-modal-and-button-patterns.md`
- `knowledge/dota2-host/slices/panorama/react-panorama-notes.md`

### K006 Scripting TypeScript 切片清单

- `knowledge/dota2-host/slices/scripting-typescript/entry-and-project-structure.md`
- `knowledge/dota2-host/slices/scripting-typescript/abilities-and-casting.md`
- `knowledge/dota2-host/slices/scripting-typescript/modifiers-and-effects.md`
- `knowledge/dota2-host/slices/scripting-typescript/entities-and-units.md`
- `knowledge/dota2-host/slices/scripting-typescript/timers-events-and-utilities.md`

### K007 Scripting Systems 切片清单

- `knowledge/dota2-host/slices/scripting-systems/game-events-and-flow.md`
- `knowledge/dota2-host/slices/scripting-systems/custom-events-and-networking.md`
- `knowledge/dota2-host/slices/scripting-systems/state-sync-and-tables.md`
- `knowledge/dota2-host/slices/scripting-systems/system-composition-notes.md`

## 使用规则

使用本目录时：

- 先看本目录的主题入口
- 再跳到对应的上游原始文件
- 不要直接把 `references/dota2/dota-data` 当作最终知识层

当你需要原始数据时，回到 `references/`。

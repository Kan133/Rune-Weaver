# Rune Weaver Pattern Backlog

## 1. 文档目的

本文档用于连接三件事：

1. 当前 Dota2 宿主知识层
2. 当前 MVP 用例
3. 首批应优先建设的 Pattern

它不是最终 Pattern 定义文档，而是当前阶段的候选清单与优先级清单。

---

## 2. 当前使用方式

后续 agent 在开始实现或提取 Pattern 前，应先看这份文档。

它用于回答：

- 先做哪些 Pattern
- 每个 Pattern 服务哪个 MVP 用例
- 每个 Pattern 应主要参考哪些知识材料
- 哪些 Pattern 现在先不要做

---

## 3. 当前 MVP 用例映射

当前固定用例：

### 用例 A：微功能

例如：

- 按键触发的小型位移或效果技能

### 用例 B：独立系统

例如：

- 三选一天赋抽取系统

### 用例 C：跨系统组合

例如：

- 输入 + 资源 + 效果 + UI 联动功能

首批 Pattern 的价值，应优先看它是否能支撑这三个用例之一。

---

## 4. 优先级定义

### P0

当前必须优先建设。

标准：

- 直接支撑主链路
- 直接支撑至少一个固定用例
- 能显著推动 Dota2 MVP 落地

### P1

当前可以准备，但不是最早一轮必须完成。

标准：

- 能增强系统表达力
- 但不是主链路阻塞项

### P2

当前仅记录，不建议优先投入。

标准：

- 有价值
- 但在当前 MVP 阶段不是关键路径

---

## 5. P0 Pattern 候选

## P0-01 `input.key_binding`

类别：

- `input_binding`

用途：

- 将用户按键输入转换为系统事件

服务用例：

- A
- B
- C

主要知识来源：

- [ui-panorama/keybindings](./knowledge/dota2-host/ui-panorama/keybindings.md)
- [events-and-timers/events-and-timers-in-typescript](./knowledge/dota2-host/events-and-timers/events-and-timers-in-typescript.md)
- [foundations/panorama-typescript-introduction](./knowledge/dota2-host/foundations/panorama-typescript-introduction.md)

应优先支持的参数：

- `key`
- `triggerMode`
- `eventName`

当前目标：

- 先做最小按键触发，不做复杂组合键

---

## P0-02 `effect.dash`

类别：

- `effect`

用途：

- 提供基础位移效果

服务用例：

- A
- C

主要知识来源：

- [abilities/abilities-in-typescript](./knowledge/dota2-host/abilities/abilities-in-typescript.md)
- [systems/basic-vector-math](./knowledge/dota2-host/systems/basic-vector-math.md)
- [abilities/calling-spells-with-setcursor](./knowledge/dota2-host/abilities/calling-spells-with-setcursor.md)

应优先支持的参数：

- `directionMode`
- `distance`
- `speed`

当前目标：

- 先支持基础朝向/鼠标方向位移

---

## P0-03 `effect.resource_consume`

类别：

- `effect`

用途：

- 在功能触发时消耗资源

服务用例：

- C

主要知识来源：

- [systems/custom-mana-system](./knowledge/dota2-host/systems/custom-mana-system.md)
- [events-and-timers/events-and-timers-in-typescript](./knowledge/dota2-host/events-and-timers/events-and-timers-in-typescript.md)

应优先支持的参数：

- `resourceId`
- `cost`
- `failBehavior`

当前目标：

- 先支持简单固定消耗

---

## P0-04 `resource.basic_pool`

类别：

- `resource_system`

用途：

- 提供基础资源存储、变更和同步骨架

服务用例：

- C

主要知识来源：

- [systems/custom-mana-system](./knowledge/dota2-host/systems/custom-mana-system.md)
- [events-and-timers/events-and-timers-in-typescript](./knowledge/dota2-host/events-and-timers/events-and-timers-in-typescript.md)

应优先支持的参数：

- `resourceId`
- `maxValue`
- `regen`
- `visible`

当前目标：

- 先支持最小资源系统，不抢先支持复杂多资源变体

---

## P0-05 `data.weighted_pool`

类别：

- `data_pool`

用途：

- 提供带权重的数据抽取能力

服务用例：

- B

主要知识来源：

- [systems/item-drop-system](./knowledge/dota2-host/systems/item-drop-system.md)
- [systems/rpg-like-looting-chest](./knowledge/dota2-host/systems/rpg-like-looting-chest.md)

应优先支持的参数：

- `entries`
- `weights`
- `tiers`
- `choiceCount`

当前目标：

- 先服务天赋抽取 / 卡池类需求

---

## P0-06 `rule.selection_flow`

类别：

- `selection_flow`

用途：

- 将“抽取候选 -> 展示 -> 用户选择 -> 应用结果”串成一个最小规则流程

服务用例：

- B

主要知识来源：

- [systems/item-drop-system](./knowledge/dota2-host/systems/item-drop-system.md)
- [systems/rpg-like-looting-chest](./knowledge/dota2-host/systems/rpg-like-looting-chest.md)
- [events-and-timers/events-and-timers-in-typescript](./knowledge/dota2-host/events-and-timers/events-and-timers-in-typescript.md)

应优先支持的参数：

- `choiceCount`
- `selectionPolicy`
- `applyMode`

当前目标：

- 先支持单轮三选一

---

## P0-07 `ui.selection_modal`

类别：

- `ui_surface`

用途：

- 展示选择候选项并接收用户选择

服务用例：

- B
- C

主要知识来源：

- [ui-panorama/react-in-panorama](./knowledge/dota2-host/ui-panorama/react-in-panorama.md)
- [ui-panorama/button-examples](./knowledge/dota2-host/ui-panorama/button-examples.md)
- [ui-panorama/inclusive-panorama-ui](./knowledge/dota2-host/ui-panorama/inclusive-panorama-ui.md)

应优先支持的参数：

- `choiceCount`
- `layoutPreset`
- `stylePreset`

当前目标：

- 先做最小可交互 modal，不抢先追求复杂视觉效果

---

## P0-08 `ui.key_hint`

类别：

- `ui_surface`

用途：

- 展示按键提示

服务用例：

- B
- C

主要知识来源：

- [ui-panorama/keybindings](./knowledge/dota2-host/ui-panorama/keybindings.md)
- [ui-panorama/react-in-panorama](./knowledge/dota2-host/ui-panorama/react-in-panorama.md)

应优先支持的参数：

- `key`
- `text`
- `positionHint`

当前目标：

- 先做静态提示，不抢先做复杂状态切换

---

## P0-09 `ui.resource_bar`

类别：

- `ui_surface`

用途：

- 展示资源系统状态

服务用例：

- C

主要知识来源：

- [ui-panorama/react-in-panorama](./knowledge/dota2-host/ui-panorama/react-in-panorama.md)
- [ui-panorama/inclusive-panorama-ui](./knowledge/dota2-host/ui-panorama/inclusive-panorama-ui.md)
- [systems/custom-mana-system](./knowledge/dota2-host/systems/custom-mana-system.md)

应优先支持的参数：

- `resourceId`
- `displayName`
- `stylePreset`

当前目标：

- 先支持单资源条

---

## 6. P1 Pattern 候选

## P1-01 `rule.upgrade_flow`

用途：

- 支持升级、进阶、保底等规则

服务用例：

- B

主要知识来源：

- [systems/item-drop-system](./knowledge/dota2-host/systems/item-drop-system.md)
- [systems/rpg-like-looting-chest](./knowledge/dota2-host/systems/rpg-like-looting-chest.md)

当前状态：

- 可以先留在规划层，不作为首轮阻塞项

---

## P1-02 `effect.projectile_basic`

用途：

- 提供基础投射物效果

服务用例：

- A
- C

主要知识来源：

- [abilities/abilities-in-typescript](./knowledge/dota2-host/abilities/abilities-in-typescript.md)

当前状态：

- 价值高，但不是当前最小闭环的第一优先

---

## P1-03 `systems.item_restriction`

用途：

- 提供装备/物品限制与要求

服务用例：

- 潜在未来系统用例

主要知识来源：

- [systems/item-restrictions-requirements](./knowledge/dota2-host/systems/item-restrictions-requirements.md)

---

## P1-04 `systems.shop_spawning`

用途：

- 提供脚本化商店生成

主要知识来源：

- [systems/scripted-shop-spawning](./knowledge/dota2-host/systems/scripted-shop-spawning.md)

---

## P1-05 `units.simple_ai`

用途：

- 提供最小单位 AI 骨架

主要知识来源：

- [units/very-simple-unit-ai](./knowledge/dota2-host/units/very-simple-unit-ai.md)
- [units/simple-ai-for-neutrals](./knowledge/dota2-host/units/simple-ai-for-neutrals.md)

---

## 7. P2 Pattern 候选

## P2-01 `ui.scene_panel`

主要知识来源：

- [ui-panorama/dotascenepanel](./knowledge/dota2-host/ui-panorama/dotascenepanel.md)

说明：

- 有价值，但不属于当前 MVP 主线

---

## P2-02 `systems.particle_attachment`

主要知识来源：

- [systems/particle-attachment](./knowledge/dota2-host/systems/particle-attachment.md)

说明：

- 对表现层有帮助，但当前不是主阻塞项

---

## P2-03 `units.attachwearable`

主要知识来源：

- [units/attachwearable-from-keyvalues](./knowledge/dota2-host/units/attachwearable-from-keyvalues.md)

说明：

- 更偏宿主专项能力，不适合当前第一轮优先实现

---

## 8. 当前不建议优先提取的东西

当前不建议优先投入为正式 Pattern：

- 强项目专属剧情逻辑
- 复杂但低复用的视觉特效
- 需要大量宿主 hack 才能成立的临时技巧
- 大一统“完整系统巨型 Pattern”

更好的做法是：

- 先拆职责
- 再做细粒度 Pattern

---

## 9. 推荐实现顺序

建议按以下顺序让 agent 逐步实现：

1. `input.key_binding`
2. `effect.dash`
3. `resource.basic_pool`
4. `effect.resource_consume`
5. `data.weighted_pool`
6. `rule.selection_flow`
7. `ui.selection_modal`
8. `ui.key_hint`
9. `ui.resource_bar`

这样可以较平滑地覆盖：

- 用例 A
- 用例 B
- 用例 C

---

## 10. 推荐提取顺序

如果是做资料提取或 Pattern 撰写，不一定和实现顺序完全一致。

推荐提取顺序：

1. `input.key_binding`
2. `data.weighted_pool`
3. `ui.selection_modal`
4. `resource.basic_pool`
5. `rule.selection_flow`
6. `effect.dash`
7. `ui.key_hint`
8. `ui.resource_bar`

理由：

- 这些最能支撑系统级 MVP
- 也是最容易从现有知识中抽出职责与边界的

---

## 11. 当前建议

当前最值得做的事情不是继续扩大量候选，而是：

1. 从 P0 中选出前 3 个最关键 Pattern
2. 先做出高质量 Pattern 草案
3. 用它们反过来校正 `PATTERN-SPEC.md` 和 `PATTERN-AUTHORING-GUIDE.md`

建议第一批试点 Pattern：

1. `input.key_binding`
2. `data.weighted_pool`
3. `ui.selection_modal`

如果这三个能稳定提取、稳定撰写、稳定被消费，后续的 Pattern 体系就会稳很多。

---

## 12. 当前结论

当前这份 backlog 的作用是：

- 帮助 agent 知道“先做什么”
- 帮助你知道“先收什么资料”
- 帮助后续的 Pattern skill 知道“优先围绕哪些目标工作”

它不是永久不变的清单，但在当前 MVP 阶段，应作为首批 Pattern 工作的基准。

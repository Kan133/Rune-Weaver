# Unit KV、Creature Block、AI 与 Wearables

## 1. 用途

把 ModDota units reference 中对 Rune Weaver 最有价值的宿主知识汇总成一份文档，重点回答：

- 自定义单位应该用什么 base class
- 单位的 stats / movement / team / inventory 有哪些关键 KV
- `Creature` block 能做什么
- AI 应该用简易 thinker、modifier 状态机，还是 `vscripts`
- wearables 如何从 keyvalues / item definitions 生成

## 2. 上游来源

- `references/dota2/docs/moddota_units.md`
- 章节:
  - `Unit KeyValues`
  - `Adding a Very Simple AI to Units`
  - `Writing a simple AI for neutrals`
  - `Create Creature AttachWearable blocks directly from the keyvalues`
- 关键页面:
  - https://moddota.com/units/unit-keyvalues
  - https://moddota.com/units/simple-unit-ai
  - https://moddota.com/units/simple-neutral-ai
  - https://moddota.com/units/create-creature-attachwearables-from-keyvalues

## 3. 核心要点

### 3.1 BaseClass 选择会直接限制单位语义

上游对几个常见 base class 的判断很明确：

- `npc_dota_creature`: 最通用，适合大多数自定义单位，也支持 `Creature` block
- `npc_dota_building`: 有建筑特性，但伴随不可忽视的宿主硬编码行为
- `npc_dota_thinker`: 适合 dummy / thinker 单位

这说明 Rune Weaver 不能只根据“它看起来像建筑”就选 building。

需要先判断：

- 是否真的需要建筑目标类型
- 是否能接受 building 的硬编码副作用
- 是否只是想要一个逻辑载体，那 thinker 可能更合适

### 3.2 Unit KV 里最常被检索到的是“宿主能力面”，不是单个数字

上游把单位定义拆成多组字段，其中对检索最关键的是：

- inventory / selection 相关
- attack / armor / combat class
- movement capability / move speed / turn rate
- health / mana / regen
- vision
- team / relationship class

几个值得保留的 caveat：

- `HasInventory` 最好在 KV 里先声明；运行时再补并不总可靠
- `StatusMana` 为 `0` 会让单位没有 mana bar
- unit 的 max mana 不是一个可以随时靠 Lua 自由重塑的简单字段
- 视野存在宿主上限，超过上限的值不会继续生效

### 3.3 `Creature` block 是“单位附加能力包”

上游把 `Creature` block 拆成三类特别有价值的能力：

- level scaling: `HPGain`、`DamageGain`、`ArmorGain`、`XPGain` 等
- pathing / respawn: `DisableClumpingBehavior`、`CanRespawn`
- equipped items / wearables / creature AI

因此当需求是“同一类单位按等级成长、带初始物品、带基础行为”，`Creature` block 往往比零散 Lua 补丁更宿主原生。

### 3.4 AI 至少有三条路线，复杂度不同

上游实际给出了三种不同层级的 AI 方案：

1. `vscripts`：单位出生时载入脚本，适合独立 AI 入口
2. 简易 thinker-list：定时扫描单位并下指令，适合低复杂度 wander / cast
3. modifier 状态机：把 AI 当成单位上的 modifier，按 state 驱动，适合更稳定的行为流

其中最稳的一条经验是：

- 如果单位行为需要明确 state transition，modifier 状态机比“随手存几个字段 + 定时下指令”更可维护

而如果只是做随机游走或定时施法：

- thinker-list 已足够，不必一上来就建完整 AI 框架

### 3.5 中立单位行为是默认值，不是必然值

上游特别提醒：

- neutral team 上的 creep 默认会变成 neutral behavior
- 若要自定义行为，需关闭 `UseNeutralCreepBehavior`

这对 Rune Weaver 非常关键，因为很多“为什么脚本写了却不按预期动”的问题，根源就是宿主默认 neutral AI 抢了控制权。

### 3.6 Wearables 不是手工复制 ItemDef 的纯体力活

上游给出的 wearables 生成思路是：

- 从 `items_game.txt` 建 `name -> item id` 映射
- 再按 hero 默认套装或 bundle 生成 `AttachWearables` block

这说明 wearables 在宿主里是有结构化来源的，而不是只能靠人工 `Ctrl+F` 复制。

对 Rune Weaver 来说，这个知识很有价值：

- 若未来需要生成 creature 外观块，优先考虑结构化索引或映射
- 不要把 `ItemDef` 当成完全不可推导的魔法数字

## 4. 对 Rune Weaver 的直接价值

| 场景 | 价值 |
|------|------|
| 单位生成 | 明确 base class、movement、health、inventory、team 等宿主字段 |
| Summon / neutral logic | 判断是否要关闭 neutral behavior、是否走 `Creature` block |
| AI synthesis | 在 thinker-list、modifier 状态机、`vscripts` 入口之间做更诚实的选择 |
| 外观生成 | 为 wearable 生成和 creature 外观索引留下结构化空间 |

## 5. 当前最相关的 Pattern / Module

- `effect.summon_unit`
- `effect.create_dummy`
- `effect.modifier_applier`
- 任意需要单位行为树、巡逻、追击、返回出生点的 feature

## 6. 后续注意事项

- `npc_dota_building` 的副作用要比名字看上去更重，不要轻率选用
- 若 AI 需求已经出现显式状态转换，优先升级到状态机，不要无限堆 thinker if/else
- wearable 生成更适合依赖结构化索引产物，而不是把大量 ItemDef 常量塞进人读知识正文

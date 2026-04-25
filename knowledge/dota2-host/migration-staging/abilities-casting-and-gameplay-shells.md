# Abilities、Casting 与 Gameplay Shell 约束

## 1. 什么时候用

当需求涉及下面这些问题时，优先看这份文档：

- 技能该落成什么 cast shape
- ability shell 至少要有哪些 KV 与脚本入口
- 什么时候应该用 `AbilityValues`、modifier、projectile、filters 或 UI
- 如何避免“看起来能施法，但宿主语义不诚实”的能力壳

## 2. 来源与迁移状态

- 来源文件:
  - `references/dota2/docs/moddota_abilities.md`
  - `references/dota2/docs/moddota_scripting_typescript.md`
- 来源章节:
  - `Ability KeyValues`
  - `Passing AbilityValues values into Lua`
  - `AbilityDuration tooltips`
  - `Abilities in Typescript`
- 合并整理: 是
- future canonical candidate: 是
- 必须继续保留的原文:
  - `references/dota2/docs/moddota_abilities.md`
  - `references/dota2/docs/moddota_scripting_typescript.md`
  - `references/dota2/dota-data/files/**` 下的 raw API / enum / type 产物

## 3. 推荐的 ability shell 心智

### 3.1 先定“施法形态”，再定效果实现

一个 gameplay ability 至少要先回答：

- `UNIT_TARGET`、`POINT`、`NO_TARGET`、`TOGGLE`、`CHANNELLED` 里是哪种
- 它的目标约束是 team / type / flags 的哪种组合
- 它是瞬时触发、持续状态、还是投射物链路

如果这三件事没定清，后面写多少实现都容易漂。

### 3.2 推荐的最小壳

一个最小但诚实的 ability shell，通常应同时具备：

- ability KV 定义
- 明确的 `AbilityBehavior`
- 必要的 targeting keys
- `AbilityValues` 中的命名数值
- 脚本入口
- `OnSpellStart()` 或与施法形态对应的主入口

不要把这些信息拆得过散，否则 retrieval 很难给 synthesis 稳定 grounding。

### 3.3 数值入口优先走 `AbilityValues`

对 Rune Weaver 来说，最推荐的数值落点仍然是命名清晰的 `AbilityValues`：

- `damage`
- `duration`
- `projectile_speed`
- `radius`
- `dash_distance`

优点是：

- 文案、脚本、UI 可共用同一套命名
- `GetSpecialValueFor()` 的读取路径稳定
- 比写死在代码里更适合后续 pattern 化

## 4. 常见 gameplay shell 选择

### 4.1 主动技能

最常见的壳是：

- `OnSpellStart()`
- 读取 cursor target / cursor position
- 读取 `AbilityValues`
- 应用 damage / modifier / projectile / movement

适合：

- 单次触发伤害
- 单次位移
- 单次施加状态

### 4.2 Projectile shell

如果 feature 的关键是“飞出去，再命中”，不要硬塞进纯即时技能。

优先考虑：

- 创建 tracking / linear projectile
- 用 `OnProjectileHit()` 或等价命中回调处理后续逻辑

适合：

- 飞行物
- 延迟命中
- 带视野或躲避语义的技能

### 4.3 Modifier shell

如果 feature 的关键是“持续状态”，优先考虑 modifier，而不是在 ability 里堆计时逻辑。

适合：

- 持续 buff / debuff
- 周期性效果
- aura / 叠层 / 被动状态

### 4.4 UI-linked shell

如果技能必须驱动 UI：

- ability 本体仍然应该只负责宿主能力语义
- UI 变化优先通过 custom event / nettables 做桥接
- 不要把 UI 需求直接混进 ability 的核心宿主真相里

## 5. 常见坑

### 5.1 `AbilityDuration` 不是可靠的玩家文本契约

如果需要稳定 tooltip / description：

- 用自己的 `duration` special value
- 不要把 `AbilityDuration` 当成唯一真相

### 5.2 不要让壳和语义冲突

例如：

- 需要 point cast，却写成 `UNIT_TARGET`
- 需要 persistent state，却全塞进 `OnSpellStart()`
- 需要 projectile，却只做瞬时 ApplyDamage

这种壳和语义不一致，会让后续 repair 很痛苦。

### 5.3 别把 gameplay shell 和 host realization surface 混掉

一个 ability 壳不自动等于：

- 要有 UI
- 要有 inventory
- 要有 persistence
- 要有 custom events

这些都应由需求单独决定。

## 6. 推荐做法

- 先确定 cast shape、targeting、effect carrier 三件事
- 数值统一走命名 special values
- 持续状态交给 modifier
- 飞行链路交给 projectile
- UI 联动交给 event / nettables 桥接
- 让 ability shell 只承诺它真的需要承诺的宿主面

## 7. 对 Rune Weaver 的直接价值

- 帮主 session 判断 ability synthesis 的最小诚实壳
- 帮 retrieval 把“技能需求”拆成 cast / targeting / carrier 三层
- 减少把 UI、state sync、inventory 意外注入 ability feature 的风险

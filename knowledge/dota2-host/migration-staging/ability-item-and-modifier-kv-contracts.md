# Ability / Item / Modifier KV 契约

## 1. 用途

把 ModDota abilities 文档里最影响宿主能力判断、参数 grounding、modifier 行为建模和 item 生命周期的部分整理成一份可直接服务于 Rune Weaver 检索与综合的 Tier 1 知识。

## 2. 上游来源

- `references/dota2/docs/moddota_abilities.md`
- 章节:
  - `Ability KeyValues`
  - `Item KeyValues`
  - `Passing AbilityValues values into Lua`
  - `AbilityDuration tooltips`
- 关键页面:
  - https://moddota.com/abilities/ability-keyvalues
  - https://moddota.com/abilities/item-keyvalues
  - https://moddota.com/abilities/passing-abilityvalues-to-lua
  - https://moddota.com/abilities/abilityduration-tooltips

## 3. 核心要点

### 3.1 `AbilityBehavior` 与 Targeting 共同定义“施法契约”

上游把 ability 的第一层契约分成两块：

- `AbilityBehavior`: 这是什么施法形态
- `AbilityUnitTargetTeam` / `Type` / `Flags`: 这个形态允许命中什么目标

最关键的规则是：

- `UNIT_TARGET` 真正依赖 target team / type / flags 约束可选目标
- `POINT` / `AOE` 这类行为更多把 target 字段用于 tooltip / 说明，不一定等同于实际限制
- 多个 `AbilityBehavior` 可以组合，但互相冲突的组合会让 UI 与实际行为变得混乱

对 Rune Weaver 来说，这意味着“目标描述”不能只看自然语言 prompt，要同时落到：

- cast shape
- target team
- target type
- target flags

### 3.2 Team / Type / Flag 不只服务 ability，还会渗透到 action / projectile / aura

上游强调同一套 targeting 常量还会出现在：

- `Target` block 的 `Teams` / `Types` / `Flags` / `Exclude*`
- `LinearProjectile` 的 `TargetTeams` / `TargetTypes` / `TargetFlags`
- aura modifier 的 `Aura_Teams` / `Aura_Types` / `Aura_Flags`

因此它们不只是 tooltip 常量，而是一组会跨 action 复用的宿主枚举。

几个对检索特别有用的常见 flag：

- `DOTA_UNIT_TARGET_FLAG_MAGIC_IMMUNE_ENEMIES`
- `DOTA_UNIT_TARGET_FLAG_NOT_SUMMONED`
- `DOTA_UNIT_TARGET_FLAG_PLAYER_CONTROLLED`
- `DOTA_UNIT_TARGET_FLAG_NOT_ILLUSIONS`
- `DOTA_UNIT_TARGET_FLAG_INVULNERABLE`

### 3.3 数值契约应当放在专门的可读键上，再由脚本读取

上游后续文章给出的实践是：

- 把可调数值放进 `AbilityValues` 这类专门数值块
- 脚本端优先用 `GetSpecialValueFor`
- 需要按指定等级取值时再用 `GetLevelSpecialValueFor`

其中一个容易出错的点是：

- `ability:GetLevel()` 是 1-based
- `GetLevelSpecialValueFor(name, level)` 的第二个参数按 0-based level 取值

所以常见写法是：

```lua
local duration = ability:GetLevelSpecialValueFor("duration", ability:GetLevel() - 1)
```

### 3.4 不要把 `AbilityDuration` 当成玩家可读 tooltip 的唯一真相

上游明确批评了一个常见坑：

- `AbilityDuration` 本身不会自动产出可靠的持续时间 tooltip

更稳妥的做法是：

- 用明确命名的数值键，例如 `duration`
- 让 description / tooltip 与脚本都围绕这个键工作
- 若确实需要 engine helper，可再决定是否保留 `AbilityDuration`

对 Rune Weaver 来说，这是一条很重要的 synthesis guardrail：

- 如果 feature 需要玩家可见的持续时间说明，优先生成显式可引用的数值键
- 不要假设 engine 会自动帮我们把持续时间文案讲明白

### 3.5 Modifier 是宿主中的“状态包”，而不是附属细节

上游 modifier 结构里最关键的能力包括：

- `Attributes`: 多实例、永久、忽略无敌等生命周期属性
- `Duration`: 持续时间
- `Passive`: ability / item 获得时自动附加
- `IsBuff` / `IsDebuff` / `IsPurgable`: 驱散与 UI 呈现语义
- `EffectName` / `EffectAttachType`: 粒子
- `StatusEffectName`: 状态覆盖层
- `OverrideAnimation`: 强制动画
- `Aura_*`: 自动对周围单位施加次级 modifier
- `AllowIllusionDuplicate`: 是否复制到幻象

这说明 modifier 往往承载的是：

- 状态语义
- 表现语义
- 生命周期语义
- 被动/光环传播语义

而不只是“给个数值”。

### 3.6 `Properties`、`States`、`Modifier Events` 是三类不同控制杆

上游把它们清晰分开：

- `Properties`: 数值型加成 / 改写
- `States`: 布尔或三态开关，例如 `STUNNED`、`MAGIC_IMMUNE`
- `Modifier Events`: 行为触发点，例如 `OnCreated`、`OnAttackLanded`、`OnTakeDamage`

从 Rune Weaver 角度，这三类应分别建模：

- 想改 stats / regen / armor / move speed，优先想 `Properties`
- 想改 hard state，优先想 `States`
- 想在生命周期或战斗事件发生时执行动作，优先想 `Modifier Events`

另外，上游还指出部分 `Properties` 在 datadriven 上并不可靠，因此不能把所有属性名都当成“可直接落地”的肯定证据。

### 3.7 Item KV 在 ability 契约之上再加一层经济与所有权语义

上游 item 文档里对 Rune Weaver 最有价值的点有：

- item 名通常以 `item_` 开头
- 可购买物品需要合适 ID，且不要覆盖 Dota 默认 ID
- `ItemShareability` 定义共享/不可共享语义
- `ItemInitialCharges` / `ItemDisplayCharges` / `ItemRequiresCharges` 管 charge 生命周期
- `ItemCastOnPickup` 常见于 tome / pickup 类物品
- `ItemRecipe` / `ItemResult` / `ItemRequirements` 定义合成链
- item 依然可以带 `AbilityBehavior`、targeting、事件和 modifier

一个特别容易遗漏的点是：

- active item 如果不显式设置 `AbilityBehavior`，会落回默认 target 语义，导致行为与预期不符

### 3.8 Shop / icon / alt-click 属于 item 宿主接入面，不只是美术附属

上游把这些也放进 item 契约里：

- `AbilityTextureName` 决定图标名
- 自定义商店依赖 `scripts/shops/<map>_shops.txt`
- `SideShop` / `SecretShop` 影响可购买位置
- alt-click 文案与 ping 行为可单独控制

这意味着 item 生成如果要“像宿主原生物品一样工作”，不能只写功能逻辑，还要考虑商店、图标和交互语义。

## 4. 对 Rune Weaver 的直接价值

| 场景 | 价值 |
|------|------|
| Retrieval grounding | 为 ability / item / modifier 常量与宿主枚举提供一阶证据 |
| Blueprint shaping | 把“施法形态”“目标语义”“modifier 状态”“item 生命周期”拆成可组合部件 |
| Synthesis guardrails | 避免把 `AbilityDuration`、默认 item 行为或未处理 property 当成安全捷径 |
| Validation | 帮助识别哪些字段只是 UI 提示，哪些字段真正改变 runtime 行为 |

## 5. 当前最相关的 Pattern / Module

- `effect.modifier_applier`
- `effect.projectile_linear`
- `effect.projectile_tracking`
- `input.key_binding`
- 各类 active / passive / aura item 生成场景

## 6. 后续注意事项

- datadriven 常量很多，但并不是每个都等价于“已验证可用”
- item / ability / modifier 的边界在宿主里高度耦合，检索时不能拆得过碎
- 若 prompt 明确要求无 UI / 无 item / 无 aura，应先从行为与 targeting 契约排除相应模块，而不是事后修补

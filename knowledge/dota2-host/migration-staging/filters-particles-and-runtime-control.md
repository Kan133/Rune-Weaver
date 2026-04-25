# Filters、Particles 与运行时控制

## 1. 用途

把 ModDota scripting systems 里最适合 Rune Weaver 直接消费的运行时控制知识提取出来，重点覆盖：

- filters 如何拦截或改写游戏事件
- particles 的选择、挂点和控制点
- vector math 作为空间推导底座

## 2. 上游来源

- `references/dota2/docs/moddota_scripting_systems.md`
- 章节:
  - `Using the order filter and other filters`
  - `Particle Attachment`
  - `Basic Vector Math`
- 关键页面:
  - https://moddota.com/scripting/using-dota-filters
  - https://moddota.com/scripting/particle-attachment
  - https://moddota.com/scripting/basic-vector-math

## 3. 核心要点

### 3.1 Filter 的本质是“事件进引擎前的拦截层”

上游把 filter 解释成一层 pre-engine interception：

- 引擎收到事件前，filter 可以先看一眼
- 可以放行
- 可以拒绝
- 也可以在放行前改写事件内容

这类能力对 Rune Weaver 很关键，因为它意味着有些规则不是通过“事后修复”实现，而是通过“前置拦截”实现。

### 3.2 `ExecuteOrderFilter` 是玩家输入治理的核心 seam

上游以 order filter 为例，总结出三个返回分支：

1. 返回 `true`，原样放行
2. 返回 `false`，直接拒绝
3. 修改 event table 再返回 `true`

这使它特别适合：

- 禁止某类命令
- 对命令做条件限制
- 改写移动或施法目标

如果 feature 需求是：

- 限制玩家下达某些指令
- 给移动指令加偏移、锁定或替换
- 改变命令解释方式

那么比起 modifier / timer，filter 更可能是正确 seam。

### 3.3 可用 filter 不止 order，一共有一组控制面 API

上游列出的 filter 包括：

- `AbilityTuningFilter`
- `BountyRunePickupFilter`
- `DamageFilter`
- `ExecuteOrderFilter`
- `ModifierGainedFilter`
- `ModifyExperienceFilter`
- `ModifyGoldFilter`
- `RuneSpawnFilter`
- `TrackingProjectileFilter`

这说明“过滤器”不是单点技巧，而是一组宿主能力面。

对 Rune Weaver 的实际意义是：

- 当需求涉及资源、经验、伤害、投射物、修饰器获得时，应优先想是否存在对应 filter seam
- 不要把所有限制都堆成 `OnIntervalThink` 或零散事件逻辑

### 3.4 粒子要先选对“类型”，再谈挂点与控制点

上游对 particle 的第一原则非常重要：

- projectile 粒子不适合拿来当 buff
- explosion 粒子不适合硬当 projectile
- 先理解粒子原始用途，再决定复用

同时它要求：

- 使用前记得 precache
- 优先使用 parent particle，child particle 更容易显示异常

这对 Rune Weaver 的 synthesis 很重要，因为“找到一个看起来像的粒子”不等于“它适合这个行为语义”。

### 3.5 Attachment type 决定粒子相对宿主的位置语义

上游把 attach type 当成粒子的第二层契约：

- `follow_origin`: 跟随单位原点/身体
- `follow_overhead`: 头顶
- `attach_hitloc` / `follow_hitloc`: 命中部位
- `start_at_customorigin` / `follow_customorigin`: 自定义原点
- `world_origin`: 世界点

如果粒子位置不对，通常先查：

- 选错了 attach type
- 目标模型没有对应 attach/bone
- 少了 control point

### 3.6 Control Points 是复杂粒子的真正参数面

上游指出 control point 可以承载：

- 位置
- 半径
- 颜色
- 持续时间
- 速度

并给出两种常见方式：

- 在 Lua 里 `SetParticleControl`
- 在 datadriven 的 `ControlPoints` block 里声明

对 Rune Weaver 来说这说明：

- 复杂粒子往往不是“只写 EffectName”就结束
- 若 feature 明确要求范围圈、轨迹、颜色或动态半径，检索时应主动联想到 control point

### 3.7 Vector math 是空间行为生成的底层工具，不应被当成独立学科

上游 vector math 教程最值得保留的不是数学定义本身，而是几个高频模式：

- `position + forward * distance`: 在角色前方生成东西
- `(target - source):Normalized()`: 拿方向
- `forward:Dot(direction)`: 判断朝向 / 背击 / 夹角
- 圆周均匀分布 = 用 `cos/sin` 生成单位向量再乘半径

这几类模式和 Rune Weaver 的实际合成场景高度重合：

- 生成投射物起点
- 判断单位面朝方向
- 做圆环范围布置
- 做跟踪、推离、背刺、散射类逻辑

## 4. 对 Rune Weaver 的直接价值

| 场景 | 价值 |
|------|------|
| `rule.selection_flow` | order / damage / modifier 类控制规则可以先考虑 filter seam |
| `effect.projectile_linear` | 粒子类型、attach type、control point 和投射物行为直接相关 |
| `effect.area_indicator` | 控制点与向量半径计算是范围表现的关键 |
| Runtime repair | 当行为“逻辑对但表现错位”时，优先排查 attach / control point / vector math |

## 5. 当前最相关的 Pattern / Module

- `effect.projectile_linear`
- `effect.projectile_tracking`
- `effect.modifier_applier`
- `rule.selection_flow`
- 任意带空间偏移、朝向判断、圆周布点的 mechanic

## 6. 后续注意事项

- filters 更像治理层 seam，使用前要先判断是否会影响宿主已有规则
- 粒子表现错误时，不要先怀疑“引擎坏了”，先检查类型、attach 和 control point
- vector math 常常是表现与逻辑同时依赖的底层，不应拆出成完全孤立的知识碎片

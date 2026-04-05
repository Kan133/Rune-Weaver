# Entities 与 Units 操作

## 1. 用途

解决游戏中实体（Entity）和单位（Unit）的查找、创建、操作问题。

## 2. 上游来源

- `references/dota2/docs/moddota_scripting_typescript.md`
- 分散知识: Ability/Modifier 章节中的单位引用
- 补充: dota-data `vscripts/api.json`

## 3. 核心要点

### 3.1 单位类型定义

```typescript
// 主要单位类型
CDOTA_BaseNPC           // 所有 NPC 基类
CDOTA_BaseNPC_Hero      // 英雄
CDOTA_BaseNPC_Creature  // 普通单位/野怪
CDOTA_BaseNPC_Building  // 建筑
```

### 3.2 查找单位

```typescript
// 通过索引查找
const unit = EntIndexToHScript(unitIndex) as CDOTA_BaseNPC;

// 获取施法者/目标
const caster = this.GetCaster();     // CDOTA_BaseNPC
const target = this.GetCursorTarget(); // CDOTA_BaseNPC | undefined

// 获取单位所属玩家
const playerID = caster.GetPlayerOwnerID();
const player = caster.GetPlayerOwner();  // CDOTAPlayer

// 获取单位位置
const origin = caster.GetAbsOrigin();  // Vector
const forward = caster.GetForwardVector(); // Vector
```

### 3.3 创建单位

```typescript
// 创建普通单位
const unit = CreateUnitByName(
  "npc_dota_creature",      // 单位名称
  position,                  // 位置 Vector
  true,                      // 寻找路径
  caster,                    // 拥有者
  caster,                    // 控制者
  caster.GetTeamNumber()     // 队伍
);

// 创建英雄（用于自定义游戏）
const hero = PlayerResource.ReplaceHeroWith(
  playerID,
  "npc_dota_hero_juggernaut",
  0,      // 金钱
  0       // 经验
);
```

### 3.4 单位操作

```typescript
// 生命/魔法
unit.SetHealth(100);
unit.SetMana(50);
unit.Heal(20, ability);
unit.GiveMana(10);

// 位置/移动
unit.SetAbsOrigin(newPosition);
unit.SetForwardVector(direction);
unit.Stop();  // 停止当前动作

// 施法
unit.CastAbilityOnTarget(target, ability, playerID);
unit.CastAbilityOnPosition(position, ability, playerID);
unit.CastAbilityNoTarget(ability, playerID);

// 添加/移除技能
unit.AddAbility("ability_name");
unit.RemoveAbility("ability_name");
const ability = unit.FindAbilityByName("ability_name"); // CDOTABaseAbility | undefined
```

### 3.5 查找范围内单位

```typescript
// 查找半径内敌人
const enemies = FindUnitsInRadius(
  caster.GetTeamNumber(),        // 队伍
  caster.GetAbsOrigin(),         // 中心点
  undefined,                     // 缓存（可选）
  radius,                        // 半径
  DOTA_UNIT_TARGET_TEAM_ENEMY,   // 目标队伍
  DOTA_UNIT_TARGET_HERO | DOTA_UNIT_TARGET_BASIC, // 目标类型
  DOTA_UNIT_TARGET_FLAG_NONE,    // 目标标记
  FindOrder.ANY,                 // 排序
  false                          // 显示警告
);

// 遍历处理
for (const enemy of enemies) {
  ApplyDamage({
    victim: enemy,
    attacker: caster,
    damage: damage,
    damage_type: DamageTypes.DAMAGE_TYPE_MAGICAL,
    ability: this
  });
}
```

### 3.6 距离和方向计算

```typescript
// 两点距离
const distance = (a: Vector, b: Vector): number => {
  return (a - b as Vector).Length();
};

// 方向向量
const direction = (from: Vector, to: Vector): Vector => {
  return (to - from as Vector).Normalized();
};

// 使用示例
const targetPos = target.GetAbsOrigin();
const casterPos = caster.GetAbsOrigin();
const dist = distance(targetPos, casterPos);
const dir = direction(casterPos, targetPos);

// 前方某位置
const forwardPos = casterPos + dir * 300 as Vector;
```

### 3.7 英雄特定操作

```typescript
// 类型断言为英雄
const hero = unit as CDOTA_BaseNPC_Hero;

// 英雄属性
const str = hero.GetStrength();
const agi = hero.GetAgility();
const int = hero.GetIntellect();

const strGain = hero.GetStrengthGain();

// 等级/经验
const level = hero.GetLevel();
hero.AddExperience(amount, reason, applyBonus, killCredit);
hero.HeroLevelUp(true);  // 升级

// 物品
const item = hero.FindItemInInventory("item_name");
const item = hero.AddItemByName("item_name");
hero.RemoveItem(item);
```

## 4. 对 Rune Weaver 的直接价值

| 场景 | 价值 |
|------|------|
| `effect.dash` | 单位位移、位置计算 |
| `effect.modifier_applier` | 目标查找、范围搜索 |
| `rule.selection_flow` | 玩家-单位关联 |

## 5. 当前最相关的 Pattern / Module

| Pattern | 单位操作 |
|---------|----------|
| `effect.dash` | `SetAbsOrigin()`, 位置计算 |
| `effect.modifier_applier` | `FindUnitsInRadius()` |
| `input.key_binding` | `GetPlayerOwnerID()` |

## 6. 后续注意事项

- `GetCursorTarget()` 可能返回 `undefined`，使用前要检查
- `FindUnitsInRadius` 返回数组，可能为空
- 单位可能死亡（`IsAlive()` 检查）
- 向量运算需要使用 TypeScript 类型断言（`as Vector`）

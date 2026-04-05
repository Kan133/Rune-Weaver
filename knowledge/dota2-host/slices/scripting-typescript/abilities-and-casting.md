# Abilities 与 Casting 实现

## 1. 用途

解决技能（Ability）的实现问题，特别是如何用 TypeScript 编写可注册到 Dota2 的技能。

## 2. 上游来源

- `references/dota2/docs/moddota_scripting_typescript.md`
- 章节: "Abilities in Typescript"
- 关键页面: https://moddota.com/scripting/Typescript/typescript-ability

## 3. 核心要点

### 3.1 技能定义（KV）

技能在 `npc_abilities_custom.txt` 中定义：

```
"my_custom_ability"
{
    "BaseClass"              "ability_lua"
    "ScriptFile"             "abilities/my_custom_ability"
    "AbilityTextureName"     "..."
    "AbilityBehavior"        "DOTA_ABILITY_BEHAVIOR_UNIT_TARGET"
    "AbilityUnitTargetTeam"  "DOTA_UNIT_TARGET_TEAM_ENEMY"
    "AbilityUnitTargetType"  "DOTA_UNIT_TARGET_HERO | DOTA_UNIT_TARGET_BASIC"
    "AbilityCastRange"       "600"
    "AbilityCooldown"        "10.0"
    "AbilityManaCost"        "100"
    
    "AbilityValues"
    {
        "damage"    "100 150 200 250"
        "duration"  "3.0 4.0 5.0 6.0"
    }
}
```

### 3.2 TypeScript 技能类

```typescript
// abilities/my_custom_ability.ts

import { BaseAbility, registerAbility } from "../lib/dota_ts_adapter";

@registerAbility()
export class my_custom_ability extends BaseAbility {
  // 技能属性（可选，用于存储常量）
  particle_cast: string = "particles/.../cast.vpcf";
  sound_cast: string = "Hero_Ability.Cast";

  /**
   * 施法开始时被调用
   */
  OnSpellStart(): void {
    const caster = this.GetCaster();
    const target = this.GetCursorTarget();
    
    // 获取技能数值
    const damage = this.GetSpecialValueFor("damage");
    const duration = this.GetSpecialValueFor("duration");
    
    // 播放特效
    ParticleManager.CreateParticle(
      this.particle_cast,
      ParticleAttachment.ABSORIGIN_FOLLOW,
      caster
    );
    
    // 播放音效
    EmitSoundOn(this.sound_cast, caster);
    
    // 应用伤害
    if (target) {
      ApplyDamage({
        victim: target,
        attacker: caster,
        damage: damage,
        damage_type: DamageTypes.DAMAGE_TYPE_MAGICAL,
        ability: this
      });
    }
  }
  
  /**
   * 获取施法范围（用于 UI 显示）
   */
  GetCastRange(location: Vector, target: CDOTA_BaseNPC): number {
    return this.GetSpecialValueFor("AbilityCastRange");
  }
  
  /**
   * 获取冷却时间
   */
  GetCooldown(level: number): number {
    return this.GetSpecialValueFor("AbilityCooldown");
  }
}
```

### 3.3 常用技能方法

**施法相关**:
| 方法 | 用途 |
|------|------|
| `OnSpellStart()` | 施法开始时调用 |
| `GetCaster()` | 获取施法者 |
| `GetCursorTarget()` | 获取目标单位 |
| `GetCursorPosition()` | 获取目标位置 |
| `GetSpecialValueFor(name)` | 获取 KV 中定义的数值 |

**冷却/消耗**:
| 方法 | 用途 |
|------|------|
| `GetCooldown(level)` | 获取冷却时间 |
| `GetManaCost(level)` | 获取魔法消耗 |
| `StartCooldown(seconds)` | 开始冷却 |
| `EndCooldown()` | 结束冷却 |

**目标检查**:
| 方法 | 用途 |
|------|------|
| `CastFilterResultTarget(target)` | 检查目标是否合法 |
| `GetBehavior()` | 获取技能行为类型 |

### 3.4 技能行为类型

```typescript
// 常用 AbilityBehavior 组合
const BEHAVIOR_POINT_TARGET = AbilityBehavior.DOTA_ABILITY_BEHAVIOR_POINT;
const BEHAVIOR_UNIT_TARGET = AbilityBehavior.DOTA_ABILITY_BEHAVIOR_UNIT_TARGET;
const BEHAVIOR_NO_TARGET = AbilityBehavior.DOTA_ABILITY_BEHAVIOR_NO_TARGET;
const BEHAVIOR_TOGGLE = AbilityBehavior.DOTA_ABILITY_BEHAVIOR_TOGGLE;
const BEHAVIOR_CHANNELLED = AbilityBehavior.DOTA_ABILITY_BEHAVIOR_CHANNELLED;
const BEHAVIOR_IMMEDIATE = AbilityBehavior.DOTA_ABILITY_BEHAVIOR_IMMEDIATE;
```

### 3.5 投射物（Projectile）

```typescript
OnSpellStart(): void {
  const caster = this.GetCaster();
  const target = this.GetCursorTarget();
  
  const projectileInfo: CreateTrackingProjectileOptions = {
    Target: target,
    Source: caster,
    Ability: this,
    EffectName: "particles/.../projectile.vpcf",
    bDodgeable: true,
    bProvidesVision: true,
    iVisionRadius: 300,
    iVisionTeamNumber: caster.GetTeamNumber(),
    iMoveSpeed: this.GetSpecialValueFor("projectile_speed")
  };
  
  ProjectileManager.CreateTrackingProjectile(projectileInfo);
}

// 投射物命中时调用
OnProjectileHit(target: CDOTA_BaseNPC, location: Vector): boolean {
  if (target) {
    const damage = this.GetSpecialValueFor("damage");
    ApplyDamage({
      victim: target,
      attacker: this.GetCaster(),
      damage: damage,
      damage_type: DamageTypes.DAMAGE_TYPE_MAGICAL,
      ability: this
    });
  }
  return true; // 返回 true 表示投射物消失
}
```

## 4. 对 Rune Weaver 的直接价值

| 场景 | 价值 |
|------|------|
| `effect.dash` | 实现冲刺技能的核心方法 |
| `input.key_binding` | 技能按键绑定实现 |
| Code Generation | 技能骨架生成模板 |

## 5. 当前最相关的 Pattern / Module

| Pattern | 相关技能方法 |
|---------|-------------|
| `effect.dash` | `OnSpellStart()`, `GetCursorPosition()`, 位移逻辑 |
| `effect.modifier_applier` | 配合 `ApplyModifier` 使用 |
| `input.key_binding` | KV 中 `AbilityBehavior` 配置 |

## 6. 后续注意事项

- `@registerAbility()` 装饰器必须存在
- 类名必须与 KV 中的技能名完全一致
- `BaseAbility` 方法有详细类型定义，善用 IDE 提示
- 投射物命中时要检查目标是否存在（可能已死亡）
- 伤害类型使用 `DamageTypes` 枚举

# Modifiers 与 Effects 实现

## 1. 用途

解决修改器（Modifier）的实现问题。修改器是 Dota2 中实现状态效果（buff/debuff）的核心机制。

## 2. 上游来源

- `references/dota2/docs/moddota_scripting_typescript.md`
- 章节: "TypeScript Modifier"
- 关键页面: https://moddota.com/scripting/Typescript/typescript-modifier

## 3. 核心要点

### 3.1 Modifier 基础

修改器是附加到单位上的状态效果，可以：
- 修改属性（移速、攻击力等）
- 定期执行逻辑（Think）
- 响应事件（攻击、被攻击、施法等）

### 3.2 TypeScript Modifier 类

```typescript
// modifiers/my_modifier.ts

import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";

@registerModifier()
export class modifier_my_effect extends BaseModifier {
  // 修改器属性
  particle_effect: string = "particles/.../effect.vpcf";
  particle_id?: ParticleID;
  
  /**
   * 修改器创建时调用
   */
  OnCreated(params: object): void {
    if (IsServer()) {
      // 应用特效
      this.particle_id = ParticleManager.CreateParticle(
        this.particle_effect,
        ParticleAttachment.ABSORIGIN_FOLLOW,
        this.GetParent()
      );
      
      // 启动定期逻辑（每秒执行一次）
      this.StartIntervalThink(1.0);
    }
  }
  
  /**
   * 定期执行
   */
  OnIntervalThink(): void {
    const parent = this.GetParent();
    
    // 执行伤害或其他逻辑
    ApplyDamage({
      victim: parent,
      attacker: this.GetCaster(),
      damage: 10,
      damage_type: DamageTypes.DAMAGE_TYPE_MAGICAL,
      ability: this.GetAbility()
    });
  }
  
  /**
   * 修改器销毁时调用
   */
  OnDestroy(): void {
    if (IsServer() && this.particle_id) {
      ParticleManager.DestroyParticle(this.particle_id, false);
      ParticleManager.ReleaseParticleIndex(this.particle_id);
    }
  }
  
  /**
   * 声明要修改的属性
   */
  DeclareFunctions(): ModifierFunction[] {
    return [
      ModifierFunction.MOVESPEED_BONUS_CONSTANT,
      ModifierFunction.PREATTACK_BONUS_DAMAGE
    ];
  }
  
  /**
   * 获取移速加成
   */
  GetModifierMoveSpeedBonusConstant(): number {
    return -20; // 减速 20
  }
  
  /**
   * 获取攻击力加成
   */
  GetModifierPreAttackBonusDamage(): number {
    return this.GetAbility()?.GetSpecialValueFor("bonus_damage") ?? 0;
  }
  
  /**
   * 修改器是否隐藏（不显示在 UI）
   */
  IsHidden(): boolean {
    return false;
  }
  
  /**
   * 是否是 debuff
   */
  IsDebuff(): boolean {
    return true;
  }
  
  /**
   * 是否可以被驱散
   */
  IsPurgable(): boolean {
    return true;
  }
}
```

### 3.3 应用 Modifier

```typescript
// 在技能中应用修改器
OnSpellStart(): void {
  const caster = this.GetCaster();
  const target = this.GetCursorTarget();
  const duration = this.GetSpecialValueFor("duration");
  
  // 给目标添加修改器
  target.AddNewModifier(
    caster,           // 施法者
    this,             // 技能
    "modifier_my_effect",  // 修改器名称
    { duration: duration }  // 参数
  );
}
```

### 3.4 常用 Modifier 属性修改

```typescript
DeclareFunctions(): ModifierFunction[] {
  return [
    // 属性修改
    ModifierFunction.STATS_STRENGTH_BONUS,
    ModifierFunction.STATS_AGILITY_BONUS,
    ModifierFunction.STATS_INTELLECT_BONUS,
    
    // 战斗修改
    ModifierFunction.PREATTACK_BONUS_DAMAGE,
    ModifierFunction.ATTACKSPEED_BONUS_CONSTANT,
    ModifierFunction.DAMAGEOUTGOING_PERCENTAGE,
    
    // 移速修改
    ModifierFunction.MOVESPEED_BONUS_CONSTANT,
    ModifierFunction.MOVESPEED_BONUS_PERCENTAGE,
    
    // 抗性修改
    ModifierFunction.MAGICAL_RESISTANCE_BONUS,
    
    // 事件监听
    ModifierFunction.ON_ATTACK_LANDED,
    ModifierFunction.ON_TAKEDAMAGE,
    ModifierFunction.ON_DEATH
  ];
}
```

### 3.5 Modifier 状态（States）

```typescript
CheckState(): Partial<Record<ModifierState, boolean>> {
  return {
    [ModifierState.STUNNED]: true,           // 眩晕
    [ModifierState.SILENCED]: true,          // 沉默
    [ModifierState.DISARMED]: true,          // 缴械
    [ModifierState.ROOTED]: true,            // 缠绕
    [ModifierState.INVISIBLE]: true,         // 隐身
    [ModifierState.UNSELECTABLE]: true,      // 不可选中
    [ModifierState.ATTACK_IMMUNE]: true,     // 攻击免疫
    [ModifierState.MAGIC_IMMUNE]: true,      // 魔免
    [ModifierState.NO_UNIT_COLLISION]: true, // 无视单位碰撞
  };
}
```

### 3.6 被动技能 Modifier

```typescript
// 在 KV 中配置被动 modifier
/*
"my_passive_ability"
{
    "BaseClass"              "ability_lua"
    "ScriptFile"             "abilities/my_passive"
    "AbilityBehavior"        "DOTA_ABILITY_BEHAVIOR_PASSIVE"
}
*/

// 在技能文件中应用
@registerAbility()
export class my_passive_ability extends BaseAbility {
  GetIntrinsicModifierName(): string {
    return "modifier_my_passive_effect";
  }
}

// 被动修改器
@registerModifier()
export class modifier_my_passive_effect extends BaseModifier {
  IsHidden(): boolean { return true; }
  IsPurgable(): boolean { return false; }
  
  DeclareFunctions(): ModifierFunction[] {
    return [ModifierFunction.PREATTACK_BONUS_DAMAGE];
  }
  
  GetModifierPreAttackBonusDamage(): number {
    return this.GetAbility().GetSpecialValueFor("bonus_damage");
  }
}
```

## 4. 对 Rune Weaver 的直接价值

| 场景 | 价值 |
|------|------|
| `effect.modifier_applier` | 修改器应用的核心实现 |
| `effect.dash` | 冲刺期间的免疫/无敌状态 |
| `resource.basic_pool` | 资源修改器 |

## 5. 当前最相关的 Pattern / Module

| Pattern | Modifier 用途 |
|---------|--------------|
| `effect.modifier_applier` | 核心：应用各种效果修改器 |
| `effect.dash` | 冲刺期间的移速/免疫修改器 |
| `resource.basic_pool` | 资源上限/回复修改器 |

## 6. 后续注意事项

- `@registerModifier()` 装饰器必须存在
- 修改器名 convention: `modifier_{描述}`
- `OnCreated` 和 `OnDestroy` 要成对处理资源（特效等）
- 服务端/客户端要区分（使用 `IsServer()` 检查）
- Think 间隔不要太短（0.1s 以下会影响性能）

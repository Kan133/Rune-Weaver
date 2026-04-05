# Dota2 Enums Knowledge

## 1. 这类知识解决什么问题

Enums（枚举）定义了 Dota2 自定义游戏中使用的常量集合。它们解决：

- **减少魔法字符串**：用有意义的常量名称替代硬编码数值
- **类型安全约束**：限制参数取值范围，防止非法值传入
- **代码可读性**：`ABILITY_TYPE_ULTIMATE` 比 `1` 更易理解
- **Adapter 校验**：在宿主写入前验证枚举值合法性

## 2. 当前最重要的原始来源

| 文件 | 用途 | 关键内容 |
|------|------|----------|
| `references/dota2/dota-data/files/engine-enums.json` | 引擎级枚举 | 底层游戏常量（队伍、游戏状态等） |
| `references/dota2/dota-data/files/vscripts/enums.json` | VScript 枚举 | 脚本 API 枚举（技能类型、伤害类型等） |
| `references/dota2/dota-data/files/panorama/enums.json` | Panorama 枚举 | UI 相关枚举（面板属性、DOTA 特定值） |

## 3. 对 Rune Weaver 当前阶段最直接的用途

### 支撑 Host Binding 参数约束

| Pattern | 可能使用的枚举 | 用途 |
|---------|---------------|------|
| `effect.dash` | `DAMAGE_TYPES`, `DOTA_UNIT_TARGET_TEAM` | 位移效果的伤害和目标配置 |
| `effect.modifier_applier` | `MODIFIER_PROPERTY`, `MODIFIER_STATE` | 修改器属性定义 |
| `input.key_binding` | `DOTAKey` | 按键绑定（如果存在） |
| `rule.selection_flow` | 自定义枚举 | 选择策略类型 |

### 支撑 Adapter 校验

```typescript
// 在 Assembly 阶段验证参数
function validateDamageType(type: string): boolean {
  return Object.values(DAMAGE_TYPES).includes(type as DAMAGE_TYPES);
}
```

### 支撑宿主写入合法性

- 确保生成的代码使用合法的常量值
- 避免运行时因非法枚举值导致的错误

## 4. 枚举分类速查

### 游戏机制枚举（VScript）

| 枚举名 | 关键成员 | 用途 |
|--------|----------|------|
| `ABILITY_TYPES` | `BASIC`, `ULTIMATE`, `ATTRIBUTES`, `HIDDEN` | 技能类型 |
| `DAMAGE_TYPES` | `DAMAGE_TYPE_PHYSICAL`, `MAGICAL`, `PURE` | 伤害类型 |
| `DOTA_UNIT_TARGET_TEAM` | `FRIENDLY`, `ENEMY`, `BOTH`, `CUSTOM` | 目标队伍 |
| `DOTA_UNIT_TARGET_TYPE` | `HERO`, `CREEP`, `BUILDING`, `ALL` | 目标类型 |
| `DOTA_UNIT_TARGET_FLAGS` | 各种修饰标志 | 目标筛选条件 |
| `DOTA_GameState` | 游戏状态（等待、选择、游戏等） | 游戏生命周期 |

### 物品相关枚举

| 枚举名 | 关键成员 | 用途 |
|--------|----------|------|
| `DOTA_Item` | 物品槽位常量 | 物品位置定义 |
| `DOTA_STASH_SLOT` |  stash 槽位 | 背包系统 |

### 特效相关枚举

| 枚举名 | 关键成员 | 用途 |
|--------|----------|------|
| `ParticleAttachment` | 粒子附着点 | 特效定位 |
| `PseudoRandom` | 各种伪随机分布 | 概率计算 |

### Panorama 枚举（UI）

| 枚举名 | 关键成员 | 用途 |
|--------|----------|------|
| `DOTA_PanoramaProperty` | 面板属性 | UI 属性设置 |
| `DOTA_HeroSelectionType` | 英雄选择类型 | 选择界面 |

## 5. 当前最值得优先关注的 10 个枚举

| 枚举名 | 来源 | 用途 | Pattern 关联 |
|--------|------|------|-------------|
| `ABILITY_TYPES` | vscripts | 技能类型分类 | `effect.dash` |
| `DAMAGE_TYPES` | vscripts | 伤害类型定义 | 所有伤害相关 Pattern |
| `DOTA_UNIT_TARGET_TEAM` | vscripts | 目标队伍筛选 | `effect.modifier_applier` |
| `DOTA_UNIT_TARGET_TYPE` | vscripts | 目标类型筛选 | 目标选择 Pattern |
| `DOTA_GameState` | vscripts | 游戏状态 | 系统初始化 Pattern |
| `DOTA_Item` | vscripts | 物品槽位 | 背包系统 |
| `AbilityLearnResult_t` | vscripts | 技能学习结果 | 升级系统 |
| `ParticleAttachment` | vscripts | 粒子附着 | 视觉效果 Pattern |
| `PseudoRandom` | engine | 伪随机分布 | 随机系统 |
| `modifierfunction` | vscripts | 修改器函数 | `effect.modifier_applier` |

## 6. 枚举值引用示例

### DAMAGE_TYPES（伤害类型）

```typescript
enum DAMAGE_TYPES {
  DAMAGE_TYPE_NONE = 0,
  DAMAGE_TYPE_PHYSICAL = 1,
  DAMAGE_TYPE_MAGICAL = 2,
  DAMAGE_TYPE_PURE = 4,
  DAMAGE_TYPE_ALL = 7,  // 组合值
  DAMAGE_TYPE_HP_REMOVAL = 8,
}
```

### ABILITY_TYPES（技能类型）

```typescript
enum ABILITY_TYPES {
  ABILITY_TYPE_BASIC = 0,       // 普通技能
  ABILITY_TYPE_ULTIMATE = 1,    // 大招
  ABILITY_TYPE_ATTRIBUTES = 2,  // 属性加成
  ABILITY_TYPE_HIDDEN = 3,      // 隐藏技能
}
```

## 7. 当前缺口

| 缺口 | 说明 | 优先级 |
|------|------|--------|
| 枚举值有效性验证 | 某些枚举在不同版本可能有差异 | P2 |
| 位标志枚举解释 | 如 `DOTA_UNIT_TARGET_FLAGS` 的组合用法 | P2 |
| 自定义枚举最佳实践 | Custom Game 应该在哪里定义自己的枚举 | P3 |
| 枚举与字符串映射 | 序列化时的枚举-字符串转换 | P2 |
| 完整枚举清单索引 | 快速查找某个值属于哪个枚举 | P3 |

## 8. 在 Rune Weaver 中的使用

### 类型定义中使用

```typescript
// adapters/dota2/types/enums.ts

export enum ABILITY_TYPES {
  BASIC = 0,
  ULTIMATE = 1,
  ATTRIBUTES = 2,
  HIDDEN = 3,
}

export enum DAMAGE_TYPES {
  NONE = 0,
  PHYSICAL = 1,
  MAGICAL = 2,
  PURE = 4,
  ALL = 7,
}

export enum DOTA_UNIT_TARGET_TEAM {
  NONE = 0,
  FRIENDLY = 1,
  ENEMY = 2,
  BOTH = 3,
  CUSTOM = 4,
}
```

### Pattern 参数验证中使用

```typescript
// 在 effect.modifier_applier 的宿主绑定中
interface ModifierApplierParams {
  targetTeam: DOTA_UNIT_TARGET_TEAM;
  targetType: DOTA_UNIT_TARGET_TYPE;
  // ...
}

function validateParams(params: ModifierApplierParams): boolean {
  return Object.values(DOTA_UNIT_TARGET_TEAM).includes(params.targetTeam);
}
```

## 9. 延伸阅读

- [引擎枚举原始数据](../../../references/dota2/dota-data/files/engine-enums.json)
- [VScript 枚举原始数据](../../../references/dota2/dota-data/files/vscripts/enums.json)
- [Panorama 枚举原始数据](../../../references/dota2/dota-data/files/panorama/enums.json)
- [Common Types 知识](../common-types/README.md) - 枚举与类型的关系

# Dota2 Common Types Knowledge

## 1. 这类知识解决什么问题

Common Types（通用类型）定义了 Dota2 自定义游戏开发中的核心数据类型系统。它解决：

- **类型安全**：为 VScript/Panorama 提供类型约束和检查
- **API 签名理解**：理解函数参数和返回值的类型含义
- **Adapter 代码生成**：为 Dota2 Adapter 提供类型映射依据
- **Pattern Host Binding**：为 Pattern 的宿主实现提供类型基础

## 2. 当前最重要的原始来源

| 文件 | 用途 | 关键内容 |
|------|------|----------|
| `references/dota2/dota-data/files/vscripts/api-types.json` | 类型定义 | 原始类型、名义类型、对象类型、函数签名 |
| `references/dota2/dota-data/files/vscripts/api.d.ts` | TypeScript 定义 | 完整 TypeScript 类型声明 |
| `references/dota2/dota-data/files/vscripts/api-types.d.ts` | 扩展类型 | 补充类型定义 |

## 3. 对 Rune Weaver 当前阶段最直接的用途

### 支撑 Adapter Typing

| 用途 | 类型示例 | 说明 |
|------|----------|------|
| Entity 引用 | `EntityIndex`, `PlayerID` | 单位、玩家的标识类型 |
| 句柄类型 | `ParticleID`, `ProjectileID` | 特效、投射物句柄 |
| 回调标识 | `EventListenerID` | 事件监听器标识 |
| 选项对象 | `ApplyDamageOptions` | 复杂函数参数结构 |

### 支撑 Pattern Host Binding

| Pattern | 关键类型 | 用途 |
|---------|----------|------|
| `input.key_binding` | `PlayerID`, `EntityIndex` | 绑定到特定玩家/单位 |
| `effect.dash` | `Vector`, `QAngle` | 位移方向和角度 |
| `effect.modifier_applier` | `EntityIndex` | 修改器目标单位 |
| `resource.basic_pool` | `int`, `float` | 资源数值 |

### 支撑 Assembly to Host Write

- **函数签名映射**：从类型定义生成宿主函数调用代码
- **参数类型检查**：在 Assembly 阶段验证参数类型合法性
- **返回值处理**：正确处理宿主 API 返回的复杂类型

## 4. 类型分类速查

### 原始类型（Primitives）

| 类型 | 说明 | 示例值 |
|------|------|--------|
| `bool` | 布尔值 | `true`, `false` |
| `int` | 整数 | `42`, `-5` |
| `float` | 浮点数 | `3.14`, `-0.5` |
| `double` | 双精度浮点 | 高精度计算 |
| `string` | 字符串 | `"ability_name"` |
| `table` | Lua 表 | `{key: value}` |
| `nil` | 空值 | `null` 等价 |
| `handle` | 通用句柄 | 指向引擎对象 |
| `ehandle` | 实体句柄 | 指向实体 |

### 名义类型（Nominal Types）

基于 `int` 的强类型标识：

| 类型 | 基础类型 | 用途 | Pattern 关联 |
|------|----------|------|-------------|
| `EntityIndex` | `int` | 实体索引 | 所有涉及单位的 Pattern |
| `PlayerID` | `int` | 玩家 ID（0-23） | `input.key_binding` |
| `ParticleID` | `int` | 粒子特效 ID | `effect.dash`（冲刺特效） |
| `ProjectileID` | `int` | 投射物 ID | 弹道技能 |
| `EventListenerID` | `int` | 事件监听器 ID | 事件系统 |
| `CustomGameEventListenerID` | `int` | 自定义事件监听器 ID | Server-Client 通信 |
| `SpawnGroupHandle` | `int` | 刷怪组句柄 | 刷怪系统 |

### 对象类型（Object Types）

复杂数据结构：

| 类型 | 关键字段 | 用途 |
|------|----------|------|
| `ApplyDamageOptions` | `victim`, `attacker`, `damage`, `damage_type` | 伤害计算参数 |
| `CScriptHTTPResponse` | `Body`, `StatusCode` | HTTP 请求响应 |
| `LocalTime` | `Hours`, `Minutes`, `Seconds` | 本地时间 |
| `Vector` | `x`, `y`, `z` | 3D 向量（位置、方向） |
| `QAngle` | `x`, `y`, `z` | 角度（俯仰、偏航、翻滚） |

## 5. 当前最值得优先关注的 10 个类型

| 类型 | 类别 | 用途 | Pattern 关联 |
|------|------|------|-------------|
| `EntityIndex` | Nominal | 单位唯一标识 | 所有单位相关 Pattern |
| `PlayerID` | Nominal | 玩家唯一标识 | `input.key_binding` |
| `Vector` | Object | 3D 位置/方向 | `effect.dash` |
| `ParticleID` | Nominal | 粒子特效句柄 | 视觉效果 |
| `ApplyDamageOptions` | Object | 伤害参数 | 战斗系统 |
| `int` | Primitive | 整数值 | 计数、索引 |
| `float` | Primitive | 浮点数值 | 时间、距离 |
| `bool` | Primitive | 布尔标志 | 状态判断 |
| `string` | Primitive | 字符串 | 名称、ID |
| `table` | Primitive | Lua 表 | 复杂数据结构 |

## 6. 当前缺口

| 缺口 | 说明 | 优先级 |
|------|------|--------|
| 完整 TypeScript 类型定义 | `api.d.ts` 部分类型缺失或过时 | P1 |
| 类型转换规则 | Lua `table` 与 TypeScript 类型的映射 | P2 |
| 可选参数标记 | 哪些函数参数是可选的 | P2 |
| 泛型支持 | 集合类型（数组、字典）的完整定义 | P3 |
| 类型守卫函数 | 运行时类型检查辅助函数 | P3 |

## 7. 在 Rune Weaver 中的使用示例

### Adapter 类型映射

```typescript
// adapters/dota2/types/index.ts

// 名义类型映射
export type EntityIndex = number & { __brand: 'EntityIndex' };
export type PlayerID = number & { __brand: 'PlayerID' };
export type ParticleID = number & { __brand: 'ParticleID' };

// 对象类型映射
export interface ApplyDamageOptions {
  victim: EntityIndex;
  attacker: EntityIndex;
  damage: number;
  damage_type: DAMAGE_TYPES;  // 来自 enums
  damage_flags?: number;
  ability?: number;
}
```

### Pattern Host Binding 示例

```typescript
// effect.dash 的宿主绑定需要
interface DashEffectParams {
  target: EntityIndex;        // 目标单位
  direction: Vector;          // 冲刺方向
  distance: float;            // 冲刺距离
  speed: float;               // 冲刺速度
}

// input.key_binding 的宿主绑定需要
interface KeyBindingParams {
  playerId: PlayerID;         // 绑定到哪个玩家
  key: string;                // 按键名称
  callback: (player: PlayerID) => void;
}
```

## 8. 延伸阅读

- [原始类型定义](../../../references/dota2/dota-data/files/vscripts/api-types.json)
- [TypeScript 定义文件](../../../references/dota2/dota-data/files/vscripts/api.d.ts)
- [Enums 知识](../enums/README.md) - 类型与枚举的关系

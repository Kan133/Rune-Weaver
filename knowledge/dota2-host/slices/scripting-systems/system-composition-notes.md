# System Composition 注意事项

## 1. 用途

解决多个系统（选择、资源、技能等）如何组合在一起的问题。这是 Rune Weaver 中跨系统功能（用例 C）的实现指南。

## 2. 上游来源

- `references/dota2/docs/moddota_scripting_systems.md`
- 多个系统示例的组合观察
- 补充: Rune Weaver Pattern 设计经验

## 3. 核心要点

### 3.1 系统边界

```
┌─────────────────────────────────────────────────────────────┐
│                      Rune Weaver Features                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  rw_dash_q  │  │rw_talent_draw│  │rw_energy_bar│         │
│  │  (Feature)  │  │  (Feature)   │  │  (Feature)  │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐         │
│  │ effect.dash │  │rule.selection│  │resource.basic│         │
│  │             │  │    _flow     │  │    _pool     │         │
│  │  (Pattern)  │  │  (Pattern)   │  │  (Pattern)   │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                │
└─────────┼────────────────┼────────────────┼────────────────┘
          │                │                │
          └────────────────┴────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Bridge /   │
                    │   Index     │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
   │    Server   │  │    Shared   │  │     UI      │
   └─────────────┘  └─────────────┘  └─────────────┘
```

### 3.2 Feature 间通信原则

**直接通信（不推荐）**:
```typescript
// ❌ Feature A 直接调用 Feature B
class DashFeature {
  onDash() {
    // 直接修改能量系统
    energyFeature.consumeEnergy(20);  // 耦合太紧
  }
}
```

**通过事件解耦（推荐）**:
```typescript
// ✅ 通过事件总线或回调
class DashFeature {
  onDash: () => void;  // 回调函数
  
  OnSpellStart() {
    // 执行冲刺逻辑
    // ...
    
    // 触发回调
    if (this.onDash) this.onDash();
  }
}

// 在 Bridge/Index 层组合
function activateFeatures() {
  const dash = new DashFeature();
  const energy = new EnergyFeature();
  
  // 组合：冲刺消耗能量
  dash.onDash = () => energy.consume(20);
}
```

**通过共享状态（推荐）**:
```typescript
// ✅ 通过 NetTables 共享状态
// Dash 系统更新 NetTable
customNetTables.SetTableValue("rw_cooldowns", "player_0", {
  dash_ready: false,
  dash_cooldown: 5.0
});

// UI 同时订阅 cooldowns 和 resources
// 各自独立响应状态变化
```

### 3.3 系统组合模式

**模式 1：事件链**:
```
输入 → 消耗资源 → 执行效果 → 触发UI更新
```

```typescript
// 在 Feature Index 中编排
function activateRwDashQ() {
  const dash = registerDashAbility("rw_dash_q");
  
  // 重写原始 OnSpellStart 添加资源检查
  const originalOnSpellStart = dash.OnSpellStart.bind(dash);
  dash.OnSpellStart = function() {
    // 前置：检查/消耗资源
    if (!energySystem.hasEnough(20)) {
      showError("Not enough energy");
      return;
    }
    energySystem.consume(20);
    
    // 执行原逻辑
    originalOnSpellStart();
    
    // 后置：更新UI
    uiSystem.showDashEffect();
  };
}
```

**模式 2：修饰器模式**:
```typescript
// 用 Modifier 连接系统
// 冲刺时添加能量消耗 Modifier
@registerModifier()
class modifier_dash_energy_cost extends BaseModifier {
  OnCreated(): void {
    if (IsServer()) {
      const energy = EnergySystem.GetForParent(this.GetParent());
      energy.consume(20);
    }
  }
}

// 技能创建时添加 modifier
OnSpellStart(): void {
  this.GetCaster().AddNewModifier(
    this.GetCaster(),
    this,
    "modifier_dash_energy_cost",
    {}
  );
  
  // 执行冲刺...
}
```

### 3.4 避免循环依赖

```typescript
// ❌ 循环依赖
// feature_a.ts
import { featureB } from "./feature_b";

// feature_b.ts
import { featureA } from "./feature_a";  // 循环！

// ✅ 通过接口解耦
// types.ts
export interface EnergyConsumer {
  consume(amount: number): boolean;
}

// feature_a.ts - 只依赖接口
import { EnergyConsumer } from "./types";

class DashFeature {
  energyConsumer: EnergyConsumer;
}

// index.ts - 在组合时注入
dashFeature.energyConsumer = energyFeature;
```

## 4. 对 Rune Weaver 的直接价值

| 场景 | 价值 |
|------|------|
| 用例 C（跨系统组合） | 输入+资源+效果+UI的组合实现 |
| Pattern Resolution | 明确 Pattern 如何组合成 Feature |
| Bridge Generation | 生成 Feature 间的连接代码 |
| Code Organization | 系统分层和依赖管理 |

## 5. 当前最相关的 Pattern / Module

| Pattern 组合 | 示例场景 |
|-------------|----------|
| `input` + `effect` | 按键触发冲刺 |
| `input` + `resource` + `effect` | 消耗能量释放技能 |
| `rule` + `ui` | 选择系统 + 弹窗显示 |
| `resource` + `ui` | 资源系统 + 资源条 |

## 6. 后续注意事项

- Feature 之间不要直接 import，通过接口或事件通信
- 组合逻辑放在 Bridge/Index 层，不要在 Feature 内部硬编码
- 考虑使用 Modifier 作为系统间的"胶水"
- NetTables 可以作为系统间的共享状态中心
- 避免循环依赖，必要时重构抽取共享接口

# State Sync 与 Tables

## 1. 用途

解决服务端状态同步到 UI 的最佳实践。重点区分 NetTables 和 Custom Events 的适用场景。

## 2. 上游来源

- `references/dota2/docs/moddota_scripting_systems.md`
- 分散知识: 各系统中状态同步的使用
- 补充: dota-data `vscripts/api.json`

## 3. 核心要点

### 3.1 NetTables 核心特性

```typescript
// 设置值（服务端）
CustomNetTables.SetTableValue(
  "table_name",     // 表名
  "key_name",       // 键名
  value             // 任意可序列化值
);

// 获取值（UI 端）- 同步获取
const value = CustomNetTables.GetTableValue("table_name", "key_name");

// 监听变化（UI 端）
CustomNetTables.SubscribeNetTableListener(
  "table_name",
  (tableName, key, value) => {
    // 值变化时的回调
  }
);
```

### 3.2 适用场景对比

| 特性 | NetTables | Custom Events |
|------|-----------|---------------|
| 数据持久性 | ✅ 持续存在 | ❌ 一次性 |
| 自动同步 | ✅ 新连接自动获取 | ❌ 需手动重发 |
| 适合状态 | ✅ 是 | ❌ 否 |
| 适合事件 | ❌ 否 | ✅ 是 |
| 数据大小 | 有限制 (~16KB/key) | 更小 |
| 更新频率 | 适合中低频 | 适合任意频率 |

### 3.3 Rune Weaver 推荐用法

**用 NetTables**:
```typescript
// ✅ 资源数值 - 需要持续显示
CustomNetTables.SetTableValue("rw_resources", "player_0", {
  energy: { current: 75, max: 100 },
  rage: { current: 30, max: 100 }
});

// ✅ 选择状态 - 需要知道当前进行中的选择
CustomNetTables.SetTableValue("rw_selection", "player_0", {
  active: true,
  options: [...],
  expiresAt: 123.45
});

// ✅ 冷却状态 - 需要显示倒计时
CustomNetTables.SetTableValue("rw_cooldowns", "player_0", {
  ability_q: { ready: false, remaining: 3.5 }
});
```

**用 Custom Events**:
```typescript
// ✅ 触发选择弹窗 - 一次性指令
CustomGameEventManager.Send_ServerToPlayer(player, "show_selection_modal", {});

// ✅ 按键反馈 - 即时响应
CustomGameEventManager.Send_ServerToPlayer(player, "ability_activated", { slot: 0 });

// ✅ 错误提示 - 即时反馈
CustomGameEventManager.Send_ServerToPlayer(player, "show_error", { message: "Not enough mana" });
```

### 3.4 Rune Weaver NetTables 命名规范

```typescript
// 表名: rw_{功能域}
"rw_resources"        // 资源相关
"rw_selections"       // 选择系统状态
"rw_cooldowns"        // 技能冷却
"rw_progress"         // 进度/任务

// 键名: {玩家ID} 或 {实体ID}
"player_0"
"player_1"
"entity_123"

// 值结构: 按功能定义接口
interface RWResourcesData {
  [resourceType: string]: {
    current: number;
    max: number;
    regen?: number;
  };
}
```

### 3.5 UI 端订阅模式

```typescript
class ResourceBarUI {
  playerID: PlayerID;
  resources: Map<string, { current: number; max: number }> = new Map();
  
  constructor(playerID: PlayerID) {
    this.playerID = playerID;
    
    // 获取初始值
    const initialData = CustomNetTables.GetTableValue(
      "rw_resources", 
      `player_${playerID}`
    );
    if (initialData) {
      this.updateResources(initialData);
    }
    
    // 订阅变化
    this.subscribeToChanges();
  }
  
  subscribeToChanges(): void {
    CustomNetTables.SubscribeNetTableListener(
      "rw_resources",
      (tableName, key, value) => {
        if (key === `player_${this.playerID}`) {
          this.updateResources(value);
        }
      }
    );
  }
  
  updateResources(data: any): void {
    // 更新 UI
    for (const [type, values] of Object.entries(data)) {
      this.resources.set(type, values as any);
    }
    this.render();
  }
  
  render(): void {
    // 渲染资源条
  }
}
```

## 4. 对 Rune Weaver 的直接价值

| 场景 | 价值 |
|------|------|
| `ui.resource_bar` | NetTables 是最佳方案 |
| `ui.selection_modal` | 混合：状态用 NetTables，触发用 Event |
| Bridge Planning | 明确 Shared 层数据结构 |
| Code Generation | 生成对应的订阅代码 |

## 5. 当前最相关的 Pattern / Module

| Pattern | 同步方案 | 说明 |
|---------|----------|------|
| `ui.resource_bar` | NetTables | 持续显示数值 |
| `ui.selection_modal` | 混合 | 状态用 NetTables，显示指令用 Event |
| `rule.selection_flow` | NetTables | 存储当前选择状态 |
| `resource.basic_pool` | NetTables | 同步资源数值 |

## 6. 后续注意事项

- NetTables 数据对客户端可见，不要放敏感信息
- 单个 key 大小有限制，大数据分片存储
- 高频变化的数据考虑节流（throttle）
- 新玩家连接时会自动获取当前 NetTables 值
- 清理不再使用的 NetTables key（设为 null）

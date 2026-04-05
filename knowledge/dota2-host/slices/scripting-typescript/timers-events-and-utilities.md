# Timers、Events 与工具函数

## 1. 用途

解决延迟执行、定时任务、事件监听等通用工具问题。

## 2. 上游来源

- `references/dota2/docs/moddota_scripting_typescript.md`
- 章节: "Typescript Events"
- 补充: BMD Timers 库（x-template 内置）

## 3. 核心要点

### 3.1 Timers（定时器）

```typescript
// 一次性延迟执行
Timers.CreateTimer(delay, () => {
  // 延迟后执行
  DoSomething();
});

// 带上下文的延迟
Timers.CreateTimer(delay, () => {
  this.doSomething();  // 可以访问 this
});

// 循环定时器
Timers.CreateTimer(() => {
  this.tick();
  return interval;  // 返回下次执行的间隔（秒）
}, 
this  // 上下文
);

// 取消定时器
const timerId = Timers.CreateTimer(5.0, () => {
  // ...
});
Timers.RemoveTimer(timerId);
```

### 3.2 游戏事件监听

```typescript
// 监听游戏事件
GameEvents.OnGameEvent("entity_killed", (event) => {
  const victim = EntIndexToHScript(event.entindex_killed) as CDOTA_BaseNPC;
  const attacker = EntIndexToHScript(event.entindex_attacker) as CDOTA_BaseNPC;
  
  // 处理击杀逻辑
}, this);

// 常用游戏事件
"entity_killed"           // 单位死亡
"dota_player_killed"      // 玩家英雄死亡
"npc_spawned"             // NPC 生成
"dota_player_gained_level" // 玩家升级
"dota_item_picked_up"     // 物品拾取
"dota_rune_activated_server" // 神符激活
```

### 3.3 自定义事件（UI 通信）

**服务端发送 → UI 接收**:
```typescript
// Server 端
CustomGameEventManager.Send_ServerToPlayer(
  player,
  "show_selection_modal",
  {
    options: ["opt1", "opt2", "opt3"],
    timeRemaining: 10
  }
);

// 或发送给所有玩家
CustomGameEventManager.Send_ServerToAllClients(
  "update_resource_bar",
  { current: 75, max: 100 }
);
```

**UI 发送 → 服务端接收**:
```typescript
// Server 端监听
CustomGameEventManager.RegisterListener(
  "selection_made",
  (userId, event) => {
    const playerID = event.player_id;
    const optionId = event.option_id;
    
    // 处理选择
  }
);

// UI 端发送
GameEvents.SendCustomGameEventToServer("selection_made", {
  optionId: selectedOption
});
```

### 3.4 NetTables（数据同步）

```typescript
// 服务端设置
CustomNetTables.SetTableValue(
  "table_name",
  "key_name",
  { data: "value" }
);

// UI 端监听
CustomNetTables.SubscribeNetTableListener(
  "table_name",
  (tableName, key, value) => {
    $.Msg(`Data changed: ${key} = ${value}`);
  }
);

// UI 端获取
const data = CustomNetTables.GetTableValue("table_name", "key_name");
```

### 3.5 实用工具函数

```typescript
// 打印（仅在服务端）
if (IsServer()) {
  print("Debug message");
  DeepPrintTable(table);  // 打印表结构
}

// 随机数
const randomInt = RandomInt(min, max);
const randomFloat = RandomFloat(min, max);

// 范围限制
const clamped = Math.max(min, Math.min(value, max));

// 字符串分割
const parts = string.split(",");

// 类型检查
if (unit.IsHero()) { }
if (unit.IsCreep()) { }
if (unit.IsBuilding()) { }
if (unit.IsAlive()) { }
```

### 3.6 错误处理

```typescript
// 安全的单位查找
try {
  const target = this.GetCursorTarget();
  if (target && !target.IsNull() && target.IsAlive()) {
    // 安全操作
  }
} catch (e) {
  print(`Error: ${e}`);
}

// 防御性编程
function safeDo(fn: () => void) {
  try {
    fn();
  } catch (e) {
    print(`SafeDo error: ${e}`);
  }
}
```

## 4. 对 Rune Weaver 的直接价值

| 场景 | 价值 |
|------|------|
| `rule.selection_flow` | 定时器倒计时、事件通信 |
| `effect.dash` | 延迟重置、效果触发 |
| `resource.basic_pool` | 定时回复、事件通知 |

## 5. 当前最相关的 Pattern / Module

| Pattern | 工具使用 |
|---------|----------|
| `rule.selection_flow` | Timers（倒计时）、Custom Events |
| `effect.dash` | Timers（冷却重置） |
| `ui.*` | NetTables、Custom Events |

## 6. 后续注意事项

- Timers 回调返回 `number` 表示继续执行（间隔秒数）
- Timers 回调返回 `undefined` 或 `null` 表示停止
- 事件监听记得清理（避免内存泄漏）
- NetTables 数据大小有限制（约 16KB per key）
- 服务端/客户端代码要区分（`IsServer()` / `IsClient()`）

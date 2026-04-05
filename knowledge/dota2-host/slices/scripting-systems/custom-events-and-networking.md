# Custom Events 与网络通信

## 1. 用途

解决 Server ↔ UI 的自定义事件通信问题。这是 Rune Weaver 中 UI 响应服务端状态变化的核心机制。

## 2. 上游来源

- `references/dota2/docs/moddota_scripting_systems.md`
- 分散知识: Custom Mana System 等示例
- 补充: Panorama 文档中事件相关章节

## 3. 核心要点

### 3.1 通信方向总览

```
Server → Client (UI)
  ├── CustomGameEventManager.Send_ServerToPlayer()
  ├── CustomGameEventManager.Send_ServerToAllClients()
  └── NetTables (状态同步)

Client (UI) → Server
  └── GameEvents.SendCustomGameEventToServer()
```

### 3.2 Server → UI 事件

```typescript
// 发送给指定玩家
function sendToPlayer(playerID: PlayerID, eventName: string, data: object): void {
  const player = PlayerResource.GetPlayer(playerID);
  if (player) {
    CustomGameEventManager.Send_ServerToPlayer(
      player,
      eventName,
      data
    );
  }
}

// 发送给所有玩家
function broadcast(eventName: string, data: object): void {
  CustomGameEventManager.Send_ServerToAllClients(eventName, data);
}

// 使用示例：显示选择弹窗
function showSelectionModal(playerID: PlayerID, options: string[]): void {
  sendToPlayer(playerID, "show_selection_modal", {
    options: options,
    timeRemaining: 10
  });
}
```

### 3.3 UI → Server 事件

**UI 端发送**:
```typescript
// 发送选择结果到服务端
function submitSelection(optionId: string): void {
  GameEvents.SendCustomGameEventToServer("selection_made", {
    optionId: optionId
  });
}
```

**Server 端接收**:
```typescript
// 在 GameMode 初始化时注册
class GameMode {
  registerCustomEventListeners(): void {
    // 监听选择事件
    CustomGameEventManager.RegisterListener(
      "selection_made",
      (userId, event) => this.onSelectionMade(event)
    );
    
    // 监听其他 UI 事件
    CustomGameEventManager.RegisterListener(
      "ability_key_pressed",
      (userId, event) => this.onAbilityKeyPressed(event)
    );
  }
  
  onSelectionMade(event: { PlayerID: PlayerID; optionId: string }): void {
    const playerID = event.PlayerID;
    const optionId = event.optionId;
    
    print(`Player ${playerID} selected ${optionId}`);
    
    // 处理选择逻辑
    this.applySelectionReward(playerID, optionId);
  }
}
```

### 3.4 事件类型定义

```typescript
// shared/events.d.ts (推荐放在 shared 目录)

declare interface CustomEvents {
  // Server → UI
  show_selection_modal: {
    options: Array<{
      id: string;
      name: string;
      description: string;
    }>;
    timeRemaining: number;
  };
  
  hide_selection_modal: {};
  
  update_resource_bar: {
    current: number;
    max: number;
    resourceType: string;
  };
  
  // UI → Server
  selection_made: {
    optionId: string;
  };
  
  ability_key_pressed: {
    abilitySlot: number;
  };
}
```

### 3.5 与 NetTables 的选择

| 场景 | 推荐方式 | 原因 |
|------|----------|------|
| 选择弹窗显示 | Custom Event | 一次性触发 |
| 资源条数值 | NetTables | 持续同步 |
| 按键按下 | Custom Event | 即时响应 |
| 游戏状态 | NetTables | 多 UI 共享 |

## 4. 对 Rune Weaver 的直接价值

| 场景 | 价值 |
|------|------|
| `ui.selection_modal` | 显示/隐藏弹窗的事件通信 |
| `ui.resource_bar` | 建议用 NetTables 而非事件 |
| `input.key_binding` | 按键事件发送到服务端 |
| `rule.selection_flow` | 选择结果回传服务端 |

## 5. 当前最相关的 Pattern / Module

| Pattern | 通信方向 | 方式 |
|---------|----------|------|
| `ui.selection_modal` | S→U: 显示弹窗 | Custom Event |
| `ui.selection_modal` | U→S: 选择结果 | Custom Event |
| `ui.resource_bar` | S→U: 数值更新 | NetTables |
| `input.key_binding` | U→S: 按键触发 | Custom Event |

## 6. 后续注意事项

- Custom Event 是一次性的，NetTables 是状态同步
- 事件名要唯一，建议加前缀 `rw_`
- 不要在 Custom Event 中传递大量数据（用 NetTables）
- 服务端事件处理要验证玩家权限
- UI 发送事件前检查 `Game.IsInToolsMode()` 等状态

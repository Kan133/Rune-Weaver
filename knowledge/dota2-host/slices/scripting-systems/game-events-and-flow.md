# Game Events 与流程控制

## 1. 用途

解决游戏生命周期事件的处理，以及如何在不同阶段（游戏开始、英雄出生、回合等）执行逻辑。

## 2. 上游来源

- `references/dota2/docs/moddota_scripting_systems.md`
- 分散知识: 各系统示例中的事件处理
- 补充: dota-data `events.json`

## 3. 核心要点

### 3.1 游戏生命周期

```
Addon Initialized
    ↓
Game Mode Entity Created
    ↓
Precache (资源预加载)
    ↓
Activate (游戏激活)
    ↓
Player Connect
    ↓
Hero Spawn (npc_spawned)
    ↓
Game State Change (dota_game_state_change)
```

### 3.2 核心事件监听

```typescript
// game/scripts/src/GameMode.ts (或等效入口)

class GameMode {
  constructor() {
    this.configureGameMode();
    this.registerEventHandlers();
  }

  configureGameMode(): void {
    // 游戏模式配置
    GameRules.SetPreGameTime(30);      // 准备时间
    GameRules.SetPostGameTime(60);     // 结束时间
    GameRules.SetHeroRespawnEnabled(true);
    GameRules.SetHeroSelectionTime(30);
  }

  registerEventHandlers(): void {
    // 游戏状态变化
    ListenToGameEvent("dota_game_state_change", (event) => {
      const state = GameRules.State_Get();
      this.onGameStateChange(state);
    }, this);

    // 英雄出生
    ListenToGameEvent("npc_spawned", (event) => {
      const unit = EntIndexToHScript(event.entindex) as CDOTA_BaseNPC;
      if (unit.IsHero()) {
        this.onHeroSpawn(unit as CDOTA_BaseNPC_Hero);
      }
    }, this);

    // 玩家死亡
    ListenToGameEvent("dota_player_killed", (event) => {
      const playerID = event.PlayerID;
      this.onPlayerKilled(playerID);
    }, this);
  }

  onGameStateChange(state: DOTA_GameState): void {
    switch (state) {
      case DOTA_GameState.DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD:
        print("等待玩家加载...");
        break;
      
      case DOTA_GameState.DOTA_GAMERULES_STATE_HERO_SELECTION:
        print("英雄选择阶段");
        break;
      
      case DOTA_GameState.DOTA_GAMERULES_STATE_PRE_GAME:
        print("游戏准备阶段");
        break;
      
      case DOTA_GameState.DOTA_GAMERULES_STATE_GAME_IN_PROGRESS:
        print("游戏开始！");
        this.onGameStart();
        break;
      
      case DOTA_GameState.DOTA_GAMERULES_STATE_POST_GAME:
        print("游戏结束");
        break;
    }
  }

  onHeroSpawn(hero: CDOTA_BaseNPC_Hero): void {
    // 新英雄出生时的初始化
    print(`Hero spawned: ${hero.GetUnitName()}`);
  }

  onGameStart(): void {
    // 游戏正式开始时的初始化
    // 可以在这里激活 Rune Weaver 的功能
  }
}
```

### 3.3 游戏状态枚举

```typescript
DOTA_GameState.DOTA_GAMERULES_STATE_INIT                    // 初始化
DOTA_GameState.DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD // 等待加载
DOTA_GameState.DOTA_GAMERULES_STATE_HERO_SELECTION          // 英雄选择
DOTA_GameState.DOTA_GAMERULES_STATE_STRATEGY_TIME           // 策略时间
DOTA_GameState.DOTA_GAMERULES_STATE_TEAM_SHOWCASE           // 队伍展示
DOTA_GameState.DOTA_GAMERULES_STATE_PRE_GAME                // 游戏准备
DOTA_GameState.DOTA_GAMERULES_STATE_WAIT_FOR_MAP_TO_LOAD    // 等待地图
DOTA_GameState.DOTA_GAMERULES_STATE_GAME_IN_PROGRESS        // 游戏进行中
DOTA_GameState.DOTA_GAMERULES_STATE_POST_GAME               // 游戏结束
DOTA_GameState.DOTA_GAMERULES_STATE_DISCONNECT              // 断开连接
```

### 3.4 常用游戏事件

| 事件 | 触发时机 | 参数 |
|------|----------|------|
| `entity_killed` | 单位死亡 | entindex_killed, entindex_attacker |
| `dota_player_killed` | 玩家英雄死亡 | PlayerID |
| `npc_spawned` | NPC 生成 | entindex |
| `dota_player_gained_level` | 英雄升级 | player, level |
| `dota_item_picked_up` | 拾取物品 | PlayerID, itemname |
| `dota_item_purchased` | 购买物品 | PlayerID, itemname |
| `player_connect_full` | 玩家连接完成 | PlayerID |
| `player_disconnect` | 玩家断开 | PlayerID |

### 3.5 Rune Weaver 激活时机

```typescript
// 推荐：在游戏正式开始时激活
onGameStart(): void {
  // 激活 Rune Weaver 模块
  activateRuneWeaverModules();
  
  // 或者按需延迟激活
  Timers.CreateTimer(1.0, () => {
    activateRuneWeaverModules();
  });
}

// 或者：在每个英雄生成时激活相关功能
onHeroSpawn(hero: CDOTA_BaseNPC_Hero): void {
  // 为这个英雄激活特定功能
  activateFeaturesForHero(hero);
}
```

## 4. 对 Rune Weaver 的直接价值

| 场景 | 价值 |
|------|------|
| Bridge Planning | 确定 RW 激活的最佳时机 |
| `input.key_binding` | 在英雄出生后绑定按键 |
| `rule.selection_flow` | 游戏开始时初始化选择系统 |
| Host Validation | 检查游戏状态是否允许创建 feature |

## 5. 当前最相关的 Pattern / Module

| Pattern | 游戏事件使用 |
|---------|-------------|
| 所有 Pattern | `DOTA_GAMERULES_STATE_GAME_IN_PROGRESS` 时激活 |
| `effect.dash` | 英雄出生后添加技能 |
| `rule.selection_flow` | 升级时触发选择 |

## 6. 后续注意事项

- 不要在 `Init` 阶段执行游戏逻辑（玩家还未连接）
- 英雄可能多次生成（重生、复活），注意幂等性
- `npc_spawned` 会触发多次，需要过滤（`IsHero()`）
- 游戏状态变化可能触发多次，逻辑要幂等

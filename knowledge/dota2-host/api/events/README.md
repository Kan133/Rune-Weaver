# Dota2 Events Knowledge

## 1. 这类知识解决什么问题

Events（游戏事件）是 Dota2 自定义游戏开发中最核心的异步通信机制。它们解决：

- **何时触发逻辑**：玩家连接、技能释放、单位死亡等时机
- **如何响应游戏状态变化**：监听并响应游戏生命周期事件
- **Server-Client 通信**：跨边界的事件传递与同步
- **Trigger 系统实现**：为 `input.key_binding`、`rule.selection_flow` 等 Pattern 提供底层事件支撑

## 2. 当前最重要的原始来源

| 文件 | 用途 | 关键内容 |
|------|------|----------|
| `references/dota2/dota-data/files/events.json` | 引擎级事件 | 服务器生命周期、玩家连接/断开、游戏状态 |
| `references/dota2/dota-data/files/vscripts/api.json` | VScript API 事件 | 游戏玩法事件（单位死亡、技能释放等） |
| `references/dota2/dota-data/files/panorama/events.json` | Panorama UI 事件 | 面板事件、CSS 类操作、UI 交互 |

## 3. 对 Rune Weaver 当前阶段最直接的用途

### 支撑 Trigger Pattern

| Pattern | 依赖的事件类型 | 典型事件 |
|---------|---------------|----------|
| `input.key_binding` | Panorama Panel Events | `AddStyle`, `RemoveStyle`, `SetPanelEvent` |
| `rule.selection_flow` | 游戏状态事件 | `dota_player_killed`, `dota_player_gained_level` |
| `effect.dash` | 技能事件 | `dota_ability_start`, `dota_ability_executed` |

### 支撑 Bridge Planning

- **Server Bridge**：通过 `ListenToGameEvent` 监听引擎事件，在 `modules/index.ts` 激活点注册
- **UI Bridge**：通过 `$.RegisterForUnhandledEvent` 或面板事件，在 HUD 挂载点绑定

## 4. 当前最值得优先关注的 10 个事件

### Server 侧（VScript）

| 事件名 | 用途 | Pattern 关联 |
|--------|------|-------------|
| `game_rules_state_change` | 游戏状态切换（等待→选择→游戏） | 系统初始化 |
| `player_connect_full` | 玩家完成连接 | 玩家数据初始化 |
| `dota_player_gained_level` | 英雄升级 | `talent_selection` 触发点 |
| `dota_player_killed` | 玩家被击杀 | 死亡系统、复活机制 |
| `dota_ability_executed` | 技能执行 | `effect.dash` 触发验证 |
| `dota_unit_event` | 单位通用事件 | 效果应用监听 |

### Panorama 侧（UI）

| 事件名 | 用途 | Pattern 关联 |
|--------|------|-------------|
| `AddStyle` / `RemoveStyle` | CSS 类操作 | `ui.selection_modal` 样式切换 |
| `DOTAShowAbilityTooltip` | 显示技能提示 | `ui.key_hint` 交互 |
| `SetPanelEvent` | 面板事件绑定 | `ui.selection_modal` 点击处理 |
| `AsyncEvent` | 延迟事件触发 | UI 动画序列控制 |

## 5. 事件分类速查

### 按来源分类

```
engine events      -> 来自 Source 引擎（连接、状态变更）
game events        -> 来自 Dota2 游戏逻辑（击杀、升级）
panorama events    -> 来自 UI 系统（点击、样式变更）
```

### 按用途分类

```
lifecycle          -> 游戏生命周期（开始、结束、状态切换）
player             -> 玩家相关（连接、断开、操作）
combat             -> 战斗相关（击杀、伤害、治疗）
ability            -> 技能相关（施法、冷却、效果）
ui                 -> 界面相关（点击、悬停、动画）
```

## 6. 当前缺口

| 缺口 | 说明 | 优先级 |
|------|------|--------|
| 事件参数详细文档 | 部分事件字段含义不明确 | P1 |
| 事件触发顺序图 | 复杂交互的事件顺序（如技能释放链） | P2 |
| Server-Client 事件映射 | 哪些事件会自动同步到 Panorama | P1 |
| 自定义事件最佳实践 | Custom Game Event 的命名与组织 | P2 |

## 7. 使用建议

### 在 Pattern 中使用

```typescript
// input.key_binding 的底层实现参考
// 使用 panorama/events 中的 panel 事件

// effect.dash 的底层实现参考  
// 使用 events.json 中的 dota_ability_executed

// ui.selection_modal 的底层实现参考
// 使用 panorama/events 中的样式和交互事件
```

### 延伸阅读

- [原始事件数据](../../../references/dota2/dota-data/files/events.json)
- [Panorama 事件数据](../../../references/dota2/dota-data/files/panorama/events.json)
- [VScript API 事件](../../../references/dota2/dota-data/files/vscripts/api.json)

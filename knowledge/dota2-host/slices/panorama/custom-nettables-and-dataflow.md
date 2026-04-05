# Custom NetTables 与数据流

## 1. 用途

解决 Server → UI 的数据同步问题。这是 Rune Weaver 中资源系统、选择系统等需要实时状态显示的核心机制。

## 2. 上游来源

- `references/dota2/docs/moddota_panorama_docs.md`
- 章节: "Introduction to Panorama UI with TypeScript"
- 衍生知识: dota-data `panorama/events.json`

## 3. 核心要点

### 3.1 NetTable 基础

**服务端设置** (Lua/TypeScript):
```typescript
// 设置整个表
CustomNetTables.SetTableValue('talent_selection', 'player_0', {
  options: [
    { id: 'opt1', name: '强力攻击', description: '+10攻击力' },
    { id: 'opt2', name: '坚韧生命', description: '+100生命值' },
  ],
  timeRemaining: 10
});

// 修改单个值
CustomNetTables.SetTableValue('resource_bar', 'player_0', {
  current: 75,
  max: 100
});
```

**UI 订阅** (Panorama):
```typescript
// 订阅整个表的变化
CustomNetTables.SubscribeNetTableListener('talent_selection', (tableName, key, value) => {
  $.Msg(`NetTable ${tableName}.${key} changed:`, value);
  this.updateSelectionUI(value);
});

// 获取当前值（同步）
const data = CustomNetTables.GetTableValue('resource_bar', 'player_0');
```

### 3.2 命名空间建议

Rune Weaver 生成的 NetTable 命名：

| NetTable 名称 | 用途 | 相关 Pattern |
|--------------|------|--------------|
| `rw_talent_selection` | 天赋选择数据 | `ui.selection_modal` |
| `rw_resource_{id}` | 资源条数据 | `ui.resource_bar` |
| `rw_key_hints` | 按键提示状态 | `ui.key_hint` |

### 3.3 TypeScript 类型定义

```typescript
// shared/nettables.d.ts

declare interface TalentSelectionData {
  options: Array<{
    id: string;
    name: string;
    description: string;
    icon?: string;
  }>;
  timeRemaining: number;
  selectedId?: string;
}

declare interface ResourceBarData {
  current: number;
  max: number;
  label: string;
  color: string;
}
```

### 3.4 React 风格的数据绑定

```typescript
class ResourceBarComponent {
  panel: Panel;
  currentValue: number = 0;
  maxValue: number = 100;
  
  constructor(panel: Panel) {
    this.panel = panel;
    
    // 初始化数据
    const initialData = CustomNetTables.GetTableValue('rw_resource_energy', 'local_player');
    if (initialData) {
      this.updateDisplay(initialData);
    }
    
    // 订阅变化
    CustomNetTables.SubscribeNetTableListener('rw_resource_energy', (table, key, value) => {
      if (key === 'local_player') {
        this.updateDisplay(value);
      }
    });
  }
  
  updateDisplay(data: ResourceBarData) {
    this.currentValue = data.current;
    this.maxValue = data.max;
    
    const fillPanel = this.panel.FindChildTraverse('ResourceFill') as Panel;
    const percentage = (data.current / data.max) * 100;
    fillPanel.style.width = `${percentage}%`;
  }
}
```

## 4. 对 Rune Weaver 的直接价值

| 场景 | 价值 |
|------|------|
| `ui.resource_bar` | 实时显示服务端资源数值 |
| `ui.selection_modal` | 同步选择选项和倒计时 |
| `rule.selection_flow` | 服务端驱动 UI 状态变化 |
| Bridge Planning | 明确 Shared 层需要定义的数据结构 |

## 5. 当前最相关的 Pattern / Module

| Pattern | 数据流方向 | NetTable 用途 |
|---------|-----------|---------------|
| `ui.resource_bar` | Server → UI | 显示资源数值 |
| `ui.selection_modal` | Server → UI | 显示选项列表 |
| `input.key_binding` | UI → Server | 发送按键事件 |

## 6. 后续注意事项

- NetTable 数据大小有限制（约 16KB per key）
- 避免高频更新（每帧更新会导致性能问题）
- 敏感数据不要通过 NetTable 同步（客户端可见）
- 玩家 ID 作为 key 时要注意 spectator 情况

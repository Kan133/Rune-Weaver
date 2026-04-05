# Panel Events 与交互处理

## 1. 用途

解决 Panorama 中事件处理、用户交互、面板通信的核心机制。

## 2. 上游来源

- `references/dota2/docs/moddota_panorama_docs.md`
- 章节: "Button Examples", "Keybindings", "Introduction to Panorama UI"
- 关键页面: 
  - https://moddota.com/panorama/button-examples
  - https://moddota.com/panorama/keybindings

## 3. 核心要点

### 3.1 面板事件类型

**鼠标事件 (XML 内联)**:
```xml
<Panel 
  onactivate="$.Msg('Clicked!')"
  onmouseover="$.DispatchEvent('DOTAShowTextTooltip', 'Tooltip text')"
  onmouseout="$.DispatchEvent('DOTAHideTextTooltip')"
/>
```

**常用事件处理器**:
| 事件 | 触发时机 |
|------|----------|
| `onactivate` | 点击/激活 |
| `onmouseover` | 鼠标悬停进入 |
| `onmouseout` | 鼠标悬停离开 |
| `oncontextmenu` | 右键菜单 |
| `ondblclick` | 双击 |

### 3.2 TypeScript 事件处理

**推荐模式：类方法绑定**:
```typescript
class SelectionModal {
  panel: Panel;
  
  constructor(panel: Panel) {
    this.panel = panel;
    
    // 绑定按钮点击
    const confirmBtn = panel.FindChildTraverse('ConfirmButton') as Button;
    confirmBtn.SetPanelEvent('onactivate', () => this.onConfirm());
  }
  
  onConfirm() {
    // 处理确认逻辑
    $.Msg('Confirmed!');
  }
}
```

### 3.3 自定义按键绑定

**addoninfo.txt 配置**:
```
"Default_Keys"
{
    "01"
    {
        "Key"       "Q"
        "Command"   "+CustomGameAbility1"
        "Name"      "Ability 1"
    }
}
```

**Panorama 监听**:
```typescript
// 注册命令回调
Game.AddCommand('+CustomGameAbility1', () => {
  // 发送事件到服务端
  GameEvents.SendCustomGameEventToServer('ability_key_pressed', {
    abilitySlot: 0
  });
}, '', 0);
```

**前缀含义**:
| 前缀 | 示例 | 说明 |
|------|------|------|
| `+` | `+command` | 按下时触发 |
| `-` | `-command` | 释放时触发 |
| (无) | `command` | 按下和释放都触发 |

### 3.4 面板间通信

**父级查找**:
```typescript
// 获取父面板
const parent = this.panel.GetParent();

// 在父级中查找子元素
const child = parent.FindChild('ChildName');

// 跨层级查找
const deepChild = parent.FindChildTraverse('DeepChildName');
```

**事件冒泡**:
```typescript
// 向上发送事件
$.DispatchEvent('CustomEventName', arg1, arg2);
```

## 4. 对 Rune Weaver 的直接价值

| 场景 | 价值 |
|------|------|
| `ui.selection_modal` | 选择按钮的 `onactivate` 处理 |
| `ui.key_hint` | 按键绑定与显示同步 |
| `input.key_binding` | 自定义按键命令注册 |
| Bridge Planning | 明确 UI → Server 通信路径 |

## 5. 当前最相关的 Pattern / Module

| Pattern | 事件用途 |
|---------|----------|
| `ui.selection_modal` | 选项按钮 `onactivate` |
| `ui.key_hint` | 按键命令绑定 |
| `input.key_binding` | 自定义按键命令 |

## 6. 后续注意事项

- 避免在 XML 中写复杂 JavaScript 逻辑
- 优先使用 TypeScript 类方法处理事件
- 按键命令命名要保持唯一性（建议前缀 `CustomGame`）
- 事件处理器要记得解绑（在面板销毁时）

# Selection Modal 与 Button 模式

## 1. 用途

专门针对 `ui.selection_modal` Pattern 的实现指南。解决选择弹窗（如天赋抽取、奖励选择）的具体实现问题。

## 2. 上游来源

- `references/dota2/docs/moddota_panorama_docs.md`
- 章节: "Introduction to Panorama UI", "Button Examples"
- 关键页面: https://moddota.com/panorama/button-examples

## 3. 核心要点

### 3.1 Selection Modal 组件结构

**TypeScript 类结构**:
```typescript
interface SelectionOption {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

interface SelectionModalData {
  title: string;
  options: SelectionOption[];
  timeRemaining: number;
  selectedId?: string;
}

class SelectionModal {
  panel: Panel;
  optionsContainer: Panel;
  timerLabel: LabelPanel;
  data: SelectionModalData;
  
  constructor(panel: Panel, data: SelectionModalData) {
    this.panel = panel;
    this.data = data;
    
    // 查找子元素
    this.optionsContainer = panel.FindChildTraverse('OptionsContainer')!;
    this.timerLabel = panel.FindChildTraverse('TimerLabel') as LabelPanel;
    
    // 渲染选项
    this.renderOptions();
    
    // 启动倒计时
    this.startTimer();
  }
  
  renderOptions() {
    for (const option of this.data.options) {
      const optionPanel = this.createOptionPanel(option);
      this.optionsContainer.AddChild(optionPanel);
    }
  }
  
  createOptionPanel(option: SelectionOption): Panel {
    const panel = $.CreatePanel('Panel', this.optionsContainer, `option_${option.id}`);
    panel.AddClass('rw-selection-option');
    
    // 图标
    if (option.icon) {
      const img = $.CreatePanel('Image', panel, '');
      img.SetImage(option.icon);
    }
    
    // 名称
    const nameLabel = $.CreatePanel('Label', panel, '');
    nameLabel.text = option.name;
    nameLabel.AddClass('rw-option-name');
    
    // 描述
    const descLabel = $.CreatePanel('Label', panel, '');
    descLabel.text = option.description;
    descLabel.AddClass('rw-option-description');
    
    // 点击事件
    panel.SetPanelEvent('onactivate', () => this.onOptionSelected(option.id));
    
    return panel;
  }
  
  onOptionSelected(optionId: string) {
    // 发送到服务端
    GameEvents.SendCustomGameEventToServer('selection_made', {
      optionId: optionId
    });
    
    // 禁用所有选项
    this.disableAllOptions();
  }
  
  startTimer() {
    // 每秒更新倒计时
    $.Schedule(1.0, () => this.updateTimer());
  }
  
  updateTimer() {
    if (this.data.timeRemaining <= 0) return;
    
    this.data.timeRemaining--;
    this.timerLabel.text = `${this.data.timeRemaining}s`;
    
    if (this.data.timeRemaining > 0) {
      $.Schedule(1.0, () => this.updateTimer());
    } else {
      this.onTimeout();
    }
  }
  
  disableAllOptions() {
    // 添加禁用样式
    for (let i = 0; i < this.optionsContainer.GetChildCount(); i++) {
      this.optionsContainer.GetChild(i).AddClass('disabled');
    }
  }
}
```

### 3.2 Selection Modal 样式

```less
// rw_selection_modal.less

.rw-selection-modal {
  width: 700px;
  horizontal-align: center;
  vertical-align: center;
  background-color: #000000ee;
  border: 2px solid #444;
  border-radius: 8px;
  padding: 20px;
  flow-children: down;
}

.rw-selection-title {
  font-size: 28px;
  color: #fff;
  text-align: center;
  margin-bottom: 15px;
}

.rw-selection-timer {
  font-size: 20px;
  color: #f0ad4e;
  text-align: center;
  margin-bottom: 20px;
}

.rw-options-container {
  flow-children: right;
  horizontal-align: center;
}

.rw-selection-option {
  width: 200px;
  height: 300px;
  margin: 0 10px;
  background-color: #2a2a2a;
  border: 2px solid #444;
  border-radius: 6px;
  flow-children: down;
  padding: 15px;
  
  transition-property: background-color, border-color;
  transition-duration: 0.15s;
  
  &:hover {
    background-color: #3a3a3a;
    border-color: #666;
  }
  
  &:active {
    background-color: #222;
    sound: 'ui_generic_button_click';
  }
  
  &.disabled {
    background-color: #1a1a1a;
    border-color: #333;
    saturation: 0.3;
  }
}

.rw-option-icon {
  width: 80px;
  height: 80px;
  horizontal-align: center;
  margin-bottom: 15px;
}

.rw-option-name {
  font-size: 18px;
  color: #fff;
  text-align: center;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.rw-option-description {
  font-size: 14px;
  color: #aaa;
  text-align: center;
}
```

### 3.3 Button 模式速查

**标准按钮**:
```xml
<TextButton class="rw-valve-button" text="Confirm" />
```

**图标按钮**:
```xml
<Button class="rw-icon-button">
  <Image src="s2r://..." />
</Button>
```

**关闭按钮**:
```xml
<Button class="rw-close-button" onactivate="$.DispatchEvent('UIShowCustomLayoutPopup', '', 'file://{resources}/layout/custom_game/empty.xml')">
  <Label text="X" />
</Button>
```

## 4. 对 Rune Weaver 的直接价值

| 场景 | 价值 |
|------|------|
| 天赋抽取系统 | 完整的三选一/五选一 UI 实现 |
| 奖励选择 | 通用选择弹窗模板 |
| 商店系统 | 商品选择界面 |

## 5. 当前最相关的 Pattern / Module

- `ui.selection_modal` - 核心目标 Pattern
- `rule.selection_flow` - 服务端规则配合
- `data.weighted_pool` - 选项数据源

## 6. 后续注意事项

- 选择超时处理要优雅（默认选择第一个？随机？）
- 考虑网络延迟，选择后要有即时反馈
- 支持键盘选择（方向键 + Enter）
- 支持关闭按钮（某些场景不需要）

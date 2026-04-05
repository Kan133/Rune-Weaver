# Panorama 样式与 CSS 模式

## 1. 用途

解决 Rune Weaver 生成 UI 的样式定义问题。提供可复用的 CSS 模式，确保生成的 UI 具有统一的视觉风格。

## 2. 上游来源

- `references/dota2/docs/moddota_panorama_docs.md`
- 章节: "Introduction to Panorama UI", "Button Examples"
- 补充: dota-data `panorama/css.json`

## 3. 核心要点

### 3.1 CSS 文件组织

Rune Weaver 生成的样式文件：

```
content/panorama/src/rune_weaver/generated/ui/
├── index.tsx              # 组件索引
├── rw_dash_q.tsx          # 组件
├── rw_dash_q.less         # 组件样式 ✅
├── rw_talent_draw.tsx
└── rw_talent_draw.less    # 组件样式 ✅
```

**原则**: 每个 feature 组件对应一个 `.less` 文件。

### 3.2 Rune Weaver CSS 命名空间

**前缀规则**: 所有 RW 生成的样式类使用 `rw-` 前缀

```less
// ✅ 正确
.rw-selection-modal { }
.rw-key-hint { }
.rw-resource-bar { }

// ❌ 错误（可能污染宿主样式）
.selection-modal { }
.key-hint { }
```

### 3.3 常用样式模式

**弹性容器（水平排列）**:
```less
.rw-options-container {
  flow-children: right;
  horizontal-align: center;
}
```

**弹性容器（垂直排列）**:
```less
.rw-list-container {
  flow-children: down;
  vertical-align: top;
}
```

**绝对定位覆盖层**:
```less
.rw-overlay {
  width: 100%;
  height: 100%;
  position: 0 0 0;  // x y z
  background-color: #000000aa;
}
```

**按钮交互状态**:
```less
.rw-button {
  background-color: #333;
  transition-property: background-color;
  transition-duration: 0.15s;
  
  &:hover {
    background-color: #444;
  }
  
  &:active {
    background-color: #222;
    sound: 'ui_generic_button_click';
  }
}
```

**资源条渐变填充**:
```less
.rw-resource-fill {
  height: 100%;
  background-color: gradient(linear, 0% 0%, 100% 0%, from(#2d4a3e), to(#4a9)));
  transition-property: width;
  transition-duration: 0.2s;
  transition-timing-function: ease-out;
}
```

### 3.4 Valve 标准按钮样式（参考）

```less
// 从 Button Examples 提取的标准模式
.rw-valve-button {
  min-width: 192px;
  min-height: 36px;
  
  background-color: gradient(linear, 0% 0%, 0% 100%, from(#373d45), to(#4d5860));
  border-style: solid;
  border-width: 1px;
  border-top-color: #555555;
  border-left-color: #494949;
  border-bottom-color: #333333;
  border-right-color: #404040;
  
  &:hover {
    background-color: gradient(linear, 0% 0%, 0% 100%, from(#4c5561), to(#6c7d88));
  }
  
  &:active {
    background-color: gradient(linear, 0% 0%, 0% 100%, from(#393939), to(#555555));
    sound: 'ui_generic_button_click';
  }
  
  Label {
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #ffffff;
    text-align: center;
    text-shadow: 2px 2px 0px 1 #000000;
  }
}
```

### 3.5 颜色变量建议

```less
// 在全局样式或每个文件顶部定义
@rw-color-primary: #4a90d9;
@rw-color-success: #5cb85c;
@rw-color-warning: #f0ad4e;
@rw-color-danger: #d9534f;
@rw-color-bg-dark: #1a1a1a;
@rw-color-bg-panel: #2a2a2a;
@rw-color-border: #444444;
@rw-color-text: #ffffff;
@rw-color-text-muted: #888888;
```

## 4. 对 Rune Weaver 的直接价值

| 场景 | 价值 |
|------|------|
| `ui.selection_modal` | 弹窗样式、选项卡片布局 |
| `ui.key_hint` | 按键样式、定位 |
| `ui.resource_bar` | 进度条样式、颜色 |
| UI Generator | 可复用的 CSS 模板 |

## 5. 当前最相关的 Pattern / Module

| Pattern | 关键样式 |
|---------|----------|
| `ui.selection_modal` | 弹窗背景、选项卡片、悬停效果 |
| `ui.key_hint` | 按键样式、文字阴影 |
| `ui.resource_bar` | 进度条、渐变、过渡动画 |

## 6. 后续注意事项

- 始终使用 `rw-` 前缀避免污染
- 优先使用 flow-children 而非绝对定位
- 过渡动画 duration 建议 0.15-0.3s
- 考虑 16:9 和 16:10 分辨率适配
- 测试不同 UI 缩放比例（100%-150%）

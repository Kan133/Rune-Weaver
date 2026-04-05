# UIDesignSpec -> Template Mapping

## 1. 文档目的

定义 `UIDesignSpec` 字段如何真实影响 UI 模板输出。

目标：
- 让 UIDesignSpec 不只是概念，而能产生最小但真实的影响
- 建立规则化映射，而非自由生成
- 为 UI Adapter 实现提供清晰依据

---

## 2. 映射总览

| UIDesignSpec 字段 | 影响目标 | 映射方式 |
|------------------|----------|----------|
| `visualStyle.density` | LESS 变量、间距、尺寸 | 预设变量组 |
| `visualStyle.themeKeywords` | LESS 颜色变量、CSS 类 | 主题映射表 |
| `visualStyle.tone` | 文案风格、语气词 | 文案模板选择 |
| `copyHints` | 具体文案内容 | 占位符替换 |
| `feedbackHints` | 交互反馈样式 | CSS 类/动画 |
| `surfaces[].interactionMode` | 组件行为、容器样式 | 条件渲染/类名 |
| `surfaces[].autoDismissMs` | 自动关闭行为、倒计时显示 | 显式行为参数 |
| `surfaces[].layoutHints` | 布局方向、排列方式 | LESS 结构变化 |

---

## 3. 字段详细映射

### 3.1 `visualStyle.density` -> LESS 变量

**映射规则**:

| density | 影响变量 | low | medium | high |
|---------|----------|-----|--------|------|
| 模态框宽度 | `@modal-width` | 600px | 700px | 900px |
| 选项卡片间距 | `@option-gap` | 20px | 10px | 5px |
| 内边距 | `@padding` | 30px | 20px | 12px |
| 字体基础大小 | `@font-base` | 16px | 14px | 12px |
| 信息行数 | description 显示 | 3行 | 2行 | 1行 |

**示例映射代码**:

```less
// density = "medium" (默认)
@modal-width: 700px;
@option-gap: 10px;
@padding: 20px;
@font-base: 14px;

// density = "low" (宽松/大屏风格)
@modal-width: 600px;
@option-gap: 20px;
@padding: 30px;
@font-base: 16px;

// density = "high" (紧凑/信息密集)
@modal-width: 900px;
@option-gap: 5px;
@padding: 12px;
@font-base: 12px;
```

### 3.2 `visualStyle.themeKeywords` -> 颜色变量

**映射规则**:

| themeKeywords | 主色 | 辅色 | 背景 | 边框 |
|--------------|------|------|------|------|
| `["mystery", "dark"]` | `#6b4c9a` (紫) | `#4a9a8a` (青) | `#1a1a2e` | `#2d2d44` |
| `["tech", "scifi"]` | `#4a90d9` (蓝) | `#5cb85c` (绿) | `#0d1117` | `#30363d` |
| `["battle", "war"]` | `#d9534f` (红) | `#f0ad4e` (橙) | `#2e1a1a` | `#4d3333` |
| `["nature", "forest"]` | `#5cb85c` (绿) | `#8fbc8f` (浅绿) | `#1a2e1a` | `#2d442d` |
| 默认/功能型 | `#4a90d9` (蓝) | `#666` | `#000000ee` | `#444` |

**示例映射代码**:

```less
// themeKeywords = ["mystery", "dark"]
@primary-color: #6b4c9a;
@secondary-color: #4a9a8a;
@bg-color: #1a1a2e;
@border-color: #2d2d44;
@text-color: #e0e0ff;
@text-muted: #8888aa;

// 应用到组件
.rw-selection-modal {
  background-color: @bg-color;
  border-color: @border-color;
}

.rw-selection-option:hover {
  border-color: @primary-color;
  box-shadow: 0 0 8px fade(@primary-color, 30%);
}
```

### 3.3 `visualStyle.tone` + `copyHints` -> 文案

**映射规则**:

| tone | 标题风格 | 描述风格 | 示例 |
|------|----------|----------|------|
| `formal` | 正式、说明性 | 详细说明 | "请选择一个天赋" |
| `casual` | 轻松、口语化 | 简洁有趣 | "挑个能力呗" |
| `epic` | 史诗感 | 宏大叙事 | "选择你的命运" |
| `minimal` | 极简 | 无描述 | "选择" |

**结合 copyHints**:

```typescript
// UIDesignSpec
{
  visualStyle: { tone: "epic" },
  copyHints: ["使用'力量'、'命运'、'觉醒'等词汇"]
}

// 生成文案
// 默认: "请选择一个选项"
// epic + hints: "觉醒你的力量"
```

**模板占位符**:

```tsx
// TSX 中的占位符
<Label className="rw-selection-title" text={getTitleCopy(tone, copyHints)} />

// 文案映射函数 (simplified)
function getTitleCopy(tone: string, hints?: string[]): string {
  const defaults = {
    formal: "请选择一个选项",
    casual: "挑一个吧",
    epic: "选择你的命运",
    minimal: "选择"
  };
  
  // 如果有 copyHints，尝试匹配关键词
  // 实际实现可在 Adapter 层处理
  return defaults[tone] || defaults.formal;
}
```

### 3.4 `surfaces[].interactionMode` -> 组件行为

**映射规则**:

| interactionMode | 行为特征 | 样式变化 |
|----------------|----------|----------|
| `blocking` | 模态，必须响应 | 居中、遮罩、无关闭按钮 |
| `lightweight` | 非模态，可忽略 | 边缘位置、自动消失 |
| `persistent` | 常驻显示 | 固定位置、无动画 |

**示例映射（selection_modal）**:

```tsx
// interactionMode = "blocking"
<Panel className="rw-selection-modal blocking">
  {/* 居中显示，必须有遮罩 */}
  <Panel className="rw-modal-overlay" />
  <Panel className="rw-modal-content center">
    {/* 无关闭按钮，必须选择 */}
  </Panel>
</Panel>

// interactionMode = "lightweight"
<Panel className="rw-selection-modal lightweight">
  {/* 可能显示在角落，可忽略 */}
  <Panel className="rw-modal-content corner">
    {/* 可能有倒计时自动关闭 */}
  </Panel>
</Panel>
```

**对应 LESS**:

```less
.rw-selection-modal {
  &.blocking {
    width: 100%;
    height: 100%;
    background-color: #000000aa;  // 遮罩
    
    .rw-modal-content {
      horizontal-align: center;
      vertical-align: center;
    }
  }
  
  &.lightweight {
    background-color: transparent;
    
    .rw-modal-content {
      horizontal-align: right;
      vertical-align: top;
      margin: 20px;
    }
  }
}
```

### 3.5 `surfaces[].layoutHints` -> 布局结构

**映射规则**:

| layoutHints | 布局变化 |
|------------|----------|
| `["horizontal"]` | 选项水平排列 (flow-children: right) |
| `["vertical"]` | 选项垂直排列 (flow-children: down) |
| `["grid"]` | 网格排列 (需更复杂布局) |
| `["compact"]` | 紧凑模式，减少间距 |

**示例映射**:

```less
.rw-selection-options {
  // layoutHints = ["horizontal"] (默认)
  flow-children: right;
  
  // layoutHints = ["vertical"]
  &.vertical {
    flow-children: down;
    
    .rw-selection-option {
      width: 100%;
      height: 80px;
      flow-children: right;
    }
  }
}
```

### 3.6 `surfaces[].autoDismissMs` -> 自动关闭行为

**映射规则**:

| autoDismissMs | 行为 |
|--------------|------|
| 未提供 | 不自动关闭 |
| `> 0` | 允许倒计时显示，并在时间到后关闭 |

**说明**:

- `autoDismissMs` 是独立行为参数
- 不应再通过 `interactionMode` 推断“是否有计时器”
- `interactionMode` 只表达交互强度

### 3.7 `feedbackHints` -> 交互反馈

**映射规则**:

| feedbackHints | 效果 |
|--------------|------|
| `["sound"]` | 添加点击音效 |
| `["animation"]` | 添加过渡动画 |
| `["particle"]` | 添加粒子效果 (高级) |

**示例映射**:

```less
.rw-selection-option {
  &:active {
    // feedbackHints 包含 "sound"
    sound: 'ui_generic_button_click';
    
    // feedbackHints 包含 "animation"
    animation-name: click-pulse;
    animation-duration: 0.2s;
  }
}

@keyframes click-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(0.95); }
  100% { transform: scale(1); }
}
```

---

## 4. 完整示例

### 示例 1：同一个 Pattern，不同 UIDesignSpec

**需求 A：功能型选择弹窗**

```typescript
// UIDesignSpec A
{
  surfaces: [{
    type: "modal",
    interactionMode: "blocking",
    layoutHints: ["horizontal"]
  }],
  visualStyle: {
    density: "medium",
    themeKeywords: [],  // 默认功能型
    tone: "formal"
  },
  copyHints: ["简洁说明"]
}
```

**生成结果 A**：
- TSX: 标准 blocking modal，水平选项排列
- LESS: 默认蓝灰色调，中等间距，正式文案

---

**需求 B：神秘风格天赋选择**

```typescript
// UIDesignSpec B
{
  surfaces: [{
    type: "modal", 
    interactionMode: "blocking",
    layoutHints: ["horizontal"]
  }],
  visualStyle: {
    density: "low",  // 更宽松
    themeKeywords: ["mystery", "dark"],
    tone: "epic"
  },
  copyHints: ["使用'觉醒'、'命运'等词汇"],
  feedbackHints: ["sound", "animation"]
}
```

**生成结果 B**：
- TSX: 同 A（结构不变）
- LESS: 紫青色调，更宽间距，史诗文案
- 附加：点击音效和动画

**关键差异**：

| 方面 | A (功能型) | B (神秘风) |
|------|-----------|-----------|
| 主色调 | #4a90d9 (蓝) | #6b4c9a (紫) |
| 模态框宽度 | 700px | 600px |
| 卡片间距 | 10px | 20px |
| 标题文案 | "请选择一个天赋" | "觉醒你的命运" |
| 点击反馈 | 无 | 音效 + 动画 |

### 示例 2：key_hint 的不同密度

**需求 C：简洁按键提示**

```typescript
{
  visualStyle: {
    density: "low"
  }
}
```

**生成 LESS**：
```less
@rw-key-size: 48px;  // 更大
.rw-ability-name {
  font-size: 18px;  // 更大字体
  margin-left: 15px;
}
```

**需求 D：紧凑按键提示**

```typescript
{
  visualStyle: {
    density: "high"
  }
}
```

**生成 LESS**：
```less
@rw-key-size: 32px;  // 更小
.rw-ability-name {
  font-size: 12px;  // 更小字体
  margin-left: 6px;
}
```

---

## 5. 映射实现策略

### 5.1 规则化映射（优先）

```typescript
// adapters/dota2/ui/style-mappings.ts

export const densityMappings = {
  low: { modalWidth: 600, gap: 20, padding: 30, fontBase: 16 },
  medium: { modalWidth: 700, gap: 10, padding: 20, fontBase: 14 },
  high: { modalWidth: 900, gap: 5, padding: 12, fontBase: 12 }
};

export const themeMappings = {
  mystery: { primary: "#6b4c9a", secondary: "#4a9a8a", bg: "#1a1a2e" },
  tech: { primary: "#4a90d9", secondary: "#5cb85c", bg: "#0d1117" },
  battle: { primary: "#d9534f", secondary: "#f0ad4e", bg: "#2e1a1a" }
};

export function generateLessVariables(spec: UIDesignSpec): string {
  const density = densityMappings[spec.visualStyle.density || "medium"];
  const theme = themeMappings[spec.visualStyle.themeKeywords?.[0]] || themeMappings.default;
  
  return `
@modal-width: ${density.modalWidth}px;
@option-gap: ${density.gap}px;
@padding: ${density.padding}px;
@font-base: ${density.fontBase}px;

@primary-color: ${theme.primary};
@secondary-color: ${theme.secondary};
@bg-color: ${theme.bg};
  `;
}
```

### 5.2 模板占位符替换

```typescript
// 模板文件中的占位符
const lessTemplate = `
// {{STYLE_VARIABLES}}

.rw-selection-modal {
  width: @modal-width;
  background-color: @bg-color;
}
`;

// 生成时替换
const output = lessTemplate.replace(
  "{{STYLE_VARIABLES}}", 
  generateLessVariables(spec)
);
```

---

## 6. 边界与限制

### 6.1 UIDesignSpec 不控制的内容

| 不控制 | 原因 | 由谁决定 |
|--------|------|----------|
| 组件结构 | 属于 Pattern 职责 | `ui.selection_modal` |
| 数据流 | 属于 Host Binding | Adapter 固定实现 |
| 复杂布局计算 | 超出规则化范围 | 暂不实现 |
| 任意 CSS | 属于自由生成 | 不在本轮范围 |

### 6.2 当前保留默认值的字段

| 字段 | 默认值 | 原因 |
|------|--------|------|
| 动画时长 | 0.2s | 先固定，后续可参数化 |
| 字体族 | defaultFont | Panorama 默认 |
| 圆角大小 | 6-8px | 先固定 |
| 阴影强度 | 基于主题色 | 自动计算 |

---

## 7. 验收标准

- ✅ UIDesignSpec 每个字段都有明确的映射目标
- ✅ 至少 2 个完整示例展示同一 Pattern 的不同 Spec 输出
- ✅ 映射以规则化为主，非自由生成
- ✅ 边界清晰：Spec 控制什么，不控制什么

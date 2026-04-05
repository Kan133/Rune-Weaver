# Dota2 Panorama Knowledge

## 1. 这类知识解决什么问题

Panorama 是 Dota2 的 UI 框架，基于 Web 技术（XML + CSS + JavaScript-like）。它解决：

- **如何构建游戏 UI**：技能面板、血条、选择弹窗等界面元素
- **Server-UI 通信**：网络表（NetTable）、自定义事件、数据绑定
- **样式与动画**：CSS 类控制、过渡动画、响应式布局
- **为 Rune Weaver UI Pattern 提供宿主实现基础**

## 2. 当前最重要的原始来源

| 文件 | 用途 | 关键内容 |
|------|------|----------|
| `references/dota2/dota-data/files/panorama/events.json` | UI 事件 | 面板事件、样式操作、工具提示 |
| `references/dota2/dota-data/files/panorama/enums.json` | UI 枚举 | 面板类型、DOTA 特定枚举 |
| `references/dota2/dota-data/files/panorama/css.json` | 样式属性 | Panorama CSS 属性参考 |
| `references/dota2/dota-data/files/vscripts/api.json` | NetTable API | Server→Client 数据同步 |

## 3. 对 Rune Weaver 当前阶段最直接的用途

### 支撑 UI Pattern 实现

| Pattern | Panorama 知识点 | 关键 API/Event |
|---------|----------------|----------------|
| `ui.selection_modal` | 面板创建、样式类、事件绑定 | `AddStyle`, `RemoveStyle`, `SetPanelEvent` |
| `ui.key_hint` | 工具提示、静态面板 | `DOTAShowAbilityTooltip`, `DOTAHideAbilityTooltip` |
| `ui.resource_bar` | 进度条、数据绑定 | NetTable 监听, CSS width/height |

### 支撑 HUD Bridge

- **挂载点**：`content/panorama/src/hud/script.tsx`
- **Rune Weaver 根面板**：通过 `rune_weaver/generated/ui/index.tsx` 聚合所有 RW UI
- **数据流**：Server → NetTable → Panorama 监听 → UI 更新

## 4. 知识分类速查

### Panel Events（面板事件）

用于响应用户交互和触发动画：

| 事件 | 用途 | 示例场景 |
|------|------|----------|
| `AddStyle` | 添加 CSS 类 | 选中状态高亮 |
| `RemoveStyle` | 移除 CSS 类 | 取消选中状态 |
| `AddTimedStyle` | 临时 CSS 类（带超时） | 冷却动画 |
| `SetPanelEvent` | 绑定点击/悬停事件 | 按钮交互 |
| `AsyncEvent` | 延迟触发事件 | 动画序列 |

### CSS/样式

Panorama 使用类 CSS 语法，但属性集有差异：

| 属性类别 | 关键属性 | 用途 |
|----------|----------|------|
| 布局 | `flow-children`, `width`, `height` | 面板排布 |
| 视觉 | `background-color`, `border`, `opacity` | 外观控制 |
| 变换 | `transform`, `transition` | 动画效果 |
| 文字 | `color`, `font-size`, `text-align` | 文本样式 |

### NetTable（网络表）

Server 与 Panorama 通信的核心机制：

```javascript
// Server 端（VScript）
CustomNetTables.SetTableValue("rune_weaver", "talent_pool", {talents: [...]})

// Panorama 端
$.RegisterForUnhandledEvent("DOTA_Custom_Net_Table_Value", (tableName, key, value) => {
  if (tableName === "rune_weaver") {
    // 更新 UI
  }
});
```

## 5. 当前最值得优先关注的 10 个 API/Event

| 名称 | 类型 | 用途 | Pattern 关联 |
|------|------|------|-------------|
| `AddStyle` | Event | 添加样式类 | `ui.selection_modal` |
| `RemoveStyle` | Event | 移除样式类 | `ui.selection_modal` |
| `SetPanelEvent` | Event | 绑定面板事件 | 所有交互式 UI |
| `DOTAShowAbilityTooltip` | Event | 显示技能提示 | `ui.key_hint` |
| `DOTA_Custom_Net_Table_Value` | Event | 网络表更新 | 所有数据驱动 UI |
| `$.CreatePanel` | API | 动态创建面板 | `ui.selection_modal` |
| `$.GetContextPanel` | API | 获取上下文面板 | HUD 根挂载 |
| `$.RegisterForUnhandledEvent` | API | 注册全局事件监听 | 网络表同步 |
| `AddClass` | Method | 面板添加类 | 样式切换 |
| `RemoveClass` | Method | 面板移除类 | 样式切换 |

## 6. 当前缺口

| 缺口 | 说明 | 优先级 |
|------|------|--------|
| 完整 CSS 属性清单 | `css.json` 不完整，部分属性缺失说明 | P2 |
| 布局最佳实践 | `flow-children` 等布局属性的详细行为 | P2 |
| 性能优化指南 | 大量面板更新时的优化策略 | P3 |
| TypeScript 类型定义 | Panorama API 的完整类型定义 | P1 |
| 响应式设计 | 不同分辨率下的适配策略 | P3 |

## 7. 在 Rune Weaver Pattern 中的使用映射

### ui.selection_modal

```xml
<!-- layout.xml -->
<Panel class="selection-modal">
  <Panel id="option-container" flow-children="right">
    <!-- 动态生成的选项 -->
  </Panel>
</Panel>
```

```javascript
// script.js
// 事件绑定参考
panel.SetPanelEvent('onactivate', () => {
  panel.AddClass('selected');
  // 发送选择到 Server
});

// 样式切换参考  
panel.AddStyle('highlight');
$.Schedule(0.3, () => panel.RemoveStyle('highlight'));
```

### ui.key_hint

```xml
<!-- layout.xml -->
<Panel class="key-hint">
  <Label text="{s:key_name}" />
  <DOTAAbilityImage abilityname="{s:ability_name}" />
</Panel>
```

```javascript
// 工具提示参考
abilityImage.SetPanelEvent('onmouseover', () => {
  $.DispatchEvent('DOTAShowAbilityTooltip', abilityImage, abilityName);
});
```

## 8. 延伸阅读

- [原始 Panorama 事件](../../../references/dota2/dota-data/files/panorama/events.json)
- [Panorama 枚举](../../../references/dota2/dota-data/files/panorama/enums.json)
- [Panorama CSS 属性](../../../references/dota2/dota-data/files/panorama/css.json)
- [VScript NetTable API](../../../references/dota2/dota-data/files/vscripts/api.json)

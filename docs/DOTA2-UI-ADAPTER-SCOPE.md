# Dota2 UI Adapter 第一批支持范围

## 1. 文档目的

本文档收紧 UI Adapter 的第一批支持范围，明确：

- 只支持哪 3 个 UI Pattern
- 每个 Pattern 的最小输出形态
- 落在哪个宿主目录
- 依赖哪些 bridge / host context
- 暂不支持什么

## 2. 第一批支持的 3 个 Pattern

| Pattern | 用途 | 对应用例 |
|---------|------|----------|
| `ui.selection_modal` | 选择弹窗（三选一/多选一） | 天赋抽取、奖励选择 |
| `ui.key_hint` | 按键提示 | 技能按键说明 |
| `ui.resource_bar` | 资源条显示 | 能量、怒气、层数 |

## 3. Pattern 详情

### 3.1 `ui.selection_modal`

**功能**：弹出式选择界面，支持多选一

**最小输出形态**：

```tsx
// content/panorama/src/rune_weaver/generated/ui/rw_talent_draw.tsx

import React, { useState } from "react";

interface SelectionOption {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

interface SelectionModalProps {
  title: string;
  options: SelectionOption[];
  onSelect: (optionId: string) => void;
}

export function RwTalentDrawModal(props: SelectionModalProps): React.ReactElement {
  const { title, options, onSelect } = props;
  
  return (
    <Panel className="rw-selection-modal">
      <Label className="rw-selection-title" text={title} />
      <Panel className="rw-selection-options">
        {options.map(option => (
          <Panel 
            key={option.id}
            className="rw-selection-option"
            onactivate={() => onSelect(option.id)}
          >
            {option.icon && <Image src={option.icon} />}
            <Label className="rw-option-name" text={option.name} />
            <Label className="rw-option-desc" text={option.description} />
          </Panel>
        ))}
      </Panel>
    </Panel>
  );
}
```

**样式文件**：

```less
// content/panorama/src/rune_weaver/generated/ui/rw_talent_draw.less

.rw-selection-modal {
  width: 600px;
  height: 400px;
  background-color: #000000ee;
  border: 2px solid #444;
  border-radius: 8px;
  padding: 20px;
  
  .rw-selection-title {
    font-size: 24px;
    color: #fff;
    text-align: center;
    margin-bottom: 20px;
  }
  
  .rw-selection-options {
    flow-children: right;
    horizontal-align: center;
  }
  
  .rw-selection-option {
    width: 180px;
    height: 280px;
    margin: 0 10px;
    background-color: #333;
    border: 1px solid #555;
    
    &:hover {
      background-color: #444;
      border-color: #888;
    }
  }
}
```

**宿主目录**：`content/panorama/src/rune_weaver/generated/ui/`

**依赖 bridge**：
- `content/panorama/src/rune_weaver/index.tsx` (RW 总入口)
- `content/panorama/src/rune_weaver/generated/ui/index.tsx` (索引刷新)

**依赖 host context**：
- NetTable 监听数据变化
- 服务端发送显示/隐藏指令

### 3.2 `ui.key_hint`

**功能**：按键提示，显示技能绑定的按键

**最小输出形态**：

```tsx
// content/panorama/src/rune_weaver/generated/ui/rw_dash_q.tsx

import React from "react";

interface KeyHintProps {
  keyBinding: string;
  abilityName: string;
  visible: boolean;
}

export function RwDashQHint(props: KeyHintProps): React.ReactElement | null {
  const { keyBinding, abilityName, visible } = props;
  
  if (!visible) return null;
  
  return (
    <Panel className="rw-key-hint">
      <Panel className="rw-key-binding">
        <Label text={keyBinding} />
      </Panel>
      <Label className="rw-ability-name" text={abilityName} />
    </Panel>
  );
}
```

**样式文件**：

```less
// content/panorama/src/rune_weaver/generated/ui/rw_dash_q.less

.rw-key-hint {
  flow-children: right;
  vertical-align: bottom;
  horizontal-align: right;
  margin: 20px;
  
  .rw-key-binding {
    width: 40px;
    height: 40px;
    background-color: #000000aa;
    border: 2px solid #fff;
    border-radius: 4px;
    
    Label {
      font-size: 20px;
      color: #fff;
      horizontal-align: center;
      vertical-align: center;
    }
  }
  
  .rw-ability-name {
    margin-left: 10px;
    font-size: 16px;
    color: #fff;
    vertical-align: center;
  }
}
```

**宿主目录**：`content/panorama/src/rune_weaver/generated/ui/`

**依赖 bridge**：
- 同上

**依赖 host context**：
- 无（纯展示组件）

### 3.3 `ui.resource_bar`

**功能**：资源条显示，支持多种资源类型

**最小输出形态**：

```tsx
// content/panorama/src/rune_weaver/generated/ui/rw_energy_bar.tsx

import React from "react";

interface ResourceBarProps {
  current: number;
  max: number;
  label: string;
  color: string;
}

export function RwEnergyBar(props: ResourceBarProps): React.ReactElement {
  const { current, max, label, color } = props;
  const percentage = max > 0 ? (current / max) * 100 : 0;
  
  return (
    <Panel className="rw-resource-bar">
      <Label className="rw-resource-label" text={label} />
      <Panel className="rw-resource-track">
        <Panel 
          className="rw-resource-fill"
          style={{ backgroundColor: color, width: `${percentage}%` }}
        />
      </Panel>
      <Label className="rw-resource-value" text={`${current}/${max}`} />
    </Panel>
  );
}
```

**样式文件**：

```less
// content/panorama/src/rune_weaver/generated/ui/rw_energy_bar.less

.rw-resource-bar {
  width: 300px;
  height: 40px;
  flow-children: right;
  
  .rw-resource-label {
    width: 80px;
    font-size: 14px;
    color: #fff;
    vertical-align: center;
  }
  
  .rw-resource-track {
    width: 150px;
    height: 20px;
    background-color: #333;
    border: 1px solid #555;
    vertical-align: center;
  }
  
  .rw-resource-fill {
    height: 100%;
    transition: width 0.2s ease;
  }
  
  .rw-resource-value {
    width: 70px;
    font-size: 14px;
    color: #fff;
    text-align: right;
    vertical-align: center;
  }
}
```

**宿主目录**：`content/panorama/src/rune_weaver/generated/ui/`

**依赖 bridge**：
- 同上

**依赖 host context**：
- NetTable 监听资源数值变化

## 4. 共同依赖

### 4.1 Bridge 文件

所有 3 个 UI Pattern 共同依赖：

| 文件 | 动作 | 说明 |
|------|------|------|
| `content/panorama/src/rune_weaver/index.tsx` | create | RW UI 总入口 |
| `content/panorama/src/rune_weaver/generated/ui/index.tsx` | refresh | UI 索引 |
| `content/panorama/src/hud/script.tsx` | inject_once | 宿主 HUD 接线 |

### 4.2 运行时依赖

```typescript
// content/panorama/src/rune_weaver/runtime.ts

/**
 * 监听 NetTable 数据变化
 */
export function useNetTable<T>(tableName: string, key: string): T | null;

/**
 * 发送自定义事件到服务端
 */
export function sendServerEvent(eventName: string, data: unknown): void;
```

## 5. 暂不支持的功能

| 功能 | 原因 | 后续计划 |
|------|------|----------|
| 复杂动画 | 超出第一阶段范围 | Phase 2 |
| 拖拽交互 | 需要额外事件处理 | Phase 2 |
| 复杂布局系统 | 优先稳定基础组件 | Phase 2 |
| 主题/皮肤切换 | 先固定基础样式 | Phase 2 |
| 自定义粒子特效 | 需要 Panorama 高级特性 | Phase 3 |

## 6. 与 Assembler 的关系

UI Adapter 是 Assembler 的子组件：

```
AssemblyPlan
  ↓
Assembler
  ↓ (分发到)
  ├── Server Assembler
  ├── Shared Assembler  
  └── UI Adapter (本文档)
        ↓
        ├── selection_modal 模板
        ├── key_hint 模板
        └── resource_bar 模板
```

## 7. 验收标准

- ✅ 3 个 Pattern 都有明确的输出模板
- ✅ 模板包含完整的 TSX + LESS
- ✅ 依赖的 bridge 文件明确
- ✅ 暂不支持的功能列表清晰
- ✅ 与 Assembler 有清晰边界

## 8. 当前结论

UI Adapter 第一批只聚焦：

1. **选择弹窗** - 支撑选择类系统
2. **按键提示** - 支撑输入类功能
3. **资源条** - 支撑资源类功能

这三个 Pattern 覆盖了：
- 用例 A（微功能）: key_hint
- 用例 B（独立系统）: selection_modal
- 用例 C（跨系统组合）: resource_bar + key_hint

守住这个范围，不提前扩展到其他 UI Pattern。

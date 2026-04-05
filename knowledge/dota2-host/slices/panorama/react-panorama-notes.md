# React Panorama 注意事项

## 1. 用途

记录在使用 React 风格开发 Panorama UI 时的特殊注意事项。Rune Weaver 生成的 TSX 代码需要遵循这些约束。

## 2. 上游来源

- `references/dota2/docs/moddota_panorama_docs.md`
- 章节: "React"
- 关键页面: https://moddota.com/panorama/react

## 3. 核心要点

### 3.1 Panorama 的 React 支持

Dota2 Panorama **原生不支持 React**。需要使用 `react-panorama` 库：

```bash
npm install react-panorama
```

### 3.2 Rune Weaver 的立场

**Phase 1 策略**: 不使用 React

原因：
- 增加运行时依赖
- 增加构建复杂度
- 对宿主有额外要求

**Phase 1 使用**: 原生 TypeScript + 类组件模式

```typescript
// ✅ Rune Weaver Phase 1 生成
class MyComponent {
  panel: Panel;
  
  constructor(panel: Panel) {
    this.panel = panel;
  }
  
  render() {
    // 原生 Panorama API
  }
}
```

### 3.3 未来可能的 React 迁移

如果后续决定支持 React，需要考虑：

```typescript
// 未来可能的 React 组件
import React from 'react';
import { render } from 'react-panorama';

interface Props {
  current: number;
  max: number;
}

const ResourceBar: React.FC<Props> = ({ current, max }) => {
  const percentage = (current / max) * 100;
  
  return (
    <Panel className="rw-resource-bar">
      <Panel 
        className="rw-resource-fill" 
        style={{ width: `${percentage}%` }}
      />
    </Panel>
  );
};

// 渲染
render(<ResourceBar current={50} max={100} />, $.GetContextPanel());
```

### 3.4 类组件 vs React 组件对比

| 特性 | 原生类组件 (Phase 1) | React 组件 (未来) |
|------|---------------------|------------------|
| 依赖 | 无 | react-panorama |
| 构建 | 简单 | 需配置 |
| 状态管理 | 手动 | useState/useEffect |
| JSX | 不支持 | 支持 |
| 组件复用 | 继承/组合 | 函数组合 |

### 3.5 为 React 预留接口

虽然 Phase 1 不用 React，但可以预留接口：

```typescript
// adapters/dota2/ui/types.ts

export interface UIComponent {
  /** 组件ID */
  id: string;
  /** 渲染函数 (原生模式) */
  renderNative(parent: Panel): Panel;
  /** 渲染函数 (React模式 - 预留) */
  renderReact?(): React.ReactElement;
}
```

## 4. 对 Rune Weaver 的直接价值

| 场景 | 价值 |
|------|------|
| 代码生成 | 明确生成原生 TS，不生成 React JSX |
| 依赖管理 | Phase 1 不需要 react-panorama |
| 未来扩展 | 保留 React 迁移可能性 |
| 宿主兼容 | 不增加宿主构建负担 |

## 5. 当前最相关的 Pattern / Module

所有 UI Pattern：
- `ui.selection_modal`
- `ui.key_hint`
- `ui.resource_bar`

**实现方式**: 原生 TypeScript 类组件

## 6. 后续注意事项

- Phase 1 坚守原生 TypeScript
- 如果要支持 React，需要重新评估宿主依赖
- 原生代码向 React 迁移需要重写
- 考虑提供两种生成模式的选择（远期）

## 7. 参考：原生 vs React 代码对比

**原生实现**:
```typescript
class KeyHint {
  panel: Panel;
  label: LabelPanel;
  
  constructor(parent: Panel, key: string) {
    this.panel = $.CreatePanel('Panel', parent, '');
    this.panel.AddClass('rw-key-hint');
    
    this.label = $.CreatePanel('Label', this.panel, '') as LabelPanel;
    this.label.text = key;
  }
  
  setKey(key: string) {
    this.label.text = key;
  }
}
```

**React 实现（参考，Phase 1 不用）**:
```tsx
const KeyHint: React.FC<{ keyBinding: string }> = ({ keyBinding }) => {
  return (
    <Panel className="rw-key-hint">
      <Label text={keyBinding} />
    </Panel>
  );
};
```

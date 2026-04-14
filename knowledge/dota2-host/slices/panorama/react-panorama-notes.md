# React Panorama 注意事项

## 1. 用途

记录在使用 React 风格开发 Panorama UI 时的特殊注意事项。Rune Weaver 生成的 TSX 代码需要遵循这些约束。

## 2. 上游来源

- `references/dota2/docs/moddota_panorama_docs.md`
- 章节: "React"
- 关键页面: https://moddota.com/panorama/react

## 3. 核心要点

### 3.1 Panorama 的 React 支持

Dota2 Panorama **原生不支持 React**。React 需要宿主模板提供对应运行时和构建链。

Rune Weaver 当前验证过的 x-template host 使用 `react-panorama-x` 风格的 React/Panorama 管线，而不是浏览器 React。

```bash
yarn install
```

### 3.2 Rune Weaver 的立场

**当前 Dota2 x-template 策略**: 可以生成 React TSX，但必须遵守 UI Safer Profile。

原因：
- Talent Draw runtime proof 已经验证 React TSX 可以在 x-template 中工作
- React 事件订阅和 payload 处理有明确坑点
- LESS 不能从 TSX 直接 import，必须走 HUD `styles.less`

必须遵守：

- [UI-SAFER-PROFILE.md](../../../../docs/UI-SAFER-PROFILE.md)
- generated LESS 通过 `content/panorama/src/hud/styles.less` 引入
- `useEffect` 订阅必须 cleanup
- server payload 必须 defensive normalize
- `.rune-weaver-root` 必须 full-size

### 3.3 React 组件示例

```typescript
import React from 'react';

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

```

### 3.4 类组件 vs React 组件对比

| 特性 | 原生类组件 | React 组件 |
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
| 代码生成 | 允许 React TSX，但必须满足 safer profile |
| 依赖管理 | 依赖 x-template 已安装的 React/Panorama 管线 |
| 宿主兼容 | 不把浏览器 React 假设带进 Panorama |
| 验证 | doctor/validate 应检查 root、LESS、UI index |

## 5. 当前最相关的 Pattern / Module

所有 UI Pattern：
- `ui.selection_modal`
- `ui.key_hint`
- `ui.resource_bar`

**实现方式**: x-template target 当前可使用 React TSX；其他宿主可另行定义 native profile。

## 6. 后续注意事项

- 不要从 TSX import generated LESS
- 不要在 render 中创建会进入 effect dependency 的默认数组/对象
- 不要假设 Lua table 到 UI 后一定是 JS array
- React profile 只对已验证的 x-template target 生效

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

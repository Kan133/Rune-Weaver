# Panorama HUD Entry 与 Root 挂载

## 1. 用途

解决 Rune Weaver 生成的 UI 如何正确挂载到 Dota2 HUD 的问题。这是 UI 生效的第一步。

## 2. 上游来源

- `references/dota2/docs/moddota_panorama_docs.md`
- 章节: "Introduction to Panorama UI with TypeScript"
- 关键页面: https://moddota.com/panorama/introduction-to-panorama-ui-with-typescript

## 3. 核心要点

### 3.1 HUD 入口文件位置

宿主 HUD 根文件：
```
content/panorama/src/hud/script.tsx
```

这是 Rune Weaver UI 的唯一合法挂载点。

### 3.2 Root 挂载模式

**推荐模式：包裹式挂载**

```tsx
// hud/script.tsx (宿主文件)
import { RuneWeaverHUDRoot } from "../rune_weaver";

const Root: FC = () => {
  return (
    <>
      {/* 宿主原有 HUD 内容 */}
      <Panel id="DefaultHUD">
        {/* ... 原有内容 ... */}
      </Panel>
      
      {/* Rune Weaver 挂载点 */}
      <RuneWeaverHUDRoot />
    </>
  );
};
```

**禁止模式：直接重写整个 HUD**

```tsx
// ❌ 不要这样做
const Root: FC = () => {
  return <RuneWeaverHUDRoot />;  // 丢失了宿主原有 HUD
};
```

### 3.3 Rune Weaver 内部层级

```
rune_weaver/
├── index.tsx                    # RW 总入口 (create)
└── generated/
    └── ui/
        ├── index.tsx            # UI 索引 (refresh)
        ├── rw_dash_q.tsx        # feature 组件
        ├── rw_talent_draw.tsx   # feature 组件
        └── ...
```

### 3.4 最小桥接代码

```tsx
// rune_weaver/index.tsx
import React from "react";
import { RuneWeaverGeneratedUIRoot } from "./generated/ui";

export function RuneWeaverHUDRoot(): React.ReactElement {
  return <RuneWeaverGeneratedUIRoot />;
}
```

## 4. 对 Rune Weaver 的直接价值

| 场景 | 价值 |
|------|------|
| UI Pattern 实现 | 明确组件挂载到哪个层级 |
| Bridge Planning | `inject_once` 目标明确为 `hud/script.tsx` |
| Host Validation | 检查宿主入口是否正确接线 |
| Write Executor | 知道在哪里执行 `inject_once` |

## 5. 当前最相关的 Pattern / Module

- `ui.selection_modal` → 挂载到 `RuneWeaverHUDRoot`
- `ui.key_hint` → 挂载到 `RuneWeaverHUDRoot`
- `ui.resource_bar` → 挂载到 `RuneWeaverHUDRoot`

## 6. 后续注意事项

- **不要**在 `hud/script.tsx` 中直接引用具体 feature 组件
- **不要**修改宿主 `DefaultHUD` 内部结构
- `RuneWeaverHUDRoot` 应该是无状态容器组件
- 考虑 overlay 层级问题（z-index）

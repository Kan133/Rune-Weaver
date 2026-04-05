# Bridge Update Planning

## 1. 文档目的

本文档定义 `bridgeUpdates` 从抽象动作到真实宿主桥接计划的映射。

目标：
- 明确 `refresh` / `inject_once` / `create` 三类动作在宿主中的具体含义
- 定义桥接文件的生成和管理规则
- 区分 Rune Weaver 拥有的文件与宿主入口文件

---

## 2. Bridge Update 类型定义

### 2.1 抽象动作 -> 宿主语义

| 抽象动作 | 宿主语义 | 执行时机 | 幂等性 |
|---------|---------|---------|--------|
| `create` | 新建桥接文件 | feature 首次创建 | ✅ 文件已存在则跳过 |
| `inject_once` | 在宿主入口中插入单次接线 | 首次需要桥接时 | ✅ 检测已存在则跳过 |
| `refresh` | 刷新桥接索引文件 | 每次 feature 变更 | ❌ 每次重写 |

### 2.2 动作详解

#### `create` - 新建桥接文件

**触发场景**: 宿主初始化或首次创建某类桥接时

**示例**:
```typescript
// 创建 RW 服务端总入口
// game/scripts/src/rune_weaver/index.ts
create: {
  target: "server",
  file: "index.ts",
  action: "create"
}
```

**宿主结果**:
```typescript
// game/scripts/src/rune_weaver/index.ts (RW 拥有)
export { activateRuneWeaverModules } from "./generated/server";
```

---

#### `inject_once` - 单次接线注入

**触发场景**: 需要在宿主已有入口中插入接入点时

**示例**:
```typescript
// 在宿主 modules/index.ts 中接入 RW
inject_once: {
  target: "server",
  file: "modules/index.ts",  // 宿主文件
  action: "inject_once"
}
```

**宿主结果** (只做一次):
```typescript
// game/scripts/src/modules/index.ts (宿主拥有)
import { activateRuneWeaverModules } from "../rune_weaver";  // RW 插入

export function ActivateModules() {
  // ... 宿主原有逻辑
  activateRuneWeaverModules();  // RW 插入
}
```

**关键约束**:
- 只插入 import 和调用语句
- 不修改宿主原有逻辑
- 检测已存在则跳过（幂等）

---

#### `refresh` - 刷新索引

**触发场景**: feature 增删改时，需要更新索引文件

**示例**:
```typescript
// 刷新 server 索引
refresh: {
  target: "server",
  file: "generated/server/index.ts",  // RW 拥有
  action: "refresh"
}
```

**宿主结果** (每次重写):
```typescript
// game/scripts/src/rune_weaver/generated/server/index.ts (RW 拥有)
import { registerRwDashQ } from "./rw_dash_q";
import { registerRwTalentDraw } from "./rw_talent_draw";

export function activateRwGeneratedServer() {
  registerRwDashQ();
  registerRwTalentDraw();
}
```

**关键约束**:
- 文件完全由 RW 管理，可整体重写
- 只聚合当前 active 的 features
- disabled/archived 的 feature 不包含

---

## 3. 桥接文件所有权

### 3.1 Rune Weaver 完全拥有的文件

| 文件路径 | 动作类型 | 说明 |
|---------|---------|------|
| `game/scripts/src/rune_weaver/index.ts` | create + refresh | Server 总入口 |
| `game/scripts/src/rune_weaver/generated/server/index.ts` | refresh | Server 索引 |
| `game/scripts/src/rune_weaver/generated/shared/index.ts` | refresh | Shared 索引 |
| `content/panorama/src/rune_weaver/index.tsx` | create + refresh | UI 总入口 |
| `content/panorama/src/rune_weaver/generated/ui/index.tsx` | refresh | UI 索引 |

### 3.2 宿主拥有、RW 只注入一次的文件

| 文件路径 | 动作类型 | 说明 |
|---------|---------|------|
| `game/scripts/src/modules/index.ts` | inject_once | Server 模块激活入口 |
| `content/panorama/src/hud/script.tsx` | inject_once | HUD 根组件 |

### 3.3 Feature 拥有的文件

| 文件路径 | 归属 | 说明 |
|---------|------|------|
| `generated/server/{featureId}.ts` | Feature | Server 实现 |
| `generated/shared/{featureId}.ts` | Feature | Shared 定义 |
| `generated/ui/{featureId}.tsx` | Feature | UI 实现 |
| `generated/ui/{featureId}.less` | Feature | UI 样式 |

---

## 4. 桥接计划生成

### 4.1 从 AssemblyPlan 生成 Bridge Plan

```typescript
// adapters/dota2/planning/bridge-planner.ts

export interface BridgePlan {
  /** 所属 feature */
  featureId: string;
  
  /** 桥接动作列表 */
  actions: BridgeAction[];
  
  /** 是否所有桥接都可执行 */
  executable: boolean;
  
  /** 阻塞原因 (如有) */
  blockers?: string[];
}

export interface BridgeAction {
  /** 动作类型 */
  type: "create" | "inject_once" | "refresh";
  
  /** 目标侧 */
  target: "server" | "ui";
  
  /** 宿主文件路径 (相对宿主根) */
  hostFile: string;
  
  /** 是否 RW 拥有该文件 */
  rwOwned: boolean;
  
  /** 动作描述 */
  description: string;
}
```

### 4.2 生成逻辑

```typescript
export function generateBridgePlan(
  assemblyPlan: AssemblyPlan,
  workspace: RuneWeaverWorkspace,
  hostRoot: string
): BridgePlan {
  const actions: BridgeAction[] = [];
  
  // 1. 检查并确保 RW 总入口存在 (create)
  actions.push({
    type: "create",
    target: "server",
    hostFile: "game/scripts/src/rune_weaver/index.ts",
    rwOwned: true,
    description: "Ensure RW server entry point exists"
  });
  
  // 2. 检查并注入宿主模块入口 (inject_once)
  actions.push({
    type: "inject_once",
    target: "server",
    hostFile: "game/scripts/src/modules/index.ts",
    rwOwned: false,
    description: "Inject RW activation into host module entry"
  });
  
  // 3. 刷新 server 索引 (refresh)
  if (hasServerPatterns(assemblyPlan)) {
    actions.push({
      type: "refresh",
      target: "server",
      hostFile: "game/scripts/src/rune_weaver/generated/server/index.ts",
      rwOwned: true,
      description: "Refresh server feature index"
    });
  }
  
  // 4. UI 侧同理...
  if (hasUIPatterns(assemblyPlan)) {
    actions.push({
      type: "create",
      target: "ui",
      hostFile: "content/panorama/src/rune_weaver/index.tsx",
      rwOwned: true,
      description: "Ensure RW UI entry point exists"
    });
    
    actions.push({
      type: "inject_once",
      target: "ui",
      hostFile: "content/panorama/src/hud/script.tsx",
      rwOwned: false,
      description: "Inject RW HUD root into host HUD"
    });
    
    actions.push({
      type: "refresh",
      target: "ui",
      hostFile: "content/panorama/src/rune_weaver/generated/ui/index.tsx",
      rwOwned: true,
      description: "Refresh UI feature index"
    });
  }
  
  return {
    featureId: workspace.features.find(f => f.blueprintId === assemblyPlan.blueprintId)?.featureId || "unknown",
    actions,
    executable: true
  };
}
```

---

## 5. 桥接索引文件格式

### 5.1 Server 索引

**路径**: `game/scripts/src/rune_weaver/generated/server/index.ts`

**内容示例**:
```typescript
// Generated by Rune Weaver
// Refresh on: 2026-04-05T12:00:00.000Z
// Features: rw_dash_q, rw_talent_draw

import { registerRwDashQ } from "./rw_dash_q";
import { registerRwTalentDraw } from "./rw_talent_draw";

export function activateRwGeneratedServer() {
  registerRwDashQ();
  registerRwTalentDraw();
}
```

### 5.2 UI 索引

**路径**: `content/panorama/src/rune_weaver/generated/ui/index.tsx`

**内容示例**:
```tsx
// Generated by Rune Weaver
// Refresh on: 2026-04-05T12:00:00.000Z
// Features: rw_dash_q, rw_talent_draw

import React from "react";
import { RwDashQHint } from "./rw_dash_q";
import { RwTalentDrawModal } from "./rw_talent_draw";

export function RuneWeaverGeneratedUIRoot() {
  return (
    <>
      <RwDashQHint />
      <RwTalentDrawModal />
    </>
  );
}
```

### 5.3 索引刷新规则

- **包含**: 所有 `status === "active"` 的 features
- **排除**: `disabled` 或 `archived` 的 features
- **顺序**: 按 `featureId` 字母序（稳定排序）
- **格式**: 每个 feature 导出其注册函数/组件

---

## 6. 宿主入口注入模板

### 6.1 Server 注入

**目标文件**: `game/scripts/src/modules/index.ts`

**注入内容**:
```typescript
// === Rune Weaver Bridge (injected once) ===
import { activateRuneWeaverModules } from "../rune_weaver";
// === End Rune Weaver Bridge ===

// 在 ActivateModules 函数中:
export function ActivateModules() {
  if (GameRules.XNetTable == null) {
    GameRules.XNetTable = new XNetTable();
    new GameConfig();
    new Debug();
    // === Rune Weaver Bridge ===
    activateRuneWeaverModules();
    // === End Rune Weaver Bridge ===
  }
}
```

**检测已存在**: 检查是否已有 `activateRuneWeaverModules` 的 import

### 6.2 UI 注入

**目标文件**: `content/panorama/src/hud/script.tsx`

**注入内容**:
```tsx
// === Rune Weaver Bridge (injected once) ===
import { RuneWeaverHUDRoot } from "../rune_weaver";
// === End Rune Weaver Bridge ===

// 在 Root 组件中:
const Root: FC = () => {
  return (
    <>
      {/* 宿主原有 HUD */}
      <Panel>...</Panel>
      {/* === Rune Weaver Bridge === */}
      <RuneWeaverHUDRoot />
      {/* === End Rune Weaver Bridge === */}
    </>
  );
};
```

**检测已存在**: 检查是否已有 `RuneWeaverHUDRoot` 的 import

---

## 7. Bridge Update 执行计划

### 7.1 执行顺序

```
1. create (RW 拥有的桥接文件)
2. inject_once (宿主入口，只做一次)
3. refresh (RW 拥有的索引文件)
```

### 7.2 失败处理

| 阶段 | 失败行为 | 回滚策略 |
|------|---------|---------|
| create | 停止后续执行 | 删除已创建的文件 |
| inject_once | 停止后续执行 | 尝试恢复原始文件（如有备份）|
| refresh | 记录警告继续 | 保留旧索引，下次重试 |

---

## 8. 与 AssemblyPlan 的关系

### 8.1 AssemblyPlan 中的 bridgeUpdates

当前是抽象描述：
```json
{
  "target": "server",
  "file": "index.ts",
  "action": "refresh"
}
```

### 8.2 Bridge Plan 扩展为宿主计划

```json
{
  "featureId": "rw_dash_q",
  "actions": [
    {
      "type": "create",
      "target": "server",
      "hostFile": "game/scripts/src/rune_weaver/index.ts",
      "rwOwned": true,
      "description": "Ensure RW server entry point exists"
    },
    {
      "type": "inject_once",
      "target": "server", 
      "hostFile": "game/scripts/src/modules/index.ts",
      "rwOwned": false,
      "description": "Inject RW activation into host module entry"
    },
    {
      "type": "refresh",
      "target": "server",
      "hostFile": "game/scripts/src/rune_weaver/generated/server/index.ts",
      "rwOwned": true,
      "description": "Refresh server feature index"
    }
  ],
  "executable": true
}
```

---

## 9. 验收标准

- ✅ 每种抽象 `action` 都有明确的宿主语义
- ✅ 区分 RW 拥有的文件和宿主拥有的文件
- ✅ `inject_once` 是幂等的（检测已存在则跳过）
- ✅ `refresh` 生成的索引文件格式清晰
- ✅ 为后续 Host Write Executor 提供清晰的执行计划

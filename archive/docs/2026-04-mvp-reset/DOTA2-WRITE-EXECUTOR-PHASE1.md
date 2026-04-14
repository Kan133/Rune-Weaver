# Write Executor Phase 1 边界定义

## 1. 文档目的

本文档固定 Write Executor **Phase 1**的边界：

- 允许写什么
- 不允许写什么
- 为后续实现提供清晰依据

## 2. Phase 1 允许写入的文件

### 2.1 RW 自有文件（rwOwned: true）

这些文件由 Rune Weaver 完全拥有，可以安全地创建和修改：

| 文件路径 | 动作类型 | 内容 |
|----------|----------|------|
| `game/scripts/src/rune_weaver/index.ts` | create + refresh | Server 总入口 |
| `game/scripts/src/rune_weaver/generated/server/{featureId}.ts` | create + update | Server 骨架 |
| `game/scripts/src/rune_weaver/generated/server/index.ts` | refresh | Server 索引 |
| `game/scripts/src/rune_weaver/generated/shared/{featureId}.ts` | create + update | Shared 骨架 |
| `game/scripts/src/rune_weaver/generated/shared/index.ts` | refresh | Shared 索引 |
| `content/panorama/src/rune_weaver/index.tsx` | create + refresh | UI 总入口 |
| `content/panorama/src/rune_weaver/generated/ui/{featureId}.tsx` | create + update | UI 骨架 |
| `content/panorama/src/rune_weaver/generated/ui/{featureId}.less` | create + update | UI 样式 |
| `content/panorama/src/rune_weaver/generated/ui/index.tsx` | refresh | UI 索引 |
| `rune-weaver.workspace.json` | create + update | 工作区状态 |

### 2.2 inject_once 文件（rwOwned: false）

这些文件属于宿主，RW 只进行一次受控注入：

| 文件路径 | 动作类型 | 注入内容 |
|----------|----------|----------|
| `game/scripts/src/modules/index.ts` | inject_once | import + 调用 RW Server 入口 |
| `content/panorama/src/hud/script.tsx` | inject_once | import + 挂载 RW UI 根 |

**inject_once 约束**：

- 只插入 import 语句和调用语句
- 不修改宿主原有逻辑
- 幂等：检测已存在则跳过
- 不删除、不重写宿主原有代码

### 2.3 inject_once 示例

**Server 注入** (`modules/index.ts`):

```typescript
// === Rune Weaver Bridge (injected once) ===
import { activateRuneWeaverModules } from "../rune_weaver";
// === End Rune Weaver Bridge ===

export function ActivateModules() {
  // ... 宿主原有逻辑保持不变 ...
  
  // === Rune Weaver Bridge ===
  activateRuneWeaverModules();
  // === End Rune Weaver Bridge ===
}
```

**UI 注入** (`hud/script.tsx`):

```tsx
// === Rune Weaver Bridge (injected once) ===
import { RuneWeaverHUDRoot } from "../rune_weaver";
// === End Rune Weaver Bridge ===

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

## 3. Phase 1 不允许写入的文件

### 3.1 不允许直接散写的目录

```
❌ game/scripts/src/examples/**
❌ game/scripts/src/modules/ (除 index.ts inject_once)
❌ game/scripts/src/utils/**
❌ content/panorama/src/hud/ (除 script.tsx inject_once)
❌ content/panorama/src/utils/**
❌ game/scripts/npc/ (暂不支持 KV 配置)
```

### 3.2 不允许智能改写

Write Executor **不**支持：

- 读取并理解宿主已有文件内容
- 与现有代码进行智能 merge
- 处理用户修改过的生成文件
- 自动修复冲突
- 任意宿主文件的重构

### 3.3 不允许全项目重构

Write Executor **不**支持：

- 修改宿主目录结构
- 重命名宿主已有文件
- 删除宿主已有文件
- 修改宿主配置文件

## 4. 写入操作类型

### 4.1 create

**用途**：创建 RW 自有文件

**幂等性**：✅ 文件已存在则跳过（或报错）

**适用文件**：
- 所有 `rwOwned: true` 的文件

### 4.2 refresh

**用途**：刷新 RW 管理的索引文件

**幂等性**：❌ 每次重写（但内容应稳定）

**适用文件**：
- `*/index.ts`
- `*/index.tsx`

### 4.3 inject_once

**用途**：在宿主入口文件中注入 RW 桥接

**幂等性**：✅ 检测已存在则跳过

**适用文件**：
- `game/scripts/src/modules/index.ts`
- `content/panorama/src/hud/script.tsx`

### 4.4 update（Phase 1 不支持）

**说明**：Phase 1 不直接支持 update 操作。

对于 RW 自有文件，采用"原子替换"策略：
- 重新生成完整内容
- 直接覆盖原文件

不尝试：
- 行级合并
- 智能 patch
- 冲突解决

## 5. 执行顺序

```
Phase 1 写入顺序:

1. create (RW 自有桥接文件)
   - rune_weaver/index.ts
   - rune_weaver/index.tsx

2. inject_once (宿主入口)
   - modules/index.ts
   - hud/script.tsx

3. refresh (RW 自有索引)
   - rune_weaver/generated/server/index.ts
   - rune_weaver/generated/shared/index.ts
   - rune_weaver/generated/ui/index.tsx

4. create/update (Feature 文件)
   - rune_weaver/generated/server/{featureId}.ts
   - rune_weaver/generated/shared/{featureId}.ts
   - rune_weaver/generated/ui/{featureId}.tsx
```

## 6. 错误处理

| 阶段 | 失败行为 | 回滚策略 |
|------|----------|----------|
| create | 停止后续执行 | 删除已创建的文件 |
| inject_once | 停止后续执行 | 尝试恢复原始文件（如有备份） |
| refresh | 记录警告继续 | 保留旧索引，下次重试 |
| feature 写入 | 记录错误，继续其他 feature | 标记该 feature 为失败 |

## 7. 接口定义

### 7.1 Write Executor 接口

```typescript
// adapters/dota2/executor/index.ts

export interface WriteExecutorOptions {
  hostRoot: string;
  dryRun?: boolean;  // 只预览，不实际写入
}

export interface WritePlan {
  /** 要执行的动作列表 */
  actions: WriteAction[];
  /** 预计创建的文件 */
  filesToCreate: string[];
  /** 预计修改的文件 */
  filesToModify: string[];
}

export interface WriteAction {
  type: "create" | "refresh" | "inject_once";
  targetPath: string;
  content?: string;
  rwOwned: boolean;
}

export interface WriteResult {
  success: boolean;
  executed: WriteAction[];
  failed: { action: WriteAction; error: string }[];
  skipped: WriteAction[];
}

/**
 * 执行写入计划
 */
export function executeWritePlan(
  plan: WritePlan,
  options: WriteExecutorOptions
): Promise<WriteResult>;
```

### 7.2 使用示例

```typescript
const plan: WritePlan = {
  actions: [
    {
      type: "create",
      targetPath: "game/scripts/src/rune_weaver/index.ts",
      content: serverEntryContent,
      rwOwned: true,
    },
    {
      type: "inject_once",
      targetPath: "game/scripts/src/modules/index.ts",
      rwOwned: false,
    },
  ],
  filesToCreate: ["game/scripts/src/rune_weaver/index.ts"],
  filesToModify: ["game/scripts/src/modules/index.ts"],
};

const result = await executeWritePlan(plan, {
  hostRoot: "D:\\test1",
  dryRun: false,
});
```

## 8. 与 Assembler 的关系

```
AssemblyPlan
  ↓
Assembler → GeneratedArtifact[]
  ↓
Write Plan Builder → WritePlan
  ↓
Write Executor → 宿主文件系统
```

## 9. 验收标准

- ✅ 明确列出 Phase 1 允许写入的文件
- ✅ 明确列出 Phase 1 不允许写入的文件
- ✅ inject_once 的约束清晰
- ✅ 执行顺序明确
- ✅ 错误处理策略明确

## 10. 当前结论

Write Executor Phase 1 的核心原则是：

> **只写 RW 拥有的文件，只注入一次宿主入口。**

守住这个边界：
- 不做任意宿主文件智能改写
- 不做任意 merge
- 不做全项目重构

这是后续稳定扩展的基础。

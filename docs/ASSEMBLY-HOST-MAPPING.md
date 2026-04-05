# AssemblyPlan -> Host Write Mapping

## 1. 文档目的

本文档定义 Rune Weaver 的抽象 `writeTargets` 如何映射到真实 Dota2 宿主 (`dota2-x-template`) 的目录结构。

目标：
- 把当前 `[CANDIDATE]` 级别的抽象目标对齐到真实宿主边界
- 明确每个抽象 target 在 `D:\test1` 中的真实落点
- 为后续 Host Write Executor 提供映射依据

---

## 2. 抽象 Target -> 宿主目录映射

### 2.1 映射总表

| 抽象 Target | 宿主真实目录 | 状态 | 说明 |
|------------|-------------|------|------|
| `server` | `game/scripts/src/rune_weaver/generated/server/` | ✅ 允许写入 | 服务端逻辑 |
| `shared` | `game/scripts/src/rune_weaver/generated/shared/` | ✅ 允许写入 | 共享定义 |
| `ui` | `content/panorama/src/rune_weaver/generated/ui/` | ✅ 允许写入 | Panorama UI |
| `config` | - | ❌ 暂不处理 | KV/配置暂无独立 Pattern |

### 2.2 Server 映射详情

**抽象路径**: `server/{blueprintId}.ts`

**真实路径**: `game/scripts/src/rune_weaver/generated/server/{featureId}.ts`

**映射规则**:
```
server/dash_ability.ts
  -> D:\test1\game\scripts\src\rune_weaver\generated\server\rw_dash_q.ts

server/talent_selection_system.ts
  -> D:\test1\game\scripts\src\rune_weaver\generated\server\rw_talent_draw.ts
```

**注意**:
- 文件名从 `blueprintId` 映射到 `featureId`
- `featureId` 由 Rune Weaver 分配，格式为 `rw_{feature_name}`

### 2.3 Shared 映射详情

**抽象路径**: `shared/{blueprintId}.ts`

**真实路径**: `game/scripts/src/rune_weaver/generated/shared/{featureId}.ts`

**用途**:
- 类型定义
- 常量
- 网络表结构
- 被 server 和 ui 共享的数据定义

### 2.4 UI 映射详情

**抽象路径**: `ui/{blueprintId}.tsx`

**真实路径**: `content/panorama/src/rune_weaver/generated/ui/{featureId}.tsx`

**映射规则**:
```
ui/talent_selection_system.tsx
  -> D:\test1\content\panorama\src\rune_weaver\generated\ui\rw_talent_draw.tsx
```

**样式文件**:
- 同目录生成 `.less` 文件: `{featureId}.less`

### 2.5 Config 映射说明

**当前状态**: ❌ 暂不处理

**原因**:
- 当前 Pattern Catalog 中没有专门的 config/kv pattern
- `data.weighted_pool` 等数据定义已落入 shared
- 如需 KV 输出，建议由 shared 文件间接生成

**未来可能**:
- 如需支持纯 KV 配置，可新增 `config` target
- 落点建议: `game/scripts/npc/custom_{featureId}.txt`

---

## 3. 宿主写入边界

### 3.1 允许写入的目录 (Rune Weaver 命名空间)

```
game/scripts/src/rune_weaver/
├── generated/
│   ├── server/          # server target
│   │   └── index.ts     # server 桥接索引 (RW 管理)
│   └── shared/          # shared target
│       └── index.ts     # shared 桥接索引 (RW 管理)
├── index.ts             # server 总入口桥接 (RW 管理)

content/panorama/src/rune_weaver/
├── generated/
│   └── ui/              # ui target
│       └── index.tsx    # ui 桥接索引 (RW 管理)
├── index.tsx            # ui 总入口桥接 (RW 管理)
```

### 3.2 不允许直接散写的目录

```
game/scripts/src/examples/              # 示例代码目录
game/scripts/src/modules/               # 除 index.ts 外不直接写入
content/panorama/src/hud/               # 除 script.tsx 外不直接写入
content/panorama/src/utils/             # 工具目录
```

### 3.3 桥接点 (一次性接线)

**Server 桥接**:
```typescript
// game/scripts/src/modules/index.ts (宿主文件，RW 只做一次接入)
import { activateRuneWeaverModules } from "../rune_weaver";

export function ActivateModules() {
  // ... 宿主原有逻辑
  activateRuneWeaverModules();  // RW 接入点
}
```

**UI 桥接**:
```tsx
// content/panorama/src/hud/script.tsx (宿主文件，RW 只做一次接入)
import { RuneWeaverHUDRoot } from "../rune_weaver";

const Root: FC = () => {
  return (
    <>
      {/* 宿主原有 HUD */}
      <RuneWeaverHUDRoot />  {/* RW 挂载点 */}
    </>
  );
};
```

---

## 4. Write Target 映射实现

### 4.1 HostTarget 类型定义

```typescript
// adapters/dota2/types/host-mapping.ts

export type HostTargetKind = "server" | "shared" | "ui";

export interface HostWriteTarget {
  /** 抽象 target (AssemblyPlan 中的 target) */
  abstractTarget: "server" | "shared" | "ui" | "config";
  
  /** 宿主目标类型 */
  hostTarget: HostTargetKind;
  
  /** 宿主根目录 */
  hostRoot: string;  // e.g., "D:\\test1"
  
  /** 相对宿主根目录的路径 */
  relativePath: string;
  
  /** 完整绝对路径 */
  absolutePath: string;
  
  /** 输出文件类型 */
  outputTypes: ("typescript" | "tsx" | "less" | "kv")[];
}
```

### 4.2 映射函数

```typescript
// adapters/dota2/mapping/write-target-mapper.ts

export function mapToHostWriteTarget(
  abstractTarget: WriteTarget["target"],
  featureId: string,
  hostRoot: string
): HostWriteTarget {
  const mappings: Record<string, Omit<HostWriteTarget, "absolutePath">> = {
    server: {
      abstractTarget: "server",
      hostTarget: "server",
      relativePath: `game/scripts/src/rune_weaver/generated/server/${featureId}.ts`,
      outputTypes: ["typescript"],
    },
    shared: {
      abstractTarget: "shared",
      hostTarget: "shared",
      relativePath: `game/scripts/src/rune_weaver/generated/shared/${featureId}.ts`,
      outputTypes: ["typescript"],
    },
    ui: {
      abstractTarget: "ui",
      hostTarget: "ui",
      relativePath: `content/panorama/src/rune_weaver/generated/ui/${featureId}.tsx`,
      outputTypes: ["tsx", "less"],
    },
    config: {
      abstractTarget: "config",
      hostTarget: "server",  // config 复用 server 目录
      relativePath: `game/scripts/src/rune_weaver/generated/config/${featureId}.txt`,
      outputTypes: ["kv"],
    },
  };

  const mapping = mappings[abstractTarget];
  if (!mapping) {
    throw new Error(`Unknown abstract target: ${abstractTarget}`);
  }

  return {
    ...mapping,
    hostRoot,
    absolutePath: `${hostRoot}/${mapping.relativePath}`,
  };
}
```

---

## 5. 示例: 完整映射流程

### 输入: AssemblyPlan

```json
{
  "blueprintId": "talent_selection_system",
  "selectedPatterns": [...],
  "writeTargets": [
    { "target": "server", "path": "server/talent_selection_system.ts" },
    { "target": "shared", "path": "shared/talent_selection_system.ts" },
    { "target": "ui", "path": "ui/talent_selection_system.tsx" }
  ]
}
```

### 映射过程

```typescript
const hostRoot = "D:\\test1";
const featureId = "rw_talent_draw";  // 由 RW 分配

const mappedTargets = assemblyPlan.writeTargets.map(wt => 
  mapToHostWriteTarget(wt.target, featureId, hostRoot)
);
```

### 输出: HostWriteTarget[]

```json
[
  {
    "abstractTarget": "server",
    "hostTarget": "server",
    "hostRoot": "D:\\test1",
    "relativePath": "game/scripts/src/rune_weaver/generated/server/rw_talent_draw.ts",
    "absolutePath": "D:\\test1\\game\\scripts\\src\\rune_weaver\\generated\\server\\rw_talent_draw.ts",
    "outputTypes": ["typescript"]
  },
  {
    "abstractTarget": "shared",
    "hostTarget": "shared",
    "hostRoot": "D:\\test1",
    "relativePath": "game/scripts/src/rune_weaver/generated/shared/rw_talent_draw.ts",
    "absolutePath": "D:\\test1\\game\\scripts\\src\\rune_weaver\\generated\\shared\\rw_talent_draw.ts",
    "outputTypes": ["typescript"]
  },
  {
    "abstractTarget": "ui",
    "hostTarget": "ui",
    "hostRoot": "D:\\test1",
    "relativePath": "content/panorama/src/rune_weaver/generated/ui/rw_talent_draw.tsx",
    "absolutePath": "D:\\test1\\content\\panorama\\src\\rune_weaver\\generated\\ui\\rw_talent_draw.tsx",
    "outputTypes": ["tsx", "less"]
  }
]
```

---

## 6. 与 HOST-INTEGRATION-DOTA2.md 的关系

本文档是 HOST-INTEGRATION-DOTA2.md 的技术细化：

| HOST-INTEGRATION-DOTA2.md | ASSEMBLY-HOST-MAPPING.md |
|---------------------------|--------------------------|
| 定义允许写入的目录边界 | 定义具体映射规则和路径计算 |
| 定义桥接文件概念 | 说明如何生成桥接索引 |
| 定义宿主识别规则 | 假设宿主已识别，专注于写入映射 |

---

## 7. 与 WORKSPACE-MODEL.md 的关系

本文档支持 WORKSPACE-MODEL.md 中的文件所有权管理：

- 每个 `featureId` 对应一组确定的宿主文件路径
- 这些路径可以通过本文档的映射规则计算得出
- Workspace 中的 `generatedFiles` 应存储绝对路径或相对宿主根的路径

---

## 8. 当前限制

### 8.1 单宿主假设

当前映射只支持 `dota2-x-template` 类型的宿主。

### 8.2 固定目录结构

映射规则假设宿主遵循 x-template 的目录约定：
- `game/scripts/src/`
- `content/panorama/src/`

### 8.3 暂无动态子目录

当前所有 feature 文件直接落入 `generated/{target}/`，暂不支持按功能分组的子目录。

---

## 9. 验收标准

- ✅ 每个抽象 `writeTarget` 都能映射到明确的宿主路径
- ✅ 映射结果包含绝对路径（用于写入）和相对路径（用于存储）
- ✅ 与 `HOST-INTEGRATION-DOTA2.md` 的允许目录一致
- ✅ 为后续 Host Write Executor 提供清晰的映射接口

# X-Template Onboarding 流程

> Status Note
> This document defines the x-template onboarding flow design.
> For current implementation status and authoritative CLI paths, see [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md) and [HOST-INTEGRATION-DOTA2.md](/D:/Rune%20Weaver/docs/HOST-INTEGRATION-DOTA2.md).
> CLI is the authoritative lifecycle path. GUI/Workbench provides visualization and orchestration, not independent execution.

## 概述

本文档定义 Rune Weaver 与 x-template 宿主项目的集成流程和数据契约。

## x-template 事实

1. **依赖安装**: `yarn install` 安装依赖并创建符号链接
2. **启动命令**: `yarn launch [projectname] [mapname]` 启动 Dota2
3. **addon_name 定义**: 在 `scripts/addon.config.ts` 中定义
4. **可选参数**: `projectname` 和 `mapname` 都是可选参数
5. **工具模式**: 如果 `mapname` 未提供，只启动工具不加载地图

## Onboarding 流程定义

```
┌─────────────────────────────────────────────────────────────────┐
│                    Onboarding 流程                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 选择 host                                                    │
│     └── 用户指定或扫描发现的宿主目录路径                            │
│                                                                 │
│  2. 检测 x-template                                              │
│     └── 验证 scripts/addon.config.ts 存在                        │
│     └── 检查 addon_name 是否为默认值 x_template                   │
│                                                                 │
│  3. 命名项目 (addon_name)                                         │
│     └── 如果 addon_name 为 x_template，提示用户输入新名称           │
│     └── 验证命名规则: ^[a-z][a-z0-9_]*$                           │
│     └── 更新 scripts/addon.config.ts                             │
│                                                                 │
│  4. 选择 map (可选)                                               │
│     └── 扫描 content/dota_addons/{addon_name}/maps/              │
│     └── 列出可用的 .vmap 文件                                     │
│     └── 用户选择或跳过 (跳过则只启动工具)                          │
│                                                                 │
│  5. 初始化                                                       │
│     └── 创建 Rune Weaver 命名空间目录                             │
│     └── 创建 workspace 文件                                       │
│     └── 创建桥接文件 (bridge files)                               │
│     └── 执行 yarn install                                        │
│                                                                 │
│  6. 进入 feature workflow                                        │
│     └── 用户可以通过 CLI (authoritative) 或 GUI (orchestration) 创建/更新/删除 feature │
│     └── 通过 `yarn launch` 启动 Dota2 进行测试                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 数据契约 (Data Contract)

### Workspace 文件结构

**路径**: `game/scripts/src/rune_weaver/rune-weaver.workspace.json`

```typescript
interface RuneWeaverWorkspace {
  version: string;           // 例如: "0.1.0"
  hostType: "dota2-x-template";
  hostRoot: string;          // 宿主项目绝对路径
  addonName: string;         // 从 addon.config.ts 读取
  mapName?: string;          // 可选，用户选择的地图名称
  initializedAt: string;     // ISO 8601 时间戳
  features: RuneWeaverFeatureRecord[];
}
```

### 核心字段说明

| 字段 | 类型 | 说明 | 来源 |
|------|------|------|------|
| `hostRoot` | string | 宿主项目根目录绝对路径 | 用户输入或扫描发现 |
| `projectName` | string | 项目目录名 (basename of hostRoot) | 从 hostRoot 推导 |
| `addonName` | string | Dota2 addon 名称 | scripts/addon.config.ts |
| `mapName` | string? | 默认启动的地图名称（用户在 onboarding 时选择） | 用户选择（可选） |
| `workspacePath` | string | workspace 文件完整路径 | `hostRoot/game/scripts/src/rune_weaver/` |
| `hostType` | string | 宿主类型标识 | 固定为 "dota2-x-template" |

### 路径约定

```
{hostRoot}/
├── scripts/addon.config.ts              # addon_name 定义
├── game/scripts/src/rune_weaver/        # Rune Weaver 服务端命名空间
│   ├── rune-weaver.workspace.json       # Workspace 状态文件
│   ├── index.ts                         # 服务端桥接入口
│   └── generated/                       # 生成的代码
├── content/panorama/src/rune_weaver/    # Rune Weaver UI 命名空间
│   ├── index.tsx                        # UI 桥接入口
│   └── generated/                       # 生成的 UI 组件
```

## Launch 参数约定

### 命令格式

```bash
yarn launch [projectname] [mapname]
```

### 参数解析

| 参数 | 可选 | 说明 | 默认值 |
|------|------|------|--------|
| `projectname` | 是 | 等同于 addon_name | workspace.addonName |
| `mapname` | 是 | 要加载的地图名称 | workspace.mapName 或无 |

### 参数传递方式

**当前实现**：
- launch 脚本只从命令行参数读取 projectname 和 mapname
- 用户需要手动执行 `yarn launch [projectname] [mapname]`
- mapName 在 init 时被写入 workspace，但 launch 脚本目前不从 workspace 读取

**计划中的增强（未实现）**：
- 从 workspace 读取默认参数
- --run 参数自动触发 launch

**mapName 的当前状态**：
- ✅ mapName 在 init 时被写入 workspace
- ❌ launch 脚本目前不从 workspace 读取
- 这是一个待接通的数据流

## 与 host-status 的集成

`host-status` 实际实现的 6 维度状态检测：

1. **基础扫描 (scan)**: 检查关键文件/目录是否存在
2. **初始化状态 (init)**: addon_name 是否已从 x_template 修改
3. **Workspace 就绪 (workspace)**: workspace 文件是否存在且有效
4. **命名空间就绪 (namespace)**: Rune Weaver 命名空间目录是否存在
5. **Server Bridge (server-bridge)**: 服务端桥接文件是否正确配置
6. **UI Bridge (ui-bridge)**: UI 桥接文件是否正确配置

**注意**: 以下功能尚未实现，将在后续版本中添加：
- node_modules / install 状态检查
- 符号链接状态检查
- Steam 链接就绪检查

## 相关文档

- [WORKSPACE-MODEL.md](./WORKSPACE-MODEL.md) - Workspace 状态模型详细定义
- [HOST-INTEGRATION-DOTA2.md](./HOST-INTEGRATION-DOTA2.md) - Dota2 宿主集成指南
- [adapters/dota2/init/index.ts](../adapters/dota2/init/index.ts) - 初始化实现
- [core/workspace/manager.ts](../core/workspace/manager.ts) - Workspace 管理器

## Deferred Features

The following features are explicitly deferred for the current milestone:

- `regenerate`
- `rollback`
- semantic incremental update
- second host support
- `--run` parameter auto-launch

Do not include these in onboarding flow planning unless explicitly requested by the user.

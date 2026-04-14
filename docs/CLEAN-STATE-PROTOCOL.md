# Rune Weaver Clean-State Protocol

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-14
> Read when: preparing a clean verification environment before acceptance or lifecycle checks
> Do not use for: changing product scope, changing architecture authority, or deciding roadmap order

本文档定义 Rune Weaver 验证执行前的环境准备协议，确保验证在干净、可重复的状态下进行。

---

## 0. 安全前置条件（执行限制）

**⚠️ 重要**: 在执行任何 clean-state 操作前，必须满足以下安全前置条件：

### 0.1 执行限制

| 限制项 | 要求 |
|--------|------|
| **Host 范围** | 只能在**明确的测试 host** 上执行，禁止在生产环境执行 |
| **Host Root 确认** | 执行前必须**显式确认 hostRoot** 路径，禁止对未知目录操作 |
| **路径验证** | 删除/清理操作前必须**验证目标路径**是否正确 |
| **备份建议** | 重要数据操作前建议备份 |

### 0.2 风险操作清单

以下操作被标记为 **destructive**，执行前必须二次确认：

- 删除 workspace 文件
- 删除 `rune_weaver` 目录内的任何文件
- 重置 bridge 导出
- 任何涉及 `-Recurse -Force` 的操作

### 0.3 禁止事项

- ❌ 禁止对未确认的 hostRoot 执行任何删除操作
- ❌ 禁止在 hostRoot 为 null/undefined/空字符串时执行清理
- ❌ 禁止删除非 `rune_weaver` 子目录的内容
- ❌ 禁止删除 `game/scripts/src/modules/index.ts` 或 `content/panorama/src/hud/script.tsx`

---

## 1. Clean State 定义

### 1.1 Clean Workspace 标准

一个 **Clean Workspace** 满足以下条件：

| 检查项 | 理想状态 |
|--------|----------|
| **Workspace 文件** | 不存在或 `features: []` |
| **Rune Weaver 目录** | 不存在或为空目录 |
| **Bridge 导出** | 不包含任何 feature 绑定 |
| **宿主入口文件** | 不包含 Rune Weaver 相关的 import/mount |

### 1.2 Rune Weaver 拥有的目录

根据 [WORKSPACE-MODEL.md](./WORKSPACE-MODEL.md)，Rune Weaver 拥有以下目录：

| 目录 | 用途 |
|------|------|
| `game/scripts/src/rune_weaver/` | Server TypeScript 代码 |
| `game/scripts/vscripts/rune_weaver/` | Server Lua 代码 |
| `game/scripts/kv/rune_weaver/` | KV 配置文件 |
| `content/panorama/src/rune_weaver/` | UI 组件 |

### 1.3 批准的 Bridge Points

| Bridge Point | 路径 | 用途 |
|--------------|------|------|
| Server 入口 | `game/scripts/src/modules/index.ts` | Server 代码入口 |
| UI 入口 | `content/panorama/src/hud/script.tsx` | UI 代码入口 |

---

## 2. Clean State 检查流程

### 2.1 检查当前状态

```powershell
# 1. 检查 workspace 文件是否存在
Test-Path "game/scripts/src/rune_weaver/rune-weaver.workspace.json"

# 2. 检查 workspace 内容（如存在）
Get-Content "game/scripts/src/rune_weaver/rune-weaver.workspace.json" | ConvertFrom-Json | Select-Object -ExpandProperty features

# 3. 检查 Rune Weaver 目录内容
Get-ChildItem "game/scripts/src/rune_weaver/" -Recurse -ErrorAction SilentlyContinue
Get-ChildItem "game/scripts/vscripts/rune_weaver/" -Recurse -ErrorAction SilentlyContinue
Get-ChildItem "content/panorama/src/rune_weaver/" -Recurse -ErrorAction SilentlyContinue

# 4. 检查 bridge 导出
Get-Content "apps/workbench-ui/public/bridge-workspace.json" | ConvertFrom-Json | Select-Object -ExpandProperty workspace | Select-Object -ExpandProperty features

# 5. 检查 bridge points 是否包含 RW 引用
Select-String -Path "game/scripts/src/modules/index.ts" -Pattern "rune_weaver" -ErrorAction SilentlyContinue
Select-String -Path "content/panorama/src/hud/script.tsx" -Pattern "rune_weaver" -ErrorAction SilentlyContinue
```

### 2.2 状态评估

根据检查结果，评估当前状态：

| 状态 | 特征 | 处理建议 |
|------|------|----------|
| **Clean** | 无 workspace 文件或 `features: []` | 可直接开始验证 |
| **Partial** | 有 workspace 但无 active features | 建议重置 |
| **Dirty** | 有 active features 或残留文件 | 必须重置 |

---

## 3. Clean State 重置流程

### 3.1 低风险操作（推荐）

**⚠️ 执行前检查**: 确认 `$HostRoot` 已设置且指向正确的测试 host。

**仅删除 workspace 记录，保留目录结构：**

```powershell
# ===== 执行前必须确认 =====
$HostRoot = "D:\test1"  # 必须显式设置，禁止为空
if (-not $HostRoot) { throw "HostRoot must be explicitly set" }

# 验证路径存在
if (-not (Test-Path $HostRoot)) { throw "HostRoot does not exist: $HostRoot" }

# 构建完整路径并验证
$workspacePath = Join-Path $HostRoot "game/scripts/src/rune_weaver/rune-weaver.workspace.json"
Write-Host "Target workspace: $workspacePath" -ForegroundColor Yellow
$confirm = Read-Host "Confirm deletion? (yes/no)"
if ($confirm -ne 'yes') { throw "Aborted by user" }
# ==========================

# 删除 workspace 文件
Remove-Item $workspacePath -ErrorAction SilentlyContinue

# 清空 bridge 导出为 empty workspace
$emptyBridge = @{
    workspace = @{
        version = "0.1"
        hostType = "dota2-x-template"
        hostRoot = $HostRoot
        addonName = ""
        initializedAt = ""
        features = @()
    }
    _bridge = @{
        exportedAt = ""
        exportedBy = ""
        version = "0.1"
    }
} | ConvertTo-Json -Depth 10

Set-Content "apps/workbench-ui/public/bridge-workspace.json" $emptyBridge
```

**适用场景**: 
- 需要保留目录结构
- 快速重置
- 验证前准备

**风险等级**: LOW（但仍需确认 hostRoot）

### 3.2 中风险操作（需确认）

**⚠️ 执行前检查**: 此操作涉及 `-Recurse -Force`，必须严格确认 hostRoot。

**删除所有生成的文件，但保留目录：**

```powershell
# ===== 执行前必须确认 =====
$HostRoot = "D:\test1"  # 必须显式设置，禁止为空
if (-not $HostRoot) { throw "HostRoot must be explicitly set" }

# 验证路径存在且为目录
if (-not (Test-Path $HostRoot -PathType Container)) { 
    throw "HostRoot must be a valid directory: $HostRoot" 
}

# 验证路径包含预期的子目录结构（安全检查）
$expectedSubdir = Join-Path $HostRoot "game/scripts/src"
if (-not (Test-Path $expectedSubdir)) {
    throw "HostRoot does not appear to be a valid Dota2 project (missing game/scripts/src)"
}

Write-Host "WARNING: This will delete all files in rune_weaver directories under: $HostRoot" -ForegroundColor Red
$confirm = Read-Host "Type 'DELETE' to confirm"
if ($confirm -ne 'DELETE') { throw "Aborted by user" }
# ==========================

# 删除生成的文件（使用 Join-Path 确保路径正确）
$rwDirs = @(
    "game/scripts/src/rune_weaver/*"
    "game/scripts/vscripts/rune_weaver/*"
    "game/scripts/kv/rune_weaver/*"
    "content/panorama/src/rune_weaver/*"
)

foreach ($dir in $rwDirs) {
    $fullPath = Join-Path $HostRoot $dir
    if (Test-Path $fullPath) {
        Write-Host "Deleting: $fullPath" -ForegroundColor Yellow
        Remove-Item $fullPath -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# 同时执行低风险操作（删除 workspace 文件）
$workspacePath = Join-Path $HostRoot "game/scripts/src/rune_weaver/rune-weaver.workspace.json"
Remove-Item $workspacePath -ErrorAction SilentlyContinue
```

**适用场景**:
- 需要彻底清理生成的文件
- 验证 delete/unload 功能
- 避免残留文件干扰

**注意事项**:
- ⚠️ **确保只删除 `rune_weaver` 子目录内的文件**
- ⚠️ **不要删除宿主核心代码**
- ⚠️ **必须使用 Join-Path 构建完整路径，禁止直接拼接字符串**

**风险等级**: MEDIUM（涉及批量删除，需二次确认）

### 3.3 高风险操作（需额外确认）

**删除整个 Rune Weaver 目录：**

```powershell
# ⚠️ 警告：此操作会删除整个目录，包括子目录结构
Remove-Item "game/scripts/src/rune_weaver" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "game/scripts/vscripts/rune_weaver" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "game/scripts/kv/rune_weaver" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "content/panorama/src/rune_weaver" -Recurse -Force -ErrorAction SilentlyContinue
```

**适用场景**:
- 完全重建环境
- 目录结构损坏

**⚠️ 风险警告**:
- 可能误删其他文件
- 需要重新创建目录结构
- 不建议常规使用

---

## 4. 必须保留的文件/目录

### 4.1 宿主核心代码（绝对不能删除）

| 类别 | 路径 | 原因 |
|------|------|------|
| 宿主 Server 代码 | `game/scripts/src/` 下非 `rune_weaver` 目录 | 宿主游戏逻辑 |
| 宿主 KV 配置 | `game/scripts/npc/` | 原始能力/单位定义 |
| 宿主 UI 代码 | `content/panorama/src/` 下非 `rune_weaver` 目录 | 宿主 UI 逻辑 |
| Bridge 入口文件 | `game/scripts/src/modules/index.ts` | 批准的 bridge point |
| Bridge 入口文件 | `content/panorama/src/hud/script.tsx` | 批准的 bridge point |
| 项目配置 | `package.json`, `tsconfig.json` 等 | 构建工具配置 |

### 4.2 保留检查清单

在重置前，确认以下文件未被影响：

```powershell
# 检查关键文件是否存在
Test-Path "game/scripts/src/modules/index.ts"
Test-Path "content/panorama/src/hud/script.tsx"
Test-Path "package.json"

# 检查宿主代码目录
Get-ChildItem "game/scripts/src/" -Directory | Where-Object { $_.Name -ne "rune_weaver" }
Get-ChildItem "content/panorama/src/" -Directory | Where-Object { $_.Name -ne "rune_weaver" }
```

---

## 5. 风险操作警告

### 5.1 风险等级表

| 风险等级 | 操作 | 后果 | 预防措施 |
|----------|------|------|----------|
| **CRITICAL** | 删除 `game/scripts/src/modules/index.ts` | 破坏宿主入口，无法编译 | 仅删除文件内的 RW import，保留文件 |
| **CRITICAL** | 删除 `content/panorama/src/hud/script.tsx` | 破坏宿主 UI 入口 | 仅删除文件内的 RW mount，保留文件 |
| **HIGH** | 删除整个 `game/scripts/src/` | 丢失所有宿主代码 | 精确删除 `rune_weaver` 子目录 |
| **HIGH** | 删除整个 `content/panorama/src/` | 丢失所有宿主 UI | 精确删除 `rune_weaver` 子目录 |
| **MEDIUM** | 删除 workspace 文件但保留生成的文件 | 产生孤儿文件 | 同步删除或记录状态 |
| **LOW** | 重置 bridge-workspace.json | UI 临时无法显示 features | 可接受，重新导出即可 |

### 5.2 安全操作原则

1. **先检查后操作**: 始终先检查当前状态，再决定重置策略
2. **从低风险开始**: 优先使用低风险操作，必要时再升级
3. **保留备份**: 重要数据操作前备份
4. **精确删除**: 使用精确路径，避免通配符误删
5. **验证结果**: 操作后验证 Clean State 是否达成

---

## 6. 自动化 Clean State 脚本

### 6.1 PowerShell 脚本

```powershell
# clean-state.ps1
param(
    [string]$HostRoot = "D:\test1",
    [switch]$Force = $false
)

Write-Host "=== Rune Weaver Clean State Protocol ===" -ForegroundColor Cyan

# 1. 检查当前状态
$workspacePath = Join-Path $HostRoot "game/scripts/src/rune_weaver/rune-weaver.workspace.json"
$hasWorkspace = Test-Path $workspacePath

if ($hasWorkspace) {
    $workspace = Get-Content $workspacePath | ConvertFrom-Json
    $featureCount = $workspace.features.Count
    Write-Host "Current state: $featureCount features in workspace" -ForegroundColor Yellow
} else {
    Write-Host "Current state: No workspace file" -ForegroundColor Green
}

# 2. 确认操作
if (-not $Force) {
    $confirm = Read-Host "Proceed with clean state? (y/N)"
    if ($confirm -ne 'y') {
        Write-Host "Aborted." -ForegroundColor Red
        exit 1
    }
}

# 3. 执行低风险重置
Write-Host "Removing workspace file..." -ForegroundColor Cyan
Remove-Item $workspacePath -ErrorAction SilentlyContinue

# 4. 执行中风险重置（可选）
$cleanFiles = Read-Host "Also remove generated files? (y/N)"
if ($cleanFiles -eq 'y') {
    Write-Host "Removing generated files..." -ForegroundColor Cyan
    
    $rwDirs = @(
        "game/scripts/src/rune_weaver/*"
        "game/scripts/vscripts/rune_weaver/*"
        "game/scripts/kv/rune_weaver/*"
        "content/panorama/src/rune_weaver/*"
    )
    
    foreach ($dir in $rwDirs) {
        $fullPath = Join-Path $HostRoot $dir
        if (Test-Path $fullPath) {
            Remove-Item $fullPath -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "  Cleaned: $dir" -ForegroundColor Gray
        }
    }
}

# 5. 重置 bridge
Write-Host "Resetting bridge export..." -ForegroundColor Cyan
$emptyBridge = @{
    workspace = @{
        version = "0.1"
        hostType = "dota2-x-template"
        hostRoot = $HostRoot
        addonName = ""
        initializedAt = (Get-Date -Format "o")
        features = @()
    }
    _bridge = @{
        exportedAt = (Get-Date -Format "o")
        exportedBy = "clean-state-protocol"
        version = "0.1"
    }
} | ConvertTo-Json -Depth 10

Set-Content "apps/workbench-ui/public/bridge-workspace.json" $emptyBridge

Write-Host "=== Clean State Complete ===" -ForegroundColor Green
```

### 6.2 使用示例

```powershell
# 交互模式
.\clean-state.ps1 -HostRoot "D:\test1"

# 强制模式（不提示）
.\clean-state.ps1 -HostRoot "D:\test1" -Force
```

---

## 7. 验证 Clean State

### 7.1 验证检查清单

执行重置后，验证以下项目：

- [ ] Workspace 文件不存在或 `features: []`
- [ ] Rune Weaver 目录为空或不存在
- [ ] Bridge 导出不包含 feature 绑定
- [ ] 宿主核心代码完整无损
- [ ] Bridge points 文件存在

### 7.2 验证命令

```powershell
# 验证 workspace
$ws = Get-Content "game/scripts/src/rune_weaver/rune-weaver.workspace.json" -ErrorAction SilentlyContinue | ConvertFrom-Json
if ($ws.features.Count -eq 0) { Write-Host "✓ Workspace clean" } else { Write-Host "✗ Workspace not clean" }

# 验证目录
$dirs = @(
    "game/scripts/src/rune_weaver/"
    "content/panorama/src/rune_weaver/"
)
foreach ($dir in $dirs) {
    $items = Get-ChildItem $dir -ErrorAction SilentlyContinue
    if ($items.Count -eq 0) { Write-Host "✓ $dir clean" } else { Write-Host "✗ $dir not clean ($($items.Count) items)" }
}
```

---

## 8. 与其他文档的关系

- [VALIDATION-PLAYBOOK.md](./VALIDATION-PLAYBOOK.md) - 使用本协议准备验证环境
- [COMMAND-RECIPES.md](./COMMAND-RECIPES.md) - 验证执行的命令参考
- [CANONICAL-ACCEPTANCE-CASES.md](./CANONICAL-ACCEPTANCE-CASES.md) - 验证的验收标准
- [WORKSPACE-MODEL.md](./WORKSPACE-MODEL.md) - Workspace 结构定义

---

*文档版本: 1.0*
*最后更新: 2026-04-10*
*与 VALIDATION-PLAYBOOK.md 配套使用*

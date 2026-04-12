# Rune Weaver 命令配方

本文档整理 Rune Weaver 项目中所有可用于验证执行的命令入口。

**注意**: 只整理实际存在的命令，不虚构"应该存在"的命令。对不稳定入口会明确标注风险。

---

## 1. NPM Scripts

### 1.1 验证类命令

| 命令 | 功能 | 稳定性 | 适用场景 |
|------|------|--------|----------|
| `npm run verify:p0` | 执行 P0 验证（类型检查+测试+示例+CLI微功能） | **稳定** | 开发阶段快速验证 |
| `npm run check-types` | TypeScript 类型检查 | **稳定** | 代码健康检查 |
| `npm run test` | 运行测试套件 | **稳定** | 单元测试验证 |
| `npm run examples` | 运行示例代码 | **稳定** | 示例功能验证 |

**verify:p0 详细说明**:
```bash
# 执行顺序：
# 1. npm run check-types
# 2. npm run test
# 3. npm run examples
# 4. npm run cli:micro
```

### 1.2 Workbench 命令

| 命令 | 功能 | 稳定性 | 适用场景 | 用途边界 |
|------|------|--------|----------|----------|
| `npm run workbench` | 运行 workbench 完整流程 | **preview/demo** | 观察/辅助验证 | **非 authoritative 验收入口** |
| `npm run workbench -- "<prompt>" <host>` | 带参数的 workbench | **preview/demo** | dry-run 观察 | **仅用于 preview，非最终验收** |
| `npm run workbench -- "<prompt>" <host> --write` | 写入模式 | **preview/demo** | 实验性写入 | **⚠️ 非最终验收入口，Packet A path 待裁定** |

**Workbench 模式说明**:
- 默认: dry-run 模式（不写入文件）- **可用于 preview/观察**
- `--write`: 写入模式 - **⚠️ 当前为 preview/demo 级别，非 authoritative product path**
- `--confirm`: 确认模式（用于删除等危险操作）

**重要声明**:
- `workbench --write` **不应作为 Packet A 最终验收的 authoritative 入口**
- 在 authoritative create path 裁定前，workbench 仅用于 **preview/demo/辅助观察**
- `verify:p0` 通过 ≠ Packet A 已完成

### 1.3 CLI 命令

| 命令 | 功能 | 稳定性 | 适用场景 |
|------|------|--------|----------|
| `npm run cli` | CLI 交互模式 | **稳定** | 交互式功能创建 |
| `npm run cli:help` | 显示 CLI 帮助 | **稳定** | 查看帮助信息 |
| `npm run cli:micro` | 微功能快速测试 | **稳定** | 快速验证 CLI |
| `npm run cli:system` | 系统功能快速测试 | **稳定** | 快速验证系统功能 |

---

## 2. CLI 详细命令

### 2.1 主命令结构

```bash
npm run cli -- <command> [options]
```

### 2.2 Create 命令（默认）

```bash
# 交互模式
npm run cli

# 快速模式
npm run cli -- "<需求描述>"

# 示例
npm run cli -- "做一个按Q键的冲刺技能"
```

**输出**: IntentSchema → Blueprint → 提案输出

### 2.3 Dota2 命令组

```bash
# 运行完整主链路（dry-run 模式）
npm run cli -- dota2 run "<prompt>" --host <path>

# 预演模式（显式）
npm run cli -- dota2 dry-run "<prompt>" --host <path>

# 正式写入模式
npm run cli -- dota2 run "<prompt>" --host <path> --write

# 强制写入模式（覆盖 readiness gate）
npm run cli -- dota2 run "<prompt>" --host <path> --write --force

# 生成 review artifact
npm run cli -- dota2 review "<prompt>" --host <path> -o <output-path>
```

**Dota2 命令选项**:
| 选项 | 说明 | 示例 |
|------|------|------|
| `--host <path>` | 指定 host 根目录 | `--host D:\test1` |
| `--write` | 正式写入模式 | `--write` |
| `--force` | 强制覆盖 readiness gate | `--force` |
| `--dry-run` | 预演模式（默认） | `--dry-run` |
| `-o, --output <path>` | 输出 review artifact | `-o tmp/review.json` |
| `-v, --verbose` | 详细输出 | `--verbose` |

### 2.4 Update 命令

```bash
# Update 已有 feature（dry-run 模式）
npm run cli -- dota2 update "<prompt>" --host <path> --feature <feature-id>

# Update 正式写入
npm run cli -- dota2 update "<prompt>" --host <path> --feature <feature-id> --write
```

**⚠️ 风险标记**: Update 命令当前实现为实验性，可能触发 regenerate 安全门

### 2.5 Rollback 命令

```bash
# Rollback/删除 feature（dry-run 模式）
npm run cli -- dota2 rollback --host <path> --feature <feature-id>

# 正式执行 rollback
npm run cli -- dota2 rollback --host <path> --feature <feature-id> --write
```

**⚠️ 风险标记**: Rollback 命令当前实现可能不完整，验证时需检查文件是否真被删除

### 2.6 Regenerate 命令

```bash
# Regenerate 已有 feature（dry-run 模式）
npm run cli -- dota2 regenerate "<prompt>" --host <path> --feature <feature-id>

# 正式执行 regenerate
npm run cli -- dota2 regenerate "<prompt>" --host <path> --feature <feature-id> --write
```

**⚠️ 风险标记**: Regenerate 命令当前为实验性，不建议用于验收验证

### 2.7 Blueprint 命令组

```bash
# 生成 Blueprint
npm run cli -- blueprint "<需求描述>"

# 从文件生成 Blueprint
npm run cli -- blueprint --from <schema-file>

# 验证 Blueprint
npm run cli -- blueprint validate --from <blueprint-file>

# JSON 格式输出
npm run cli -- blueprint "<需求描述>" --json

# 输出到文件
npm run cli -- blueprint "<需求描述>" -o <output-file>
```

### 2.8 Assembly 命令组

```bash
# 生成 Assembly Plan
npm run cli -- assembly generate --from <blueprint-file>

# 验证 Assembly Plan
npm run cli -- assembly validate --from <assembly-file>

# Review Assembly
npm run cli -- assembly review --from <blueprint-file>
```

### 2.9 Export Bridge 命令

```bash
# 导出 workspace 到 UI bridge
npm run cli -- export-bridge --host <path>

# 指定输出目录
npm run cli -- export-bridge --host <path> --output <dir>
```

**输出**: `apps/workbench-ui/public/bridge-workspace.json`

---

## 3. Workbench 直接调用

### 3.1 使用 tsx 直接调用

```bash
# 基本调用
npx tsx apps/workbench/index.ts "<prompt>" <host-root>

# 写入模式
npx tsx apps/workbench/index.ts "<prompt>" <host-root> --write

# 带确认项
npx tsx apps/workbench/index.ts "<prompt>" <host-root> --confirm <item1,item2>
```

### 3.2 List 命令

```bash
# 列出所有 features
npx tsx apps/workbench/index.ts --list <host-root>

# 示例输出
# ID                    | Status    | Revision | Patterns | Files | Updated
# feature_xxx          | active    | 1        | 3        | 5     | 2026-04-10
```

### 3.3 Inspect 命令

```bash
# 查看 feature 详情
npx tsx apps/workbench/index.ts --inspect <feature-id> <host-root>

# 输出信息
# - Feature ID
# - Intent Kind
# - Status
# - Revision
# - Generated Files
# - Selected Patterns
```

### 3.4 Delete 命令

```bash
# 预览删除
npx tsx apps/workbench/index.ts --delete <feature-id> <host-root>

# 执行删除（需确认）
npx tsx apps/workbench/index.ts --delete <feature-id> <host-root> --confirm
```

---

## 4. 验证执行专用命令组合

### 4.1 Packet A 验证（Create）- Preview/Demo 级别

**⚠️ 用途边界**: 以下流程仅用于 **preview/demo/辅助观察**，**不应作为 Packet A 最终验收的 authoritative 流程**。

```bash
# 步骤 1: 类型检查（stable）
npm run check-types

# 步骤 2: 执行 create（dry-run）- 用于观察输出
npm run workbench -- "做一个按Q键的冲刺技能" D:\test1

# 步骤 3: 执行 create（写入）- ⚠️ preview/demo 级别，非 authoritative
# 注意：workbench --write 当前为 preview/demo 级别，非最终验收入口
npm run workbench -- "做一个按Q键的冲刺技能" D:\test1 --write

# 步骤 4: 检查 workspace
Get-Content "game/scripts/src/rune_weaver/rune-weaver.workspace.json" | ConvertFrom-Json

# 步骤 5: 列出 features 确认（观察用）
npx tsx apps/workbench/index.ts --list D:\test1

# 步骤 6: 导出 bridge
npm run cli -- export-bridge --host D:\test1
```

**状态说明**:
- 以上流程可用于观察 Packet A 行为，但 **不应宣布 Packet A 已通过**
- Authoritative create path 待裁定后，将更新为正式验收流程

### 4.2 Packet B 验证（Update）- 草案/Experimental

**⚠️ 依赖声明**: **Do not execute as formal acceptance until Packet A authoritative path is resolved.** 本节仅为草案。

```bash
# 步骤 1: 获取 feature ID（观察用）
npx tsx apps/workbench/index.ts --list D:\test1

# 步骤 2: 执行 update（dry-run）- experimental
npm run cli -- dota2 update "把冷却改成12秒" --host D:\test1 --feature <id>

# 步骤 3: 执行 update（写入）- ⚠️ experimental，可能触发 regenerate 安全门
npm run cli -- dota2 update "把冷却改成12秒" --host D:\test1 --feature <id> --write

# 步骤 4: 检查 revision 递增（观察用）
npx tsx apps/workbench/index.ts --inspect <id> D:\test1
```

**限制说明**:
- 在 Packet A authoritative path 裁定前，**不应作为正式验收流程**
- Update 命令当前为 **experimental**，可能触发 regenerate 安全门

### 4.3 Packet C 验证（Delete）- 草案/Experimental

**⚠️ 依赖声明**: **Do not execute as formal acceptance until Packet A authoritative path is resolved.** 本节仅为草案。

```bash
# 步骤 1: 预览删除（观察用）
npx tsx apps/workbench/index.ts --delete <id> D:\test1

# 步骤 2: 执行删除 - ⚠️ 需确认
npx tsx apps/workbench/index.ts --delete <id> D:\test1 --confirm

# 或使用 CLI rollback - ⚠️ experimental，实现可能不完整
npm run cli -- dota2 rollback --host D:\test1 --feature <id> --write

# 步骤 3: 确认 feature 已删除（观察用）
npx tsx apps/workbench/index.ts --list D:\test1
```

**限制说明**:
- 在 Packet A authoritative path 裁定前，**不应作为正式验收流程**
- Rollback 命令当前 **实现可能不完整**，验证时需检查文件是否真被删除

### 4.4 Packet D 验证（Governance）- 草案/Experimental

**⚠️ 依赖声明**: **Do not execute as formal acceptance until Packet A authoritative path is resolved.** 本节仅为草案。

```bash
# 步骤 1: 创建第一个 feature - ⚠️ preview/demo 级别
npm run workbench -- "创建冲刺技能，按Q键" D:\test1 --write

# 步骤 2: 尝试创建冲突 feature - ⚠️ preview/demo 级别
npm run workbench -- "创建闪烁技能，按Q键" D:\test1 --write

# 步骤 3: 检查 governance 输出（观察用）
# - hasConflict: true
# - recommendedAction: block/confirm
```

**限制说明**:
- 在 Packet A authoritative path 裁定前，**不应作为正式验收流程**
- Governance 规则可能随 authoritative path 调整

---

## 5. 环境变量

### 5.1 验证相关环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `ANTHROPIC_API_KEY` | Anthropic API 密钥 | `sk-ant-...` |
| `OPENAI_API_KEY` | OpenAI API 密钥 | `sk-...` |
| `RW_FORCE_UPDATE_WRITE` | 强制 update 写入（本地验证） | `1` 或 `true` |
| `RW_FORCE_WIZARD_DEGRADE` | 强制 wizard 降级（调试） | `1` |

### 5.2 使用示例

```powershell
# Windows PowerShell
$env:RW_FORCE_UPDATE_WRITE = "1"
npm run workbench -- "<prompt>" D:\test1 --write

# 或一次性设置
$env:RW_FORCE_UPDATE_WRITE = "1"; npm run workbench -- "<prompt>" D:\test1 --write
```

---

## 6. 输出文件位置

### 6.1 CLI Review Artifacts

```
tmp/cli-review/
├── dota2-review-run-<timestamp>.json
├── dota2-review-update-<timestamp>.json
├── dota2-review-rollback-<timestamp>.json
└── dota2-review-regenerate-<timestamp>.json
```

### 6.2 Workspace 文件

```
<host-root>/
└── game/scripts/src/rune_weaver/
    └── rune-weaver.workspace.json
```

### 6.3 Bridge 导出

```
apps/workbench-ui/public/bridge-workspace.json
```

### 6.4 生成的代码

```
<host-root>/
├── game/scripts/src/rune_weaver/        # Server TypeScript
├── game/scripts/vscripts/rune_weaver/   # Server Lua
├── game/scripts/kv/rune_weaver/         # KV 配置
└── content/panorama/src/rune_weaver/    # UI 组件
```

---

## 7. 命令稳定性分级

### 7.1 稳定命令（可用于开发验证）

| 命令 | 稳定性 | 用途边界 |
|------|--------|----------|
| `npm run verify:p0` | **stable** | 代码健康检查，可用于开发验证 |
| `npm run check-types` | **stable** | 类型检查，可用于开发验证 |
| `npm run test` | **stable** | 单元测试，可用于开发验证 |
| `npm run cli -- export-bridge` | **stable** | Bridge 导出，可用于开发验证 |
| `npx tsx apps/workbench/index.ts --list` | **stable** | 列出 features，观察用 |
| `npx tsx apps/workbench/index.ts --inspect` | **stable** | 查看 feature 详情，观察用 |
| `npx tsx apps/workbench/index.ts --delete` | **stable** | 删除 feature，可用于清理 |

**注意**: 以上命令可用于开发验证和观察，但 `verify:p0` 通过 ≠ Packet A 已完成。

### 7.1a 非稳定/Preview 命令（不用于最终验收）

| 命令 | 稳定性 | 用途边界 |
|------|--------|----------|
| `npm run workbench`（dry-run 和 write 模式） | **preview/demo** | **非 authoritative 验收入口**，仅用于 preview/观察 |
| `npm run cli -- dota2 run`（dry-run 和 write 模式） | **preview/demo** | **非 authoritative 验收入口**，Packet A path 待裁定 |

**重要**: 在 Packet A authoritative path 裁定前，以上命令**不应作为最终验收的执行入口**。

### 7.2 实验性命令（不建议用于验收）

- `npm run cli -- dota2 update` ⚠️
- `npm run cli -- dota2 regenerate` ⚠️
- `npm run cli -- dota2 rollback` ⚠️（实现可能不完整）

### 7.3 内部命令（主要用于调试）

- `npm run cli -- blueprint`
- `npm run cli -- assembly`
- `npm run cli -- wizard`

---

## 8. 快速参考卡

### 8.1 最常用命令

```bash
# 快速验证
npm run verify:p0

# Create feature（dry-run）
npm run workbench -- "<prompt>" D:\test1

# Create feature（write）
npm run workbench -- "<prompt>" D:\test1 --write

# List features
npx tsx apps/workbench/index.ts --list D:\test1

# Inspect feature
npx tsx apps/workbench/index.ts --inspect <id> D:\test1

# Export bridge
npm run cli -- export-bridge --host D:\test1
```

### 8.2 完整验证流程

```bash
# 1. 代码健康
npm run verify:p0

# 2. Create 验证
npm run workbench -- "做一个按Q键的冲刺技能" D:\test1 --write

# 3. 检查 workspace
cat game/scripts/src/rune_weaver/rune-weaver.workspace.json

# 4. 导出 bridge
npm run cli -- export-bridge --host D:\test1

# 5. 检查 bridge
cat apps/workbench-ui/public/bridge-workspace.json
```

---

*文档版本: 1.0*
*最后更新: 2026-04-10*
*与 VALIDATION-PLAYBOOK.md 配套使用*

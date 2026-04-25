# Rune Weaver 验证执行手册

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-phase-change
> Last verified: 2026-04-23
> Read when: executing validation and recording validation results
> Do not use for: defining acceptance by itself, changing milestone scope, or replacing the execution baseline

## 文档定位

本手册是**验证执行方法**文档，不是验收标准定义，也不是产品叙述文档。

- **验收标准来源**: [CANONICAL-ACCEPTANCE-CASES.md](./CANONICAL-ACCEPTANCE-CASES.md) 和 [ACCEPTANCE-CHECKLISTS.md](./ACCEPTANCE-CHECKLISTS.md)
- **产品叙述来源**: [README.md](../README.md) 和任务二产出
- **本手册职责**: 说明"如何执行验证"和"如何记录结果"

---

## 1. 快速开始

### 1.1 验证执行总入口

```bash
# P0 验证（类型检查 + 测试 + 示例 + CLI微功能）
npm run verify:p0

# 完整 workbench 流程（默认 dry-run 模式）
npm run workbench -- "做一个按Q键的冲刺技能" D:\test1

# 带写入的 workbench 流程
npm run workbench -- "做一个按Q键的冲刺技能" D:\test1 --write
```

### 1.2 验证执行基本流程

```
1. 准备 Clean State
   ↓
2. 执行验证命令
   ↓
3. 检查 Workspace 状态
   ↓
4. 检查 Host 文件系统
   ↓
5. 检查 Bridge 导出
   ↓
6. 记录验证结果
```

---

## 2. Packet A: Create + Workspace Truth 执行流程

**⚠️ 重要状态声明**: Packet A 的 authoritative create path 尚未最终裁定。本节内容仅供预览/辅助观察，**不应作为最终验收的执行入口**。

### 2.1 前置条件

| 检查项 | 要求 |
|--------|------|
| Host Root | 有效的 Dota2 项目路径（如 `D:\test1`） |
| Clean State | Workspace 为空或已备份 |
| LLM | 已配置 ANTHROPIC_API_KEY 或 OPENAI_API_KEY（可选，有 fallback） |
| **重要** | 当前处于 **preview/demo 阶段**，非最终验收入口 |

### 2.2 Clean State 准备

```powershell
# 1. 检查当前 workspace 状态
Test-Path "game/scripts/src/rune_weaver/rune-weaver.workspace.json"

# 2. 如需重置，备份后删除 workspace 文件
# 低风险：仅删除 workspace 记录
Remove-Item "game/scripts/src/rune_weaver/rune-weaver.workspace.json" -ErrorAction SilentlyContinue

# 3. 如需彻底清理，删除生成的文件（中风险）
Remove-Item "game/scripts/src/rune_weaver/*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "content/panorama/src/rune_weaver/*" -Recurse -Force -ErrorAction SilentlyContinue
```

### 2.3 执行 Create 验证（Preview/Demo 用途）

**⚠️ 用途边界**: 以下命令仅用于 preview/demo/辅助观察，**不应作为 Packet A 最终验收的 authoritative 入口**。

**临时执行路径（Workbench）- Preview/Demo 级别**

```bash
# 步骤 1: 执行 create（dry-run 模式）- 用于观察输出
npm run workbench -- "做一个按Q键触发的朝鼠标方向冲刺技能，冷却8秒" D:\test1

# 步骤 2: 检查输出中的关键信息
# - Feature ID 是否生成
# - selectedPatterns 是否包含 input.key_binding, effect.dash
# - generatedFiles 是否非空
# - entryBindings 是否非空

# 步骤 3: 执行真实写入（⚠️ 实验性，非最终验收入口）
# 注意：workbench --write 当前为 preview/demo 级别，非 authoritative product path
npm run workbench -- "做一个按Q键触发的朝鼠标方向冲刺技能，冷却8秒" D:\test1 --write
```

**状态说明**:
- `verify:p0` 通过 ≠ Packet A 已完成
- `workbench --write` 当前为 **preview/demo** 级别，非最终验收入口
- Authoritative create path 待裁定后更新

**Case C-05: Cross-System Composition with UI（Preview）**

```bash
# 执行带 UI 的 create（preview 级别）
npm run workbench -- "创建一个火焰冲击技能系统：按E键消耗100点法力值释放，朝鼠标方向造成范围伤害，并在UI上显示法力条和冷却时间" D:\test1 --write
```

### 2.4 验证检查点

#### 2.4.1 Workspace 记录检查

```powershell
# 读取 workspace 文件
Get-Content "game/scripts/src/rune_weaver/rune-weaver.workspace.json" | ConvertFrom-Json
```

检查字段：
- [ ] `featureId`: 非空稳定字符串
- [ ] `blueprintId`: 非空
- [ ] `selectedPatterns`: 非空数组
- [ ] `generatedFiles`: 非空数组，路径在 RW 目录内
- [ ] `entryBindings`: 非空数组
- [ ] `revision`: 等于 1
- [ ] `status`: "active"
- [ ] `createdAt`/`updatedAt`: 有效 ISO 时间戳

#### 2.4.2 文件系统检查

```powershell
# 检查生成的文件是否存在
Get-ChildItem "game/scripts/src/rune_weaver/" -Recurse
Get-ChildItem "content/panorama/src/rune_weaver/" -Recurse
```

检查项：
- [ ] 所有 `generatedFiles` 路径存在
- [ ] 文件非空（大小 > 0）
- [ ] 文件位于 Rune Weaver 拥有的目录内

#### 2.4.3 Bridge 检查

```powershell
# 检查 bridge 导出
cat "apps/workbench-ui/public/bridge-workspace.json" | ConvertFrom-Json
```

检查项：
- [ ] Feature 绑定存在
- [ ] Server binding 正确
- [ ] UI binding 正确（如适用）
- [ ] `_bridge.exportedBy = rune-weaver-cli`
- [ ] root-level `governanceReadModel` 存在
- [ ] `workspace.features.length` 与 `governanceReadModel.workspace.featureCount` 对齐

#### 2.4.4 Host Truth 验证

```bash
# 检查修改的文件范围
git diff --name-only
```

检查项：
- [ ] 仅修改 Rune Weaver 拥有的目录
- [ ] 无未授权路径修改
- [ ] Bridge points 正确更新

---

## 3. Packet B: Update 执行流程草案

### 3.1 前置条件

- Packet A 已成功执行
- 目标 feature 存在且 status 为 "active"
- 已知目标 `featureId`

### 3.2 执行 Update 验证

**Case C-02: Persisted Feature Update**

```bash
# 步骤 1: 获取 feature ID（从 Packet A 的输出或 list 命令）
npm run cli -- dota2 list --host D:\test1

# 步骤 2: 执行 update（dry-run 模式）
npm run cli -- dota2 update "把冲刺技能的冷却时间从8秒改成12秒" --host D:\test1 --feature <feature-id>

# 步骤 3: 检查 update diff 输出
# - unchangedFiles 应与原文件一致
# - refreshedFiles 应包含修改的文件
# - requiresRegenerate 应为 false

# 步骤 4: 执行真实写入
npm run cli -- dota2 update "把冲刺技能的冷却时间从8秒改成12秒" --host D:\test1 --feature <feature-id> --write
```

### 3.3 验证检查点

#### 3.3.1 Feature Identity 保持

- [ ] `featureId` 与 C-01 相同
- [ ] `blueprintId` 未改变

#### 3.3.2 Revision 递增

- [ ] `revision` 从 N 增加到 N+1
- [ ] `updatedAt` 时间戳更新

#### 3.3.3 Owned-Scope Rewrite

- [ ] `generatedFiles` 路径与 C-01 相同
- [ ] 无新文件创建
- [ ] 仅目标 feature 的文件被修改

---

## 4. Packet C: Delete/Unload 执行流程草案

### 4.1 前置条件

- Packet A 已成功执行
- 目标 feature 存在且 status 为 "active"
- 已知目标 `featureId`

### 4.2 执行 Delete 验证

**Case C-03: Feature Delete / Unload**

```bash
# 步骤 1: 预览 delete 影响
npm run workbench -- --delete <feature-id> D:\test1

# 步骤 2: 执行 delete（需确认）
npm run workbench -- --delete <feature-id> D:\test1 --confirm

# 或使用 CLI
npm run cli -- dota2 rollback --host D:\test1 --feature <feature-id> --write
```

### 4.3 验证检查点

#### 4.3.1 Workspace 状态

- [ ] Feature record 被移除或 status 变为 "archived"/"disabled"
- [ ] 不再出现在 active features 列表

#### 4.3.2 文件系统清理

- [ ] `generatedFiles` 中的文件已从磁盘删除
- [ ] 无孤儿文件残留

#### 4.3.3 Bridge 清理

- [ ] `entryBindings` 从 bridge 导出中移除
- [ ] Bridge points 不再引用已删除 feature

---

## 5. Packet D: Governance 执行流程草案

### 5.1 前置条件

- Clean workspace
- 准备创建冲突场景

### 5.2 执行 Governance 验证

**Case C-04: Minimal Conflict / Overlap**

```bash
# 步骤 1: 创建第一个 feature（冲刺技能，Q键）
npm run workbench -- "创建一个按Q键触发的冲刺技能" D:\test1 --write

# 步骤 2: 尝试创建第二个 feature（闪烁技能，同样Q键）
npm run workbench -- "创建一个按Q键触发的闪烁技能" D:\test1 --write

# 步骤 3: 检查 governance 输出
# - hasConflict 应为 true
# - recommendedAction 应为 "block" 或 "confirm"
```

### 5.3 验证检查点

#### 5.3.1 Conflict Detection

- [ ] `conflictResult.hasConflict` 为 true
- [ ] `conflicts` 数组非空
- [ ] `conflictingPoint` 显示冲突的集成点

#### 5.3.2 Governance Enforcement

- [ ] `recommendedAction` 不为 "proceed"
- [ ] 如为 "block"，写入被阻止
- [ ] 如为 "confirm"，需显式确认后才可写入

---

## 6. verify:p0 与 Case-Based Validation 的关系

### 6.1 verify:p0 定位

```bash
npm run verify:p0
```

执行内容：
1. `npm run check-types` - TypeScript 类型检查
2. `npm run test` - 运行测试
3. `npm run examples` - 运行示例
4. `npm run cli:micro` - CLI 微功能测试

**用途**: 开发阶段快速验证代码健康和基础功能

### 6.2 Case-Based Validation 定位

执行内容：
- 按 [CANONICAL-ACCEPTANCE-CASES.md](./CANONICAL-ACCEPTANCE-CASES.md) 执行具体场景
- 验证 workspace truth、host truth、bridge consistency
- 产生可审查的执行证据

**用途**: 验收阶段验证产品级功能

### 6.3 使用关系

| 阶段 | 使用命令 | 目的 |
|------|----------|------|
| 开发 | `verify:p0` | 快速验证代码健康 |
| 功能验证 | Case-based | 验证具体功能场景 |
| 验收 | Case-based + verify:p0 | 完整验证 |

---

## 7. 命令速查表

### 7.1 NPM Scripts

| 命令 | 用途 | Packet |
|------|------|--------|
| `npm run verify:p0` | P0 验证（类型+测试+示例+CLI） | - |
| `npm run workbench` | 运行 workbench 完整流程 | A/B/C |
| `npm run cli` | CLI 交互模式 | A/B/C/D |
| `npm run check-types` | TypeScript 类型检查 | - |
| `npm run test` | 运行测试 | - |

### 7.2 CLI 命令

| 命令 | 用途 | 示例 |
|------|------|------|
| `cli dota2 run` | 运行完整主链路 | `npm run cli -- dota2 run "<prompt>" --host <path>` |
| `cli dota2 update` | 更新已有 feature | `npm run cli -- dota2 update "<prompt>" --host <path> --feature <id>` |
| `cli dota2 rollback` | 回滚/删除 feature | `npm run cli -- dota2 rollback --host <path> --feature <id>` |
| `cli export-bridge` | 导出 workspace 到 UI bridge；也是唯一 legacy payload refresh lane | `npm run cli -- export-bridge --host <path>` |

### 7.3 Workbench 命令

| 命令 | 用途 | 示例 |
|------|------|------|
| `workbench --list` | 列出所有 features | `npx tsx apps/workbench/index.ts --list D:\test1` |
| `workbench --inspect` | 查看 feature 详情 | `npx tsx apps/workbench/index.ts --inspect <id> D:\test1` |
| `workbench --delete` | 删除 feature | `npx tsx apps/workbench/index.ts --delete <id> D:\test1 --confirm` |

---

## 8. 证据文件位置

### 8.1 核心证据文件

| 证据类型 | 文件路径 |
|----------|----------|
| Workspace 状态 | `game/scripts/src/rune_weaver/rune-weaver.workspace.json` |
| Bridge 导出 | `apps/workbench-ui/public/bridge-workspace.json` |
| CLI Review | `tmp/cli-review/dota2-review-*.json` |
| 生成的代码 | `game/scripts/src/rune_weaver/**/*` |
| 生成的 UI | `content/panorama/src/rune_weaver/**/*` |

### 8.2 批准的 Bridge Points

| Bridge Point | 路径 |
|--------------|------|
| Server 入口 | `game/scripts/src/modules/index.ts` |
| UI 入口 | `content/panorama/src/hud/script.tsx` |

---

## 9. 故障排查

### 9.1 常见问题

#### Workspace 文件不存在

```powershell
# 检查路径
Test-Path "game/scripts/src/rune_weaver/rune-weaver.workspace.json"

# 检查 host root 是否正确
# 确保传入的 host 路径是绝对路径且存在
```

#### Feature ID 冲突

```bash
# 列出所有 features 查看 ID
npm run workbench -- --list D:\test1
```

#### Bridge 导出未更新

```bash
# 手动触发 bridge 导出
npm run cli -- export-bridge --host D:\test1
```

边界说明:
- 这里的 `export-bridge` 只负责把 stale legacy payload 刷新为 governed bridge payload
- 它不是 `doctor` / `validate` / `repair` 的替代，也不引入新的 runtime semantics 或 reusable admission

Refresh cadence (event-driven):
- 当 feature lifecycle 变化需要反映到 product-facing bridge 时刷新：create / update / rollback / delete / regenerate
- 当 Dota2 governance read-model schema 或 projection 变化影响 bridge payload 时刷新
- 当 `apps/workbench-ui/public/bridge-workspace.json` 缺失根级 `governanceReadModel` 时刷新
- 当 proof host 重新导出，且 checked-in bridge sample 需要跟上新的 proof host 或新的 `_bridge.exportedAt` 时刷新
- 禁止把 `doctor`、`validate`、`repair`、`workbench --inspect` 或手工 JSON 编辑当作 refresh lane
- 退役 stale payload 时，只运行 `npm run cli -- export-bridge --host <path>`

### 9.2 风险标记

| 风险 | 说明 | 处理 |
|------|------|------|
| `regenerate` 命令 | 当前为实验性 | 不建议用于验收 |
| `rollback` 命令 | 当前实现可能不完整 | 验证时检查文件是否真被删除 |
| KV 生成 | 部分 deferred | 检查 deferred warnings |

---

## 10. 与其他任务的边界

### 10.1 与任务一（验收资产收口）的边界

- **任务一**: 定义 canonical cases、checklist、evidence 要求
- **本手册**: 使用任务一的标准，说明如何执行验证

对齐点：
- [CANONICAL-ACCEPTANCE-CASES.md](./CANONICAL-ACCEPTANCE-CASES.md) - 复用 case 定义
- [ACCEPTANCE-CHECKLISTS.md](./ACCEPTANCE-CHECKLISTS.md) - 复用 checklist
- [ACCEPTANCE-EVIDENCE-TEMPLATE.md](./ACCEPTANCE-EVIDENCE-TEMPLATE.md) - 复用记录模板

### 10.2 与任务二（README/demo narrative）的边界

- **任务二**: 产品叙述、demo path、walkthrough 文案
- **本手册**: 验证执行方法，不涉及产品故事

### 10.3 与 Packet A 主链路的边界

- **Packet A 主链路**: 实现 create/write/workspace persistence
- **本手册**: 整理验证流程，不修改实现

---

## 附录 A: 验证执行记录模板

见 [ACCEPTANCE-EVIDENCE-TEMPLATE.md](./ACCEPTANCE-EVIDENCE-TEMPLATE.md)

简化版记录模板：

```markdown
## 验证执行记录

| 字段 | 值 |
|------|-----|
| Case ID | C-01 |
| 执行时间 | 2026-04-10 10:00:00 |
| 执行命令 | `npm run workbench -- "..." D:\test1 --write` |

### Workspace 检查
- [ ] featureId: `<id>`
- [ ] revision: 1
- [ ] status: active
- [ ] generatedFiles: <count> files

### 文件检查
- [ ] 所有 generatedFiles 存在
- [ ] 文件非空
- [ ] 路径在 RW 目录内

### 结论
- [ ] PASS / FAIL
- [ ] 阻塞问题: <描述>
```

---

## 附录 B: Clean-State Protocol

见 [CLEAN-STATE-PROTOCOL.md](./CLEAN-STATE-PROTOCOL.md)（如存在）

核心要点：

1. **Clean Workspace 定义**: `features: []`，无 active features
2. **安全重置**: 仅删除 workspace 文件，保留目录结构
3. **高风险操作**: 删除整个 `rune_weaver` 目录需谨慎
4. **必须保留**: 宿主核心代码、批准的 bridge points

---

*文档版本: 1.0*
*最后更新: 2026-04-10*
*与任务一产出对齐: CANONICAL-ACCEPTANCE-CASES.md, ACCEPTANCE-CHECKLISTS.md, ACCEPTANCE-EVIDENCE-TEMPLATE.md*

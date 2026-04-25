# Rune Weaver 命令配方

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-25
> Read when: locating real command entry points for lifecycle work, validation, bridge refresh, or product-surface verification
> Do not use for: inventing unsupported commands, changing scope, or replacing the execution baseline

本文档只整理**当前真实存在**的命令入口，并按当前 Step 7 truth 说明它们各自的 authority boundary。

## 1. Command Surface Map

### 1.1 Authoritative CLI Surface

这些命令属于当前 Dota2 authoritative lifecycle path：

| 命令 | 作用 | 边界 |
|------|------|------|
| `npm run cli -- dota2 run "<prompt>" --host <path>` | create / dry-run review | CLI authoritative |
| `npm run cli -- dota2 run "<prompt>" --host <path> --write` | create / write | CLI authoritative |
| `npm run cli -- dota2 update "<prompt>" --host <path> --feature <id>` | update / dry-run review | CLI authoritative |
| `npm run cli -- dota2 update "<prompt>" --host <path> --feature <id> --write` | update / write | CLI authoritative |
| `npm run cli -- dota2 regenerate "<prompt>" --host <path> --feature <id>` | regenerate / dry-run review | CLI authoritative |
| `npm run cli -- dota2 regenerate "<prompt>" --host <path> --feature <id> --write` | regenerate / write | CLI authoritative |
| `npm run cli -- dota2 rollback --host <path> --feature <id>` | rollback / dry-run review | CLI authoritative |
| `npm run cli -- dota2 rollback --host <path> --feature <id> --write` | rollback / write | CLI authoritative |
| `npm run cli -- dota2 repair --host <path>` | repair plan / review | CLI authoritative |
| `npm run cli -- dota2 repair --host <path> --safe` | execute safe repairs | CLI authoritative |
| `npm run cli -- dota2 doctor --host <path>` | host-health / repairability observation | CLI authoritative, read-only |
| `npm run cli -- dota2 validate --host <path>` | validation | CLI authoritative, read-only |
| `npm run cli -- dota2 init --host <path>` | host initialization | CLI authoritative |
| `npm run cli -- dota2 check-host --host <path>` | host readiness scan | CLI authoritative, read-only |
| `npm run cli -- dota2 launch --host <path>` | launch handoff | CLI authoritative helper |

### 1.2 Bridge Refresh Surface

| 命令 | 作用 | 边界 |
|------|------|------|
| `npm run cli -- export-bridge --host <path>` | 导出 governed bridge payload | 唯一 stale payload refresh lane |
| `npm run cli -- export-bridge --host <path> --output <dir>` | 导出到指定目录 | 唯一 stale payload refresh lane |

`export-bridge` 的职责固定为：

- 从现有 host-backed workspace truth 重新导出 governed bridge payload
- 输出 `{ workspace, governanceReadModel, _bridge }`
- 退役 stale bridge/raw workspace payload

`export-bridge` 不是：

- `doctor`
- `validate`
- `repair`
- connected-host status
- 手工 JSON 编辑

### 1.3 Product Entry / Review Surface

这些入口用于产品面观察、桥接、inspect、connected-host review，不承担 lifecycle authority：

| 命令 | 作用 | 边界 |
|------|------|------|
| `npm run workbench` | 启动 workbench product shell | product entry / orchestration |
| `npm run workbench -- "<prompt>" <host>` | workbench create/review surface | product entry / orchestration |
| `npm run workbench -- "<prompt>" <host> --write` | workbench 发起写入 | 仍经 CLI/main path 落地；Workbench 不是 authority |
| `npx tsx apps/workbench/index.ts --list <host>` | list features | inspect/review helper |
| `npx tsx apps/workbench/index.ts --inspect <featureId> <host>` | inspect feature | inspect/review helper |
| `npx tsx apps/workbench/index.ts --delete <featureId> <host>` | delete preview | inspect/review helper |
| `npx tsx apps/workbench/index.ts --delete <featureId> <host> --confirm` | workspace-level delete helper | operational helper, not a new authority model |

Workbench 的当前定位固定为：

- product entry
- orchestration shell
- review / inspect / evidence surface
- connected-host and bridge reader
- not lifecycle authority

## 2. Common Recipes

### 2.1 Create

```bash
# Dry-run review
npm run cli -- dota2 run "创建一个按G键触发的装备抽取功能" --host D:\rw-test1

# Write
npm run cli -- dota2 run "创建一个按G键触发的装备抽取功能" --host D:\rw-test1 --write

# Force only when overriding an honest late gate
npm run cli -- dota2 run "..." --host D:\rw-test1 --write --force
```

说明：

- CLI `run` 是当前 authoritative create path
- review artifact 是主链的一部分，不是可选附属物
- explicit choose-one `selection_pool` asks 不再默认 wizard-by-default；ambiguous weighted-card ask 仍会 honest block

### 2.2 Update

```bash
# Dry-run review
npm run cli -- dota2 update "把选择数量改成5个" --host D:\rw-test1 --feature talent_draw_demo

# Write
npm run cli -- dota2 update "把选择数量改成5个" --host D:\rw-test1 --feature talent_draw_demo --write
```

### 2.3 Regenerate

```bash
# Dry-run review
npm run cli -- dota2 regenerate "保持功能语义，重做当前生成产物" --host D:\rw-test1 --feature talent_draw_demo

# Write
npm run cli -- dota2 regenerate "保持功能语义，重做当前生成产物" --host D:\rw-test1 --feature talent_draw_demo --write
```

### 2.4 Rollback / Delete

```bash
# Dry-run review
npm run cli -- dota2 rollback --host D:\rw-test1 --feature talent_draw_demo

# Write
npm run cli -- dota2 rollback --host D:\rw-test1 --feature talent_draw_demo --write
```

### 2.5 Repair / Doctor / Validate

```bash
# Validation
npm run cli -- dota2 validate --host D:\rw-test1

# Doctor
npm run cli -- dota2 doctor --host D:\rw-test1

# Review repair plan
npm run cli -- dota2 repair --host D:\rw-test1

# Execute safe repairs
npm run cli -- dota2 repair --host D:\rw-test1 --safe
```

边界：

- `doctor` / `validate` / `repair` 是观察、验证、修复 surface
- 它们不刷新 stale payload
- 连接真实宿主的 connected-host status 也不会隐式调用这些命令

### 2.6 Export Governed Bridge Payload

```bash
# Default checked-in lane
npm run cli -- export-bridge --host D:\rw-test1

# Explicit output directory
npm run cli -- export-bridge --host D:\rw-test1 --output D:\tmp\bridge-proof
```

Refresh cadence 固定为 event-driven：

- feature create / update / regenerate / rollback / delete 后，若产品面需要反映该 host truth
- governance read-model schema / projection 改变后
- product-facing bridge artifact 缺失 root-level `governanceReadModel`
- proof host/sample 需要重导出

永远不要把下面这些当成 refresh lane：

- `doctor`
- `validate`
- `repair`
- `workbench --inspect`
- connected-host status
- manual JSON editing

## 3. Validation / Product-Surface Recipes

### 3.1 Minimal Dota2 Lifecycle Proof

```bash
npm run check-types
npm run cli -- dota2 run "创建一个按F4触发的天赋抽取功能" --host D:\rw-test1 --write
npm run cli -- dota2 validate --host D:\rw-test1
npm run cli -- dota2 doctor --host D:\rw-test1
npm run cli -- export-bridge --host D:\rw-test1
```

检查点：

- workspace 有 feature record
- host write 成功
- validate / doctor 通过
- exported bridge payload 带 root-level `governanceReadModel`

### 3.2 Connected-Host / Workbench Review

```bash
# Launch workbench shell
npm run workbench

# Or inspect from terminal
npx tsx apps/workbench/index.ts --inspect talent_draw_demo D:\rw-test1
```

检查点：

- workbench / inspect 优先显示 `governanceReadModel`
- connected-host 未请求 live observation 时，`repairability = not_checked` 是 honest 状态
- legacy payload 才显示 compatibility-only warning

## 4. Stability Labels

### 4.1 Stable / Authoritative

| 命令 | 标签 | 说明 |
|------|------|------|
| `npm run check-types` | stable | code health |
| `npm run test` | stable | test suite |
| `npm run cli -- dota2 run|update|regenerate|rollback|repair|doctor|validate|init|check-host|launch` | authoritative CLI | 当前真实 lifecycle / host surface |
| `npm run cli -- export-bridge` | stable refresh lane | 唯一 stale payload refresh lane |

### 4.2 Product Entry / Review

| 命令 | 标签 | 说明 |
|------|------|------|
| `npm run workbench` | product entry | orchestration / review shell |
| `npx tsx apps/workbench/index.ts --list|inspect|delete` | review helper | inspect / review / operational helper |

### 4.3 Debug / Internal

| 命令 | 标签 | 说明 |
|------|------|------|
| `npm run cli -- blueprint ...` | internal | blueprint-focused debugging surface |
| `npm run cli -- assembly ...` | internal | assembly-focused debugging surface |
| `npm run cli -- wizard ...` | internal | wizard-focused debugging surface |
| `npm run cli -- pattern ...` | internal | pattern validation surface |

## 5. Output Locations

### 5.1 Review Artifacts

```text
tmp/cli-review/
```

### 5.2 Workspace

```text
<host-root>/game/scripts/src/rune_weaver/rune-weaver.workspace.json
```

### 5.3 Bridge Export

```text
apps/workbench-ui/public/bridge-workspace.json
```

### 5.4 Generated Code

```text
<host-root>/
├── game/scripts/src/rune_weaver/
├── game/scripts/vscripts/rune_weaver/
├── game/scripts/kv/rune_weaver/
└── content/panorama/src/rune_weaver/
```

## 6. Quick Reference

```bash
# Create
npm run cli -- dota2 run "<prompt>" --host <path> --write

# Update
npm run cli -- dota2 update "<prompt>" --host <path> --feature <id> --write

# Regenerate
npm run cli -- dota2 regenerate "<prompt>" --host <path> --feature <id> --write

# Rollback
npm run cli -- dota2 rollback --host <path> --feature <id> --write

# Repair / Doctor / Validate
npm run cli -- dota2 repair --host <path> --safe
npm run cli -- dota2 doctor --host <path>
npm run cli -- dota2 validate --host <path>

# Export governed bridge payload
npm run cli -- export-bridge --host <path>
```

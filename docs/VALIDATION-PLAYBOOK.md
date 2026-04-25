# Rune Weaver 验证执行手册

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-phase-change
> Last verified: 2026-04-25
> Read when: executing validation and recording validation results
> Do not use for: defining acceptance by itself, changing milestone scope, or replacing the execution baseline

## 文档定位

本手册是**验证执行方法**文档，不是产品叙述文档，也不是 same-day blocker 看板。

- **验收标准来源**: [CANONICAL-ACCEPTANCE-CASES.md](/D:/Rune%20Weaver/docs/CANONICAL-ACCEPTANCE-CASES.md) 和 [ACCEPTANCE-CHECKLISTS.md](/D:/Rune%20Weaver/docs/ACCEPTANCE-CHECKLISTS.md)
- **公开边界来源**: [README.md](/D:/Rune%20Weaver/README.md)
- **同日主线 truth**: [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)、[RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)、最新 session-sync
- **本文档职责**: 说明如何执行验证、如何检查 evidence、如何记录结果

## 1. Validation Entry Points

### 1.1 CLI Lifecycle / Host Validation

```bash
npm run cli -- dota2 run "<prompt>" --host <path> --write
npm run cli -- dota2 update "<prompt>" --host <path> --feature <id> --write
npm run cli -- dota2 regenerate "<prompt>" --host <path> --feature <id> --write
npm run cli -- dota2 rollback --host <path> --feature <id> --write
npm run cli -- dota2 doctor --host <path>
npm run cli -- dota2 validate --host <path>
npm run cli -- dota2 repair --host <path>
npm run cli -- export-bridge --host <path>
```

这些是当前真实的 Dota2 validation / lifecycle surfaces。

### 1.2 Workbench / Product-Surface Validation

```bash
npm run workbench
npx tsx apps/workbench/index.ts --inspect <featureId> <host-root>
```

Workbench 只承担：

- product entry
- review / inspect
- connected-host / bridge display validation

Workbench 不承担：

- lifecycle authority
- stale payload refresh
- implicit doctor / validate execution

## 2. Baseline Validation Flow

标准执行顺序：

```text
1. 准备可验证宿主
2. 执行 CLI lifecycle 命令
3. 检查 workspace truth
4. 检查 generated host files
5. 跑 validate / doctor
6. 导出 bridge payload
7. 检查 governanceReadModel / product surfaces
8. 记录 evidence
```

## 3. Clean-State / Safe Preparation

不要把 destructive cleanup 当作默认前置。

优先顺序：

1. 使用新的 disposable host
2. 使用现有 clean-state protocol / host seed 流程
3. 若必须在旧 host 上重做，优先通过 governed lifecycle 命令或明确的人工 review 做收尾

验证前最少检查：

```powershell
Test-Path "D:\rw-test1\game\scripts\src\rune_weaver\rune-weaver.workspace.json"
```

如果 workspace 已存在：

- 先确认这是要复用的 host，还是应切换到新 host
- 不要把“删除一堆文件”当成通用清场手段

## 4. Core Evidence Checks

### 4.1 Workspace Truth

检查文件：

```text
<host-root>/game/scripts/src/rune_weaver/rune-weaver.workspace.json
```

至少确认：

- `featureId` 合理且稳定
- `status` 合理
- `revision` 合理
- `generatedFiles` 非空且在受管目录内
- `commitDecision` 与 lifecycle truth 一致
- feature-level grounding summary 存在且与当前 feature truth 对齐

### 4.2 Host Truth

检查：

- 所有 `generatedFiles` 在磁盘上存在
- 文件位于 Rune Weaver 拥有的目录内
- bridge points 更新合理
- 没有未授权 host path 写入

### 4.3 Validation / Doctor Truth

```bash
npm run cli -- dota2 validate --host <path>
npm run cli -- dota2 doctor --host <path>
```

检查：

- validate 通过，或失败原因与当前 review artifact / executionAuthority 一致
- doctor 的 repairability / action summary 合理
- repairability 仍是 live observation，不被误当成 persisted workspace authority

### 4.4 Bridge / Product Truth

```bash
npm run cli -- export-bridge --host <path>
```

检查文件：

```text
apps/workbench-ui/public/bridge-workspace.json
```

至少确认：

- root-level `governanceReadModel` 存在
- `_bridge.exportedBy = "rune-weaver-cli"`
- `workspace.features.length` 与 `governanceReadModel.workspace.featureCount` 对齐
- feature lifecycle / reusable governance / grounding / repairability 四轴可读

## 5. Product-Surface Checks

### 5.1 Governed Payload

若当前 payload 带 `governanceReadModel`：

- Workbench / inspect 应优先消费该 projection
- `compatibilitySource` 应表现为 governance-read-model
- 不应退回 compatibility-only heuristic

### 5.2 Connected Host

connected-host path 检查：

- `/api/host/status` 在 workspace 存在时返回 `governanceReadModel`
- 未请求 live observation 时，`repairability = not_checked`
- 这是 honest 状态，不是缺失 canonical truth

### 5.3 Legacy Compatibility Boundary

legacy raw workspace / old bridge / old host-status / legacy workbench-result payload 检查：

- 仍可读
- 必须带 compatibility-only / legacy warning
- 不得显示：
  - `clean`
  - `committable`
  - admitted assets
  - readiness score
  - grounding trust

## 6. Example Validation Recipes

### 6.1 Fresh Host Create + Validate + Export

```bash
npm run check-types
npm run cli -- dota2 run "创建一个按F4弹出三选一的天赋抽取功能" --host D:\rw-test1 --write
npm run cli -- dota2 validate --host D:\rw-test1
npm run cli -- dota2 doctor --host D:\rw-test1
npm run cli -- export-bridge --host D:\rw-test1
```

预期：

- feature 被写入 workspace
- generated host files 存在
- validate / doctor 通过
- bridge payload 带 root-level `governanceReadModel`

### 6.2 Connected-Host Product Check

```bash
npm run workbench
```

在 UI 或 inspect 面检查：

- feature lifecycle / reusable governance / grounding / repairability 四轴存在
- connected-host payload 优先走 read-model-first
- 若未请求 live observation，`repairability = not_checked`

### 6.3 Legacy Payload Boundary Check

检查旧 payload 时，预期：

- 可以读取
- 显示 legacy / compatibility-only warning
- 不会冒充 governed product truth

若要退役 stale payload，只运行：

```bash
npm run cli -- export-bridge --host <path>
```

## 7. Recording Evidence

证据至少包含：

- 执行命令
- host root
- feature id
- workspace checks
- validate / doctor result
- bridge / governanceReadModel checks
- 若为 product-surface 验证，记录 compatibility-only 还是 governance-read-model

建议参考：

- [ACCEPTANCE-EVIDENCE-TEMPLATE.md](/D:/Rune%20Weaver/docs/ACCEPTANCE-EVIDENCE-TEMPLATE.md)

## 8. Failure Triage

### 8.1 Lifecycle / Write Failures

若 CLI write 失败：

- 先看 review artifact / executionAuthority
- 再看 workspace truth 与 host truth 是否已部分写入
- 不要先把问题解释成 product-surface bug

### 8.2 Product-Surface Failures

若 Workbench / inspect 显示异常：

- 先确认 payload 是否带 root-level `governanceReadModel`
- 再确认是否意外走到了 compatibility-only fallback
- 若是 connected-host，确认这是否只是 `repairability = not_checked`

### 8.3 Stale Payload

若 bridge/product payload 过旧：

- 不要改 JSON
- 不要把 `doctor` / `validate` / `repair` 当刷新命令
- 只运行 `npm run cli -- export-bridge --host <path>`

## 9. Related Docs

- [COMMAND-RECIPES.md](/D:/Rune%20Weaver/docs/COMMAND-RECIPES.md)
- [CANONICAL-ACCEPTANCE-CASES.md](/D:/Rune%20Weaver/docs/CANONICAL-ACCEPTANCE-CASES.md)
- [ACCEPTANCE-CHECKLISTS.md](/D:/Rune%20Weaver/docs/ACCEPTANCE-CHECKLISTS.md)
- [ACCEPTANCE-EVIDENCE-TEMPLATE.md](/D:/Rune%20Weaver/docs/ACCEPTANCE-EVIDENCE-TEMPLATE.md)
- [CLEAN-STATE-PROTOCOL.md](/D:/Rune%20Weaver/docs/CLEAN-STATE-PROTOCOL.md)

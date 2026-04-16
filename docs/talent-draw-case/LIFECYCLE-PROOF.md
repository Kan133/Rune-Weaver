# Talent Draw Lifecycle Proof

This document defines the bounded lifecycle proof for the Talent Draw inventory-update interview lane.

This is not a new Dota2 mainline package.
This is a case-scoped proof that Rune Weaver can keep one stable feature alive across:

```text
create -> update -> delete -> recreate
```

while preserving the same `featureId`.

## Goal

Prove one concrete lifecycle claim with the canonical Talent Draw feature:

- one stable feature record
- same `featureId`
- `update` makes the feature meaningfully bigger
- CLI remains authoritative
- Workbench drives the same CLI-backed update path

The canonical feature id is:

```text
talent_draw_demo
```

## Frozen Demo Contract

### v1 create prompt

```text
做一个按 F4 触发的三选一天赋抽取系统。玩家按 F4 后，从加权天赋池抽出 3 个候选天赋，显示卡牌选择 UI。玩家选择 1 个后立即应用效果，并且已选择的天赋后续不再出现。
```

### v2 update prompt

```text
给现有天赋抽取功能增加一个常驻天赋库存界面：15 格。玩家每次从 F4 三选一中确认的天赋都进入库存。库存满了后，再按 F4 不再继续抽取，并在库存界面显示 "Talent inventory full"。保持现有 F4 三选一抽取逻辑、稀有度展示和已选天赋不再出现的行为不变。
```

### Required v1 behavior

- `F4` opens the three-choice modal
- player chooses exactly one talent
- selected talent applies immediately
- selected talent is removed from the remaining pool

### Required v2 behavior

- same `featureId`
- still `F4`
- still three-choice modal
- still immediate apply
- adds a persistent inventory panel
- inventory has 15 fixed slots
- every confirmed talent enters the inventory
- when the inventory is full, `F4` no longer opens a new draw
- the panel shows `Talent inventory full`

## Scope Rules

Keep this proof inside the current Talent Draw pattern family set.

Allowed:

- refresh-only or same-feature owned-scope updates
- richer parameters on the existing Talent Draw path
- runtime/UI extension inside the current generated selection-flow and selection-modal surfaces
- Workbench calling real CLI `update`

Not allowed:

- second feature record
- parent/child feature modeling
- new pattern id admission for this demo
- `ModuleNeed` widening
- generic inventory framework
- generic subfeature management UI
- high-signal Dota2 mainline control-doc rewrites

If the canonical v2 prompt cannot stay inside the current selected pattern set, the lane must honest-block instead of silently degrading to v1 behavior.

## Runner

The lifecycle harness now supports a dedicated inventory-update scenario.

Plan only:

```bash
npm run cli -- dota2 lifecycle prove --host <host> --scenario talent-draw-inventory-update
```

Execute on a disposable prepared host:

```bash
npm run cli -- dota2 lifecycle prove --host <host> --scenario talent-draw-inventory-update --write
```

The runner keeps the existing bounded shape:

```text
create v1
doctor
validate
update to v2
doctor
validate
delete
doctor
validate
recreate
doctor
validate
refresh evidence
manual runtime proof
```

The proof artifact is saved under `tmp/cli-review/lifecycle-proof-*.json`.

## CLI Proof Path

### Preconditions

Use a prepared x-template host:

```bash
npm run cli -- dota2 demo prepare --host <host> --addon-name talent_draw_demo --map temp
```

The host should already satisfy:

- `scripts/addon.config.ts` uses `talent_draw_demo`
- `yarn install` has been run after the addon rename
- Rune Weaver workspace exists or can be initialized by the write path
- `yarn dev` can compile host scripts and Panorama

### Step 1: Create v1

```bash
npm run demo:talent-draw -- --host <host> --write --force
npm run cli -- dota2 doctor --host <host>
npm run cli -- dota2 validate --host <host>
```

Expected:

- workspace has active feature `talent_draw_demo`
- current selected pattern set matches the existing Talent Draw family
- doctor passes
- validate passes

### Step 2: Update v1 -> v2

```bash
npm run cli -- dota2 update "给现有天赋抽取功能增加一个常驻天赋库存界面：15 格。玩家每次从 F4 三选一中确认的天赋都进入库存。库存满了后，再按 F4 不再继续抽取，并在库存界面显示 \"Talent inventory full\"。保持现有 F4 三选一抽取逻辑、稀有度展示和已选天赋不再出现的行为不变。" --host <host> --feature talent_draw_demo --write
npm run cli -- dota2 doctor --host <host>
npm run cli -- dota2 validate --host <host>
```

Expected:

- `featureId` remains `talent_draw_demo`
- `revision` increments
- selected pattern set does not expand
- generated files refresh truthfully inside owned scope
- doctor passes
- validate passes

### Step 3: Delete

```bash
npm run cli -- dota2 delete --host <host> --feature talent_draw_demo --write
npm run cli -- dota2 doctor --host <host>
npm run cli -- dota2 validate --host <host>
```

Expected:

- owned generated files are removed or deactivated according to workspace policy
- unrelated files are preserved
- workspace state remains consistent

### Step 4: Recreate

```bash
npm run demo:talent-draw -- --host <host> --write --force
npm run cli -- dota2 doctor --host <host>
npm run cli -- dota2 validate --host <host>
```

Expected:

- feature becomes runnable again
- no duplicate bridge/runtime wiring
- workspace generated-file records match disk

## Workbench Proof Path

Workbench should drive the same authoritative CLI `update` path.

Expected Workbench behavior:

- open the Talent Draw feature detail
- use the new Update section
- paste the canonical v2 update prompt
- click `预览更新` for dry-run evidence
- click `应用更新` for the write path
- Workbench reloads the workspace after success
- the same feature is reselected
- the updated revision and refreshed generated-file list are visible

Workbench is not required to provide:

- diff visualization
- subfeature tree editing
- generic relationship management
- optimistic local-only update simulation

## Evidence Checklist

Collect these after create, update, delete, and recreate:

- workspace feature record
- `featureId`
- `revision`
- generated file list
- doctor output
- validate output
- latest review artifact

For runtime/manual proof after the update step, confirm:

- the inventory panel is visible while the feature is active
- the panel shows 15 slots
- confirmed talents occupy slots
- after 15 confirmed selections, `F4` no longer opens a new draw
- the panel shows `Talent inventory full`

The existing evidence refresh path is still the stable collection command:

```bash
npm run demo:talent-draw:refresh -- --host <host>
```

## Relationship To The Older Small-Update Proof

The earlier small-update lifecycle proof is still valid as a narrow safety baseline.

It is now secondary.
The primary interview proof is the inventory-update scenario because it demonstrates that `update` can make one existing feature materially larger without creating a second feature record.

## Current Honest Limits

This lane is only complete when unit/CLI/Workbench checks are green and the runtime checklist has been proven on a real prepared host.

Until that host run is captured, the remaining honest gap is:

- real Dota2 runtime proof of the updated inventory behavior

This file should not be used to claim broader generic lifecycle completion beyond the canonical Talent Draw interview lane.

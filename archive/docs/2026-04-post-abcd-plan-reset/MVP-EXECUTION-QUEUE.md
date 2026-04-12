# MVP Execution Queue

## Purpose

This document turns the current README-target MVP into a concrete execution queue for lead agents and worker agents.

Use it after reading:

1. [README.md](/D:/Rune%20Weaver/README.md)
2. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
3. [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md)
4. [AUTONOMOUS-DEVELOPMENT-POLICY.md](/D:/Rune%20Weaver/docs/AUTONOMOUS-DEVELOPMENT-POLICY.md)
5. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)

## Queue

### Work Packet A: Workspace Truth And Product-Grade `create`

**Authoritative path: `apps/cli/dota2-cli.ts` (via `dota2 run`).**

The CLI path is the only authoritative create path for Packet A acceptance. It executes real file writes and produces truthful workspace records.

The workbench path (`apps/workbench/`) is a demo/preview tool and is NOT part of Packet A authoritative acceptance. Do not use workbench as evidence of product-grade create.

Mission:

- make `create` persist truthful workspace state for the actual feature that was written

Likely write scope:

- `apps/cli/dota2-cli.ts` (primary - executes real writes)
- `apps/cli/helpers/workspace-integration.ts`
- `core/workspace/manager.ts`

Required outcome:

- persisted feature has stable `featureId`
- `selectedPatterns` is truthful
- `generatedFiles` is truthful (from WriteResult, not plan entries)
- `entryBindings` is truthful
- revision/timestamps are updated

Acceptance:

- host 已完成 dota2 init（运行 `dota2 check-host --host <path>` 确认 ready=true）
- create one feature in a clean host using CLI authoritative path
- workspace state is non-empty and matches the actual written artifacts

Notes:

- this is the current critical-path blocker
- do this before broad governance or UI work

### Work Packet B: Owned-Scope `update`

Mission:

- replace metadata-only update with a real owned-artifact rewrite of the same feature

Likely write scope:

- `apps/workbench/update.ts`
- `apps/workbench/index.ts`
- `core/workspace/manager.ts`
- `apps/cli/dota2-cli.ts`

Required outcome:

- same `featureId`
- only owned files and approved bridge points change
- workspace revision and evidence update
- no semantic incremental-update ambitions

Acceptance:

- update an existing feature
- verify only the target feature's owned outputs changed
- verify workspace record and revision changed consistently

### Work Packet C: Real `delete` And Unload

Mission:

- replace record-only delete with true unload semantics

Likely write scope:

- `apps/workbench/index.ts`
- `core/workspace/manager.ts`
- Dota2 bridge/write cleanup paths

Required outcome:

- workspace record removed or deactivated correctly
- owned artifacts removed or unloaded
- bridge exposure refreshed so the host no longer mounts the feature

Acceptance:

- delete the same feature created in Packet A
- verify workspace state, owned files, and bridge exposure are all cleaned up

### Work Packet D: Minimum Governance v1

Mission:

- make conflict checks workspace-backed instead of mock/demo-backed

Likely write scope:

- `apps/workbench/routing.ts`
- `apps/workbench/index.ts`
- `core/workspace/manager.ts`
- CLI review/governance surfaces

Required checks:

- ownership overlap
- bridge-point contention
- delete dependency risk

Deferred (post-MVP):
- ambiguous update target

Acceptance:

- second feature that overlaps ownership or bridge points produces block/confirm behavior before write

### Work Packet E: Canonical Verification Flow

Mission:

- provide one repeatable create/update/delete/conflict walkthrough for the README-target MVP

Likely write scope:

- `package.json`
- verification scripts under `tmp/` or project test utilities
- optional review artifact output paths

Required outcome:

- one command or short command sequence proves the MVP loop
- output is usable as review evidence for humans and agents

Acceptance:

1. create a feature
2. update the same feature
3. delete the same feature
4. run at least one conflict case

## Recommended Order

1. Packet A
2. Packet B
3. Packet C
4. Packet D
5. Packet E

## Parallelism Rule

Only start B, C, or D once Packet A defines truthful workspace fields.

After Packet A:

- B and C may proceed in parallel if their write scopes stay disjoint
- D may start once the persisted ownership/binding model is stable

## Non-Goals

Do not expand this queue into:

- `regenerate`
- `rollback`
- semantic incremental update
- second host support
- broad workbench panelization
- large graph governance

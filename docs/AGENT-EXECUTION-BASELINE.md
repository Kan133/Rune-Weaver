# Agent Execution Baseline

> Status: authoritative
> Audience: agents
> Doc family: baseline
> Update cadence: on-phase-change
> Last verified: 2026-04-14
> Read when: aligning current lifecycle truth, scope, and MVP boundary before execution
> Do not use for: long-term architecture proposals or roadmap sequencing by itself

## Purpose

This document is the current authoritative execution baseline for Rune Weaver.

Use it to align agents before implementation, doc writing, or task breakdown.

If another document conflicts with this file about **current product scope**, **current capability boundary**, or **current task priority**, prefer this file.

## Document Roles

- [README.md](/D:/Rune%20Weaver/README.md) defines the **target product outcome**.
- This file defines the **current executable MVP boundary** for agents.
- [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md) defines how lead agents should scope and evaluate worker tasks.
- [AUTONOMOUS-DEVELOPMENT-POLICY.md](/D:/Rune%20Weaver/docs/AUTONOMOUS-DEVELOPMENT-POLICY.md) defines how agents should proceed without repeatedly asking the user for bounded MVP decisions.
- [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md) is the **operational entry** for day-to-day work.
- [ROADMAP.md](/D:/Rune%20Weaver/docs/ROADMAP.md) defines **phase sequencing**, not the single source of truth for current implementation reality.
- Long-form contract docs remain useful, but many of them are still **planning/reference** rather than shipped behavior.

## Current Milestone

The current milestone is:

**reach the README-shaped MVP with strict host separation, feature management, and minimum governance.**

The required MVP surface is:

1. host separation
2. workspace-backed feature registry
3. product-grade `create`
4. product-grade `update`
5. product-grade `delete`
6. minimum cross-feature conflict checks

The following are explicitly **deferred** for this milestone:

- `regenerate`
- `rollback`
- semantic incremental update
- second host
- full productized workbench backend/UI contract
- broad conflict graph/platform governance

## Current Code Reality

What is true now:

- host ownership boundary exists
- workspace state exists
- bridge export to `apps/workbench-ui/public/bridge-workspace.json` exists
- root/build/typecheck baseline exists
- workbench UI can visualize workspace/bridge data

What is **not** yet product-grade:

- `create` is only partially persisted in the workbench path
- `update` performs owned-scope artifact rewrite (not semantic incremental update)
- `delete` removes workspace record and unloads feature artifacts (rollback remains deferred)
- conflict governance is minimum workspace-backed governance (not broad graph governance)
- workbench runtime flow is still narrower than the README story

Agents must not overclaim these as finished product capabilities.

## Canonical Source Of Truth

The current source of truth for feature state is:

- `game/scripts/src/rune_weaver/rune-weaver.workspace.json`

This is the file agents should treat as the authoritative persisted registry for Rune Weaver-owned features inside a host.

Agents must not treat:

- old phase notes
- fixture data
- mock backend results
- transient workbench demo outputs

as stronger truth than workspace state.

## Non-Negotiable Product Boundaries

### 1. Host Separation

Rune Weaver currently owns only:

- `game/scripts/src/rune_weaver/**`
- `game/scripts/vscripts/rune_weaver/**`
- `content/panorama/src/rune_weaver/**`
- a small set of explicit bridge points

Allowed bridge points:

- `game/scripts/src/modules/index.ts`
- `content/panorama/src/hud/script.tsx`

Agents must not expand host ownership casually.

### 2. Feature As The Main Product Object

A `feature` is the primary managed object.

It is not:

- a prompt
- a file
- a pattern
- a patch

The minimum persisted feature record must carry:

- stable `featureId`
- `blueprintId`
- `selectedPatterns`
- `generatedFiles`
- `entryBindings`
- `revision`
- timestamps

### 3. Create / Update / Delete Meanings

For the current milestone, the meanings are:

- `create`
  - create a new persisted feature
  - write Rune Weaver-owned artifacts
  - record patterns/files/bindings in workspace

- `update`
  - keep the same `featureId`
  - rewrite only the target feature's owned artifacts and allowed bridge bindings
  - update workspace state and revision
  - this is **not** semantic incremental update

- `delete`
  - remove or deactivate the feature from active workspace state
  - remove its Rune Weaver-owned artifacts
  - refresh bridge exposure so the host no longer mounts it
  - block or require confirmation if other features depend on it

### 4. Deferred Lifecycle

`regenerate` and `rollback` are not required for the current README-target MVP.

They may remain in engineering discussions or code, but agents must treat them as:

- deferred
- non-blocking
- not part of current acceptance

## Minimum Governance v1

The minimum governance layer only needs to do the following:

1. detect ownership overlap
2. detect bridge/integration-point contention
3. detect target ambiguity for `update`
4. detect dependency risk for `delete`
5. explain the issue in feature-level language
6. block or require confirmation before write

The minimum relationship vocabulary is:

- `depends_on`
- `extends`
- `conflicts_with`

Agents should not design a large graph governance system for this milestone.

## Workbench / UI Reality

The current `apps/workbench-ui` should be understood as:

- a feature/workspace visualization shell
- a bridge/workspace consumer
- not yet the full product backend contract

The minimum UI object set for this milestone is:

- host selection / host root
- feature list
- feature detail
- operation intent (`create` / `update` / `delete`)
- change preview
- conflict / governance summary
- workspace persistence state
- host output evidence

Do not make broader workbench panelization the first priority.

## Authoritative Create Path

The **authoritative create path for Packet A is `apps/cli/dota2-cli.ts`** (via `dota2 run`).

**Host Readiness Prerequisite (T149):** `dota2 init` 是 CLI authoritative create 的正式前置条件。未完成 init 的 host 不应直接进入 create。

The CLI path:
- Executes real file writes via `executeWritePlan`
- Produces truthful `generatedFiles` from `WriteResult.createdFiles` / `WriteResult.modifiedFiles`
- Calls `updateWorkspaceState` with actual execution results
- Is the only path that can produce a complete, truthful workspace record

The **workbench path (`apps/workbench/`)** is:
- A Phase 3 Week-1 demo/preview tool
- NOT the authoritative create path for Packet A acceptance
- Does NOT execute real file writes (only calls `createWritePlan`, not `executeWritePlan`)
- Produces `generatedFiles` from plan entries, not actual execution results

For Packet A acceptance, only the CLI path is authoritative. Do not use workbench as evidence of product-grade create.

## Required Read Order For Agents

1. [README.md](/D:/Rune%20Weaver/README.md)
2. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
3. [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md)
4. [AUTONOMOUS-DEVELOPMENT-POLICY.md](/D:/Rune%20Weaver/docs/AUTONOMOUS-DEVELOPMENT-POLICY.md)
5. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
6. [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
7. [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)

Useful reference docs:

- [PRODUCT.md](/D:/Rune%20Weaver/docs/PRODUCT.md)
- [ROADMAP.md](/D:/Rune%20Weaver/docs/ROADMAP.md)
- [PHASE-ROADMAP-ZH.md](/D:/Rune%20Weaver/docs/PHASE-ROADMAP-ZH.md)
- [FEATURE-CONFLICT-GOVERNANCE-GUARDRAILS-ZH.md](/D:/Rune%20Weaver/docs/FEATURE-CONFLICT-GOVERNANCE-GUARDRAILS-ZH.md)
- [FEATURE-BOUNDARY-RELATIONSHIP-GUARDRAILS-ZH.md](/D:/Rune%20Weaver/docs/FEATURE-BOUNDARY-RELATIONSHIP-GUARDRAILS-ZH.md)

Planning-only / non-authoritative for current shipped behavior:

- `WORKBENCH-*` frontend contract/plan docs
- semantic update contracts
- regenerate/rollback-heavy lifecycle claims
- phase-history acceptance logs

## Completed Milestone Items

1. ✅ make workspace model and implementation agree
2. ✅ make `create` persist real patterns/files/bindings
3. ✅ replace metadata-only `update` with owned-scope artifact rewrite
4. ✅ replace `delete = unmanage` with `delete = unload`
5. ✅ move conflict checks from mock baseline to workspace-backed checks
6. keep workbench/UI aligned to workspace-backed feature management rather than demo-only lifecycle panels

## Current Focus

Refer to [CURRENT-EXECUTION-PLAN.md](./CURRENT-EXECUTION-PLAN.md) for current priorities.

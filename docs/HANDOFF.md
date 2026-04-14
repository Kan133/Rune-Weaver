# Rune Weaver Handoff

> Status: authoritative
> Audience: agents
> Doc family: control
> Update cadence: on-phase-change
> Last verified: 2026-04-14
> Read when: resuming active work, aligning workers, or deciding the next implementation slice
> Do not use for: replacing architecture baseline, task contract, or execution queue truth

## Purpose

This document is the operational entry for active work.

Read this when:

- resuming work
- aligning a worker agent
- deciding the next implementation slice

For current scope truth, always pair this file with:

- [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
- [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md)
- [AUTONOMOUS-DEVELOPMENT-POLICY.md](/D:/Rune%20Weaver/docs/AUTONOMOUS-DEVELOPMENT-POLICY.md)
- [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)
- [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)

## Read Order

1. [README.md](/D:/Rune%20Weaver/README.md)
2. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
3. [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md)
4. [AUTONOMOUS-DEVELOPMENT-POLICY.md](/D:/Rune%20Weaver/docs/AUTONOMOUS-DEVELOPMENT-POLICY.md)
5. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
6. [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)
7. [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
8. [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)

Add when relevant:

- [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)
- the latest session-sync notes under `docs/session-sync/`
  - especially when same-day current-step freshness matters

## Current Mission

> Section role
> This section is mission/priority narrative for active coordination.
> Do not use it by itself as the execution queue or architecture baseline.
> Pair it with [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md), [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md), and the latest session-sync notes when freshness matters.

The current mission is not "finish the old evidence-closure queue again."

It is:

**productize the post-write business-logic fill path without turning Gap Fill into a second architecture or execution authority.**

Current execution priorities:

- turn feature-scoped Gap Fill into a clearer product UX
- extend the current plan/review flow into approval/apply
- keep blueprint / pattern / generator as structure and Gap Fill as business-logic refinement
- choose the next honest proof point after the UX slice stabilizes

Still deferred:

- moving business logic back into `core/wizard`
- `regenerate`
- `rollback`
- structure-level update
- second host
- broad workbench productization beyond thin CLI-backed orchestration

## Current Reality

> Section role
> This section summarizes current product reality for orientation.
> Do not treat it as a replacement for [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md) or [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md).

What already exists:

- authoritative CLI `create`
- authoritative CLI `update`
- authoritative CLI `delete`
- minimum governance baseline
- host ownership boundary
- workspace state file
- bridge export for UI consumption
- workspace-driven preview/onboarding UI shell
- feature-scoped `gapFillBoundaries` recorded in workspace state
- CLI-backed `dota2 gap-fill` that can operate from a selected feature
- Workbench feature detail can launch the CLI-backed Gap Fill planning flow

What is still incomplete:

- Workbench Gap Fill still exposes raw boundary ids
- approval/apply is not yet a first-class UI path
- result/review UX is still engineering-heavy
- older workspaces may still require manual boundary choice through backward-compatibility fallbacks
- Workbench remains thinner than the README story and must not be mistaken for a second executor

## Working Mode

Use worker agents for narrow scoped work.

Do:

- keep tasks concrete
- keep ownership boundaries explicit
- require workers to stay inside current product scope
- treat docs as product constraints, not suggestion piles

Do not:

- let worker agents redefine scope truth
- let worker agents widen host ownership
- let worker agents overclaim lifecycle maturity
- let worker agents turn demo fixtures into product truth

## Host Ownership Boundary

> Section role
> This section is an operational boundary reminder.
> For full lifecycle and ownership semantics, pair it with [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md) and the baseline set.

Rune Weaver currently owns only:

- `game/scripts/src/rune_weaver/**`
- `game/scripts/vscripts/rune_weaver/**`
- `content/panorama/src/rune_weaver/**`

Allowed bridge points:

- `game/scripts/src/modules/index.ts`
- `content/panorama/src/hud/script.tsx`

Do not:

- patch arbitrary host files
- rewrite user business code
- add new bridge points casually

## Current Product Semantics

> Section role
> This section states active milestone semantics for lifecycle behavior.
> Do not read it as a replacement for the baseline set; pair it with [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md) and [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md).

For the active milestone:

- `create`
  - must create a persisted feature with artifacts, bindings, and workspace record
- `update`
  - must keep the same `featureId`
  - must only touch that feature's owned files and allowed bridge updates
  - is not semantic incremental update
- `delete`
  - must unload the feature from workspace, owned files, and bridge exposure

Agents must not treat:

- metadata-only update
- workspace-record-only delete

as accepted finished behavior.

## Minimum Governance v1

The governance baseline only needs to answer:

1. which feature is the target
2. which files and surfaces are owned
3. whether another feature already owns the touched area
4. whether a bridge or integration point is already occupied
5. whether delete would break a dependent feature
6. whether the write should proceed, block, or ask for confirmation

## Frontend / Workbench Boundary

Current workbench/UI should be treated as:

- feature/workspace visualization
- onboarding shell
- host/workspace evidence surface
- CLI-backed Gap Fill launch surface
- not the primary lifecycle truth

The current UI should follow workspace-backed feature management, not invent a second execution system.

## Authoritative Lifecycle Path

The authoritative lifecycle path remains the CLI surface in `apps/cli/dota2-cli.ts`.

This currently includes:

- `dota2 init`
- `dota2 run`
- `dota2 update`
- `dota2 delete`
- `dota2 gap-fill`

`dota2 init` is the formal host-readiness prerequisite before lifecycle operations on a new host.

`dota2 gap-fill` is the current post-write business-logic refinement path.
It remains downstream of blueprint / pattern / generator structure and must not be described as a freeform architecture or host-routing authority.

The workbench path remains:

- preview / visualization
- onboarding shell
- evidence surface
- Gap Fill entry and review shell
- non-authoritative for lifecycle acceptance

Do not use workbench as proof of product-grade lifecycle behavior.

## Next Implementation Order

> Section role
> This section is priority guidance for active coordination.
> The authoritative Dota2 execution queue remains [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md).
> Use [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md) and the latest session-sync notes when same-day freshness matters.

1. replace raw boundary ids with clearer boundary labels and selection guidance
2. surface CLI command preview and approval/apply next-step guidance in Workbench
3. keep the review/result UX lighter without inventing a second executor
4. choose the next honest skeleton-plus-fill proof point after the UX slice stabilizes

Use [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md) for the active worker-task queue.

## Reference Docs

> Section role
> The docs below are secondary references.
> They are not execution truth unless the registry and routing docs explicitly say so.

Use these when needed:

- [PRODUCT.md](/D:/Rune%20Weaver/docs/PRODUCT.md)
- [ROADMAP.md](/D:/Rune%20Weaver/docs/ROADMAP.md)
- [PHASE-ROADMAP-ZH.md](/D:/Rune%20Weaver/docs/PHASE-ROADMAP-ZH.md)
- [FEATURE-CONFLICT-GOVERNANCE-GUARDRAILS-ZH.md](/D:/Rune%20Weaver/docs/FEATURE-CONFLICT-GOVERNANCE-GUARDRAILS-ZH.md)
- [FEATURE-BOUNDARY-RELATIONSHIP-GUARDRAILS-ZH.md](/D:/Rune%20Weaver/docs/FEATURE-BOUNDARY-RELATIONSHIP-GUARDRAILS-ZH.md)

Treat these as planning/reference, not current shipped truth:

- `WORKBENCH-*`
- semantic update contracts
- regenerate/rollback-heavy lifecycle docs
- historical task-history files

# Rune Weaver Handoff

> Status: authoritative
> Audience: agents
> Doc family: control
> Update cadence: on-phase-change
> Last verified: 2026-04-25
> Read when: resuming active work, aligning workers, or deciding the next implementation slice
> Do not use for: replacing architecture baseline, task contract, or freshest session-sync blocker truth

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

The current mission is not to reopen gap-fill-era mainline work.

It is:

**hold Dota2 Step 7 productization honest after the governance read-model and create-front-door closure landed.**

Current execution priorities:

- keep bridge / connected-host / workbench on the same `governanceReadModel` projection
- keep compatibility-only fallback visibly limited to legacy display, not product authority
- keep `export-bridge` as the only stale payload refresh lane
- keep the no-core boundary intact until second-host evidence exists
- treat any newly exposed same-host integration conflicts as downstream governance/integration work, not as a reason to reopen Stage 1 wizard authority

Still deferred:

- lifting the governance read-model into core
- second-host genericization claims
- broad new product semantics beyond existing Dota2 Step 7 control-plane truth
- turning Workbench into a lifecycle authority

## Current Reality

> Section role
> This section summarizes current product reality for orientation.
> Do not treat it as a replacement for [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md) or [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md).

What already exists:

- authoritative CLI `run/create`
- authoritative CLI `update`
- authoritative CLI `regenerate`
- authoritative CLI `rollback`
- authoritative CLI `repair`, `doctor`, and `validate`
- root-level bridge export with `governanceReadModel`
- connected-host live status with adapter-owned `governanceReadModel`
- workbench read-model-first product surfaces
- display-only compatibility fallback for legacy payloads
- event-driven, `export-bridge`-only stale payload refresh lane
- create front-door closure for explicit choose-one local `selection_pool` asks, including honest external-catalog equipment flow

What is still incomplete or intentionally bounded:

- compatibility-only fallback still exists for old bridge/raw workspace/host-status/workbench-result payloads and must not regrow authority
- `repairability` remains observational and can honestly stay `not_checked` on connected-host/workbench inspect surfaces
- Workbench is a product entry and review shell, not an authoritative executor
- second-host evidence still does not exist for a core-generic governance read-model

## Working Mode

Use worker agents for narrow scoped work when safe and available.

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

- `run/create`
  - must create a persisted feature with artifacts, bindings, workspace record, and honest governance truth
- `update`
  - must keep the same `featureId`
  - must only touch that feature's owned files and allowed bridge updates
- `regenerate`
  - must preserve lifecycle/governance truth and remain governed by the same final gates
- `rollback`
  - must remain bounded by owned scope and dependency safety
- `repair`
  - is bounded local repair / muscle fill, not a second generation architecture

Agents must not treat:

- compatibility-only UI display
- bridge snapshots
- connected-host read-only observations

as replacements for canonical workspace authority.

## Minimum Governance v1

The governance baseline needs to answer:

1. which feature is the target
2. which files and surfaces are owned
3. whether another feature already owns the touched area
4. whether a bridge or integration point is already occupied
5. whether delete would break a dependent feature
6. whether the write should proceed, block, or require review

In Step 7 product surfaces, this truth is projected through the Dota2 governance read-model; product surfaces must not reinvent it locally.

## Frontend / Workbench Boundary

Current workbench/UI should be treated as:

- product entry
- workspace / feature visualization
- governed bridge and connected-host review surface
- orchestration shell
- evidence / inspect surface
- not the primary lifecycle authority

The current UI should follow workspace-backed feature management and the Dota2 governance read-model, not invent a second execution system.

## Authoritative Lifecycle Path

The authoritative lifecycle path remains the CLI surface in `apps/cli/dota2-cli.ts`.

This currently includes:

- `dota2 init`
- `dota2 run`
- `dota2 update`
- `dota2 regenerate`
- `dota2 rollback`
- `dota2 repair`
- `dota2 doctor`
- `dota2 validate`
- `export-bridge`

Boundary reminders:

- `export-bridge` is the only stale payload refresh lane
- `doctor` / `validate` / `repair` do not refresh stale payloads
- connected-host status is read-only and cheap; it does not implicitly run doctor/validate

The workbench path remains:

- preview / visualization
- review / inspect / connected-host entry
- source warning / legacy compatibility display
- non-authoritative for lifecycle acceptance

Do not use workbench as proof that lifecycle authority moved out of CLI.

## Next Implementation Order

> Section role
> This section is priority guidance for active coordination.
> The authoritative Dota2 execution queue remains [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md).
> Use [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md) and the latest session-sync notes when same-day freshness matters.

1. keep read-model-first product consumption stable across bridge, connected host, CLI inspect wording, and workbench UI
2. keep compatibility-only fallback compressed to legacy display only
3. keep `export-bridge` as the sole stale payload refresh lane
4. keep the no-core guard intact until second-host evidence exists
5. treat newly exposed same-host integration conflicts as downstream governance/integration work, not as a reason to widen wizard/front-door authority

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

- long-range product/roadmap docs
- core-generic read-model ideas
- second-host claims
- historical packet-era validation narratives

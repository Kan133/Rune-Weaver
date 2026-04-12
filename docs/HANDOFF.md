# Rune Weaver Handoff

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

## Read Order

1. [README.md](/D:/Rune%20Weaver/README.md)
2. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
3. [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md)
4. [AUTONOMOUS-DEVELOPMENT-POLICY.md](/D:/Rune%20Weaver/docs/AUTONOMOUS-DEVELOPMENT-POLICY.md)
5. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
6. [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)
7. [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
8. [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)

## Current Mission

The current mission is not "finish the old packet queue again."

It is:

**turn the standing CLI lifecycle spine into a release-grade product entry and repeatable walkthrough.**

Current execution priorities:

- close evidence gaps for standing lifecycle claims
- connect the onboarding/UI shell to authoritative CLI paths
- finish x-template onboarding flow details
- lock one canonical create/update/delete/governance walkthrough

Still deferred:

- `regenerate`
- `rollback`
- structure-level update
- second host
- broad workbench productization beyond entry/orchestration

## Current Reality

What already exists:

- authoritative CLI `create`
- authoritative CLI `update`
- authoritative CLI `delete`
- minimum governance baseline
- host ownership boundary
- workspace state file
- bridge export for UI consumption
- workspace-driven preview/onboarding UI shell

What is still incomplete:

- evidence quality still needs to stay release-grade and repeatable
- UI is not yet the authoritative execution surface
- x-template onboarding still lacks full map / launch wiring
- canonical walkthrough and demo gate still need to be fully locked down
- workbench remains narrower than the README story

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
- not the primary lifecycle truth

The current UI should follow workspace-backed feature management, not invent a second execution system.

## Authoritative Lifecycle Path

The authoritative lifecycle path remains the CLI surface in `apps/cli/dota2-cli.ts`.

This currently includes:

- `dota2 init`
- `dota2 run`
- `dota2 update`
- `dota2 delete`

`dota2 init` is the formal host-readiness prerequisite before lifecycle operations on a new host.

The workbench path remains:

- preview / visualization
- onboarding shell
- evidence surface
- non-authoritative for lifecycle acceptance

Do not use workbench as proof of product-grade lifecycle behavior.

## Next Implementation Order

1. keep lifecycle evidence repeatable and easy to re-run
2. connect product entry/onboarding to the authoritative CLI path
3. finish x-template onboarding and launch prep
4. lock one canonical walkthrough / demo gate

Use [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md) for the active worker-task queue.

## Reference Docs

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

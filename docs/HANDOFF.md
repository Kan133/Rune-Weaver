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

## Read Order

1. [README.md](/D:/Rune%20Weaver/README.md)
2. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
3. [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md)
4. [AUTONOMOUS-DEVELOPMENT-POLICY.md](/D:/Rune%20Weaver/docs/AUTONOMOUS-DEVELOPMENT-POLICY.md)
5. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
6. [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
7. [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)

## Current Mission

The current mission is not “finish every lifecycle feature”.

It is:

**reach the README-target MVP with host separation, feature management, and minimum governance.**

Required for this milestone:

- host separation
- workspace-backed feature registry
- product-grade `create`
- product-grade `update`
- product-grade `delete`
- minimum cross-feature conflict checks

Deferred for this milestone:

- `regenerate`
- `rollback`
- semantic incremental update
- second host
- broad UI/workbench expansion

## Current Reality

What already exists:

- formal planning/execution architecture
- host ownership boundary
- workspace state file
- Dota2 host write baseline
- bridge export for UI consumption
- workspace-driven UI shell

What is still incomplete:

- `create` is not yet consistently recording final patterns/files/bindings through the product path
- `update` is not yet a true owned-artifact rewrite
- `delete` is still closer to unmanaging a feature than unloading it
- conflict checks are still narrower than the target MVP
- workbench remains narrower than the README story

## Working Mode

Use worker agents for narrow scoped work.

Do:

- keep tasks concrete
- keep ownership boundaries explicit
- require workers to stay inside current product scope
- treat docs as product constraints, not suggestion piles

Do not:

- let worker agents redefine phase status
- let worker agents expand host ownership boundary
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
  - is **not** semantic incremental update

- `delete`
  - must unload the feature from workspace, owned files, and bridge exposure

Agents must not treat:

- metadata-only update
- workspace-record-only delete

as accepted finished behavior.

## Minimum Governance v1

The governance baseline only needs to answer:

1. which feature is the target
2. which files/surfaces are owned
3. whether another feature already owns the touched area
4. whether a bridge/integration point is already occupied
5. whether delete would break a dependent feature
6. whether the write should proceed, block, or ask for confirmation

## Frontend / Workbench Boundary

Current workbench/UI should be treated as:

- feature/workspace visualization
- host/workspace evidence surface
- not the primary product truth

The current UI should follow workspace-backed feature management, not a large panel/demo roadmap.

## Next Implementation Order

1. align docs and implementation on the workspace source of truth
2. finish product-grade `create`
3. replace metadata-only `update` with owned-scope rewrite
4. replace record-only `delete` with true unload
5. make conflict checks workspace-backed
6. keep UI focused on feature registry, detail, change preview, and evidence

Use [MVP-EXECUTION-QUEUE.md](/D:/Rune%20Weaver/docs/MVP-EXECUTION-QUEUE.md) for the concrete worker-task queue.

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

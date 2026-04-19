# Agent Execution Baseline

> Status: authoritative
> Audience: agents
> Doc family: baseline
> Update cadence: on-phase-change
> Last verified: 2026-04-18
> Read when: aligning current lifecycle truth, scope, and MVP boundary before execution
> Do not use for: long-term architecture proposals or same-day blocker truth by itself

## Purpose

This document is the current authoritative execution baseline for Rune Weaver.

If another doc conflicts with this file about current lifecycle truth, ownership boundary, or product-grade Dota2 capability, prefer this file.

## Current Baseline

Rune Weaver is now baselined on a **governance-first feature lifecycle**, not on a grammar-first mechanic admission model.

Current Dota2 baseline:

1. workspace-backed feature registry
2. stable `featureId`
3. owned files and bridge-entry governance
4. product-grade `create`
5. product-grade `update`
6. truthful `regenerate`
7. truthful `delete`
8. maintenance `rollback`
9. dependency-aware validation and final commit gating

Current non-goals:

- arbitrary host-side freeform code editing
- undeclared cross-feature writes
- second-host write-ready claims
- review-free exploratory output

## Current Product Reality

What is true now:

- CLI is the authoritative lifecycle path.
- Workbench is a visualization / orchestration / evidence shell.
- workspace is the persisted lifecycle truth.
- feature records now persist governance and validation fields, not just file lists.
- family/pattern retrieval is attempted first, but missing retrieval no longer hard-blocks unknown mechanics by default.
- guided-native / exploratory asks can continue into synthesized host-native artifacts.
- repair is bounded local repair / muscle fill, not the primary generation model.

What is not honest to claim yet:

- broad mechanic generalization is already runtime-proven
- exploratory output is already stabilized and review-free
- War3 is a write-ready second host

## Canonical Feature Record Surface

The minimum truthful feature record now includes:

- `featureId`
- `blueprintId`
- `selectedPatterns`
- `generatedFiles`
- `entryBindings`
- `revision`
- `dependsOn`
- `maturity`
- `implementationStrategy`
- `featureContract`
- `validationStatus`
- `dependencyEdges`
- `commitDecision`
- timestamps

Compatibility note:

- `gapFillBoundaries` may still exist in workspace, but it is now a compatibility projection of bounded repair surfaces.

## Lifecycle Meanings

Current accepted meanings:

- `create`
  - create a new persisted feature
  - write owned artifacts
  - persist truthful contracts, ownership, validation, and strategy metadata

- `update`
  - keep the same `featureId`
  - stay inside owned scope and declared dependency contracts
  - refresh workspace truth after final gate

- `regenerate`
  - ownership-safe cleanup + rewrite path
  - uses the same governed planning / validation / commit semantics as create and update

- `delete`
  - remove the feature from active workspace state
  - remove owned artifacts
  - revalidate dependent features before commit

- `rollback`
  - maintenance command for backing a feature out of active state
  - still governed by ownership / dependency / validation checks

## Governance Rules

Non-negotiable rules:

1. workspace remains the hard registry and lifecycle authority
2. host ownership is limited to:
   - `game/scripts/src/rune_weaver/**`
   - `game/scripts/vscripts/rune_weaver/**`
   - `content/panorama/src/rune_weaver/**`
   - explicit bridge points
3. undeclared cross-feature writes are blocked
4. required dependency breakage is blocked
5. unknown mechanics should become `guided_native` or `exploratory`, not die because the catalog has not seen them before

## Commit Gate Baseline

Current final authority is the chain-end `CommitDecision`, not blueprint `ready | weak | blocked`.

Current meanings:

- `committable`
  - validated templated/stabilized path
- `exploratory`
  - write may proceed, but `requiresReview=true`
- `blocked`
  - ownership, dependency, host, repair, or validation failure

Agents must not treat blueprint readiness alone as the final lifecycle verdict.

## LLM Boundary

Current accepted LLM placement:

- Wizard / update wizard
- optional proposal assistance inside blueprint stage
- artifact synthesis for fixed owned targets
- local repair inside bounded fill contracts / owned scope

Current rejected LLM authority:

- final feature ownership
- final dependency contract
- final host target selection
- final write authority
- final commit gate

## Workbench Reality

`apps/workbench-ui` remains:

- visualization shell
- review shell
- orchestration shell

It is not the authoritative lifecycle executor.

## Required Read Order

1. [README.md](/D:/Rune%20Weaver/README.md)
2. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
3. [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md)
4. [AUTONOMOUS-DEVELOPMENT-POLICY.md](/D:/Rune%20Weaver/docs/AUTONOMOUS-DEVELOPMENT-POLICY.md)
5. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
6. [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)
7. [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
8. [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)

Use session-sync for same-day step/blocker truth:

- [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)
- latest relevant `docs/session-sync/*mainline*.md`

# ROADMAP

## Purpose

This document defines phase sequencing.

It is intentionally different from:

- [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md), which defines current executable scope
- [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md), which defines current operational next steps

If this file conflicts with current implementation reality, do not force reality to match the roadmap sentence. Fix the roadmap or defer the capability.

## Current Planning Principle

Rune Weaver should now be sequenced around the README-target MVP, not around every lifecycle feature at once.

The near-term priority is:

1. strict host separation
2. workspace-backed feature registry
3. product-grade `create`
4. product-grade `update`
5. product-grade `delete`
6. minimum cross-feature governance

Deferred:

- `regenerate`
- `rollback`
- semantic incremental update
- second host
- broad platformization

## Phase 1: Host-Separated Construction Baseline

### Goal

Establish a trustworthy host-aware construction pipeline from natural language to Rune Weaver-owned host output.

### Scope

Phase 1 includes:

- Wizard -> IntentSchema
- Blueprint orchestration
- Pattern resolution
- AssemblyPlan
- Host realization
- Generator routing
- Generators
- Write plan / write executor
- validation / workspace baseline

### Definition Of Done

Phase 1 is complete when:

1. the mainline architecture is stable
2. at least one real host output path works end to end
3. workspace exists as persisted state
4. new cases no longer require frequent architecture rewrites

## Phase 2: README-Target MVP

### Goal

Turn the construction baseline into a usable feature-management MVP that matches the README story at minimum depth.

### Required Capabilities

Phase 2 requires:

- host separation as a hard boundary
- feature registry / workspace as source of truth
- `create`
- `update` as owned-scope feature rewrite
- `delete` as real unload
- minimum cross-feature conflict governance
- write-preview / impact / evidence visibility

### Explicit Boundary

Phase 2 `update` means:

- target an existing persisted feature
- keep the same `featureId`
- rewrite only that feature's owned outputs and allowed bridge bindings

It does **not** mean:

- semantic entity-aware evolution inside arbitrary existing systems
- whole-codebase intelligent merge

### Definition Of Done

Phase 2 is established only when:

1. `create` produces a persisted feature with truthful patterns/files/bindings
2. `update` rewrites owned artifacts rather than only writing metadata
3. `delete` unloads the feature from workspace, owned files, and bridge exposure
4. minimum conflict checks run before write
5. agents can use workspace and review artifacts to manage multiple features safely

## Phase 3: Extended Lifecycle And Platformization

### Goal

Expand beyond the README-target MVP into richer lifecycle and platform governance.

### Typical Later Capabilities

- `regenerate`
- `rollback`
- semantic incremental update
- richer relationship/dependency graphs
- broader governance/productization
- multi-host extension

## Current Status

Current status should be read as:

- Phase 1 baseline: substantially standing
- Phase 2 README-target MVP: **in progress**
- Phase 3: not started as a product milestone

The project should no longer claim:

- Phase 2 complete
- Phase 3 started

unless `create/update/delete/governance` are all product-grade.

## Immediate Priority

1. align workspace docs and code
2. finish product-grade `create`
3. finish product-grade `update`
4. finish product-grade `delete`
5. move conflict checks from mock/demo logic to workspace-backed checks
6. keep workbench/UI focused on feature registry, detail, and evidence

## Not Recommended As The Next First Step

- semantic incremental update
- `regenerate` / `rollback` productization
- adding a second host
- broad UI expansion
- large graph/governance systems
- broad pattern expansion unrelated to the README MVP

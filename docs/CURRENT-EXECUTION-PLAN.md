# Current Execution Plan

> Status: authoritative
> Audience: agents
> Doc family: baseline
> Update cadence: on-phase-change
> Last verified: 2026-04-18
> Read when: deciding the active Dota2 mainline execution queue and critical-path task order
> Do not use for: cross-track coordination by itself or long-term roadmap planning

## Purpose

This document defines the current Dota2 execution order for active work.

If a fresh session-sync note disagrees with this file on the current step or blocker, refresh this file before routing more workers.

## Current Step

**Step 6. Validation / evidence / case generalization**

The V2 governance-first control plane is now closed enough in code and ratified into the root baseline.

The active Dota2 queue is no longer:

- v1 grammar-family closure
- package-6 grammar refresh
- synthetic exploratory bridge migration

The active queue is now:

- validate the closed V2 chain on real Dota2 cases
- prove templated and exploratory paths with the same final gate semantics
- prove dependency-driven revalidation and maintenance-command truthfulness

## Current Goal

Validate the ratified Dota2 V2 lifecycle on honest end-to-end evidence.

Current target chain:

`IntentSchema -> Blueprint Stage -> Strategy Selection -> Assembly / ArtifactSynthesis -> LocalRepair -> Host Realization / Routing / Write -> Validation -> Final CommitDecision -> Workspace Lifecycle`

## Current Blocker

The primary blocker is no longer missing architecture.

The primary blocker is missing fresh end-to-end evidence across the new V2 paths:

- templated create/update/regenerate stability
- exploratory/guided-native synthesis with review-required commit
- dependency-driven revalidation on provider/consumer changes
- delete / rollback maintenance truth under the same final gate semantics

## Current Plan Items

- `[done]` Preserve the governance backbone:
  - stable feature identity
  - owned files
  - bridge authority
  - workspace lifecycle truth
- `[done]` Ratify V2 baseline semantics:
  - grammar is no longer a pre-generation hard gate
  - unknown mechanics can continue into guided-native / exploratory
  - repair is no longer the primary generation model
- `[done]` Land Dota2 artifact synthesis for guided-native / exploratory asks
- `[done]` Land bounded local repair / muscle fill
- `[done]` Land dependency-driven revalidation
- `[done]` Land final commit decision as chain-end authority
- `[doing]` Re-prove the lifecycle with fresh evidence
- `[todo]` Add or refresh narrow acceptance evidence for:
  - stable templated feature iteration
  - exploratory synthesized feature
  - dependency contract break / downgrade behavior
- `[todo]` Decide which successful exploratory outputs are ready to graduate into reusable pattern/family assets

## Mainline Rules

1. Do not reintroduce grammar-v1 as mechanic admission law.
2. Do not present repair as a substitute for blueprinting or synthesis.
3. Do not allow raw prompt text to infer undeclared cross-feature writes.
4. Do not treat exploratory write success as “stabilized” without review and repeated evidence.
5. Do not let workbench or demo artifacts replace CLI lifecycle truth.

## Ordered Work Packages

### 1. Prove Templated Lifecycle Stability

Acceptance:

- known templated feature can create, update, and regenerate without ownership drift
- stable file layout remains stable
- dependency graph remains truthful

### 2. Prove Exploratory / Guided-Native Path

Acceptance:

- no family/pattern hit still reaches synthesis
- owned Lua/KV/UI candidate artifacts are produced
- final commit decision is `exploratory`
- review artifact clearly states review requirement

### 3. Prove Repair Boundary

Acceptance:

- boundary-local failure can trigger repair
- repair stays inside bounded owned scope
- repair cannot widen ownership or dependency truth

### 4. Prove Dependency Revalidation

Acceptance:

- provider update with compatible surface keeps consumers valid
- required surface break blocks provider commit
- optional break downgrades consumer to `needs_review`

### 5. Tighten Graduation

Acceptance:

- repeated successful exploratory outputs can be promoted without changing workspace ownership semantics
- family/pattern graduation is evidence-driven, not aspirational

## Non-Goals

Do not treat these as the active queue unless explicitly reopened:

- bringing back v1 grammar package work
- broad new case growth as a substitute for V2 validation
- arbitrary host-side code editing
- second-host write-ready claims
- workbench-first lifecycle execution

## Related Docs

Read alongside:

1. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
2. [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
3. [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)
4. [LLM-INTEGRATION.md](/D:/Rune%20Weaver/docs/LLM-INTEGRATION.md)
5. [WIZARD-BLUEPRINT-CHAIN.md](/D:/Rune%20Weaver/docs/WIZARD-BLUEPRINT-CHAIN.md)
6. [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)

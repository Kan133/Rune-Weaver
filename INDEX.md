# Rune Weaver Index

## First Read

1. [README.md](/D:/Rune%20Weaver/README.md)
2. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
3. [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md)
4. [AUTONOMOUS-DEVELOPMENT-POLICY.md](/D:/Rune%20Weaver/docs/AUTONOMOUS-DEVELOPMENT-POLICY.md)
5. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
6. [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)
7. [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
8. [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)

## Current Position

Rune Weaver now has a standing CLI lifecycle baseline and is in the post-ABCD execution phase.

The current target is:

- release-grade evidence for standing lifecycle claims
- one coherent product entry path into the authoritative CLI lifecycle
- completed x-template onboarding / launch preparation
- one repeatable walkthrough for create/update/delete/governance

Deferred for now:

- `regenerate`
- `rollback`
- structure-level update
- second host
- turning workbench into the authoritative executor

## Document Status

### Authoritative For Agents

- [README.md](/D:/Rune%20Weaver/README.md)
  - target product outcome
- [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
  - current lifecycle boundary and current truth
- [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md)
  - how lead agents should scope and evaluate worker tasks
- [AUTONOMOUS-DEVELOPMENT-POLICY.md](/D:/Rune%20Weaver/docs/AUTONOMOUS-DEVELOPMENT-POLICY.md)
  - when agents should proceed autonomously vs when they should stop and ask
- [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
  - operational entry and next-action guidance
- [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)
  - active execution queue after the post-ABCD reset
- [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
  - current execution layering
- [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)
  - workspace truth, ownership, create/update/delete semantics

### Governance

- [DOCUMENT-GOVERNANCE.md](/D:/Rune%20Weaver/docs/DOCUMENT-GOVERNANCE.md)
  - doc status rules and archive policy

### Reference, Not Single Source Of Truth

- [PRODUCT.md](/D:/Rune%20Weaver/docs/PRODUCT.md)
- [ROADMAP.md](/D:/Rune%20Weaver/docs/ROADMAP.md)
- [PHASE-ROADMAP-ZH.md](/D:/Rune%20Weaver/docs/PHASE-ROADMAP-ZH.md)
- [FEATURE-CONFLICT-GOVERNANCE-GUARDRAILS-ZH.md](/D:/Rune%20Weaver/docs/FEATURE-CONFLICT-GOVERNANCE-GUARDRAILS-ZH.md)
- [FEATURE-BOUNDARY-RELATIONSHIP-GUARDRAILS-ZH.md](/D:/Rune%20Weaver/docs/FEATURE-BOUNDARY-RELATIONSHIP-GUARDRAILS-ZH.md)
- [DEMO-PATHS.md](/D:/Rune%20Weaver/docs/DEMO-PATHS.md)
- [CURRENT-STATE-VS-TARGET.md](/D:/Rune%20Weaver/docs/CURRENT-STATE-VS-TARGET.md)

### Planning / Future Contracts

- active planning docs should be explicitly marked and must not override the baseline
- superseded phase/workbench/UI future-contract docs have been moved to [archive/docs/2026-04-mvp-reset/README.md](/D:/Rune%20Weaver/archive/docs/2026-04-mvp-reset/README.md)
- superseded packet queue / completion tracker docs have been moved to [archive/docs/2026-04-post-abcd-plan-reset/README.md](/D:/Rune%20Weaver/archive/docs/2026-04-post-abcd-plan-reset/README.md)
- regenerate / rollback heavy lifecycle contracts

These may be useful, but agents must not treat them as shipped behavior.

### Archive / Historical

- [archive](/D:/Rune%20Weaver/archive)
- [old](/D:/Rune%20Weaver/old)
- historical repair/debug scripts in `scripts/`

## Current Product Boundary

Rune Weaver currently owns only:

- `game/scripts/src/rune_weaver/**`
- `game/scripts/vscripts/rune_weaver/**`
- `content/panorama/src/rune_weaver/**`
- explicit bridge points

Allowed bridge points:

- `game/scripts/src/modules/index.ts`
- `content/panorama/src/hud/script.tsx`

Rune Weaver does not own:

- arbitrary host files
- user business code
- arbitrary intelligent merge behavior

## Useful Secondary Docs

- [DOCUMENT-GOVERNANCE.md](/D:/Rune%20Weaver/docs/DOCUMENT-GOVERNANCE.md)
- [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md)
- [HOST-INTEGRATION-DOTA2.md](/D:/Rune%20Weaver/docs/HOST-INTEGRATION-DOTA2.md)
- [QA.md](/D:/Rune%20Weaver/docs/QA.md)
- [ENGINEERING-GUARDRAILS.md](/D:/Rune%20Weaver/docs/ENGINEERING-GUARDRAILS.md)
- [PATTERN-MODEL.md](/D:/Rune%20Weaver/docs/PATTERN-MODEL.md)
- [PATTERN-PIPELINE.md](/D:/Rune%20Weaver/docs/PATTERN-PIPELINE.md)
- [TECHNICAL-REFERENCE-LAYER.md](/D:/Rune%20Weaver/docs/TECHNICAL-REFERENCE-LAYER.md)

## Reading Rule

When documents disagree:

1. prefer implementation reality over historical claims
2. prefer [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md) for current scope
3. prefer [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md) for task scoping and acceptance
4. prefer [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md) for current operational sequencing
5. prefer [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md) for active priority order
6. use roadmap/front-end/product long docs as explanation, not as the final shipping truth

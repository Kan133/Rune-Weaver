# Rune Weaver Index

> Status: active-reference
> Audience: agents
> Doc family: control
> Update cadence: on-phase-change
> Last verified: 2026-04-14
> Read when: entering the repo and locating the right control docs
> Do not use for: overriding DOC-STATUS-REGISTRY or AGENT-DOC-ROUTING

## Control Surface First

Do not scan `docs/` blindly.

Start here:

1. [AGENT-DOC-ROUTING.md](/D:/Rune%20Weaver/docs/AGENT-DOC-ROUTING.md)
2. [DOC-STATUS-REGISTRY.md](/D:/Rune%20Weaver/docs/DOC-STATUS-REGISTRY.md)
3. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
4. [DOCUMENT-GOVERNANCE.md](/D:/Rune%20Weaver/docs/DOCUMENT-GOVERNANCE.md)
5. [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)
6. [SESSION-SYNC-PROTOCOL.md](/D:/Rune%20Weaver/docs/session-sync/SESSION-SYNC-PROTOCOL.md)

Rule:

- directory presence does not mean execution truth
- if a doc is missing from the registry, do not trust it as active truth by default

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

Rune Weaver currently has:

- stable low-frequency baseline docs for lifecycle, architecture, and workspace truth
- fresh session-sync notes for same-day mainline status
- a shared plan for cross-track coordination

Do not treat this file as the freshest step/blocker tracker.
Do not treat [README.md](/D:/Rune%20Weaver/README.md) as the freshest same-day status board either; it is the public product boundary, not the live execution queue.
For same-day current-step / blocker truth, prefer [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md) and the latest session-sync notes under `docs/session-sync/`.

## Document Status

### Authoritative For Agents

- [README.md](/D:/Rune%20Weaver/README.md)
  - public product boundary and honest current capability framing
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
- [DOC-STATUS-REGISTRY.md](/D:/Rune%20Weaver/docs/DOC-STATUS-REGISTRY.md)
  - authoritative doc trust registry for agents, including `needs-refresh`, `planning-only`, and `ignore-for-execution`
- [AGENT-DOC-ROUTING.md](/D:/Rune%20Weaver/docs/AGENT-DOC-ROUTING.md)
  - task-based routing guide for which docs agents should read

### Fresh Coordination Inputs

- [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)
  - freshest cross-track current state and attention split
- [SESSION-SYNC-PROTOCOL.md](/D:/Rune%20Weaver/docs/session-sync/SESSION-SYNC-PROTOCOL.md)
  - note shape and shared-plan refresh rules
- latest `docs/session-sync/dota2-mainline-*.md`
  - freshest Dota2 step/blocker note
- latest `docs/session-sync/war3-mainline-*.md`
  - freshest War3 step/blocker note

### Host-Specific Docs

- Dota2-specific docs now live under [docs/hosts/dota2](/D:/Rune%20Weaver/docs/hosts/dota2)
- War3-specific docs now live under [docs/hosts/war3](/D:/Rune%20Weaver/docs/hosts/war3)
- use [DOC-STATUS-REGISTRY.md](/D:/Rune%20Weaver/docs/DOC-STATUS-REGISTRY.md) and [AGENT-DOC-ROUTING.md](/D:/Rune%20Weaver/docs/AGENT-DOC-ROUTING.md) to decide which host docs are active-reference versus planning-only

### Reference, Not Single Source Of Truth

- [PRODUCT.md](/D:/Rune%20Weaver/docs/PRODUCT.md)
- [ROADMAP.md](/D:/Rune%20Weaver/docs/ROADMAP.md)
  - planning-only and may lag fresh mainline status
- [PHASE-ROADMAP-ZH.md](/D:/Rune%20Weaver/docs/PHASE-ROADMAP-ZH.md)
  - planning-only and may lag fresh mainline status
- [FEATURE-CONFLICT-GOVERNANCE-GUARDRAILS-ZH.md](/D:/Rune%20Weaver/docs/FEATURE-CONFLICT-GOVERNANCE-GUARDRAILS-ZH.md)
- [FEATURE-BOUNDARY-RELATIONSHIP-GUARDRAILS-ZH.md](/D:/Rune%20Weaver/docs/FEATURE-BOUNDARY-RELATIONSHIP-GUARDRAILS-ZH.md)
- [DEMO-PATHS.md](/D:/Rune%20Weaver/docs/DEMO-PATHS.md)

### Planning Narrative Only

- [CURRENT-STATE-VS-TARGET.md](/D:/Rune%20Weaver/docs/CURRENT-STATE-VS-TARGET.md)
  - pure state-comparison narrative; do not use for execution priority or worker task ordering

### Planning / Future Contracts

- active planning docs should be explicitly marked and must not override the baseline
- [DOC-GOVERNANCE-AUDIT-2026-04-14.md](/D:/Rune%20Weaver/docs/DOC-GOVERNANCE-AUDIT-2026-04-14.md)
  - documentation cleanup audit for current mainline; planning/reference only
- [INTENT-SCHEMA-BLUEPRINT-UPDATE-PLAN.md](/D:/Rune%20Weaver/docs/INTENT-SCHEMA-BLUEPRINT-UPDATE-PLAN.md)
  - proposed architecture update for richer intent modeling and bounded blueprint-stage LLM assistance
- [MODULE-NEED-SEAM-PROPOSAL.md](/D:/Rune%20Weaver/docs/MODULE-NEED-SEAM-PROPOSAL.md)
  - canonical cross-lane planning seam for normalized blueprint module needs
- [INTENT-SCHEMA-VNEXT-PROPOSAL.md](/D:/Rune%20Weaver/docs/INTENT-SCHEMA-VNEXT-PROPOSAL.md)
  - proposed typed IntentSchema vNext contract
- [BLUEPRINT-PROPOSAL-CONTRACT-PROPOSAL.md](/D:/Rune%20Weaver/docs/BLUEPRINT-PROPOSAL-CONTRACT-PROPOSAL.md)
  - proposed `BlueprintProposal` contract and proposal-side authority boundary
- [BLUEPRINT-NORMALIZER-PROPOSAL.md](/D:/Rune%20Weaver/docs/BLUEPRINT-NORMALIZER-PROPOSAL.md)
  - proposed deterministic normalization gate and `FinalBlueprint` boundary
- [PATTERN-UPDATE-PLAN.md](/D:/Rune%20Weaver/docs/PATTERN-UPDATE-PLAN.md)
  - proposed pattern evolution plan for scale, host-realization routing, and bounded gap fill
- [PATTERN-CONTRACT-VNEXT-PROPOSAL.md](/D:/Rune%20Weaver/docs/PATTERN-CONTRACT-VNEXT-PROPOSAL.md)
  - proposed semantic `PatternContract` / `HostBinding` split
- [REALIZATION-FAMILY-PROPOSAL.md](/D:/Rune%20Weaver/docs/REALIZATION-FAMILY-PROPOSAL.md)
  - proposed `RealizationFamily` taxonomy for planning only
- [FILL-SLOT-CONTRACT-PROPOSAL.md](/D:/Rune%20Weaver/docs/FILL-SLOT-CONTRACT-PROPOSAL.md)
  - proposed typed `FillSlot` contract and bounded gap-fill gating
- [ARCHITECTURE-UPDATE-THREE-LANE-WORKSPLIT.md](/D:/Rune%20Weaver/docs/ARCHITECTURE-UPDATE-THREE-LANE-WORKSPLIT.md)
  - proposed main-controller boundary for running governance, intent-blueprint, and pattern lanes in parallel
- superseded phase/workbench/UI future-contract docs have been moved to [archive/docs/2026-04-mvp-reset/README.md](/D:/Rune%20Weaver/archive/docs/2026-04-mvp-reset/README.md)
- superseded packet queue / completion tracker docs have been moved to [archive/docs/2026-04-post-abcd-plan-reset/README.md](/D:/Rune%20Weaver/archive/docs/2026-04-post-abcd-plan-reset/README.md)
- regenerate / rollback heavy lifecycle contracts

These may be useful, but agents must not treat them as shipped behavior.

### Ignore For Execution

- [MVP-EXECUTION-QUEUE.md](/D:/Rune%20Weaver/docs/MVP-EXECUTION-QUEUE.md)
  - redirect stub only; use [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)
- [TASK-COMPLETION.md](/D:/Rune%20Weaver/docs/TASK-COMPLETION.md)
  - redirect stub only; use current acceptance evidence and [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)

### Archive / Historical

- [archive](/D:/Rune%20Weaver/archive)
- [old](/D:/Rune%20Weaver/old)
- [archive/docs/2026-04-session-sync-history/README.md](/D:/Rune%20Weaver/archive/docs/2026-04-session-sync-history/README.md)
  - superseded session-sync snapshots
- [archive/docs/2026-04-root-doc-cleanup/README.md](/D:/Rune%20Weaver/archive/docs/2026-04-root-doc-cleanup/README.md)
  - root-doc cleanup bucket for superseded host worksplit and productization plans
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
- [HOST-INTEGRATION-DOTA2.md](/D:/Rune%20Weaver/docs/hosts/dota2/HOST-INTEGRATION-DOTA2.md)
- [QA.md](/D:/Rune%20Weaver/docs/QA.md)
- [ENGINEERING-GUARDRAILS.md](/D:/Rune%20Weaver/docs/ENGINEERING-GUARDRAILS.md)
- [PATTERN-MODEL.md](/D:/Rune%20Weaver/docs/PATTERN-MODEL.md)
- [PATTERN-SPEC.md](/D:/Rune%20Weaver/docs/PATTERN-SPEC.md)
- [PATTERN-PIPELINE.md](/D:/Rune%20Weaver/docs/PATTERN-PIPELINE.md)
- [TECHNICAL-REFERENCE-LAYER.md](/D:/Rune%20Weaver/docs/TECHNICAL-REFERENCE-LAYER.md)

## Reading Rule

When documents disagree:

1. prefer implementation reality over historical claims
2. prefer [DOC-STATUS-REGISTRY.md](/D:/Rune%20Weaver/docs/DOC-STATUS-REGISTRY.md) for doc trust and freshness
3. prefer [AGENT-DOC-ROUTING.md](/D:/Rune%20Weaver/docs/AGENT-DOC-ROUTING.md) for read order
4. prefer [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md) for current scope
5. prefer [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md) for task scoping and acceptance
6. prefer [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md) for current operational sequencing
7. prefer [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md) for active priority order
8. use roadmap/front-end/product long docs as explanation, not as the final shipping truth

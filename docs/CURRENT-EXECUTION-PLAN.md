# Current Execution Plan

> Status: authoritative
> Audience: agents
> Doc family: baseline
> Update cadence: on-phase-change
> Last verified: 2026-04-25
> Read when: deciding the active Dota2 mainline execution queue and critical-path task order
> Do not use for: cross-track coordination by itself or long-term roadmap planning

## Purpose

This document defines the current Dota2 execution order for active work.

If a fresh session-sync note disagrees with this file on the current step or blocker, refresh this file before routing more workers.

## Current Step

**Step 7. Productization / UX bridge**

The V2 governance-first control plane and Step 6 evidence closure are now strong enough to move Dota2 into productization.

The active Dota2 queue is no longer:

- pure case/evidence closure work
- ad hoc CLI/workbench/bridge lifecycle summaries
- workbench-side governance heuristics growing as a second authority

The active queue is now:

- project existing governance truth through one Dota2-owned product read-model
- make bridge, CLI, and workbench consume the same lifecycle / reusable-governance / grounding / repairability axes
- keep compatibility-only fallback visibly secondary for stale bridge/workspace payloads without turning it back into product authority
- use `export-bridge` as the only legacy payload refresh lane when stale payloads need to be retired
- keep checked-in public samples and dev/test fixtures from re-teaching raw legacy payload shapes as the default product path
- keep the repaired create front-door closed now that explicit choose-one `selection_pool` asks and catalog-backed `equipment` draws no longer leak into wizard-default or exploratory fallback

## Current Goal

Productize the ratified Dota2 V2 lifecycle truth without inventing a second governance authority.

Current target chain:

`Canonical Dota2 Governance Truth -> Dota2 Governance Read-Model -> Bridge / CLI / Workbench Product Surfaces`

## Current Blocker

The primary blocker is no longer missing architecture or case evidence.

The former create-front-door blocker is also closed:

- explicit choose-one local weighted-selection asks no longer stop at Stage 1 by default
- bounded external-catalog equipment draws close through honest `selection_pool` family/source truth
- ambiguous weighted-card prompts still block honestly on unresolved `selection_flow`

The primary blocker is keeping product surfaces honest while stale payloads still exist:

- older bridge/workspace payloads without `governanceReadModel` still need compatibility-only display fallback
- stale host-status and legacy workbench-result payloads still need the same display-only fallback boundary
- `export-bridge` is the only payload refresh lane for retiring those stale payloads; doctor/validate/repair are not migration tools
- repairability must stay live observational truth rather than persisted workspace authority
- future product entry points must not re-derive lifecycle, admission, grounding, or repairability locally
- genericization into core is premature until another host proves the same axes without Dota2-specific semantics

Current Step 7 policy is fixed:

- compatibility-only fallback may shrink further only after all product/public sources are governed, connected-host stays read-model-first, legacy probes remain dev/debug/test-only, and guard tests prove no product path depends on the compatibility projector
- stale payload refresh is event-driven, not time-driven: refresh only when product-facing host truth changes, the read-model projection changes, the public bridge artifact is missing root-level `governanceReadModel`, or a checked-in proof host/sample must be re-exported
- `npm run cli -- export-bridge --host <path> [--output <dir>]` is the only refresh lane; `doctor`, `validate`, `repair`, `workbench --inspect`, connected-host status, and manual JSON edits are never refresh mechanisms
- `buildDota2GovernanceReadModel(...)` stays Dota2 adapter-owned with schema version `dota2-governance-read-model/v1`, and no core genericization work is in scope until a second host proves the same axes without importing Dota2 seam or doctor semantics

## Current Plan Items

- `[done]` Close the V2 governance-first control plane and re-prove the bounded Dota2 case lanes on fresh hosts.
- `[done]` Land Dota2-first governance product read-model V1 with four explicit axes:
  - `lifecycle`
  - `reusableGovernance`
  - `grounding`
  - `repairability`
- `[done]` Route bridge export, workbench inspect, doctor wording, and workbench UI through the shared read-model instead of local heuristics.
- `[done]` Reduce compatibility-only fallback to an explicit legacy display boundary across raw workspace, bridge, connected-host status, and legacy workbench-result payloads.
- `[done]` Move the default public sample and dev/test teaching lane onto governed payloads, while preserving one explicit legacy compatibility probe for regression.
- `[done]` Fix the compatibility shrink gate: only shrink fallback after all product/public sources are governed, connected-host remains read-model-first, legacy probes stay dev/debug/test-only, and guard tests prove no product path depends on compatibility projection.
- `[done]` Fix the stale-payload refresh cadence as event-driven and `export-bridge`-only; `doctor`/`validate`/`repair` remain observation or proof surfaces rather than migration tools.
- `[done]` Fix the no-core guard: governance read-model genericization stays blocked until second-host evidence proves the same axes without Dota2-specific seam or doctor semantics.

## Mainline Rules

1. Do not reintroduce grammar-v1 as mechanic admission law.
2. Do not present repair as a substitute for blueprinting or synthesis.
3. Do not allow raw prompt text to infer undeclared cross-feature writes.
4. Do not treat exploratory write success as “stabilized” without review and repeated evidence.
5. Do not let bridge, CLI, or workbench invent a second governance authority on top of the canonical Dota2 truth.

## Ordered Work Packages

### 1. Land And Hold One Governance Read-Model

Acceptance:

- one Dota2-owned builder projects product-facing governance truth
- the builder consumes only canonical Dota2/workspace truth plus optional live observation
- product verdict stays derived guidance, not new authority

### 2. Unify Product Consumption

Acceptance:

- bridge export emits the read-model at the top level
- CLI inspect and doctor wording consume the same read-model or its repairability formatter
- workbench UI prefers the read-model over local heuristics

### 3. Bound Compatibility

Acceptance:

- older payloads still render without breaking the product
- compatibility-only fallback is explicitly marked and visibly secondary
- bridge refresh is the only stale-payload retirement lane
- no new product surface grows its own lifecycle/admission/grounding heuristics

### 4. Protect Observational Repairability

Acceptance:

- live validation/repair output can inform product surfaces
- repairability does not become persisted workspace authority
- `not_checked` remains an honest state where no live observation exists

### 5. Delay Genericization Until Evidence Exists

Acceptance:

- Dota2 seam and doctor semantics stay adapter-owned
- no core generic read-model is introduced without second-host proof
- future extraction is evidence-driven, not aspirational

## Non-Goals

Do not treat these as the active queue unless explicitly reopened:

- bringing back v1 grammar package work
- broad new case growth as a substitute for product-surface convergence
- arbitrary host-side code editing
- second-host write-ready claims
- product UIs inferring governance truth on their own

## Related Docs

Read alongside:

1. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
2. [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
3. [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)
4. [LLM-INTEGRATION.md](/D:/Rune%20Weaver/docs/LLM-INTEGRATION.md)
5. [WIZARD-BLUEPRINT-CHAIN.md](/D:/Rune%20Weaver/docs/WIZARD-BLUEPRINT-CHAIN.md)
6. [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)

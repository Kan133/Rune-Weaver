# ModuleNeed Seam Proposal

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: temporary
> Last verified: 2026-04-14
> Read when: checking residual notes around the canonical `ModuleNeed` seam after baseline wording landed
> Do not use for: redefining the accepted canonical seam in parallel with baseline docs
> Owner: Lane B semantic ownership, Lane C consumer ownership, main controller merge authority

## Purpose

This document now serves mainly as a residual seam note.

The canonical `ModuleNeed` seam has already been accepted into baseline wording.
This file should therefore carry only:

- field-intent reminders
- older-term mapping notes
- residual notes owned by Lane B on the semantic side

It should not re-open the existence of a second competing seam.

The shared seam is:

- `ModuleNeed`

The goal is to stop cross-lane terminology drift.

Lane B owns the semantic output shape of this seam.
Lane C consumes it.
The main controller owns final wording when this seam is promoted into baseline docs.

---

## Frozen Decision

There is one canonical cross-lane `ModuleNeed` proposal shape for this wave.

The minimum field set is:

```ts
interface ModuleNeed {
  moduleId: string;
  semanticRole: string;
  requiredCapabilities: string[];
  optionalCapabilities?: string[];
  requiredOutputs?: string[];
  stateExpectations?: string[];
  integrationHints?: string[];
  invariants?: string[];
  boundedVariability?: string[];
  explicitPatternHints?: string[];
  prohibitedTraits?: string[];
}
```

This is the only `ModuleNeed` proposal shape that other planning docs should define or reference directly.

---

## Field Intent

- `moduleId`
  - stable link back to the normalized blueprint module
- `semanticRole`
  - human-reviewable statement of what the module is responsible for
- `requiredCapabilities`
  - semantic capabilities Pattern resolution must satisfy
- `optionalCapabilities`
  - nice-to-have capabilities that improve fit but do not block selection
- `requiredOutputs`
  - output expectations that matter before host realization
- `stateExpectations`
  - state ownership or lifecycle hints needed by Pattern and Host lanes
- `integrationHints`
  - non-host-final binding expectations that preserve structural seams
- `invariants`
  - must-hold conditions Pattern selection and realization may not violate
- `boundedVariability`
  - module-local variability zones that may later map to declared `FillSlot`s
- `explicitPatternHints`
  - optional pattern-id hints from upstream, never authoritative
- `prohibitedTraits`
  - pattern traits that must not be selected for this module

---

## Mapping Rules For Older Terms

These older proposal-side terms should not continue as parallel seam names:

- `summary`
  - merge into `semanticRole`
- `capabilityTags`
  - merge into `requiredCapabilities` or `optionalCapabilities`
- `requiredSemantics`
  - merge into `requiredCapabilities`, `invariants`, or `integrationHints`
- `ModuleNeedCandidate`
  - proposal-stage precursor only; normalize into `ModuleNeed`
- `BlueprintModuleNeed`
  - treat as old draft wording; replace with `ModuleNeed`

Rule:

- do not keep the old and new terms side by side once a doc is touched

---

## Boundary Rules

`ModuleNeed` may express:

- semantic demand
- bounded variability demand
- structural invariants
- integration expectations

`ModuleNeed` must not decide:

- final pattern selection
- final host realization family
- final generator family
- write targets
- host-native output paths

If a downstream lane needs those decisions, it must derive them deterministically from `ModuleNeed` plus its own contracts.

---

## Ownership Rule

Lane B may:

- define and refine `ModuleNeed`
- decide which blueprint-side signals normalize into it

Lane C may:

- consume `ModuleNeed`
- request missing semantics from Lane B
- not redefine the seam's core field vocabulary on its own

The main controller may:

- rename fields only when merging across lanes
- not allow two live `ModuleNeed` shapes to coexist

---

## Lane C Consumer Note

Lane C consumes `ModuleNeed` for:

- pattern capability fit
- trait exclusion
- realization-family compatibility inputs
- `FillSlot` demand mapping from `boundedVariability`

Lane C must not:

- define a second competing `ModuleNeed` shape
- rename `boundedVariability` into a new seam field
- treat `explicitPatternHints` as primary routing authority
- treat per-pattern override policy as a replacement for capability-first resolution

For Lane C planning docs, the intended common path is:

`ModuleNeed -> capability fit -> realization family -> routed outputs -> fill slots`

where:

- `explicitPatternHints` may participate only after capability / invariants / outputs / state / family evaluation has produced a tie set
- `HostBinding overridePolicy` is exception policy only and every override must carry `reason`, `owner`, and `sunsetCondition`
- `FillSlot` remains bounded completion only

## Lane C Residual Note

From the Lane C side, the remaining residual work is limited to:

1. consuming `boundedVariability` consistently when mapping into declared `FillSlot`s
2. avoiding any proposal-side drift back into a second seam vocabulary
3. feeding controller-owned `PATTERN-SPEC` work with clearer minimum admission expectations for `PatternContract`, `HostBinding`, and `FillSlot`

The canonical seam itself is no longer the open question for Lane C.

---

## Acceptance Rule For This Planning Wave

This seam is considered frozen enough for the planning wave when:

1. Lane B planning docs reference only this `ModuleNeed` shape
2. Lane C planning docs consume only this `ModuleNeed` shape
3. no planning doc defines a second competing `ModuleNeed` interface

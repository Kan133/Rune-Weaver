# Gap Fill Policy

## Status

Phase 2+ future extension only.

Not implemented.

This document defines how future conservative gap fill should work without breaking the current pipeline boundaries.

## Purpose

Gap fill is the controlled handling of missing but non-fatal information.

Its purpose is to:

- let the pipeline continue when small structural gaps remain
- avoid premature failure for recoverable ambiguity
- preserve uncertainty explicitly
- keep fallback behavior reviewable

Gap fill must be conservative.

## Core Rule

Gap fill must be layer-local.

There must not be a single global gap-filler that silently patches every stage.

## Allowed Future Gap Fill Layers

### 1. Intent Gap Fill

Location:

- at or immediately around the Wizard layer

Purpose:

- fill small intent-level omissions
- preserve uncertainty when the user input is incomplete but still usable

Examples:

- UI requirement unknown -> conservative default plus uncertainty
- trigger model weakly implied -> explicit low-confidence assumption

### 2. Blueprint Gap Fill

Location:

- Blueprint orchestration layer

Purpose:

- produce weak but reviewable structure when the input is good enough for partial organization

Examples:

- compact single-module Blueprint when richer partitioning is not justified
- explicit blocker instead of invented module explosion

### 3. Assembly Gap Fill

Location:

- Assembly builder

Purpose:

- derive conservative module metadata needed for downstream planning

Examples:

- fallback module role
- fallback outputKinds
- fallback realizationHints

### 4. Host Realization Gap Fill

Location:

- Host Realization layer

Purpose:

- allow conservative realization when structure is incomplete but still tractable

Examples:

- fallback route with low confidence
- explicit deferred or blocked host path

## Disallowed Gap Fill

The system must not allow:

- Wizard silently emitting Blueprint-like structure
- Blueprint silently selecting final patterns
- Blueprint silently making host realization decisions
- Host Realization silently inventing new mechanics
- Generator layer deciding unresolved intent questions
- write/execution layer silently correcting planning defects

## Required Properties

Any future gap fill mechanism must be:

- conservative
- explicit
- reviewable
- reversible
- bounded to one layer

## Auditability Requirements

If gap fill is used in the future, the system should record:

- `fallbackUsed`
- fallback layer
- fallback reason
- confidence impact
- unresolved uncertainty that remains after fallback

Suggested future shape:

```ts
interface FallbackUsage {
  layer: "wizard" | "blueprint" | "assembly" | "host-realization";
  reason: string;
  confidence: "low" | "medium";
  notes?: string[];
}
```

## Relationship To Artifact

Future artifact/reporting should distinguish:

- normal planning result
- conservative fallback result
- deferred result
- blocked result

Gap fill must not be hidden inside normal success reporting.

## Relationship To UI Wizard

UI Wizard is not the same thing as gap fill.

UI Wizard fills intake gaps through explicit user interaction.

Gap fill handles small remaining gaps inside individual pipeline layers.

## Non-Goals

Gap fill is not:

- a universal problem solver
- a substitute for missing contracts
- a substitute for pattern authoring
- a substitute for host capability policy
- a substitute for validation

## Future Integration Notes

The safest future rollout path is:

1. document per-layer fallback rules
2. add artifact support for fallback reporting
3. add small layer-local fallback hooks
4. reject any attempt to centralize all fallback into one global planner

## Risks

If implemented incorrectly, gap fill will create:

- boundary drift
- hidden assumptions
- host-specific leakage into upstream layers
- maintenance complexity
- false confidence in partially understood requests

## Guardrail

Future gap fill must stay local, conservative, and visible.

If a proposed fallback requires cross-layer invention, the correct answer is to stop and surface a blocker instead.

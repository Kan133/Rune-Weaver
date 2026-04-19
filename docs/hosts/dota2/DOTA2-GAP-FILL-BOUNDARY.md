# Dota2 Local Repair Boundary

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-18
> Read when: changing Dota2 bounded repair / muscle-fill behavior or reviewing Dota2 repair boundaries
> Do not use for: expanding repair into architecture ownership or deciding cross-host baseline authority

Compatibility note:

- the filename and some CLI names still say `gap-fill`
- the current product meaning is **LocalRepair / bounded muscle fill**

## Purpose

This document defines how Dota2 local repair works inside Rune Weaver.

The goal is not to let free-form vibecoding rewrite the host pipeline.

The goal is to let Dota2 patch or complete implementation **inside an already-owned, already-routed boundary**:

- Wizard provides semantics
- blueprint provides structure and owned scope
- synthesis or templated assembly provides candidate artifacts
- local repair may patch the admitted local zone
- validation decides whether the candidate can proceed

## Core Rule

Local repair may specialize implementation only inside explicit Dota2 owned boundaries whose existence, path, ownership, and host target were fixed upstream.

Repair may not change:

- feature contract
- dependency edges
- blueprint module topology
- selected pattern binding
- host target selection
- write-plan ownership
- workspace artifact ownership
- bridge / routing / lifecycle contracts

If a requested change needs one of those, it is not repair.

## Authority Surface

Current authority comes from `FinalBlueprint.fillContracts`.

Each `FillContract` binds:

- `boundaryId`
- `targetModuleId`
- `targetPatternId`
- `sourceBindings`
- `allowed`
- `forbidden`
- `invariants`
- `expectedOutput`
- `fallbackPolicy: "deterministic-default"`

Compatibility note:

- workspace `gapFillBoundaries` is only a compatibility projection
- repair authority does not come from workspace alone

## Repair Trigger Conditions

Repair should trigger only when:

1. a templated or synthesized candidate already exists
2. validation finds a boundary-local failure or missing local muscle
3. a matching fill contract exists
4. the fix does not widen ownership or dependency truth

If those conditions are not met, the candidate should not be “saved” by repair.

## Current Dota2 Repair Anchors

Current bounded Dota2 anchors include:

- [selection-flow.ts](/D:/Rune%20Weaver/adapters/dota2/generator/server/selection-flow.ts)
- [weighted-pool.ts](/D:/Rune%20Weaver/adapters/dota2/generator/server/weighted-pool.ts)
- [selection-modal.ts](/D:/Rune%20Weaver/adapters/dota2/generator/ui/selection-modal.ts)

Current synthesis-era anchors also include synthesized owned artifacts such as:

- generated Lua ability shells
- generated KV ability definitions
- blueprint-declared UI owned skeletons

## Allowed Repair Shapes

### Module Logic Boundary

Allowed:

- formula specialization
- mapping completion
- local defensive guards
- candidate formatting / transformation inside module-local logic

Not allowed:

- new integration points
- new cross-module ownership assumptions
- new dependency contracts

### UI Presentation Boundary

Allowed:

- copy
- placeholder body completion
- payload normalization details
- visual layout details inside the same generated component contract

Not allowed:

- root mount contract changes
- event wiring ownership changes
- bridge ownership changes

### Host Glue Micro-Boundary

Allowed:

- small payload adapters
- small log / guard improvements
- host-safe local normalization

Not allowed:

- server index ownership changes
- bridge ownership changes
- write-point aggregation policy changes

### Source-Backed Artifact Micro-Boundary

Allowed:

- config field filling inside an already-owned Rune Weaver artifact
- bounded object-data refresh inside a fixed artifact path

Not allowed:

- deciding whether the artifact exists
- changing feature ownership of the artifact
- changing the artifact path
- redefining lifecycle semantics from inside repair

## CLI Boundary

Current CLI semantics:

- `repair`
  - primary command name
- `gap-fill`
  - compatibility alias

Current expected meaning:

- bounded local repair / muscle fill
- not a second planner
- not generic freeform code editing

## Validation Expectation

Repair changes should still pass:

- `npm run check-types`
- `npm run cli -- dota2 validate --host <path>`
- `npm run cli -- dota2 doctor --host <path>`

If repair fails and the same validation still fails after retry:

- final commit decision should become `blocked`

## Summary

Dota2 repair is now a **bounded local repair layer**.

It exists to patch or complete already-admitted owned artifacts.
It does not exist to invent new architecture after the fact.

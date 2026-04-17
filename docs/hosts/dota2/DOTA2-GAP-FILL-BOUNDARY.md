# Dota2 Gap Fill Boundary

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-17
> Read when: changing Dota2 generator-side bounded gap-fill behavior or reviewing Dota2 gap-fill boundaries
> Do not use for: expanding Gap Fill into architecture ownership or deciding cross-host baseline authority

This host-specific boundary remains useful, but it should be cross-checked against the current shared Gap Fill baseline because the broader Gap Fill scope is still evolving.

## Purpose

This document defines how Dota2-side gap fill should work inside Rune Weaver.

The goal is not to let free-form vibecoding rewrite the host pipeline.

The goal is to let Dota2-side implementation logic fill the "muscle" inside an already-declared structure:

- `wizard` provides intent
- `blueprint` provides module structure
- `pattern` provides contract
- `generator` provides host-safe baseline
- `gap fill` may specialize allowed implementation zones
- `doctor` / `validator` verify the result

## Core Rule

Gap fill may specialize implementation inside explicit Dota2 generator boundaries and other already-owned Dota2 artifact boundaries whose existence / path / ownership were fixed upstream.

Gap fill may not change:

- blueprint module topology
- selected pattern binding
- host target selection
- write-plan ownership
- workspace artifact ownership
- bridge / routing / lifecycle contracts

If a requested change needs one of those, it is not gap fill. It is architecture or lifecycle work.

Current Dota2 code-truth note:

- Dota2-side gap fill boundaries are now emitted through `FinalBlueprint.fillContracts`
- each `FillContract` is `mode: "closed"` and binds:
  - `boundaryId`
  - `targetModuleId`
  - `targetPatternId`
  - `sourceBindings`
  - `allowed`
  - `forbidden`
  - `invariants`
  - `expectedOutput`
  - `fallbackPolicy: "deterministic-default"`
- LLM may only contribute candidate intent for these boundaries; final activation and boundary ownership stay deterministic

## Allowed Boundary Types

### 1. Module Logic Boundary

Allowed:

- rarity or rule formula specialization
- pool draw policy specialization within declared contract
- case-specific effect mapping
- candidate formatting or transformation inside module-local logic

Not allowed:

- new integration points
- new cross-module ownership assumptions
- new event channel names unless the contract is updated upstream

### 2. UI Presentation Boundary

Allowed:

- modal copy
- card subtitle / badge rendering
- placeholder copy
- payload normalization fallback details
- safe visual layout details within the same generated component contract

Not allowed:

- root mount contract changes
- event subscription skeleton removal
- generated LESS wiring changes outside declared UI pipeline

### 3. Host Glue Micro-Boundary

Allowed:

- small case-specific payload adapters
- small log or guard improvements
- host-safe defensive normalization

Not allowed:

- bridge ownership changes
- server index ownership changes
- write-point aggregation policy changes

### 4. Source-Backed Artifact Micro-Boundary

Allowed:

- object-data / config field filling inside an already-owned Rune Weaver artifact
- bounded content refresh inside a fixed artifact path
- LLM-assisted or rule-assisted muscle fill inside that owned artifact

Not allowed:

- deciding whether the artifact exists
- changing which feature owns the artifact
- changing the artifact path or widening owned scope
- redefining lifecycle or host wiring semantics from inside the artifact fill

## Current Dota2 Boundary Anchors

The following files are the first explicit Dota2 gap-fill anchors:

- [selection-flow.ts](/D:/Rune%20Weaver/adapters/dota2/generator/server/selection-flow.ts)
- [weighted-pool.ts](/D:/Rune%20Weaver/adapters/dota2/generator/server/weighted-pool.ts)
- [selection-modal.ts](/D:/Rune%20Weaver/adapters/dota2/generator/ui/selection-modal.ts)

These are host-specific generator surfaces. They are safe for A group work as long as changes stay inside declared boundaries and do not attempt to redefine shared host contracts.

Current bounded family using these anchors:

- `selection_pool`
  - admitted bounded fields this round:
    - single `triggerKey`
    - `choiceCount` inside `1..5`
    - `objectKind`
    - feature-owned `objects[]`
    - `inventory.capacity` inside `1..30`
    - display copy/title fields
  - still frozen:
    - second trigger
    - multi-confirm flow
    - persistence
    - cross-feature grants
    - arbitrary new effect family

## Boundary IDs

### `selection_flow.effect_mapping`

Intent:

- specialize how a selected option maps to an applied effect

Allowed:

- rarity-driven attribute mapping
- case-specific value mapping
- option-to-effect translation

Forbidden:

- changing event channel names
- changing player-session ownership model
- changing blueprint/pattern bindings

### `weighted_pool.selection_policy`

Intent:

- specialize how candidates are selected from a declared weighted pool contract

Allowed:

- draw policy details within declared `drawMode`
- duplicate handling within declared `duplicatePolicy`
- session-aware filtering inside declared pool state contract

Forbidden:

- changing pool contract shape
- changing host routing
- introducing undeclared persistence semantics

### `ui.selection_modal.payload_adapter`

Intent:

- specialize how incoming selection payload is normalized for safe rendering

Allowed:

- item normalization
- placeholder padding
- defensive fallback values
- card-level presentational formatting

Forbidden:

- changing root mount behavior
- changing transport event names
- moving LESS import or HUD wiring responsibilities

## Implementation Guidance

When adding or changing gap fill inside Dota2 generators:

1. stay inside a declared boundary
2. keep the generator output host-safe even without additional gap fill
3. prefer deterministic baseline logic plus narrow specialization
4. add or update tests when the boundary affects output behavior
5. run Dota2-specific validation and doctor flows after change

When adding or changing gap fill inside a Dota2 source-backed artifact:

1. treat artifact existence / path / ownership as fixed upstream skeleton
2. fill content only inside the already-owned file
3. do not turn object-data fill into module-topology or routing decisions
4. validate the resulting host behavior the same way as generator-side gap fill

## Validation Expectations

Gap fill changes should still pass:

- `npm run check-types`
- `npm run cli -- dota2 validate --host <path>`
- `npm run cli -- dota2 doctor --host <path>`

If the change affects the canonical Talent Draw case, also refresh:

- `npm run demo:talent-draw:refresh -- --host <path>`

## CLI Decision And Approval Flow

Dota2 uses the shared `core/gap-fill` decision and approval contract.

The Dota2 command is only a host-specific shell around that core flow.

### Plan Only

```bash
npm run cli -- dota2 gap-fill --boundary <id> --host <path> --instruction "..."
```

This generates a patch plan, prints the core decision, and writes a review artifact.

If the decision is `require_confirmation`, it also writes:

```text
tmp/cli-review/gap-fill-approval-*.json
```

The command output includes the exact approval command.

### Direct Apply

```bash
npm run cli -- dota2 gap-fill --boundary <id> --host <path> --instruction "..." --apply
```

Direct apply is allowed only when the core decision is `auto_apply`.

If the decision is `require_confirmation` or `reject`, the command blocks and explains the reason codes.

### Approved Apply

```bash
npm run cli -- dota2 gap-fill --host <path> --approve <approval-record.json>
```

Approved apply validates the approval record before writing:

- host root still matches
- boundary id still matches
- target file path still matches
- target file content hash is unchanged
- patch plan hash is unchanged
- record hash is unchanged

If any check fails, the command stops before applying.

This approval path is meant for patches that are too large or complex for unattended auto-apply but still stay inside an approved boundary.

### Dota2 Responsibilities

Dota2 may provide:

- boundary IDs and boundary metadata
- target file resolution
- approval record persistence under `tmp/cli-review`
- Dota2 CLI command wiring
- Dota2-specific validation after a patch is applied

Dota2 must not redefine:

- `auto_apply`, `require_confirmation`, or `reject`
- risk level semantics
- approval record shape
- approval hash validation rules
- core reason-code meaning

## A Group Scope

This document is intentionally Dota2-specific.

A group may:

- refine these boundaries
- add more Dota2 generator anchors
- improve Dota2-specific validation around them

A group should not use this work to introduce:

- shared host contracts
- generic lifecycle skeletons
- generic write-plan abstractions
- generic validation pipeline abstractions

Those belong to C group when needed.

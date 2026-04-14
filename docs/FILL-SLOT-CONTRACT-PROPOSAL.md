# FillSlot Contract Proposal

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: temporary
> Last verified: 2026-04-14
> Read when: reviewing typed bounded variability and `FillSlot` gating during architecture planning
> Do not use for: treating gap fill as architecture ownership or final host/write authority
> Owner: Lane C

## Purpose

This proposal defines `FillSlot` as the contract surface for bounded variability inside an already-selected pattern and already-determined realization path.

The core design rule is simple:

- `FillSlot` is for bounded completion
- `FillSlot` is not for architecture decisions

This proposal exists specifically to stop Gap Fill from becoming invisible AI glue.

## Accepted In Baseline

The following direction is now baseline-aligned:

- `FillSlot` is bounded completion only
- `GapFill` fills declared `FillSlot`s only
- `FillSlot` may not decide pattern, family, generator, host target, or module existence
- `ModuleNeed.boundedVariability -> FillSlot` is a one-way downstream mapping

For accepted wording, prefer:

- [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
- [PATTERN-MODEL.md](/D:/Rune%20Weaver/docs/PATTERN-MODEL.md)
- [MODULE-NEED-SEAM-PROPOSAL.md](/D:/Rune%20Weaver/docs/MODULE-NEED-SEAM-PROPOSAL.md)

This document should now be read mainly for residual validator/review details.

## Frozen Premises Preserved

This proposal preserves:

1. final executable `Blueprint` remains deterministic
2. LLM does not decide final host or write path
3. `HostRealization` remains policy-driven
4. `Gap Fill` does not become architecture owner
5. current lifecycle scope is not reopened

## Decision Summary

1. Every fillable variability zone must be declared explicitly as a `FillSlot`.
2. Each `FillSlot` must have a type, scope, admissibility rule, and validation rule.
3. Slot filling happens only after pattern selection and host family selection.
4. Slot filling may refine bounded content, but may not create new module structure or routing.
5. Undeclared variability should fail validation or escalate for review.

## What FillSlot Owns

`FillSlot` may own bounded variability such as:

- numeric formula bodies inside a declared effect shell
- literal labels, copy, or card text
- event payload mapping fields inside a fixed schema
- named hooks selected from an allowed finite set
- comparator or filter expressions inside a declared slot grammar
- small behavior fragments inside a predefined lifecycle callback surface

## What FillSlot Must Not Own

`FillSlot` must not own:

- whether a module exists
- which pattern is selected
- which realization family is selected
- which generator family is selected
- host write targets
- cross-module architecture
- new state model invention outside declared state affordances
- freeform code blocks without slot grammar or validator

If a requested variability needs any of the above, the system is missing a contract upstream.
That is an architecture blocker, not a fill request.

## Proposed Contract Shape

```ts
interface FillSlotContract {
  slotId: string;
  slotKind: FillSlotKind;
  scope: "pattern" | "binding" | "generator-template";
  required: boolean;
  valueType: string;
  grammar?: string;
  allowedSymbols?: string[];
  bounds?: string[];
  sourceOfTruth?: string;
  validatorIds: string[];
  fallbackPolicy?: "reject" | "default" | "escalate";
}
```

The exact schema can change later.
The contract responsibilities should not.

## Recommended Slot Kinds

Lane C proposes the following initial slot kinds:

| Slot kind | Use |
| --- | --- |
| `literal.text` | titles, labels, descriptions, small user-facing copy |
| `literal.number` | bounded numbers and thresholds |
| `enum.choice` | finite controlled selection among declared options |
| `expression.formula` | formula inside a constrained grammar and symbol set |
| `mapping.object` | bounded key/value mapping against a declared schema |
| `callback.fragment` | small lifecycle-local behavior fragment with allowed APIs only |
| `payload.template` | structured payload filling within a declared output shape |

These kinds are intentionally narrow.
If a requested slot cannot be expressed through one of them, it probably needs a stronger upstream contract rather than a wider fill surface.

## Fill Lifecycle

Fill should occur after three earlier decisions are already fixed:

1. Blueprint has declared the module need
2. resolver has selected pattern contract(s)
3. Host Realization has selected family and routed outputs

This ordering is important.
It prevents fill from deciding architecture after the fact.

## Validation And Gating

Residual focus:

- validator ownership and review gating are not yet fully baselined
- this section remains proposal material for later controller-owned spec work

Validator ownership should be:

- `PatternContract`
  - declares the slot and invariant expectations
- `HostBinding`
  - may attach host-side restrictions when a host narrows admissible values
- generator template
  - provides slot grammar, schema, or allowed symbol surface
- validator layer
  - runs after fill and before write
  - returns only `accept`, `reject`, `escalate`, or deterministic default application

It is explicitly out of bounds to:

- let validator failure trigger freeform "model, please fix it" repair
- let fill repair architecture holes by inventing new routing or structure

Each filled slot should be validated against:

1. slot kind
2. grammar or schema
3. allowed symbol surface
4. invariant compatibility from `PatternContract`
5. host-binding restrictions when relevant

Validation failure should not be silently repaired by freeform generation.

Allowed outcomes:

- accept
- reject
- escalate for review
- use declared deterministic default

## Relationship To Gap Fill

`Gap Fill` should be reinterpreted as:

- the execution process that fills declared `FillSlot`s

It should **not** be interpreted as:

- an architecture problem solver
- a hidden planner
- a fallback resolver
- a host routing decider

If the system cannot generate a good output without asking gap fill to invent:

- missing module boundaries
- host selection
- state ownership
- cross-module event topology

then the true problem is that Blueprint, PatternContract, or HostBinding is underspecified.

## Blueprint Lane Requirements

Lane B does not need to expose new intent-schema core fields for FillSlot.

But Blueprint should expose enough information to distinguish:

- fixed module structure
- module-local bounded variability
- variability that must stay user-configurable vs system-defaulted

At minimum, a module need should be able to indicate:

- requested `boundedVariability` entries
- the expected output surface those zones apply to
- whether variability is required or optional

For seam alignment, Lane C should treat those requests as consumption of canonical `ModuleNeed` fields, especially:

- `boundedVariability`
- `requiredOutputs`
- `stateExpectations`
- `invariants`

Lane C should not introduce a second seam vocabulary for the same need.

Consumer note:

- phrases like "bounded variability" in Lane C docs are explanatory only unless they refer back to `ModuleNeed.boundedVariability`
- the canonical upstream field is `ModuleNeed.boundedVariability`
- any FillSlot mapping should read as `ModuleNeed.boundedVariability -> declared FillSlot set`, not as a new independent planning seam

## Migration Path

### Stage 1

- define FillSlot only for actively evolving patterns
- keep old freeform fill behavior only as explicitly transitional legacy behavior

### Stage 2

- require new patterns to declare fill slots when variability is expected
- reject undocumented freeform holes during review

### Stage 3

- add validators for formula, payload, and callback fragments
- connect validator failures to reviewable blockers

### Stage 4

- shrink legacy gap fill usage until it becomes only typed slot filling

## Residual Items

The main residual items in this proposal are:

1. validator ownership boundaries at implementation detail level
2. review gating behavior for reject / escalate / default paths
3. which `FillSlot` declarations become admission-required in the next `PATTERN-SPEC` merge

## Minimal `FillSlot` Admission Input

For the future controller-owned `PATTERN-SPEC` merge, Lane C recommends the following minimum rule:

1. when downstream `ModuleNeed.boundedVariability` is expected, the admitted pattern/binding surface must either:
   - declare corresponding `FillSlot`s, or
   - explicitly state that no fillable variability is allowed
2. every admitted `FillSlot` should provide at least:
   - slot identity
   - slot kind / type
   - scope
   - validation hook or validator ownership path
   - deterministic fallback behavior when applicable

## Minimal Validator Ownership / Gating Input

For the same future merge, Lane C recommends:

1. validator ownership must be explicit enough to review
   - pattern contract declares invariant expectations
   - host binding may add host-side restrictions
   - generator/template layer may define grammar/schema surfaces
2. validator result space must remain deterministic
   - `accept`
   - `reject`
   - `escalate`
   - declared default application
3. validator failure must not reopen architecture choice
   - no pattern reselection
   - no family reselection
   - no host-target invention

Residual note:

- this is not baseline truth yet
- it is the minimum Lane C admission input recommended for the next `PATTERN-SPEC` merge

## Review Conclusion

This proposal keeps architecture responsibility out of gap fill **if and only if** the project enforces two review rules:

1. every fillable hole must map to a declared slot contract
2. any request that changes module structure, host family, or routing must stop and escalate upstream

Without those rules, FillSlot vocabulary alone will not prevent scope creep.

## Non-Goals Preserved

This proposal does not:

- make gap fill the owner of architecture
- change the meaning of blueprint readiness
- authorize LLM to decide realization or write path
- define final generator template internals

## Recommendations For Main Controller Merge

Merge this proposal only if:

1. `FillSlot` is explicitly defined as bounded completion
2. slot kinds remain typed and reviewable
3. validation failure paths are explicit
4. no merge text implies that gap fill may invent missing architecture

Reject any merge that uses `FillSlot` as a euphemism for "the model figures out the rest."

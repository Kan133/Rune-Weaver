# Blueprint Pattern Resolution

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-20
> Read when: understanding how current `FinalBlueprint` needs become selected patterns, unresolved needs, or synthesis-forward continuation
> Do not use for: pretending every module need must resolve to a pattern before planning may continue

## Purpose

This document records the current resolver truth after the Blueprint/Assembly seam broadened beyond simple category-plus-mechanic mapping.

## Current Inputs

Pattern resolution is driven primarily by `FinalBlueprint`, especially:

- `moduleNeeds`
- `designDraft`
- implementation strategy
- module categories and roles

Important current truth:

- `moduleNeeds` is the pattern-facing seam
- `explicitPatternHints` are tie-break inputs, not override authority
- unresolved needs may still continue honestly when the broader strategy is guided-native or exploratory

## Resolution Order

Current resolution should be read in this order:

1. `ModuleNeed.explicitPatternHints`
2. `requiredCapabilities`
3. `optionalCapabilities`
4. `prohibitedTraits`
5. module category/role fallback
6. host/policy compatibility checks

Current fallback rule:

- if no reusable pattern closes honestly, the need may remain unresolved instead of being forced into a fake pattern match

## Resolver Outputs

Current resolver-facing outputs are:

- `SelectedPattern[]`
- unresolved needs carried into assembly
- issue/warning signals for review

Current shipped selected pattern shape is still:

```ts
interface SelectedPattern {
  patternId: string;
  role: string;
  parameters?: Record<string, unknown>;
}
```

What changed is not the public shape.
What changed is the honesty of continuation around it.

## Unresolved Needs Are First-Class

Current chain truth:

- unresolved module needs are not automatically a fatal planning error
- they remain reviewable structure inside `FinalBlueprint` and `AssemblyPlan`
- they may feed synthesis-forward continuation when strategy and owned scope still allow it

Typical honest outcomes:

- reusable pattern selected
- partially reused result plus unresolved need carry-forward
- fully synthesis-forward continuation for the unresolved need
- blocked result when ownership or dependency truth does not close

## Current Resolution Guardrails

The resolver must not:

1. treat feature ids, demo ids, or prompt words as pattern authority
2. collapse every resolution into a category-only default
3. pretend unresolved needs are resolved just to keep the pipeline moving
4. invent host routing or write targets
5. widen family authority from pattern hints

## Family Boundary

Current family/pattern split remains:

- families own reusable feature skeletons and source-backed lifecycle stability
- patterns own reusable mechanism modules and host-binding fit

Pattern resolution therefore does not own:

- source-backed authoring merge truth
- adapter-specific sidecars
- host-local grant seams

## Honest Current Reading

Use this document to reason about:

- why a module need resolved to a pattern
- why it stayed unresolved
- why a weak/exploratory result may still be honest

Do not use it to claim:

- every `Blueprint` must fully resolve before continuation
- category tables alone define the current resolution model

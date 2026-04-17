# PATTERN-SPEC

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-17
> Read when: admitting or reviewing `PatternContract`, `HostBinding`, and `FillSlot` surfaces for catalog use
> Do not use for: pattern backlog priority, extraction workflow, or host-specific implementation notes by itself

> Status Note
> This document is the current admission baseline for pattern entries.
> It defines the minimum contract a pattern entry must expose before it is safe to admit, extend, or rely on in resolver-facing work.
> For model boundaries, prefer [PATTERN-MODEL.md](/D:/Rune%20Weaver/docs/PATTERN-MODEL.md).
> For candidate and draft flow, prefer [PATTERN-PIPELINE.md](/D:/Rune%20Weaver/docs/PATTERN-PIPELINE.md).
> For authoring workflow, prefer [PATTERN-AUTHORING-GUIDE.md](/D:/Rune%20Weaver/docs/hosts/dota2/PATTERN-AUTHORING-GUIDE.md).

## Purpose

This document defines what counts as an admissible Rune Weaver pattern entry.

It answers five questions:

1. what a formal pattern entry is
2. what minimum semantic contract it must expose
3. what minimum host-binding contract it must expose
4. when bounded variability is allowed through `FillSlot`
5. which entries should be rejected before they reach catalog truth

The goal is not to make pattern docs longer.
The goal is to make them easier for agents to review, compare, and admit without hidden authority creep.

## Accepted Baseline Terms

This document follows the accepted baseline vocabulary:

- `PatternContract`
  - semantic pattern unit
- `HostBinding`
  - host-facing admissibility and restriction layer
- `RealizationFamily`
  - policy vocabulary for common-path host realization
- `ModuleNeed`
  - canonical upstream seam consumed by Pattern Resolution
- `FillSlot`
  - declared bounded variability inside an already-selected pattern / realization path
- `GapFill`
  - controlled muscle-fill execution after structure / realization / ownership are fixed
  - at pattern level, it should enter through declared `FillSlot`s and must not absorb structure authority

This document does not reopen those terms.

## What Counts As An Admitted Pattern Entry

In this spec, an admitted pattern entry is not just a pattern id plus a template fragment.

It is at least:

1. one reviewable `PatternContract`
2. one or more reviewable `HostBinding` entries
3. a validation surface that can reject or escalate invalid use
4. declared `FillSlot`s when bounded variability is intentionally supported

Practical rule:

- a `PatternContract` without any host-attachment path is not yet an admitted catalog entry
- a host-only fragment without a semantic contract is not yet an admitted catalog entry

## Relationship To Other Pattern Docs

- [PATTERN-MODEL.md](/D:/Rune%20Weaver/docs/PATTERN-MODEL.md)
  - defines the boundary between `PatternContract`, `HostBinding`, `RealizationFamily`, and `FillSlot`
- [PATTERN-SPEC.md](/D:/Rune%20Weaver/docs/PATTERN-SPEC.md)
  - defines minimum admission requirements
- [PATTERN-PIPELINE.md](/D:/Rune%20Weaver/docs/PATTERN-PIPELINE.md)
  - defines `candidate -> draft -> admission -> catalog`
- [PATTERN-AUTHORING-GUIDE.md](/D:/Rune%20Weaver/docs/hosts/dota2/PATTERN-AUTHORING-GUIDE.md)
  - defines how to extract and draft candidate patterns

If these docs disagree on admission truth, prefer this document for minimum admission rules and [PATTERN-MODEL.md](/D:/Rune%20Weaver/docs/PATTERN-MODEL.md) for boundary meaning.

## Minimum Admission Shape

The exact implementation schema may evolve.
The required review surfaces should not.

```ts
interface AdmittedPatternEntry {
  contract: PatternContractAdmission;
  bindings: HostBindingAdmission[];
  fillSlots?: FillSlotAdmission[];
}

interface PatternContractAdmission {
  id: string;
  summary: string;
  semanticCategory: string;
  responsibilities: string[];
  nonGoals: string[];
  capabilities: string[];
  traits?: string[];
  inputs: string[];
  outputs: string[];
  invariants: string[];
  compositionRules?: string[];
  hostBindingRefs: string[];
}

interface HostBindingAdmission {
  hostKind: string;
  allowedFamilies: string[];
  preferredFamily?: string;
  requiredHostCapabilities?: string[];
  hostRestrictions?: string[];
  overridePolicy?: {
    reason: string;
    owner: string;
    sunsetCondition: string;
  };
}

interface FillSlotAdmission {
  slotId: string;
  slotKind: string;
  scope: "pattern" | "binding" | "generator-template";
  validatorOwnership: string[];
  fallbackPolicy?: "reject" | "default" | "escalate";
}
```

The point of this sketch is the contract split, not the exact field names.

## Minimum `PatternContract` Admission Rules

A minimally admissible `PatternContract` must expose all of the following review surfaces:

| Surface | Must answer |
| --- | --- |
| semantic identity | what mechanism this is and how reviewers distinguish it from near-duplicates |
| semantic boundary | what it owns and what it explicitly does not own |
| capability surface | what `ModuleNeed.requiredCapabilities` it can satisfy |
| usage contract | what inputs, outputs, parameters, or state affordances it expects |
| validation surface | what invariants or constraints must hold |
| host-attachment path | which `HostBinding` entries may realize it |

Additional admission rules:

- `traits` are required when realization, composition, or exclusion behavior depends on them
- a pattern that can only be found by raw pattern-id hinting is not mature enough for admission
- domain/theme renaming is not enough to justify a new contract
- host API names, file paths, or generator internals must not become semantic identity
- capability surface should be expressed as reusable mechanism tokens, not case names or feature labels
- names such as `monster_enrage_over_time`, `talent_inventory`, or `equipment_draw` are business descriptions, not admissible capability tokens by themselves

## Minimum `HostBinding` Admission Rules

A minimally admissible `HostBinding` must expose all of the following review surfaces:

| Surface | Must answer |
| --- | --- |
| host identity | which host kind or host target scope this binding applies to |
| admissible family surface | which `RealizationFamily` values are legal for this host binding |
| host restrictions or requirements | what host capabilities, blockers, or narrowing rules apply |
| deterministic routing relationship | how this binding participates in policy-driven family selection without becoming semantic authority |
| exception metadata | when override exists, why it exists, who owns it, and when it expires |

Additional admission rules:

- `preferredFamily` may guide common-path routing, but final family selection remains host policy
- `HostBinding overridePolicy` is exception-only
- every override must carry `reason`, `owner`, and `sunsetCondition`
- overrides may narrow, block, or pin an otherwise-admissible family only for documented exception cases
- overrides must not restore `pattern id -> family` as the normal routing path

## Minimum `FillSlot` Admission Rules

`FillSlot` is optional only when the admitted pattern truly has no bounded variability surface.

If downstream use expects `ModuleNeed.boundedVariability`, the admitted pattern and binding surface must do one of two things:

1. declare corresponding `FillSlot`s
2. explicitly state that no fillable variability is allowed

Every admitted `FillSlot` must expose:

| Surface | Must answer |
| --- | --- |
| slot identity | which bounded variability zone is being filled |
| slot kind | what typed fill surface is allowed |
| scope | whether the slot belongs to pattern, binding, or generator-template surface |
| validator ownership path | which layer validates invariants, grammar, or host restrictions |
| deterministic fallback behavior | whether failure means `reject`, `escalate`, or declared default application |

`FillSlot` must not decide:

- whether a module exists
- which pattern is selected
- which realization family is selected
- which generator family is selected
- host write targets
- cross-module architecture

`FillSlot` is the preferred pattern-local entry to Gap Fill, but not every muscle detail must become a new pattern seam.
If an already-owned artifact or already-assigned host-local implementation zone needs bounded content fill, that still counts as Gap Fill as long as pattern / family / host / ownership authority stay fixed upstream.

If a requested variability needs any of those decisions, the entry is underspecified upstream and should not pass admission.

## Resolver And Realization Compatibility Rules

An admitted entry must remain compatible with the accepted common path:

`ModuleNeed -> capability fit -> realization family -> routed outputs -> fill slots`

Shared precedence remains:

`host policy -> HostBinding constraints -> ModuleNeed compatibility -> family -> routed outputs -> fill`

Admission implications:

- `ModuleNeed` is the only canonical module-level seam
- `explicitPatternHints` are tie-break only
- hints may participate only after capability / invariants / outputs / state / family evaluation has produced a tie set
- generator routing is downstream of family selection, not a second semantic resolver
- `FillSlot` is downstream of realization choice and may not reopen family or host authority
- capability fit should match stable mechanism vocabulary rather than prompt wording or case-theme naming

If an entry only works because hints bypass capability fit, or because generator logic re-decides family, the entry should stay in draft.

## Validator Ownership And Result Space

Validator ownership must stay reviewable.

Minimum rule:

- `PatternContract`
  - declares invariant expectations
- `HostBinding`
  - may narrow admissible values with host-side restrictions
- generator or template layer
  - may define grammar, schema, or allowed symbol surface
- validator layer
  - runs after fill and before write

Validator result space must remain deterministic:

- `accept`
- `reject`
- `escalate`
- declared default application

Validation failure must not:

- reselect pattern
- reselect family
- invent host targets
- trigger freeform architectural repair

## Rejection Signals

Reject or keep draft when any of the following is true:

1. the entry is mainly a host API fragment, file path, or template snippet
2. semantic contract and host binding are mixed into one uncontrolled blob
3. the entry relies on raw pattern-id routing as its primary selection mechanism
4. `HostBinding` is missing or cannot explain admissible family choices
5. `overridePolicy` exists without `reason`, `owner`, or `sunsetCondition`
6. bounded variability exists but no `FillSlot` or explicit no-fill rule is declared
7. validator failure would require freeform LLM repair to keep going
8. the proposed pattern is just a renamed domain skin of an existing mechanism family

## Admission Checklist

An entry is ready for catalog admission only when all of the following are true:

- [ ] `PatternContract` has clear semantic identity
- [ ] `PatternContract` has clear responsibilities and non-goals
- [ ] capability surface is declared and reviewable
- [ ] inputs, outputs, and invariants are reviewable
- [ ] at least one `HostBinding` path is declared
- [ ] admissible `RealizationFamily` surface is declared for each binding
- [ ] any `overridePolicy` is exception-only and carries `reason`, `owner`, and `sunsetCondition`
- [ ] any `ModuleNeed.boundedVariability` demand maps to declared `FillSlot`s or explicit no-fill
- [ ] validator ownership path is explicit
- [ ] validator result space stays deterministic
- [ ] the entry can be matched from `ModuleNeed` without making hints the main authority

## Current Direction

Rune Weaver should continue admitting patterns under these rules:

- semantic contract first
- host binding attached, not substituted
- family-driven realization for the normal path
- `explicitPatternHints` as tie-break only
- exception-only overrides
- `FillSlot` as bounded completion only
- no gap-fill takeover of architecture or host authority

This is the minimum baseline needed to keep the pattern system scalable, reviewable, and agent-usable.

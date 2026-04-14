# HostBinding And RealizationFamily Proposal

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: temporary
> Last verified: 2026-04-14
> Read when: reviewing family-driven host realization and `HostBinding` policy inputs during architecture planning
> Do not use for: treating proposed family taxonomy as shipped baseline host policy
> Owner: Lane C

## Purpose

This proposal defines how Host Realization can stay deterministic while scaling beyond per-pattern branching.

Its key claim is:

- `PatternContract` chooses semantic meaning
- `HostBinding` describes host admissibility
- `HostRealization` chooses a `RealizationFamily` by deterministic policy
- generator routing consumes that family decision

This keeps host realization family-driven instead of per-pattern-driven in the common path.

## Accepted In Baseline

The following direction is now baseline-aligned:

- `HostBinding` is host-facing rather than semantic
- `RealizationFamily` is policy vocabulary for common-path host realization
- `HostBinding overridePolicy` is exception-only
- precedence is `host policy -> HostBinding constraints -> ModuleNeed compatibility -> family -> routed outputs -> fill`

For accepted wording, prefer:

- [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
- [PATTERN-MODEL.md](/D:/Rune%20Weaver/docs/PATTERN-MODEL.md)

This document should now be read mainly for residual proposal details and migration notes.

## Frozen Premises Preserved

This proposal preserves:

1. final executable `Blueprint` remains deterministic
2. LLM does not decide final host or write path
3. `HostRealization` remains policy-driven
4. pattern semantics and host semantics stay separate
5. Gap Fill remains bounded completion

## Why Family-Driven Realization Is Required

The current implementation already shows the scale problem:

- realization rules list specific pattern ids
- generator routing still contains pattern-specific switches
- rationale is often authored per pattern instead of derived from reusable families

At small scale this is acceptable.
At 100+ patterns it leads to:

- realization policy duplication
- routing inconsistency between layers
- repeated review of the same host allocation decision
- difficulty proving that host behavior is still deterministic

The answer is not to make the host realizer more freeform.
The answer is to make the policy surface more reusable.

## Decision Summary

1. Host Realization should operate primarily on `RealizationFamily`.
2. `HostBinding` should declare allowed and preferred family choices per host.
3. Most realization decisions should be derived from module needs, pattern traits, and binding admissibility.
4. Generator routing should route by family output requirements, not by raw pattern id.
5. Per-pattern overrides remain exceptional and explicit.

## Proposed Family Taxonomy

Residual boundary:

- do not expand taxonomy here during this planning pass
- the remaining planning value is about migration and review behavior, not new family growth

The exact final naming remains merge-owned by the main controller, but Lane C proposes the following canonical planning set:

| Family | Meaning | Typical outputs |
| --- | --- | --- |
| `static-config` | host-native static configuration with no primary custom runtime ownership | KV |
| `runtime-primary` | primary host runtime logic chosen later by policy/routing | TS or Lua |
| `runtime-shared` | shared runtime model or logic reused across surfaces | shared TS |
| `ui-surface` | explicit user-facing surface and presentation flow | TSX + LESS |
| `modifier-runtime` | runtime lifecycle centered on modifier/buff semantics | Lua or TS plus static shell when needed |
| `bridge-support` | bridge registration / integration without standalone feature runtime | bridge step |
| `composite-static-runtime` | one semantic unit that deterministically splits into static shell + runtime behavior | KV + TS or KV + Lua |

This taxonomy is intentionally small.
If a new family is proposed, the burden of proof should be:

- it captures a recurring host realization class
- it reduces branching across multiple patterns
- it is not just a renamed one-off pattern override

Rules:

- do not use `runtime-ts` or `runtime-lua` as family names
- do not use `runtime-server` as a competing family name in planning docs
- TS / Lua / KV are downstream routing/output concerns, not family identity

## HostBinding Contract

For a given host, `HostBinding` should declare:

```ts
interface HostBindingVNext {
  patternId: string;
  hostKind: string;
  allowedFamilies: RealizationFamilyId[];
  preferredFamily?: RealizationFamilyId;
  requiredHostCapabilities?: string[];
  familyConstraints?: FamilyConstraint[];
  generatorRoutes?: GeneratorRouteHint[];
  blockerRules?: HostBlockerRule[];
  overridePolicy?: PatternOverridePolicy;
}
```

Important boundary:

- `allowedFamilies` is host admissibility
- `preferredFamily` is a binding recommendation
- final family selection remains a Host Realization policy decision

This allows host policy to remain deterministic and reviewable.

## Deterministic Family Selection

Host Realization should choose family using explicit policy inputs:

1. host policy
2. `HostBinding` constraints and blockers
3. canonical `ModuleNeed` compatibility
4. pattern traits and semantic compatibility
5. allowed/preferred families from `HostBinding`

It should not rely on:

- freeform LLM planning
- unconstrained repository search
- generator-specific guesswork

Precedence rule for this planning wave:

`host policy -> HostBinding constraints -> ModuleNeed compatibility -> family -> routed outputs -> fill`

Additional rule:

- `explicitPatternHints` are not part of family authority
- they may participate only after capability / invariants / outputs / state / family evaluation has produced a tie set
- if removing `explicitPatternHints` changes the selected family before that tie state exists, the routing design has regressed toward raw pattern-id control

### Example Decision Shape

```ts
interface FamilyDecisionInput {
  moduleNeed: ModuleNeed;
  selectedPatternIds: string[];
  selectedContracts: PatternContractVNext[];
  hostBindings: HostBindingVNext[];
  hostPolicy: HostRealizationPolicy;
}
```

The output should stay inspectable:

```ts
interface FamilyDecision {
  moduleId: string;
  selectedFamily: RealizationFamilyId;
  routedOutputs: RoutedOutput[];
  rationale: string[];
  blockers?: string[];
  usedOverride?: boolean;
}
```

## Family-Driven Routing Rules

The recommended common-path routing is:

| Family | Primary routing consequence |
| --- | --- |
| `static-config` | route to static config generator family |
| `runtime-primary` | route to the primary runtime generator family chosen by host policy |
| `runtime-shared` | route to shared runtime generator family |
| `ui-surface` | route to UI generator family |
| `modifier-runtime` | route to modifier-capable runtime family plus required shell output if policy says so |
| `bridge-support` | route to bridge integration step |
| `composite-static-runtime` | split routed outputs deterministically into static and runtime components |

This means generator routing remains thin.
It consumes family outputs; it does not reinterpret module semantics.

## What Should Still Allow Per-Pattern Override

Per-pattern override is still warranted for narrow cases.

Allowed cases:

1. engine-specific quirks that cannot be generalized yet
2. a transitional path already validated in production-like cases
3. a pattern whose host restrictions are materially narrower than the rest of its family
4. an exceptional multi-output combination not yet shared by other patterns

Disallowed cases:

1. routine runtime vs static choice
2. ordinary UI classification
3. normal shared-runtime routing
4. semantic distinctions that belong in capability vocabulary

Override guardrails:

- every override must be attached to `HostBinding overridePolicy`, not free-floating resolver logic
- every override must record `reason`, `owner`, and `sunsetCondition`
- overrides may narrow, block, or pin an otherwise-admissible family only for documented exception cases
- overrides may not become a substitute for capability fit or family policy
- override policy is an exception path only
- if an override survives past its sunset condition, treat that as a missing reusable family/policy and escalate to main controller review

Residual focus:

- the remaining open work is not whether override is exception-only
- it is how exception review and sunset enforcement become a baseline mechanism

## Blueprint Lane Requirements

To let family selection stay deterministic, Blueprint lane should provide at least:

- semantic role for each module
- required capabilities
- optional capabilities
- expected outputs or surfaces
- state expectations
- explicit prohibitions when a module must avoid a trait or family

Lane C does **not** need Lane B to decide final host family.
Lane C only needs Blueprint to say enough about the module so Host Realization can make that decision under policy.

The canonical planning seam for that input is:

- [MODULE-NEED-SEAM-PROPOSAL.md](/D:/Rune%20Weaver/docs/MODULE-NEED-SEAM-PROPOSAL.md)

Lane C should consume that seam as-is and should not restate a competing field vocabulary here.

## Migration Path

### Stage 1

- attach provisional family hints to existing Dota2 host bindings
- keep current realization enum for compatibility
- document where current per-pattern rules are transitional

### Stage 2

- derive realization decisions from family-first policy
- keep raw pattern-id overrides only for explicitly marked exceptions

### Stage 3

- convert generator switches from pattern-first to family-first where practical
- reserve pattern-specific generator branches for pattern-local content details, not top-level routing

### Stage 4

- formalize routed output shape so composite family outputs do not need enum explosion

## Residual Items

The main residual items in this proposal are:

1. how override sunset review becomes a baseline review mechanism
2. how routed-output formalization should be reflected in future controller-owned spec work
3. which `HostBinding` fields should become admission-required in the next `PATTERN-SPEC` merge

## Minimal `HostBinding` Admission Input

For the future controller-owned `PATTERN-SPEC` merge, Lane C recommends that a minimally admissible `HostBinding` must provide at least:

1. host identity
   - host kind / host target scope or equivalent host-facing identifier
2. admissible family surface
   - allowed families, or an equivalent declaration of what realization families are legal
3. host restrictions / requirements
   - reviewable host constraints, required capabilities, or blockers
4. deterministic relationship to routing
   - enough information for policy-driven family selection without turning binding into semantic authority
5. exception metadata when override is present
   - `overridePolicy` remains exception-only and must carry `reason`, `owner`, and `sunsetCondition`

Residual note:

- this is not baseline truth yet
- it is the minimum Lane C admission input recommended for the next `PATTERN-SPEC` merge

## Non-Goals Preserved

This proposal does not:

- transfer realization authority to LLM
- define final generator APIs
- change blueprint readiness semantics
- require reopening authoritative lifecycle scope
- require all families to be host-agnostic immediately

## Recommendations For Main Controller Merge

Merge this proposal if:

1. family vocabulary is small, explicit, and reusable
2. `HostBinding` remains host-facing and does not absorb pattern semantics
3. per-pattern overrides are recorded as exception policy, not default routing
4. generator routing remains downstream of Host Realization

Do not merge a version that:

- keeps most normal routing as raw pattern-id branching
- lets generators re-decide families
- lets fill slot content influence final family selection

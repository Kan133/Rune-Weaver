# PatternContract vNext Proposal

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: temporary
> Last verified: 2026-04-14
> Read when: reviewing the proposed semantic `PatternContract` / `HostBinding` split during architecture planning
> Do not use for: overriding current pattern, host realization, or generator baseline docs by itself
> Owner: Lane C

## Purpose

This proposal makes the pattern update plan concrete enough to review and merge later without reopening the frozen architecture premises.

It proposes a `PatternContract vNext` model that:

- scales beyond raw pattern-id routing
- keeps pattern semantics separate from host semantics
- gives Host Realization deterministic inputs
- keeps Gap Fill inside typed bounded completion
- consumes the canonical `ModuleNeed` seam required from Lane B

This proposal does **not** change authoritative baseline docs by itself.

## Accepted In Baseline

The following direction is no longer proposal-only wording:

- `PatternContract` is the semantic pattern unit
- `HostBinding` is the host-facing admissibility layer
- `ModuleNeed` is the only canonical module-level seam
- `explicitPatternHints` is tie-break only
- `ModuleNeed.boundedVariability -> FillSlot` is one-way downstream mapping

For accepted wording, prefer:

- [PATTERN-MODEL.md](/D:/Rune%20Weaver/docs/PATTERN-MODEL.md)
- [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
- [MODULE-NEED-SEAM-PROPOSAL.md](/D:/Rune%20Weaver/docs/MODULE-NEED-SEAM-PROPOSAL.md)

This document should now be read primarily as a residual proposal and migration note.

## Frozen Premises Preserved

This proposal assumes and preserves:

1. final executable `Blueprint` remains deterministic
2. LLM may assist proposal, but may not decide final host or write path
3. `HostRealization` remains policy-driven
4. `Pattern` continues evolving toward semantic contract plus host binding
5. `Gap Fill` does not become architecture owner
6. current authoritative lifecycle scope is not reopened here

## Why The Current Pattern Form Degrades At 100+ Patterns

The current Dota2 implementation still uses raw pattern ids as a major routing primitive across three layers:

- pattern metadata registration
- host realization rules
- generator branching

That works for an early catalog, but it scales poorly because each new pattern tends to create at least one new branch in more than one layer.

At 100+ patterns this gets worse in predictable ways:

1. authoring cost grows faster than catalog size because "add one pattern" becomes "edit several routing surfaces"
2. host assumptions leak into pattern identity because pattern entries keep carrying output and target concerns
3. realization drift appears because per-pattern overrides become the easiest escape hatch
4. generator families stop looking like families and start behaving like a second pattern resolver
5. reviewability drops because behavior is distributed across many switch points instead of a small number of typed contracts

The scale problem is therefore not "too many patterns" by itself.
The problem is "too many places where raw pattern ids are treated as architecture keys."

## Decision Summary

This proposal makes six decisions.

1. `PatternContract` becomes the authoritative semantic unit for resolver-facing pattern meaning.
2. `HostBinding` becomes the authoritative host-facing attachment for how a semantic pattern may be realized on a given host.
3. Resolver matching should prefer `ModuleNeed -> capability / trait / invariant` matching, with raw pattern-id hints as a secondary tie-breaker only.
4. Host Realization should route primarily through `RealizationFamily`, not custom per-pattern rules.
5. `FillSlot` should represent typed bounded variability only.
6. Per-pattern overrides remain allowed, but only for exceptional host or safety cases.

## PatternContract Boundary

`PatternContract` answers semantic questions:

- what mechanic or structural behavior this pattern represents
- what the pattern requires
- what the pattern produces
- what invariants it promises
- what companions, exclusions, and ordering constraints apply
- where bounded variability is allowed

`PatternContract` does **not** answer:

- final host output path
- final generator family
- final file location
- host-native API names as authoritative identity
- freeform completion strategy

## HostBinding Boundary

`HostBinding` answers host-facing questions:

- which host kinds support this pattern
- which realization families are admissible on that host
- which host capabilities or policies are required
- which routing targets or generator families are valid
- which host restrictions, blockers, or override rules apply

`HostBinding` does **not** redefine:

- what the pattern means
- what problem the pattern solves
- the module's semantic role
- blueprint readiness or lifecycle semantics

## Proposed Contract Shape

The exact baseline schema is intentionally left to the main controller, but the contract content should look roughly like this:

```ts
interface PatternContractVNext {
  id: string;
  semanticCategory: string;
  summary: string;
  capabilities: string[];
  traits: string[];
  requiredInputs: PatternInputContract[];
  producedOutputs: PatternOutputContract[];
  stateAffordances?: string[];
  invariants: string[];
  nonGoals: string[];
  dependencies?: PatternDependencyRule[];
  composition?: PatternCompositionRule[];
  fillSlots?: FillSlotContract[];
  resolverHints?: ResolverHint[];
}

interface HostBindingVNext {
  patternId: string;
  hostKind: string;
  allowedFamilies: RealizationFamilyId[];
  preferredFamily?: RealizationFamilyId;
  requiredHostCapabilities?: string[];
  routingHints?: RoutingHint[];
  hostRestrictions?: string[];
  overridePolicy?: PatternOverridePolicy;
}
```

The important point is not the exact field names.
The important point is the split of responsibility.

## Capability And Trait Model

Residual focus:

- capability vocabulary governance is not fully baselined yet
- exact admission-time enforcement for capability naming still belongs to later controller-owned spec work

Patterns need two kinds of query vocabulary.

### Capability

A capability expresses what a pattern can satisfy for a module.

Examples:

- `candidate_source.weighted`
- `choice_flow.player_confirmed`
- `effect.apply_modifier`
- `effect.displacement.directional`
- `ui.surface.selection_modal`
- `resource.pool.numeric`

Capabilities should be stable enough for resolver matching and concrete enough to differentiate patterns inside one broad category.

Capability naming rule:

- use `domain.verb.qualifier`
- raw pattern ids must not be reused as capability names

### Trait

A trait expresses a property that affects composition or realization, but is not the primary mechanic identity.

Examples:

- `requires_runtime`
- `supports_static_config`
- `stateful.session`
- `ui_surface`
- `shared_runtime_candidate`
- `choice_orchestration`
- `modifier_lifecycle`
- `deterministic_parameterization`

Traits should help Host Realization and validation, but they should not replace capabilities as the main semantic lookup surface.

## Blueprint Seam Required From Lane B

Lane C does **not** require Lane B to redesign intent-schema core fields.

Lane C does require a stable `ModuleNeed` surface from Blueprint.

For this planning wave, the canonical seam is:

- [MODULE-NEED-SEAM-PROPOSAL.md](/D:/Rune%20Weaver/docs/MODULE-NEED-SEAM-PROPOSAL.md)

Lane C needs that seam so the resolver can upgrade from:

- broad category matching

to:

- needs + capability + invariant matching

The required seam is therefore "module need clarity," not "intent-schema core field expansion."

Lane C consumer rule:

- this proposal consumes the canonical `ModuleNeed` seam only
- this proposal must not define a second `ModuleNeed`, `BlueprintModuleNeed`, or equivalent competing vocabulary
- if Pattern resolution needs more information than the canonical seam provides, Lane C should record a missing-field request to Lane B rather than inventing a parallel seam

Canonical `ModuleNeed` consumption in Lane C should be:

- `requiredCapabilities`
  - primary semantic fit gate
- `optionalCapabilities`
  - secondary scoring input
- `requiredOutputs`
  - downstream fit and family-shaping input
- `stateExpectations`
  - composition and realization constraint input
- `invariants`
  - hard compatibility gate
- `boundedVariability`
  - upstream declaration that may later map to declared `FillSlot`s
- `explicitPatternHints`
  - may participate only after capability / invariants / outputs / state / family evaluation has produced a tie set
- `prohibitedTraits`
  - hard exclusion input

## Composition Rules

`PatternContract` should make composition reviewable.

It should be able to declare:

- required companions
- optional companions
- prohibited pairings
- ordering constraints
- shared state expectations
- ownership of fillable slots

Examples:

- `rule.selection_flow` may require a candidate-source capability and may optionally pair with a UI display capability
- `ui.selection_modal` may require payload fields but should not own the selection-state commit policy
- `effect.modifier_applier` may require a modifier-lifecycle family on the host side, but the semantic effect remains "apply modifier"

## Per-Pattern Override Policy

Per-pattern override is still allowed, but only when family routing is not sufficient.

Allowed override cases:

1. host engine quirk that cannot be expressed as a reusable family rule
2. transitional compatibility while migrating an existing shipped path
3. safety-critical restriction where one pattern must be denied an otherwise normal family
4. a multi-output shape that is still exceptional and not yet reusable

Override should **not** be the default tool for:

- routine generator selection
- normal runtime vs static allocation
- UI vs non-UI classification
- module-level semantics that belong in capabilities or traits

Every override should carry:

- `reason`
- `owner`
- `sunsetCondition`

If an override no longer has a credible sunset path, it should be treated as a missing reusable policy/family rather than normal steady-state design.

Residual focus:

- the existence of exception-only `overridePolicy` is baseline-aligned
- the remaining proposal work is how sunset review becomes a baseline review mechanism instead of a planning rule

## Migration Path

### Phase 1: Annotate Current Catalog

- add `traits` to current pattern metadata
- normalize existing capability names
- attach provisional `preferredFamily` and `allowedFamilies` to host bindings
- define fill slots only for new and actively changing patterns first

### Phase 2: Split Semantic Contract From Host Binding

- keep existing runtime structures compatible
- move host-specific target/output assumptions out of semantic pattern metadata
- treat Dota2-specific targets as binding data, not pattern identity

### Phase 3: Upgrade Resolver Inputs

- accept `module need` style inputs from Blueprint
- treat raw pattern-id hinting as advisory only; it may participate only after capability / invariants / outputs / state / family evaluation has produced a tie set
- resolve by capability fit, invariant fit, and exclusion rules

### Phase 4: Move Host Realization To Family-First Routing

- family routing becomes the common path
- per-pattern overrides become explicit exception blocks
- generator routing consumes family decisions without re-deciding semantics

### Phase 5: Tighten FillSlot Validation

- gap fill can only fill declared slots
- slot validation becomes a gate before generator/write stages
- undeclared architecture decisions become hard failures or review blockers

## Residual Items

The main residual items in this proposal are:

1. capability vocabulary governance beyond the accepted baseline direction
2. whether `resolverHints` should survive as a field once `PATTERN-SPEC` is updated
3. how override sunset review is formalized as a baseline mechanism
4. which `PatternContract` fields become admission-required in the next `PATTERN-SPEC` merge

## Minimal `PatternContract` Admission Input

For the future controller-owned `PATTERN-SPEC` merge, Lane C recommends that a minimally admissible `PatternContract` must provide at least:

1. semantic identity
   - stable `id` plus human-reviewable summary/category or equivalent
2. semantic boundary
   - responsibilities and non-goals or equivalent boundary statement
3. capability surface
   - declared capabilities, with traits when realization/composition constraints matter
4. usage contract
   - inputs / outputs / parameters or equivalent contract surface
5. validation surface
   - invariants, constraints, or equivalent reviewable validation conditions
6. host-attachment path
   - at least one reviewable path to a corresponding `HostBinding`

Residual note:

- this is not baseline truth yet
- it is the minimum Lane C admission input recommended for the next `PATTERN-SPEC` merge

## Non-Goals Preserved

This proposal does not:

- redefine intent-schema core fields
- redefine blueprint readiness semantics
- give LLM final host or write authority
- reopen lifecycle scope
- make Gap Fill the owner of module structure
- change baseline truth documents directly

## Recommendations For Main Controller Merge

The main controller should merge this proposal only if the combined Lane B + Lane C result preserves three seams:

1. `Blueprint` exposes a stable module-need surface without reopening intent-schema core semantics.
2. `PatternContract` remains semantic-first and does not absorb host routing truth.
3. `HostBinding` and `RealizationFamily` remain deterministic policy inputs, not LLM-selected outcomes.

If merge pressure forces a smaller first step, the recommended minimum merge unit is:

1. freeze the `PatternContract` vs `HostBinding` boundary
2. freeze a first-pass capability vocabulary
3. require family-first realization for normal cases
4. require typed fill slots for any new nontrivial pattern

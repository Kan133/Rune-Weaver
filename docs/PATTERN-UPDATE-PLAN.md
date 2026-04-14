# Pattern Update Plan

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: temporary
> Last verified: 2026-04-14
> Read when: refining Pattern / HostBinding / FillSlot planning and scale strategy
> Do not use for: overriding current implementation by itself

## 1. Goal

This plan focuses on three architecture questions:

1. Is the current pattern form realistic as the catalog grows toward 100+ patterns?
2. Does host realization need a manual allocation rule for every pattern?
3. How should `blueprint + pattern + gap fill` be split so the system stays generic but controlled?

The short answer is:

1. the current pattern system is workable for early mainline, but it will not scale cleanly if raw pattern IDs remain the main routing primitive
2. host realization should not require manual per-pattern assignment in the common case
3. `pattern` should become a semantic contract unit, and `gap fill` should become bounded typed completion, not architecture glue

## 1.1 Baseline vs Residual

After the latest controller-owned baseline updates:

- accepted cross-cutting wording now lives in [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
- accepted pattern-side wording now lives in [PATTERN-MODEL.md](/D:/Rune%20Weaver/docs/PATTERN-MODEL.md)
- canonical seam wording now lives in [MODULE-NEED-SEAM-PROPOSAL.md](/D:/Rune%20Weaver/docs/MODULE-NEED-SEAM-PROPOSAL.md) until later baseline merge

This planning doc should now be read primarily as:

- residual planning inventory
- migration framing
- controller-facing checklist for what is not yet baselined

It should not be read as a second source of truth for wording already accepted in baseline docs.

---

## 2. Current Strengths

The current system already has real advantages:

- there is an explicit pattern catalog
- pattern responsibilities, constraints, and host metadata already exist
- the pipeline is deterministic enough to debug
- realization and generator routing are explicit and inspectable

This is a good foundation.
The issue is not that the pattern layer is wrong.
The issue is that its current form still mixes together too many concerns.

---

## 3. Current Problems

### 3.1 Raw pattern ID branching is spreading across layers

Right now, adding a pattern often means touching multiple places:

- pattern metadata
- realization rules
- generator switch logic
- sometimes additional policy and docs

That is acceptable for a small catalog.
It becomes expensive and fragile at 100+ patterns.

### 3.2 Host semantics are leaking into pattern identity

Some current pattern metadata already mixes semantic meaning with host/output assumptions.
That makes it harder to answer a simple question cleanly:

"Is this pattern a reusable semantic building block, or is it already a Dota2 code-emission package?"

If that boundary stays blurry, pattern growth will keep coupling semantics to host implementation.

### 3.3 Pattern selection is still too category-driven

A lot of the current routing logic still depends on broad labels such as:

- trigger
- data
- rule
- effect
- ui

Those labels are useful, but they are too coarse to drive long-term pattern resolution on their own.

### 3.4 Gap fill can become a dumping ground

If pattern contracts are weak, the system starts relying on gap fill to carry architecture weight:

- missing parameters
- missing flow semantics
- missing integration details
- missing code structure

That creates a hidden problem:

- the formal pipeline looks controlled
- the real behavior has been pushed into a late freeform step

### 3.5 Composition rules are under-modeled

The current pattern form does not yet strongly describe:

- what can compose with what
- what conflicts with what
- what must exist together
- what should remain host-agnostic vs host-bound

Without that, the pattern layer is still closer to a catalog of options than a compositional system.

---

## 4. Core Position

### 4.1 Pattern should be the semantic building block

The pattern layer should represent reusable behavioral contracts such as:

- trigger capture
- weighted candidate sourcing
- selection confirmation flow
- dash execution
- modifier application
- short buff lifecycle

That means a pattern should say:

- what it means
- what it requires
- what it produces
- what invariants it promises
- where it is variable

It should not primarily be:

- a generator switch case
- a direct file template name
- a host-specific hard-coded route decision

### 4.2 Host realization should be family-driven, not per-pattern-driven

If the catalog grows to 100+ patterns, the system should not require a custom host realization rule for each one.

The scalable design is:

- most patterns declare realization traits or admissibility
- host realization maps those traits to realization families
- only exceptional patterns need explicit overrides

So the answer to "Will host realization need manual assignment for every pattern?" is no, not if the model is upgraded properly.

### 4.3 Gap fill should be bounded completion, not hidden business logic ownership

The right role for gap fill is:

- fill typed code slots
- fill literal expressions
- fill small behavior fragments inside declared boundaries

The wrong role for gap fill is:

- invent architecture
- invent missing module boundaries
- invent host routing
- invent hidden state model

If gap fill carries those responsibilities, the system becomes hard to reason about and hard to validate.

---

## 5. Recommended Pattern Model

Baseline note:

- the accepted `PatternContract` / `HostBinding` / `RealizationFamily` / `FillSlot` boundary now lives in baseline docs
- this section remains only to frame residual planning work and migration implications

### 5.1 Split semantic contract from host binding

Pattern should be represented in at least two layers.
This planning doc now treats those layers as named proposal units:

- `PatternContract`
- `HostBinding`

See:

- [PATTERN-CONTRACT-VNEXT-PROPOSAL.md](/D:/Rune%20Weaver/docs/PATTERN-CONTRACT-VNEXT-PROPOSAL.md)
- [REALIZATION-FAMILY-PROPOSAL.md](/D:/Rune%20Weaver/docs/REALIZATION-FAMILY-PROPOSAL.md)
- [FILL-SLOT-CONTRACT-PROPOSAL.md](/D:/Rune%20Weaver/docs/FILL-SLOT-CONTRACT-PROPOSAL.md)

The purpose of naming these units here is not to declare baseline truth yet.
It is to make the target contract reviewable enough for a later merge wave.

#### Pattern Contract

Host-agnostic semantic meaning:

- `id`
- `semanticCategory`
- `capabilities`
- `requiredInputs`
- `producedOutputs`
- `stateAffordances`
- `invariants`
- `nonGoals`
- `compositionRules`
- `fillSlots`

#### Host Binding

Host-specific realization facts:

- supported hosts
- admissible realization families
- generator family hints
- host restrictions
- bridge requirements

This avoids treating Dota2-specific output routing as the same thing as the reusable semantic contract.

### 5.1.1 Concrete boundary

The intended responsibility split is:

- `PatternContract`
  - mechanic identity
  - capabilities
  - traits
  - required inputs / produced outputs
  - invariants
  - composition rules
  - declared fill slots
- `HostBinding`
  - supported host kinds
  - allowed realization families
  - preferred realization family
  - host restrictions
  - routing hints
  - explicit override policy

The following should **not** remain mixed into one undifferentiated pattern entry at scale:

- semantic meaning
- host target
- output file bias
- generator routing assumptions
- bounded variability contract

### 5.2 Add capability and trait vocabulary

Patterns should be queryable by more than raw IDs.
Add traits such as:

- `requires_runtime`
- `supports_static_config`
- `ui_surface`
- `stateful`
- `session_scoped`
- `choice_orchestration`
- `resource_consumer`
- `modifier_lifecycle`
- `shared_model_candidate`

Then blueprint modules can express needs like:

- "needs weighted candidate sourcing"
- "needs player-confirmed choice flow"
- "needs runtime effect application"

The resolver can then map needs to candidate patterns using traits and capabilities, not only manual ID preference.

### 5.2.1 Capability naming rule

Use:

- `domain.verb.qualifier`

Examples:

- `candidate_source.weighted`
- `choice_flow.player_confirmed`
- `effect.apply_modifier`
- `ui.surface.selection_modal`

Rule:

- capability names should describe semantic fit
- trait names should describe realization/composition properties
- raw pattern ids must not become the naming scheme for capabilities

### 5.2.2 Capability vs trait

To keep the vocabulary disciplined:

- `capability` should answer "what semantic need can this pattern satisfy?"
- `trait` should answer "what property of this pattern matters for composition or realization?"

Examples:

- capability
  - `candidate_source.weighted`
  - `choice_flow.player_confirmed`
  - `effect.apply_modifier`
  - `ui.surface.selection_modal`
- trait
  - `requires_runtime`
  - `supports_static_config`
  - `stateful.session`
  - `ui_surface`

This distinction matters because the resolver should match primarily on semantic need, not on host-facing side effects.

### 5.3 Make variability explicit with fill slots

Every pattern should clearly state where variability is expected.

Examples:

- numeric parameters
- branch conditions
- emitted copy / labels
- effect payload formulas
- event names
- minor lifecycle hooks

This should be modeled as typed `fillSlots`, not as an unbounded instruction like "finish the rest with AI."

### 5.3.1 FillSlot role

`FillSlot` should only cover typed bounded variability inside an already selected pattern and an already determined realization path.

It should **not** decide:

- whether a module exists
- which pattern is selected
- which realization family is selected
- which generator family is selected
- which host write target is used

If the system needs fill to decide those things, then the architecture is underspecified earlier in the chain.

### 5.4 Add composition and exclusion rules

Patterns should be able to declare:

- required companions
- optional companions
- forbidden pairings
- preferred ordering
- shared-state expectations

This makes the catalog more compositional and reduces illegal assemblies.

---

## 6. Host Realization At Scale

### 6.1 Target model

Baseline note:

- the existence and role of `RealizationFamily` is already baseline
- the specific migration and implementation implications below remain planning material

Host realization should operate on realization families such as:

- `static-config`
- `runtime-primary`
- `ui-surface`
- `runtime-shared`
- `modifier-runtime`
- `bridge-support`
- `composite-static-runtime`

Patterns can declare:

- preferred realization families
- allowed realization families
- disallowed realization families

The host realizer then maps family to host-specific outputs.

### 6.1.1 Canonical family set for this planning wave

For this planning wave, there should be one canonical `RealizationFamily` set only:

- `static-config`
- `runtime-primary`
- `runtime-shared`
- `ui-surface`
- `modifier-runtime`
- `bridge-support`
- `composite-static-runtime`

Rules:

- do not use `runtime-ts` or `runtime-lua` as family names
- TS / Lua / KV belong to generator routing or routed outputs, not the family layer
- [REALIZATION-FAMILY-PROPOSAL.md](/D:/Rune%20Weaver/docs/REALIZATION-FAMILY-PROPOSAL.md) is the canonical planning reference for this set

### 6.2 What this changes in practice

With this model, adding a normal new pattern should usually require:

1. adding or updating the semantic pattern contract
2. attaching host binding metadata

It should not usually require:

- a new host realization algorithm branch
- a new generator root switch case everywhere
- a new pattern-id classifier in every downstream layer

Only true exceptions should need custom overrides.

### 6.3 Why this matters

This is the architectural answer to pattern scale.
Without it, every new pattern keeps increasing cross-layer branching cost.
With it, most new patterns become data additions, not pipeline rewrites.

### 6.4 Deterministic resolver order

Baseline note:

- the accepted cross-cutting precedence is now baseline-facing and should not be redefined here
- this section remains to explain residual migration checks and anti-regression review logic

Resolver upgrade should use this order:

1. filter out patterns that do not satisfy `requiredCapabilities`
2. filter out patterns that violate `prohibitedTraits`, host blockers, or invariants
3. score remaining candidates by `requiredOutputs` and `stateExpectations`
4. apply `explicitPatternHints` only after capability / invariants / outputs / state / family evaluation has produced a tie set
5. prefer candidates whose `HostBinding` declares the desired `preferredFamily`
6. use stable tie-break, defaulting to deterministic ordering such as fixed priority or pattern id

This keeps the common path deterministic and reviewable.

Hard rule:

- `explicitPatternHints` may participate only after capability / invariants / outputs / state / family evaluation has produced a tie set
- if removing `explicitPatternHints` changes the winning candidate before that tie set exists, the resolver design has drifted back toward raw pattern-id routing and should be treated as invalid

---

## 7. Blueprint, Pattern, Gap Fill: Recommended Split

Use this mental model:

- `IntentSchema`: what the user really wants
- `Blueprint`: how the feature is structurally decomposed
- `Pattern`: what reusable semantic building blocks satisfy those structural needs
- `Host Realization`: how those building blocks materialize on the host
- `Gap Fill`: how bounded open slots get completed

This is the key correction:

- `Pattern` is not just "积木"
- it is "带约束的积木合同"

- `Blueprint` is not just "怎么拼"
- it is "经过校验的结构分解"

- `Gap Fill` is not the architecture glue
- it is bounded filler for declared variability zones

If this split is respected, generalization increases without giving up control.

### 7.1 Lane B seam required by Lane C

Lane C does not need Lane B to reopen intent-schema core fields.

Lane C does need Blueprint to expose a stable `ModuleNeed` surface.

The canonical planning seam is:

- [MODULE-NEED-SEAM-PROPOSAL.md](/D:/Rune%20Weaver/docs/MODULE-NEED-SEAM-PROPOSAL.md)

This is the minimal seam needed for resolver upgrade.
It is not a request to move host realization authority into Blueprint.

Lane C consumer rule:

- Lane C docs should reference or consume the canonical `ModuleNeed` fields only
- Lane C docs should not define a second competing `ModuleNeed` or `BlueprintModuleNeed` shape
- if Lane C needs more information, it should record a missing-field request to Lane B rather than inventing a parallel seam

Baseline note:

- `ModuleNeed` is the only canonical seam
- this section remains only as a consumer-boundary reminder, not as competing seam wording

---

## 8. Recommended Migration Path

### Phase 1: Improve metadata without breaking current pipeline

- add traits/capabilities to current pattern metadata
- add realization family hints
- add explicit fill slot declarations for new patterns first
- mark known per-pattern host-realization branches as transitional exception paths

### Phase 2: Separate contracts from bindings

- split host-agnostic pattern contract from Dota2 binding details
- keep compatibility adapters so current resolver still works
- remove the need for hostTarget/outputTypes to carry semantic meaning

### Phase 3: Upgrade resolution logic

- allow blueprint modules to resolve by needs/capabilities
- keep pattern ID hints as one input, not the only input
- make composition rules and exclusions reviewable

### Phase 4: Upgrade host realization

- route by realization family and traits
- keep per-pattern overrides only for exceptions
- keep generator routing thin and downstream of host realization

### Phase 5: Tighten gap fill

- move freeform gap fill toward typed slot fill
- validate filled output against slot contracts and invariants
- reject or escalate undeclared architecture holes rather than silently filling them

## 8.1 Residual Items For Future Baseline Work

The main residual Lane C items are now:

1. capability vocabulary governance beyond the baseline directional wording
2. override sunset review moving from planning rule into a baseline mechanism
3. `FillSlot` validator ownership and review gating implementation details
4. `PATTERN-SPEC` admission rules that should be updated to reflect accepted baseline boundaries

## 8.2 Minimal Admission Inputs For Future `PATTERN-SPEC` Merge

Lane C's recommended minimum inputs to the future controller-owned `PATTERN-SPEC` merge are:

1. `PatternContract` minimum admission rule
   - must declare semantic identity, responsibilities/non-goals, capability surface, contract inputs/outputs or equivalent, invariants or equivalent validation conditions, and at least one host-facing binding reference
2. `HostBinding` minimum admission rule
   - must declare host kind, admissible family surface, host restrictions/requirements, and exception-only override metadata when override is present
3. `FillSlot` minimum admission rule when `ModuleNeed.boundedVariability` is present
   - if bounded variability is expected downstream, the admitted pattern/binding surface must declare corresponding `FillSlot` ownership or explicitly record that no fill is allowed
4. `overridePolicy` review rule
   - every override must carry `reason`, `owner`, and `sunsetCondition`, and must be reviewed as exception policy rather than normal routing
5. validator ownership / gating rule
   - `FillSlot` validation must have explicit ownership and only return deterministic outcomes such as `accept`, `reject`, `escalate`, or declared default handling

---

## 9. Short-Term Changes Worth Doing First

If the team wants the highest-value improvements without a full rewrite, do these first:

1. add capability and realization-family fields to pattern metadata
2. stop introducing new cross-layer raw pattern-ID branching where avoidable
3. define typed fill slots for new patterns
4. update resolver logic so blueprint modules can express needs, not only categories
5. keep host realization deterministic, but driven more by traits than by explicit ID tables

### 9.1 Current Dota2-specific scale warning

The present Dota2 path already shows the branching pressure this plan is trying to reduce:

- pattern metadata entries carry host-facing fields
- host realization rules still enumerate pattern ids directly
- generator logic still switches on raw pattern ids in several places

That does not mean the current architecture is wrong.
It means the next iteration should convert the common path from:

- `pattern id -> branch`

to:

- `module need -> capability fit -> host family -> routed outputs`

These changes already improve scale without forcing an immediate full pattern system migration.

### 9.2 Override lifecycle rule

Per-pattern override remains allowed, but every override should carry:

- `reason`
- `owner`
- `sunsetCondition`

Rule:

- if an override persists without a sunset path, treat it as a candidate family/policy gap
- overrides are exception paths, not the normal authoring model
- override policy may narrow or block family selection, but may not replace capability fit as the resolver's main path
- override policy may not be used to restore "pattern id -> realization family" as the steady-state control plane

### 9.3 Engineering target for adding a normal new pattern

The target common path is:

- `PatternContract -> HostBinding -> RealizationFamily -> GeneratorRouting`

Adding a normal new pattern should not require touching all of:

- root pattern metadata
- root host realization switch
- root generator switch

If a new pattern still requires edits across all those layers, treat it as transitional debt rather than acceptable steady-state behavior.

---

## 10. Acceptance Criteria

The pattern architecture upgrade is successful when:

1. adding a normal new pattern no longer requires edits across many routing switches
2. host realization does not require bespoke assignment for every pattern
3. resolver quality depends on capabilities and contracts, not only broad categories
4. gap fill becomes smaller, more typed, and easier to validate
5. host-specific decisions are separated from host-agnostic pattern meaning
6. the system can grow toward 100+ patterns without turning pattern authoring into cross-layer manual wiring

Additional review checks:

7. `PatternContract` and `HostBinding` are visibly separate in proposal language
8. per-pattern overrides are documented as exceptions, not the common route
9. `FillSlot` is explicitly typed bounded variability, not architecture glue
10. Lane B seam asks only for module-need clarity, not for host authority transfer

Current planning consistency command:

- `npm run check:plans`

---

## 11. Final Recommendation

The current pattern system is a valid early mainline foundation, but it should evolve from:

- `pattern as ID-driven implementation bucket`

toward:

- `pattern as semantic contract + host binding + bounded fill surface`

That is the direction most likely to give Rune Weaver both things you care about:

- enough generalization to satisfy broader user requests
- enough control to keep host realization, generator routing, and validation understandable

## 12. Deliverables For This Lane

Lane C's current proposal deliverables are:

1. [PATTERN-CONTRACT-VNEXT-PROPOSAL.md](/D:/Rune%20Weaver/docs/PATTERN-CONTRACT-VNEXT-PROPOSAL.md)
2. [REALIZATION-FAMILY-PROPOSAL.md](/D:/Rune%20Weaver/docs/REALIZATION-FAMILY-PROPOSAL.md)
3. [FILL-SLOT-CONTRACT-PROPOSAL.md](/D:/Rune%20Weaver/docs/FILL-SLOT-CONTRACT-PROPOSAL.md)

Together they answer:

- why raw pattern-id branching degrades at 100+ patterns
- what belongs to `PatternContract` vs `HostBinding`
- how `HostRealization` can stay family-driven and deterministic
- how `FillSlot` can stay typed and bounded
- what minimal `module need` seam Lane B should expose
- which override cases remain acceptable

At this point, these deliverables should be read as:

- proposal residuals
- implementation/migration guidance
- controller merge prep for later `PATTERN-SPEC` work

not as parallel baseline contract docs

## 12.1 Residual Checklist For Controller-Owned `PATTERN-SPEC` Merge

When the main controller prepares the next `PATTERN-SPEC` merge wave, the remaining Lane C checklist is:

1. define the minimum admission rule for a valid `PatternContract`
2. define the minimum admission rule for a valid `HostBinding`
3. define which `FillSlot` declarations are mandatory when `ModuleNeed.boundedVariability` is present
4. define how exception-only `overridePolicy` is reviewed and expired
5. define validator ownership and reject / escalate / default gating for `FillSlot`
6. define how capability naming governance is enforced during admission

## 13. Merge Advice For Main Controller

Main controller should merge Lane C output only if:

1. baseline frozen truths remain preserved
2. proposal docs are treated as proposal docs, not baseline truth
3. shared terms are reconciled with Lane B before cross-cutting baseline docs are edited
4. any pressure to reopen intent-schema core fields, blueprint readiness semantics, or lifecycle scope is treated as a blocker

If those conditions are not met, keep the proposals as review input rather than promoting them into baseline architecture language.

# Intent Schema & Blueprint Update Plan

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: temporary
> Last verified: 2026-04-17
> Read when: checking which Lane B items remain residual after baseline wording landed
> Do not use for: restating accepted baseline architecture or overriding authoritative docs
> Owner: Lane B

This document is now a residual planning tracker.
Accepted Blueprint-stage wording lives in [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md), [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md), [WIZARD-BLUEPRINT-CHAIN.md](/D:/Rune%20Weaver/docs/WIZARD-BLUEPRINT-CHAIN.md), and [LLM-INTEGRATION.md](/D:/Rune%20Weaver/docs/LLM-INTEGRATION.md).
This file should record only non-baselined Lane B follow-up details.

## 1. Goal

This residual tracker covers the remaining Lane B questions after baseline wording was accepted.

The accepted baseline now already covers:

- `BlueprintProposal -> BlueprintNormalizer -> FinalBlueprint`
- deterministic final executable blueprint authority
- canonical `ModuleNeed`
- `ready | weak | blocked` honesty
- LLM placement and non-authority over host/write decisions

This file therefore addresses only residual planning questions such as:

- optional-fields-first migration order
- whether `BlueprintProposal` should explicitly persist `moduleNeeds[]` or derive them only through normalization
- implementation semantics for `ready | weak | blocked`
- residual review artifact and rollout-mode details

If a point is already accepted in baseline wording, this file should reference baseline rather than restate it as parallel truth.

---

## 2. Current Reality

### 2.0 Accepted In Baseline

The following Lane B directions are no longer proposal-only:

- Blueprint stage may internally operate as `BlueprintProposal -> BlueprintNormalizer -> FinalBlueprint`
- `FinalBlueprint` remains deterministic
- `ModuleNeed` is the canonical pattern-facing seam
- `BlueprintProposal` is candidate structure only
- `BlueprintNormalizer` is the legality / canonicalization gate
- `FinalBlueprint` must not carry host realization family, generator family, or write-target authority

See:

- [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
- [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md)
- [WIZARD-BLUEPRINT-CHAIN.md](/D:/Rune%20Weaver/docs/WIZARD-BLUEPRINT-CHAIN.md)
- [LLM-INTEGRATION.md](/D:/Rune%20Weaver/docs/LLM-INTEGRATION.md)

### 2.1 What the repo already has

Today the repo already shows three different realities:

1. `IntentSchema` is already the main semantic input object.
2. the mainline `BlueprintBuilder` is still deterministic and rule-driven.
3. the workbench side already has an LLM-based `BlueprintProposal` concept.

So the real question is not "Should Blueprint ever involve LLM?"
The real question is "Where should LLM be allowed to help, and where must it stop?"

### 2.2 Current weakness

The current `IntentSchema` is still too thin to preserve structure-rich user intent at scale:

- many requirement fields are still string arrays
- actors, state, flow, selection semantics, persistence semantics, and acceptance invariants are under-modeled
- the builder must infer too much from sparse text

The current `BlueprintBuilder` is strong for canonical cases, but it still relies mainly on:

- category inference
- normalized mechanics switches
- default pattern mappings
- default connection inference

That is enough for narrow and repeated request families.
It is not enough to perfectly inherit arbitrary user demand.

---

## 3. Core Position

### 3.1 Rule-only Blueprint is not enough by itself

If the target is only a narrow set of well-known gameplay patterns, rule-only blueprinting can work.

If the target is broad user intent generalization, rule-only blueprinting will eventually fail because:

- users omit structure that is semantically important
- multiple module decompositions can all look locally reasonable
- hidden priorities are often not explicit in the prompt
- cross-module constraints are hard to recover from shallow schema alone
- "default mapping" starts to act like silent product policy

So the answer to "Can Blueprint be fully rule-driven and perfectly inherit user requirements?" is no.
It can be useful and reliable within a bounded envelope, but it cannot be perfect once request variety rises.

### 3.2 Direct LLM final Blueprint is also the wrong answer

Letting the LLM directly decide final `Blueprint` structure creates new problems:

- unstable module decomposition
- hidden host leakage
- invented pattern choices
- invented generator/write-path assumptions
- harder debugging and weaker reproducibility

So the target should not be "replace the builder with a freeform LLM."

### 3.3 Recommended architecture decision

Use this pipeline:

```text
User Request
  -> Intent Understanding
  -> IntentSchema
  -> Feature Boundary Resolver
  -> Feature Source Model
  -> optional Feature Family Adapter
  -> Optional BlueprintProposal (LLM sidecar)
  -> BlueprintNormalizer / Contract Checks / Policy Checks
  -> Final Blueprint
  -> Pattern Resolution
  -> Host Realization
  -> Generator Routing
  -> Gap Fill / Write
```

This keeps the final executable architecture deterministic while still letting LLM help where rules are weakest:

- decomposition suggestion
- hidden-structure surfacing
- missing-module discovery
- parameter placement suggestion
- uncertainty explanation

Planning-only note:

- `Feature Boundary Resolver`, `Feature Source Model`, and `Feature Family Adapter` are not current baseline layers
- they are a proposed pre-blueprint specialization seam for complex, object-rich features
- they must not be described as current executable authority until baseline docs are explicitly updated

---

## 4. LLM Placement Decision

### 4.1 LLM should assist Blueprint, but only as a bounded sidecar

The recommended role for LLM at the blueprint stage is:

- propose modules
- propose connections
- suggest candidate pattern families
- surface feature-boundary candidates such as `familyCandidate`, `containedObjects`, and `sourceModelHints`
- surface ambiguity and uncertainty
- suggest missing parameters or constraints

The LLM should not be the final authority for:

- final selected pattern IDs
- final host realization type
- final generator family
- write paths
- ownership boundaries

### 4.2 Why this is the right compromise

This split preserves both goals:

- `generalization`: the LLM helps when the request carries latent structure that rules would miss
- `control`: the deterministic normalizer and policy layer decide what is legal, canonical, and executable

### 4.3 Existing repo direction already supports this

This is not a brand-new idea for the codebase.
The repo already has a workbench-side `BlueprintProposal` direction, so the architecture can standardize and promote that concept instead of inventing a second parallel model.

If future feature-boundary / source-model shaping is adopted, candidate extraction must still stay inside Wizard / Intent assistance.
It must not create a new authoritative LLM stage between `IntentSchema` and `FinalBlueprint`.

---

## 5. Intent Schema vNext

The current schema should evolve from a summary object into a typed semantic contract.

### 5.1 New information `IntentSchema` should carry

At minimum, add first-class fields for:

| Area | Needed information | Why |
|------|--------------------|-----|
| actors | who triggers, who is affected, who observes | avoids losing role semantics |
| state model | what state exists, where it lives, how it changes | supports persistent vs ephemeral behavior |
| flow semantics | trigger, sequence, choice, confirmation, cancel, retry | keeps behavioral structure explicit |
| selection semantics | weighted, filtered, deterministic, user-chosen, one-shot, repeatable | prevents builder from guessing too much |
| effect semantics | apply, remove, stack, expire, consume, restore | improves downstream routing and validation |
| persistence scope | transient, session, feature-owned persistent, external | clarifies ownership and generator scope |
| integration expectations | bridge point, host surface, entry binding expectations | reduces host leakage later |
| hard constraints | must-have, must-not, legal/host restrictions | should be policy input, not comments |
| acceptance invariants | what must be true after generation or at runtime | gives validation a semantic target |
| uncertainties | what is unclear, blocked, or assumed | makes partial/weak blueprint legal |
| required clarifications | what must be asked before final execution | supports controlled blocking instead of fake confidence |

### 5.2 Recommended structural shift

Move away from raw `string[]` requirements where possible.
Use typed requirement items.

Example direction:

```ts
interface IntentRequirement {
  id: string;
  kind: "trigger" | "state" | "rule" | "effect" | "ui" | "integration";
  summary: string;
  actors?: string[];
  inputs?: string[];
  outputs?: string[];
  invariants?: string[];
  parameters?: Record<string, unknown>;
  priority?: "must" | "should" | "could";
}
```

This does not require a full rewrite on day one.
The repo can add typed optional fields first, then migrate the builder gradually.

### 5.3 Readiness should become graded, not binary only

Current `isReadyForBlueprint` is useful, but too coarse by itself.
Add explicit readiness states such as:

- `ready`
- `weak`
- `blocked`

This allows the pipeline to say:

- "we can propose a blueprint, but not finalize it"
- "we can finalize a narrow deterministic skeleton"
- "we must request clarification before continuing"

That is better than pretending all prompts can be normalized into a fully confident blueprint.

### 5.4 Feature Boundary Resolver

Some requests describe a feature with internal business objects, not just loose mechanic hints.
For those requests, the planning path needs one extra bounded seam before blueprint shaping.

Planning-only direction:

- `Feature Boundary Resolver` reads `IntentSchema` plus Wizard-side candidate hints
- it decides whether the request is best understood as:
  - a new feature
  - an update to an existing feature
  - a related-feature candidate that still needs governance review
- it also decides whether the request should land in:
  - a known `family-owned` source model
  - or a `generic-core` source model fallback
- it decides whether contained business objects should remain internal objects or be promoted into:
  - external capability candidates
  - or separate feature candidates

Authority rule:

- LLM may suggest `familyCandidate`, `containedObjects`, and `sourceModelHints`
- deterministic boundary resolution keeps final authority over lifecycle landing, source-model landing, and legality

### 5.5 Feature Source Model

`Feature Source Model` is the proposed authoring artifact for one feature before deterministic blueprint compilation.

It is responsible for:

- feature-owned business objects
- feature-owned policy/config fields
- feature-level update merge inputs
- preserving rich authoring intent that should not be collapsed into pattern parameters too early

It is not:

- a second workspace registry
- a replacement for `FinalBlueprint`
- a replacement for `Pattern`
- a substitute for host realization or write planning

Planning rule:

- workspace remains the lifecycle/registry authority
- source model is a feature-owned authoring artifact under the same feature lifecycle boundary

### 5.6 Optional Feature Family Adapter

Not every feature needs a dedicated family adapter.

Recommended split:

- simple features may compile from `IntentSchema` directly into deterministic blueprinting
- object-rich or repeatedly updated features may use an optional `Feature Family Adapter`

`Feature Family Adapter` is responsible for:

- validating the family-owned source model shape
- deciding what stays as internal business objects
- compiling that source model into deterministic blueprint inputs
- defining family-specific update merge rules without changing lifecycle authority

It must not:

- replace workspace ownership/lifecycle governance
- widen pattern authority by itself
- silently admit new pattern families during update

Fallback rule:

- if a request does not match a known family, it should not fail only because family matching is missing
- the bounded fallback is `generic-core` source model shaping plus normal deterministic blueprinting

### 5.7 Grammar Family / Capability / Composition Placement

For this planning wave, use the following terminology split:

- `grammar family`
  - a stable reusable mechanism boundary
  - examples at the current Dota2 mainline level include `scheduler/timer`, `reward/progression`, `spawn/emission`, and `entity/session state`
- `capability`
  - the smallest reusable mechanism token carried under a family
  - it says what mechanism support exists, not what business story is being told
- `composition`
  - behavior created by combining capabilities or families
  - this is the preferred home for many user-facing semantics that sound large but are built from existing atoms
- `feature-owned source model`
  - feature-scoped authoring data such as business objects, catalogs, policy/config fields, and update-merge inputs
  - this is where rich per-feature content should live when it should not become family vocabulary

Why this split must exist:

- `ModuleNeed -> capability fit -> pattern resolution -> host realization -> honest block` requires stable vocabulary
- LLM may suggest decomposition, candidate families, or candidate capability placement
- LLM should not be the only authority deciding whether a new phrase becomes:
  - a parameter
  - source-model data
  - composition
  - a capability
  - or a new family

New-semantics placement order for this planning wave:

1. check whether the request is only a parameter change
2. check whether it is a feature-owned source-model change
3. check whether it is a composition of existing capabilities or families
4. only then consider a new capability under an existing family
5. consider a new family only as the last option

v1 example capability vocabulary for planning use:

| Token | Family | Planning status |
| --- | --- | --- |
| `timing.cooldown.local` | `scheduler/timer` | current truthful example already admitted |
| `timing.delay.local` | `scheduler/timer` | example vocabulary only; not current shipped truth |
| `timing.periodic.local` | `scheduler/timer` | example vocabulary only; not current shipped truth |
| `reward.apply.local` | `reward/progression` | example vocabulary only; not current shipped truth |
| `progress.counter.local` | `reward/progression` | example vocabulary only; not current shipped truth |
| `spawn.single.local` | `spawn/emission` | example vocabulary only; not current shipped truth |
| `spawn.batch.local` | `spawn/emission` | example vocabulary only; not current shipped truth |
| `emission.projectile.local` | `spawn/emission` | example vocabulary only; not current shipped truth |

The following should not become v1 example capability tokens:

- `progress.threshold.local`
  - treat as composition or rule logic on top of `progress.counter.local`
- `round_timer`
  - treat as `scheduler/timer + entity/session state`
- `monster_enrage_over_time`
  - treat as `scheduler/timer + reward/progression + effect/state`
- `talent_inventory`
  - treat as feature-owned source model plus UI/state contract
- `equipment_draw`
  - treat as business skeleton or source-model variation, not a capability token

---

## 6. Blueprint Proposal and Final Blueprint Split

### 6.1 Introduce an explicit `BlueprintProposal`

`BlueprintProposal` should be treated as a candidate structure object, not as final truth.

Recommended fields:

- `proposedModules[]`
- `proposedConnections[]`
- `moduleNeeds[]`, understood as proposal-side input that must normalize into the canonical [MODULE-NEED-SEAM-PROPOSAL.md](/D:/Rune%20Weaver/docs/MODULE-NEED-SEAM-PROPOSAL.md) seam
- `candidatePatternFamilies[]`
- `rationale[]`
- `uncertainties[]`
- `blockedBy[]`
- `confidence`
- `source` such as `llm` or `fallback`
- `proposalStatus` such as `draft | usable | needs_review | blocked`

Recommended contract boundary:

- `BlueprintProposal` may express candidate decomposition and candidate semantic needs
- it may not decide final pattern ids, host realization family, generator family, or write targets
- it may carry rationale, but rationale is advisory only
- when proposal content cannot be normalized safely, the normalizer must downgrade or reject it instead of silently trusting it

### 6.2 Introduce a `BlueprintNormalizer`

The normalizer becomes the real architecture gate.

It should:

- canonicalize roles and categories
- deduplicate modules
- correct parameter placement
- reject illegal pattern hints
- reject host/generator leakage
- enforce connection legality
- map candidate module semantics into the canonical [MODULE-NEED-SEAM-PROPOSAL.md](/D:/Rune%20Weaver/docs/MODULE-NEED-SEAM-PROPOSAL.md) seam
- preserve uncertainty when it cannot confidently normalize
- emit either `FinalBlueprint`, `WeakBlueprint`, or `BlockedBlueprint`

At minimum, the normalizer should check:

- structural legality: ids, references, required fields, bounded size
- intent alignment: every module must map back to explicit intent demand or recorded uncertainty
- pattern leakage: no invented or final-resolved pattern claims survive
- host leakage: no realization family, generator family, or write-path authority appears here
- LLM authority creep: proposal rationale and confidence never override deterministic policy
- readiness honesty: `ready`, `weak`, and `blocked` are emitted explicitly rather than hidden behind binary success

### 6.3 Final Blueprint should remain smaller and stricter

The final executable `Blueprint` should contain only what downstream deterministic layers are allowed to trust.

That means:

- no vague freeform design claims
- no direct write-target decisions
- no uncontrolled host assumptions
- no "maybe" pattern IDs without explicit uncertainty state
- no generator-family claims
- no host-realization-family claims
- no gap-fill delegation of architecture responsibilities

`FinalBlueprint` should contain only:

- deterministic module partitioning
- legal, reviewable connections
- bounded module-level semantic needs for Pattern Resolution to consume
- explicit assumptions
- explicit validations
- explicit readiness state

---

## 7. Blueprint Layer Responsibilities

To keep the architecture clean, responsibilities should be split like this:

| Layer | Responsibility |
|-------|----------------|
| IntentSchema | preserve user demand in semantic form |
| Feature Boundary Resolver | decide lifecycle landing, source-model landing, and contained-object boundary without becoming a new write authority |
| Feature Source Model | hold feature-owned authoring data before deterministic blueprint compilation |
| optional Feature Family Adapter | validate a known family-owned source model and compile it into blueprint inputs without becoming a new lifecycle authority |
| BlueprintProposal | suggest a candidate structure |
| BlueprintNormalizer | decide what is legal, canonical, and executable |
| Final Blueprint | represent deterministic implementation skeleton |
| Pattern Resolution | map blueprint needs to concrete reusable units |
| Host Realization | decide host-side realization family |
| Generator Routing | choose concrete emitters and output routes |
| Gap Fill | fill bounded semantic/code slots, not architecture-level decisions |

This is the key control boundary:

- `Blueprint` is skeleton
- `Pattern` is contract-bearing building block
- `Gap Fill` is bounded filler, not architecture designer

For Lane B planning purposes, the recommended handoff seam to Pattern is:

- `ModuleNeed`, as frozen in [MODULE-NEED-SEAM-PROPOSAL.md](/D:/Rune%20Weaver/docs/MODULE-NEED-SEAM-PROPOSAL.md)

That seam should preserve:

- required semantics
- optional semantics
- state ownership hints
- integration expectations
- acceptance invariants

That seam should not yet define:

- full pattern capability taxonomy
- host binding taxonomy
- realization family taxonomy

### 7.1 Frozen cross-lane seam

Lane B should not keep redefining `ModuleNeed` inline in multiple docs.

For this planning wave:

- Lane B owns semantic population of `ModuleNeed`
- Lane C consumes `ModuleNeed`
- only one canonical `ModuleNeed` field set should exist

### 7.2 Talent Draw Transition Rule

Talent Draw is the first bounded example of why this extra seam is needed.

Current authoritative truth:

- Talent Draw pool content authority still lives in the current case-owned canonical parameters
- `6 -> 20 talents` is currently a case-source change, not a current `update` contract capability
- current `update` does not own talent-catalog expansion
- current `update` also does not own:
  - second trigger changes
  - selection-contract changes such as `3 -> 5 choices`
  - generic inventory framework work
  - broad effect-family expansion

Future thin `TalentDrawAdapter` target:

- `TalentDrawFeatureModel` owns `talents[]`
- `TalentDrawAdapter` compiles `talents[] + pool policy + inventory policy` into deterministic blueprint inputs
- `update` may then edit the same `featureId`'s source model rather than only refreshing case-owned constants

Thin v1 contract:

- input fields:
  - `triggerKey`
  - `choiceCount`
  - frozen `inventory`
  - `talents[]`
- each `talent` must carry at least:
  - `id`
  - `label`
  - `description`
  - `tier`
  - `weight`
  - `effectSpec`

Thin v1 `update` may allow:

- add / remove / edit `talents[]`
- edit already-frozen inventory contract fields

Thin v1 `update` must not allow:

- feature family switching
- selected pattern set expansion
- `F4 -> F5` trigger-contract changes
- `3 -> 5 choices` selection-contract changes
- new effect-family / new-pattern admission
- generic inventory, persistence, second-trigger, or subfeature-graph work

---

## 8. Engineering Rollout Modes

To make this architecture implementable without destabilizing the current mainline, use three rollout modes:

### `off`

- run only the current deterministic builder path
- do not generate `BlueprintProposal`
- do not generate `BlueprintNormalizationReport`

### `shadow`

- generate `BlueprintProposal`
- generate `BlueprintNormalizationReport`
- keep the current deterministic builder output as the authoritative downstream input
- use artifacts for comparison, review, and case accumulation only

### `assist`

- generate `BlueprintProposal`
- normalize deterministically
- allow the normalized `FinalBlueprint` to become downstream input
- keep deterministic fallback available if normalization blocks or policy rejects the proposal path

Recommended adoption order:

1. `off`
2. `shadow`
3. `assist`

This keeps the migration evidence-first instead of jumping directly into proposal-driven execution.

### 8.1 Persisted review artifacts

The planning path should retain four reviewable artifacts:

1. `IntentSchema`
2. `BlueprintProposal`
3. `BlueprintNormalizationReport`
4. `FinalBlueprint`

Why:

- compare rule path vs proposal path
- debug weak or blocked normalization
- make acceptance cases reviewable without guessing what happened in the middle

### 8.2 Execution semantics for readiness

Default execution semantics:

- `ready`
  - may continue downstream
- `weak`
  - may continue to preview, review, or dry-run
  - must not write by default
- `blocked`
  - stop
  - return blockers / clarifications

These rules should be explicit in later baseline docs instead of being hidden in command behavior.

---

## 9. Why This Improves Both Generalization And Control

### 8.1 Better generalization

The architecture generalizes better because:

- richer intent means less semantic loss
- proposal stage can recover latent structure
- uncertainty can be carried instead of being hidden
- normalization can accept multiple candidate shapes, then canonicalize

### 8.2 Better control

The architecture stays controllable because:

- final executable blueprint is deterministic
- host realization remains policy-driven
- generator routing remains explicit
- the LLM is prevented from deciding filesystem or host ownership
- blocked cases become visible instead of silently overfit

---

## 10. Rollout Plan

### Phase 1: Contract enrichment without breaking mainline

- extend `IntentSchema` with optional richer fields
- keep current builder working on old fields
- add typed readiness / uncertainty fields
- keep the default execution mode at `off`

### Phase 2: Standardize `BlueprintProposal`

- promote the workbench proposal concept into a shared contract
- allow `source: llm | fallback | rule`
- add normalization-friendly rationale and uncertainty fields
- enable `shadow` mode for comparison without changing downstream truth

### Phase 3: Build the normalizer gate

- implement canonical role/category normalization
- validate pattern hints
- validate connection legality
- validate proposal authority boundaries
- emit normalized `ModuleNeed` contracts using [MODULE-NEED-SEAM-PROPOSAL.md](/D:/Rune%20Weaver/docs/MODULE-NEED-SEAM-PROPOSAL.md)
- emit final / weak / blocked blueprint states
- retain `BlueprintNormalizationReport` artifacts

### Phase 4: Tighten downstream contracts

- update pattern resolution to consume normalized needs rather than raw inferred categories only
- keep host realization deterministic
- keep generator routing deterministic
- open `assist` mode only after `shadow` evidence is stable

### Phase 5: Replace silent inference with explicit evaluation

- create acceptance cases where pure rules fail but proposal+normalizer succeeds
- create blocked cases where the pipeline should refuse false certainty

---

## 11. Current Builder Transition Rule

The current `BlueprintBuilder` should be treated as:

- deterministic fallback
- migration anchor
- comparison baseline in `shadow` mode

Recommended transition:

1. keep the builder intact as current truth
2. gradually split builder responsibilities into:
   - rule proposal behavior
   - deterministic normalization-compatible behavior
3. do not remove the fallback path until `shadow` evidence shows stable parity or clearly better blocked-case honesty

This avoids making the architecture "future-clean" at the expense of losing the current credible path.

## 11.1 Residuals Still Not Baselined

The following items remain proposal residuals, not accepted baseline wording:

- whether `BlueprintProposal` should explicitly persist `moduleNeeds[]` or only proposal metadata that normalizes into `ModuleNeed`
- exact migration order for `optional fields first` across code and docs
- exact runtime behavior for `weak` cases in preview / dry-run / write-prevention flows
- exact shape and retention policy for `BlueprintNormalizationReport`
- exact rollout gating from `off` to `shadow` to `assist`

These should remain here or in narrower implementation docs until promoted by the main controller.

---

## 12. Acceptance Criteria

This architecture change is successful when:

1. the same normalized input produces the same final blueprint
2. LLM proposal failure still allows rule/fallback operation where possible
3. the pipeline can represent `weak` and `blocked` cases honestly
4. final blueprint contains no direct write-path or host leakage from LLM output
5. more user intent is preserved without pushing uncontrolled freedom into gap fill
6. debugging becomes easier because proposal, normalization, and final blueprint are separate artifacts
7. Pattern lane can consume normalized module needs without Lane B redefining pattern taxonomy

Current planning consistency command:

- `npm run check:plans`

---

## 13. Lane C Interface Needs

Lane C should be able to consume, from Lane B output:

- module-level semantic responsibility
- required semantics vs optional semantics
- state and persistence hints
- integration/binding expectations
- acceptance invariants
- explicit uncertainty markers

The canonical seam for this handoff is:

- [MODULE-NEED-SEAM-PROPOSAL.md](/D:/Rune%20Weaver/docs/MODULE-NEED-SEAM-PROPOSAL.md)

Lane B intentionally does not decide:

- final pattern capability vocabulary
- final host binding vocabulary
- final realization-family naming

Those remain open seams for Lane C and main-controller merge.

---

## 14. Final Recommendation

`Blueprint` should include LLM assistance, but not as final authority.

The right direction is:

- richer `IntentSchema`
- optional bounded `BlueprintProposal`
- deterministic `BlueprintNormalizer`
- deterministic final `Blueprint`

That gives Rune Weaver a better chance of reaching the target you want:

- enough generalization to inherit more of the user's real request
- enough control to keep the system debuggable, bounded, and host-safe

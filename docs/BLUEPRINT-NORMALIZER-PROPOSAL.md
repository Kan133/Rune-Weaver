# Blueprint Normalizer Proposal

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: temporary
> Last verified: 2026-04-14
> Read when: checking which normalization details remain residual after baseline wording landed
> Do not use for: restating accepted blueprint-stage authority boundaries in parallel
> Owner: Lane B

This document defines a proposed contract for deterministic normalization between `BlueprintProposal` and `FinalBlueprint`.
It now primarily tracks residual, not-yet-baselined normalization details.

## Purpose

Baseline already accepts:

- `BlueprintNormalizer` as the deterministic legality / canonicalization gate
- `FinalBlueprint` as the downstream-trustable seam
- `ModuleNeed` as the canonical pattern-facing seam

This residual note keeps only the remaining implementation-facing decisions, such as:

- exact report artifact shape
- rollout-mode behavior
- exact weak/blocked continuation semantics
- any minor post-baseline field-shape adjustments that do not reopen shared wording

---

## 1. Core Decision

The normalizer is the architecture gate for the blueprint stage.

It should:

- accept proposal-side richness
- preserve explicit uncertainty
- reject illegal authority claims
- emit only deterministic downstream-trustable structure

It should not:

- act as a second LLM stage
- resolve final host realization families
- choose final write paths
- invent pattern taxonomy

---

## 2. Frozen Terms Introduced

Accepted cross-cutting terms should now be read from baseline docs first.
This section remains a residual reference for implementation discussion.

Lane B introduces these proposal terms:

- `BlueprintNormalizer`
- `NormalizedBlueprintStatus`
- `WeakBlueprint`
- `BlockedBlueprint`
- `ModuleNeed`
- `FinalBlueprint`

These remain proposal seam terms until the main controller freezes wording.

---

## 3. Input Contract

The normalizer may consume:

- `IntentSchema`
- `BlueprintProposal`
- deterministic policy/config checks
- known catalog-safe validation rules

The normalizer must not require:

- final host path planning
- generator routing decisions
- freeform LLM completion

---

## 4. Output States

The normalizer should emit one of three outcomes:

```ts
type NormalizedBlueprintStatus = "ready" | "weak" | "blocked";
```

Meaning:

- `ready`: safe to produce `FinalBlueprint` for deterministic downstream planning
- `weak`: partially normalized structure is usable for review or bounded continuation, but finalization limits remain explicit
- `blocked`: required semantic gaps or policy violations prevent safe blueprint finalization

---

## 5. Required Checks

The normalizer should check, at minimum, the following areas.

### 5.1 Structural Legality

- module ids are unique
- connections reference real modules
- required summaries and categories exist
- proposal size stays within policy bounds

### 5.2 Canonicalization

- normalize module categories into legal blueprint categories only
- normalize connection kinds into approved connection semantics
- deduplicate equivalent modules
- collapse cosmetic over-splitting where safe

### 5.3 Intent Alignment

- every proposed module maps back to explicit intent demand, typed requirement, or preserved uncertainty
- no module exists only because the proposal preferred a nicer decomposition
- unsupported proposal claims become notes or uncertainties rather than executable structure

### 5.4 Pattern Leakage Checks

- candidate pattern references remain hints only
- no proposal-side field is treated as final pattern resolution
- no invented pattern ids survive normalization
- unresolved pattern-specific needs are expressed as `ModuleNeed`, not fake concrete pattern choices

### 5.5 Host Leakage Checks

- no final host realization family is chosen here
- no generator family is chosen here
- no write targets or file paths survive here
- no host-specific pseudo-patterns appear as module contracts

### 5.6 LLM Authority Checks

- proposal rationale is advisory, not authoritative
- proposal confidence does not override policy checks
- unsupported claims are downgraded, not silently trusted
- uncertainty must remain explicit when normalization cannot prove a stable shape

### 5.7 Boundary Checks Against Gap Fill

- architecture-level decomposition stays above gap fill
- missing module responsibilities cannot be delegated to fill slots
- fillable gaps may only remain inside already-normalized module contracts

### 5.8 Readiness And Blocking Checks

- if critical semantics are absent, emit `blocked`
- if skeleton is usable but assumptions remain material, emit `weak`
- emit `ready` only when downstream deterministic stages can trust the output

---

## 6. Proposed Seam Object: ModuleNeed

Lane B should give Lane C a pattern-facing seam without deciding pattern taxonomy.

For this planning wave, the canonical seam is frozen in:

- [MODULE-NEED-SEAM-PROPOSAL.md](/D:/Rune%20Weaver/docs/MODULE-NEED-SEAM-PROPOSAL.md)

Design intent:

- `requiredCapabilities` describe what kind of behavior is needed
- `integrationHints` preserve expected binding seams
- `boundedVariability` exposes only module-local variability expectations
- no field here chooses a concrete pattern family or host realization family
- no competing inline `ModuleNeed` shape should coexist once this seam is frozen

Mapping rule:

- proposal-side module metadata may be richer or messier than the final seam
- once normalized, Lane B docs should refer only to canonical `ModuleNeed`
- older draft names should remain only in the seam proposal's mapping section, not as live competing terms

---

## 7. FinalBlueprint Constraints

The core boundary here is already baselined in [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md), [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md), and [WIZARD-BLUEPRINT-CHAIN.md](/D:/Rune%20Weaver/docs/WIZARD-BLUEPRINT-CHAIN.md).
This section remains useful only for residual implementation detail and review checklists.

`FinalBlueprint` should be smaller and stricter than proposal artifacts.

It should contain:

- deterministic module partitioning
- legal connections
- bounded `ModuleNeed` contracts or equivalent normalized needs
- explicit assumptions
- explicit validations
- explicit readiness state

It should not contain:

- direct filesystem paths
- generator selections
- final host realization family decisions
- uncontrolled freeform rationale blobs
- unresolved fake pattern ids

Suggested constraint list:

1. Every module must have a stable purpose and category.
2. Every module must map back to intent demand or recorded uncertainty.
3. Every connection must be legal and reviewable.
4. Every pattern-facing seam must be expressed as normalized need, not freeform guesswork.
5. Downstream stages must be able to consume the same `FinalBlueprint` deterministically.

---

## 8. Rollout Modes And Runtime Behavior

The normalizer should be integrated gradually using three runtime modes:

- `off`
  - no normalization path affects execution
- `shadow`
  - normalization runs and persists `BlueprintNormalizationReport`, but execution still follows the current deterministic builder output
- `assist`
  - normalized `FinalBlueprint` may become downstream input

Recommended activation order:

1. `off`
2. `shadow`
3. `assist`

Required review artifacts:

1. `IntentSchema`
2. `BlueprintProposal`
3. `BlueprintNormalizationReport`
4. `FinalBlueprint`

This makes weak or blocked normalization behavior visible to acceptance work.

Runtime semantics:

- `ready`
  - may continue downstream
- `weak`
  - may continue to review / preview / dry-run
  - must not write by default
- `blocked`
  - must stop with blockers / clarifications

---

## 9. WeakBlueprint Semantics

`WeakBlueprint` is useful when the system should preserve honest partial progress.

It may include:

- normalized modules with explicit uncertainty flags
- unfinalized module needs
- required clarifications
- blockers that are not yet fatal to review

It must still not include:

- final host realization decisions
- write-path decisions
- pattern taxonomy inventions

---

## 10. BlockedBlueprint Semantics

`BlockedBlueprint` should be emitted when any of the following hold:

- trigger model is too unclear to partition safely
- state ownership is too unclear to separate transient vs persistent behavior
- selection semantics are too unclear to determine module responsibility
- integration expectations are missing where they are required for structure

A blocked result should name:

- blockers
- affected seams
- required clarifications

---

## 11. Current Builder Transition Rule

The current deterministic `BlueprintBuilder` should remain:

- the default fallback path
- the comparison baseline in `shadow` mode
- the migration anchor while proposal/normalizer behavior matures

Recommended transition:

1. preserve the current builder as execution truth initially
2. run proposal + normalization in parallel under `shadow`
3. compare outputs and blocked/weak honesty
4. only open `assist` mode after reviewable parity or better explicit blocking behavior is established

---

## 12. Lane C Open Seams

Lane C should take ownership of:

- mapping `ModuleNeed` or equivalent normalized needs to pattern contracts
- deciding which capability/trait vocabulary best fits the pattern model
- defining how host binding metadata attaches after pattern resolution

Lane B intentionally leaves open:

- final pattern capability taxonomy
- final host binding taxonomy
- fill slot taxonomy

---

## 13. Non-Goals Preserved

This proposal does not:

- let the proposal stage decide final blueprint execution truth
- move host realization authority into the blueprint stage
- make gap fill responsible for architecture design
- reopen baseline lifecycle scope

---

## 14. Merge Recommendation

The main controller should merge this proposal by:

1. freezing the final names for `FinalBlueprint`, `WeakBlueprint`, and `ModuleNeed`
2. aligning blueprint validation docs around these deterministic checks
3. updating baseline docs only after Lane C confirms the pattern-facing seam vocabulary

Residual note:

- the major naming freeze has already landed
- what remains here is mostly implementation detail, rollout detail, and review artifact detail

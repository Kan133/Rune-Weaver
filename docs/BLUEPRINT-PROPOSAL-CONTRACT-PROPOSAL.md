# Blueprint Proposal Contract (Lane B)

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: temporary
> Last verified: 2026-04-14
> Read when: checking which `BlueprintProposal` details remain residual after baseline wording landed
> Do not use for: restating accepted blueprint-stage authority boundaries in parallel
> Owner: Lane B

This draft captures Lane B's proposal-side commitments.
It is intentionally non-authoritative, scoped to `BlueprintProposal` semantics, and does not redefine pattern taxonomy or host realization families.

## Purpose

Lane B owns the intermediate blueprint proposal artifact that lets LLM-assisted experimentation surface candidate structure without claiming final authority.

Baseline already accepts that:

- `BlueprintProposal` is optional candidate structure
- it is not final blueprint authority
- `BlueprintNormalizer` is deterministic gate

This residual note therefore focuses on:

- what `BlueprintProposal` is responsible for
- what it records
- where its authority stops
- how it expresses candidate module needs
- how its statuses behave
- how it hands off to `BlueprintNormalizer` and Lane C

This document does not override the deterministic final-blueprint direction already frozen elsewhere.

---

## Frozen Terms Introduced

Lane B introduces these proposal terms for merge review:

- `BlueprintProposal`
- `ProposalModule`
- `ProposalConnection`
- `ProposalStatus`
- `ModuleNeed`

These terms remain provisional until the main controller freezes final shared wording.

---

## Position In Pipeline

For Lane B planning, the intended shape is:

`IntentSchema -> BlueprintProposal -> BlueprintNormalizer -> FinalBlueprint`

`BlueprintProposal` exists because pure rule-only blueprinting is not enough for broad user intent, but direct LLM final blueprint authority is also out of bounds.

It is therefore:

- richer than the current deterministic builder input
- weaker than a normalized executable blueprint
- advisory to the normalizer, not authoritative over it

## BlueprintProposal Responsibilities

- Gather the user's request plus integration/context metadata (expected surfaces, impact areas, referenced experiences) and run the LLM (or fallback) to produce a structured candidate.
- Return candidate modules, connections, rationale, uncertainties, and blockers while also recording whether any canonical patterns were rejected or missing.
- Surface ownership and capability signals such as missing patterns, missing parameters, missing integration, or missing capability so downstream stages can judge whether the proposal is strong or weak.
- Emit proposal-side confidence and issue signals without pretending those signals are equivalent to normalized readiness.
- Preserve latent structure that deterministic rules may miss, especially around decomposition, sequencing, state, and integration expectations.
- Never change final pattern contracts, host realization decisions, generator routing, or write paths; leave those to downstream normalizer, Pattern, and Host lanes.

## Shared Fields

- `proposedModules`: per-module objects with `id`, human-forward `role`, `category`, `proposedPatternIds` (1-2 canonical candidates), `proposedParameters`, and telemetry flags such as `missingPatterns` and `missingCapability`.
- `proposedConnections`: lightweight edges such as `implicit_sequence` that respect inferred control/data flow; no final connection enforcement.
- `notes` / `issues`: rationale, flagged uncertainties, or blockers that the normalization pass must consider before final blueprint emission.
- `confidence`: derived from module count/coverage; it drives status heuristics but never overrides downstream policy gates.
- `source`: indicates whether the proposal came from `llm` or `fallback` so downstream lanes know when fallback cleanup is required.
- `invalidPatternIds`: map of filtered-out pattern suggestions; recorded to keep normalizer/pattern lanes aware of discouraged hints.

Recommended contract additions for merge consideration:

- `uncertainties[]`: explicit proposal-side unknowns instead of burying them in notes
- `blockedBy[]`: explicit blockers instead of mixing all failure modes into issues
- `candidatePatternFamilies[]`: optional family-level hints for review only, never final resolution
- whether `moduleNeeds[]` should be explicitly persisted on `BlueprintProposal` or only produced by normalization

## Rollout Modes And Artifact Retention

To keep implementation incremental, `BlueprintProposal` should participate in three runtime modes:

- `off`
  - proposal generation disabled
- `shadow`
  - proposal generated and persisted, but not used as downstream execution truth
- `assist`
  - proposal generated, normalized, and allowed to contribute to downstream `FinalBlueprint`

For reviewability, proposal-stage implementation should retain:

1. `IntentSchema`
2. `BlueprintProposal`
3. `BlueprintNormalizationReport`
4. `FinalBlueprint`

This makes proposal quality inspectable instead of hiding it behind final execution success/failure.

## Authority Limits

- `BlueprintProposal` is a candidate, not the final blueprint. It may suggest modules, pattern hints, parameters, and rough sequencing, but it may not commit to final pattern IDs, host realization families, generator selection, or write paths.
- `BlueprintProposal` must never assert that a proposed module already satisfies normalization or host constraints; it must make uncertainty explicit through `issues`, `notes`, `uncertainties`, `blockedBy`, or `missing*` flags.
- `BlueprintNormalizer`, Lane C, and eventual Host Realization retain veto power. `BlueprintProposal` simply supplies raw signals, not authoritative determinations.
- `BlueprintProposal` cannot alter `IntentSchema`, `FinalBlueprint`, or pattern catalogs; it only reads those contracts and augments them with candidate structure.
- Proposal confidence must not be treated as normalized readiness.
- Proposal-side pattern hints must not bypass Pattern Resolution.

## Candidate Module / Module-Need Semantics

- Each candidate module should provide the raw semantic signals that normalize into the canonical `ModuleNeed` seam.
- Proposal-side structure may be incomplete, but once referenced at the cross-lane seam it should be described only as `ModuleNeed`.
- A proposal-side module should bundle enough information to populate `ModuleNeed`, including:
  - a concrete `role` describing what behavior the module should fulfill
  - a `category` hint such as `trigger`, `effect`, `data`, `ui`, or `rule`
  - optional `proposedPatternIds` that describe likely contract families without finalizing resolution
  - `proposedParameters` that pin down concrete requirements such as duration, cooldown, manaCost, weights, or counts
  - unresolved concerns such as `missingPatterns`, `missingIntegration`, `missingOwnership`, `missingCapability`, `uncertainties`, or `blockedBy`
- Proposal-side module semantics are informative only. Lane C should treat the resulting normalized `ModuleNeed` as a description of required capability and contract shape, not as a final pattern assignment.
- The normalizer should translate proposal-side module semantics into the canonical `ModuleNeed` seam defined in [MODULE-NEED-SEAM-PROPOSAL.md](/D:/Rune%20Weaver/docs/MODULE-NEED-SEAM-PROPOSAL.md).
- Connections between modules are soft hints such as `implicit_sequence`; they motivate sequencing but do not decide final binding.

Mapping rule for this planning wave:

- proposal-side raw semantics normalize into `ModuleNeed`
- the canonical seam reference is [MODULE-NEED-SEAM-PROPOSAL.md](/D:/Rune%20Weaver/docs/MODULE-NEED-SEAM-PROPOSAL.md)
- old draft wording such as `ModuleNeedCandidate` should not remain in live Lane B docs once touched

## Proposal Statuses

- `draft`: the default status while the proposal is being collected; indicates that review or normalization is still pending.
- `needs_review`: raised when the proposal surfaced blockers, `issues`, or low confidence; normalization should usually treat it as a weak or clarification-requiring input.
- `usable`: granted when the proposal is `llm` sourced, has medium/high confidence, and no blocking issues; indicates the proposal is suitable for optimistic normalization but still subject to downstream policy validation.
- `blocked`: recommended future extension when proposal-side blockers are severe enough that normalization should not attempt finalization without clarification.

Status mapping rule:

- proposal status is not the same thing as normalized readiness
- a `usable` proposal may still normalize to `weak` or `blocked`
- a `needs_review` proposal may still yield a useful `weak` blueprint

Status updates never override the normalizer or pattern-lane gate. They are descriptive signals about the proposal's internal confidence and issue set, not prescriptive approvals.

Residual implementation note:

- baseline accepts `ready | weak | blocked` on the normalized side
- exact proposal-side status vocabulary is still a residual contract choice unless and until separately baselined

## Relationship To BlueprintNormalizer

`BlueprintProposal` hands off candidate structure.
`BlueprintNormalizer` decides what is legal, canonical, and executable.

The normalizer should be expected to:

- canonicalize categories and connections
- downgrade unsupported claims
- reject host or generator leakage
- preserve explicit uncertainty
- emit `ready`, `weak`, or `blocked`

`BlueprintProposal` should therefore optimize for rich but reviewable signal, not for pretending to be execution truth.

## Lane C Interface Needs

- `BlueprintProposal` must leave Lane C with enough qualifying metadata for deterministic normalization into canonical `ModuleNeed` records, so Pattern work does not need to invent semantics.
- The proposal-side inputs to `ModuleNeed` must include concrete intent, parameters, pattern hints, and explicit uncertainty or blocked flags.
- The proposal must document any `invalidPatternIds` it filtered for later reference in pattern validation.
- `confidence`, `notes`, `issues`, `uncertainties`, and `blockedBy` should explain missing integration, missing patterns, or potential misalignments so Lane C can surface questions or block downstream commits.
- `BlueprintProposal` should never assume a pattern family or realization; instead it should describe the capability requirement and let Lane C map that to the right family.
- Lane C may read `proposedConnections` only as suggestions; final realization sequencing decisions remain under the pattern and host lanes.

Open seam explicitly left to Lane C:

- how `ModuleNeed` maps to pattern contracts
- how pattern-side capability vocabulary is standardized
- how host binding metadata attaches after pattern resolution

## Non-authoritative Framing

This document exists because Lane B needs a common understanding of what a `BlueprintProposal` must capture before handing off to normalization, Pattern, and Host lanes.

It intentionally stops short of defining:

- authoritative pattern taxonomy
- host realization families
- host binding policy

Those remain owned by Lane C and the main controller.
The goal here is residual alignment, not parallel baseline truth.

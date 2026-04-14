# Wizard -> Blueprint Chain

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-14
> Read when: aligning the accepted Wizard / IntentSchema / Blueprint stage boundaries
> Do not use for: execution priority, host realization policy, or old builder-only mapping truth by itself

## 1. Purpose

This document records the accepted cross-cutting chain from Wizard through the deterministic blueprint boundary.

It keeps three things clear:

1. what Wizard and `IntentSchema` are responsible for
2. where optional proposal assistance may exist
3. where the final executable blueprint boundary actually is

For current execution priority, prefer:

- [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
- [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)

## 2. Accepted Chain

```text
User Request
  -> Wizard
  -> IntentSchema
  -> optional BlueprintProposal
  -> BlueprintNormalizer
  -> FinalBlueprint
  -> Pattern Resolution
  -> AssemblyPlan
  -> HostRealizationPlan
  -> GeneratorRoutingPlan
  -> Generators / Write / Validation
```

Important:

- `BlueprintProposal` is optional
- `BlueprintNormalizer` is deterministic
- `FinalBlueprint` remains the downstream-trustable blueprint seam

## 3. Stage Responsibilities

| Stage | Responsibility | Must not do |
|------|----------------|-------------|
| `Wizard` | interpret the request and help produce structured intent | decide host realization or write targets |
| `IntentSchema` | preserve semantic demand, constraints, invariants, uncertainty, and clarification needs | pretend missing semantics are resolved |
| `BlueprintProposal` | surface candidate structure, candidate needs, and uncertainty | act as final blueprint authority |
| `BlueprintNormalizer` | apply legality, canonicalization, and policy checks | become a second freeform LLM stage |
| `FinalBlueprint` | expose deterministic modules, connections, assumptions, validations, and `ModuleNeed` seams | carry host family, generator family, or write-path authority |

## 4. IntentSchema Input Expectations

The accepted `IntentSchema` direction should preserve at least:

- actors
- typed requirements
- state model
- flow semantics
- selection semantics
- effect semantics
- integration expectations
- acceptance invariants
- uncertainties
- required clarifications
- `ready | weak | blocked` readiness honesty

Migration note:

- `isReadyForBlueprint` may remain as a compatibility layer
- richer typed fields should arrive as optional-fields-first

## 5. FinalBlueprint Output Expectations

`FinalBlueprint` should contain:

- deterministic module partitioning
- legal connections
- canonical `ModuleNeed` entries
- assumptions
- validations
- explicit normalized status

`FinalBlueprint` must not contain:

- final pattern selection
- host realization family decisions
- generator family decisions
- write targets
- freeform proposal rationale as authority

## 6. Canonical ModuleNeed Seam

The canonical module-level seam is `ModuleNeed`.

It may express:

- semantic role
- required / optional capabilities
- required outputs
- state expectations
- integration hints
- invariants
- bounded variability
- explicit pattern hints
- prohibited traits

It must not express:

- final pattern choice
- final family selection
- final generator choice
- write targets

## 7. Authority Boundary

The accepted authority split is:

- LLM may help produce `IntentSchema` and optional `BlueprintProposal`
- `BlueprintNormalizer` decides what survives into deterministic blueprint output
- `FinalBlueprint` is the only blueprint artifact downstream layers may trust as executable structure
- `Pattern Resolution`, `HostRealization`, and `GeneratorRouting` keep their own deterministic authority

## 8. Honest States

Rune Weaver should preserve honest partial states instead of forcing fake certainty.

Accepted status vocabulary:

- `ready`
- `weak`
- `blocked`

These states may appear in:

- `IntentSchema` readiness
- normalized blueprint status

They must not be collapsed into silent success.

## 9. Non-Goals

This chain does not authorize:

- direct LLM final blueprint authority
- host realization inside the blueprint stage
- write-path authority inside the blueprint stage
- pattern taxonomy decisions inside Wizard
- gap fill as a substitute for architecture

## 10. Relationship To Other Docs

- [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md)
  - object-level schema contracts
- [LLM-INTEGRATION.md](/D:/Rune%20Weaver/docs/LLM-INTEGRATION.md)
  - provider and LLM placement rules
- [MODULE-NEED-SEAM-PROPOSAL.md](/D:/Rune%20Weaver/docs/MODULE-NEED-SEAM-PROPOSAL.md)
  - canonical planning seam until all baseline docs finish converging

When these docs disagree:

1. prefer [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md) for cross-cutting architecture boundary
2. prefer [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md) for object contract wording
3. prefer planning seam docs only for not-yet-baselined details

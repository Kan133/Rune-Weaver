# Wizard -> Blueprint Chain

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-18
> Read when: aligning the accepted Wizard / IntentSchema / Blueprint stage boundaries
> Do not use for: execution priority, host realization policy, or treating blueprint status as final lifecycle authority

## Purpose

This document records the accepted chain from Wizard through the blueprint stage in the ratified V2 baseline.

It keeps four things clear:

1. what Wizard is responsible for
2. what blueprint stage is responsible for
3. what remains downstream of blueprint
4. where final lifecycle authority actually lives

## Accepted Chain

```text
User Request
  -> Wizard
  -> IntentSchema
  -> optional clarification sidecars
  -> Blueprint Stage
       - optional BlueprintProposal
       - deterministic normalization
       - DesignDraft
       - FeatureContract
       - FeatureDependencyEdges
       - Strategy Selection
       - FinalBlueprint
  -> Pattern Retrieval / Strategy Continuation
  -> AssemblyPlan
  -> HostRealizationPlan
  -> GeneratorRoutingPlan
  -> WritePlan
  -> LocalRepair
  -> Validation / Final CommitDecision
  -> Workspace Lifecycle

Update Request
  -> CurrentFeatureContext
  -> Update Wizard
  -> requestedChange + UpdateIntent
  -> Blueprint Stage
  -> downstream lifecycle
```

## Stage Responsibilities

| Stage | Responsibility | Must not do |
|------|----------------|-------------|
| `Wizard` | interpret the request and return best-effort semantics | decide legality, host routing, or write targets |
| `IntentSchema` | capture demand, constraints, uncertainties, and semantic evidence | carry final readiness or lifecycle truth |
| clarification sidecars | surface 0-3 structural questions when ambiguity would change ownership or dependency meaning | become execution authority |
| `Blueprint Stage` | decide feature structure, owned scope, feature contract, dependency edges, and implementation strategy | decide final host routing or write targets |
| `FinalBlueprint` | expose deterministic downstream planning structure | act as final lifecycle verdict |

## Blueprint Stage In V2

Current blueprint stage may internally carry:

- `DesignDraft`
- retrieved family candidates
- retrieved pattern candidates
- reuse confidence
- chosen implementation strategy
- provisional `commitDecision`

Current rules:

- public names stay `Blueprint` / `FinalBlueprint`
- strategy selection is blueprint authority
- final lifecycle authority still comes later

## Honest States

Blueprint-stage status remains:

- `ready`
- `weak`
- `blocked`

Current meaning:

- these are planning-time compatibility states
- they are not the final lifecycle verdict

Current final authority:

- chain-end `CommitDecision`

## Current Boundary Rules

1. Wizard must always return best-effort semantics, even for unfamiliar asks.
2. Blueprint stage may choose `family`, `pattern`, `guided_native`, or `exploratory`.
3. Missing family/pattern hits must not automatically force `blocked`.
4. `blocked` at blueprint stage should mean planning-time legality or safety issue, not “catalog has not seen this before”.
5. Artifact synthesis and local repair happen after blueprint stage, not inside Wizard.

## Update-Mode Rules

Update mode reads:

- workspace-backed `CurrentFeatureContext`
- not an old stored `IntentSchema`

Update mode produces:

- `requestedChange: IntentSchema`
- `UpdateIntent`

Update mode must not:

- bypass current ownership truth
- infer undeclared cross-feature writes from prompt text
- smuggle adapter-specific merge authority into Wizard

## Summary

The current blueprint chain is no longer a grammar-first admission funnel.

It is a governance-first planning seam:

- Wizard captures semantics
- blueprint decides structure and strategy
- downstream stages decide realization, validation, and final commit truth

# ARCHITECTURE

> Status: authoritative
> Audience: agents
> Doc family: baseline
> Update cadence: on-contract-change
> Last verified: 2026-04-18
> Read when: aligning current execution layering and cross-cutting architectural boundary rules
> Do not use for: same-day task priority or roadmap sequencing by itself

## Purpose

This document describes the current accepted execution architecture baseline of Rune Weaver.

The accepted principle is:

- hard-code **how features are governed**
- do not hard-code **all mechanics they are allowed to attempt**

## Accepted Mainline

The current mainline is:

`User Prompt -> Wizard -> IntentSchema -> Blueprint Stage -> Pattern Retrieval / Strategy Selection -> AssemblyPlan -> HostRealizationPlan -> GeneratorRoutingPlan -> WritePlan -> LocalRepair -> Write Executor -> Host / Runtime Validation -> Final CommitDecision -> Workspace Lifecycle`

Important clarifications:

- `Blueprint Stage` is the planning authority seam.
- `FinalBlueprint.status` remains a compatibility planning status only.
- final lifecycle authority is the chain-end `CommitDecision`.
- family/pattern retrieval is preferred, but retrieval failure does not by itself kill a mechanic.
- guided-native / exploratory paths may synthesize owned artifacts without pretending they came from a selected pattern.

## Blueprint Stage

Blueprint stage currently contains:

- `BlueprintProposal` when useful
- deterministic normalization
- `DesignDraft`
- `FeatureContract`
- `FeatureDependencyEdge`
- strategy selection
- provisional blueprint-stage `commitDecision`

The current public names remain:

- `IntentSchema`
- `Blueprint`
- `FinalBlueprint`

The current internal authority split is:

- Wizard gives best-effort semantics
- Blueprint stage decides structure, owned scope, dependency contract, and implementation strategy
- downstream stages must not reinterpret ownership or strategy from raw prompt text

## Strategy Selection

Current implementation strategies:

- `family`
- `pattern`
- `guided_native`
- `exploratory`

Meanings:

- `family`
  - canonical feature skeleton
- `pattern`
  - reusable mechanism tactics
- `guided_native`
  - host-native synthesis when reuse evidence is weak but target surfaces are clear
- `exploratory`
  - owned-scope attempt when reuse is weak or absent

Unknown mechanics should prefer `guided_native` or `exploratory`, not pre-generation death.

## Family And Pattern Boundary

Current architectural meaning:

- `family`
  - feature skeleton library
  - improves layout, lifecycle convergence, and repeated update stability
- `pattern`
  - mechanism tactics library
  - improves reuse of implementation modules and host bindings

Neither family nor pattern is allowed to define the full space of permitted mechanics.

## Artifact Synthesis

Artifact synthesis is now a real architectural layer for guided-native / exploratory asks.

Current Dota2 synthesized surface:

- server `lua` ability shell
- ability `kv` definition
- blueprint-declared UI owned skeletons

Current synthesis rules:

- synthesis may only write inside already-declared owned scope
- synthesis may not invent new bridge ownership
- synthesis may not create undeclared cross-feature writes
- synthesis may not change dependency contracts or host target selection

## Local Repair

`LocalRepair` is the current bounded repair / muscle-fill layer.

It is the successor role for old gap-fill semantics.

Current rules:

- repair happens after write-plan generation, before execution
- repair is bounded by `fillContracts`
- repair may patch only owned local implementation zones
- repair may not change:
  - feature contract
  - dependency edges
  - host target selection
  - write ownership
  - lifecycle wiring

Compatibility note:

- old `gap-fill` naming still exists in some commands and docs, but it is now compatibility terminology, not architecture authority

## Grammar In The Current Baseline

Grammar is no longer a pre-generation hard admission gate.

Its surviving roles are:

- platform contract
  - ownership
  - write authority
  - state scope
  - integration surface kinds
  - lifecycle rules
- risk taxonomy
  - advisory labels for planning, synthesis, and validation

`blocked` should now mean one of:

- ownership violation
- undeclared cross-feature write
- impossible host target selection
- dependency breakage
- validation-confirmed failure

## Layering

Rune Weaver currently recommends six layers:

1. Interface
2. Intent And Clarification
3. Blueprint And Governance Planning
4. Assembly / Synthesis / Repair
5. Host Realization / Routing / Write
6. Validation And Lifecycle State

### 1. Interface

Examples:

- CLI
- review artifacts
- workbench shells

Must not:

- own lifecycle truth
- bypass write governance

### 2. Intent And Clarification

Examples:

- Wizard
- `IntentSchema`
- `CurrentFeatureContext`
- `UpdateIntent`
- clarification sidecars
- workspace semantic context sidecars

Must not:

- decide final legality
- decide host routing
- decide write targets

### 3. Blueprint And Governance Planning

Examples:

- `DesignDraft`
- `FeatureContract`
- `FeatureDependencyEdge`
- strategy selection
- normalized `Blueprint` / `FinalBlueprint`

Must answer:

- what feature is being built
- what it owns
- what it exports and consumes
- whether it should use family, pattern, guided-native, or exploratory

### 4. Assembly / Synthesis / Repair

Examples:

- pattern retrieval results
- `AssemblyPlan`
- Dota2 artifact synthesis
- local repair

Must not:

- reinterpret ownership from prompt text
- widen write scope

### 5. Host Realization / Routing / Write

Examples:

- `HostRealizationPlan`
- `GeneratorRoutingPlan`
- `WritePlan`
- `Write Executor`

Must not:

- redo blueprint authority
- silently change dependency truth

### 6. Validation And Lifecycle State

Examples:

- governance checks
- dependency revalidation
- host validation
- runtime validation
- final commit gate
- workspace persistence

Must answer:

- can the result be committed
- does it require review
- what dependent features are impacted
- what workspace truth should persist

## Final Commit Gate

Current outcomes:

- `committable`
- `exploratory`
- `blocked`

Current rules:

- `committable`
  - validated templated / stabilized result
- `exploratory`
  - write may proceed, but `requiresReview=true`
- `blocked`
  - safety, dependency, host, repair, or validation failure

All lifecycle operations should converge on this same final gate semantics.

## Architectural Guardrails

The project must avoid these regressions:

1. treating family/pattern retrieval as mechanic admission law
2. letting unknown mechanics die before synthesis
3. letting repair grow back into a second planner
4. letting generators silently decide ownership or dependency contracts
5. letting workbench become a shadow executor
6. letting undeclared cross-feature writes sneak through via repair or prompt text

## Summary

Rune Weaver is not a one-step natural-language-to-host-code system.

It is a governed multi-layer feature-generation system whose current stable direction is:

`IntentSchema -> Blueprint Stage -> Strategy Selection -> Assembly / ArtifactSynthesis -> LocalRepair -> Host Realization / Routing / Write -> Validation -> Final CommitDecision -> Workspace Lifecycle`

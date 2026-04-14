# ARCHITECTURE

> Status: authoritative
> Audience: agents
> Doc family: baseline
> Update cadence: on-contract-change
> Last verified: 2026-04-14
> Read when: aligning current execution layering and cross-cutting architectural boundary rules
> Do not use for: current product completion status or roadmap sequencing by itself

> Status Note
> This document is an active technical baseline for the execution pipeline.
> It defines layering and authority boundaries, not current milestone completion status.
> For current MVP truth and priority order, prefer [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md), [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md), and [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md).

## Purpose

This document describes the current accepted execution architecture baseline of Rune Weaver.

It should reflect:

- the real layered execution path used by the project
- the accepted cross-cutting seam vocabulary
- the authority boundaries that other docs must not violate

It is intentionally narrower than a full future-system roadmap.

## Mainline Pipeline

The accepted mainline is:

`User Prompt -> Wizard -> IntentSchema -> Blueprint Stage -> Pattern Resolution -> AssemblyPlan -> HostRealizationPlan -> GeneratorRoutingPlan -> Generators -> Write Plan -> Write Executor -> Validation -> Workspace State`

Important:

- `Blueprint Stage` may internally operate as `BlueprintProposal -> BlueprintNormalizer -> FinalBlueprint`
- the final executable blueprint boundary remains deterministic
- `Pattern Resolution` consumes normalized `ModuleNeed` seams, not host/write authority
- `HostRealizationPlan` is a real architectural layer
- `GeneratorRoutingPlan` is a real architectural layer
- generators should not be treated as a direct continuation of `AssemblyPlan`

## Accepted Cross-Cutting Direction

The following cross-cutting terms are now accepted baseline vocabulary:

- `IntentSchema`
  - typed semantic contract before blueprinting
- `BlueprintProposal`
  - optional candidate structure and uncertainty surfacing
- `BlueprintNormalizer`
  - deterministic legality / canonicalization / policy gate
- `FinalBlueprint`
  - deterministic downstream-trustable blueprint object
- `ModuleNeed`
  - canonical pattern-facing seam emitted by normalized blueprint output
- `PatternContract`
  - semantic pattern contract
- `HostBinding`
  - host-facing admissibility and restrictions
- `RealizationFamily`
  - policy vocabulary for common-path host realization
- `FillSlot`
  - declared bounded variability inside an already-selected pattern / realization path
- `GapFill`
  - execution that fills declared `FillSlot`s only

This accepted vocabulary does not mean every implementation path has already migrated.
It does mean other baseline docs should stop using conflicting seam names.

## Layering

Rune Weaver currently recommends five architectural layers:

1. Interface
2. Core Planning
3. Host Realization
4. Generation And Host Execution
5. Validation And State

## 1. Interface

The Interface layer handles user entry and structured interaction surfaces.

Typical examples:

- CLI
- Wizard CLI
- review artifacts

This layer should not:

- hardcode host implementation details
- directly write host files
- bypass structured planning layers

## 2. Core Planning

Core Planning is responsible for converting user intent into structured, reviewable planning objects.

It includes:

- Wizard
- IntentSchema
- optional BlueprintProposal
- deterministic BlueprintNormalizer / FinalBlueprint
- Pattern Resolution
- AssemblyPlan Builder

Its role is to answer:

- what the user wants
- what structure the feature should have
- what deterministic `ModuleNeed`s Pattern Resolution must satisfy
- what the feature needs before host realization

Core Planning stops at:

- `AssemblyPlan`

It does not decide final host realization medium.

### Accepted Blueprint Boundary

Within the blueprint stage, the accepted responsibility split is:

- `BlueprintProposal`
  - candidate structure and uncertainty
- `BlueprintNormalizer`
  - legality, canonicalization, and policy enforcement
- `FinalBlueprint`
  - deterministic modules, connections, assumptions, validations, and `ModuleNeed`s

This means:

- LLM may assist proposal
- LLM is not final blueprint authority
- `FinalBlueprint` must not decide host realization family, generator family, or write targets

## 3. Host Realization

Host Realization is responsible for deciding how `AssemblyPlan` structure should be materialized inside the current host.

It includes:

- `HostRealizationPlan`
- host-specific realization policy

The accepted routing direction is:

- common-path selection should evolve toward policy-driven `RealizationFamily` routing
- the decision should be derived from `ModuleNeed`, selected `PatternContract`s, and `HostBinding`
- per-pattern override remains an exception path, not the normal control plane

For Dota2, current concrete realization outputs still include forms such as:

- `kv`
- `ts`
- `ui`
- `kv+ts`
- `kv+lua`
- `shared-ts`
- `bridge-only`

Important:

- current combination-enum realization types are transitional
- future richer composite features may require explicit output-list realization rather than ever more enum combinations
- Host Realization must remain distinct from Pattern Resolution and from concrete generators

## 4. Generation And Host Execution

This layer consumes routed realization outputs and turns them into host-shaped generated artifacts.

It includes:

- `GeneratorRoutingPlan`
- generator router
- Dota2TSGenerator
- Dota2UIGenerator
- Dota2LuaGenerator
- Dota2KVGenerator
- Write Plan
- Write Executor

The expected sequence is:

`HostRealizationPlan -> GeneratorRoutingPlan -> Generators -> Write Plan -> Write Executor`

This layer should not:

- reinterpret user intent
- redo pattern resolution
- redo host realization policy

When bounded variability remains after pattern selection and host realization:

- it should flow through declared `FillSlot` contracts
- `GapFill` should remain bounded completion only
- this layer must not invent missing architecture after the fact

## 5. Validation And State

This layer is responsible for:

- static host validation
- runtime validation
- workspace state
- lifecycle safety

It should make it possible to distinguish:

- command executed
- files written
- host wiring valid
- runtime checks passed
- workspace updated cleanly

## Core Objects And Seams

The key architectural objects and seams are:

- `IntentSchema`
- `BlueprintProposal`
- `FinalBlueprint`
- `ModuleNeed`
- `AssemblyPlan`
- `HostRealizationPlan`
- `GeneratorRoutingPlan`

These must remain distinct.

### Boundary Rules

- `IntentSchema` is not `FinalBlueprint`
- `BlueprintProposal` is not `FinalBlueprint`
- `FinalBlueprint` is not `AssemblyPlan`
- `FinalBlueprint` does not decide host realization family, generator family, or write targets
- `ModuleNeed` is not final pattern selection
- `AssemblyPlan` is not `HostRealizationPlan`
- `HostRealizationPlan` is not generator output
- `GeneratorRoutingPlan` is not final write execution
- `GapFill` is not architecture design

## UI In The Architecture

UI is a code output surface, not a separate main product line.

UI should be understood in three layers:

1. UI mechanic
2. UI host binding
3. UI design support

Examples of UI mechanics:

- `ui.selection_modal`
- `ui.key_hint`
- `ui.resource_bar`

UI host binding decides how those surfaces are realized in Panorama-facing output.

UI design support is expressed through `UIDesignSpec`, not through gameplay logic.

## LLM Placement

The accepted LLM boundary is:

- Wizard LLM: intent extraction and typed semantic clarification
- Blueprint proposal LLM: optional candidate structure only
- BlueprintNormalizer / FinalBlueprint: deterministic, no LLM final authority
- Host Realization: rule-first, host-specific, no realization LLM

The system should not push LLM behavior into:

- final executable blueprint authority
- final pattern admission
- host realization execution
- write execution

## Current Architectural Guardrails

The project must avoid these regressions:

1. treating generators as if they all default to TS
2. skipping Host Realization and routing directly from Assembly to generation
3. letting blueprint decide final host realization
4. letting generators silently re-decide realization policy
5. letting maintenance commands drift into parallel execution systems
6. letting pattern hints bypass `ModuleNeed` compatibility checks
7. letting `GapFill` or `FillSlot` absorb module-structure or host-routing decisions

Before reading the status notes below:

- treat them as current implementation context
- not as the current product Definition of Done
- not as the current execution priority list

For current MVP truth and next-step sequencing, prefer:

- [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
- [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
- [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)

## Current Architectural Status

Already standing:

- Wizard / IntentSchema boundary
- Blueprint boundary
- Pattern Resolution
- AssemblyPlan
- lifecycle-safe write path
- workspace state foundation
- runtime validation foundation
- maintenance command semantics tightening
- `dota_ts_adapter` repair
- baseline migration
- lua entry production
- lua write integration

T121 verified (minimal real Dota2 E2E):

- baseline 3 abilities appear correctly in host
- fresh RW identity ability attaches to hero and is castable
- ability has correct mana cost and cooldown
- modifier creates successfully, buff appears and lasts about 6 seconds
- visual/numeric effect quality remains minimal viable

T125 verified (lua path mainlined):

- `dota2.short_time_buff` pattern produces lua entries through the normal pipeline
- generator emits same-file ability + modifier Lua code
- write executor successfully writes `.lua` file to host path
- old KV-to-lua bypass has exited the formal execution path
- current lua metadata scope still converges on `short_time_buff`-style cases only

In progress / Phase 1 completion work:

- formal Generator Routing integration
- broader lua ability pattern support beyond `short_time_buff`
- richer visual/numeric effect quality
- realization-aware validation / artifact / workspace refinement

Not yet Phase 1 complete:

- semantic incremental update
- feature-internal semantic state
- entity-aware update planning
- general-purpose multi-pattern lua ability framework

Those belong to Phase 2 or later.

## Summary

Rune Weaver is not a one-step natural-language-to-host-code system.

It is a controlled multi-layer `NL-to-Code` system whose accepted stable direction is:

`IntentSchema -> BlueprintProposal (optional) -> BlueprintNormalizer -> FinalBlueprint -> Pattern Resolution -> AssemblyPlan -> Host Realization -> Generator Routing -> Generators -> Write / Validation / Workspace`

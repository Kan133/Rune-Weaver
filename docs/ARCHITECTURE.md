# ARCHITECTURE

> Status Note
> This document is an active technical reference for the current execution pipeline.
> It defines architectural layering and boundary rules, not current product completion status.
> For current MVP truth, execution priority, and acceptance scope, prefer [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md), [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md), and [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md).

## Purpose

This document describes the **current execution architecture baseline** of Rune Weaver.

It is intended to reflect the real mainline execution pipeline used by the project, especially the Phase 1-proven chain, not the full future product architecture.

For the higher-level final product/system architecture, see:

- [SYSTEM-ARCHITECTURE-ZH.md](D:/Rune%20Weaver/docs/SYSTEM-ARCHITECTURE-ZH.md)

## Mainline Pipeline

The current intended mainline is:

`User Prompt -> Wizard -> IntentSchema -> Blueprint -> Pattern Resolution -> AssemblyPlan -> HostRealizationPlan -> GeneratorRoutingPlan -> Generators -> Write Plan -> Write Executor -> Validation -> Workspace State`

This is the architecture baseline other documents should align to.

Important:

- `HostRealizationPlan` is a real architectural layer
- `GeneratorRoutingPlan` is a real architectural layer
- generators should not be treated as a direct continuation of `AssemblyPlan`

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
- Blueprint Builder
- Pattern Resolution
- AssemblyPlan Builder

Its role is to answer:

- what the user wants
- what structure the feature should have
- which core patterns were selected
- what the feature needs before host realization

Core Planning stops at:

- `AssemblyPlan`

It does not decide final host realization medium.

## 3. Host Realization

Host Realization is responsible for deciding how `AssemblyPlan` structure should be materialized inside the current host.

It includes:

- HostRealizationPlan
- host-specific realization policy

For Dota2, this is where the system decides whether a unit should be realized as:

- `kv`
- `ts`
- `ui`
- `kv+ts`
- `kv+lua`
- `shared-ts`
- `bridge-only`

This layer must remain distinct from:

- Pattern Resolution
- concrete generators

Important:

- current combination-enum realization types are transitional
- future richer composite features may require explicit output-list realization rather than ever more enum combinations
- see `COMPOSITE-FEATURE-ARCHITECTURE.md`

## 4. Generation And Host Execution

This layer consumes routed realization outputs and turns them into host-shaped generated artifacts.

It includes:

- GeneratorRoutingPlan
- generator router
- Dota2TSGenerator
- Dota2UIGenerator
- Dota2LuaGenerator (narrow scope, short_time_buff-style)
- Dota2KVGenerator (v1 scope defined, KV config generation route established)
- Write Plan
- Write Executor

For Dota2, `dota2-ts` and `dota2-lua` should be understood as different authoring paths into the same Lua runtime, not as two independent runtime languages.

See `COMPOSITE-FEATURE-ARCHITECTURE.md` for the preferred boundary.

The expected sequence is:

`HostRealizationPlan -> GeneratorRoutingPlan -> Generators -> Write Plan -> Write Executor`

This layer should not:

- reinterpret user intent
- redo pattern resolution
- redo host realization policy

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

## Core Objects

The current key architectural objects are:

- `IntentSchema`
- `Blueprint`
- `AssemblyPlan`
- `HostRealizationPlan`
- `GeneratorRoutingPlan`

These objects must remain distinct.

### Boundary Rules

- `IntentSchema` is not `Blueprint`
- `Blueprint` is not `AssemblyPlan`
- `AssemblyPlan` is not `HostRealizationPlan`
- `HostRealizationPlan` is not generator output
- `GeneratorRoutingPlan` is not final write execution

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

The current intended LLM boundary is:

- Wizard LLM: intent extraction only
- Blueprint orchestration LLM/rules: structure only
- Host Realization v1: rule-first, host-specific, no realization LLM

The system should not push LLM behavior into:

- final pattern admission
- host realization execution
- write execution

## Current Architectural Guardrails

The project must avoid these regressions:

1. treating generators as if they all default to TS
2. skipping Host Realization and routing directly from Assembly to generation
3. letting Blueprint decide final host realization
4. letting generators silently re-decide realization policy
5. letting maintenance commands drift into parallel execution systems

Before reading the status notes below:

- treat them as historical engineering context
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
- **dota_ts_adapter repair** (mainlined via init/refresh)
- **baseline migration** (XLSXContent -> DOTAAbilities, in refresh main path)
- **lua entry production** (normal pipeline produces `contentType: "lua"` entries)
- **lua write integration** (write executor writes `.lua` files to host)

T121 verified (minimal real Dota2 E2E):

- baseline 3 abilities appear correctly in host
- fresh RW identity ability attaches to hero and is castable
- ability has correct mana cost and cooldown
- modifier creates successfully, buff appears and lasts ~6 seconds
- visual/numeric effect quality remains minimal viable (not polished)

T125 verified (lua path mainlined):

- `dota2.short_time_buff` pattern produces lua entries through normal pipeline
- generator emits same-file ability + modifier Lua code
- write executor successfully writes `.lua` file to host path
- old KV→lua bypass has exited formal execution path
- **boundary**: lua metadata scope currently converges on `short_time_buff`-style cases only; this is NOT a general-purpose lua ability framework

In progress / Phase 1 completion work:

- formal Generator Routing integration
- broader lua ability pattern support beyond short_time_buff
- richer visual/numeric effect quality
- realization-aware validation/artifact/workspace refinement

Not yet Phase 1 complete:

- semantic incremental update
- feature-internal semantic state
- entity-aware update planning
- general-purpose multi-pattern lua ability framework

Those belong to Phase 2 or later.

## Summary

Rune Weaver is not a one-step natural-language-to-host-code system.

It is a controlled multi-layer `NL-to-Code` system whose current stable direction is:

`IntentSchema -> Blueprint -> Pattern Resolution -> AssemblyPlan -> Host Realization -> Generator Routing -> Generators -> Write / Validation / Workspace`

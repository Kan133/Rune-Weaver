# Composite Feature Architecture

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: temporary
> Last verified: 2026-04-16
> Read when: planning future composite-feature architecture beyond the current MVP baseline
> Do not use for: current shipped architecture, current lifecycle scope, or current module-need seam authority

## Purpose

This document defines the next-stage architecture direction for Rune Weaver after the current Phase 1 baseline.

Its purpose is to make three decisions explicit:

1. complex product cases such as "talent drafting" should be modeled as composite features, not one giant pattern
2. Host Realization should evolve from combination-enum realization types toward explicit multi-output realization
3. `dota2-ts` and `dota2-lua` should be understood as different authoring paths into the same Dota2 Lua runtime, not as two runtime languages

This document is a planning and architectural decision baseline. It does not claim the full model is already implemented.

## Current Context

Rune Weaver has established a late Phase 1 baseline with:

- lifecycle-safe create / update / regenerate / rollback
- formal Host Realization and Generator Routing layers
- `kv+ts` and `kv+lua` routed outputs working on the current narrow mainline
- direct generation evidence for the current `kv+lua` narrow path

This is enough to expose the next structural limit:

- composite cases will require more than one module
- those modules may need more than one routed output
- combination-enum `realizationType` values will not scale well if output combinations keep growing

## Architectural Decision 1: Composite Features, Not Giant Single Patterns

Cases such as:

- talent drafting
- blessing selection
- upgrade choice modal
- weighted reward roll

should not be modeled as one giant pattern.

They should be modeled as composite features assembled from multiple core patterns and modules.

Typical decomposition:

- `input.key_binding`
- `data.weighted_pool`
- `rule.selection_flow`
- `ui.selection_modal`
- one or more `effect.*` or host-specific effect patterns

This keeps the system:

- more reviewable
- more reusable
- more host-portable
- less likely to collapse product semantics into one special-case implementation

### Why This Matters

If "talent drafting" becomes one giant pattern, Rune Weaver will blur:

- user-facing mechanic contract
- host realization policy
- UI orchestration
- effect realization

That would make future composition harder, not easier.

### Companion Rule: Business Object Models Belong To Feature Source Model

Composite features may still need feature-owned business object collections.
Those collections should not be treated as pattern catalogs.

Recommended split:

- `Pattern` owns mechanic contracts
- composite planning owns module composition
- feature source model owns feature-specific business objects

For a future thin `TalentDrawAdapter`, that means:

- `talents[]` belongs to `TalentDrawFeatureModel`
- `TalentDrawAdapter` compiles that source model into:
  - `input.key_binding`
  - `data.weighted_pool`
  - `rule.selection_flow`
  - `ui.selection_modal`
- the adapter does not collapse Talent Draw into one giant top-level pattern

Planning-only note:

- current mainline truth still uses case-owned canonical Talent Draw parameters
- this document describes the next stable direction, not a current implemented contract

## Architectural Decision 2: Pattern Is Not The Same As Generator Archetype

Pattern and generator archetype are related, but they are not the same layer.

### Pattern

Pattern answers:

- what user-visible mechanic is being requested
- what responsibilities that mechanic has
- what inputs / outputs / dependencies it needs

Examples:

- `input.key_binding`
- `data.weighted_pool`
- `rule.selection_flow`
- `ui.selection_modal`
- `dota2.short_time_buff`

### Generator Archetype

Generator archetype answers:

- how a given generator family should shape code for a routed output
- what internal template or emission strategy should be used

Examples inside the Lua generator:

- `buff`
- `dot`
- `stun`

Examples inside the TS generator later:

- `selection_flow`
- `bridge_binding`
- `server_runtime_rule`

### Architectural Rule

Rune Weaver should prefer:

- pattern for mechanic semantics
- realization outputs for host implementation media
- generator archetype for code-shape specialization inside one generator family

It should avoid treating every Lua archetype as a new top-level pattern by default.

Some patterns may naturally map to one archetype, but the layers should remain distinct.

## Architectural Decision 3: Move Toward Explicit Multi-Output Realization

The current system uses `realizationType` values such as:

- `kv`
- `ts`
- `ui`
- `lua`
- `kv+ts`
- `kv+lua`

This is acceptable as a transition model while the number of real combinations is still small.

It is not a good long-term model once richer composite features arrive.

### Why The Current Model Will Not Scale

Future cases are likely to require combinations such as:

- `ui + ts + kv`
- `ui + ts + lua`
- `ui + ts + kv + lua`

If those are modeled as more enum combinations, the system will drift into realization-type explosion.

### Recommended Direction

Host Realization should eventually evolve from:

```ts
realizationType: "kv+ts"
```

toward a model closer to:

```ts
interface HostRealizationOutput {
  kind: "kv" | "ts" | "ui" | "lua" | "bridge";
  target: string;
}
```

and then:

```ts
interface HostRealizationUnit {
  id: string;
  role: RealizationRole;
  outputs: HostRealizationOutput[];
}
```

The key architectural shift is:

- realization should explicitly list outputs
- routing should consume those outputs
- generator routing should stop depending on enum-combination names

### What This Does Not Mean

This does not require an immediate full rewrite.

Near-term implementation can remain transitional if it:

- keeps current `kv+ts` and `kv+lua` working
- introduces explicit output-list thinking in new contracts
- avoids adding many more combination-enum types unless absolutely necessary

## Architectural Decision 4: TS Path And Lua Path Are Authoring Paths

For Dota2, the final host runtime is still Lua.

So the difference between `dota2-ts` and `dota2-lua` is not "two host runtime languages".

It is:

- `dota2-ts`: TS authoring path -> Lua runtime
- `dota2-lua`: direct Lua authoring path -> Lua runtime

This distinction matters because generator choice should not be explained as a language war.

It is a host implementation-path choice.

## TS Path Boundary

Prefer `dota2-ts` when:

- behavior is orchestration-heavy
- logic benefits from existing TS/x-template infrastructure
- server/shared/UI coordination matters more than native ability shape
- the host implementation is not naturally expressed as one `ability_lua` file

Typical candidates:

- selection flow
- weighted pool orchestration
- shared rule evaluation
- bridge-backed event handling
- UI state wiring

## Lua Path Boundary

Prefer `dota2-lua` when:

- the host-native shape is clearly `ability_lua`
- same-file ability + modifier structure is the natural Dota2 form
- direct Lua generation is simpler and less lossy than TS-to-Lua emission
- the mechanic is closer to a native ability/modifier template than a general orchestration layer

Typical candidates:

- short-time buff
- native DOT/stun-style ability_lua cases
- other narrow host-native ability shells that want direct Lua structure

## Boundary Rule

The same mechanic should not casually exist in both TS and Lua authoring paths without an explicit preference rule.

Otherwise the system will drift into:

- duplicated capabilities
- unstable realization policy
- unclear routing decisions
- harder maintenance

## Recommended Near-Term Direction

The stable path is:

1. keep the current narrow `kv+ts` and `kv+lua` paths working
2. avoid adding many new combination-enum realization types
3. define new system work in terms of composite features
4. prepare the contracts for explicit output-list realization
5. document preferred authoring path per host-native mechanic family

## Recommended Task Sequence

For a stable future composite case such as "talent drafting", Rune Weaver should prioritize:

1. formalize explicit multi-output realization direction
2. clarify TS-path vs Lua-path boundaries
3. strengthen multi-module feature planning / assembly
4. only then build the first minimal composite case

This keeps the product from prematurely encoding one business case as architecture.

## What This Document Does Not Claim

This document does not claim:

- explicit output-list realization is already implemented
- `kv+ts` / `kv+lua` enum combinations are already retired
- Lua is already a general-purpose framework
- composite features are already first-class everywhere in the pipeline

It defines the intended direction for the next stable system-building phase.

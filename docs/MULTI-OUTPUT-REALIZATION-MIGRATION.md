# Multi-Output Realization Migration

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: temporary
> Last verified: 2026-04-14
> Read when: planning multi-output realization migration
> Do not use for: current realization baseline, current host-routing authority, or proof that the migration is already shipped

## Purpose

## Current State

Rune Weaver currently uses `realizationType` as an enum with combined values:

- `kv`
- `ts`
- `ui`
- `lua`
- `kv+ts`
- `kv+lua`
- `shared-ts`
- `bridge-only`

This model emerged from early Phase 1 work and has been sufficient for the current narrow mainline. The system has demonstrated:

- `kv+ts` routed outputs work
- `kv+lua` routing and matching work (T143)
- `kv+lua` direct generation evidence exists (T144)

## Why The Current Model Is Transitional

The combination-enum model has served well but will encounter limits as composite features grow.

### Problem 1: Enum Explosion

If future cases require `ui + ts + kv`, `ui + ts + lua`, or `ui + ts + kv + lua`, each becomes a new enum value. The model does not gracefully express arbitrary output combinations.

### Problem 2: Composite Features Amplify The Problem

The COMPOSITE-FEATURE-ARCHITECTURE document establishes that complex cases like talent drafting should be decomposed into multiple modules. Each module may need its own output set. A fixed enum list cannot represent this flexibility.

### Problem 3: Routing Depends On Enum Names

Current Generator Routing switches on `realizationType` values like `kv+ts`. This works while combinations are few, but becomes brittle as combinations grow.

### Problem 4: HostTargets Are A Temporary Crutch

The current schema includes `hostTargets: string[]` as a workaround:

```ts
hostTargets: ["ability_kv", "server_ts"]
```

This partially decouples routing from the enum, but the coupling remains in `realizationType`. A cleaner model would express outputs directly.

## Target Model Direction

The migration goal is to eventually express realization units with an explicit output list:

```ts
interface HostRealizationOutput {
  kind: "kv" | "ts" | "ui" | "lua" | "bridge";
  target: string;
  rationale?: string[];
}

interface HostRealizationUnit {
  id: string;
  sourceModuleId: string;
  sourcePatternIds: string[];
  role: RealizationRole;
  outputs: HostRealizationOutput[];
  confidence: Confidence;
  blockers?: string[];
}
```

The key shifts:

- `outputs[]` replaces `realizationType` + `hostTargets` combination
- routing consumes `outputs` directly, not enum names
- adding a new output kind only requires a new `kind` value, not a new enum combination
- `target` carries routing-specific targeting information

### What About RealizationType During Transition

During migration, `realizationType` may persist as a transitional field:

- It can continue serving as a shorthand for common combinations
- It can be gradually deprecated as `outputs[]` gains adoption
- New contracts should favor `outputs[]` over `realizationType`

The migration does not require immediate removal of `realizationType`.

## Migration Strategy

The migration should proceed in phases without destabilizing the current working mainline.

### Phase 1: Preserve Compatibility

- Keep `realizationType` and `hostTargets` working
- Begin using `outputs[]` in new HostRealizationPlan contracts
- Do not require existing callers to change

### Phase 2: Routing Consumes Outputs

- Evolve Generator Routing to accept `outputs[]` as primary input
- Derive `routeKind` from output `kind` field
- Continue supporting `realizationType` as fallback for existing plans

### Phase 3: Deprecate Combination Enums

- Reduce reliance on `kv+ts`, `kv+lua` as primary identifiers
- Allow `outputs[]` to become the canonical expression
- Mark `realizationType` as deprecated in schema documentation

### Phase 4: Full Outputs Model

- Remove transitional `realizationType` logic
- Fully migrate to explicit output expression
- Schema formally uses `outputs[]` only

This is not a one-time rewrite. Each phase should be small enough to validate without breaking existing mainline.

## TS Path And Lua Path In The New Model

The COMPOSITE-FEATURE-ARCHITECTURE document establishes that TS and Lua are authoring paths, not host runtime languages. The new model respects this:

- `kind: "ts"` means the TS authoring path into Dota2 Lua runtime
- `kind: "lua"` means direct Lua authoring path

Both produce Lua runtime output. The distinction is about how the code is authored, not about two competing runtime languages.

When future cases need `ui + ts + lua`, the model expresses:

```ts
outputs: [
  { kind: "ui", target: "panorama_ui" },
  { kind: "ts", target: "server_ts" },
  { kind: "lua", target: "lua_ability" }
]
```

This is clearer than trying to invent a new enum value like `ui+ts+lua`.

## Relevance To Composite Features

The COMPOSITE-FEATURE-ARCHITECTURE document outlines that composite features like talent drafting should be decomposed. Each decomposed module may need different outputs:

- A `ui.selection_modal` module needs `ui` output
- A `rule.selection_flow` module needs `ts` or `lua` output
- A `data.weighted_pool` module needs `kv` output
- An `effect.*` module needs appropriate effect outputs

The explicit `outputs[]` model handles this naturally. The combination-enum model would require enumerating every possible module-output combination, which does not scale.

## Boundary: What This Document Does Not Claim

This document does not claim:

- The full outputs model is already implemented
- `kv+ts` or `kv+lua` are wrong or broken
- An immediate full rewrite is required
- Composite features are already supported

This document establishes that:

- The current model is a reasonable transition point
- The direction toward explicit outputs is the recommended path
- Migration can proceed in small, compatible phases

## Relationship To Other Documents

This document builds on:

- COMPOSITE-FEATURE-ARCHITECTURE: establishes composite features as the right decomposition strategy
- HOST-REALIZATION-SCHEMA: current schema with `realizationType` enum
- GENERATOR-ROUTING-SCHEMA: current routing with `routeKind`

This document does not replace those. It adds a migration perspective that those documents do not currently contain.

## Next Steps

The project should:

- Continue maintaining current `kv+ts` and `kv+lua` working paths
- Begin using `outputs[]` in new contract designs where appropriate
- Avoid adding new combination-enum values unless truly necessary
- Evaluate Generator Routing evolution in future planning cycles

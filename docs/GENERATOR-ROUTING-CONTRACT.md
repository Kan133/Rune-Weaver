# Generator Routing Contract

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-14
> Read when: changing or reviewing generator-family routing rules
> Do not use for: proof that every routing path is already product-grade or current milestone status

## Purpose

This document defines how `HostRealizationPlan` should route work into downstream generators.

Its purpose is to pin down one architectural rule:

- Host Realization decides realization class
- generator routing consumes that realization class
- generators should not re-decide realization policy on their own

This contract keeps realization decisions separate from concrete code emission.

For the next-stage evolution of composite features and explicit multi-output realization, see `COMPOSITE-FEATURE-ARCHITECTURE.md`.

## Position In Pipeline

The intended sequence is:

`AssemblyPlan -> HostRealizationPlan -> Generator Router -> Generators -> Write Plan -> Write Executor`

This means:

- `AssemblyPlan` says what the feature needs
- `HostRealizationPlan` says how the host should realize it
- the generator router sends each realization unit to the correct generator path
- generators emit host-shaped outputs

## Core Rule

`HostRealizationPlan` should directly drive multiple generators.

Rune Weaver should not assume that all resolved feature units become TypeScript by default.

The realization layer exists specifically to prevent that collapse.

## Generator Families v1

The current recommended generator families are:

- `Dota2KVGenerator`
- `Dota2TSGenerator`
- `Dota2UIGenerator`
- `Dota2LuaGenerator` (narrow scope: short_time_buff-style cases; see DOTA2-KV-GENERATOR-SCOPE.md "Lua Generator Path Status")

Optional thin support:

- bridge refresh / bridge integration step

The project should not initially split generators more finely than this unless real cases require it.

## Routing Rule v1

The current recommended first-pass routing is:

| realizationType | primary generator route |
| --- | --- |
| `kv` | `Dota2KVGenerator` |
| `ts` | `Dota2TSGenerator` |
| `ui` | `Dota2UIGenerator` |
| `lua` | `Dota2LuaGenerator` (narrow scope) |
| `kv+lua` | split output across `Dota2KVGenerator` and `Dota2LuaGenerator` |
| `shared-ts` | `Dota2TSGenerator` |
| `bridge-only` | bridge refresh / bridge integration step |
| `kv+ts` | split output across `Dota2KVGenerator` and `Dota2TSGenerator` |

## `kv+ts` Interpretation

`kv+ts` should not imply a separate monolithic hybrid generator.

Instead it should mean:

- one realization unit
- multiple generator outputs
- coordinated by generator routing

Typical example:

- KV side emits ability shell/static config
- TS side emits runtime logic or modifier behavior

## Generator Router Responsibility

The generator router is responsible for:

- reading `HostRealizationPlan`
- dispatching realization units to the appropriate generator family
- splitting multi-output realization units when needed
- collecting generated outputs into one downstream aggregate

The generator router is not responsible for:

- reinterpreting intent
- changing realization class
- changing selected patterns
- writing final files

## Generator Responsibility Boundary

Generators should consume already-routed realization units.

Generators may:

- emit host-shaped artifacts
- emit generator summaries
- emit write-target candidates
- emit generator-local warnings

Generators should not:

- reinterpret core pattern resolution
- choose between `kv` and `ts` on their own
- invent new host realization classes
- bypass the router

## Recommended Output Model v1

The router should aggregate generator outputs into one downstream result.

That aggregate may later become a dedicated schema, but the architectural requirement is already clear:

- multiple generators may contribute to one feature
- one realization unit may produce multiple routed outputs
- downstream write planning should consume the aggregate rather than a single generator-specific result

## Relationship To HostRealizationPlan

The current `HostRealizationPlan` v1 may still use coarse `hostTargets: string[]`.

Later the project may evolve toward a richer routed output shape, for example:

```ts
interface HostRealizationOutput {
  kind: "kv" | "ts" | "ui" | "bridge";
  target: string;
}
```

but the current architectural decision is already fixed:

- realization class belongs to Host Realization
- generator selection belongs to routing
- concrete artifact emission belongs to generators

The next likely direction is to make those richer routed outputs explicit enough that the system no longer depends on an ever-growing set of combination-enum realization types.

## Why Multiple Generators Are Required

KV, TS, and UI outputs differ materially in:

- file format
- host semantics
- validation path
- maintenance behavior
- review expectations

Treating them as one generic generator would blur the realization boundary and undermine the reason for adding Host Realization.

## Why Generator Routing Should Stay Thin

The router should not become a second realization planner.

If the router becomes too smart, the system will drift into:

- realization logic hidden inside generator dispatch
- unclear ownership of `kv` vs `ts` vs `ui` decisions

So the router should stay thin and explicit.

## Non-Goals

This contract does not define:

- exact generator APIs
- exact generated file schemas
- exact write plan schemas
- exact bridge mutation format

Those belong to later implementation contracts.

## Open Points

These may be refined later:

- whether routed outputs should become a typed schema
- whether bridge-only should be modeled as a generator or a write-support step
- whether `shared-ts` should later split into a distinct generator family
- how generator output aggregation should be represented formally

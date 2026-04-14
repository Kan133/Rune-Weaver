# Generator Routing Schema

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-14
> Read when: checking the current generator-routing data shape
> Do not use for: proof that every routing detail is fully integrated, milestone status, or generator policy by itself

## Purpose

This document defines the minimal schema for generator routing in Rune Weaver.

Its purpose is to formalize the step between `HostRealizationPlan` and concrete generators without introducing a second realization planner.

The router should stay thin, explicit, and reviewable.

## Position In Pipeline

`HostRealizationPlan -> Generator Routing -> Generators -> Aggregated Generator Output -> Write Plan`

## Core Design

Generator routing should:

- read realization units
- determine which generator family receives each routed output
- split multi-output units such as `kv+ts`
- aggregate generator outputs downstream

It should not:

- reinterpret realization policy
- change selected patterns
- generate code itself

## Minimal Top-Level Shape

```ts
interface GeneratorRoutingPlan {
  version: string;
  host: string;
  sourceRealizationPlanId: string;
  routes: GeneratorRoute[];
  blockers: string[];
  notes: string[];
}
```

## Route Shape

```ts
interface GeneratorRoute {
  id: string;
  sourceUnitId: string;
  generatorFamily: "dota2-kv" | "dota2-ts" | "dota2-ui" | "dota2-lua" | "bridge-support";
  routeKind: "kv" | "ts" | "ui" | "lua" | "bridge";
  hostTarget: string;
  sourcePatternIds: string[];
  rationale: string[];
  blockers?: string[];
}
```

## Field Semantics

### `version`

Schema version for the routing plan.

### `host`

Current host identifier, for example:

- `dota2`

### `sourceRealizationPlanId`

The realization plan identity this routing plan was derived from.

### `routes`

The explicit routed outputs to be consumed by concrete generators.

### `blockers`

Plan-level routing blockers.

### `notes`

Non-blocking notes explaining conservative or partial routing decisions.

## Route Field Semantics

### `id`

A unique route identifier inside the current routing plan.

### `sourceUnitId`

The `HostRealizationUnit` identity this route came from.

### `generatorFamily`

The concrete generator family that should receive this route.

Current expected values:

- `dota2-kv`
- `dota2-ts`
- `dota2-ui`
- `dota2-lua`
- `bridge-support`

### `routeKind`

The coarse output kind for this route.

Current expected values:

- `kv`
- `ts`
- `ui`
- `lua`
- `bridge`

### `hostTarget`

The routed host target, for example:

- `ability_kv`
- `modifier_ts`
- `panorama_tsx`
- `panorama_less`
- `bridge_refresh`

This should remain a routing-level target.

It should not become a final file path.

### `rationale`

Short reviewable reasons explaining the route.

### `blockers`

Optional route-level blockers if the routed output cannot be safely consumed.

## Routing Rules v1

The current expected first-pass mapping is:

| realizationType | resulting routes |
| --- | --- |
| `kv` | one `dota2-kv` route |
| `ts` | one `dota2-ts` route |
| `ui` | one `dota2-ui` route |
| `lua` | one `dota2-lua` route |
| `kv+lua` | at least one `dota2-kv` route and one `dota2-lua` route |
| `shared-ts` | one `dota2-ts` route |
| `bridge-only` | one `bridge-support` route |
| `kv+ts` | at least one `dota2-kv` route and one `dota2-ts` route |

## Example

```json
{
  "version": "1.0",
  "host": "dota2",
  "sourceRealizationPlanId": "realization_dash_01",
  "routes": [
    {
      "id": "route_dash_kv",
      "sourceUnitId": "dash_core",
      "generatorFamily": "dota2-kv",
      "routeKind": "kv",
      "hostTarget": "ability_kv",
      "rationale": [
        "dash core includes host-native ability shell data"
      ]
    },
    {
      "id": "route_dash_ts",
      "sourceUnitId": "dash_core",
      "generatorFamily": "dota2-ts",
      "routeKind": "ts",
      "hostTarget": "modifier_ts",
      "rationale": [
        "dash movement behavior requires runtime script logic"
      ]
    },
    {
      "id": "route_dash_ui",
      "sourceUnitId": "dash_hint_ui",
      "generatorFamily": "dota2-ui",
      "routeKind": "ui",
      "hostTarget": "panorama_tsx",
      "rationale": [
        "HUD hint should be emitted through the UI generator"
      ]
    }
  ],
  "blockers": [],
  "notes": []
}
```

## Aggregated Generator Output

The router should feed a downstream aggregate rather than forcing one generator family to absorb all others.

The precise output schema may evolve later, but the architectural expectation is:

- generator outputs remain typed by family
- they are collected downstream into one aggregated result
- write planning consumes the aggregate

## Non-Goals

This schema does not define:

- generator-internal APIs
- final generated file content
- final write actions
- final validation results

Those belong to later stages.

## Open Points

These may be refined later:

- whether `hostTarget` should become a typed enum
- whether routes should carry stronger provenance
- how aggregated generator output should be formally represented
- whether bridge support should eventually become a thinner non-generator write phase

Current architectural direction:

- keep current routed combinations explicit for the working narrow baseline
- avoid turning realization evolution into endless enum-combination growth
- move toward explicit multi-output realization when richer composite features justify it

See `COMPOSITE-FEATURE-ARCHITECTURE.md`.

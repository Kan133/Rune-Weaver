# Assembly To Host Realization Notes

## Purpose

This document explains how `AssemblyPlan` should feed the Host Realization layer.

It exists to pin down one architectural decision:

- Host Realization should be module-anchored
- and pattern-informed

This avoids two bad extremes:

- pattern-only realization routing
- introducing a second explicit `realizationUnits` layer too early

## Current Decision

At the current project stage, `AssemblyPlan.modules` should be treated as the primary source structure for Host Realization.

The recommended design is:

- start from `AssemblyPlan.modules`
- use each module's `selectedPatterns` as semantic input
- derive `HostRealizationPlan.units` from those modules

The current project should not default to treating each selected pattern as an isolated realization unit.

## Division Of Responsibility

The current recommended division is:

- Wizard does not decide realization-facing module fields
- Blueprint provides structural intent
- Assembly finalizes realization-ready module metadata
- Host Realization decides final realization class and routing

More concretely:

### Wizard

Wizard should not decide:

- `role`
- `outputKinds`
- `realizationHints`
- `realizationType`

Wizard remains responsible only for intent extraction.

### Blueprint

Blueprint should provide:

- module boundaries
- module purpose
- enough structure to imply likely module role

Blueprint should not finalize:

- `outputKinds`
- `realizationHints`
- `realizationType`

### Assembly

Assembly should finalize:

- `role`
- `selectedPatterns`
- `outputKinds`
- optional `realizationHints`

Assembly must not finalize:

- `realizationType`
- `hostTargets`

Assembly is the correct stage for its own fields because it already combines:

- feature structure
- resolved patterns
- execution-oriented planning

### Host Realization

Host Realization should consume Assembly-ready modules and decide:

- `realizationType`
- `hostTargets`
- realization confidence
- realization blockers

This boundary should be read strictly:

- Assembly prepares realization-ready module metadata
- Host Realization decides final host realization class and target routing

Assembly should not be described as if it directly decides `kv` / `ts` / `ui` / `kv+ts`.

## Recommended Minimal Assembly Module Fields

The current recommended realization-ready fields are:

- `id`
- `role`
- `selectedPatterns`
- `outputKinds`
- optional `realizationHints`

Example shape:

```ts
interface AssemblyModule {
  id: string;
  role: "gameplay-core" | "ui-surface" | "shared-support" | "bridge-support";
  selectedPatterns: string[];
  outputKinds: ("server" | "shared" | "ui" | "bridge")[];
  realizationHints?: {
    kvCapable?: boolean;
    runtimeHeavy?: boolean;
    uiRequired?: boolean;
  };
}
```

## Recommended Field Ownership

The current recommended ownership of key fields is:

| Field | Primary owner |
| --- | --- |
| `id` | Blueprint -> carried forward by Assembly |
| `role` | Blueprint-influenced, Assembly-finalized |
| `selectedPatterns` | Assembly |
| `outputKinds` | Assembly |
| `realizationHints` | Assembly |
| `realizationType` | Host Realization |
| `hostTargets` | Host Realization |

This split keeps realization-specific concerns out of Wizard and avoids pushing host-routing decisions too early into Blueprint.

## Why This Is Preferred

This design allows the project to:

- route realization by feature structure
- keep core pattern identity separate from host realization type
- support lifecycle operations like update / regenerate / rollback
- avoid introducing a second explicit unit layer too early

This is especially important because host realization decisions usually map to structural units such as:

- gameplay core
- UI surface
- shared support
- bridge support

not to one-file-per-pattern assumptions.

## OutputKinds Derivation Guidance

`outputKinds` should be derived in Assembly from:

- module role
- selected patterns
- host capability rules

Typical first-pass examples:

- `ui-surface` -> `["ui"]`
- `bridge-support` -> `["bridge"]`
- `shared-support` -> `["shared"]` or `["shared", "server"]`
- `gameplay-core` -> usually `["server"]`, sometimes `["server", "shared"]`

If a gameplay module appears to also directly own UI-only behavior, the preferred correction is usually better module partitioning rather than overloading one module with mixed output intent.

## RealizationHints Guidance

`realizationHints` should also be Assembly-derived rather than Blueprint-authored.

Recommended initial hint fields:

- `kvCapable`
- `runtimeHeavy`
- `uiRequired`

These are still pre-realization hints.

They should help Host Realization make a stable decision, but they should not replace that decision.

## SelectedPatterns Guidance

`AssemblyPlan.modules[].selectedPatterns` should be retained.

It should mean:

- the resolved core pattern subset actually carried by that module

It should not mean:

- raw mechanic keywords
- unresolved pattern hints
- host realization classes
- host-specific pseudo-patterns

The intended split is:

- `AssemblyPlan.selectedPatterns` = global selected pattern set for the full feature
- `AssemblyPlan.modules[].selectedPatterns` = per-module selected pattern subset

This duplication is intentional and useful.

The global list answers:

- which patterns the feature ultimately selected

The module-local list answers:

- which selected patterns each structural unit actually owns

## SelectedPatterns Constraint

`AssemblyPlan.modules[].selectedPatterns` must be a subset of the global `AssemblyPlan.selectedPatterns`.

That means:

- no module may contain a pattern that does not exist in the global selected set
- no module may smuggle in host realization ids
- no module may retain unresolved hints as if they were selected patterns

This is important because Host Realization should remain:

- module-anchored
- pattern-informed

without collapsing into host-specific routing too early.

## Why Additional Mechanic Layers Are Not Yet Preferred

The current project should not introduce extra parallel fields such as:

- `moduleMechanics`
- `moduleCapabilities`

at this stage.

The reason is that resolved core patterns already provide the mechanic-level semantic anchor.

If the project introduces another mechanic-like abstraction too early, it risks:

- duplicating meaning
- creating drift between pattern semantics and module semantics
- making review harder
- complicating lifecycle handling

The preferred first version is:

- keep global selected patterns
- keep per-module selected pattern subsets
- combine them with `role`, `outputKinds`, and optional `realizationHints`

Only if repeated real cases prove this insufficient should the project consider a richer intermediate abstraction later.

## Why Pattern-Only Routing Is Not Enough

Routing only from `selectedPatterns` is too narrow.

It tells the system:

- which mechanics are present

but it does not tell the system:

- which mechanics belong to the same structural unit
- which mechanics should be realized together
- which units are UI vs gameplay vs shared
- when hybrid realization depends on a pattern combination

## Why A Dedicated `realizationUnits` Layer Is Not Yet Preferred

Introducing a new `realizationUnits` layer too early would add another structural mapping layer between:

- `AssemblyPlan.modules`
- `HostRealizationPlan.units`

That would increase complexity for:

- review
- generator routing
- update
- regenerate
- rollback

The current recommended path is:

1. enrich `AssemblyPlan.modules`
2. derive `HostRealizationPlan.units`
3. observe repeated real cases
4. only introduce explicit `realizationUnits` if modules are repeatedly too coarse

## Future Upgrade Condition

A dedicated `realizationUnits` layer should only be introduced later if all of the following become true:

1. the same `AssemblyPlan` module must repeatedly split into multiple realization units
2. that split is not an edge case but a recurring pattern
3. `HostRealizationPlan` generation is effectively re-partitioning modules every time
4. lifecycle handling would become clearer, not more fragmented, after the split

Until then, enriched modules are the safer design.

## Relationship To HostRealizationPlan

`HostRealizationPlan` should continue to model:

- host routing
- realization type
- realization confidence
- blockers

It should not become a replacement for `AssemblyPlan`.

The two layers should remain distinct:

- `AssemblyPlan` expresses what the feature needs
- `HostRealizationPlan` expresses how the host should realize it

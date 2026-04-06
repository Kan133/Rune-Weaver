# HostRealizationPlan Schema

## Purpose

This document defines the initial schema shape for `HostRealizationPlan`.

The schema is intended to sit between `AssemblyPlan` and concrete generators.

It should be small, reviewable, and sufficient to route downstream generation without collapsing core pattern identity into host implementation form.

## Position In Pipeline

`AssemblyPlan -> HostRealizationPlan -> Generators`

The schema should express:

- what units need realization
- where they came from
- how they should be realized in the current host
- whether blockers or low-confidence routing remain

## Top-Level Shape

```ts
interface HostRealizationPlan {
  version: string;
  host: string;
  sourceAssemblyPlanId: string;
  units: HostRealizationUnit[];
  blockers: string[];
  notes: string[];
}
```

## Unit Shape

```ts
interface HostRealizationUnit {
  id: string;
  sourceModuleId: string;
  sourcePatternIds: string[];
  role: "gameplay-core" | "ui-surface" | "shared-support" | "bridge-support";
  realizationType: "kv" | "ts" | "ui" | "kv+ts" | "shared-ts" | "bridge-only";
  hostTargets: string[];
  rationale: string[];
  confidence: "high" | "medium" | "low";
  blockers?: string[];
}
```

## Field Semantics

### `version`

Schema version for the realization plan itself.

### `host`

The current host identifier, for example:

- `dota2`

### `sourceAssemblyPlanId`

The `AssemblyPlan` identifier this realization plan was derived from.

### `units`

The list of realization units that downstream generators will consume.

### `blockers`

Plan-level blockers that prevent safe realization.

### `notes`

Non-blocking review notes explaining conservative routing decisions or limitations.

## Unit Field Semantics

### `id`

A stable realization-unit identifier inside the plan.

This should be unique within the current plan.

### `sourceModuleId`

The originating module identity from Blueprint/Assembly structure.

### `sourcePatternIds`

The selected core patterns that jointly give rise to this realization unit.

This should usually be a small set rather than a single value, because many realization decisions depend on a pattern combination, not just one isolated pattern.

These must remain core pattern ids, not host-specific pseudo-patterns.

### `role`

The structural role of the realization unit within the feature.

Current expected values:

- `gameplay-core`
- `ui-surface`
- `shared-support`
- `bridge-support`

This role is intended to help realization routing operate on feature structure, not only on individual patterns.

### `realizationType`

The host realization class.

Current allowed values:

- `kv`
- `ts`
- `ui`
- `kv+ts`
- `shared-ts`
- `bridge-only`

### `hostTargets`

A small list of downstream routing targets that tell generators what kind of outputs this unit should produce.

Examples:

- `ability_kv`
- `modifier_ts`
- `panorama_tsx`
- `panorama_less`
- `shared_types`
- `bridge_refresh`

This field should stay at routing level.

It should not yet become a final path list.

### `rationale`

Short reviewable reasons explaining why this realization type was chosen.

Example:

- `ability shell fits static config`
- `movement logic requires runtime script`

### `confidence`

A bounded realization confidence level:

- `high`
- `medium`
- `low`

This reflects realization confidence, not user intent confidence.

### `blockers`

Optional unit-level blockers when a specific unit cannot be safely realized under current rules.

## Example

```json
{
  "version": "1.0",
  "host": "dota2",
  "sourceAssemblyPlanId": "assembly_micro_feature_dash_01",
  "units": [
    {
      "id": "dash_ability_shell",
      "sourceModuleId": "dash_trigger_and_effect",
      "sourcePatternIds": ["input.key_binding", "effect.dash", "resource.basic_pool"],
      "role": "gameplay-core",
      "realizationType": "kv+ts",
      "hostTargets": ["ability_kv", "modifier_ts"],
      "rationale": [
        "ability shell fits host-native static configuration",
        "dash movement logic requires runtime script behavior",
        "the realization decision depends on the combined gameplay unit, not only one isolated pattern"
      ],
      "confidence": "high"
    },
    {
      "id": "selection_surface",
      "sourceModuleId": "selection_ui",
      "sourcePatternIds": ["ui.selection_modal"],
      "role": "ui-surface",
      "realizationType": "ui",
      "hostTargets": ["panorama_tsx", "panorama_less"],
      "rationale": [
        "user-facing selection flow requires UI output"
      ],
      "confidence": "high"
    }
  ],
  "blockers": [],
  "notes": []
}
```

## Validation Rules

A valid `HostRealizationPlan` should satisfy:

- all `sourcePatternIds` values are current core pattern ids
- `role` is structurally coherent with the source module
- no realization type is used as if it were a pattern id
- `hostTargets` stay at routing level, not final file path level
- blockers are explicit
- rationale is reviewable

## Non-Goals

This schema does not directly define:

- final generated file contents
- final write actions
- final import paths
- final bridge mutation details

Those belong to later stages.

## Open Points

These may be refined later:

- whether `sourceAssemblyPlanId` should become a richer provenance object
- whether `hostTargets` should become a typed enum instead of strings
- whether `confidence` should be plan-level as well as unit-level
- whether some realization classes should split into more specific subclasses
- whether `role` should later become a richer typed taxonomy

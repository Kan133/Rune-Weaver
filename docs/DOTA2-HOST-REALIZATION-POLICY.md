# Dota2 Host Realization Policy

## Purpose

This document defines the first-pass realization policy for the Dota2 host.

Its purpose is to guide the Host Realization layer in choosing whether a unit should be realized as:

- `kv`
- `ts`
- `ui`
- `kv+ts`
- `shared-ts`
- `bridge-only`

This is a host policy document, not a pattern catalog document.

## Policy Goal

For Dota2, Rune Weaver should prefer the lightest host-native realization that remains correct and reviewable.

That means:

- prefer KV where host-native configuration is sufficient
- prefer TS where runtime logic is required
- prefer hybrid realization where Dota2 naturally splits static config and runtime behavior
- keep UI on the Panorama/UI path

## Core Principle

If Dota2 native KV can safely express a requirement, the realization policy should not force TypeScript by default.

Likewise, if the behavior clearly exceeds KV expressiveness, the system should not pretend KV is enough.

The realization decision should be based on host-native fit, not convenience of one existing generator.

## Implementation Model For v1

Dota2 Host Realization v1 should be implemented as a Dota2-specific rule engine.

This means:

- it is not host-agnostic
- it is not a freeform LLM planner
- it is not driven primarily by broad Dota2 API retrieval

Instead it should use:

- explicit host realization policy
- explicit routing rules
- explicit mapping heuristics from resolved units to realization classes

This is the preferred first implementation because realization errors have high downstream cost.

Wrong realization decisions affect:

- generator routing
- write behavior
- update/regenerate semantics
- rollback expectations

So the first implementation should bias toward:

- stability
- explainability
- repeatability

## What This Policy Assumes

This policy assumes:

- Dota2 host capabilities are known at a coarse level
- many gameplay properties are host-native and fit KV
- some runtime behavior clearly requires TS
- some gameplay features naturally split between static KV shell and runtime TS logic
- UI remains on the Panorama/UI path

This policy does not assume:

- all Dota2 implementation details are modeled
- every ability archetype is already covered
- broad API lookup is required to route every unit

## KV-First Cases

The following categories should generally bias toward `kv`:

- basic ability properties
- cooldown
- mana cost
- cast range
- behavior flags
- target/team/type flags
- ability specials that are static configuration
- other host-native static values that do not require custom runtime control

These should only escalate beyond `kv` if there is a concrete structural reason.

## TS-First Cases

The following categories should generally bias toward `ts`:

- custom event-driven logic
- custom input handling
- custom state transitions
- nonstandard rule orchestration
- runtime-only effect logic not safely expressible in host-native config
- complex selection or progression flow control

If host-native configuration cannot express the mechanic safely, `ts` should be preferred.

## KV + TS Hybrid Cases

The following categories should generally bias toward `kv+ts`:

- Dota2 ability shell defined statically, but behavior implemented dynamically
- modifier registration via host-native naming/config with runtime logic in TS
- features where the host expects ability or modifier metadata in KV, but behavior still needs custom script

Hybrid realization should be common for many gameplay abilities in Dota2.

## UI Cases

The following should generally bias toward `ui`:

- selection modal
- key hint display
- resource bar display
- other Panorama-facing user surfaces

UI realization should remain separate from gameplay logic realization even when both belong to the same feature.

## Shared-TS Cases

The following may bias toward `shared-ts`:

- shared type definitions
- shared data contracts
- host-side generated shared helpers used by both server and UI paths

`shared-ts` should be used only when the host actually benefits from shared generated code.

## Bridge-Only Cases

Some units may not generate feature-local files directly and may instead only require bridge refresh or registration behavior.

These should be marked as `bridge-only` rather than being forced into KV or TS buckets.

## What This Policy Must Not Do

This policy must not:

- redefine core patterns
- invent Dota2-specific pattern ids
- choose exact imports or final file paths
- decide final code contents

It is a routing and realization policy, not a code generator.

## Dota2 Capability Awareness

The policy may assume the following high-level host facts:

- Dota2 has server/shared/UI output surfaces
- Dota2 supports host-native KV configuration for many ability properties
- Dota2 also requires script logic for more complex runtime behavior
- UI is realized through Panorama-facing assets and code

The policy should not assume arbitrary host-specific private infrastructure beyond what is explicitly supported by the project.

## First-Pass Mapping Heuristics

These heuristics are intentionally coarse and should be used conservatively.

## Mapping Table v1

This table is the current recommended first-pass routing baseline.

| Source pattern / unit class | Typical realization | Notes |
| --- | --- | --- |
| `input.key_binding` | `ts` | Custom input capture and trigger orchestration are runtime concerns |
| `effect.dash` | `kv+ts` | Ability shell often fits static config; dash behavior usually needs runtime logic |
| `effect.modifier_applier` | `kv+ts` | Modifier registration may be host-native; custom behavior usually remains scripted |
| `effect.resource_consume` | `kv` or `kv+ts` | Static cost/cooldown biases toward KV; custom runtime resource rules may escalate |
| `resource.basic_pool` | `kv` or `kv+ts` | Static resource properties bias KV; custom runtime state may require hybrid |
| `rule.selection_flow` | `ts` | Choice flow and nontrivial orchestration exceed static config |
| `data.weighted_pool` | `shared-ts` or `ts` | Depends on whether the data structure must be shared or is server-only |
| `ui.selection_modal` | `ui` | Panorama-facing UI surface |
| `ui.key_hint` | `ui` | Panorama-facing UI surface |
| `ui.resource_bar` | `ui` | Panorama-facing UI surface |

This table is intentionally a policy baseline, not a final immutable truth table.

It should be refined only when real host cases justify the change.

## Decision Order v1

For each realization unit, Dota2 Host Realization v1 should apply roughly this order:

1. Is the unit clearly a UI surface?
- if yes, route to `ui`

2. Is the unit clearly expressible as host-native static configuration only?
- if yes, bias to `kv`

3. Does the unit require custom runtime behavior or orchestration?
- if yes, bias to `ts`

4. Does the unit naturally split between host-native shell/config and runtime script logic?
- if yes, bias to `kv+ts`

5. Does the unit represent shared data or shared type-level support?
- if yes, consider `shared-ts`

6. Does the unit only require bridge refresh / registration behavior?
- if yes, consider `bridge-only`

If multiple routes are plausible, prefer the most conservative route that remains maintainable and truthful to host capabilities.

### `input.key_binding`

Typical bias:

- `ts`

Reason:

- custom input handling and runtime trigger orchestration are not pure static KV concerns

### `effect.dash`

Typical bias:

- `kv+ts`

Reason:

- ability shell and static properties often fit host-native config
- actual custom dash behavior usually needs runtime script logic

### `resource.basic_pool`

Typical bias:

- `kv` or `kv+ts`, depending on whether behavior is static or custom

### `rule.selection_flow`

Typical bias:

- `ts`

Reason:

- player-facing choice flow and nontrivial orchestration generally exceed static config

### `ui.selection_modal`

Typical bias:

- `ui`

### `ui.key_hint`

Typical bias:

- `ui`

### `ui.resource_bar`

Typical bias:

- `ui`

## Escalation Rules

If a unit could theoretically be forced into KV but would become brittle, misleading, or opaque, the policy should escalate it to:

- `ts`
- or `kv+ts`

Correctness and maintainability are more important than artificially maximizing KV usage.

Additional escalation guidance:

- prefer `kv+ts` over overfitting into pure `kv`
- prefer `ts` over pretending runtime orchestration is static configuration
- prefer blocker or low confidence over fake certainty

## What Not To Use For v1

The following should not be the primary basis for realization routing in v1:

- freeform LLM realization judgment
- broad ModDota or Dota2 API RAG
- ad hoc generator-specific convenience rules

Those may help later refinement, but they should not replace explicit realization policy.

## Validation Rules

A good Dota2 realization policy outcome:

- respects host-native strengths
- avoids overusing TS where KV is enough
- avoids overusing KV where custom logic is clearly needed
- remains reviewable
- clearly explains hybrid cases

A bad outcome:

- forces everything into TS
- forces everything into KV
- encodes host routing as fake pattern identity
- hides uncertainty about realizability

## Open Points

These details should be refined later:

- exact unit taxonomy feeding realization
- how hero packages and hero-level content should be handled
- how much of Dota2 ability/modifier realization should be represented explicitly in policy
- whether some realization classes should later split further

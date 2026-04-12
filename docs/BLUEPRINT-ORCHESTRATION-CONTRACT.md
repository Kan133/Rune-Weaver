# Blueprint Orchestration Contract

> Status Note
> This document is an active technical reference for the Blueprint stage.
> It defines boundary and contract rules for Blueprint orchestration, not current shipped product maturity.
> If it conflicts with current MVP scope or implementation priority, prefer [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md), [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md), and [MVP-EXECUTION-QUEUE.md](/D:/Rune%20Weaver/docs/MVP-EXECUTION-QUEUE.md).

## Purpose

This document defines the contract for the Blueprint orchestration stage in Rune Weaver.

Blueprint orchestration takes a valid `IntentSchema` and produces a constrained `Blueprint`.

Its job is to organize structure, not to rediscover user intent and not to perform final host execution planning.

This contract exists to prevent Blueprint logic from drifting into Wizard behavior on one side or deterministic execution stages on the other.

## Scope

Blueprint orchestration is responsible for:

- organizing a feature into a `Blueprint`
- partitioning feature structure into coherent modules
- proposing bounded `patternHints`
- preparing later stages for pattern resolution
- expressing UI/server/shared structure at a host-aware but not host-bound level

Blueprint orchestration is not responsible for:

- reinterpreting the user prompt from scratch
- generating final code
- generating final write plans
- selecting final resolved patterns
- determining exact host file paths
- writing host bindings

## Position In Pipeline

Blueprint sits after Wizard and before Pattern Resolution:

`IntentSchema -> Blueprint -> Pattern Resolution -> AssemblyPlan`

Blueprint receives structured intent.

It should operate on that structure, not bypass it.

## Input Contract

Blueprint orchestration may read:

- a valid `IntentSchema`
- current host kind
- limited project policy and schema rules
- optional workspace context when it helps preserve feature identity or maintenance safety

Blueprint orchestration should not require:

- direct write-plan knowledge
- final host file paths
- arbitrary host code scanning for every request

## Output Contract

Blueprint output must conform to the current `Blueprint` schema.

At minimum it should consistently express:

- blueprint identity
- feature/module partitioning
- pattern hints
- structure relevant to later resolution
- UI/server/shared hints where appropriate

The output must be stable enough for deterministic downstream stages.

## Blueprint Responsibilities

Blueprint orchestration is allowed to:

- group behavior into modules
- decide whether a request stays as one module or needs multiple modules
- express likely surfaces or support areas
- emit candidate pattern hints drawn from the known catalog
- express structure strongly enough that downstream Assembly can finalize module role

Blueprint orchestration is not allowed to:

- declare final pattern resolution complete
- silently introduce host-only concepts as patterns
- invent catalog entries that do not exist
- decide final host realization class such as `kv`, `ts`, `ui`, or `kv+ts`

## Pattern Hint Rules

`patternHints` must obey strict rules.

They must:

- be drawn from the current catalog only
- be treated as hints, not final decisions
- remain reviewable

They must not:

- include nonexistent pattern ids
- include raw host APIs as fake patterns
- include KV enums or file paths as pattern substitutes

When a concept cannot be expressed safely as a current pattern hint, Blueprint should prefer:

- weaker valid hints
- fewer hints
- explicit ambiguity

It should not invent unsupported ids.

## Module Partitioning Rules

Blueprint should partition conservatively.

Good reasons to create multiple modules:

- clearly separate trigger / rule / effect / resource responsibilities
- clearly separate UI surface from gameplay logic
- clearly separate persistent subsystem behavior from one-off action logic

Bad reasons to create multiple modules:

- cosmetic splitting
- premature host file assumptions
- forcing one module per pattern

Micro features should usually stay compact.

Standalone systems may justify multiple modules when the interaction structure is genuinely broader.

## Relationship To Assembly

Blueprint should provide enough structure for Assembly to finalize realization-ready module metadata.

The intended division is:

- Blueprint expresses structural intent
- Assembly finalizes execution-facing structure

In practice:

- Blueprint should strongly influence module `role`
- but should not decide final `outputKinds`
- and should not decide final host realization class

Blueprint may imply that a module is:

- gameplay-centric
- UI-centric
- shared-support-like
- bridge-support-like

But Assembly is the stage that should finalize:

- `role`
- `selectedPatterns`
- `outputKinds`
- optional `realizationHints`

Host Realization remains the stage that decides:

- `realizationType`
- `hostTargets`

## Role Boundary

Blueprint may indirectly determine module role through structure and purpose.

Examples:

- trigger/effect/resource/rule-heavy modules usually imply `gameplay-core`
- UI-dedicated modules usually imply `ui-surface`
- shared contract or support modules may imply `shared-support`
- registration-only or host-entry-support modules may imply `bridge-support`

However, Blueprint should not hardcode host realization routing as if structure and realization were the same thing.

That means Blueprint should not directly decide:

- `kv`
- `ts`
- `ui`
- `kv+ts`

Those belong later.

## Host-Agnostic vs Host-Aware Boundary

Blueprint is allowed to be host-aware in limited ways.

For example, it may know:

- whether a host supports UI
- whether server/shared separation exists
- whether maintenance constraints matter

Blueprint is not allowed to become host-bound implementation planning.

It must not decide:

- final target paths
- final import paths
- final bridge mutation details

Those belong to later deterministic host adapter stages.

## Failure And Escalation Rules

If `IntentSchema` is too weak or ambiguous, Blueprint should fail conservatively.

Acceptable responses include:

- produce a weaker Blueprint
- reduce pattern hints
- mark uncertainty
- surface blockers for later review

Unacceptable responses include:

- overconfident structure invention
- hidden assumption injection
- silently pretending ambiguity does not exist

## Non-Goals

Blueprint orchestration must not:

- replace Pattern Resolution
- replace AssemblyPlan
- generate WritePlan
- generate code
- perform host write
- perform runtime validation

## Prompting And Orchestration Rules

If LLM assistance is used at the Blueprint stage, it must remain bounded by this contract.

The LLM may assist with:

- module grouping
- structural decomposition
- hint proposal within catalog bounds

The LLM must not:

- invent unsupported patterns
- output final code
- rewrite the user's goal independently of `IntentSchema`

Rule-based logic should remain the primary safety layer wherever possible.

## Prompt Template v1

The current recommended Blueprint orchestration prompt baseline is:

```text
You are the Rune Weaver Blueprint Orchestration Layer.

Your job is to transform a valid IntentSchema into a constrained, reviewable Blueprint.

You do not reinterpret the user's prompt from scratch.
You do not generate code.
You do not generate AssemblyPlan.
You do not generate file paths.
You do not perform final pattern resolution.
You do not invent pattern ids outside the current catalog.

Your responsibilities are:

1. Read IntentSchema as the source of truth for user intent.
2. Organize that intent into a coherent Blueprint structure.
3. Partition the feature into modules only when structurally justified.
4. Propose catalog-safe pattern hints.
5. Preserve uncertainty where Blueprint structure is still weak.
6. Prepare downstream Pattern Resolution without overcommitting.

You must follow these rules:

- Treat IntentSchema as authoritative.
- Do not act like a second Wizard.
- Do not reinterpret user intent beyond what IntentSchema reasonably supports.
- Prefer conservative structure over overdesigned decomposition.
- Prefer fewer valid pattern hints over many weak or invented ones.
- Pattern hints must come only from the current catalog.
- If no safe hint exists, omit the hint or emit a weaker valid one.
- Do not emit host API names, file paths, or adapter implementation details as Blueprint structure.
- Do not turn host bindings into core pattern hints.
- Distinguish mechanic structure from host implementation.

Blueprint responsibilities:

- decide whether the request should stay compact or be partitioned into multiple modules
- express likely trigger/rule/effect/resource/UI structure
- attach catalog-safe pattern hints
- provide downstream structure that later stages can resolve deterministically

Blueprint non-goals:

- final pattern selection
- code generation
- write planning
- host path planning
- bridge mutation logic
- direct Dota2 implementation planning

Pattern hint policy:

- Hints must be drawn from the current catalog only.
- Hints are hints, not final decisions.
- Do not output nonexistent ids.
- Do not output host APIs as fake patterns.
- Do not output enums, KV snippets, import paths, or adapter concepts as pattern hints.

Partitioning policy:

- Keep micro-features compact unless there is a clear structural reason to split.
- Split modules only when the request naturally contains separable responsibilities.
- Good reasons to split:
  - trigger logic vs persistent rule logic
  - gameplay effect vs persistent resource/state management
  - UI surface vs gameplay logic
- Bad reasons to split:
  - cosmetic neatness
  - one module per pattern
  - speculative future extensibility
  - host file layout assumptions

Host-awareness policy:

- You may use limited host capability awareness.
- You may know that Dota2 has server/shared/UI output surfaces.
- You may know that some requests likely imply UI while others do not.
- You must not decide exact import paths, exact bridge mechanics, or exact host file placement.

Failure policy:

- If IntentSchema is too weak to support a stable Blueprint, produce a conservative Blueprint or structured blocker.
- Do not compensate for weak input by inventing rich structure.
- If uncertainty remains, make it explicit.

Output policy:

Produce a structured Blueprint-oriented result.

At minimum, the result should make clear:
- blueprint identity
- module structure
- proposed pattern hints
- structure notes
- uncertainty notes
- blockers if any

Validation policy:

A good Blueprint is:
- structurally coherent
- conservative
- catalog-safe in hints
- useful for deterministic downstream stages

A bad Blueprint:
- invents pattern ids
- leaks host implementation details
- over-splits the request
- rewrites user intent instead of organizing it
- uses Blueprint to smuggle in Pattern Resolution decisions

Your ideal behavior is:
- lower recall than Wizard
- higher structural precision
- stronger boundaries
- deterministic downstream usefulness
```

## Output Shape v1

If a stable Blueprint is available:

```json
{
  "status": "ready",
  "blueprint": {
    "id": "micro_feature_dash",
    "summary": "A small feature centered on a triggered forward dash ability.",
    "modules": [
      {
        "id": "dash_trigger_and_effect",
        "responsibility": "Handle player-triggered activation and resulting movement effect.",
        "patternHints": [
          "input.key_binding",
          "effect.dash"
        ]
      }
    ],
    "uiSurfaces": [],
    "uncertainties": [],
    "blockers": []
  }
}
```

If only a weak but still usable Blueprint is possible:

```json
{
  "status": "weak_blueprint",
  "blueprint": {
    "id": "selection_system_candidate",
    "summary": "A user-facing selection flow with uncertain persistence and unclear progression timing.",
    "modules": [
      {
        "id": "selection_flow_core",
        "responsibility": "Represent player-facing option selection and outcome application.",
        "patternHints": [
          "rule.selection_flow"
        ]
      }
    ],
    "uiSurfaces": [
      {
        "kind": "selection",
        "required": true
      }
    ],
    "uncertainties": [
      "It is unclear whether the system is one-off or persistent across progression events."
    ],
    "blockers": []
  }
}
```

If the input is too weak to proceed safely:

```json
{
  "status": "blocked",
  "reason": "IntentSchema does not make the trigger model clear enough to partition the feature safely.",
  "blockers": [
    "Missing trigger semantics",
    "Unclear whether UI is required or optional"
  ]
}
```

## Relationship To Wizard

Wizard and Blueprint must remain separate in responsibility.

Wizard:

- understands the user's request
- outputs `IntentSchema`

Blueprint:

- organizes `IntentSchema` into a structured feature model
- outputs `Blueprint`

Wizard must not pre-build Blueprint.

Blueprint must not behave like a second Wizard.

## Relationship To Pattern Resolution

Blueprint provides hints.

Pattern Resolution decides which current patterns are actually selected.

Blueprint must not claim final resolution.

Pattern Resolution should not need to guess the user's intent from scratch if Blueprint is doing its job correctly.

## Examples

### Example A: Dash Feature

Expected Blueprint behavior:

- small number of modules
- pattern hints around trigger/effect/resource
- no unnecessary subsystem partitioning

### Example B: Talent Selection

Expected Blueprint behavior:

- likely broader than a simple dash
- may justify separate rule/effect/UI-oriented modules
- may propose hints for pool/selection/application/UI

### Example C: Over-Splitting Rejection

A request for a simple local feature should not be exploded into many modules without strong structural need.

## Validation Rules

Blueprint output should be rejected or revised if it:

- emits catalog-external pattern ids
- hides uncertainty
- over-splits without reason
- leaks into file-path or host-binding decisions
- duplicates Wizard behavior instead of organizing intent

Blueprint output is acceptable when it is:

- structurally coherent
- catalog-safe in its hints
- conservative
- useful for downstream resolution

## Open Points

These details may evolve later, but the contract should remain stable:

- exact module heuristics
- exact host-aware context passed in by default
- exact hint density expectations
- whether Blueprint LLM stays optional or becomes standard for certain classes of request

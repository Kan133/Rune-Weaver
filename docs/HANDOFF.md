# Rune Weaver Handoff

## Purpose

This document is the project handoff baseline.

Use it when:
- resuming work after a break
- starting a new Codex / agent session
- aligning a worker agent before implementation

It is intentionally operational. It is not a product pitch.

## Current Working Mode

The current collaboration mode is:

1. You and the lead agent discuss direction, tradeoffs, scope, and product decisions.
2. The lead agent keeps the baseline coherent, reviews results, and updates core docs when needed.
3. Other agents are used for narrower implementation tasks:
   - adapters
   - generators
   - write executor
   - runtime validation
   - pattern drafting
4. The lead agent reviews those outputs conservatively and decides whether a task is actually accepted.

This is important:
- do not let worker agents freely redefine product direction
- do not let worker agents rewrite core docs unless explicitly scoped
- do not let worker agents silently expand host ownership boundaries
- do not let worker agents turn `dota2-cli.ts` into a permanent glue layer for lower-level logic

## Product Baseline

Rune Weaver is a controlled `NL-to-Code` engine.

Current first real host:
- Dota2 `x-template`

Main pipeline:

`Natural Language -> IntentSchema -> Blueprint -> Pattern Resolution -> AssemblyPlan -> Host Realization -> Generator Routing -> Generators -> Host Write / Run`

UI is:
- a code output surface
- not a separate main product line

The project is not trying to:
- generate arbitrary games from one prompt
- rewrite arbitrary host files
- behave like an unconstrained code generator

## Host Ownership Boundary

Rune Weaver currently owns only:

- `game/scripts/src/rune_weaver/**`
- `content/panorama/src/rune_weaver/**`
- a small set of explicitly allowed bridge points

Allowed bridge points:
- `game/scripts/src/modules/index.ts`
- `content/panorama/src/hud/script.tsx`

Rune Weaver does not own:
- user business code
- arbitrary host files
- arbitrary intelligent merge behavior

## Current Pattern Baseline

Current real catalog baseline:

- `input.key_binding`
- `data.weighted_pool`
- `rule.selection_flow`
- `effect.dash`
- `effect.modifier_applier`
- `effect.resource_consume`
- `resource.basic_pool`
- `ui.selection_modal`
- `ui.key_hint`
- `ui.resource_bar`

Pattern model:
- core pattern
- host binding

Pattern pipeline:
- `PatternCandidate`
- `PatternDraft`
- `AdmissionChecklist`

Current rule:
- do not create new patterns casually
- prefer catalog-aligned resolution
- use pattern agents only for explicit candidates, not free discovery

## Current Architecture Status

These foundations are already standing:

- `Wizard -> IntentSchema`
- `IntentSchema -> Blueprint`
- `Blueprint -> Pattern Resolution`
- `Pattern Resolution -> AssemblyPlan`
- Host realization contracts and policy baseline
- generator routing contracts and schema baseline
- Dota2 host planning
- UI adapter generation
- server/shared generator generation
- Write Executor Phase 1
- CLI entry
- workspace state tracking
- runtime validation foundation

Accepted implemented chains:

1. `AssemblyPlan -> UI Adapter`
2. `AssemblyPlan -> Server/Shared Generator`
3. `Write Executor Phase 1`
4. end-to-end minimal run with guarded realism

## Current Reality About the System

What is true now:

- the project can produce real host files in `D:\test1`
- the project can track generated features in `rune-weaver.workspace.json`
- the project has a formal CLI entry
- the project can run runtime validation
- the project can distinguish safer runs from forced / partial runs

What is not yet true:

- the system is not yet a polished product
- not every case is equally reliable
- runtime validation is not yet fully scoped to only RW-owned outputs
- Host Realization and Generator Routing are not yet fully integrated into the running implementation mainline
- `Dota2KVGenerator` is not yet implemented
- semantic incremental update is not yet implemented

## Current CLI Reality

The CLI now exists as a real entry surface.

But its semantics must be read carefully:

- `completionKind` matters more than raw execution success
- `default-safe` means materially stronger than `forced`
- `forced` means readiness was overridden
- `partial` means the chain ran but should not be overclaimed

Do not confuse:
- command executed successfully
- pipeline stages ran
- safe end-to-end completion
- host runtime acceptance

## Workspace State Reality

Workspace state file:
- `D:\test1\rune-weaver.workspace.json`

Current role:
- track generated features
- track generated files
- track bridge bindings
- prevent silent duplicate feature writes

Current feature identity:
- based on `blueprint.id`

Important:
- this is now good enough as a minimal state layer
- it is not yet a full update / rollback system

## Runtime Validation Reality

Runtime validation now exists.

Current distinction:

1. Static host validation
- file existence
- bridge existence
- write-plan alignment

2. Runtime validation
- server-side compile / TypeScriptToLua checks
- UI-side TS/TSX static checks

Important current conclusion:
- the previous major server import-path issue was fixed
- `GameMode` / `dota_ts_adapter` path problems were the main cause of earlier server failures
- server side is now at "host basically acceptable"

Still true:
- current runtime validation is still closer to host-global validation than strict RW-scoped validation

## Current Most Important Open Work

Recommended next mainline step:

1. finish Phase 1 realization integration
   - `HostRealizationPlan`
   - `GeneratorRoutingPlan`
   - `Dota2KVGenerator` v1
   - one real Dota2 end-to-end validation

Recommended after that:

2. tighten runtime validation into RW-scoped validation
3. only then move toward Phase 2 semantic incremental update

Not recommended as the next first step:
- expanding patterns
- adding new hosts
- broad UI expansion
- arbitrary CLI feature surface growth

## Practical Resume Checklist

When resuming tomorrow, do this first:

1. Read:
   - [PRODUCT.md](/D:/Rune%20Weaver/docs/PRODUCT.md)
   - [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
   - [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md)
   - [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)
   - [QA.md](/D:/Rune%20Weaver/docs/QA.md)
   - this file

2. Inspect current CLI / workspace / runtime state:
   - `apps/cli/dota2-cli.ts`
   - `core/workspace/manager.ts`
   - `adapters/dota2/validator/runtime-validator.ts`

3. Check the latest accepted direction:
   - next priority is Phase 1 realization completion, not Phase 2 semantic update

4. Before assigning a worker agent:
   - keep the task narrow
   - do not let it redefine the product baseline
   - require structured reporting

## Agent Usage Rules

### Good tasks for worker agents

- generator fixes
- write executor implementation
- runtime validation implementation
- workspace state implementation
- pattern draft review for explicit candidates

### Bad tasks for worker agents

- redefine product direction
- broad doc rewrites
- unconstrained pattern discovery
- arbitrary host rewrite logic
- vague "clean everything up" requests

### Preferred review loop

1. discuss and decide scope here
2. send a narrow prompt to a worker agent
3. bring its report back
4. have the lead agent review findings conservatively
5. only then mark a task accepted

## Important File Pointers

Core docs:
- [PRODUCT.md](/D:/Rune%20Weaver/docs/PRODUCT.md)
- [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
- [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md)
- [QA.md](/D:/Rune%20Weaver/docs/QA.md)
- [ENGINEERING-GUARDRAILS.md](/D:/Rune%20Weaver/docs/ENGINEERING-GUARDRAILS.md)
- [DOTA2-CLI-SPLIT-PLAN.md](/D:/Rune%20Weaver/docs/DOTA2-CLI-SPLIT-PLAN.md)

Execution docs:
- [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)
- [HOST-INTEGRATION-DOTA2.md](/D:/Rune%20Weaver/docs/HOST-INTEGRATION-DOTA2.md)
- [DOTA2-WRITE-EXECUTOR-PHASE1.md](/D:/Rune%20Weaver/docs/DOTA2-WRITE-EXECUTOR-PHASE1.md)

Pattern docs:
- [PATTERN-MODEL.md](/D:/Rune%20Weaver/docs/PATTERN-MODEL.md)
- [PATTERN-PIPELINE.md](/D:/Rune%20Weaver/docs/PATTERN-PIPELINE.md)
- [PATTERN-SPEC.md](/D:/Rune%20Weaver/docs/PATTERN-SPEC.md)

Operational history:
- [TASKS-COMPLETED.md](/D:/Rune%20Weaver/archive/TASKS-COMPLETED.md)

## Encoding / Tooling Note

PowerShell may display UTF-8 Chinese incorrectly unless:

```powershell
chcp 65001
```

So:
- prefer file-reading tools
- do not trust raw PowerShell rendering of UTF-8 docs

## If You Need One Sentence

Rune Weaver is currently a controlled Dota2-first `NL-to-Code` system with working planning, generation, writing, workspace tracking, and basic runtime validation; the next real step is Phase 1 realization completion, not premature semantic incremental update.

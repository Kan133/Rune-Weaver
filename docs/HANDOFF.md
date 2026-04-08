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
- generator routing contracts and schema baseline (lua route added)
- Dota2 host planning
- UI adapter generation
- server/shared generator generation
- Write Executor Phase 1
- CLI entry
- workspace state tracking
- runtime validation foundation

**T121–T126 mainlined additions:**

- **dota_ts_adapter repair** — mainlined via init/refresh (no longer a temporary patch)
- **baseline migration** — XLSXContent -> DOTAAbilities in refresh main path
- **lua entry production** — normal pipeline produces `contentType: "lua"` entries
- **lua code generation** — same-file ability + modifier Lua output
- **lua write integration** — write executor writes `.lua` files to host
- **first real Dota2 E2E validation** — baseline 3 abilities + RW ability castable with modifier/buff

Accepted implemented chains:

1. `AssemblyPlan -> UI Adapter`
2. `AssemblyPlan -> Server/Shared Generator`
3. `AssemblyPlan -> Lua Generator -> Write Executor` (narrow scope: short_time_buff-style)
4. `Write Executor Phase 1`
5. end-to-end minimal run with guarded realism (T121 verified)

## Current Reality About the System

What is true now (as of T126/T127):

- the project can produce real host files in `D:\test1`
- the project can track generated features in `rune-weaver.workspace.json`
- the project has a formal CLI entry
- the project can run runtime validation
- the project can distinguish safer runs from forced / partial runs
- **the project has achieved minimal real Dota2 E2E** (T121): RW ability attaches, casts, shows buff ~6s
- **lua write path is mainlined** (T125): pipeline → generate → write `.lua` files end-to-end
- **old KV→lua bypass is retired**: formal execution path no longer uses it

### Lifecycle Verification (T132–T134)

As of recent verification:

- **Combined lifecycle now works at Phase 1 baseline**: `create → update → regenerate → rollback` runs end-to-end on real host
- **`update` may legitimately return `requiresRegenerate`**: This is a safety gate, not a bug. When change ratio is too high, update refuses partial write and recommends regenerate
- **`regenerate` now persists workspace state correctly** (T134-R1): Current revision's `generatedFiles` are correctly written to workspace after regenerate completes
- **`rollback` now uses workspace as source of truth**: Rollback plan reads `feature.generatedFiles` from workspace and deletes exactly those files for the current revision

This means:
- The mainline pipeline is now coherent enough for Phase 1
- Workspace is now the source of truth for rollback decisions
- Update → Regenerate relationship is intentional and documented

This does NOT mean:
- Lifecycle is "fully polished"
- Every edge case is covered
- Phase 2 incremental update is implemented

What is NOT yet true:

- the system is not yet a polished product
- not every case is equally reliable
- runtime validation is not yet fully scoped to only RW-owned outputs
- lua pattern support is narrow: only `short_time_buff`-style cases work
- `T128-R1` validated a second lua archetype through explicit `archetype` metadata only; it did **not** admit a new pattern and did **not** formally expand pattern-model semantics
- visual/numeric effect quality is minimal viable, not polished
- multi-ability composition is untested
- **lifecycle safety verified at Phase 1 baseline** (T132-T134): create → update → regenerate → rollback runs end-to-end on real host
- Generator Routing for KV/TS/lua coordination is partially established (T143 improved kv+lua formalization)
- **boundary**: improved routing does NOT mean lua generator is fully mature or Wizard pattern selection is solved
- **kv+lua generation evidence** (T144): same formal path produces both `.lua` output and KV output; this is generator-ready evidence, NOT full CLI E2E or broader lua maturity
- **buff-entry stability improved** (T146): positive buff prompts reliably map to dota2.short_time_buff; debuff prompts reliably avoid it
- **TS/Lua boundary**: dota2-ts and dota2-lua represent authoring paths into the same Dota2 Lua runtime, not two runtime languages
- **outputs migration progressing** (T148, T149): explicit outputs[] now in HostRealizationUnit and AssemblyModule; routing supports outputs-first with realizationType fallback; compatibility fields remain; dota2-specific pattern assembly gap is being handled separately
- **dota2 pattern assembly gap fixed** (T150): dota2-specific patterns now survive assembly construction; dota2.short_time_buff passes full pipeline to write plan
- **next architectural focus**: explicit module grouping via BlueprintModule.patternIds[], not immediate composite feature implementation
- **Blueprint module grouping accepted** (T151): explicit grouping contract now exists in schema/assembly; semantics clarified: patternIds[] takes intersection with resolved patterns; next focus is upstream production in BlueprintBuilder
- **BlueprintBuilder grouping production under refinement** (T152): initial patternIds[] production was too eager (effect-category canonicalization); not yet accepted; T152-R1 is the correct rework direction
- **stable vs polymorphic category rule** (T152-R1, R150): stable single-path categories produce patternIds[]; polymorphic categories (effect, resource) do not pre-populate canonical patternIds; resolver remains source of truth for effect-side selection; no new signal layer needed; avoid over-engineering or premature canonicalization
- **generic vs specialized effect pattern** (R152): effect-inclusive composite spike may surface both generic (effect.modifier_applier) and specialized (dota2.short_time_buff) patterns; this should not be treated as intended additive layering; specialized pattern should be preferred over generic fallback when semantics overlap; current co-occurrence is a known limitation, not accepted permanent semantics
- **resolver refinement landed for current effect overlap** (T156): in the current short_time_buff-style overlap, specialized effect pattern now wins over generic fallback; treat this as a narrow fix, not a full generic-vs-specialized effect precedence system
- **composite orchestration baseline verified** (T157): trigger + rule + ui + effect composite now flows through full pipeline with correct multi-output (TS + KV + LUA + UI); UI output path and effect-side kv+lua output can coexist in same composite; this establishes composite orchestration baseline, NOT full composite feature completion; downstream write/runtime integration and data/shared-flow complexity remain outside current scope
- **composite generation/write-plan baseline verified** (T158): trigger + rule + ui + effect composite now reaches generation / write-plan; UI + TS + KV + LUA outputs can be generated simultaneously; write plan target mapping is formed; this should not be read as actual write execution, workspace persistence, or runtime validation being complete
- **composite actual write evidence verified** (T159): TS / UI / KV / LUA artifacts actually written to disk; host artifact presence verified; current verification is through direct file write, bypassing formal CLI executor path; do not treat this as full formal CLI write-execution path verification
- **KV generation contract convergence** (T160-R1): formal generation path now handles KV correctly; composite baseline can produce correct KV through formal path without CLI helper bypass; do not treat this as runtime/playability closure
- **composite runtime-facing baseline verified** (T160-V1): trigger + rule + ui + effect composite baseline now passes formal generation/write/host-facing validation; TS / UI / KV / LUA outputs all work through formal path; do not treat this as gameplay verification or full product readiness
- **structural gameplay-ready baseline verified** (T161): trigger + rule + ui + effect composite baseline is structurally gameplay-ready; TS / UI / KV / LUA artifacts are structurally correct, syntactically correct, host-facing layout correct; do not treat this as actual Dota2 gameplay verification; remaining gap is environmental/runtime execution, not system architecture
- **data-weighted-pool composite integration** (T162): data.weighted_pool integrates into composite as shared-ts; data module resolves as shared-ts, not KV producer; do not treat data path as producing KV; prior mismatch was reporting error, not implementation bug
- **data-weighted-pool contract alignment** (T163-R1): data.weighted_pool metadata now aligns with shared-ts contract; data module still works as shared-ts; previous data KV expectation was contract drift and has been removed; data should be read as typescript-only in current Dota2 host contract
- **data-inclusive structural gameplay-ready baseline verified** (T164): input.key_binding + data.weighted_pool + rule.selection_flow + ui.selection_modal + dota2.short_time_buff chain verified; do not treat this as actual Dota2 gameplay verification; remaining gap is environmental/runtime execution, not system architecture
- **real-environment write/build-ready baseline verified** (T165-R1): data-inclusive composite baseline now supports actual write and workspace persistence in real host environment; TS / UI / KV / LUA artifacts actually written and persisted; do not treat this as actual Dota2 client gameplay verification; remaining gap is actual compile/build execution and in-client gameplay verification, not system architecture
- **toolchain/environment gap** (R166): current system baseline is architecturally close, but full compile/build/in-client closure still depends on repo toolchain completion (tstl, build scripts) and external Dota2 environment; do not treat current gap as core architecture weakness
- **data-inclusive composite no new blocker** (T167): trigger + data + rule + ui + effect backbone is now considered system-level sufficient for near-term talent-drafting-like case entry; data.weighted_pool as shared-ts works correctly; ui.selection_modal coexists with data/effect/trigger/rule without interference; do not confuse this with actual client validation or completed case implementation
- **minimal talent-drafting case closure** (T170): current backbone is now sufficient to express and close a minimal talent-drafting-like case; input.key_binding + data.weighted_pool + rule.selection_flow + ui.selection_modal + dota2.short_time_buff chain verified; remaining gaps are primarily case-specific details (talent pool data, selection rule refinement, UI specifics, buff/effect parameters), not system-level blockers; do not confuse this with complete talent drafting product implementation
- **placeholder talent-drafting case closure through formal pipeline** (T171): backbone now supports a placeholder talent-drafting case through the formal generation/write path; all five module categories (input, data, rule, ui, effect) work together in formal generation path; remaining gaps are primarily case-specific data/rule/ui/effect detail filling; do not confuse this with complete talent drafting product completion or in-client playability verification
- **BlueprintModule.parameters pipeline flow** (T172-R1): BlueprintModule.parameters now flow through formal pipeline to generation layer; case-specific parameters can enter generated artifacts
- **five-module backbone consistency restored** (T173-R1): talent-drafting case-specific fill now restores five-module backbone consistency; current talent-drafting parameterized path again aligns with five-module backbone (trigger, data, rule, ui, effect); do not treat the current trigger choice as final long-term trigger modeling
- **code-level formal-pipeline closure** (V174): current talent-drafting parameterized path is now code-level complete through the formal pipeline with restored five-module backbone; this supports Phase 1 architecture/case-construction closure; do not treat this as full CLI/runtime/client closure
- **Phase 1 closure assessment** (D175): current project status should be read as near-complete Phase 1 closure on architecture and case-construction, not full runtime/product closure; composite backbone, data-inclusive composite, minimal talent-drafting-like case, placeholder talent-drafting case, case-specific parameter flow, and five-module backbone all verified; remaining gaps are primarily toolchain/environment and Phase 2 productization capabilities (Wizard, LLM Blueprint planning, hook composition, scene reference)
- **future boundary for effect precedence**: if more specialized effect patterns are introduced later, precedence should move toward explicit mapping rather than broader `dota2.*` prefix special-casing
- semantic incremental update is not yet implemented (Phase 2)

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

### Completed (do not re-do)

- ~~Phase 1 realization integration (lua path)~~ → done (T125)
- ~~one real Dota2 end-to-end validation~~ → done (T121)
- ~~dota_ts_adapter repair~~ → mainlined (T097-T99 → T121)
- ~~baseline migration~~ → in refresh main path (T121)
- ~~lua write path mainlined~~ → done (T125)
- ~~documentation consolidation~~ → done (T126)
- ~~lifecycle E2E verification~~ → done (T132-T134)
  - Combined lifecycle verified at Phase 1 baseline
  - Update requiresRegenerate safety gate confirmed working
  - Regenerate workspace persistence fixed (T134-R1)
  - Rollback now uses workspace as source of truth

### Tomorrow's natural next steps (in priority order)

1. **Second lua archetype** — extend lua pattern support beyond `short_time_buff` (e.g., DOT, stun, heal); define metadata schema for the new archetype
2. **Lifecycle E2E verification** — run create → update → regenerate → rollback on real host; confirm workspace state stays consistent
3. **Effect quality improvement** — move from minimal viable toward playable quality (particle, sound, value tuning for existing short_time_buff)
4. **Formalize multi-generator routing** — coordinate KV + TS + lua generator routes through formal Generator Routing

### Not recommended as the next first step

- expanding patterns beyond Dota2
- adding new hosts
- broad UI expansion
- arbitrary CLI feature surface growth
- Phase 2 semantic incremental update

## Practical Resume Checklist

When resuming tomorrow, do this first:

1. Read:
   - [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md) (this file — start here)
   - [TASK-COMPLETION.md](/D:/Rune%20Weaver/docs/TASK-COMPLETION.md)
   - [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
   - [ROADMAP.md](/D:/Rune%20Weaver/docs/ROADMAP.md)

2. Know the current state at a glance:
   - T121: minimal E2E achieved (not polished)
   - T125: lua path mainlined (narrow scope)
   - T126: docs consolidated
   - Phase 1: ~80-92%, late stage
   - **Next**: generator routing formalization, richer host verification, or effect quality improvement

3. Inspect current CLI / workspace / runtime state:
   - `apps/cli/dota2-cli.ts`
   - `core/workspace/manager.ts`
   - `adapters/dota2/validator/runtime-validator.ts`

4. Before assigning a worker agent:
   - keep the task narrow
   - do not let it redefine the product baseline
   - require structured reporting
   - remember: lua is narrow-scope only, E2E is minimal-viable only

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

This section classifies docs to help agents understand reading priority. Current phase is Phase 1 near-closure.

### Minimum Must-Read Set (Start Here)
When resuming work, read these first to understand current status:
- PRODUCT.md (what Rune Weaver is and targets)
- PHASE-ROADMAP-ZH.md (current phase and boundaries)
- HANDOFF.md (current handoff baseline - you are here)
- ARCHITECTURE.md (system architecture)
- SCHEMA.md (core data structures)

### Core Active Docs (Current Guidance)
These docs reflect current active project state:
- PRODUCT.md
- PHASE-ROADMAP-ZH.md
- HOST-EXTENSION-GUARDRAILS-ZH.md
- ARCHITECTURE.md
- SCHEMA.md
- TASK-COMPLETION.md
- QA.md
- ENGINEERING-GUARDRAILS.md

### Host-Specific Active Docs
These are Dota2-specific implementation details. Read when working on Dota2 host:
- HOST-INTEGRATION-DOTA2.md
- DOTA2-CLI-SPLIT-PLAN.md
- DOTA2-WRITE-EXECUTOR-PHASE1.md
- WORKSPACE-MODEL.md
- PATTERN-MODEL.md
- PATTERN-PIPELINE.md
- PATTERN-SPEC.md

### Future / Phase 2 Reference Docs
These docs describe future capabilities. Do not treat as current guidance:
- UI-WIZARD-INTAKE-CONTRACT.md
- WIZARD-INTENT-CONTRACT.md
- WIZARD-BLUEPRINT-CHAIN.md

### Historical / Narrow Scope Docs
These docs represent historical reasoning or narrow exploration. Should not be default navigation:
- Most Dota2-specific narrow scope docs created during early exploration
- Old migration notes (MULTI-OUTPUT-REALIZATION-MIGRATION.md, etc.)
- Historical reasoning docs (BRIDGE-UPDATE-PLANNING.md, GENERALIZATION-REVIEW.md)

### Do Not Use As Primary Navigation
Many docs in docs/ are host-specific, historical, or Phase 2 premature. If unsure, start with Minimum Must-Read Set above.

Core docs:
- [PRODUCT.md](/D:/Rune%20Weaver/docs/PRODUCT.md)
- [SYSTEM-ARCHITECTURE-ZH.md](/D:/Rune%20Weaver/docs/SYSTEM-ARCHITECTURE-ZH.md)
- [PHASE-ROADMAP-ZH.md](/D:/Rune%20Weaver/docs/PHASE-ROADMAP-ZH.md)
- [PHASE2-PLAN-ZH.md](/D:/Rune%20Weaver/docs/PHASE2-PLAN-ZH.md)
- [PHASE2-EXECUTION-CHECKLIST-ZH.md](/D:/Rune%20Weaver/docs/PHASE2-EXECUTION-CHECKLIST-ZH.md)
- [HOST-EXTENSION-GUARDRAILS-ZH.md](/D:/Rune%20Weaver/docs/HOST-EXTENSION-GUARDRAILS-ZH.md)
- [UI-WIZARD-GUARDRAILS-ZH.md](/D:/Rune%20Weaver/docs/UI-WIZARD-GUARDRAILS-ZH.md)
- [GAP-FILL-GUARDRAILS-ZH.md](/D:/Rune%20Weaver/docs/GAP-FILL-GUARDRAILS-ZH.md)
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

Rune Weaver is currently a controlled Dota2-first `NL-to-Code` system with **minimal real E2E verified** (T121), **lua write path mainlined** (T125, narrow scope), **lifecycle baseline verified** (T132-T134), and **CLI remediation phase closed** (T139-T142); the next natural directions are generator routing formalization, richer host verification, or effect quality improvement.

---

## Historical Script Boundary (T127)

The following scripts in `scripts/` are **historical repair/debug evidence** from T121 and T125 iteration:

### T121 repair scripts (`run-t121-*.ts`)

- `run-t121-baseline-migration.ts`
- `run-t121-r13-rw-fix.ts`
- `run-t121-r15-buff-fix.ts`
- `run-t121-r16-fresh-identity.ts`
- `run-t121-r17-mount-ability.ts`
- `run-t121-r18-modifier-fix.ts`
- `run-t121-r19-samefile-fix.ts`
- `run-t121-r20-apply-fix.ts`

**Status**: archive/debug reference. These were iterative fix scripts used during T121 E2E validation. They are **not** the current mainline implementation path. The fixes they validated have been absorbed into the formal pipeline. Do not treat these as active implementation.

### T125 dry-run/verify scripts (`dry-run-t125-*.ts`)

- `dry-run-t125-r1-lua-mainline.ts`
- `dry-run-t125-r2-normal-pipeline.ts`
- `dry-run-t125-r3-mainline-write.ts`
- `dry-run-t125-r3-verify-write.ts`

**Status**: archive/debug reference. These were dry-run verification scripts for lua path mainlining during T125. The behavior they verified is now in the formal mainline. Do not treat these as active implementation.

**Rule**: When working on lua or E2E related code, always modify the formal adapter/generator/executor modules under `adapters/dota2/`, not these historical scripts. These scripts remain in place only as evidence of how the current state was reached.

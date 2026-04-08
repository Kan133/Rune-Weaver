# Task Completion

## Purpose

This document tracks current execution progress for the Rune Weaver project.

It is intentionally shorter-lived than `ROADMAP.md`.

- `ROADMAP.md` defines phase goals and sequencing.
- `TASK-COMPLETION.md` records what is already done, what is in progress, and what can run in parallel next.

## Current State

### Phase Status

- Phase 1: in progress, roughly `88% - 92%`
- Phase 2: defined but not implemented
- Phase 3: not started

### What Phase 1 Already Has

- runtime validation minimal foundation
- server host import strategy repair (**dota_ts_adapter mainlined**)
- regenerate cleanup baseline
- rollback baseline
- update maintenance baseline
- workspace state baseline
- architecture and contract baseline
- Host Realization / Generator Routing contracts documented
- **baseline migration in refresh main path** (XLSXContent -> DOTAAbilities)
- **lua entry production** (normal pipeline produces `contentType: "lua"` entries)
- **lua write integration** (write executor writes `.lua` files)
- **first real Dota2 E2E validation achieved** (T121)
- **combined lifecycle baseline verified** (`create -> update -> regenerate -> rollback`, T132-T134)
- **effect quality improved on an existing mainline ability** (T136)
- **numeric parameter propagation formalized for the current mainline KV path** (T138)
- **CLI remediation started** (T139-T140)

### What Phase 1 Still Needs

- broader lua pattern support beyond short_time_buff
- formal Generator Routing for KV/TS/lua multi-generator coordination
- realization-aware artifact / validation / workspace refinement
- richer visual/numeric effect quality beyond the first accepted pass
- broader host verification beyond current baseline-adjacent cases

## Completed Work

### Completed

- `T094-T096`
  - runtime validation minimal foundation
  - CLI integration for runtime validation
- `T097-T099`
  - Dota2 server host import strategy repair
  - **dota_ts_adapter repair mainlined via init/refresh**
  - server-side compile failure category significantly reduced
- `T100-T103`
  - regenerate cleanup minimal foundation
  - mainline integration completed
- `T104-T107`
  - rollback minimal foundation
  - mainline integration and artifact semantics tightening completed
- `T108-T111`
  - update semantics refinement
  - update now works as a conservative maintenance path
  - unsafe update correctly escalates to regenerate
- `T121`
  - Minimal Real Dota2 E2E validation achieved
  - baseline 3 abilities appear correctly in host
  - fresh RW identity ability attaches to hero, is castable
  - correct mana cost and cooldown behavior
  - modifier creates successfully, buff appears ~6 seconds
  - **quality boundary**: visual/numeric effects are minimal viable, NOT polished
- `T125`
  - Lua write path mainlined
  - normal pipeline produces `contentType: "lua"` entries
  - generator emits same-file ability + modifier Lua code
  - write executor writes `.lua` files to host path successfully
  - old KV->lua bypass has exited formal execution path
  - **scope boundary**: lua metadata converges on `short_time_buff`-style cases only
  - this is NOT a general-purpose lua ability framework
- `T126-T127`
  - documentation / handoff baseline consolidated
  - project entry docs updated to reflect mainlined status, limits, and next-step priorities
- `T128-R1`
  - second lua archetype validated at schema-extensibility level only
  - explicit `archetype` metadata path established without admitting a new pattern
  - **boundary**: this is NOT pattern expansion and NOT a general lua framework claim
- `T132-T134`
  - combined lifecycle baseline verified on real host
  - `update -> requiresRegenerate` confirmed as intended safety semantics
  - regenerate workspace persistence repaired
  - rollback now uses workspace current revision state as source of truth
- `T135-T136-D1`
  - handoff / index / workspace docs updated to reflect lifecycle and lua boundary reality
- `T136`
  - existing mainline ability effect quality improved
  - buff / debuff particle and sound feedback upgraded without widening scope
- `T137`
  - richer host verification run across multiple baseline-adjacent cases
  - mainline confidence increased and non-blocker limits surfaced
- `T138`
  - numeric parameter propagation fixed for the current mainline KV path
  - cooldown / mana / cast range now travel through formal planning objects into KV output
- `T139`
  - artifact / verdict semantics extracted out of `dota2-cli.ts`
  - CLI remediation Phase B started without changing command shell behavior
- `T140`
  - validation orchestration extracted out of `dota2-cli.ts`
  - CLI remediation Phase C started pending ongoing regression validation
- `T142`
  - maintenance command flow thinning reviewed
  - conclusion: current maintenance flows are already "thin but visible" — no further extraction accepted at this time
  - CLI remediation phase closed as no-op pending future re-evaluation
- `T143`
  - generator routing formalization improved to cover `kv+lua` reality
  - short_time_buff can now be modeled as dual-route (lua + kv)
  - matching now works by output side: lua output -> dota2-lua, kv output -> dota2-kv
  - boundary: this does NOT mean lua generator is fully mature or Wizard pattern selection is solved
- `T144`
  - kv+lua narrow path now has direct generation evidence
  - same formal path produces both `.lua` output and KV output
  - boundary: this does NOT mean lua is general-purpose; full CLI E2E / broader lua maturity remain separate concerns
- `T146`
  - short_time_buff entry stability improved
  - positive buff prompts now reliably map to dota2.short_time_buff
  - negative debuff prompts now reliably avoid dota2.short_time_buff
  - boundary: this does NOT mean full CLI/host E2E is complete or broader lua maturity is achieved
- `T148`
  - HostRealizationUnit.outputs[] introduced
  - routing now supports outputs-first with realizationType fallback
- `T149`
  - AssemblyModule.outputs[] introduced
  - outputKinds still preserved for compatibility
  - boundary: explicit outputs migration still early; compatibility mode remains; composite feature not ready
- `T150`
  - dota2-specific patterns now survive assembly construction
  - dota2.short_time_buff passes assembly -> realization -> routing -> write plan
  - next likely step: minimal BlueprintModule grouping contract
- `T151`
  - BlueprintModule.patternIds[] accepted
  - explicit grouping declaration semantics clarified: takes intersection with resolved patterns, not standalone override
  - next likely step: upstream production of patternIds[] in BlueprintBuilder
- `T152`
  - NOT accepted: BlueprintBuilder default effect category产出 `patternIds: ["effect.modifier_applier"]` conflicts with `patternIds[] ∩ resolved patterns` semantics
  - upstream patternIds[] production is in refinement
  - next step is T152-R1: narrow production for stable single-path categories
- `T152-R1`
  - accepted: stable single-path categories still produce patternIds[]
  - polymorphic categories (effect, resource) do not pre-populate canonical patternIds
  - resolver remains source of truth for effect-side selection
  - R150 concluded: no new signal layer needed; avoid over-engineering or premature canonicalization
  - R152 clarified: generic effect fallback and specialized effect pattern should be treated as alternatives, not accepted additive layering
- `T156`
  - accepted: resolver now narrows generic vs specialized effect overlap so specialized effect pattern wins over generic fallback in the current short_time_buff-style case
  - boundary: this is a narrow resolver refinement, not a full effect taxonomy redesign
  - future note: if more specialized effect patterns appear, generic-vs-specialized precedence should evolve toward explicit mapping rather than wider `dota2.*` prefix special-casing
- `T157`
  - accepted: trigger + rule + ui + effect composite baseline verified through orchestration spike
  - composite now flows through: Blueprint -> Assembly -> Realization -> Routing with correct multi-output (TS + KV + LUA + UI)
  - boundary: this is composite orchestration baseline only, NOT full composite feature completion
  - UI output path and effect-side kv+lua output can coexist in same composite
  - downstream write/runtime integration still outside current scope
  - data/shared-flow complexity remains unvalidated
- `T158`
  - accepted: trigger + rule + ui + effect composite baseline now reaches generation / write-plan
  - UI + TS + KV + LUA outputs can be generated simultaneously
  - write plan target mapping is formed
  - boundary: not yet full actual write execution, workspace persistence, or runtime verification
- `T159`
  - accepted: composite baseline now has core actual write evidence
  - TS / UI / KV / LUA artifacts actually written to disk
  - host artifact presence verified
  - boundary: formal CLI write-execution path not fully closed by this task
- `T160-R1`
  - accepted: formal generation path now handles KV correctly
  - composite baseline can produce correct KV through formal path without CLI helper bypass
  - boundary: generation contract convergence only, not runtime verification
- `T160-V1`
  - accepted: composite baseline now reaches runtime-facing readiness after KV generation convergence
  - TS / UI / KV / LUA outputs can be generated and written through formal path
  - boundary: gameplay/playability still not verified
- `T161`
  - accepted: composite baseline now reaches structural gameplay-ready state
  - TS / UI / KV / LUA artifacts are structurally correct, syntactically correct, host-facing layout correct
  - boundary: actual gameplay/playability still requires real Dota2 environment validation

- `T162`
  - accepted with corrected reporting: data.weighted_pool integrates into composite as shared-ts
  - data module resolves as shared-ts, not KV producer
  - boundary: data does not produce KV; earlier KV mention was report error
- `T163-R1`
  - accepted: data.weighted_pool metadata now aligns with shared-ts contract
  - data module still works as shared-ts
  - data no longer carries KV output expectation
- `T164`
  - accepted: data-inclusive composite baseline now reaches structural gameplay-ready state
  - input.key_binding + data.weighted_pool + rule.selection_flow + ui.selection_modal + dota2.short_time_buff chain verified
  - boundary: actual gameplay/playability still requires real Dota2 environment validation
- `T165-R1`
  - accepted: data-inclusive composite baseline now reaches real-environment write/build-ready state
  - TS / UI / KV / LUA artifacts actually written and persisted
  - boundary: actual Dota2 client gameplay/playability still requires real environment execution and in-client validation
- `R166`
  - clarified: remaining blockers are toolchain/environment-related
  - repo still lacks tstl/build tooling needed for full compile/build validation
  - Dota2 client is external environment dependency
- `T167`
  - accepted: data-inclusive composite introduced no new system-level blocker
  - data.weighted_pool as shared-ts works correctly
  - ui.selection_modal coexists with data/effect/trigger/rule without interference
  - current backbone is basically sufficient for talent-drafting-like case entry
- `T170`
  - accepted: minimal talent-drafting-like case now closes on current backbone
  - input.key_binding + data.weighted_pool + rule.selection_flow + ui.selection_modal + dota2.short_time_buff chain verified
  - remaining gaps are primarily case-specific details, not system-level blockers
- `T171`
  - accepted: placeholder talent-drafting-like case now closes through the formal pipeline
  - all five module categories (input, data, rule, ui, effect) work together in formal generation path
  - remaining gaps are primarily case-specific data/rule/ui/effect detail filling
- `T172-R1`
  - accepted: BlueprintModule.parameters now flow through formal pipeline to generation layer
  - case-specific parameters can enter generated artifacts
- `T173-R1`
  - accepted: talent-drafting case-specific fill now restores five-module backbone consistency
  - current trigger is a minimal explicit trigger
  - boundary: current trigger is a minimal explicit trigger, not final trigger semantics
- `V174`
  - confirmed: code-level formal-pipeline closure for the parameterized talent-drafting path
  - five-module backbone restored, parameter flow贯通 to generator
  - boundary: this supports Phase 1 architecture/case-construction closure, but not full environment/runtime closure

### Documentation Baseline Completed

- Wizard / Blueprint / Host Realization / Generator Routing contracts established
- roadmap and phase separation established
- engineering guardrails documented
- Dota2 CLI split plan documented
- docs audit P0/P1 cleanup completed

## In Progress

### Active

- no major implementation task is recorded here as currently in progress
- CLI remediation phase is closed after T139-T141; future re-evaluation is possible

### Near-Term Recommended

- formalize Generator Routing for KV/TS/lua coordination
- extend host verification to richer but still controlled cases
- improve visual/numeric effect quality beyond the first accepted pass

## Not Started Yet

### Phase 1 Remaining Work

- broader lua ability pattern support (beyond short_time_buff)
- richer visual/numeric effect quality beyond the first accepted pass
- formal multi-generator routing (KV + TS + lua coordination)
- broader host/lifecycle verification beyond current baseline-adjacent cases
- realization-aware validation and review artifact refinement

### Phase 2 Future Work

- feature semantic state
- update intent contract for semantic update
- entity-aware update planning
- semantic incremental update inside existing systems

## Recommended Next Sequence

1. formalize Generator Routing for multi-generator coordination
2. improve visual/numeric effect quality beyond the first accepted pass
3. extend host verification across richer but still controlled cases
4. refine realization-aware validation and review artifacts

## Parallelizable Work

These can run in parallel if scopes remain narrow and do not re-thicken `dota2-cli.ts`.

### Parallel Track A

`Generator routing formalization prep`

Suggested scope:

- tighten KV / TS / lua routing boundaries
- identify the smallest formal routing extraction worth doing next
- do not start a broad generator refactor yet

### Parallel Track B

`Richer host verification follow-up`

Suggested scope:

- expand verification to richer but still baseline-adjacent cases
- confirm current stability boundaries remain accurate
- avoid turning verification into capability expansion

## Non-Goals Right Now

- semantic incremental update (Phase 2)
- second host
- broader pattern expansion beyond Dota2
- further tuning of update thresholds
- general-purpose lua ability framework (current scope is narrow)

## Review Notes

- treat T121 as "minimal E2E achieved, quality improvement needed", NOT as "Phase 1 complete"
- treat T125 as "lua path mainlined for narrow scope", NOT as "general lua framework done"
- treat T128 as "schema-extensibility validated", NOT as "new lua pattern admitted"
- treat `HostRealizationPlan` as functional for lua route; broader KV/TS routing still needs formalization
- do not claim Phase 1 fully polished just because baseline lifecycle now works

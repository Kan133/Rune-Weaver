# Task Completion

## Purpose

This document tracks current execution progress for the Rune Weaver project.

It is intentionally shorter-lived than `ROADMAP.md`.

- `ROADMAP.md` defines phase goals and sequencing.
- `TASK-COMPLETION.md` records what is already done, what is in progress, and what can run in parallel next.

## Current State

### Phase Status

- Phase 1: in progress, roughly `80% - 85%`
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

### What Phase 1 Still Needs

- broader lua pattern support beyond short_time_buff
- richer visual/numeric effect quality beyond minimal viable
- formal Generator Routing for KV/TS/lua multi-generator coordination
- realization-aware artifact / validation / workspace refinement
- lifecycle safety end-to-end verification on real host

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
- `T121` — Minimal Real Dota2 E2E Validation
  - baseline 3 abilities appear correctly in host
  - fresh RW identity ability attaches to hero, is castable
  - correct mana cost and cooldown behavior
  - modifier creates successfully, buff appears ~6 seconds
  - **quality boundary**: visual/numeric effects are minimal viable, NOT polished
  - this satisfies Phase 1 DoD item #4 (real Dota2 end-to-end validation)
  - **not a claim of complete or polished gameplay**
- `T125` — Lua Write Path Mainlined
  - normal pipeline produces `contentType: "lua"` entries
  - generator emits same-file ability + modifier Lua code
  - write executor writes `.lua` files to host path successfully
  - old KV→lua bypass has exited formal execution path
  - **scope boundary**: lua metadata converges on `short_time_buff`-style cases only
  - this is NOT a general-purpose lua ability framework

### Documentation Baseline Completed

- Wizard / Blueprint / Host Realization / Generator Routing contracts established
- roadmap and phase separation established
- engineering guardrails documented
- Dota2 CLI split plan documented
- docs audit P0/P1 cleanup completed

## In Progress

### Active

- `T126` — Documentation Consolidation (this task)
  - consolidating T121/T125 conclusions into all core docs
  - ensuring docs accurately reflect mainlined capabilities AND current boundaries
  - preventing overstatement of current abilities

### Near-Term Recommended (Post-T126)

- broaden lua pattern support beyond short_time_buff
- improve visual/numeric effect quality toward playable (not just minimal viable)
- formalize Generator Routing for KV/TS/lua coordination
- realization-aware validation/artifact refinement

## Not Started Yet

### Phase 1 Remaining Work

- broader lua ability pattern support (beyond short_time_buff)
- richer visual/numeric effect quality
- formal multi-generator routing (KV + TS + lua coordination)
- lifecycle safety end-to-end on real host (create → update → regenerate → rollback)
- realization-aware validation and review artifact refinement

### Phase 2 Future Work

- feature semantic state
- update intent contract for semantic update
- entity-aware update planning
- semantic incremental update inside existing systems

## Recommended Next Sequence

1. complete `T126` (documentation consolidation — in progress)
2. broaden lua pattern support beyond short_time_buff
3. improve visual/numeric effect quality toward playable
4. formalize Generator Routing for multi-generator coordination
5. refine realization-aware validation and review artifacts
6. run lifecycle safety end-to-end verification on real host

## Parallelizable Work

These can run in parallel with documentation consolidation if scopes remain narrow.

### Parallel Track A

`Lua pattern expansion design`

Suggested scope:

- identify next lua ability archetype beyond short_time_buff (e.g., damage-over-time, stun, heal)
- define minimal metadata schema for the new archetype
- prepare fixtures / test inputs
- do not fully implement yet

### Parallel Track B

`Effect quality improvement prep`

Suggested scope:

- survey current visual/numeric effect gaps for short_time_buff
- identify minimal set of improvements toward "playable" quality
- plan particle/sound/value tuning approach
- do not do full gameplay polish pass yet

## Non-Goals Right Now

- semantic incremental update (Phase 2)
- second host
- broader pattern expansion beyond Dota2
- further tuning of update thresholds
- general-purpose lua ability framework (current scope is narrow)

## Review Notes

- treat T121 as "minimal E2E achieved, quality improvement needed" — NOT as "Phase 1 complete"
- treat T125 as "lua path mainlined for narrow scope" — NOT as "general lua framework done"
- treat `HostRealizationPlan` as functional for lua route; broader KV/TS routing still needs formalization
- do not claim Phase 1 complete until lifecycle safety is verified end-to-end on real host

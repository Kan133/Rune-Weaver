# ROADMAP

## Purpose

This document defines the current phased roadmap for Rune Weaver.

Its purpose is to keep the project from mixing:

- single-feature baseline work
- host realization work
- true semantic incremental update

before the required lower layers are stable.

## Current Planning Principle

Rune Weaver should progress in phases.

The current project should not treat complex semantic incremental update as already available.

The correct near-term priority is:

- finish the single-feature realization baseline
- complete a real Dota2 end-to-end validation
- only then move into semantic incremental update

## Phase 1: Single-Feature Realization Baseline

### Goal

Establish a trustworthy single-feature pipeline from natural language to real Dota2 host output.

### Scope

Phase 1 should include:

- Wizard -> IntentSchema
- Blueprint orchestration
- Pattern Resolution
- AssemblyPlan
- HostRealizationPlan
- GeneratorRoutingPlan
- Dota2TSGenerator
- Dota2UIGenerator
- Dota2KVGenerator v1
- Write / Validation / Workspace / Lifecycle safety

### Phase 1 Target

At least one conservative, reviewable feature should complete the full path and be tested in a real Dota2 host workflow.

### Phase 1 Definition Of Done

Phase 1 is considered complete only when all of the following are true:

1. Host Realization is part of the formal mainline architecture.
2. Generator Routing is part of the formal mainline architecture.
3. `Dota2KVGenerator` v1 exists and can participate in real generation.
4. At least one feature completes a real Dota2 end-to-end validation path.
5. The feature is still lifecycle-safe:
   - create
   - update
   - regenerate
   - rollback
6. Review artifacts remain truthful and unified.

### Phase 1 Non-Goals

Phase 1 should not claim:

- semantic entity-level incremental update
- rich system evolution inside an existing complex feature
- automatic multi-entity refactoring

Those belong to later phases.

## Phase 2: Semantic Incremental Update

### Goal

Support structured evolution of an existing feature, not just file-level maintenance.

Typical examples:

- add one more talent to an existing talent system
- add a new talent inventory UI surface
- add a new synthesis rule between existing talents

### Why This Is Phase 2

These requests are not just file diffs.

They require the system to understand:

- what semantic entities already exist inside the feature
- where the new requirement attaches
- whether the change is additive, structural, or regenerative

### Required New Foundations

Phase 2 requires:

- `Feature Semantic State`
- `Update Intent Contract`
- entity-aware update planning

Without these, the project only has:

- lifecycle maintenance
- file-level or module-level update semantics

not true semantic incremental evolution.

### Phase 2 Definition Of Done

Phase 2 should only be considered established when the system can conservatively and reviewably handle at least one real additive update to an existing structured feature.

Example:

- add one talent entry to an existing talent system

without silently degrading into whole-feature rewrite unless that rewrite is explicitly required.

## Phase 3: System Evolution And Complex Composition

### Goal

Support more advanced evolution across richer systems and cross-entity behavior.

Typical examples:

- rule composition across multiple existing talents
- cross-surface update between gameplay and multiple UI surfaces
- larger-scale system refactoring with reviewable semantic intent

### Expected Capabilities

Phase 3 may require:

- richer semantic state
- stronger update planning
- more expressive realization routing
- stronger validation and review surfaces

## Current Project Status

The project has reached **late Phase 1** with the following milestones achieved:

- Phase 1 architecture definition: complete
- Host Realization integration: functional (lua path mainlined)
- Generator Routing: partial (lua route established; KV/TS routes need broader coverage)
- **First real Dota2 E2E validation: achieved (T121)**
- **Lua write path mainlined: achieved (T125)**

It is not yet in Phase 2.

### T121: Minimal Real Dota2 E2E — COMPLETED

- baseline 3 abilities appear correctly
- fresh RW ability attaches to hero, castable, with mana/cooldown
- modifier creates, buff appears ~6s
- quality level: minimal viable (not polished)
- this satisfies Phase 1 DoD item #4 ("at least one feature completes a real Dota2 end-to-end validation path")

### T125: Lua Path Mainlined — COMPLETED

- `contentType: "lua"` entries produced by normal pipeline
- same-file ability + modifier lua generation working
- write executor writes `.lua` files successfully
- old KV→lua bypass retired
- scope boundary: short_time_buff-style cases only

## Immediate Priority

The current immediate priority is:

1. ~~finish Host Realization integration~~ → functional for lua path (T125)
2. ~~add lua generator path~~ → done (T125)
3. ~~complete one real Dota2 end-to-end validation~~ → done (T121)
4. **broaden lua pattern support** beyond short_time_buff
5. **improve visual/numeric effect quality** beyond minimal viable
6. formalize Generator Routing for KV/TS/lua multi-generator coordination
7. refine realization-aware validation and review artifacts

## Roadmap Guardrail

When evaluating a proposed task, the project should ask:

- is this still Phase 1 baseline work?
- or is this really a Phase 2 semantic increment request?

If it is Phase 2, the project should not pretend it is already supported by the current baseline.

## Relationship To Existing Lifecycle Commands

Current lifecycle commands:

- create
- update
- regenerate
- rollback

are important and useful, but they do not by themselves prove Phase 2 capability.

They currently establish:

- feature lifecycle maintenance

not:

- semantic entity-level feature evolution

## Documentation Guidance

Project documents should be read in phase context.

Near-term implementation work should bias toward Phase 1 completion, while Phase 2 documents should define future contracts without overstating current support.

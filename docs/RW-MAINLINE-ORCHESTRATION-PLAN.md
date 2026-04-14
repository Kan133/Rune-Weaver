# Rune Weaver Mainline Orchestration Plan

> Status: active-reference
> Audience: agents
> Doc family: control
> Update cadence: low-frequency
> Last verified: 2026-04-14
> Read when: coordinating Dota2 and War3 mainlines across sessions
> Do not use for: same-day step/blocker freshness or replacing session-sync / shared-plan inputs

## Purpose

This document exists to keep Rune Weaver's two mainlines pointed in the right direction across sessions.

Use it when:

- deciding whether a task belongs to Dota2 mainline or War3 mainline
- updating `docs/session-sync/RW-SHARED-PLAN.md`
- checking whether a proposed task helps the real blocker or is just interesting side motion
- deciding whether the two tracks should stay separated or coordinate

Do not use this file as:

- the latest status log
- a replacement for mainline session-sync notes
- permission to invent progress not backed by repo-visible evidence

## Reading Order For Orchestrator Work

When maintaining cross-track direction, read in this order:

1. latest Dota2 mainline session-sync
2. latest War3 mainline session-sync
3. `docs/session-sync/RW-SHARED-PLAN.md`
4. this file
5. `docs/AGENT-EXECUTION-BASELINE.md`
6. `docs/HANDOFF.md`
7. `docs/CURRENT-EXECUTION-PLAN.md`
8. the most relevant roadmap / workspace / host-plan docs for the slice

Rule:

- session-sync decides the current step and current blocker
- shared-plan decides the current coordination truth
- this file decides the stable direction guardrail when short-term notes are incomplete or noisy

## Program Shape

Treat Rune Weaver as two separate tracks by default:

1. Dota2 mainline
2. War3 mainline

This separation should hold unless a real shared artifact or shared contract creates a justified dependency.

## Dota2 Mainline Mission

Dota2 mainline exists to turn the standing Rune Weaver lifecycle into an honest, repeatable, reviewable product path.

This track should continue to center:

- authoritative CLI lifecycle truth
- product entry integration into that CLI path
- x-template onboarding completion
- repeatable evidence and walkthrough quality
- productization only for already-proven behavior

Current program-level interpretation:

- Dota2 is no longer proving that the chain can work once.
- Dota2 is proving that the chain can be repeated without hidden operator knowledge.

### Dota2 Mainline Must Prefer

1. evidence closure for standing lifecycle claims
2. Workbench / onboarding integration that stays thin over CLI truth
3. x-template setup and launch-path completion
4. one honest canonical walkthrough

### Dota2 Mainline Must Not Drift Into

- second-host work as a Dota2 acceptance dependency
- broad UI redesign unrelated to lifecycle entry / orchestration
- reopening `regenerate` or `rollback` as if they were current MVP gates
- broad generator exploration that does not move the active product-entry or evidence blocker
- reopening side cases as hidden mainline work unless Dota2 current blockers are already cleared

## War3 Mainline Mission

War3 mainline exists to prove that Rune Weaver can form a truthful workspace, intake, and handoff contract over real Warcraft III map inputs before claiming a higher-level product flow.

This track should continue to center:

- real parsing of the first-stage map artifacts
- read-only-first workspace modeling
- derived artifact export
- handoff bundle quality
- narrow implementation-planning or implementation-draft validation

Current program-level interpretation:

- War3 is past blank-host investigation.
- War3 is not yet at runtime-proven product execution.
- War3 should earn the next layer of product behavior by strengthening artifact and handoff truth first.

### War3 Mainline Must Prefer

1. real input validation over placeholder schema design
2. stronger intake / handoff contracts over premature product shell work
3. narrow real-case validation over broad platform ambition
4. stable shared host seams only when they clearly reduce duplication

### War3 Mainline Must Not Drift Into

- full packaged-map round-trip productization before intake / handoff truth is solid
- broad Workbench product shell expansion
- generic cross-host framework work without a concrete consumer
- runtime claims that are not backed by actual execution evidence
- redefining Dota2 priorities just because War3 is strategically interesting

## Cross-Track Guardrails

### Direction Rule

- Dota2 remains the primary roadmap-critical lane.
- War3 remains the bounded secondary lane.
- War3 should advance in parallel, but it should not pull Dota2 off its current product-entry / evidence / walkthrough path.

### Coupling Rule

Only couple the tracks when one side has produced a stable artifact or contract the other side can honestly consume.

Good examples:

- shared host realization contract
- shared route / write-plan contract
- shared host descriptor / workspace host typing
- shared host registry / host-kind typing

Bad examples:

- merging Dota2 and War3 UI execution flow too early
- building a generic host shell before either track needs it concretely
- using War3 uncertainty to reopen settled Dota2 MVP boundaries

### Collision Rule

If both tracks need the same subsystem, prefer:

1. one track owns the immediate edit
2. the other track consumes the resulting contract
3. orchestrator records the seam in shared-plan before parallel edits stack up

Pay special attention to:

- shared `apps/workbench-ui` shell infrastructure
- generic host-status plumbing
- host/workspace core contracts

## Shared-Plan Maintenance Rule

When updating `docs/session-sync/RW-SHARED-PLAN.md`:

1. read the latest session-sync from each mainline
2. read the current shared-plan
3. read this orchestration plan
4. read the most relevant current execution / roadmap docs
5. update the shared-plan in place

What to preserve:

- completed items that still explain why the current position exists
- blocked items with explicit blockers
- stable cross-track guardrails that are still true

What to avoid:

- rewriting the shared-plan as a giant roadmap
- replacing concrete blockers with vague strategy wording
- letting one noisy session-sync overturn the stable program direction without evidence

If the shared-plan needs to diverge from this file, record the concrete evidence that forced that divergence.

## Default Attention Split

Unless fresh evidence says otherwise:

- keep the main attention on Dota2 mainline
- keep a smaller bounded lane on War3 mainline
- do not create a third hidden mainline

Near-term meaning:

- Dota2 should keep moving until product-entry state, onboarding completion, and walkthrough evidence are strong enough to be honestly shown together.
- War3 should keep moving until intake artifact quality and handoff contract quality are strong enough to support one more real downstream validation step.

## Update Threshold

Do not edit this file for every session.

Update it only when one of these changes:

- the primary role of Dota2 mainline changes
- the primary role of War3 mainline changes
- the coupling rule between tracks changes
- the recommended attention split changes
- a previously deferred category becomes active program direction

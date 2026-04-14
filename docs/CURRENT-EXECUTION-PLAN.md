# Current Execution Plan

> Status: authoritative
> Audience: agents
> Doc family: baseline
> Update cadence: on-phase-change
> Last verified: 2026-04-14
> Read when: deciding the active Dota2 mainline execution queue and current critical-path task order
> Do not use for: cross-track coordination by itself or long-term roadmap planning

> Status
> This remains the active Dota2 mainline execution queue inside the post-ABCD phase.
> The current slice is no longer broad Gap Fill productization work; it is canonical skeleton+fill acceptance closure around the frozen Talent Draw path.
> For freshest same-day coordination across Dota2 and War3, pair this file with [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md) and the latest session-sync notes under `docs/session-sync/`.

## Purpose

This document defines the current Dota2 execution order for active work.

Use this file when:

- deciding the next Dota2 implementation slice
- scoping worker-agent tasks for the Dota2 mainline
- checking whether a proposed task is on the current Dota2 critical path

If a fresh session-sync note disagrees with this file on the current slice or blocker, refresh this file before routing more workers.

## Current Baseline

Standing baseline:

- authoritative CLI `create`
- authoritative CLI `update`
- authoritative CLI `delete`
- minimum workspace-backed governance
- baseline CLI / workspace spine proven enough to support the current canonical skeleton+fill path
- workspace / bridge / host lifecycle tracking
- feature-scoped `gapFillBoundaries` persisted in workspace state
- CLI-backed `dota2 gap-fill` that can operate from a selected feature
- Workbench feature detail that can launch the CLI-backed gap-fill flow and surface canonical guidance

Still true:

- Workbench remains a product shell over authoritative CLI behavior, not a second executor
- approval/apply/validate for gap fill now exists as a structured product path, but the novice-facing experience is still being tightened
- canonical guidance and boundary labels are strong enough for one frozen case, not for broad generalized case coverage
- the current canonical case is Talent Draw only; other prompts or boundaries remain exploratory rather than acceptance-equivalent
- backward compatibility for older workspaces may still require manual boundary choice
- runtime screenshots, runtime video, and other manual evidence are still not fully closed on a fresh host
- the current gap-fill model is still generator-anchor and repo-side patch oriented, not arbitrary host-side runtime patching
- `rollback` remains deferred
- `regenerate` remains deferred
- structure-level update remains deferred

## Active Priorities

### 1. Canonical Acceptance Closure

Goal:

- freeze the Talent Draw skeleton+fill path as the one canonical Dota2 acceptance route and re-prove it cleanly

Current focus:

- keep the frozen prompt, frozen boundary, and canonical continuation order explicit
- run the full path honestly on a fresh host through `review -> confirmation/apply -> validate -> repair-build -> launch`
- collect the missing manual runtime screenshots and video
- keep canonical versus exploratory runs visibly separated so evidence does not drift

Done when:

- the fresh-host canonical path can be reproduced without hidden operator knowledge and the evidence pack is complete enough to support handoff-safe acceptance

### 2. Approval Unit Clarity And Continuation Guidance

Goal:

- make the existing approval/apply path understandable as one coherent product flow instead of an operator-only sequence

Current focus:

- expose the exact approval unit more explicitly in Workbench
- keep review status, continuation guidance, and next-step language aligned with the CLI-backed review surface
- preserve explicit policy-safe semantics for auto-apply, confirmation-required, reject, and validation outcomes

Done when:

- a novice user can understand what is being approved, what happens next, and why the system is blocked or allowed without needing operator-side interpretation

### 3. Next Honest Proof Point Gate

Goal:

- choose the next Dota2 proof point only after canonical acceptance is re-proven, without broadening the surface prematurely

Current focus:

- hold the line on one canonical case until the fresh-host acceptance pass is complete
- keep blueprint / pattern / generator as the structure layer and Gap Fill as the business-logic refinement layer
- only after closure, choose between:
  - a second mechanism case
  - or a broader Gap Fill product surface

Done when:

- the next proof point is chosen from a re-proven canonical base rather than as a substitute for unfinished acceptance closure

### 4. Keep CLI Authority Thin And Honest

Goal:

- keep the productized post-write fill flow visibly downstream of CLI authority without inventing a second executor or planner

Current focus:

- keep Workbench on the CLI-backed path
- keep result/review semantics aligned with the existing review surface
- keep host/write authority deterministic and policy-gated

Done when:

- the productized fill flow is still visibly downstream of CLI authority rather than a parallel execution system

## Non-Goals For The Current Plan

Do not treat these as current-plan work unless the user explicitly reopens them:

- moving business logic back into `core/wizard`
- broad pattern inflation unrelated to the current skeleton-plus-fill split
- generic arbitrary code-edit behavior disguised as gap fill
- productizing `rollback`
- productizing `regenerate`
- structure-level update that adds or removes pattern families
- second-host support
- broad UI redesign unrelated to canonical acceptance closure or CLI-backed execution truth

## Working Rule

When choosing between tasks, prefer work that strengthens:

1. canonical acceptance closure on a fresh host
2. approval/apply clarity and continuation guidance
3. the next honest proof point only after closure
4. thin UI orchestration over authoritative CLI behavior

If a task improves none of the above, it is probably not on the current Dota2 critical path.

## Agent Rule

Lead agents should:

- treat this file as the active Dota2 execution queue
- use [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md) as the freshness check for cross-track coordination
- refresh stale control docs quickly when session-sync changes the current step materially
- keep worker tasks narrow and evidence-backed
- avoid reviving the older evidence-closure queue as if it were still the active slice
- do not treat exploratory Gap Fill runs as equivalent to the frozen canonical acceptance path

## Related Docs

Read alongside:

1. [README.md](/D:/Rune%20Weaver/README.md)
2. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
3. [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md)
4. [AUTONOMOUS-DEVELOPMENT-POLICY.md](/D:/Rune%20Weaver/docs/AUTONOMOUS-DEVELOPMENT-POLICY.md)
5. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
6. [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)

Reference only:

- the latest Dota2 session-sync note under `docs/session-sync/`
- [PRODUCT.md](/D:/Rune%20Weaver/docs/PRODUCT.md)
- [ROADMAP.md](/D:/Rune%20Weaver/docs/ROADMAP.md)
- [DEMO-PATHS.md](/D:/Rune%20Weaver/docs/DEMO-PATHS.md)
- [CURRENT-STATE-VS-TARGET.md](/D:/Rune%20Weaver/docs/CURRENT-STATE-VS-TARGET.md)

# Current Execution Plan

> Status: authoritative
> Audience: agents
> Doc family: baseline
> Update cadence: on-phase-change
> Last verified: 2026-04-16
> Read when: deciding the active Dota2 mainline execution queue and current critical-path task order
> Do not use for: cross-track coordination by itself or long-term roadmap planning

> Status
> This remains the active Dota2 mainline execution queue inside the post-ABCD phase.
> The current slice is Step 2 core generalization: Dota2 must strengthen the reusable `IntentSchema -> BlueprintProposal -> BlueprintNormalizer -> FinalBlueprint -> ModuleNeed -> capability-fit resolver -> pattern family -> deterministic host realization / generator routing` path before more cases, more Workbench polish, or broader product-shell work.
> The family-by-family honesty-tightening subphase, the current-seam package-2 bounded pass, the frozen-seam package-4 coverage audit, and package-6 acceptance execution have now all stage-closed on the current grammar-v1 seam. The next active Step 2 work is to open the bounded `scheduler/timer` seam-expansion package deliberately, rather than more package-2/package-4 micro-slicing or more package-6 preflight work.
> For freshest same-day coordination across Dota2 and War3, pair this file with [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md) and the latest session-sync notes under `docs/session-sync/`.

## Purpose

This document defines the current Dota2 execution order for active work.

Use this file when:

- deciding the next Dota2 implementation slice
- scoping worker-agent tasks for the Dota2 mainline
- checking whether a proposed task is on the current Dota2 critical path

If a fresh session-sync note disagrees with this file on the current slice or blocker, refresh this file before routing more workers.

## Active Goal

Build a generalized Dota2 core path.

The active Dota2 goal is now:

- richer `IntentSchema`
- deterministic `BlueprintProposal -> BlueprintNormalizer -> FinalBlueprint`
- canonical `ModuleNeed`
- capability-fit-first pattern resolution
- Dota2 pattern family coverage for a reusable mechanic grammar
- deterministic host realization / generator routing

Cases now exist to validate the generalized core after it is in place; they do not drive architecture by themselves.

## Current Baseline

Standing baseline:

- authoritative CLI `create`
- authoritative CLI `update`
- authoritative CLI `delete`
- minimum workspace-backed governance
- baseline CLI / workspace spine proven enough to support one canonical skeleton+fill path
- workspace / bridge / host lifecycle tracking
- feature-scoped `gapFillBoundaries` persisted in workspace state
- CLI-backed `dota2 gap-fill` that can operate from a selected feature
- real Dota2 `gap-fill review -> apply -> validate-applied -> doctor` exercised successfully on `D:\test3`
- Workbench feature detail that can launch the CLI-backed gap-fill flow and surface canonical guidance

Current narrow honesty fixes already landed:

- `integration.state_sync_bridge` no longer goes through placeholder-only materialization
- the current truthful bridge state is:
  - routed
  - deliberately elided
  - no standalone bridge file emitted
- this is a narrow honesty fix, not broad admission of a generic bridge family
- `resource/cost` remains `partial`, but it is no longer honest to describe it as only "pool + consumer with no caller"
- the current honest narrow canonical path is:
  - same-feature
  - single `input.key_binding`
  - single compatible `resource.basic_pool`
  - single `effect.resource_consume`
- shapes outside that path still defer honestly:
  - no caller
  - caller ambiguity
  - multiple consumers
  - pool/resource mismatch

Still true:

- Workbench remains a product shell over authoritative CLI behavior, not a second executor
- bounded `GapFill` remains downstream refinement, not architecture authority
- the current proven path is still narrow and does not by itself prove broad Dota2 generalization
- backward compatibility for older workspaces may still require manual boundary choice
- the current gap-fill model is still generator-anchor and repo-side patch oriented, not arbitrary host-side runtime patching
- bridge family coverage is still partial even though the narrow `integration.state_sync_bridge` honesty fix landed
- `resource/cost` family coverage is still partial outside the one narrow canonical path above
- `rollback` remains deferred
- `regenerate` remains deferred
- structure-level update remains deferred

## Current Blocker

The current Dota2 core is still too case-led and too thin in `IntentSchema`, `FinalBlueprint`, resolver semantics, and Dota2 pattern family coverage.

This means the mainline blocker is not:

- Talent Draw replay alone
- Workbench polish
- "just do another case first"
- broad doc work as a substitute for core implementation

## Current Package Audit

| package | current judgment | why |
| --- | --- | --- |
| `1. Freeze Dota2 Mechanic Grammar v1` | `landed enough for current v1` | grammar-v1 family freeze is now explicit in controller truth, and the queue no longer finds more same-size honesty slices to drain |
| `2. Land Richer IntentSchema And Deterministic FinalBlueprint In Code` | `still active / incomplete` | typed semantics, `FinalBlueprint`, canonical `ModuleNeed[]`, and honest `weak` / `blocked` states exist, and one bounded current-seam quality pass has already landed and stage-closed; broader upstream semantic quality is still not globally closed |
| `3. Migrate Resolver To ModuleNeed -> Capability Fit` | `landed enough for current v1` | capability-fit-first resolution is live, `explicitPatternHints` are tie-break only, and unresolved needs block/weak honestly; fallback remains as a migration backstop because package 2 is still incomplete |
| `4. Build The Minimum Dota2 Pattern Family Set For The Grammar` | `still active / incomplete` | admitted families are still narrow, several families remain partial, and unsupported families still exist; the honesty-tightening subphase is exhausted, and the frozen-seam package-4 audit has already stage-closed with no single bounded downstream package worth landing now |
| `5. Stabilize Host Realization And Generator Routing Around Grammar Families` | `landed enough for current v1` | realization/routing are deterministic for admitted and currently supported narrow combinations; remaining pressure is family coverage, not routing instability |

Current controller judgment:

- the family-honesty subphase is stage-closed
- package 2 has already had one high-value bounded current-seam pass and that pass is stage-closed on the frozen seam
- package 4 has already had its frozen-seam coverage audit and that audit is stage-closed on the frozen seam
- package 6 has now executed as a full pass/block/gap acceptance matrix on the frozen seam
- package 6 validated the next seam ranking and also repaired one frozen-seam overclaim:
  - unsupported `scheduler/timer`, `reward/progression`, and `spawn/emission` asks were still able to normalize to `ready` by collapsing into admitted families
  - `FinalBlueprint` now honest-blocks those asks instead
- current frozen-seam Step 2 is at the implementation boundary, seam boundary, and grammar-v1 declared boundary together for same-size code motion
- the next active Step 2 work is:
  - open the first seam-expansion package deliberately
  - use completed package-6 evidence as the frozen-seam acceptance baseline
- current next-seam ranking is `scheduler/timer`, then `reward/progression`, then `spawn/emission`, then broad standalone `entity/session state`
- do not reopen `resource/cost`, `effect/modifier`, `UI feedback/status`, or `integration/bridge` for more mechanical micro-slices unless new code truth appears

## Mainline Rule

- Do not add a new case to compensate for missing core generalization.
- If a supported mechanic requires product-code changes, that is a core blocker, not a case milestone.
- Keep LLM support in the blueprint stage, but keep deterministic final authority downstream of it.
- Keep `GapFill` bounded and downstream; it is not a substitute architecture layer.

## Ordered Work Packages

### 1. Freeze Dota2 Mechanic Grammar v1

Goal:

- define the supported Dota2 semantic families the system is meant to generalize over

Current focus:

- name the minimum grammar families:
  - trigger/input
  - scheduler/timer
  - spawn/emission
  - entity/session state
  - selection/draft
  - reward/progression
  - resource/cost
  - effect/modifier
  - UI feedback/status
  - integration/bridge
- state the intentional out-of-scope set for grammar v1
- stop using map-template names as the main architectural boundary

Intentionally out of scope for grammar v1:

- arbitrary host-side free-form code editing
- second-host support
- rollback / regenerate productization
- broad meta-progression or economy systems outside the declared grammar
- unbounded UI-shell-driven architecture expansion

Acceptance:

- the plan names the supported grammar families
- the plan states what is intentionally out of scope for now
- the plan stops using map-template names as the main architectural boundary

### 2. Land Richer IntentSchema And Deterministic FinalBlueprint In Code

Goal:

- move the execution path away from the thin schema / old `Blueprint` shape

Current focus:

- require LLM support in the blueprint stage while keeping deterministic final authority
- support typed intent semantics instead of thin summaries only
- normalize into `FinalBlueprint` plus canonical `ModuleNeed[]`
- surface honest `weak` / `blocked` states when semantics are underspecified
- current-seam note:
  - one bounded quality pass has already landed
  - package 2 is no longer the default active package unless a future move proves a larger same-seam closure is worth reopening

Acceptance:

- supported prompts can produce typed intent semantics, not just thin summaries
- deterministic normalization emits `FinalBlueprint` with canonical `ModuleNeed[]`
- `FinalBlueprint` carries no host/write authority
- `weak` / `blocked` states are surfaced honestly when semantics are underspecified

### 3. Migrate Resolver To ModuleNeed -> Capability Fit

Goal:

- move pattern resolution off the legacy category / hint-led path

Current focus:

- resolve primarily from semantic role plus required capabilities
- keep `explicitPatternHints` as tie-break only
- produce deterministic weak/block output when semantics or coverage are insufficient

Acceptance:

- supported module needs resolve primarily from semantic role plus required capabilities
- raw pattern-id branching is not the normal resolver path
- unresolved needs produce deterministic block / weak output rather than silent fallback

### 4. Build The Minimum Dota2 Pattern Family Set For The Grammar

Goal:

- expand the Dota2 catalog around reusable mechanic families rather than case names

Current focus:

- cover enough grammar to support:
  - progression / selection loops
  - spawn / survival pressure
  - resource / effect action loops
  - UI status and feedback
- keep `PatternContract`, `HostBinding`, and generator usage reviewable instead of mixed into one blob
- keep the latest family truth honest while coverage is still partial:
  - `resource/cost` now has one narrow end-to-end canonical path, but broad family admission is still false
  - `integration/bridge` now routes honestly for `integration.state_sync_bridge`, but broad bridge-family admission is still false
- active frozen-seam judgment:
  - package 4 is still incomplete overall, but its frozen-seam coverage audit is already complete
  - no single bounded downstream package is worth landing now on the frozen seam
  - the honest task is now boundary closure and next seam selection, not reopening exhausted family micro-slices

Acceptance:

- each supported grammar family has at least one admitted pattern / binding path
- `PatternContract`, `HostBinding`, and generator usage are reviewable and not mixed into one blob
- per-pattern host branching is reduced to explicit exception paths

### 5. Stabilize Host Realization And Generator Routing Around Grammar Families

Goal:

- make realization and routing reusable across supported mechanic combinations

Current focus:

- route by generalized mechanic support instead of case-specific product-code additions
- keep routing deterministic
- keep bounded `GapFill` downstream of supported generator seams
- preserve the current narrow routed truth:
  - `integration.state_sync_bridge` may route as `bridge-only` while deliberately eliding standalone bridge-file emission
  - resource/cost routing is only honest today for the single-caller same-feature canonical path described above

Acceptance:

- a supported request combination does not require adding new product code just to route host outputs
- generator routing remains deterministic
- `GapFill` stays bounded and downstream, not a substitute architecture layer

### 6. Reintroduce Cases As An Acceptance Matrix

Goal:

- use cases as validation probes against the grammar only after packages 1-5 are in place

Current focus:

- package 6 has already executed in three buckets:
  - `should-pass-without-new-product-code`
  - `should-honest-block-on-current-v1`
  - `should-expose-next-seam-gap`
- keep the resulting execution sheet and typed artifacts as the frozen-seam acceptance baseline
- do not route agents back into package-6 preflight as if the matrix were still unrun

Acceptance:

- at least 3 cases are chosen to cover different grammar combinations
- passing a case does not require new product-code support if it stays inside the declared grammar
- unsupported requests honest-block before write with a named missing capability or grammar gap
- seam-gap probes confirm the chosen next expansion without reopening architecture ad hoc

## Non-Goals For The Current Plan

Do not treat these as current-plan work unless the user explicitly reopens them:

- productizing more Workbench shell behavior as a substitute for core generalization
- broad case growth before the grammar / blueprint / resolver core is stronger
- generic arbitrary code-edit behavior disguised as bounded `GapFill`
- productizing `rollback`
- productizing `regenerate`
- structure-level update that adds or removes pattern families without going through the grammar-first path
- second-host support
- broad UI redesign unrelated to deterministic core execution

## Working Rule

When choosing between tasks, prefer work that strengthens:

1. Dota2 mechanic grammar v1 and its explicit scope boundary
2. richer `IntentSchema` plus deterministic `FinalBlueprint` / `ModuleNeed`
3. `ModuleNeed -> capability fit` resolution and minimum Dota2 pattern family coverage
4. deterministic host realization / generator routing over supported mechanic combinations
5. case validation only after the generalized core is in place

If a task improves none of the above, it is probably not on the current Dota2 critical path.

## Agent Rule

Lead agents should:

- treat this file as the active Dota2 execution queue
- use [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md) as the freshness check for cross-track coordination
- refresh stale control docs quickly when session-sync changes the current step materially
- keep worker tasks narrow and evidence-backed
- avoid reviving the Step 7 second-case/product-shell queue as if it were still the active slice
- do not treat a new case as permission to hide missing core support

## Related Docs

Read alongside:

1. [README.md](/D:/Rune%20Weaver/README.md)
2. [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
3. [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
4. [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md)
5. [WIZARD-BLUEPRINT-CHAIN.md](/D:/Rune%20Weaver/docs/WIZARD-BLUEPRINT-CHAIN.md)
6. [PATTERN-SPEC.md](/D:/Rune%20Weaver/docs/PATTERN-SPEC.md)
7. [HOST-REALIZATION-CONTRACT.md](/D:/Rune%20Weaver/docs/HOST-REALIZATION-CONTRACT.md)
8. [GENERATOR-ROUTING-CONTRACT.md](/D:/Rune%20Weaver/docs/GENERATOR-ROUTING-CONTRACT.md)
9. [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md)

Reference only:

- the latest Dota2 session-sync note under `docs/session-sync/`
- [AGENT-TASK-CONTRACT.md](/D:/Rune%20Weaver/docs/AGENT-TASK-CONTRACT.md)
- [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
- [PRODUCT.md](/D:/Rune%20Weaver/docs/PRODUCT.md)
- [ROADMAP.md](/D:/Rune%20Weaver/docs/ROADMAP.md)
- [CURRENT-STATE-VS-TARGET.md](/D:/Rune%20Weaver/docs/CURRENT-STATE-VS-TARGET.md)

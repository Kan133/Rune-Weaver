# ARCHITECTURE

> Status: authoritative
> Audience: agents
> Doc family: baseline
> Update cadence: on-contract-change
> Last verified: 2026-04-20
> Read when: aligning current execution layering and authority boundaries across Wizard, Blueprint, Assembly, write, and validation
> Do not use for: same-day task priority or host-specific routing policy by itself

## Purpose

This document is the current cross-host execution baseline for Rune Weaver.

The governing principle remains:

- hard-code how features are governed
- do not hard-code all mechanics they are allowed to attempt

## Accepted Mainline

The accepted chain is:

`User Request -> Wizard -> IntentSchema + clarification sidecars -> Blueprint Stage -> Pattern Resolution / strategy continuation -> AssemblyPlan -> HostRealizationPlan -> GeneratorRoutingPlan -> WritePlan -> LocalRepair -> Write Executor -> Dependency / Host / Runtime Validation -> Final CommitDecision -> Workspace Lifecycle`

Important current truth:

- Wizard always produces best-effort semantics.
- clarification now has staged authority, not a single flat stop signal.
- Blueprint is the planning authority seam.
- `FinalBlueprint.status` remains planning-time truth only.
- chain-end `CommitDecision` is the final lifecycle authority.

## Baseline Authority Split

| Layer | Owns | Must not own |
|------|------|--------------|
| Wizard | semantic capture, clarification questions, bounded normalization cues | host routing, write targets, final legality, dependency resolution by itself |
| clarification authority | staged `blocksBlueprint` / `blocksWrite` / unresolved dependency reporting | final commit truth, host write execution |
| Blueprint stage | structure, owned scope, `FeatureContract`, dependency edges, implementation strategy, blueprint-stage `commitDecision` | host routing, generator routing, filesystem paths |
| Pattern / Assembly | reusable mechanism fit, unresolved need carry-forward, module implementation records, fill-contract activation | reinterpreting ownership from raw prompt text |
| Host realization / routing / write | output families, write targets, bridge refresh, execution ordering | redoing feature contract or cross-feature legality |
| Validation / final gate | dependency revalidation, host/runtime validation, final `CommitDecision`, workspace truth | retroactively changing prompt meaning |

## Wizard Boundary

Wizard owns best-effort interpretation, not execution permission.

Current accepted outputs:

- `IntentSchema`
- `WizardClarificationPlan`
- internal `raw facts / governance decisions / open semantic residue` seams
- update-mode `requestedChange: IntentSchema` plus `UpdateIntent`

Current downstream rule:

- consumers should read `IntentGovernanceDecisions`, not re-derive governance from raw schema prose or prompt wording

Current persistence boundary:

- bare `persistent`, `long-lived`, or “持续存在” means runtime/session-long by default
- only explicit cross-match, profile, account, save-system, or external-storage semantics escalate into external persistence governance

## Clarification Staging

`WizardClarificationAuthority` is now the governing clarification seam.

Current meanings:

- `blocksBlueprint`
  - structural ambiguity is too large to continue planning honestly
- `blocksWrite`
  - planning may continue, but host write cannot close yet
- `requiresReview`
  - the chain may continue in a weak/exploratory state
- `unresolvedDependencies`
  - open provider/target dependencies that downstream gates must still honor

This changes the old behavior:

- unresolved cross-feature targets are no longer a pre-Blueprint hard stop by default
- they may continue into a weak Blueprint when the local shell is still plan-able
- the hard block belongs at write/final-commit authority, not at semantic capture

## Blueprint Stage

Blueprint is the planning authority seam.

It currently owns:

- `DesignDraft`
- `FeatureContract`
- `FeatureDependencyEdge[]`
- `moduleNeeds`
- `moduleRecords`
- `unresolvedModuleNeeds`
- `fillContracts`
- implementation strategy selection:
  - `family`
  - `pattern`
  - `guided_native`
  - `exploratory`
- blueprint-stage `commitDecision`

Current baseline rules:

- unknown mechanics should continue into `guided_native` or `exploratory` when owned scope is still clear
- weak catalog coverage is not, by itself, a lawful reason to stop planning
- `blocked` at blueprint stage should mean structural or governance failure, not “we have not seen this mechanic before”

## Cross-Feature Continuation Rule

Cross-feature asks no longer imply “planning must stop.”

Current accepted behavior:

- Blueprint may still emit the local shell and mark the result `weak`
- unresolved provider identity is carried as a write-blocking dependency
- final write is blocked if the required target feature or target surface does not close truthfully

This keeps planning authority and write authority separate.

## Family, Pattern, Synthesis, And Repair

Current meanings:

- `family`
  - reusable feature skeleton and stable source-backed update authority
- `pattern`
  - reusable mechanism module and host-binding fit
- artifact synthesis
  - host-native artifact creation inside already-declared owned scope
- `LocalRepair`
  - bounded local implementation repair after write-plan generation

Current non-negotiable rules:

- synthesis may not invent new ownership, bridge authority, or dependency contracts
- repair may not widen write scope or act as a second planner
- family/pattern retrieval failure does not, by itself, invalidate a mechanic

## Final Commit Gate

Current lifecycle outcomes:

- `committable`
- `exploratory`
- `blocked`

Current meanings:

- `committable`
  - stable enough to write without review-only downgrade
- `exploratory`
  - write may proceed, but `requiresReview=true`
- `blocked`
  - ownership, dependency, repair, host, or runtime truth does not close

This gate, not blueprint readiness, decides whether the workspace may commit the result.

## Current Dota2-Proven Implications

These are host-specific examples of the baseline, not new cross-host rules:

- Dota2 `selection_pool` now owns only the local draw shell and source-backed authoring truth
- cross-feature reward granting lives in a separate provider/consumer seam, not inside the `selection_pool` family contract
- provider ability export is valid only when Lua, KV, and export metadata share one authoritative runtime `abilityName`
- local-only source-backed updates must preserve existing bound dependency sidecars unless the update explicitly rewires them

See [DOTA2-V2-GOVERNANCE-FIRST-ARCHITECTURE.md](/D:/Rune%20Weaver/docs/hosts/dota2/DOTA2-V2-GOVERNANCE-FIRST-ARCHITECTURE.md) for the host-specific form of these rules.

## Guardrails

The architecture must continue to avoid these regressions:

1. treating grammar, family, or pattern coverage as mechanic-admission law
2. letting clarification questions become a flat pre-planning denial surface
3. letting generators or repair re-decide ownership or dependency contracts
4. letting prompt wording override `IntentGovernanceDecisions`
5. letting host-specific sidecars leak back into core schema authority
6. letting blueprint `ready | weak | blocked` masquerade as the final lifecycle verdict

## Summary

Rune Weaver is a governed feature-lifecycle system.

The current accepted baseline is:

- Wizard captures semantics
- staged clarification reports what blocks Blueprint versus what blocks write
- Blueprint decides structure and strategy
- assembly/synthesis/repair stay inside declared scope
- validation and the chain-end `CommitDecision` decide whether the result may actually land

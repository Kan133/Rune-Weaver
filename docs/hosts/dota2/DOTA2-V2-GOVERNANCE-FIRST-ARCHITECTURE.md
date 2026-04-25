# Dota2 V2 Governance-First Architecture

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-meaningful-implementation-change
> Last verified: 2026-04-23
> Read when: doing Dota2 planning, source-backed update, cross-feature dependency, synthesis, or runtime grant work
> Do not use for: overriding the root baseline docs on cross-host architecture by itself

## Purpose

This document records the current Dota2-specific implementation truth after the recent source-backed update and cross-feature seam rounds.

Read it after:

1. [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
2. [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md)
3. [WIZARD-BLUEPRINT-CHAIN.md](/D:/Rune%20Weaver/docs/WIZARD-BLUEPRINT-CHAIN.md)
4. [LLM-INTEGRATION.md](/D:/Rune%20Weaver/docs/LLM-INTEGRATION.md)

## Current Dota2 Chain

Current Dota2 create/update flow is:

`Wizard -> IntentSchema / UpdateIntent -> Dota2 Blueprint enrichment -> Pattern Resolution -> AssemblyPlan -> HostRealizationPlan -> GeneratorRoutingPlan -> WritePlan -> LocalRepair -> Write Executor -> Host / Runtime Validation -> Final CommitDecision -> Workspace Update`

Current Dota2-specific truths:

- CLI is still the authoritative lifecycle executor
- Workbench is still orchestration/review/evidence, not lifecycle authority
- Dota2 continues to prefer reuse first, but may still use guided-native or exploratory owned artifacts when reuse coverage is weak

## Planning And Clarification Truth

Dota2 now follows the staged clarification model.

Current rule:

- unresolved cross-feature targets do not automatically hard-stop Blueprint
- Dota2 may still plan the local shell and produce a weak/exploratory Blueprint
- final write is blocked until the target feature and target surface close truthfully

Current persistence rule:

- runtime-local or session-long persistence is normal Dota2 feature behavior
- only explicit cross-match, save/profile, or external-system semantics should escalate into external persistence governance

## `selection_pool` Family Boundary

`selection_pool` is now a narrower family than before.

It owns:

- the local draw shell
- source-backed authoring truth
- bounded update merge for local pool/inventory/session semantics
- materialization of source artifact plus module parameters

It does not own:

- provider feature identity
- cross-feature grants
- Dota2 runtime hero attachment logic

Current local source truth remains:

- `game/scripts/src/rune_weaver/features/<featureId>/selection-pool.source.json`
  - per-feature source artifact under the feature directory

Current bounded family scope includes:

- trigger key
- pool objects
- rarity/weights
- choice count
- local inventory contract
- session-local draw tracking

## `selection_pool` Authority Cleanup

Current cleanup rules that are now part of live truth:

- `authoring.ts` is a thin facade only
- production family authority is split into:
  - admission
  - seeding
  - update-merge
  - materialization
- production family code no longer depends on example/demo ids for update/write truth
- generic inventory fallback text is `Selection inventory full`
- `persistent_panel` is the only current inventory presentation

Current write-path rule:

- source-backed changes must recompile generator-facing module parameters from current feature authoring
- sidecar writers must not re-implement `selection_pool` parameter compilation on their own

## Cross-Feature Provider / Consumer Seam

Cross-feature reward granting is now a separate Dota2 seam.

### Provider Side

Provider features may export a Dota2 grant surface through:

- `dota2-provider-ability-export.json`

Current first surface:

- `grantable_primary_hero_ability`

Provider export truth is narrow:

- `surfaceId`
- `abilityName`
- `attachmentMode`

Current attachment modes:

- `grant_only`
- `auto_on_activate`

Critical current rule:

- provider export is written only when Dota2 can resolve one authoritative runtime ability identity from the provider's actual host-bearing outputs
- Dota2 must not guess `abilityName` from feature ids, file paths, or prompt words

### Consumer Side

Consumer draw features keep local pool truth in `selection-pool.source.json`.

Cross-feature binding lives separately in:

- `selection-grant-bindings.json`

That sidecar maps:

- local `objectId`
- `targetFeatureId`
- `targetSurfaceId`
- relation/apply behavior

This seam is Dota2-owned host integration, not a new generic family.

## Provider Identity Alignment

The provider ability identity round is now part of current Dota2 truth.

Current requirement:

- Lua
- KV
- provider export sidecar

must all close on the same authoritative runtime `abilityName`.

If Dota2 cannot close that identity honestly:

- provider export is not written
- validator should fail the provider export surface
- downstream consumers must not treat the provider as resolved

## Runtime Grant Path

The runtime cross-feature grant path is now:

1. player confirms a local selection object
2. generic selection outcome hook runs
3. Dota2 binding seam checks whether the object is externally handled
4. if bound:
   - resolve provider export
   - resolve authoritative `abilityName`
   - add the ability to the current controlled hero
   - dedupe if already present
   - set level to 1
5. if not bound:
   - fall back to the local placeholder/default effect path

Current scope limits:

- no slot policy
- no persistence beyond the current match/session
- no stacking semantics beyond dedupe

## Bridge Behavior

Bridge auto-attachment no longer assumes every generated ability should mount automatically.

Current rule:

- only provider exports with `attachmentMode = auto_on_activate` are auto-attached on activation
- `grant_only` providers stay loadable but are not mounted until a consumer runtime grants them

## Governance Product Read-Model Boundary

Step 7 adds a Dota2 product read-model for bridge, CLI, and workbench display.

Current owner:

- [read-model.ts](/D:/Rune%20Weaver/adapters/dota2/governance/read-model.ts)
- builder: `buildDota2GovernanceReadModel(...)`
- schema version: `dota2-governance-read-model/v1`

Current boundary:

- the builder is Dota2 adapter-owned
- the read-model projects existing canonical Dota2/workspace truth for product surfaces
- it does not create new lifecycle authority
- it does not admit reusable assets
- it does not define new runtime semantics
- it does not belong in `core/**` until another host proves the same axes without Dota2-specific seam or doctor semantics

Current axes:

- lifecycle
- reusable governance
- grounding
- repairability
- product verdict derived from those axes

Repairability rule:

- repairability is observational
- live validation and repair planning may inform product display
- bridge export and connected-host status may carry a read-only snapshot
- repairability must not be persisted back as workspace authority
- `not_checked` is an honest state when no live observation was requested

Core genericization gate:

- do not introduce a generic core governance read-model from this Dota2 proof alone
- do not move Dota2 seam, provider-export, or doctor wording semantics into core
- do not rename the Dota2 schema to a host-agnostic schema until second-host evidence exists
- a future extraction needs evidence from another host that the same axes can be projected without importing Dota2-specific semantics

## Update Preservation Rule

Current Dota2 update truth now includes preservation of existing cross-feature seams during unrelated local-only updates.

That means:

- local-only `selection_pool` updates must preserve existing `selection-grant-bindings.json`
- existing dependency edges must remain unless the update explicitly rewires or removes them
- preserved sidecars must not be classified as safe deletions during local-only refreshes

## Validation And Final Gate

Current Dota2 post-generation truth includes:

- dependency-driven revalidation
- provider export consistency validation
- host validation
- runtime validation
- final commit gate

Current provider/export validator checks include:

- exported `abilityName` exists in `npc_abilities_custom.txt`
- `ScriptFile` resolves to a real Lua file when required
- provider-owned runtime symbol stays aligned with exported ability identity

## Honest Current Claim

Dota2 can now honestly claim:

- source-backed `selection_pool` updates write real host truth
- cross-feature draw shells may continue planning before provider resolution closes
- provider/consumer seams are explicit and separate
- provider ability identity is validated instead of guessed
- local-only updates preserve existing consumer bindings

It still should not claim:

- review-free exploratory output
- broad cross-feature mechanic generalization beyond the current narrow provider/consumer seam

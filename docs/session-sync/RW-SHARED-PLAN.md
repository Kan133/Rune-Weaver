# Rune Weaver Shared Plan

> Status: active-reference
> Audience: agents
> Doc family: control
> Update cadence: on-mainline-transition
> Last verified: 2026-04-24
> Read when: coordinating Dota2 and War3 mainlines or deciding the current cross-track attention split
> Do not use for: replacing latest session-sync notes or subsystem contract docs by itself

This file is the shared coordination plan across Dota2 mainline, War3 mainline, and the orchestrator.

Use these status markers:

- `[todo]`
- `[doing]`
- `[blocked]`
- `[done]`

## Dota2 Mainline

Current step:

- Step 7. Productization / UX bridge
- Current create-path delta: the Dota2 create front-door is no longer wizard-by-default for bounded local selection asks. Explicit choose-one `selection_pool` prompts now advance directly through Blueprint/family closure, `selection_pool` admission treats feature-owned pool membership plus `external_catalog` object truth honestly, and ambiguous weighted-card prompts stop on a single `selection_flow` clarification instead of leaking into synthesized fallback.
- Current host-proof delta: fresh hosts now prove the repaired create path end to end. `talent_draw_demo` writes and validates on `D:\rw-test30`, `equipment_draw_demo` writes and validates on `D:\rw-test31` through a catalog-backed `selection_pool` path, and the ambiguous weighted-card negative probe on `D:\rw-test32` remains blocked before write with exactly one honest `selection-flow-boundary`.
- Current proof delta: the Dota2-first governance product read-model now closes product-surface drift end to end. Bridge export emits a top-level `governanceReadModel`, workbench inspect and doctor wording consume the same lifecycle / reusable-governance / grounding / repairability projection, workbench UI prefers that shared projection over local heuristics, and the connected-host live path now also carries `governanceReadModel` through `/api/host/status -> useHostScanner -> useFeatureStore -> workspaceAdapter` without live observation side effects. Fresh host regressions still pass on `rw-test24`, `rw-test25`, `rw-test-1`, and `rw-test-2`, and the checked-in workbench bridge sample reflects the root-level `governanceReadModel` so compatibility-only fallback is no longer the default sample path.
- Current sample/debug delta: the checked-in public sample lane now defaults to a governed bridge-style payload, while the old raw workspace shape survives only as an explicitly named legacy compatibility probe for regression. Dev/mock fixture lanes are also neutralized so they no longer infer `committable`, `clean`, admitted reusable assets, grounding quality, or readiness scores from compatibility-only data.
- Current control-plane delta: Dota2 owns `buildDota2GovernanceReadModel(...)` as a product read-model builder without lifting Dota2 seam or doctor semantics into core. Product surfaces no longer need to infer lifecycle, admission, grounding, or repairability separately; repairability remains live observational truth and may be exported as a snapshot, but it is not promoted into persisted workspace authority.
- Current slice: Dota2 has moved past Step 6 evidence closure into a governance-read-model productization slice. The active work is now to keep CLI / workbench / bridge aligned on one honest projection of existing canonical truth, keep compatibility fallback visibly secondary only for stale bridge/workspace/host-status payloads, and avoid re-growing product-side heuristics while the admitted `grant_only_provider_export_seam` and the exploratory reveal/provider feature proofs remain bounded to their existing lifecycle and governance truths. In this slice, `export-bridge` is the only legacy payload refresh lane: it retires stale payloads by re-exporting governed bridge data, but it does not act as doctor/repair/validate, does not reopen Step 6 seam proof, and does not create runtime semantics or reusable admission.
- Current Step 7 policy is now explicit instead of aspirational:
  - compatibility-only fallback may shrink further only after all product/public sources are governed, connected-host stays read-model-first, legacy probes remain dev/debug/test-only, and guard tests prove no product path depends on compatibility projection
  - stale payload refresh is event-driven and only runs when product-facing host truth changes, the read-model projection changes, the public bridge artifact lacks root-level `governanceReadModel`, or a checked-in proof host/sample needs re-export
  - the only refresh command is `npm run cli -- export-bridge --host <path> [--output <dir>]`
  - Dota2 keeps `buildDota2GovernanceReadModel(...)` and schema version `dota2-governance-read-model/v1` inside the adapter until a second host proves the same axes without Dota2-specific seam or doctor semantics

Primary blocker:

- Update: Step 6 evidence closure is now strong enough that the active blocker has moved to product-surface honesty and compatibility control.
- The blocker is no longer missing admitted seam governance, positive stale-host upgrade proof where raw grounding survives, fresh reveal-only UI grounding closure, or a unified review-only grounding assessment consumed by validator, workspace, CLI, and workbench.
- The blocker is no longer missing typed `data + capability` contract metadata on the active Dota2 seams, and reusable-asset governance V1 is now explicit instead of implicit.
- The blocker is no longer missing V2 control-plane pieces, grammar gating removal, single-skill bundle convergence, facet-warning cleanup, source-backed update purity, templated `talent_draw` lifecycle stability, or initialized-host exploratory commit evidence.
- The blocker is now:
  - the former create-path blocker is closed: `equipment` no longer drifts to exploratory because of front-door/wizard authority leakage, and ambiguous weighted-card prompts no longer sneak past clarification
  - compatibility-only fallback still exists for stale raw workspace, old bridge, old host-status, and legacy workbench-result payloads, and it must remain display-only instead of regrowing product heuristics
  - the refresh lane must stay narrow: only `export-bridge` retires stale payloads, while doctor/validate/repair stay observational or validation-only
  - repairability must remain live observational truth rather than persisted workspace authority, even when bridge exports a snapshot for display or connected-host status projects read-only governance state
  - same-host repeated `F4` create proofs currently hit an honest downstream integration-point conflict; treat that as a separate governance/integration slice, not as a reason to reopen wizard/front-door authority
  - any future genericization of the read-model must wait for second-host evidence; do not lift Dota2 seam or doctor semantics into core prematurely

Plan items:

- `[done]` Land workspace/schema V2 lifecycle fields.
- `[done]` Land blueprint strategy selection and exploratory continuation semantics.
- `[done]` Land Dota2 artifact synthesis for guided-native / exploratory asks.
- `[done]` Reposition gap-fill into bounded local repair / muscle fill.
- `[done]` Land dependency-driven revalidation.
- `[done]` Land final commit decision as chain-end authority.
- `[done]` Ratify root baseline docs to V2 governance-first semantics.
- `[done]` Re-prove the closed V2 chain for the templated `talent_draw` case on a real host, including create/update/delete/recreate plus doctor/validate at each checkpoint.
- `[done]` Re-prove an initialized-host exploratory/guided-native write path with `requiresReview=true` on `D:\test3`, including host validation, runtime validation, and workspace persistence.
- `[done]` Land update-authority correctness so live module truth and source-backed invariants outrank legacy pattern-only preservation hints.
- `[done]` Land backbone-and-facet planning convergence so eligible exploratory single-ability asks collapse to one gameplay backbone, one unresolved need, one synthesized bundle, and default Lua+KV outputs.
- `[done]` Make must-requirement matching facet-aware and clean up remaining backbone warning noise.
- `[done]` Tighten source-backed family update purity for bounded `selection_pool` updates.
- `[done]` Re-prove the exact `talent_draw` demo prompt pair on a fresh host, including semantic artifact export, runtime validation, and the bounded 16-slot inventory update without `choiceCount` drift.
- `[done]` Stabilize create-side `IntentSchema` governance semantics for the bounded local weighted-selection / `talent_draw` cluster, including a 3-prompt x 5-run wizard stability proof with `governance-core variants = 1`.
- `[done]` Refactor `IntentSchema` internals into first-class `raw facts / governance decisions / open semantic residue` layers while keeping the public contract stable.
- `[done]` Push `IntentGovernanceDecisions` into downstream Dota2 blueprint / `selection_pool` family-admission / planning consumers so schema-surface wording no longer changes governance branches.
- `[done]` Align Dota2 provider ability identity so provider export only closes when KV / Lua / export share one authoritative runtime `abilityName`, and validator now rejects mismatched provider exports before host write can claim success.
- `[done]` Run or refresh dependency-driven revalidation evidence for provider/consumer cases on top of the cleaner planning/update surface, including fresh `rw-test-3` host proof for provider export identity, consumer sidecar preservation, and delete-style dependency blocking.
- `[done]` Strip create-side weight-detail clarification noise and family-governance pollution from the ambiguous weighted-card prompt cluster; `rw-test11` now isolates a single honest `selection_flow` clarification and re-proves the explicit choose-one variant end to end in dry-run.
- `[done]` Close the cross-feature consumer update-preservation hole so unrelated bounded updates keep existing provider bindings without requiring prompt restatement.
- `[done]` Close the exploratory bounded-update seam so non-source-backed trigger-only updates preserve synthesized Lua+KV gameplay shell identity while rebinding authoritative trigger truth end to end.
- `[done]` Move Dota2 ability KV ownership to fragment + aggregate-writer contract, including legacy rollback cleanup that removes ability blocks by authoritative identity instead of whole-file ownership.
- `[done]` Upgrade update intent to the same three-layer governance seam as create, and push governed update authority into the main Dota2 update consumers.
- `[done]` Extract the generic selection outcome realization seam, migrate `selection_pool` / `talent_draw` to per-object outcomes, and re-prove both the real CLI create path and the legacy `demo:talent-draw` harness on fresh `rw-test-1` host evidence.
- `[done]` Extract the shared selection-case demo/evidence runner so talent draw and equipment draw use one case-driven acceptance lane instead of parallel demo harnesses.
- `[done]` Re-prove `equipment_draw_demo` on fresh `rw-test-2` host evidence as a second `selection_pool + selection_outcome` sibling case using Dota2-native item delivery.
- `[done]` Close the prompt-side definition-only provider create boundary so `grant_only` provider shells advance past clarification and fail honestly at Blueprint instead of Stage 1 trigger/conflict questions.
- `[done]` Close the Stage 2 Blueprint/module-synthesis blocker for definition-only provider shells so the create path becomes assemblable/writeable, including fresh `rw-test14` provider write + consumer update + validate/doctor proof.
- `[done]` Land generic typed `contractId` metadata on `FeatureContract` `data/capability` surfaces plus dependency edges, and adopt it in Dota2 content-collection and provider-grant seams.
- `[done]` Land reusable-asset governance V1 with repo-side manual promotion packets/registry, and admit `effect.outcome_realizer` and `selection_pool` as the first Dota2 exemplars.
- `[done]` Close the reveal-only weighted-card boundary so ambiguous prompts block on clarification while explicit batch-reveal prompts write through a proven non-family exploratory path on fresh `rw-test20` host proof.
- `[done]` Land exploratory grounding governance V1 so synthesized Dota2 outputs carry canonical artifact/module/feature grounding assessments through final commit, workspace, validator, CLI, and workbench, with fresh-host proof on `rw-test21`.
- `[done]` Land explicit synthesized grounding recovery for raw-metadata-bearing stale hosts, keep too-old hosts regenerate-only, and tighten fresh grounding extraction/exact lookup to remove the reveal-batch helper/type false positives on fresh hosts.
- `[done]` Close the fresh reveal-only UI grounding seam with structured Panorama exact-backing instead of allowlist/prompt fallback, and re-prove provider-shell plus reveal-batch on fresh `rw-test24` host evidence.
- `[done]` Land the repo-side Dota2 promotion-readiness harness so repeated exploratory seams can be judged by explicit invariants without mutating formal admission truth.
- `[done]` Land durable provider export seam proof artifacts so manual packet prep has stable candidate evidence refs without claiming formal admission.
- `[done]` Add one positive stale-host upgrade proof where raw grounding metadata survives, so the explicit recovery path is backed by host evidence instead of tests only.
- `[done]` Admit `grant_only_provider_export_seam` as the first formal Dota2 `seam` asset after fresh-host proof, stale-host upgrade proof, durable acceptance refs, and governance closure all passed.
- `[done]` Land Dota2 Step 7 governance product read-model V1 so bridge export, workbench inspect, doctor wording, and workbench UI consume one four-axis projection of existing canonical truth.
- `[done]` Refresh the checked-in workbench bridge sample so the public artifact demonstrates a root-level `governanceReadModel` instead of teaching the compatibility-only path by default.
- `[done]` Close the connected-host live governance gap so `/api/host/status`, `useHostScanner`, `useFeatureStore`, and `workspaceAdapter` all prefer the Dota2 read-model-first path with `repairability = not_checked` when no live observation is requested.
- `[done]` Reduce compatibility-only fallback to an explicit legacy display boundary so stale raw workspace, bridge, host-status, and legacy workbench-result payloads no longer emit quasi-governance conclusions such as `committable`, `clean`, admitted reusable assets, or grounding trust.
- `[done]` Move the checked-in public sample and dev/mock teaching path onto governed truth: `sample-workspace.json` now carries a root-level `governanceReadModel`, the raw workspace sample survives only as an explicit legacy compatibility probe, and compatibility-only mock fixtures are neutralized to display-safe signals.
- `[done]` Record the Step 7 refresh-lane boundary so `export-bridge` is the only stale-payload refresh path, while doctor/validate/repair remain observation or proof surfaces rather than migration tools.
- `[done]` Fix the compatibility shrink policy: only shrink fallback after all product/public sources are governed, connected-host remains read-model-first, legacy probes stay dev/debug/test-only, and guard tests prove no product path depends on compatibility projection.
- `[done]` Fix the stale-payload refresh cadence as event-driven and `export-bridge`-only; refresh follows host-backed product changes or read-model/public-artifact deltas, never doctor/validate/repair/manual JSON edits.
- `[done]` Fix the no-core guard so Dota2 governance read-model genericization stays blocked until second-host evidence exists.
- `[done]` Close the Dota2 create front-door leak so wizard/clarification is no longer the default path for explicit choose-one local weighted-selection prompts, `selection_pool` admits honest external-catalog object truth, `equipment` writes through the same family/source-backed path as its siblings on a fresh host, and ambiguous weighted-card prompts remain blocked on a single `selection_flow` clarification.
- `[todo]` Decide whether any reveal-only runtime slice has enough repeated evidence to become a future promotion candidate without polluting `selection_pool`.

Mainline rule:

- Do not reintroduce grammar-v1 as a hard admission gate.
- Do not treat repair as the primary generation model.
- Do not let legacy pattern ids or advisory skeleton text outrank authoritative module truth on update.
- Do not treat exploratory success as stabilized output without review and repeated evidence.

## War3 Mainline

Current step:

- Step 7. Product-facing integration on a narrow backend seam
- Current slice: keep the bounded demo-probe loop honest while waiting for fresh external probe availability.

Primary blocker:

- War3 still lacks fresh downstream probe evidence and cannot claim write-ready runtime stability.

Plan items:

- `[done]` Mirror upstream reference set and tighten the review-oriented skeleton.
- `[done]` Keep `setup-mid-zone-shop` as the single canonical feature probe.
- `[done]` Add the bounded shadow realization lane and export/review helpers.
- `[doing]` Re-prove the bounded demo loop with a fresh successful probe response once external access is available.
- `[blocked]` Treat War3 as write-ready before the bounded probe loop is re-proved.

## Cross-Track Risks / Dependencies

Current judgment:

- Dota2 remains the roadmap-critical lane.
- War3 remains a bounded secondary lane.
- Docs/control refresh is now support work for a ratified baseline, not a hidden third mainline.

Plan items:

- `[doing]` Keep Dota2 focused on holding the fixed Step 7 policy: read-model-first product surfaces, compatibility-only as legacy display only, `export-bridge` as the only stale-payload refresh lane, and no core lift before second-host evidence.
- `[doing]` Keep War3 focused on bounded probe truth rather than broad expansion.
- `[todo]` Reuse shared seams only when one track produces stable evidence the other side can honestly consume.

## Near-Term Attention Split

Recommended split:

- Dota2 is the primary lane.
- War3 is the bounded secondary lane.

Plan items:

- `[doing]` Keep most attention on Dota2 productization and governance-surface convergence.
- `[todo]` Keep War3 narrow until a fresh probe run lands.
- `[done]` Keep second-host scope outside the near-term primary delivery lane.

## Source Notes

Latest Dota2 session-sync:

- [dota2-mainline-20260423-1444.md](/D:/Rune%20Weaver/docs/session-sync/dota2-mainline-20260423-1444.md)

Latest War3 session-sync:

- [war3-mainline-20260416-1107.md](/D:/Rune%20Weaver/docs/session-sync/war3-mainline-20260416-1107.md)

Stable orchestration guardrail:

- [RW-MAINLINE-ORCHESTRATION-PLAN.md](/D:/Rune%20Weaver/docs/RW-MAINLINE-ORCHESTRATION-PLAN.md)

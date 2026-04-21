# Rune Weaver Shared Plan

> Status: active-reference
> Audience: agents
> Doc family: control
> Update cadence: on-mainline-transition
> Last verified: 2026-04-21
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

- Step 6. Validation / evidence / case generalization
- Current slice: Dota2 V2 has now closed update-authority correctness, backbone-and-facet planning convergence, bounded create-side `IntentSchema` governance-core stability for the local weighted-selection / `talent_draw` semantic cluster, the second-round internal `IntentSchema` layer split that turns `raw facts / governance decisions / open semantic residue` into first-class seams, the downstream consumer audit that propagates `IntentGovernanceDecisions` into blueprint status, `selection_pool` family admission, and planning verdicts, the update-side three-layer governance upgrade that makes `CurrentFeatureTruth -> semanticAnalysis -> governedChange` the only intended update authority, and the provider-side ability identity alignment that stops cross-feature provider export from guessing `abilityName` when KV/Lua/export truth does not close. Fresh `rw-test6` dry-run evidence now also shows the bounded inventory wording cluster (`存储面板 / 仓库 / 库存面板`) converging through the same governed update seam, while the active slice has narrowed back to evidence closure on the stricter provider/consumer seam plus create-side exploratory grounding quality.

Primary blocker:

- The blocker is no longer missing V2 control-plane pieces, grammar gating removal, single-skill bundle convergence, facet-warning cleanup, source-backed update purity, templated `talent_draw` lifecycle stability, or initialized-host exploratory commit evidence.
- The blocker is no longer exploratory bounded trigger-key updates drifting into split `input.key_binding` vs preserved Lua shell truth, and it is no longer Dota2 ability KV ownership drifting back toward aggregate-file ownership.
- The blocker is now:
  - dependency-driven revalidation needs a fresh provider/consumer proof pass on the converged planning/update surface
  - create-side synthesis grounding for the weighted-selection / `talent_draw` exploratory cluster still drifts enough that the fresh `rw-test6` create prompt can miss the trigger boundary before host conflict becomes the decisive stop
  - synthesis grounding and deferred evidence warnings still need tighter exact-symbol backing on exploratory cases beyond the provider identity seam that just landed
  - exploratory outputs are still review-required and not yet converged into stabilized reusable assets

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
- `[doing]` Run or refresh dependency-driven revalidation evidence for provider/consumer cases on top of the cleaner planning/update surface.
- `[done]` Close the cross-feature consumer update-preservation hole so unrelated bounded updates keep existing provider bindings without requiring prompt restatement.
- `[done]` Close the exploratory bounded-update seam so non-source-backed trigger-only updates preserve synthesized Lua+KV gameplay shell identity while rebinding authoritative trigger truth end to end.
- `[done]` Move Dota2 ability KV ownership to fragment + aggregate-writer contract, including legacy rollback cleanup that removes ability blocks by authoritative identity instead of whole-file ownership.
- `[done]` Upgrade update intent to the same three-layer governance seam as create, and push governed update authority into the main Dota2 update consumers.
- `[doing]` Reduce synthesis grounding warnings further on exploratory asks.
- `[todo]` Decide which repeated exploratory outputs are ready to graduate into reusable assets.

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

- `[doing]` Keep Dota2 focused on evidence for the ratified V2 chain.
- `[doing]` Keep War3 focused on bounded probe truth rather than broad expansion.
- `[todo]` Reuse shared seams only when one track produces stable evidence the other side can honestly consume.

## Near-Term Attention Split

Recommended split:

- Dota2 is the primary lane.
- War3 is the bounded secondary lane.

Plan items:

- `[doing]` Keep most attention on Dota2 evidence closure.
- `[todo]` Keep War3 narrow until a fresh probe run lands.
- `[done]` Keep second-host scope outside the near-term primary delivery lane.

## Source Notes

Latest Dota2 session-sync:

- [dota2-mainline-20260421-0833.md](/D:/Rune%20Weaver/docs/session-sync/dota2-mainline-20260421-0833.md)

Latest War3 session-sync:

- [war3-mainline-20260416-1107.md](/D:/Rune%20Weaver/docs/session-sync/war3-mainline-20260416-1107.md)

Stable orchestration guardrail:

- [RW-MAINLINE-ORCHESTRATION-PLAN.md](/D:/Rune%20Weaver/docs/RW-MAINLINE-ORCHESTRATION-PLAN.md)

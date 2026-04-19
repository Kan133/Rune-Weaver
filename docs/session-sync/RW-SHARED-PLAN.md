# Rune Weaver Shared Plan

> Status: active-reference
> Audience: agents
> Doc family: control
> Update cadence: on-mainline-transition
> Last verified: 2026-04-19
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
- Current slice: Dota2 V2 exploratory/guided-native now has fresh initialized-host write evidence, not just dry-run proof. The active slice is to widen evidence beyond that proof by validating dependency-driven revalidation, reducing synthesis grounding warnings, and proving partial-pattern-plus-synthesis convergence without reintroducing grammar-era gating.

Primary blocker:

- The blocker is no longer missing V2 control-plane pieces, templated `talent_draw` lifecycle stability, or initialized-host exploratory commit evidence.
- The blocker is now:
  - missing fresh dependency-driven revalidation evidence on provider/consumer changes
  - synthesis grounding still emits host enum/API evidence warnings on exploratory cases
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
- `[doing]` Run or refresh dependency-driven revalidation evidence for provider/consumer cases.
- `[doing]` Reduce negative-constraint drift and synthesis grounding warnings on exploratory asks.
- `[todo]` Decide which repeated exploratory outputs are ready to graduate into reusable assets.

Mainline rule:

- Do not reintroduce grammar-v1 as a hard admission gate.
- Do not treat repair as the primary generation model.
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

- [dota2-mainline-20260419-1335.md](/D:/Rune%20Weaver/docs/session-sync/dota2-mainline-20260419-1335.md)

Latest War3 session-sync:

- [war3-mainline-20260416-1107.md](/D:/Rune%20Weaver/docs/session-sync/war3-mainline-20260416-1107.md)

Stable orchestration guardrail:

- [RW-MAINLINE-ORCHESTRATION-PLAN.md](/D:/Rune%20Weaver/docs/RW-MAINLINE-ORCHESTRATION-PLAN.md)

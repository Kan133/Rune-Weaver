# Rune Weaver Shared Plan

> Status: active-reference
> Audience: agents
> Doc family: control
> Update cadence: on-mainline-transition
> Last verified: 2026-04-14
> Read when: coordinating Dota2 and War3 mainlines or deciding the current cross-track attention split
> Do not use for: replacing latest session-sync notes or subsystem contract docs by itself

This file is the shared coordination plan across Dota2 mainline, War3 mainline, and the orchestrator.

Update this file in place after reading:

- the latest Dota2 mainline session-sync
- the latest War3 mainline session-sync
- the stable orchestration guardrail
- the most relevant control docs when low-frequency plan text needs refreshing

Use these status markers:

- `[todo]`
- `[doing]`
- `[blocked]`
- `[done]`

If the latest same-day session-sync notes disagree with lower-frequency control docs on the current step or blocker, refresh this file first and then refresh the stale control docs before routing more workers.

## Dota2 Mainline

Current step:

- Step 7. Productization / UX bridge
- Current slice: freeze Talent Draw as the one canonical skeleton+fill acceptance path and close the fresh-host manual acceptance / evidence pass through `review -> confirmation/apply -> validate -> repair-build -> launch`

Primary blocker:

- The canonical Dota2 path is now structurally clear, but a fresh-host manual acceptance pass is still open:
  - runtime screenshots and video are still missing
  - the evidence pack still depends on manual runtime capture
  - the handoff-safe proof is not complete until the frozen canonical flow is rerun end to end on a fresh host

Plan items:

- `[done]` Confirm the active Dota2 mainline step from the latest 2026-04-14 session-sync: Step 7 `Productization / UX bridge`, now centered on feature-scoped Gap Fill rather than standing lifecycle evidence closure.
- `[done]` Land Dota2-side gap-fill boundary resolution from selected patterns and persist `gapFillBoundaries` into workspace state, with backward compatibility for older hosts/workspaces.
- `[done]` Make `dota2 gap-fill` feature-aware instead of boundary-only so a selected feature can drive the CLI-backed fill flow.
- `[done]` Productize the first Workbench feature-detail Gap Fill panel so it can list fillable boundaries and execute the CLI-backed planning flow.
- `[done]` Replace raw boundary ids with clearer business-facing labels and explain the current fillable boundary surface in Workbench.
- `[done]` Surface the exact gap-fill next-step guidance directly in Workbench through structured canonical guidance.
- `[done]` Extend the current plan/review path into a first-class approval/apply/validate flow with continuation rail gating.
- `[done]` Freeze Talent Draw as the only canonical skeleton+fill acceptance path and refresh the evidence pack around that contract.
- `[done]` Re-run the canonical CLI path on a clean Dota2 host (`D:\RN`) and archive the refreshed evidence pack with `review-artifact.json`.
- `[blocked]` Call the Dota2 Gap Fill path stable acceptance-proof before the runtime/manual evidence pass is complete.
- `[doing]` Prepare the runtime closure pass on `D:\RN`:
  - `yarn dev`
  - `yarn launch rn temp`
  - manual screenshots/video capture
- `[todo]` Only after canonical acceptance is re-proven should Dota2 choose the next proof point:
  - either a second mechanism case
  - or a broader gap-fill product surface

## War3 Mainline

Current step:

- Step 7. Product-facing integration on a narrow backend seam
- Current slice: anchor the upstream reference base and tighten the current TSTL skeleton / host contract against the chosen canonical stack without claiming write-ready host execution

Primary blocker:

- War3 now has a stronger upstream evidence base, but the RW skeleton and host contract are still too lightweight for honest write-ready claims:
  - `tmp/war3-tstl-skeleton` has not yet been tightened against the chosen canonical stack
  - KK 1.29 runtime behavior is still not proven
  - Classic Lua workflow evidence remains useful context, not direct TSTL runtime proof

Plan items:

- `[done]` Confirm the active War3 mainline step from the latest 2026-04-14 session-sync: Step 7 remains a bounded product-facing integration lane, not a write-ready host lane.
- `[done]` Mirror the current upstream reference set into `references/war3/github/` and record the canonical stack for the War3 lane.
- `[done]` Anchor the current authoring judgment:
  - TypeScript -> TypeScriptToLua -> Lua output is the mainline authoring seam
  - Classic Lua workflow evidence is reference context, not the TSTL authoring baseline
- `[doing]` Tighten `tmp/war3-tstl-skeleton` against the canonical upstream stack instead of resuming broad ecosystem search.
- `[todo]` Add the next concrete skeleton/host-contract facts:
  - real build/dev/test seams
  - definitions-generation placeholder
  - explicit map naming decision
  - `warcraft.json` compatibility or deliberate non-adoption
- `[blocked]` Treat War3 as write-ready or runtime-proven before the skeleton and host contract have been tightened against the chosen upstream stack.
- `[todo]` Reflect only the necessary host/workflow facts into validator / intake / handoff code after the skeleton alignment is decided.

## Cross-Track Risks / Dependencies

Current judgment:

- No hard cross-track delivery dependency is evidenced for the next slice.
- Dota2 remains the roadmap-critical lane.
- War3 should continue in a bounded secondary lane.
- The docs/control refresh wave is controller-owned support work, not a third hidden mainline.

Plan items:

- `[done]` Rebuild shared coordination truth from the latest 2026-04-14 Dota2 and War3 session-sync notes instead of the older 2026-04-13 status packet.
- `[doing]` Keep Dota2 focused on canonical gap-fill acceptance closure and War3 focused on skeleton / host-contract tightening instead of reopening broad generic host-shell work.
- `[todo]` Reuse shared host/workspace seams only when one track has produced a stable artifact the other side can honestly consume.
- `[todo]` Coordinate before changing shared `apps/workbench-ui` shell infrastructure or generic host-status plumbing.
- `[todo]` Keep low-frequency control docs synced to fresh session-sync truth quickly enough that agents are not routed by stale step/blocker language.

## Near-Term Attention Split

Recommended split:

- Dota2 is the primary lane.
- War3 is the bounded secondary lane.

Plan items:

- `[doing]` Keep the main attention on Dota2 until the Gap Fill product flow is clear enough to support an honest next proof point.
- `[todo]` Keep a smaller War3 lane on skeleton tightening and host-contract evidence rather than broad product-shell expansion.
- `[done]` Keep second-host scope outside the current near-term mainline split.
- `[done]` Keep the architecture/doc-governance wave as a controller-owned support track rather than letting it replace Dota2 or War3 execution work.

## Source Notes

Latest Dota2 session-sync:

- [dota2-mainline-20260414-2335.md](/D:/Rune%20Weaver/docs/session-sync/dota2-mainline-20260414-2335.md)

Latest War3 session-sync:

- [war3-mainline-20260414-1906.md](/D:/Rune%20Weaver/docs/session-sync/war3-mainline-20260414-1906.md)

Stable orchestration guardrail:

- [RW-MAINLINE-ORCHESTRATION-PLAN.md](/D:/Rune%20Weaver/docs/RW-MAINLINE-ORCHESTRATION-PLAN.md)

Notes:

- Dota2 judgments are anchored to the 2026-04-14 canonical skeleton+fill acceptance-closure sync, not the older evidence-closure queue.
- War3 judgments are anchored to the 2026-04-14 upstream-stack / skeleton-tightening sync, not the older implementation-draft consumer focus.

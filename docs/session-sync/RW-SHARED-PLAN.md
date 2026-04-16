# Rune Weaver Shared Plan

> Status: active-reference
> Audience: agents
> Doc family: control
> Update cadence: on-mainline-transition
> Last verified: 2026-04-16
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

- Step 2. Blueprint / pattern selection
- Current slice: the family-by-family honesty-tightening subphase, the current-seam `package 2` bounded pass, the frozen-seam `package 4` coverage audit, and package-6 acceptance execution have now all stage-closed for current grammar-v1. The next active Dota2 Step 2 work is to open the bounded `scheduler/timer` seam-expansion package deliberately, not to reopen frozen-seam package-2/package-4 work or rerun package-6 preflight.
- Narrow truth-sync already landed inside that slice:
  - `integration.state_sync_bridge` now routes honestly as a deliberately elided `bridge-only` path with no standalone bridge file emitted
  - `resource/cost` now has one honest narrow same-feature caller path, but the family still remains partial overall

Primary blocker:

- The current Dota2 core is still too case-led and too thin in upstream semantic emission and Dota2 pattern family coverage.
- Package-level judgment after the latest audits:
  - package 1 is landed enough for current v1
  - package 2 is still incomplete overall, but its current-seam bounded pass is stage-closed and it is no longer the default active package
  - package 3 is landed enough for current v1
  - package 4 is still incomplete overall, but its frozen-seam coverage audit is stage-closed and no new bounded downstream package is open on the current seam
  - package 5 is landed enough for current v1
- Current boundary judgment:
  - frozen-seam Step 2 is now at the implementation boundary, seam boundary, and grammar-v1 declared boundary together for same-size code motion
  - package 6 has now executed and validated the frozen-seam boundary
  - the next controller task is to open the first deliberate seam/family expansion rather than reopen package-2/package-4 cleanup
- Next structural read:
  - current seam-expansion ranking is `scheduler/timer` first, then `reward/progression`, then `spawn/emission`, then broad standalone `entity/session state`
- Latest acceptance read:
  - pass bucket matched expectation
  - block bucket matched expectation
  - seam-gap bucket confirmed `scheduler/timer` as the first next seam
  - package 6 also exposed and repaired one frozen-seam overclaim:
    - unsupported `scheduler/timer`, `reward/progression`, and `spawn/emission` asks were still being normalized to `ready` by collapsing into admitted families
    - `FinalBlueprint` now honest-blocks those asks instead
- The real `gap-fill` chain and the first two bounded Dota2 cases remain useful evidence that downstream write / validation seams exist, but they do not remove the core blocker.
- The honest risk now is compensating for missing core support with another case, more Workbench polish, or more docs instead of landing the generalized path in code.

Plan items:

- `[done]` Reclassify Dota2 mainline away from Step 7 productization / second-case tightening and back to Step 2 core generalization.
- `[done]` Preserve the proven downstream Dota2 path as supporting evidence rather than as the architecture driver:
  - real CLI-backed `gap-fill` review / apply / validate-applied / doctor has already run on `D:\test3`
  - Workbench remains a thin shell over CLI authority
  - Talent Draw and the second bounded mechanism pass remain useful evidence, not the mainline queue
- `[done]` Freeze Dota2 mechanic grammar v1 around reusable semantic families rather than case or map-template names:
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
- `[done]` State the Dota2 grammar v1 out-of-scope set clearly enough that agents stop treating every new mechanic ask as an implicit same-day implementation promise.
- `[done]` Land and stage-close the highest-value bounded current-seam package-2 pass:
  - one bounded current-seam pass has already landed
  - no same-size existing-seam follow-up is currently discovered
  - do not route sessions back into package-2 wording cleanup by default
- `[done]` Migrate resolver behavior to `ModuleNeed -> capability fit`, with `explicitPatternHints` limited to tie-break usage and unresolved needs producing deterministic block/weak output instead of silent fallback.
- `[done]` Complete the frozen-seam package-4 coverage closure pass:
  - same-size family honesty tightening is now exhausted for the currently discovered partial families
  - the frozen-seam audit found no single bounded downstream package worth landing now
  - remaining movement now requires either broader family/seam work or a higher-level Step 2 package decision
- `[done]` Land the narrow slice honesty fix for `integration.state_sync_bridge`:
  - routed
  - deliberately elided
  - no standalone bridge file emitted
  - still not broad bridge-family admission
- `[done]` Land the narrow slice honesty fix for `resource/cost`:
  - the family remains `partial`
  - one honest canonical path now exists through same-feature `input.key_binding + resource.basic_pool + effect.resource_consume`
  - no-caller, caller-ambiguous, multi-consumer, and pool/resource mismatch shapes still honest-defer
- `[done]` Stabilize host realization and generator routing around reusable grammar families for the currently admitted and narrow-supported combinations so supported mechanic combinations do not require new product-code routing and bounded `GapFill` stays downstream instead of becoming a substitute architecture layer.
- `[done]` Select the next Dota2 seam-expansion package deliberately instead of reopening frozen-seam cleanup:
  - current ranking is `scheduler/timer` first
  - then `reward/progression`
  - then `spawn/emission`
  - then broad standalone `entity/session state`
- `[done]` Reintroduce Dota2 cases only as a package-6 acceptance matrix:
  - `should-pass-without-new-product-code`
  - `should-honest-block-on-current-v1`
  - `should-expose-next-seam-gap`
  - package 6 has now executed and validated frozen-seam truth instead of letting one case drive architecture
- `[doing]` Prepare and open the first post-boundary Step 2 seam-expansion package around `scheduler/timer`.

Mainline rule:

- Do not add a new case to compensate for missing core generalization.
- If a supported mechanic still requires product-code changes to work, that is a core blocker, not a case milestone.

## War3 Mainline

Current step:

- Step 7. Product-facing integration on a narrow backend seam
- Current slice: keep the bounded demo-probe loop honest while adding one adapter-local, review-only shadow realization/draft lane for the same canonical `setup-mid-zone-shop` feature through `War3ShadowRealizationPlan -> War3ShadowDraftBundle -> review package/export/validate/probe-input`

Primary blocker:

- War3 now has a stronger local review chain and a first honest narrow consumer loop, but it still cannot claim live downstream stability:
  - current external probe execution is blocked by `kimi` membership / request availability
  - KK 1.29 runtime behavior is still not proven
  - Classic Lua workflow evidence remains useful context, not direct TSTL runtime proof

Plan items:

- `[done]` Confirm the active War3 mainline step from the latest 2026-04-14 session-sync: Step 7 remains a bounded product-facing integration lane, not a write-ready host lane.
- `[done]` Mirror the current upstream reference set into `references/war3/github/` and record the canonical stack for the War3 lane.
- `[done]` Anchor the current authoring judgment:
  - TypeScript -> TypeScriptToLua -> Lua output is the mainline authoring seam
  - Classic Lua workflow evidence is reference context, not the TSTL authoring baseline
- `[done]` Tighten `tmp/war3-tstl-skeleton` into a review-oriented local contract with executable seams, typed feature review, snapshot/manifest/intake layers, and bounded demo-case surfaces.
- `[done]` Freeze current War3 bounded judgments in the skeleton/host docs:
  - `maps/demo.w3x` remains the RW review-oriented map path
  - `warcraft.json` remains deliberate non-adoption for now
  - `setup-mid-zone-shop` remains the single canonical feature probe
- `[done]` Add the current bounded demo-probe helpers:
  - review-package artifact bridge
  - probe-input builder
  - demo-probe wrapper
  - bounded probe-result summarizer
- `[done]` Add one bounded adapter-local War3 shadow path for the same canonical feature without changing step/blocker truth:
  - `War3ShadowRealizationPlan`
  - `War3ShadowDraftBundle`
  - review-package/export/validate compatibility threading over that shadow lane
- `[doing]` Re-prove the new bounded demo loop with a fresh successful probe response once external probe access is available again.
- `[blocked]` Treat War3 as write-ready or runtime-proven before the skeleton and host contract have been tightened against the chosen upstream stack.
- `[blocked]` Treat the current bounded demo loop as stable downstream evidence before the external probe execution blocker is cleared.
- `[todo]` Only after one fresh successful bounded probe run should War3 choose between:
  - tightening the same feature's prompt / summary loop
  - or extending the same bounded pattern to exactly one second feature probe

## Cross-Track Risks / Dependencies

Current judgment:

- No hard cross-track delivery dependency is evidenced for the next slice.
- Dota2 remains the roadmap-critical lane.
- War3 should continue in a bounded secondary lane.
- The docs/control refresh wave is controller-owned support work, not a third hidden mainline.

Plan items:

- `[done]` Rebuild shared coordination truth from the latest 2026-04-14 Dota2 and War3 session-sync notes instead of the older 2026-04-13 status packet.
- `[doing]` Keep Dota2 focused on Step 2 core generalization over `IntentSchema`, `FinalBlueprint`, resolver semantics, pattern family coverage, and deterministic routing; keep War3 focused on bounded demo-probe validation instead of reopening broad generic host-shell work.
- `[todo]` Reuse shared host/workspace seams only when one track has produced a stable artifact the other side can honestly consume.
- `[todo]` Coordinate before changing shared `apps/workbench-ui` shell infrastructure or generic host-status plumbing.
- `[todo]` Keep low-frequency control docs synced to fresh session-sync truth quickly enough that agents are not routed by stale step/blocker language.

## Near-Term Attention Split

Recommended split:

- Dota2 is the primary lane.
- War3 is the bounded secondary lane.

Plan items:

- `[doing]` Keep the main attention on Dota2 while the Step 2 core-generalization packages are landed; treat cases as later acceptance probes rather than current architecture drivers.
- `[todo]` Keep a smaller War3 lane on bounded demo-probe validation and host-contract evidence rather than broad product-shell expansion.
- `[done]` Keep second-host scope outside the current near-term mainline split.
- `[done]` Keep the architecture/doc-governance wave as a controller-owned support track rather than letting it replace Dota2 or War3 execution work.

## Source Notes

Latest Dota2 session-sync:

- [dota2-mainline-20260414-2359.md](/D:/Rune%20Weaver/docs/session-sync/dota2-mainline-20260414-2359.md)

Latest War3 session-sync:

- [war3-mainline-20260416-1107.md](/D:/Rune%20Weaver/docs/session-sync/war3-mainline-20260416-1107.md)

Stable orchestration guardrail:

- [RW-MAINLINE-ORCHESTRATION-PLAN.md](/D:/Rune%20Weaver/docs/RW-MAINLINE-ORCHESTRATION-PLAN.md)

Notes:

- Dota2 judgments are anchored to the 2026-04-14 Step 2 core-generalization sync, not the older Talent Draw-only evidence-closure queue or the later second-case-tightening slice.
- War3 judgments are anchored to the 2026-04-14 bounded demo-probe loop sync, not the older upstream-stack / skeleton-tightening sync.

# Talent Draw Canonical Gap Fill Demo

This document freezes the current canonical skeleton-plus-fill demo for the Dota2 mainline.

## Canonical Prompt

```text
把稀有度映射改成 R / SR / SSR / UR 分别提供 1 / 2 / 4 / 7 点全属性，并保留现有触发键、桥接、事件通道和 UI 交互。
```

## Canonical Boundary

```text
selection_flow.effect_mapping
```

## Canonical Order

```text
create skeleton
-> gap-fill review
-> confirmation/apply
-> validate
-> repair-build
-> launch
```

## Canonical Evidence

Required screenshots:

1. `06-gap-fill-review.png` - Workbench gap-fill review
2. `07-gap-fill-approval-unit.png` - Workbench approval / confirmation unit
3. `02-ui-open.png` - In-game modal after `F4`
4. `04-after-select.png` - Post-selection effect visible on hero
5. `08-gap-fill-continuation.png` - Workbench continuation rail after apply + validate

Required video:

- `talent-draw-demo-runtime.mp4`

Required artifact classes:

- gap-fill review artifact
- approval record when confirmation was required
- validate result
- doctor output
- repair/build output when continuation was used
- `canonical-gap-fill-contract.json`
- `acceptance-summary.json`

Do not treat runs using another prompt or another boundary as canonical acceptance evidence.

## Canonical Closure Reading Order

For operator-grade closure on a fresh host, inspect artifacts in this order:

1. `acceptance-summary.json`
2. `manifest.json`
3. `canonical-gap-fill-contract.json`
4. the required screenshots and runtime video

This keeps the closure judgment honest:

- `canonical_acceptance_ready`
  - frozen prompt and boundary matched
  - required auto evidence exists
  - required manual evidence exists
- `canonical_incomplete`
  - the run is still canonical
  - but closure is not complete because evidence is still missing
- `exploratory`
  - the run drifted from the frozen prompt or boundary
  - it is not acceptance-equivalent, even if other files exist

For replay-package consistency, also check:

- `consistencyChecks`
  - the pack still records canonical contract, review state, and approval evidence coherently
- `handoffReadiness`
  - another operator can consume the pack without hidden sequencing knowledge
- `proofPointGate`
  - remains blocked until the pack is complete and handoff-safe

## Frozen Operator Sequence

Use this order and do not skip steps when collecting acceptance evidence:

1. create skeleton
2. refresh evidence pack once
3. confirm the pack is canonical, not exploratory
4. gap-fill review
5. confirmation/apply
6. validate
7. repair-build
8. launch
9. capture Workbench screenshots `06`-`08`
10. capture runtime screenshots `01`-`05`
11. save `talent-draw-demo-runtime.mp4`
12. refresh evidence pack again and re-check `acceptance-summary.json`

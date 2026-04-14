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

Do not treat runs using another prompt or another boundary as canonical acceptance evidence.

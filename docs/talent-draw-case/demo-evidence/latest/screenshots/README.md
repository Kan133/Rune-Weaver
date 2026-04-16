# Screenshots Directory

This directory contains manual screenshot evidence for the Talent Draw demo.

## Required Screenshots

| # | Filename | Scene | Description |
|---|----------|-------|-------------|
| 1 | 01-initial.png | Initial | Phoenix at spawn, UI not triggered |
| 2 | 02-ui-open.png | F4 triggered | Three-card selection modal open |
| 3 | 03-card-detail.png | Card detail | Clear view of rarity/name/effect |
| 4 | 04-after-select.png | Post-selection | Hero attributes changed |
| 5 | 05-second-draw.png | Second draw | Previously selected talent absent |
| 6 | 06-gap-fill-review.png | Workbench | Canonical gap-fill review summary strip + readiness visible |
| 7 | 07-gap-fill-approval-unit.png | Workbench | Approval / confirmation unit visible |
| 8 | 08-gap-fill-continuation.png | Workbench | Continuation rail visible after apply + validate |

## Capture Instructions

1. Launch Dota 2 Custom Game Tools with the host addon
2. Load the test map, for example "temp"
3. Use F12 or Steam overlay to capture screenshots
4. Save to this directory with the filenames above
5. Save the runtime video beside latest/ as talent-draw-demo-runtime.mp4

Note: Screenshots are manual evidence and cannot be auto-generated.

## Closure Workflow

Use screenshots as part of the canonical closure flow, not as standalone proof:

1. Run the frozen canonical path through `review -> confirmation/apply -> validate -> repair-build -> launch`
2. Capture the Workbench screenshots `06`-`08`
3. Capture the runtime screenshots `01`-`05`
4. Save `talent-draw-demo-runtime.mp4` under `latest/`
5. Re-run `npm run demo:talent-draw:refresh -- --host <x-template-path>`
6. Inspect `../acceptance-summary.json` first

The pack is only complete when `acceptance-summary.json` reports `canonical_acceptance_ready`.
If it reports `canonical_incomplete`, continue filling the missing screenshot/video items.
If it reports `exploratory`, do not use the run as canonical acceptance evidence.

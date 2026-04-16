# Talent Draw Runtime Demo Guide

Complete walkthrough from fresh x-template to playable Dota2 demo.

---

## Prerequisites

| Item | Requirement |
|------|-------------|
| Node.js | >= 18 |
| Yarn | >= 1.22 |
| Dota 2 Tools | Installed and launchable |
| Rune Weaver | Cloned and `npm install` completed |
| x-template | Clean copy, **never ran `yarn install`** |

---

## Quick Flow

```bash
# 1. Edit addon.config.ts BEFORE yarn install
cd <x-template-path>/scripts
# Edit: addon_name = 'talent_draw_demo'

# 2. Install dependencies
cd <x-template-path>
yarn install
# Verify the install created:
#   game/dota_addons/talent_draw_demo
#   content/dota_addons/talent_draw_demo

# 3. Check the runbook
cd <rune-weaver-path>
npm run cli -- dota2 demo prepare \
  --host <x-template-path> \
  --addon-name talent_draw_demo \
  --map temp

# 4. Run Rune Weaver init/write and write the Talent Draw fixture
npm run demo:talent-draw -- --host <x-template-path> --write --force

# 5. Runtime diagnosis
npm run cli -- dota2 doctor --host <x-template-path>

# 6. Post-generation validation
npm run cli -- dota2 validate --host <x-template-path>

# 7. Build host
cd <x-template-path>
yarn dev

# 8. Launch Dota2
yarn launch talent_draw_demo temp
```

---

## Canonical Skeleton + Fill Demo

This is the one canonical Gap Fill demo path for Talent Draw. Do not swap in another prompt or another boundary when collecting acceptance evidence.

### Canonical Prompt

Use this instruction in the Gap Fill panel for the Talent Draw business-logic pass:

```text
把稀有度映射改成 R / SR / SSR / UR 分别提供 1 / 2 / 4 / 7 点全属性，并保留现有触发键、桥接、事件通道和 UI 交互。
```

### Canonical Boundary

Use:

```text
selection_flow.effect_mapping
```

This keeps the demo honest:
- skeleton first
- business logic second
- no bridge or host-routing mutation hidden inside gap fill

### Canonical Evidence Moments

Capture these moments in order:

1. Workbench review result visible
2. approval / confirmation unit visible when required
3. in-game modal visible after `F4`
4. post-selection effect visible on hero
5. continuation result after apply/validate and before launch

Use these frozen filenames when saving canonical screenshots:

- `06-gap-fill-review.png`
- `07-gap-fill-approval-unit.png`
- `08-gap-fill-continuation.png`
- runtime video: `talent-draw-demo-runtime.mp4`

### Canonical Closure Rule

Do not decide closure from a single screenshot, a green UI panel, or a successful launch alone.

For the current Dota2 mainline, always judge closure from:

1. `docs/talent-draw-case/demo-evidence/latest/acceptance-summary.json`
2. `docs/talent-draw-case/demo-evidence/latest/manifest.json`
3. the required manual screenshot/video files

If `acceptance-summary.json` says `canonical_incomplete`, the run is still open even if the host launches successfully.
If it says `exploratory`, do not use the run as canonical acceptance evidence.

---

## Detailed Steps

### Step 1: Edit addon.config.ts (MUST be before yarn install)

```typescript
// x-template/scripts/addon.config.ts
let addon_name: string = 'talent_draw_demo';
```

**Critical**: `yarn install` creates Steam addon directory links. Renaming after install causes path mismatches.

---

### Step 2: Install Host Dependencies

```bash
cd <x-template-path>
yarn install
```

**Check**: the host `game/` and `content/` folders should resolve to the Steam addon outputs for `talent_draw_demo`.

Example resolved targets:

```text
E:\Steam\steamapps\common\dota 2 beta\game\dota_addons\talent_draw_demo
E:\Steam\steamapps\common\dota 2 beta\content\dota_addons\talent_draw_demo
```

---

### Step 3: Demo Prepare Runbook

```bash
cd <rune-weaver-path>
npm run cli -- dota2 demo prepare \
  --host <x-template-path> \
  --addon-name talent_draw_demo \
  --map temp
```

Default behavior is plan-only. It does not run `yarn install`, does not write the feature, and does not launch Dota2.

With `--write`, the first version only performs a safe addon-name repair in `scripts/addon.config.ts`. Workspace initialization and feature writing must still go through the normal Rune Weaver pipeline.

Expected ready runbook after a prepared host:

- addon.config name matches
- yarn install output exists (`game/dota_addons/<addon>` and `content/dota_addons/<addon>`)
- `node_modules` exists
- `postinstall`, `dev`, and `launch` scripts exist
- Rune Weaver workspace exists or will be created by init/write
- Runtime Doctor and Post-Generation Validate are ready to run
- next commands are `yarn dev` and `yarn launch talent_draw_demo temp`

---

### Step 4: Rune Weaver Init / Demo Write

For the canonical Talent Draw fixture:

```bash
cd <rune-weaver-path>
npm run demo:talent-draw -- --host <x-template-path> --write --force
```

This writes the current Talent Draw fixture through the Rune Weaver pipeline and produces review evidence under `tmp/cli-review/`.
It is the demo write path that combines Rune Weaver init/write with host generation.

---

### Step 5: Doctor Check

```bash
npm run cli -- dota2 doctor --host <x-template-path>
```

Current first-pass checks:
- addon.config name matches intended addon
- Steam addon/content directories exist
- package scripts exist
- Rune Weaver workspace exists
- post-generation validation passes
- Rune Weaver namespace directories exist
- runtime bridge wiring exists
- Panorama build artifacts exist or report a clear `yarn dev` warning

Post-generation validation covers KV/Lua/server/UI/LESS/root consistency.

---

### Step 6: Validate

```bash
npm run cli -- dota2 validate --host <x-template-path>
```

Checks post-generation self-consistency: KV structure, ScriptFile paths, workspace file records, server/UI indexes, generated LESS imports, and `.rune-weaver-root` sizing.

### Step 7: Evidence Pack

The evidence refresh flow writes the latest files under `docs/talent-draw-case/demo-evidence/latest/`:

- `canonical-gap-fill-contract.json`
- `acceptance-summary.json`
- `demo-prepare-output.txt`
- `doctor-output.txt`
- `validate-output.txt`
- `generated-files.json`
- `review-artifact.json`
- `gap-fill-approvals/` when gap-fill participated
- `vconsole-template.txt`
- `screenshots/README.md`

#### Operator Closure Sequence

Use this exact order for the frozen canonical case:

1. finish skeleton write and refresh evidence
2. confirm `acceptance-summary.json` is `canonical_incomplete` or `canonical_acceptance_ready`, never `exploratory`
3. run canonical gap-fill review with the frozen prompt and boundary
4. continue through `confirmation/apply -> validate -> repair-build -> launch`
5. capture the required Workbench screenshots (`06`-`08`)
6. capture the required runtime screenshots (`01`-`05`) and `talent-draw-demo-runtime.mp4`
7. run `npm run demo:talent-draw:refresh -- --host <x-template-path>` again
8. inspect `acceptance-summary.json` first to see whether the pack is now complete

#### How To Read Closure Status

`acceptance-summary.json` is the first operator-facing answer:

- `canonical_acceptance_ready`
  - the frozen prompt/boundary still match
  - required auto evidence exists
  - required manual evidence exists
- `canonical_incomplete`
  - the run is still canonical
  - but one or more required evidence files are still missing
- `exploratory`
  - the observed prompt or boundary drifted from the frozen Talent Draw contract
  - this run must not be treated as canonical acceptance closure

`acceptance-summary.json` is also the replay-package consistency answer:

- `consistencyChecks`
  - tells you whether the pack still records the canonical contract, review state, and approval-evidence state coherently
- `handoffReadiness`
  - tells you whether another operator can consume the pack without guessing
- `proofPointGate`
  - stays `blocked` until the replay pack is both canonical-complete and handoff-safe

---

### Step 8: Build Host

```bash
cd <x-template-path>
yarn dev
```

Keep this process running while testing. The x-template `dev` command watches Panorama and TypeScript outputs.

---

### Step 9: Launch

```bash
yarn launch talent_draw_demo temp
```

---

## Success Criteria

| Check | Expected Result |
|-------|-----------------|
| Dota2 loads map | `temp` map loads successfully |
| Phoenix appears | Hero visible at spawn point |
| F4 opens UI | Talent Draw modal appears with 3 cards |
| Card display | Cards show rarity, name, effect description |
| Selection applies | Clicking card changes hero attributes |
| No duplicates | Selected talent does not appear on subsequent F4 |

---

## VConsole Log Checkpoints

| Phase | Log Keyword |
|-------|-------------|
| Module registration | `[Rune Weaver] TalentDrawDemo... registered` |
| Runtime ready | `[Rune Weaver] Runtime wiring ready for feature talent_draw_demo` |
| Key binding | `[Rune Weaver] Bound key: F4 for feature talent_draw_demo` |
| Key press payload | `key F4` and `featureId talent_draw_demo` |
| Session init | `[Rune Weaver] TalentDrawDemoRuleRuleSelectionFlow: Initialized session for player 0` |
| Ability attach | `[Rune Weaver] Attached ability rw_modifier_applier_0 to hero at level 1` |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| **Addon dirs missing** | `addon.config` renamed after `yarn install` | Restore a fresh host or rerun install after fixing `scripts/addon.config.ts`; `doctor` should show the resolved `game/` and `content/` targets |
| **F4 no handler** | Bridge/index or runtime wiring not refreshed | Re-run the Rune Weaver write path, then `yarn dev`; check generated server index references existing modules |
| **ScriptFile not found** | KV `ScriptFile` path != Lua file path | Verify `grep "ScriptFile" game/scripts/npc/npc_abilities_custom.txt` matches actual Lua file location |
| **UI not visible** | `yarn dev` not running, or HUD root missing, or LESS not imported | Confirm `yarn dev` running; check `content/panorama/src/hud/styles.less` imports generated LESS; verify `.rune-weaver-root` has `width: 100%; height: 100%` |
| **React maximum update depth** | Unstable event subscription / `useEffect` dependency | Avoid `const { items = [] } = props`; use lazy init: `useState(() => props.items ?? [])` |
| **npc_abilities_custom parse error** | Missing `DOTAAbilities` root or invalid KV braces | Verify file starts with `"DOTAAbilities" {`; ensure KV writes are structural, not text append |

---

## Evidence Pack

After successful run, save evidence per [demo-evidence/README.md](./demo-evidence/README.md):

1. Review artifact from `tmp/cli-review/`
2. Generated files list (from workspace)
3. Doctor output
4. Validate output
5. Gap-fill approval records, if any participated
6. VConsole excerpt
7. Screenshots

Refresh command:

```bash
npm run demo:talent-draw:refresh -- --host <x-template-path>
```

After every refresh, inspect these in order:

1. `docs/talent-draw-case/demo-evidence/latest/acceptance-summary.json`
2. `docs/talent-draw-case/demo-evidence/latest/manifest.json`
3. `docs/talent-draw-case/demo-evidence/latest/screenshots/README.md`

If manual evidence is still missing, capture it first and refresh again before calling the run complete.
If `handoffReadiness.status` is not `ready`, keep the run on closure work even if the host launched successfully.
If `proofPointGate.status` is `blocked`, do not open the next Dota2 proof point.

---

## Related Documents

- [CANONICAL-GAP-FILL-DEMO.md](./CANONICAL-GAP-FILL-DEMO.md) - Frozen skeleton-plus-fill demo contract
- [CANONICAL-CASE-TALENT-DRAW.md](./CANONICAL-CASE-TALENT-DRAW.md) - Frozen case definition
- [TALENT-DRAW-E2E-LESSONS.md](../hosts/dota2/TALENT-DRAW-E2E-LESSONS.md) - E2E lessons
- [DEMO-PATHS.md](../DEMO-PATHS.md) - Demo paths overview
- [ROADMAP.md](../ROADMAP.md) - Product roadmap

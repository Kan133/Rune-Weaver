# Talent Draw Runtime Evidence Pack

Evidence specification for Talent Draw runtime demo verification.

---

## Auto-Refresh Command

The `latest/` directory can be auto-refreshed using:

```bash
npm run demo:talent-draw:refresh -- --host D:\testB
```

This command:
1. Runs `npm run cli -- dota2 demo prepare --host <host> --addon-name talent_draw_demo --map temp` and saves output to `demo-prepare-output.txt`
2. Runs `npm run cli -- dota2 doctor --host <host>` and saves output to `doctor-output.txt`
3. Runs `npm run cli -- dota2 validate --host <host>` and saves output to `validate-output.txt`
4. Reads workspace file and extracts `generated-files.json`
5. Copies a host-matching review artifact from `tmp/cli-review/`, or falls back to canonical `artifact.json`
6. Copies host-matching gap-fill approval records into `gap-fill-approvals/` when gap-fill confirmation participated
7. Creates `vconsole-template.txt` with expected log checkpoints
8. Creates `screenshots/` directory with README
9. Writes `canonical-gap-fill-contract.json` with the frozen prompt, boundary, continuation order, screenshot set, and runtime video name

Lifecycle proof artifacts are generated separately by:

```bash
npm run cli -- dota2 lifecycle prove --host <host> --addon-name talent_draw_demo --map temp --write
```

Save the resulting `tmp/cli-review/lifecycle-proof-*.json` beside the refreshed evidence when validating update/delete/recreate behavior.
10. Writes `manifest.json` with overall status and exit codes

### Manual Evidence

The following evidence types require manual capture:
- **Screenshots**: Use F12 or Steam overlay during Dota 2 execution
- **VConsole logs**: Copy from Dota 2 VConsole during demo execution
- **Workbench product-entry screenshots**: Capture Workbench onboarding / guidance UI when this seam participates in the walkthrough

---

## Purpose

- **Reproduction**: New teammate can rerun walkthrough and compare against evidence
- **Regression testing**: Future changes can be compared against known-good state
- **Debug reference**: Failed runs can be diffed against working evidence
- **Lifecycle proof**: Update / rollback / delete / recreate smoke should be recorded with the same evidence pack and the checklist in [`../LIFECYCLE-PROOF.md`](../LIFECYCLE-PROOF.md)

---

## Canonical Gap Fill Demo Constraints

For the current Dota2 mainline, Talent Draw is the only canonical skeleton-plus-fill demo.

Lock these values when refreshing evidence:

- canonical prompt:
  - `把稀有度映射改成 R / SR / SSR / UR 分别提供 1 / 2 / 4 / 7 点全属性，并保留现有触发键、桥接、事件通道和 UI 交互。`
- canonical boundary:
  - `selection_flow.effect_mapping`
- canonical continuation order:
  - `review -> confirmation/apply -> validate -> repair-build -> launch`

If the run used another prompt, another boundary, or skipped continuation, treat it as exploratory evidence, not canonical acceptance evidence.

---

## Required Evidence Files

### 0. Canonical Gap Fill Contract

**Source**:
```text
latest/canonical-gap-fill-contract.json
```

**Contains**:
- frozen canonical prompt
- frozen canonical boundary
- continuation order
- required Workbench screenshots
- required runtime screenshots
- required runtime video filename

Use this file as the source of truth when deciding whether a refreshed pack qualifies as canonical acceptance evidence.

---

### 1. Review Artifact

**Source**:
```bash
npm run demo:talent-draw -- --host <path> --write --force
```

The command writes the canonical pipeline artifact to `docs/talent-draw-case/demo-evidence/artifact.json`. The refresh command copies it into `latest/review-artifact.json` when its host matches the refresh host.

**Contains**:
- pipeline stages (intent, blueprint, pattern resolution, assembly, routing, generator, write)
- generated file paths
- write executor result
- host validation and post-write risks
- final verdict
- lifecycle stage summaries when the case is updated, rolled back, deleted, or recreated

**Save as**: `review-<featureId>-<revision>.json`

---

### 2. Demo Prepare Output

**Source**:
```bash
npm run cli -- dota2 demo prepare --host <path> --addon-name talent_draw_demo --map temp
```

This captures the fresh-host runbook output, including addon.config rename order, yarn install output checks, Rune Weaver init/write guidance, doctor, validate, yarn dev, and launch steps.

**Save as**: `demo-prepare-output-<timestamp>.txt`

---

### 3. Generated Files List

**Source**: Workspace JSON feature `generatedFiles` field:

```text
<host>/game/scripts/src/rune_weaver/rune-weaver.workspace.json
```

Current workspace records `generatedFiles` as host-relative file paths. Preserve the feature id, revision, selected patterns, generated files, and entry bindings together.

**Save as**: `generated-files-<revision>.json`

---

### 4. Doctor Output

**Source**:
```bash
npm run cli -- dota2 doctor --host <path>
```

**Checks**:
- [ ] addon.config name matches
- [ ] Steam addon/content directories exist
- [ ] `npc_abilities_custom.txt` has valid `DOTAAbilities` root
- [ ] `ScriptFile` paths resolve to existing Lua files
- [ ] Server index references existing modules
- [ ] UI index imports existing components
- [ ] LESS files imported by HUD styles
- [ ] `.rune-weaver-root` has full-screen dimensions
- [ ] Bridge/runtime wiring exists
- [ ] Workspace records match disk files

For lifecycle proof, keep doctor output for both the pre-change and post-change host state when possible.

**Save as**: `doctor-output-<timestamp>.txt`

---

### 5. Validate Output

**Source**:
```bash
npm run cli -- dota2 validate --host <path>
```

**Checks**:
- KV structural validity
- ScriptFile path consistency
- Server/UI index references
- Path consistency

**Save as**: `validate-output-<timestamp>.txt`

---

### 6. Gap-Fill Approval Records

**Source**:
```text
tmp/cli-review/gap-fill-approval-*.json
```

These records are copied automatically when their `hostRoot` matches the refreshed host.

**Contains**:
- approval id
- host root
- boundary id
- target file hash
- patch plan hash
- decision and risk
- record hash

**Save as**: `gap-fill-approvals/gap-fill-approval-<timestamp>.json`

This evidence is optional. It is required only when the demo used a `require_confirmation` gap-fill patch.

---

### 7. VConsole Excerpt

**Key log lines**:
```
[Rune Weaver] TalentDrawDemo... registered
[Rune Weaver] Bound key: F4 for feature talent_draw_demo
[Rune Weaver] Runtime wiring ready for feature talent_draw_demo
key F4
featureId talent_draw_demo
[Rune Weaver] TalentDrawDemoRuleRuleSelectionFlow: Initialized session for player 0
[Rune Weaver] Attached ability rw_modifier_applier_0 to hero at level 1
```

**Save as**: `vconsole-<timestamp>.txt`

---

### 8. Screenshot

**Required captures**:

| # | Scene | Description |
|---|-------|-------------|
| 1 | Initial | Phoenix at spawn, UI not triggered |
| 2 | F4 triggered | Three-card selection modal open |
| 3 | Card detail | Clear view of rarity/name/effect |
| 4 | Post-selection | Hero attributes changed |
| 5 | Second draw | Previously selected talent absent |

**Save as**: `screenshot-<desc>-<timestamp>.png`

### 9. Workbench Product-Entry Capture

When the walkthrough includes the Workbench onboarding/product-entry seam, capture:

| # | Scene | Description |
|---|-------|-------------|
| 1 | Host configured | Host path accepted, addon/map visible |
| 2 | Guided state | `Current Guided State` visible before or after an action |
| 3 | CLI-backed result | `Recommended Next Step` visible after `init`, `demo prepare`, `doctor`, or `validate` |
| 4 | Checklist state | Onboarding Checklist reflects the real current step |

**Suggested save names**:
- `workbench-01-host-configured.png`
- `workbench-02-guided-state.png`
- `workbench-03-recommended-next-step.png`
- `workbench-04-onboarding-checklist.png`
- `workbench-05-gap-fill-review.png`
- `workbench-06-gap-fill-approval-unit.png`
- `workbench-07-gap-fill-continuation.png`

### 10. Runtime Video

**Required filename**:
- `talent-draw-demo-runtime.mp4`

Save this file directly under `latest/`.

---

## Directory Structure

```
demo-evidence/
├── README.md                    # This file
├── latest/                      # Most recent successful run (auto-refreshed)
│   ├── manifest.json            # Generation metadata and overall status
│   ├── canonical-gap-fill-contract.json # Frozen canonical prompt/boundary/order
│   ├── demo-prepare-output.txt  # Output from 'dota2 demo prepare'
│   ├── review-artifact.json     # Pipeline review artifact
│   ├── review-artifact-missing.txt  # Instructions if no review artifact
│   ├── generated-files.json     # Feature metadata from workspace
│   ├── doctor-output.txt        # Output from 'dota2 doctor' command
│   ├── validate-output.txt      # Output from 'dota2 validate' command
│   ├── talent-draw-demo-runtime.mp4   # REQUIRED manual runtime evidence
│   ├── gap-fill-approvals/      # Copied approval records if gap-fill confirmation participated
│   ├── gap-fill-approvals-missing.txt # Explanation if no approval records were found
│   ├── vconsole-template.txt    # Expected VConsole checkpoints (manual)
│   ├── screenshots/             # Manual screenshot evidence
│   │   ├── README.md            # Screenshot capture instructions
│   │   ├── 01-initial.png       # REQUIRED: Phoenix at spawn
│   │   ├── 02-ui-open.png       # REQUIRED: Three-card selection modal
│   │   ├── 03-card-detail.png   # REQUIRED: Card rarity/name/effect
│   │   ├── 04-after-select.png  # REQUIRED: Post-selection attributes
│   │   ├── 05-second-draw.png   # REQUIRED: Second draw (no repeats)
│   │   ├── 06-gap-fill-review.png
│   │   ├── 07-gap-fill-approval-unit.png
│   │   └── 08-gap-fill-continuation.png
└── archive/                     # Historical evidence
    └── 2026-04-13/
        └── ...
```

---

## Verification Checklist

New teammate reproduction verification:

- [ ] Review artifact contains 5 modules (trigger/data/rule/effect/ui)
- [ ] canonical-gap-fill-contract.json matches the frozen Talent Draw prompt and boundary
- [ ] Demo prepare output shows addon.config rename before yarn install
- [ ] Demo prepare output records yarn install output checks
- [ ] Generated files count matches (~9 files expected)
- [ ] Doctor: 0 failed checks
- [ ] Validate: 0 errors, 0 warnings
- [ ] Gap-fill approval records copied if gap-fill participated
- [ ] VConsole contains all phase logs
- [ ] Screenshots match UI structure
- [ ] If Workbench product-entry was used, screenshots capture Guided State, Checklist, and Recommended Next Step
- [ ] Workbench canonical screenshots 06-08 are present
- [ ] Runtime video is saved as `talent-draw-demo-runtime.mp4`
- [ ] Lifecycle proof checklist in `LIFECYCLE-PROOF.md` can be followed without guessing

---

## Related Documents

- [../DEMO-GUIDE.md](../DEMO-GUIDE.md) - Step-by-step walkthrough
- [../CANONICAL-CASE-TALENT-DRAW.md](../CANONICAL-CASE-TALENT-DRAW.md) - Case definition
- [../../../TALENT-DRAW-E2E-LESSONS.md](../../../TALENT-DRAW-E2E-LESSONS.md) - E2E lessons

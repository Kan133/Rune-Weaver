# ROADMAP

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: on-phase-change
> Last verified: 2026-04-14
> Read when: understanding milestone sequencing and longer-horizon product direction
> Do not use for: current step/blocker truth, current execution queue, or shipped capability claims by itself

> Status Note
>
> This file may lag the freshest same-day mainline status.
> For current step/blocker truth, prefer [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md), the latest session-sync notes, and [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md).

## Purpose

This roadmap reflects the product sequence after the Talent Draw runtime proof.

Rune Weaver has now demonstrated the most important claim for the current phase:

> A composite feature can move through the formal pipeline, be written into an x-template Dota2 host, launch in Dota2, open generated UI, and apply a runtime effect.

The next move is not to add many new patterns or chase a second case immediately. The next move is to turn that success path into a repeatable product flow that does not depend on hidden operator knowledge.

Read alongside:

- [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md)
- [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
- [DEMO-PATHS.md](/D:/Rune%20Weaver/docs/DEMO-PATHS.md)
- [talent-draw-case/CANONICAL-CASE-TALENT-DRAW.md](/D:/Rune%20Weaver/docs/talent-draw-case/CANONICAL-CASE-TALENT-DRAW.md)
- [talent-draw-case/LIFECYCLE-PROOF.md](/D:/Rune%20Weaver/docs/talent-draw-case/LIFECYCLE-PROOF.md)
- [hosts/dota2/TALENT-DRAW-E2E-LESSONS.md](/D:/Rune%20Weaver/docs/hosts/dota2/TALENT-DRAW-E2E-LESSONS.md)

If this file conflicts with current executable reality, trust the executable evidence and update this roadmap.

---

## Current Product Thesis

Rune Weaver should prove that it can construct, review, write, track, validate, repair, run, update, and delete a feature inside a living host project.

The near-term product proof is not:

- generate any arbitrary code from any prompt,
- support every Dota2 mechanic,
- finish every lifecycle command,
- build a full visual IDE,
- support a second host.

The near-term product proof is:

> A complex feature can travel through Rune Weaver as a first-class governed feature, and a user can get from an empty host skeleton to an in-game playable result without manual bridge/KV/Lua/Panorama configuration.

Talent Draw remains the active proving case:

```text
input_trigger
  -> weighted_pool
  -> selection_flow
  -> selection_modal
  -> effect_application
```

It stresses the pipeline:

- multi-module Blueprint,
- pattern contract boundaries,
- server/shared/ui outputs,
- session state,
- UI events,
- bridge integration,
- workspace tracking,
- lifecycle operations,
- runtime validation.

---

## Status Snapshot

Approximate current state after the Talent Draw in-game proof:

| Area | Status | Notes |
|---|---:|---|
| Architecture baseline | 80-88% | Core layers exist and have survived a composite runtime case |
| CLI lifecycle spine | 78-84% | Create/write/validate/repair, demo runbook, runtime doctor, and evidence refresh are wired; live lifecycle proof remains |
| Workbench/UI product entry | 45-60% | Useful shell, should consume the CLI-backed lifecycle later |
| README-target product | 60-70% | The story is credible and now has repeatable CLI docs; Workbench and lifecycle proof still lag |
| Small-user product readiness | 40-50% | Gap-fill now has a core decision/approval gate; environment flow and parameter clarification still need product work |
| Talent Draw case | 78-85% | Runnable in Dota2 with runbook, doctor, validate, and evidence refresh; fidelity and lifecycle proof remain |

Do not turn these percentages into release promises. They are planning estimates for prioritization.

---

## P0: Make The Success Path Repeatable

### Milestone 0: Safe Gap-Fill Apply Gate

#### Goal

Make prompt-filled implementation changes safe enough for non-coder users by routing every patch through a shared core decision and approval gate.

#### Current Status

First slice is in place:

- `core/gap-fill` evaluates patch plans as `auto_apply`, `require_confirmation`, or `reject`
- `require_confirmation` can produce an approval record
- approval records bind the host, boundary, target file hash, patch plan hash, decision, and record hash
- Dota2 CLI can apply directly only for `auto_apply`
- Dota2 CLI can apply confirmed patches through `--approve <approval-record.json>`

#### Required Next Capabilities

- expose the same approval contract to Workbench
- let War3 provide a boundary provider without redefining decision policy
- improve user-facing summaries for non-code readers
- add evidence examples for approved apply and rejected apply

#### Done When

Both CLI and Workbench can explain whether a gap-fill patch will auto-apply, needs confirmation, or is rejected, using the same core decision result.

---

### Milestone 1: Demo Runbook Automation

#### Goal

Turn the proven manual x-template flow into a command that can prepare a host for demo without tribal knowledge.

Target command shape:

```bash
npm run cli -- dota2 demo prepare --host <path> --addon-name talent_draw_demo --map temp
```

#### Required Capabilities

The command should check or perform the critical sequence:

1. rename `addon.config` before install,
2. ensure `yarn install` has created the matching Dota addon/content output,
3. initialize Rune Weaver workspace if needed,
4. write or refresh the Talent Draw demo feature,
5. run the host TypeScript/Panorama build step (`yarn dev` or equivalent),
6. print or dispatch the fast launch command (`yarn launch <addon> <map>`),
7. explain every blocked step with a concrete recovery action.

#### Current Status

The CLI runbook path is wired through `dota2 demo prepare` and small command modules. It checks addon rename order, dependency/install outputs, workspace readiness, Talent Draw write readiness, `yarn dev`, doctor, validate, and `yarn launch <addon> <map>` guidance.

#### Constraints

- The command must be idempotent.
- It must not hide destructive actions behind a friendly name.
- CLI entry files should stay thin; command implementation belongs in small modules.
- It should prefer checks and explicit steps over broad magic.

#### Done When

A fresh x-template host can be prepared for the Talent Draw demo with one documented command path, and rerunning the command reports a stable ready state instead of duplicating or corrupting files.

---

### Milestone 2: Runtime Doctor

#### Goal

Add a host-level doctor that explains why a written feature will or will not run in Dota2.

Target command shape:

```bash
npm run cli -- dota2 doctor --host <path>
```

#### Required Checks

The doctor should detect the failures found during the Talent Draw runtime debug cycle:

- `addon.config` addon name matches the intended addon,
- install output exists under Dota game/content addon directories,
- `npc_abilities_custom.txt` has a valid `DOTAAbilities` structure,
- ability `ScriptFile` values resolve to real Lua files,
- generated server index references existing modules,
- generated UI index imports existing TSX components,
- generated LESS files are imported by the HUD styles entry,
- `.rune-weaver-root` is full-size and mounted,
- bridge/runtime wiring exists,
- workspace generated file records match files on disk,
- host build artifacts are present or stale.

#### Relationship To Existing Validation

`dota2 validate` checks post-generation self-consistency.

`dota2 repair` applies safe fixes for known post-generation issues.

`dota2 doctor` checks whether the host is ready to launch and play.

The commands can share lower-level checks, but their user-facing intent should stay distinct.

#### Current Status

The first productized Runtime Doctor is wired into the CLI. It reports fix hints for addon/install output, workspace, post-generation validation, runtime bridge wiring, host build artifacts, and gap-fill boundary anchors. It is still file-level and bridge-level; live in-game validation remains manual or runbook-driven.

#### Done When

The doctor can explain the most common Dota2 runtime failures without requiring the user to inspect VConsole logs manually.

---

### Milestone 3: Canonical Walkthrough And Evidence Pack

#### Goal

Turn Talent Draw from "it worked once" into repeatable evidence.

#### Required Evidence

Maintain:

- canonical prompt,
- canonical fixture parameters,
- canonical IntentSchema/Blueprint/Assembly/Realization/Routing snapshots,
- generated files evidence,
- host write evidence,
- workspace record evidence,
- lifecycle proof evidence for update / rollback / delete / recreate, when validating the Talent Draw feature lifecycle,
- gap-fill decision and approval record evidence, when gap-fill participates,
- runtime/manual checklist,
- screenshots or notes from a successful Dota2 run.

#### Evidence Pack Location

- [docs/talent-draw-case/DEMO-GUIDE.md](./talent-draw-case/DEMO-GUIDE.md) - Complete runtime walkthrough with fresh x-template flow, success criteria, and troubleshooting table
- [docs/talent-draw-case/demo-evidence/README.md](./talent-draw-case/demo-evidence/README.md) - Evidence specification (review artifact, generated files, doctor/validate output, VConsole excerpt, screenshots)

#### Current Status

The canonical evidence refresh command captures demo prepare output, doctor output, validate output, workspace generated files, review artifact, optional gap-fill approval records, VConsole template, screenshots instructions, and manifest metadata.

#### Done When

A new teammate can rerun the walkthrough without hidden steps and can compare the result against known-good evidence.

---

## P1: Make Talent Draw A Trustworthy Product Sample

### Milestone 4: UI Safer Generation Profile

#### Goal

Make generated Panorama React UI stable enough for demos and future cases.

#### Required Capabilities

- error boundary around generated UI root,
- stable event subscription effects,
- full-size Rune Weaver HUD root,
- modal/card layout with predictable sizing,
- disabled placeholder behavior,
- confirm button state clarity,
- text truncation and overflow handling,
- empty/invalid payload fallback,
- user-readable debug output.

#### Done When

Selection-style generated UI no longer fails through infinite render loops, missing root sizing, or invalid payload assumptions.

---

### Milestone 5: Fixture And Case Parameter Fidelity

#### Goal

Make the Talent Draw demo match the canonical case closely enough for product storytelling.

#### Required Capabilities

- talent entries match the canonical case,
- rarity labels and card text are stable,
- rarity-to-attribute effects match documented values,
- placeholder text is consistent,
- prompt, fixture, generated output, and demo explanation agree.

#### Done When

The demo can be explained without caveats such as "the effect values are only placeholders."

---

### Milestone 6: Product-Grade Review Surface

#### Goal

Translate pipeline artifacts into a user-readable feature review before write.

The review should explain:

- what feature will be created,
- which modules it contains,
- which patterns are selected or deferred,
- which files will be written,
- which bridge points are touched,
- which parameters came from the user,
- which parameters came from controlled defaults,
- what risks remain,
- which doctor/validation checks are expected after write.

#### First Surface

Start in CLI. Let Workbench consume the same structured review later.

#### Done When

Before write, the user can understand impact without reading Blueprint JSON or generated code.

---

## P2: Prove Rune Weaver Is Not A One-Shot Demo

### Milestone 7: Talent Draw Lifecycle

#### Goal

Use Talent Draw to prove lifecycle operations.

The active executable checklist is [talent-draw-case/LIFECYCLE-PROOF.md](./talent-draw-case/LIFECYCLE-PROOF.md).
It is also wired as:

```bash
npm run cli -- dota2 lifecycle prove --host <path> --addon-name talent_draw_demo --map temp
```

#### Update Cases

Support owned-scope updates such as:

- add a new talent entry,
- change rarity weights,
- modify placeholder text,
- change UR bonus value,
- change trigger key/event.

Acceptance:

- featureId remains stable,
- revision increments,
- only owned artifacts are rewritten,
- bridge is not duplicated,
- review shows file/parameter impact,
- doctor and validate still pass after update.

#### Delete Cases

Support true unload:

- remove feature record or mark deleted,
- remove owned generated files,
- remove bridge exports/bindings,
- preserve unrelated files and features.

#### Done When

Talent Draw can be created, inspected, updated, deleted, and re-created without corrupting workspace or host state.

---

### Milestone 8: Real Conflict Governance

#### Goal

Move conflict governance from demo-level proof to feature-backed behavior.

Use Talent Draw plus another feature to test:

- same key/event contention,
- same generated module name,
- same UI event channel,
- update touching non-owned files,
- delete affecting another feature dependency.

#### Done When

The system blocks or warns before write, explains the conflict, and identifies the involved feature records.

---

### Milestone 9: Second Complex Composite Case

#### Goal

Prove the system did not become a Talent Draw-specific generator.

Candidate cases:

- resource cost + resource bar + skill release,
- area trigger + wave spawn + reward selection,
- card/shop selection + inventory state,
- multi-stage challenge system,
- kill trigger + stacking state + reward effect.

#### Done When

The second case reuses existing generic patterns and requires content/config work more than architecture rewrites.

---

## P3: Product Entry

### Milestone 10: Workbench Product Entry

#### Goal

Connect the UI/onboarding shell to the authoritative lifecycle path.

Workbench should not invent a second execution system.

Required flow:

1. select/scan host,
2. initialize or prepare host if needed,
3. enter request,
4. show proposal/review,
5. dry-run,
6. write,
7. run validate/doctor,
8. show feature detail,
9. expose list/inspect/update/delete entries.

#### Done When

A user can reach the CLI-backed lifecycle spine through one coherent product entry flow.

---

## Deferred Capabilities

These remain out of the near-term roadmap unless explicitly reopened:

- productized semantic arbitrary-code incremental update,
- second host,
- broad UI redesign unrelated to generated feature stability,
- full multiplayer/state architecture,
- account-level persistence,
- general talent-effect DSL.

---

## Demo Readiness Levels

### External-Safe Now

- static architecture walkthrough,
- Talent Draw in-game runtime proof with clear caveats,
- CLI create/write path,
- workspace feature registry,
- post-generation validate/repair,
- Workbench feature visualization with clear limits.

### Internal-Only Until Runbook And Doctor Land

- fresh-host Talent Draw setup,
- x-template install/launch flow,
- host-level runtime diagnosis,
- lifecycle update/delete demo.

### Do Not Demo As Complete

- guaranteed one-click public setup,
- rollback/regenerate as productized lifecycle,
- second host,
- full small-user Wizard,
- Workbench as the authoritative execution surface.

---

## README-Target MVP Bar

Rune Weaver reaches the README-target MVP only when:

1. a complex feature can be created through the formal pipeline,
2. the feature can be reviewed before write,
3. generated files and workspace truth match,
4. the host can be prepared and launched through a repeatable runbook,
5. doctor/validate can explain common runtime failures,
6. update/delete work within owned scope,
7. real conflict governance exists,
8. the canonical walkthrough is repeatable,
9. UI can drive the authoritative lifecycle path or clearly defer to CLI.

Gap-fill counts toward the MVP only when its patches are not just generated, but safely decided, confirmable when needed, and traceable through review artifacts.

Talent Draw does not by itself finish the product. But now that it is runnable, making it repeatable, diagnosable, and lifecycle-managed is the shortest path from promising construction baseline to credible feature construction platform.

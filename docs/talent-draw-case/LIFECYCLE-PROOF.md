# Talent Draw Lifecycle Proof

This document defines the current executable proof path for the Talent Draw lifecycle scenario.

The CLI runner now uses a scenario-driven lifecycle harness, so this file should stay focused on the Talent Draw case rather than becoming the one-off source of truth for the runner shape.

The goal is not to claim that every lifecycle command is final. The goal is to make the next proof repeatable and honest:

```text
create/write -> doctor -> validate -> update -> doctor -> validate -> delete -> doctor -> recreate
```

## Runner

The checklist is now available as a CLI runner.

Plan only:

```bash
npm run cli -- dota2 lifecycle prove --host <host> --addon-name talent_draw_demo --map temp
```

Execute on a disposable prepared host:

```bash
npm run cli -- dota2 lifecycle prove --host <host> --addon-name talent_draw_demo --map temp --write
```

Shortcut:

```bash
npm run demo:talent-draw:lifecycle -- --host <host> --addon-name talent_draw_demo --map temp --write
```

The runner saves a JSON proof artifact under `tmp/cli-review/lifecycle-proof-*.json`.
Plan-only mode exits successfully but marks the artifact as `INCOMPLETE` because it did not mutate the host.

## Preconditions

Use a prepared x-template host:

```bash
npm run cli -- dota2 demo prepare --host <host> --addon-name talent_draw_demo --map temp
```

The host should already satisfy:

- `scripts/addon.config.ts` uses `talent_draw_demo`
- `yarn install` has been run after the addon rename
- Rune Weaver workspace exists
- `yarn dev` can compile host scripts and Panorama

## Step 1: Create / Write

```bash
npm run demo:talent-draw -- --host <host> --write --force
npm run cli -- dota2 doctor --host <host>
npm run cli -- dota2 validate --host <host>
```

Expected:

- workspace has an active `talent_draw_demo` feature
- generated files exist on disk
- bridge/runtime wiring exists
- doctor and validate do not report critical failures

## Step 2: Update

Use an owned-scope update only. Good update prompts:

```bash
npm run cli -- dota2 update "把天赋抽取的触发键从 F4 改成 F5" --host <host> --feature talent_draw_demo --write
npm run cli -- dota2 update "把占位卡文案改成 No more talents" --host <host> --feature talent_draw_demo --write
npm run cli -- dota2 update "把 UR 天赋加成数值提高一点" --host <host> --feature talent_draw_demo --write
```

After each update:

```bash
npm run cli -- dota2 doctor --host <host>
npm run cli -- dota2 validate --host <host>
npm run demo:talent-draw:refresh -- --host <host>
```

Expected:

- feature id remains `talent_draw_demo`
- revision increments or update evidence explains why it could not
- only owned generated files are changed
- generated server/UI indexes do not duplicate bridge entries
- doctor and validate still pass

## Step 3: Delete

```bash
npm run cli -- dota2 delete --host <host> --feature talent_draw_demo --write
npm run cli -- dota2 doctor --host <host>
npm run cli -- dota2 validate --host <host>
```

Expected:

- owned generated files are deleted or marked inactive according to workspace policy
- unrelated files are preserved
- bridge/runtime indexes no longer expose deleted feature entries
- doctor should not report stale generated references

## Step 4: Recreate

```bash
npm run demo:talent-draw -- --host <host> --write --force
npm run cli -- dota2 doctor --host <host>
npm run cli -- dota2 validate --host <host>
```

Expected:

- recreated feature is playable again
- bridge/runtime wiring is not duplicated
- workspace generated file records match disk

## Evidence To Capture

Save the following after each phase:

- command output
- latest review artifact
- workspace feature record
- doctor output
- validate output
- generated file list
- gap-fill approval records, if gap-fill participated

The canonical refresh command captures the stable subset:

```bash
npm run demo:talent-draw:refresh -- --host <host>
```

## Current Blockers To Watch

- update semantics are only trustworthy for owned-scope changes
- delete proof depends on workspace ownership accuracy
- any bridge refresh issue should be treated as a lifecycle blocker
- any VConsole missing-module error should become a doctor or validate check

## Done Bar

Talent Draw lifecycle proof is accepted only when:

1. create/write succeeds
2. update changes an owned property without changing feature identity
3. delete removes or deactivates only owned scope
4. recreate works without duplicate bridge entries
5. doctor and validate pass after every phase
6. evidence refresh captures the latest state

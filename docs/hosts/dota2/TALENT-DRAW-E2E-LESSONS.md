# Talent Draw E2E Lessons

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: low-frequency
> Last verified: 2026-04-14
> Read when: debugging Dota2 host/runtime pitfalls discovered during the Talent Draw canonical case and extracting reusable host-side guardrails
> Do not use for: current blocker truth, baseline architecture authority, or generic cross-host policy by itself

This document records the concrete failures, root causes, and product-level guardrails discovered while driving the Talent Draw case all the way into a runnable Dota 2 host.

The goal is simple: future cases should not have to rediscover these problems by hand.

## Scope

These lessons came from wiring a generated feature through:

- Wizard / fixture input
- Blueprint
- Pattern resolution
- Assembly / realization / routing
- Generator
- Write executor
- Bridge refresh
- x-template host boot
- Panorama runtime
- Dota 2 in-game validation

This is not Talent Draw-only knowledge. Most items below are mainline Dota 2 integration rules for Rune Weaver.

## High-Level Rules

1. Generated artifacts that refer to the same runtime object must share one naming source of truth.
2. Demo or case-specific defaults must not leak into generic Wizard or core pipeline layers.
3. Panorama UI generation must target the actual constraints of `react-panorama-x`, not generic React assumptions.
4. x-template hosts must be initialized in the correct order: rename addon first, then install/build.
5. A feature is not "E2E working" until it is verified inside a launched Dota 2 addon, not just via dry-run artifacts.

## Required Host Workflow

For a fresh x-template host, the reliable order is:

1. Edit `scripts/addon.config.ts`
2. Change `addon_name` before any install/link step
3. Run `yarn install`
4. Run Rune Weaver host init / demo write
5. Run `yarn dev`
6. Launch with `yarn launch <addon_name> <mapname>`

If addon rename happens after install, Steam addon links can point at the wrong directory and the whole validation becomes noisy and misleading.

## Pitfalls and Lessons

### 1. Lua/KV/Bridge naming drift

Symptom:

- Bridge required `rune_weaver.abilities.rw_modifier_applier_0`
- KV used `rw_modifier_applier_0`
- Generated Lua file/class used a different feature-derived name
- Runtime failed to preload or attach the ability correctly

Root cause:

- Lua generation and KV generation were not consuming the same resolved ability name
- Write stage overrides were not flowing cleanly into Lua generation

Rule:

- Ability identity must be resolved once and reused by:
  - KV `abilityName`
  - KV `ScriptFile`
  - Lua file path
  - Lua exported ability class name
  - Bridge preload path
  - Hero attachment `AddAbility()`

Product requirement:

- Introduce one canonical "resolved runtime ability name" contract for multi-output ability-like patterns
- Never let KV and Lua derive names separately from different heuristics

### 2. Metadata overrides were being ignored by Lua generation

Symptom:

- Write stage injected corrected `abilityName`
- Lua generator still used stale/default naming

Root cause:

- Lua generator effectively preferred `entry.parameters` and did not properly allow write-stage `metadata` to override it

Rule:

- For generated outputs, `metadata` must be allowed to override base `parameters` when the write stage has resolved a more concrete host/runtime value

This matters for:

- update flows
- regenerate flows
- host-specific rewrites
- ability naming
- final target paths

Product requirement:

- Treat `metadata` as "post-routing / post-write-resolution overrides"
- Document precedence explicitly: `metadata > parameters > defaults`

### 3. Shared route vs actual target path mismatch

Symptom:

- Routing classified `data.weighted_pool` as shared
- Final emitted file still landed under server path

Root cause:

- Write planning used pattern metadata host target instead of the resolved route host target

Rule:

- When routing exists, final emitted path must follow the resolved route, not fallback pattern metadata

Product requirement:

- Route-aware write planning is mandatory for all multi-target or host-sensitive outputs

### 4. Missing Lua wrapper blocked the whole bridge activation

Symptom:

- `activateRwGeneratedServer()` failed before runtime wiring
- F4 handler never got connected
- Hero attachment never completed

Root cause:

- Bridge preloaded a Lua wrapper that did not exist on disk

Rule:

- Any bridge preload must only reference artifacts guaranteed by the generator/write pipeline

Product requirement:

- Add an integration validation step:
  - if bridge will `require()` a Lua module
  - then write plan must contain that module
  - otherwise fail validation before writing

### 5. Generic Wizard pollution by Talent Draw parameters

Symptom:

- Generic Wizard extraction injected Talent Draw-specific draw/pool/UI/effect defaults
- Unrelated prompts could pick up case behavior accidentally

Root cause:

- Case logic was briefly placed inside generic extraction code

Rule:

- Demo fixtures and case defaults belong in dedicated fixture/demo layers, never in generic Wizard logic

Product requirement:

- Keep case-specific parameters in:
  - fixture files
  - demo harnesses
  - explicit prompt-supplied parameters

Never in:

- generic Wizard
- generic blueprint inference
- generic resolver shortcuts

### 6. Duplicate key registration in Panorama

Symptom:

- Pressing `F4` emitted duplicate events
- User saw repeated server log entries for a single key press

Root cause:

- `registerCustomKey()` in x-template is not idempotent
- Re-mounting or regenerating UI could register the same key again

Rule:

- Panorama-generated key registration must be idempotent per key

Product requirement:

- Centralize custom key registration behind a guard
- Do not call raw `registerCustomKey()` repeatedly from generated component mounts without dedupe

### 7. React default array props caused infinite render loops

Symptom:

- `Warning: Maximum update depth exceeded`
- UI re-rendered endlessly

Root cause:

- Component used `const { items = [] } = props`
- `useEffect(..., [items])` treated that default array as a new dependency every render
- Effect called `setState`, causing a render loop

Rule:

- In generated Panorama React components, do not use fresh array/object literals as default destructured prop values when those props are effect dependencies

Safer pattern:

- leave prop possibly undefined
- normalize lazily for initial state
- sync only when true prop identity changes

### 8. `react-panorama-x` is less tolerant than generic React

Symptom:

- UI crashed in generated components without clear JS messages
- Conditional child rendering behaved unpredictably

Root cause:

- `react-panorama-x` reconciliation is more brittle around nullish/falsy/array child patterns than standard web React usage

Rule:

- Generated Panorama UI should prefer very conservative JSX

Preferred:

- direct `Panel`, `Label`, `Button`
- simple ternaries
- minimal nesting
- no fancy child arrays unless necessary

Avoid by default:

- conditional child fragments everywhere
- large arrays of mixed optional nodes
- web-React-style assumptions about reconciliation tolerance

### 9. Event payload shape from server to Panorama is not guaranteed to be a JS array

Symptom:

- UI could fail after receiving options even when server-side flow had worked

Root cause:

- Dota custom event payloads may serialize Lua tables into object-like shapes instead of standard arrays

Rule:

- Generated Panorama components must normalize incoming list payloads

Product requirement:

- Any generated UI that consumes `options`, `items`, `entries`, etc. from server events should support:
  - array payloads
  - numeric-key object payloads

### 10. Pool entries were not automatically valid UI selection options

Symptom:

- UI expected `name`
- pool entries provided `label`
- display logic became fragile

Root cause:

- Generator assumed data pool items already matched UI selection contract

Rule:

- Rule/selection-flow generators must normalize pool candidates into explicit UI-facing option objects

Product requirement:

- Add a small shared adapter contract:
  - `id`
  - `name`
  - `description`
  - `icon?`
  - `tier?`

Never rely on raw pool entry shape at the UI boundary

### 11. `npc_abilities_custom.txt` root integrity is critical

Symptom:

- `hero.AddAbility("rw_modifier_applier_0")`
- `FindAbilityByName()` failed afterward
- Dota complained about null entity class in nearby failure states

Root cause:

- `npc_abilities_custom.txt` content shape was not consistently preserved under `"DOTAAbilities"`
- A bare ability block is not enough if the final file structure is invalid for Dota loading

Rule:

- Any RW write to `game/scripts/npc/npc_abilities_custom.txt` must preserve or rebuild a valid `"DOTAAbilities"` root

Product requirement:

- KV aggregation/writing must be structural, not plain text append/replace
- Add validation that parses final emitted `npc_abilities_custom.txt` and confirms:
  - root key is `DOTAAbilities`
  - target ability exists under that root
  - `ScriptFile` path matches generated Lua file

### 12. Demo evidence is not runtime truth

Symptom:

- dry-run artifact looked correct
- in-game behavior still failed

Root cause:

- artifact success can hide:
  - stale host files
  - wrong runtime build state
  - broken bridge preload
  - invalid Panorama runtime behavior
  - invalid final KV structure

Rule:

- Treat demo evidence as pipeline evidence, not gameplay proof

Product requirement:

- Separate:
  - pipeline proof
  - host-write proof
  - in-game runtime proof

## Product-Level Guardrails to Build

Rune Weaver should eventually encode these as product behavior, not just docs.

### A. Add a Dota2 runtime consistency validator

Before declaring a feature runnable, verify:

- every generated Lua ability file referenced by bridge exists
- every KV ability block lives under `DOTAAbilities`
- every KV `ScriptFile` points to an existing Lua file
- every bridge-preloaded ability exists in KV and Lua
- every hero-attached ability exists in KV and Lua

### B. Add a safe Panorama generation profile

Default generated Panorama code should:

- avoid non-essential optional child nodes
- normalize event payload collections
- use idempotent key registration
- avoid unstable default object/array destructuring in effect-driven components

### C. Distinguish three parameter stages

Rune Weaver should explicitly model:

1. Intent parameters
2. Resolved route/host parameters
3. Write-stage runtime metadata overrides

This avoids the class of bugs where a later-resolved host fact cannot override an earlier generic parameter.

### D. Add one-command host preflight

RW should offer a host preflight that checks:

- addon name already renamed
- Steam links exist
- `yarn install` completed
- `yarn dev` or equivalent build/watch has run at least once
- workspace file exists
- bridge files exist

### E. Add case-independent E2E acceptance criteria

A Dota feature should not be called "E2E working" until all are true:

- prompt reaches generator
- files are written
- bridge refresh succeeds
- addon launches
- feature trigger reaches server
- feature UI or gameplay effect appears in-game

### F. Style generated React UI through the HUD LESS entry

The x-template host can run `react-panorama-x`, but its LESS pipeline is not the
same as a browser React app. Importing a generated `.less` file from TSX/index
can make webpack parse CSS as JavaScript and fail with `Unexpected token`.

RW should:

- keep generated UI components as React TSX
- add generated LESS imports to `content/panorama/src/hud/styles.less`
- avoid TSX-side LESS imports for x-template Panorama targets
- ensure `.rune-weaver-root` has `width: 100%` and `height: 100%`

### G. Preserve KV braces during baseline migration

The x-template baseline ability migration must preserve every ability block's
opening and closing braces. Dropping those braces causes Dota to report:

```text
KeyValues Error: LoadFromBuffer: expected '{'
```

RW should run a structural KV check after writing `npc_abilities_custom.txt`:

- root key is `DOTAAbilities`
- every top-level ability has a braced block
- nested blocks such as `Precache` keep their braces
- generated ability `ScriptFile` paths resolve to Lua files

### H. Add minimal runtime evidence for server-to-UI events

When a key reaches server logic but UI does not appear, the fastest split is:

- server log before `rune_weaver_show_selection`, including option count and
  whether `PlayerResource.GetPlayer(playerId)` resolved
- client log on component mount
- client log on receipt of `rune_weaver_show_selection`

For local demos, `Send_ServerToAllClients` is a useful fallback when
`Send_ServerToPlayer` lacks a player handle; the UI can still filter by
`featureId`.

## Practical Checklist for Future Cases

Use this before starting in-game debugging.

- Rename addon before install
- Run `yarn install`
- Run RW init/write
- Run `yarn dev`
- Confirm workspace feature files are current
- Confirm bridge indexes reference only existing files
- Confirm `npc_abilities_custom.txt` contains valid `DOTAAbilities` root
- Confirm Lua wrapper file path matches KV `ScriptFile`
- Confirm generated UI LESS is imported through `hud/styles.less`
- Confirm `.rune-weaver-root` has full-screen dimensions
- Confirm generated UI avoids brittle child patterns
- Confirm key registration is idempotent
- Confirm event payload lists are normalized in UI
- Only then launch Dota and test the trigger

## Current Follow-Up Items

These issues were identified during the Talent Draw run and should be treated as product hardening work:

- make KV aggregation structurally safe for `npc_abilities_custom.txt`
- add runtime consistency validation between bridge/KV/Lua
- reduce Panorama generator output to a safer default subset
- make bridge refresh manage generated UI style imports
- make generated key registration centrally idempotent
- formalize parameter precedence: `metadata > parameters > defaults`

---

## Reference: Runtime Demo Guide

For the repeatable runtime walkthrough derived from these lessons, see:

- [docs/talent-draw-case/DEMO-GUIDE.md](../../talent-draw-case/DEMO-GUIDE.md) - Step-by-step from fresh x-template to Dota2 play
- [docs/talent-draw-case/demo-evidence/README.md](../../talent-draw-case/demo-evidence/README.md) - Evidence pack specification

**Updated**: 2026-04-13 - Demo guide now includes troubleshooting table and VConsole checkpoints for runtime verification.

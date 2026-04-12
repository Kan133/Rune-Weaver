# Canonical Acceptance Cases

## Status

This document defines the authoritative canonical cases for the Rune Weaver README-target MVP acceptance.

Use it to verify that `create`, `update`, `delete`, and minimum governance are working correctly.

All cases are derived from the existing example corpus (`examples/micro-feature/dash-skill.ts`, `examples/standalone-system/talent-draw.ts`, `examples/cross-system/skill-with-resource.ts`) and the workspace model in `docs/WORKSPACE-MODEL.md`.

---

## Case Inventory

| Case ID | Name | Capability | Packet | UI/Bridge |
|---------|------|------------|--------|-----------|
| C-01 | Micro-Feature Create (Dash Skill) | `create` | A | minimal |
| C-02 | Persisted Feature Update | `update` | B | minimal |
| C-03 | Feature Delete / Unload | `delete` | C | minimal |
| C-04 | Minimal Conflict / Overlap | governance | D | minimal |
| C-05 | Cross-System Composition with UI | `create` + bridge | A/B | yes |

---

## Case C-01: Micro-Feature Create (Dash Skill)

**Case ID**: C-01
**Packet**: A (primary)
**Capability**: `create` — micro-feature single trigger
**UI/Bridge**: minimal (key_hint only)

### User Request

```
做一个按Q键触发的朝鼠标方向冲刺技能，冷却8秒
```

### Expected featureId

Any stable UUID/strict string assigned by the create pipeline. The workspace record must show a non-empty `featureId`.

### Expected selectedPatterns

```
- input.key_binding (module: mod_input_q)
- resource.basic_pool (module: mod_cooldown)
- effect.dash (module: mod_dash_effect)
- ui.key_hint (module: mod_key_hint, priority: optional)
```

### Expected generatedFiles

At least one of:

- `game/scripts/src/rune_weaver/**/*.ts` (server code)
- `game/scripts/vscripts/rune_weaver/**/*.lua` (server lua)
- `game/scripts/kv/**/*.txt` (KV config)

Presence of files under `game/scripts/src/rune_weaver/` or `game/scripts/vscripts/rune_weaver/` is required. Files must be non-empty.

### Expected entryBindings

```
- target: server
  file: <one of the generatedFiles>
  kind: import | register
- target: ui (if key_hint is selected)
  file: content/panorama/src/rune_weaver/**/*.tsx
  kind: mount | append_index
```

At minimum one `entryBindings` entry must be present in the workspace record after create.

### Expected workspace state

After create:

```
workspace.features[<new feature>]:
  featureId: <stable id>
  blueprintId: micro_feature_dash_skill
  selectedPatterns: [input.key_binding, resource.basic_pool, effect.dash, ui.key_hint]
  generatedFiles: <paths to actual written files>
  entryBindings: <non-empty array>
  revision: 1
  status: "active"
  createdAt: <timestamp>
  updatedAt: <timestamp>
```

### Expected host changes

Files written under `game/scripts/src/rune_weaver/` and/or `game/scripts/vscripts/rune_weaver/`. No writes outside Rune Weaver-owned directories.

### Key Path Patterns, Bridge Points, and Workspace Fields

#### Server output path pattern

- `game/scripts/src/rune_weaver/<feature-name>/<ability-name>.ts`
- `game/scripts/vscripts/rune_weaver/<feature-name>/<ability-name>.lua`
- `game/scripts/kv/<addon>/abilities_<feature-name>.txt`

At least one server-side file must be generated and must match the path recorded in `generatedFiles`.

#### UI output path pattern

- `content/panorama/src/rune_weaver/<feature-name>/<component>.tsx` (key_hint panel)
- Bridge exposure via `content/panorama/src/hud/script.tsx`

If `ui.key_hint` is selected (optional), a UI file must be generated. The bridge point `content/panorama/src/hud/script.tsx` must be updated to mount or append the component.

#### KV config path pattern (if applicable)

- `game/scripts/kv/**/*.txt`
- Not required for minimal create but acceptable if generated.

#### Bridge points

| Bridge Point File | Expected Change | Binding Kind |
|-------------------|----------------|--------------|
| `game/scripts/src/modules/index.ts` | Import/register for server `.ts` file | `import` or `register` |
| `content/panorama/src/hud/script.tsx` | Mount or append UI component | `mount` or `append_index` |

#### Required workspace record fields

```
workspace.features[<new feature>]:
  featureId:           <any stable non-empty string>
  blueprintId:         "micro_feature_dash_skill"
  selectedPatterns:    ["input.key_binding", "resource.basic_pool", "effect.dash"]  (key_hint optional)
  generatedFiles:      <array of absolute paths matching server/UI/KV patterns above>
  entryBindings:       <array with server binding; UI binding if key_hint selected>
  revision:            1
  status:              "active"
  createdAt:           <ISO 8601>
  updatedAt:           <ISO 8601, equal to createdAt>
  intentKind:          "micro-feature"
```

### Acceptance Evidence Types

- workspace JSON record (full or relevant excerpt)
- list of actual generated file paths on disk
- `entryBindings` array from workspace record
- command output confirming create succeeded

---

## Case C-02: Persisted Feature Update

**Case ID**: C-02
**Packet**: B
**Capability**: `update` — owned-scope rewrite
**UI/Bridge**: minimal

### User Request (same feature as C-01)

```
把冲刺技能的冷却时间从8秒改成12秒
```

### Prerequisite

Case C-01 has been run successfully. The workspace contains an active feature with `featureId = <C-01's id>`.

### Expected featureId

Same `featureId` as C-01. The `featureId` must NOT change during update.

### Expected selectedPatterns

Same as C-01. Patterns do not change during parameter update.

### Expected generatedFiles

Same file paths as C-01. The update must rewrite those same files, not create new ones.

### Expected entryBindings

Same as C-01. Bindings must remain consistent.

### Expected workspace state

After update:

```
workspace.features[<C-01's featureId>]:
  featureId: <unchanged>
  revision: 2  (incremented from C-01's revision)
  updatedAt: <newer timestamp>
  generatedFiles: <same paths as before>
  entryBindings: <same as before>
```

### Expected host changes

Only the feature's own owned files are modified. No new files created. No changes to unrelated files.

### Key Path Patterns, Bridge Points, and Workspace Fields

#### Server output path pattern (must be identical to C-01)

Same paths as C-01 `generatedFiles`. The update must rewrite the same files, not create new ones.

#### UI output path pattern (must be identical to C-01)

Same paths as C-01 `generatedFiles` for UI components. If C-01 had a `ui.key_hint`, the update must touch the same files.

#### Bridge points (must be unchanged)

| Bridge Point File | Expected Change | Binding Kind |
|-------------------|----------------|--------------|
| `game/scripts/src/modules/index.ts` | **No change** to existing imports | existing bindings unchanged |
| `content/panorama/src/hud/script.tsx` | **No change** to existing mounts | existing bindings unchanged |

The update must not add or remove any bridge entries.

#### Required workspace record fields (changes from C-01)

```
workspace.features[<C-01's featureId>]:
  featureId:           <identical to C-01 — strict equality check>
  blueprintId:         <identical to C-01>
  selectedPatterns:    <identical to C-01 — patterns do not change on parameter update>
  generatedFiles:      <identical to C-01 — same paths, same count>
  entryBindings:      <identical to C-01 — same count and structure>
  revision:            2  (was 1 in C-01)
  status:              "active"
  createdAt:           <identical to C-01>
  updatedAt:           <newer ISO 8601 than C-01>
```

### Acceptance Evidence Types

- workspace record showing same `featureId` but incremented `revision`
- diff of generatedFiles paths (should be identical to C-01)
- `updatedAt` timestamp newer than C-01's `updatedAt`

---

## Case C-03: Feature Delete / Unload

**Case ID**: C-03
**Packet**: C
**Capability**: `delete` — full unload
**UI/Bridge**: minimal

### User Request

```
删除冲刺技能
```

### Prerequisite

Case C-01 has been run successfully. The workspace contains an active feature with `featureId = <C-01's id>`.

### Expected featureId

The deleted `featureId` is no longer present as `status: "active"` in workspace.

### Expected selectedPatterns

Not applicable — feature is deleted.

### Expected generatedFiles

The files listed in `generatedFiles` from C-01 must be removed from disk, OR the feature entry must be removed/deactivated from workspace with `status: "archived"` or `"disabled"`.

### Expected entryBindings

The `entryBindings` for this feature must be removed or repaired. The bridge export at `apps/workbench-ui/public/bridge-workspace.json` must no longer expose the deleted feature's bindings.

### Expected workspace state

After delete:

- Feature record has `status: "archived"` or `"disabled"`, OR
- Feature record is absent from `workspace.features` array

### Expected host changes

- Owned files removed from `game/scripts/src/rune_weaver/` or `game/scripts/vscripts/rune_weaver/`
- Bridge points at `game/scripts/src/modules/index.ts` or `content/panorama/src/hud/script.tsx` are refreshed (no longer mount/import the deleted feature)

### Key Path Patterns, Bridge Points, and Workspace Fields

#### Server output path pattern (must be removed)

The paths that were in C-01 `generatedFiles` for server files must no longer exist on disk:

- `game/scripts/src/rune_weaver/<...>.ts` — deleted
- `game/scripts/vscripts/rune_weaver/<...>.lua` — deleted
- `game/scripts/kv/<...>.txt` — deleted

#### UI output path pattern (must be removed)

- `content/panorama/src/rune_weaver/<...>.tsx` — deleted
- `content/panorama/src/hud/script.tsx` — refreshed, no longer references deleted UI component

#### Bridge points (must be cleaned)

| Bridge Point File | Expected After Delete | Binding Kind |
|-------------------|---------------------|--------------|
| `game/scripts/src/modules/index.ts` | No import/register for the deleted feature's server files | All bindings for this feature removed |
| `content/panorama/src/hud/script.tsx` | No mount/append for the deleted feature's UI component | All bindings for this feature removed |
| `apps/workbench-ui/public/bridge-workspace.json` | No entry for this feature's `featureId` | Feature absent from export |

#### Required workspace record fields (changes from C-01)

```
workspace.features[<C-01's featureId>]:
  featureId:           <same as C-01 — captured before delete>
  status:              "archived" OR "disabled"  (not "active")
  OR: record absent from workspace.features array
  generatedFiles:      <captured from C-01, then verified deleted>
  entryBindings:      <captured from C-01, then verified cleaned from bridge>
  revision:            <unchanged from C-01 — no longer relevant once archived>
```

### Acceptance Evidence Types

- workspace record showing feature absent or `status: "archived"/"disabled"`
- confirmation that generatedFiles are removed from disk
- bridge-workspace.json no longer contains the deleted feature's bindings

---

## Case C-04: Minimal Conflict / Overlap

**Case ID**: C-04
**Packet**: D
**Capability**: minimum governance — ownership overlap detection
**UI/Bridge**: minimal

### User Request

```
创建一个按Q键触发的冲刺技能（和C-01同键位），同时创建另一个按Q键触发的闪烁技能
```

### Prerequisite

Clean workspace (no features from C-01/C-02/C-03 present, or start fresh).

### Expected conflict detection

When the second feature (blink skill) is being created, the governance layer must detect that both features target the same key binding `Q` via `input.key_binding` pattern. The system must block or require confirmation before write.

### Expected selectedPatterns for each feature

Feature 1 (dash): `input.key_binding` with key=Q
Feature 2 (blink): `input.key_binding` with key=Q

Both claim `input.key_binding` + `Q`.

### Expected workspace state after block/confirmation

Either:

- Second feature is blocked: workspace unchanged, conflict report issued
- Second feature proceeds after confirmation: workspace contains both features, conflict is acknowledged in the record

### Expected governance output

```
conflictResult:
  hasConflict: true
  conflicts:
    - kind: shared_integration_point
      severity: error | warning
      conflictingPoint: input.key_binding:Q
      existingFeatureId: <feature-1-id>
      existingFeatureLabel: 冲刺技能
  status: blocked | needs_confirmation
  recommendedAction: block | confirm
```

### Key Path Patterns, Bridge Points, and Workspace Fields

#### Server output path pattern (same key, different ability)

Both Feature 1 and Feature 2 generate server code under the same ownership directory. The conflict is not about file paths — it is about the `input.key_binding` integration point both features claim.

#### UI output path pattern

Both features may generate UI components under `content/panorama/src/rune_weaver/`. If both generate `key_hint` for the same key, the bridge mount in `content/panorama/src/hud/script.tsx` will have duplicate entries.

#### Bridge points (contention target)

| Bridge Point File | Contested By | Conflict Type |
|-------------------|-------------|---------------|
| `input.key_binding` with `key: "Q"` | Both features | Same trigger key, cannot both bind |
| `content/panorama/src/hud/script.tsx` | Both features if UI generated | Duplicate mount/append for same key |
| `game/scripts/src/modules/index.ts` | Both features if server generated | Duplicate server import |

#### Required governance output fields

```
conflictResult:
  hasConflict:          true  (must be true when same key binding exists)
  conflicts:            <non-empty array>
  conflicts[0].kind:   "shared_integration_point"  (not "ownership_conflict")
  conflicts[0].conflictingPoint: "input.key_binding:Q"  (specific, not generic)
  conflicts[0].existingFeatureId: <featureId of Feature 1>
  conflicts[0].existingFeatureLabel: "冲刺技能"
  conflicts[0].severity: "error" | "warning"
  status:               "blocked" | "needs_confirmation"
  recommendedAction:   "block" | "confirm"  (NOT "proceed")
```

#### Required workspace state after block

If block enforced:
- `workspace.features` contains only Feature 1
- Feature 2 is not added

If confirmation provided and proceeded:
- `workspace.features` contains both features
- Feature 2's record must show the conflict was acknowledged (no automatic resolution required for MVP)

### Acceptance Evidence Types

- governance output showing `hasConflict: true`
- `conflicts` array with non-empty entries
- `recommendedAction` is `block` or `confirm` (not `proceed`)

---

## Case C-05: Cross-System Composition with UI (Skill with Resource)

**Case ID**: C-05
**Packet**: A/B
**Capability**: `create` — cross-system with UI + bridge integration
**UI/Bridge**: yes (resource_bar, key_hint)

### User Request

```
创建一个火焰冲击技能系统：按E键消耗100点法力值释放，朝鼠标方向造成范围伤害，并在UI上显示法力条和冷却时间
```

### Expected featureId

Any stable ID assigned by create.

### Expected selectedPatterns

```
- input.key_binding (E key)
- resource.basic_pool (mana + cooldown)
- effect.resource_consume (mana cost)
- effect.damage (fire burst)
- ui.resource_bar (mana display)
- ui.key_hint (E key hint)
```

### Expected generatedFiles

```
- game/scripts/src/rune_weaver/<...>.ts  (server code)
- content/panorama/src/rune_weaver/<...>.tsx  (mana bar)
- content/panorama/src/rune_weaver/<...>.tsx  (key hint)
- game/scripts/kv/<...>.txt  (KV config, optional)
```

### Expected entryBindings

```
- target: server
  file: <server ts file>
  kind: import | register
- target: ui
  file: content/panorama/src/hud/script.tsx
  kind: append_index | mount
  symbol: <component name>
```

### Expected workspace state

```
workspace.features[<new feature>]:
  featureId: <stable id>
  blueprintId: skill_system_fire_burst
  selectedPatterns: <6 patterns listed above>
  generatedFiles: <server ts path, ui tsx paths>
  entryBindings: <server binding + ui binding>
  revision: 1
  status: "active"
```

### Expected host changes

- Server code under `game/scripts/src/rune_weaver/`
- UI files under `content/panorama/src/rune_weaver/`
- Bridge updated at `content/panorama/src/hud/script.tsx`

### Key Path Patterns, Bridge Points, and Workspace Fields

#### Server output path pattern

- `game/scripts/src/rune_weaver/<system-name>/<ability-name>.ts` — main server logic
- `game/scripts/vscripts/rune_weaver/<system-name>/<ability-name>.lua` — Lua fallback (optional)
- `game/scripts/kv/<addon>/<ability-name>.txt` — KV ability config

At least one server-side `.ts` file and one KV config must be generated.

#### UI output path pattern (critical — C-05 has UI)

- `content/panorama/src/rune_weaver/<system-name>/<mana-bar>.tsx` — resource_bar component
- `content/panorama/src/rune_weaver/<system-name>/<key-hint>.tsx` — key_hint component

Both UI components must be generated and must match the paths in `generatedFiles`.

#### Bridge points (must be updated — C-05 has UI)

| Bridge Point File | Expected Change | Binding Kind |
|-------------------|----------------|--------------|
| `game/scripts/src/modules/index.ts` | Import for server `.ts` file | `import` |
| `content/panorama/src/hud/script.tsx` | Mount both UI components | `mount` (for each component) |
| `apps/workbench-ui/public/bridge-workspace.json` | Contains server binding + 2 UI bindings | `featureId` present with 3 bindings |

This is the key differentiator from C-01: C-05 must produce at least **2 distinct UI binding entries** in `entryBindings` (resource_bar + key_hint), not just 1.

#### Required workspace record fields

```
workspace.features[<new feature>]:
  featureId:           <any stable non-empty string>
  blueprintId:         "skill_system_fire_burst"
  selectedPatterns:    ["input.key_binding", "resource.basic_pool", "effect.resource_consume",
                         "ui.resource_bar", "ui.key_hint"]  (5-6 patterns)
  generatedFiles:      <server .ts path> + <resource_bar .tsx path> + <key_hint .tsx path>
                       + optionally KV .txt path
  entryBindings:       <server binding> + <ui resource_bar binding> + <ui key_hint binding>
                       (at least 3 entries, target must include "ui" and "server")
  revision:            1
  status:              "active"
  createdAt:           <ISO 8601>
  updatedAt:           <ISO 8601, equal to createdAt>
  intentKind:          "cross-system-composition"
```

The `entryBindings` array for C-05 must contain at least one `target: "ui"` entry with `kind: "mount"` or `"append_index"`. If the array contains only server bindings, the UI was not connected — **FAIL**.

### Acceptance Evidence Types

- workspace record with non-empty `entryBindings` (at least 2: server + ui)
- UI files exist on disk under `content/panorama/src/rune_weaver/`
- bridge-workspace.json reflects the new UI bindings

---

## Packet Mapping Summary

| Packet | Primary Cases | Blocking Dependency |
|--------|--------------|-------------------|
| A | C-01, C-05 | None — start here |
| B | C-02 | A (needs truthful workspace fields) |
| C | C-03 | A (needs existing feature to delete) |
| D | C-04 | A (needs stable workspace model) |
| E | All cases | A/B/C/D must be complete first |

---

## Deferred Cases (Not in Scope for Current MVP)

- `regenerate` — regenerate artifacts from workspace record
- `rollback` — revert to a previous revision
- semantic incremental update — only changed parts rewritten
- second host support

These are documented here to prevent scope creep. They may become canonical cases in future packets.

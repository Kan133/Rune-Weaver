# Acceptance Checklists

## Status

This document provides executable checklists for the Rune Weaver README-target MVP.

Each checklist item must be verifiable as **pass** or **fail** with a concrete evidence type.

---

## Checklist 1: Product-Grade `create`

**Scope**: Full create path from user request to persisted workspace state.

**Applies to**: Packet A. Canonical case: C-01, C-05.

### Prerequisites

- [ ] Host is Dota2 (or a valid host adapter is present)
- [ ] Workspace file path is known: `game/scripts/src/rune_weaver/rune-weaver.workspace.json`
- [ ] Rune Weaver-owned directories exist or can be created

### Pre-Create Verification

- [ ] User request is captured in structured form
- [ ] Intent classification is performed (`intentKind` is set)
- [ ] Blueprint is generated from intent
- [ ] Assembly plan resolves selected patterns

### Post-Create Verification

#### Workspace Record

- [ ] **PASS**: Workspace JSON file exists at the canonical path
- [ ] **PASS**: `workspace.features` array contains the new feature record
- [ ] **PASS**: `featureId` is non-empty stable string (not a prompt echo)
- [ ] **PASS**: `blueprintId` matches the blueprint generated for this request
- [ ] **PASS**: `selectedPatterns` is a non-empty array of pattern IDs
- [ ] **PASS**: `generatedFiles` is a non-empty array of file paths
- [ ] **PASS**: `entryBindings` is a non-empty array of binding objects
- [ ] **PASS**: `revision` is set to `1` for a new feature
- [ ] **PASS**: `status` is `"active"`
- [ ] **PASS**: `createdAt` and `updatedAt` are valid ISO timestamps

**Evidence type**: Workspace JSON file content (full or excerpt showing the new record).

#### Generated Files

- [ ] **PASS**: Each path in `generatedFiles` exists on disk
- [ ] **PASS**: Each file is non-empty (size > 0 bytes)
- [ ] **PASS**: All generated files are under `game/scripts/src/rune_weaver/` or `game/scripts/vscripts/rune_weaver/` or `content/panorama/src/rune_weaver/`
- [ ] **PASS**: No generated files exist outside Rune Weaver-owned directories

**Evidence type**: File listing (ls/dir output) or glob results showing generated file paths.

#### Bridge Integration

- [ ] **PASS**: `entryBindings` contains at least one entry with `target: "server"` or `target: "ui"`
- [ ] **PASS**: For `target: "ui"` entries, the bound file path references `content/panorama/src/hud/script.tsx` or files under `content/panorama/src/rune_weaver/`
- [ ] **PASS**: Bridge export (`apps/workbench-ui/public/bridge-workspace.json`) reflects the new feature's bindings

**Evidence type**: `entryBindings` array from workspace record + bridge JSON file content.

#### Host Truth

- [ ] **PASS**: No files written outside `game/scripts/src/rune_weaver/`, `game/scripts/vscripts/rune_weaver/`, `content/panorama/src/rune_weaver/`
- [ ] **PASS**: Only approved bridge points are modified

**Evidence type**: git diff or file scan output showing only Rune Weaver-owned paths changed.

#### Evidence Objects

| Evidence Object | Source Location | PASS Condition | FAIL Condition |
|----------------|----------------|----------------|----------------|
| `workspace.features[].featureId` | `workspace.features` array in `rune-weaver.workspace.json` | Non-empty stable string | Empty string or prompt echo |
| `workspace.features[].selectedPatterns` | Same record | Non-empty array of pattern ID strings, e.g. `["input.key_binding", "resource.basic_pool"]` | Empty array `[]` |
| `workspace.features[].generatedFiles` | Same record | Non-empty array of absolute file path strings; each path exists on disk | Empty array, or paths do not exist on disk |
| `workspace.features[].entryBindings` | Same record | Non-empty array; each entry has `target`, `file`, `kind`; `target` is `"server"` or `"ui"` or `"config"` | Empty array or missing required fields |
| `workspace.features[].revision` | Same record | Integer value `1` for a newly created feature | Not `1`, or not present |
| `workspace.features[].status` | Same record | String `"active"` | Any other value |
| `workspace.features[].createdAt` | Same record | Valid ISO 8601 timestamp, e.g. `"2026-04-10T10:00:00.000Z"` | Missing, not a timestamp, or clearly wrong date |
| `workspace.features[].updatedAt` | Same record | Valid ISO 8601 timestamp, equal to or later than `createdAt` | Missing, not a timestamp, or earlier than `createdAt` |
| `workspace.features[].blueprintId` | Same record | Non-empty string matching the blueprint ID generated for this request | Empty string or unrelated ID |
| Files on disk | `game/scripts/src/rune_weaver/`, `game/scripts/vscripts/rune_weaver/`, `content/panorama/src/rune_weaver/` | Each path in `generatedFiles` resolves to a real file with size > 0 bytes | File missing or size = 0 |
| `apps/workbench-ui/public/bridge-workspace.json` | Bridge export file | Contains binding entries for the new feature (check `featureId` and `entryBindings` match) | Missing bindings for the new feature |
| Bridge point: `modules/index.ts` | `game/scripts/src/modules/index.ts` | If `target: "server"` in `entryBindings`, this file contains the import/register for the generated file | Missing import for server binding |
| Bridge point: `hud/script.tsx` | `content/panorama/src/hud/script.tsx` | If `target: "ui"` in `entryBindings`, this file contains the mount/append for the UI component | Missing mount/append for UI binding |

---

## Checklist 2: Product-Grade `update`

**Scope**: Update path that rewrites the same feature's owned artifacts while keeping `featureId` stable.

**Applies to**: Packet B. Canonical case: C-02.

### Prerequisites

- [ ] A feature from Checklist 1 exists in the workspace with `status: "active"`
- [ ] The `featureId` of the feature to update is known

### Pre-Update Verification

- [ ] `featureId` is correctly identified (update target is not ambiguous)
- [ ] Governance check confirms no conflicting features claim the same files/bindings
- [ ] Only the target feature's owned files are listed as affected surfaces

### Post-Update Verification

#### Feature Identity Preservation

- [ ] **PASS**: `workspace.features` still contains a record with the same `featureId`
- [ ] **PASS**: `blueprintId` is unchanged
- [ ] **FAIL**: `featureId` changed — update must not create a new identity

**Evidence type**: workspace record before/after showing same `featureId`.

#### Revision Increment

- [ ] **PASS**: `revision` is incremented by exactly 1 (from N to N+1)
- [ ] **PASS**: `updatedAt` timestamp is newer than the previous `updatedAt`

**Evidence type**: workspace record showing `revision: N+1` and new `updatedAt`.

#### Owned-Scope Rewrite

- [ ] **PASS**: All `generatedFiles` paths are identical to the original (no new files created)
- [ ] **PASS**: All `generatedFiles` still exist on disk and are non-empty
- [ ] **FAIL**: New files were created — update should rewrite, not expand
- [ ] **FAIL**: Any original `generatedFiles` path is now absent from disk

**Evidence type**: file listing confirming same paths.

#### Entry Bindings Stability

- [ ] **PASS**: `entryBindings` array is unchanged in count and structure
- [ ] **FAIL**: `entryBindings` count changed — bindings should remain stable unless intentionally modified

**Evidence type**: `entryBindings` array before/after comparison.

#### No Cross-Feature Pollution

- [ ] **PASS**: Only the target feature's files on disk were modified
- [ ] **PASS**: No other feature's `generatedFiles` were touched
- [ ] **FAIL**: Another feature's files were modified

**Evidence type**: git diff or file timestamps showing only target feature's files changed.

#### Evidence Objects

| Evidence Object | Source Location | PASS Condition | FAIL Condition |
|----------------|----------------|----------------|----------------|
| `workspace.features[].featureId` (before) | `rune-weaver.workspace.json` | Known stable value from Checklist 1 | Unknown or missing |
| `workspace.features[].featureId` (after) | Same record | **Identical** string to before (strict equality check) | Different string — feature identity was not preserved (critical bug) |
| `workspace.features[].revision` (before) | Same record | Integer N (captured before update) | Missing or not an integer |
| `workspace.features[].revision` (after) | Same record | Integer N+1 (exactly +1) | Not incremented, incremented by ≠1, or reset to 1 |
| `workspace.features[].updatedAt` (before) | Same record | Valid ISO 8601 timestamp | Missing or invalid |
| `workspace.features[].updatedAt` (after) | Same record | Valid ISO 8601 timestamp; **later** than before | Same as before or earlier |
| `workspace.features[].generatedFiles` (before) | Same record | Non-empty array of absolute path strings | Empty array |
| `workspace.features[].generatedFiles` (after) | Same record | Same **set** of paths (order not semantically significant); no new unrelated paths; no owned paths silently removed | New unrelated paths added, or owned paths removed without justification |
| `workspace.features[].entryBindings` (before) | Same record | Non-empty array | Empty array |
| `workspace.features[].entryBindings` (after) | Same record | **Identical** array in count and structure | Count changed or structure changed |
| Files on disk (before) | `game/scripts/src/rune_weaver/`, `game/scripts/vscripts/rune_weaver/` | Each path in `generatedFiles` exists, size > 0 | File missing or empty before update |
| Files on disk (after) | Same directories | Same paths still exist; no new files created under Rune Weaver-owned dirs | New files created, or original files deleted |
| `git diff --name-only` | Repository root | Only paths matching `generatedFiles` appear as changed | Any path **not** in `generatedFiles` appears as changed |
| Other feature's `generatedFiles` | Other records in `rune-weaver.workspace.json` | Those paths are **not** modified on disk | Any other feature's files were touched |

---

## Checklist 3: Product-Grade `delete`

**Scope**: Delete path that fully unloads the feature from workspace, disk, and bridge.

**Applies to**: Packet C. Canonical case: C-03.

### Prerequisites

- [ ] A feature from Checklist 1 exists in the workspace with `status: "active"`
- [ ] Governance has confirmed no other feature depends on the target

### Pre-Delete Verification

- [ ] Dependency check confirms no other feature has `depends_on` pointing to the target
- [ ] Governance confirms no active conflict blocking the delete

### Post-Delete Verification

#### Workspace State

- [ ] **PASS**: The feature record is removed from `workspace.features` OR has `status: "archived"` OR `status: "disabled"`
- [ ] **FAIL**: Feature record still present with `status: "active"`

**Evidence type**: workspace JSON showing feature absent or status changed.

#### Generated Files Removal

- [ ] **PASS**: All paths listed in `generatedFiles` are removed from disk, OR
- [ ] **PASS**: The feature's `generatedFiles` array is empty and the files are gone

**Evidence type**: file listing confirming generated files are absent from disk.

#### Bridge Cleanup

- [ ] **PASS**: `entryBindings` for this feature are no longer active in the bridge export
- [ ] **PASS**: `apps/workbench-ui/public/bridge-workspace.json` does not expose the deleted feature's bindings
- [ ] **PASS**: Approved bridge points (`game/scripts/src/modules/index.ts`, `content/panorama/src/hud/script.tsx`) do not contain imports/registers for the deleted feature

**Evidence type**: bridge JSON content and bridge point file content.

#### Host Truth

- [ ] **PASS**: No orphaned Rune Weaver-owned files remain from the deleted feature
- [ ] **PASS**: Host remains consistent after feature unload (game can load without the deleted feature)

**Evidence type**: file listing of Rune Weaver-owned directories showing no orphaned files.

#### Evidence Objects

| Evidence Object | Source Location | PASS Condition | FAIL Condition |
|----------------|----------------|----------------|----------------|
| `workspace.features[].featureId` (before) | `rune-weaver.workspace.json` | Known stable value from Checklist 1 | Unknown or missing |
| `workspace.features[].status` (after) | Same record | Absent from array, OR present with status that is **not** `"active"` (e.g. `"archived"`, `"disabled"`, `"rolled_back"`) | Present with `status: "active"` |
| `workspace.features[].generatedFiles` (captured before delete) | Same record, captured before delete | Non-empty array of path strings | Was already empty before delete |
| Files on disk (after) | Paths from captured `generatedFiles` | All files **removed** from disk | Any file still exists at the original path |
| `workspace.features[].entryBindings` (captured before delete) | Same record, captured before delete | Non-empty array | Was already empty before delete |
| `bridge-workspace.json` (after) | `apps/workbench-ui/public/bridge-workspace.json` | No entry for this feature's `featureId` | Feature's `featureId` still present in bridge export |
| Bridge point: `modules/index.ts` (after) | `game/scripts/src/modules/index.ts` | No import/register referencing the deleted feature's generated files | Still contains import/register for deleted feature |
| Bridge point: `hud/script.tsx` (after) | `content/panorama/src/hud/script.tsx` | No mount/append referencing the deleted feature's UI components | Still contains mount/append for deleted feature |
| Other features' `entryBindings` | Other records in `rune-weaver.workspace.json` | Other features' bindings are intact | Accidentally modified or removed |
| Orphaned files scan | `game/scripts/src/rune_weaver/`, `game/scripts/vscripts/rune_weaver/` | No leftover `.lua`, `.ts`, `.tsx` files from the deleted feature | Orphaned files found in Rune Weaver-owned dirs |

---

## Checklist 4: Minimum Governance

**Scope**: Pre-write conflict detection for ownership overlap, bridge contention, ambiguous targets, and delete risk.

**Applies to**: Packet D. Canonical case: C-04.

### Pre-Write Governance Check

#### Ownership Overlap Detection

- [ ] **PASS**: When two features claim overlapping files, governance detects and reports the conflict
- [ ] **Evidence**: `conflictResult.hasConflict === true` with `kind: "ownership_conflict"` or `"shared_integration_point"`

#### Bridge Point Contention Detection

- [ ] **PASS**: When two features target the same bridge point (e.g., same key binding), governance detects and reports
- [ ] **Evidence**: `conflictResult.conflicts` contains an entry where `conflictingPoint` matches the contested bridge/integration point

#### Delete Dependency Risk

- [ ] **PASS**: When deleting a feature that another feature depends on, governance blocks or warns
- [ ] **Evidence**: `conflictResult.hasConflict === true` with `kind: "dependency_conflict"` or similar

#### Ambiguous Update Target (Deferred)

**Status**: Deferred to post-MVP.

**Reason**: CLI update command requires explicit `--feature <featureId>` parameter, eliminating the need for ambiguous target detection in the current MVP scope. This feature may be implemented in future versions for interactive workflows.

**Evidence**: N/A (not in current scope)

#### Block / Confirm Behavior

- [ ] **PASS**: When conflict is detected, `recommendedAction` is `block` or `confirm`, not `proceed`
- [ ] **FAIL**: `recommendedAction === "proceed"` despite detected conflict

**Evidence type**: governance output object showing conflict details and recommended action.

### Post-Governance Decision

- [ ] **PASS**: If `recommendedAction === "block"`, write is prevented
- [ ] **PASS**: If `recommendedAction === "confirm"`, write proceeds only after explicit operator confirmation
- [ ] **PASS**: If `recommendedAction === "proceed"`, write is allowed

#### Evidence Objects

| Evidence Object | Source Location | PASS Condition | FAIL Condition |
|----------------|----------------|----------------|----------------|
| `conflictResult.hasConflict` | Governance output object | `true` when a real conflict exists; `false` when no conflict | `false` when conflict exists (false negative) |
| `conflictResult.conflicts[].kind` | `conflicts` array | One of: `"ownership_conflict"`, `"shared_integration_point"`, `"bridge_contention"`, `"dependency_conflict"`, `"pattern_conflict"` | Empty or unrelated kind |
| `conflictResult.conflicts[].conflictingPoint` | Same array entry | Non-empty string identifying the contested file, path, key, or integration point | Empty string |
| `conflictResult.conflicts[].existingFeatureId` | Same array entry | Non-empty string matching a `featureId` already in `workspace.features` | Empty string or non-existent feature ID |
| `conflictResult.recommendedAction` | Governance output | One of: `"block"`, `"confirm"`, `"proceed"` | Missing or unknown value |
| `conflictResult.status` | Governance output | One of: `"blocked"`, `"needs_confirmation"`, `"safe"`, `"acknowledged"`, `"resolved"` | `"safe"` when conflict exists |
| `conflictResult.hasConflict === true` + `recommendedAction === "proceed"` | Combined check | Never — this combination is a **critical bug** | This combination occurred |
| Write prevention (when `block`) | Actual write operation | No files written, no workspace record changed | Files were written despite `block` |
| Confirmation record (when `confirm`) | Operator confirmation log or CLI output | Explicit confirmation recorded before write | No confirmation record, write proceeded anyway |

---

## Evidence Type Reference

| Evidence Type | Where to Find |
|--------------|---------------|
| Workspace JSON | `game/scripts/src/rune_weaver/rune-weaver.workspace.json` |
| Generated files | `game/scripts/src/rune_weaver/`, `game/scripts/vscripts/rune_weaver/`, `content/panorama/src/rune_weaver/` |
| Bridge export | `apps/workbench-ui/public/bridge-workspace.json` |
| Bridge points | `game/scripts/src/modules/index.ts`, `content/panorama/src/hud/script.tsx` |
| Command output | stdout/stderr from `npm run workbench` or CLI invocation |
| git diff | `git diff --name-only` showing changed files |

---

## Failure Actions

| Checklist | Failure Condition | Required Action |
|-----------|------------------|-----------------|
| create | workspace record missing fields | Do not claim create is complete. Document which fields are missing. |
| create | generatedFiles not on disk | Do not claim create is complete. Document which files are missing. |
| update | featureId changed | This is a **critical bug**. Feature identity was not preserved. |
| update | new files created | Update should rewrite, not expand. Reject the change. |
| update | revision not incremented | Update metadata is stale. Reject the change. |
| delete | feature still active | Delete is incomplete. Continue cleanup. |
| delete | files remain on disk | Unload is incomplete. Continue cleanup. |
| delete | bridge still exposed | Bridge leak. Host may try to load deleted feature. |
| governance | proceed despite conflict | **Critical bug**. Governance not enforced. |

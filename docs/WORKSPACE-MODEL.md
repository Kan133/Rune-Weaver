# Workspace Model

> Status: authoritative
> Audience: agents
> Doc family: baseline
> Update cadence: on-contract-change
> Last verified: 2026-04-17
> Read when: changing feature registry, ownership, or create/update/delete workspace behavior
> Do not use for: roadmap sequencing or host realization policy by itself

## Status

This document defines the workspace model agents should use for the current README-target MVP.

Current required lifecycle surface:

- `create`
- `update`
- `regenerate`
- `delete`

Deferred:

- `rollback`
- semantic incremental update

## 1. Purpose

The workspace model exists to answer:

- how Rune Weaver persists feature identity
- how Rune Weaver knows what it owns
- how create/update/delete stay inside host boundaries
- how multiple features coexist without silent collisions

## 2. Canonical Workspace File

The current canonical workspace file path is:

- `game/scripts/src/rune_weaver/rune-weaver.workspace.json`

Agents must treat this file as the authoritative persisted registry for Rune Weaver-managed features inside a host.

Do not document or implement another source of truth for feature state without explicitly changing the code and this document together.

Current guardrail:

- workspace remains the persisted registry and lifecycle authority even when a feature owns a Rune Weaver authoring artifact
- if a feature owns a source-backed artifact, the artifact's existence, path, and ownership boundary belong to the lifecycle skeleton
- current source-backed artifact materialization should derive from normalized `FinalBlueprint.featureAuthoring`, not from planner-local parameter bags
- bounded content inside that already-owned artifact may be refreshed by `GapFill` or other bounded implementation fill inside owned scope
- the artifact does not replace workspace as the persisted registry or lifecycle authority

## 3. Workspace Structure

```ts
interface RuneWeaverWorkspace {
  version: string;
  hostType: "dota2-x-template";
  hostRoot: string;
  addonName: string;
  mapName?: string;  // 可选：默认启动的地图名称（init 时写入，launch 读取待接通）
  initializedAt: string;
  features: RuneWeaverFeatureRecord[];
}

interface RuneWeaverFeatureRecord {
  featureId: string;
  featureName?: string;
  intentKind: string;
  status: "active" | "disabled" | "archived" | "rolled_back";
  revision: number;
  blueprintId: string;
  selectedPatterns: string[];
  generatedFiles: string[];
  entryBindings: EntryBinding[];
  sourceModel?: FeatureSourceModelRef;
  featureAuthoring?: FeatureAuthoring;
  dependsOn?: string[];
  integrationPoints?: string[];
  gapFillBoundaries?: string[];
  createdAt: string;
  updatedAt: string;
}

interface EntryBinding {
  target: "server" | "ui" | "config";
  file: string;
  kind: "import" | "register" | "mount" | "append_index";
  symbol?: string;
}

interface FeatureSourceModelRef {
  adapter: string;
  version: number;
  path: string;
}
```

For the current MVP, the minimum truthful fields are:

- `featureId`
- `blueprintId`
- `selectedPatterns`
- `generatedFiles`
- `entryBindings`
- `revision`
- timestamps

When present, these fields are also lifecycle-truthful rather than advisory:

- `sourceModel`
- `featureAuthoring`
- `integrationPoints`
- `gapFillBoundaries`

## 4. Feature Identity

Each feature must have a stable `featureId`.

Requirements:

- unique within the host
- does not change across normal updates
- is not inferred from a transient prompt

Agents must not treat one new prompt as automatically one new feature.

Routing must distinguish:

- create new feature
- update existing feature
- possible existing feature match

## 5. Ownership Model

The workspace exists to support ownership.

### 5.1 File Ownership

Every generated file must belong to exactly one feature.

Rune Weaver-owned implementation files must stay inside Rune Weaver-owned directories.

### 5.2 Bridge Ownership

Features may use bridge points, but only through the allowed shared bridge files:

- `game/scripts/src/modules/index.ts`
- `content/panorama/src/hud/script.tsx`

No feature should directly claim arbitrary host entry ownership outside these allowed bridge points.

### 5.3 Ownership Exclusivity

The system must prevent:

- two features claiming the same owned implementation file
- two features silently writing the same business surface
- delete/update operations crossing into another feature's owned scope without explicit governance

### 5.4 Source-Backed Artifact Ownership

If a feature owns a Rune Weaver authoring artifact:

- workspace tracks that ownership through `sourceModel`
- workspace also stores normalized `featureAuthoring` as the source-backed authoring truth used by create / update / regenerate
- the artifact path is part of the feature's owned lifecycle boundary
- `update` / `delete` must treat that artifact as owned scope
- artifact content may be muscle-filled inside that owned scope, but the existence/path/ownership of the artifact is not a Gap Fill decision
- workspace updates should use explicit clear / replace semantics for `sourceModel` and `featureAuthoring`; no silent carry-forward when a regenerated write plan omits them

## 6. Required Operations

### 6.1 Create

`create` means:

- create a new persisted feature
- assign stable `featureId`
- write Rune Weaver-owned artifacts
- write truthful `selectedPatterns`
- write truthful `generatedFiles`
- write truthful `entryBindings`
- persist truthful owned-artifact metadata when the feature owns a source-backed artifact
- persist truthful normalized `featureAuthoring` when the feature uses a source-backed authoring profile
- update workspace

If the operation does not persist truthful patterns/files/bindings, it is not yet product-grade `create`.

### 6.2 Update

`update` means:

- target an existing persisted feature
- keep the same `featureId`
- rewrite only that feature's owned artifacts and allowed bridge bindings
- update `revision`
- refresh workspace fields so they remain truthful
- clear or replace `sourceModel` / `featureAuthoring` explicitly from the write result instead of silently retaining stale source-backed fields

For the current MVP, `update` is:

- owned-scope lifecycle update
- not semantic incremental update

Writing only metadata such as `.update.json` does not count as finished product-grade `update`.

### 6.3 Delete

`delete` means:

- remove or deactivate the feature from active workspace state
- remove its Rune Weaver-owned artifacts
- refresh bridge exposure so the host no longer mounts it
- check dependency/conflict risk before execution

Deleting only the workspace record does not count as finished product-grade `delete`.

## 7. Deferred Operations

### 7.1 Regenerate

Current truthful role:

- `regenerate` is the rewrite path when update diff classification requires cleanup + rewrite rather than selective refresh
- it must refresh `generatedFiles`, `sourceModel`, and `featureAuthoring` through the same owned-scope lifecycle truth as `create` / `update`
- it is not semantic incremental update; it is an ownership-safe rewrite path

### 7.2 Rollback

Deferred.

Do not require `rollback` for the current MVP.

## 8. Minimum Cross-Feature Model

The minimum relationship vocabulary for the current MVP is:

- `depends_on`
- `extends`
- `conflicts_with`

These relationships may first appear in review/governance output before they become richer persisted structures.

The minimum pre-write checks are:

1. is the target feature clear
2. does the write cross another feature's owned files
3. does the write occupy an already-used bridge/integration point
4. does delete break a dependent feature
5. does the write escape Rune Weaver-owned host boundaries

## 9. Current Reality Note

Current code provides product-grade lifecycle operations:

- `create` persists real patterns/files/bindings via CLI authoritative path
- `update` performs owned-scope artifact rewrite (not metadata-only)
- `delete` unloads feature artifacts and refreshes bridge exposure (not record-only)
- governance is workspace-backed (not mock-driven)

Agents should treat the definitions above as the current contract, not a future target.

## 10. Authoritative Execution Path

The authoritative execution path for lifecycle operations is the CLI surface in `apps/cli/dota2-cli.ts`.

Workbench/UI paths are:
- preview / visualization surfaces
- onboarding orchestration shells
- NOT authoritative for lifecycle acceptance

Agents must not treat workbench demo outputs as proof of product-grade lifecycle behavior.

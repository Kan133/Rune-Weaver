# Workspace Model

## Status

This document defines the workspace model agents should use for the current README-target MVP.

Current required lifecycle surface:

- `create`
- `update`
- `delete`

Deferred:

- `regenerate`
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

## 3. Workspace Structure

```ts
interface RuneWeaverWorkspace {
  version: string;
  hostType: "dota2-x-template";
  hostRoot: string;
  addonName: string;
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
  dependsOn?: string[];
  createdAt: string;
  updatedAt: string;
}

interface EntryBinding {
  target: "server" | "ui" | "config";
  file: string;
  kind: "import" | "register" | "mount" | "append_index";
  symbol?: string;
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

## 6. Required Operations

### 6.1 Create

`create` means:

- create a new persisted feature
- assign stable `featureId`
- write Rune Weaver-owned artifacts
- write truthful `selectedPatterns`
- write truthful `generatedFiles`
- write truthful `entryBindings`
- update workspace

If the operation does not persist truthful patterns/files/bindings, it is not yet product-grade `create`.

### 6.2 Update

`update` means:

- target an existing persisted feature
- keep the same `featureId`
- rewrite only that feature's owned artifacts and allowed bridge bindings
- update `revision`
- refresh workspace fields so they remain truthful

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

Deferred.

Do not require `regenerate` for the current MVP.

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

Current code already provides:

- workspace file
- feature records
- update/delete helpers

But agents must be explicit about the gap between current code and target semantics:

- some create paths are still partial
- current update path is narrower than the target definition above
- current delete path is narrower than the target definition above

This document defines the contract the project should converge to for the README-target MVP.

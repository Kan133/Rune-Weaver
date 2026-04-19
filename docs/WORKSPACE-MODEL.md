# Workspace Model

> Status: authoritative
> Audience: agents
> Doc family: baseline
> Update cadence: on-contract-change
> Last verified: 2026-04-18
> Read when: changing feature registry, ownership, dependency contracts, or lifecycle behavior
> Do not use for: host realization policy or same-day task priority by itself

## Purpose

The workspace model answers:

- how Rune Weaver persists feature identity
- how Rune Weaver knows what each feature owns
- how lifecycle operations stay inside governed scope
- how cross-feature dependency truth is stored and revalidated

## Canonical Workspace File

Current canonical workspace file:

- `game/scripts/src/rune_weaver/rune-weaver.workspace.json`

This remains the authoritative persisted registry for Rune Weaver-managed features inside a host.

No other artifact replaces workspace as lifecycle truth.

## Current Workspace Structure

```ts
interface RuneWeaverWorkspace {
  version: string;
  hostType: "dota2-x-template";
  hostRoot: string;
  addonName: string;
  mapName?: string;
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
  maturity?: "exploratory" | "stabilized" | "templated";
  implementationStrategy?: "family" | "pattern" | "guided_native" | "exploratory";
  featureContract?: FeatureContract;
  validationStatus?: ValidationStatus;
  dependencyEdges?: FeatureDependencyEdge[];
  commitDecision?: CommitDecision;
  integrationPoints?: string[];
  gapFillBoundaries?: string[];
  createdAt: string;
  updatedAt: string;
}
```

## Feature Identity

Each feature must have a stable `featureId`.

Requirements:

- unique within the host
- preserved across normal updates and regenerates
- not inferred only from transient prompt text

Agents must distinguish:

- create new feature
- update existing feature
- regenerate existing feature
- delete or rollback existing feature

## Ownership Model

### File Ownership

Every owned implementation file belongs to exactly one feature.

Allowed owned namespaces:

- `game/scripts/src/rune_weaver/**`
- `game/scripts/vscripts/rune_weaver/**`
- `content/panorama/src/rune_weaver/**`

### Bridge Ownership

Features may bind only through explicit bridge points:

- `game/scripts/src/modules/index.ts`
- `content/panorama/src/hud/script.tsx`

No feature may directly claim arbitrary host entry ownership.

### Source-Backed Artifact Ownership

If a feature owns a Rune Weaver authoring artifact:

- workspace tracks it through `sourceModel`
- normalized authoring truth is stored in `featureAuthoring`
- artifact existence / path / ownership belong to lifecycle skeleton
- artifact content may be refreshed only inside bounded owned scope

Compatibility note:

- `gapFillBoundaries` remains as compatibility projection only
- the real repair authority comes from `fillContracts` during planning

## Dependency Contract Model

Feature coupling is now first-class workspace truth.

Persisted dependency surfaces:

- `featureContract.exports`
- `featureContract.consumes`
- `featureContract.integrationSurfaces`
- `featureContract.stateScopes`
- `dependencyEdges`
- `dependsOn`

Current relation types:

- `reads`
- `writes`
- `triggers`
- `grants`
- `syncs_with`

Rules:

- provider changes must run dependency-driven revalidation before commit
- required dependency breakage blocks the provider commit
- optional dependency drift may downgrade dependents to `needs_review`
- undeclared cross-feature writes are blocked

## Validation And Commit Fields

Workspace persists lifecycle truth beyond file ownership:

- `validationStatus`
  - stage-level blueprint / repair / dependency / host / runtime status
- `commitDecision`
  - final lifecycle verdict for the latest successful command
- `maturity`
  - exploratory / stabilized / templated
- `implementationStrategy`
  - family / pattern / guided_native / exploratory

Current rule:

- exploratory outputs may write, but they must persist `requiresReview=true` through final commit decision semantics

## Lifecycle Operations

### Create

`create` means:

- create a new persisted feature
- assign stable `featureId`
- write owned artifacts
- persist truthful contract / dependency / validation / strategy fields
- update workspace only after final gate

### Update

`update` means:

- target an existing feature
- keep the same `featureId`
- rewrite only owned artifacts and allowed bridge bindings
- preserve declared dependency truth unless explicitly changed by blueprint
- refresh workspace after final gate

### Regenerate

`regenerate` means:

- ownership-safe cleanup + rewrite
- same `featureId`
- same governed planning and validation semantics as create/update
- no post-hoc workspace patching outside the main final gate

### Delete

`delete` means:

- remove owned artifacts
- remove the feature from active workspace state
- refresh bridge exposure
- run dependency-driven revalidation before commit

### Rollback

`rollback` means:

- maintenance command for backing a feature out of active state
- remove owned artifacts
- mark the feature `rolled_back`
- stay under the same ownership / dependency / validation governance

## Minimum Read/Write Checks

Before commit, the system must check:

1. is the target feature clear
2. does the write cross another feature's owned files
3. does the change occupy an already-used bridge or integration point
4. does the lifecycle action break required dependents
5. does the write escape Rune Weaver-owned host boundaries

## Current Reality Note

Current code truth:

- create/update/regenerate/delete use the governed mainline
- dependency-driven revalidation writes dependent downgrade state back into workspace
- final lifecycle authority is the persisted final commit decision, not blueprint status alone
- workbench artifacts do not replace workspace truth

## Authoritative Execution Path

The authoritative lifecycle path remains the CLI surface under [dota2-cli.ts](/D:/Rune%20Weaver/apps/cli/dota2-cli.ts).

Workbench/UI paths are:

- preview surfaces
- orchestration shells
- review/evidence shells

They are not lifecycle acceptance authority.

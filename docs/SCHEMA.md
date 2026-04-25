# SCHEMA

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-20
> Read when: checking the current contract truth for Wizard-side artifacts, `FinalBlueprint`, `AssemblyPlan`, and adapter-owned sidecars
> Do not use for: host-specific write policy or same-day task priority by itself

## Purpose

This document records the current shipped contract surface.

It is intentionally about current truth, not about recommended future migrations.

## Current Contract Surface

The core runtime-planning objects are:

- `IntentSchema`
- `WizardClarificationPlan`
- `UpdateIntent`
- `FinalBlueprint`
- `AssemblyPlan`
- `ValidationStatus`
- generic `FeatureAuthoring`

Important current boundary:

- internal `raw facts / governance decisions / open semantic residue` seams are real
- they are not a new public `IntentSchema` artifact shape

## 1. Wizard-Side Contracts

### `IntentSchema`

`IntentSchema` remains the public semantic artifact.

It currently carries:

- request/classification summaries
- requirements and constraints
- typed semantic sections such as:
  - `interaction`
  - `targeting`
  - `timing`
  - `spatial`
  - `stateModel`
  - `flow`
  - `selection`
  - `effects`
  - `outcomes`
  - `contentModel`
  - `composition`
  - `integrations`
- `normalizedMechanics`
- `resolvedAssumptions`
- compatibility fields where still present

Current interpretation rule:

- runtime/session-long persistence may still appear as `timing.duration.kind = "persistent"` or `effects.durationSemantics = "persistent"`
- that does not, by itself, imply external storage or cross-match persistence

### `WizardClarificationPlan` And `WizardClarificationAuthority`

Current clarification truth is:

```ts
interface WizardClarificationAuthority {
  blocksBlueprint: boolean;
  blocksWrite: boolean;
  requiresReview: boolean;
  unresolvedDependencies: WizardUnresolvedDependency[];
  reasons: string[];
}

interface WizardClarificationPlan {
  questions: WizardClarificationQuestion[];
  maxQuestions: number;
  requiredForFaithfulInterpretation: boolean;
  targetPaths: string[];
  reason: string;
  authority?: WizardClarificationAuthority;
}
```

Current compatibility note:

- `requiresClarification` may still exist in CLI/reporting surfaces
- it is no longer the sole gating truth

### `IntentGovernanceDecisions`

`IntentGovernanceDecisions` is now the downstream governance seam.

It is internal, but real:

- blueprint/admission/planning consumers should read it
- they should not keep branching on raw prompt prose or accidental schema wording

### Update-Mode Contracts

Update mode does not reuse create-mode planning naively.

Current truth:

- Wizard reads `CurrentFeatureContext`
- it emits `requestedChange: IntentSchema`
- it emits `UpdateIntent`

`UpdateIntent` is the generic update delta contract.
Adapter-specific source-backed merge logic happens later and must not be pushed back into core Wizard authority.

## 2. Blueprint-Stage Contracts

### `FinalBlueprint`

Current shipped `FinalBlueprint` includes these fields:

```ts
interface FinalBlueprint extends Blueprint {
  status: "ready" | "weak" | "blocked";
  moduleNeeds: ModuleNeed[];
  moduleFacets?: ModuleFacetSpec[];
  moduleRecords?: ModuleImplementationRecord[];
  unresolvedModuleNeeds?: UnresolvedModuleNeed[];
  fillContracts?: FillContract[];
  designDraft: DesignDraft;
  maturity: FeatureMaturity;
  implementationStrategy: ImplementationStrategy;
  featureContract: FeatureContract;
  validationStatus: ValidationStatus;
  dependencyEdges: FeatureDependencyEdge[];
  commitDecision: CommitDecision;
}
```

Current contract meaning:

- `status` is planning-time truth
- `commitDecision` may already exist at blueprint stage, but it is not the final lifecycle gate
- `designDraft`, `featureContract`, `dependencyEdges`, and `implementationStrategy` are not optional side notes; they are part of the actual downstream planning contract

### `DesignDraft`

Current `DesignDraft` captures:

- retrieved family candidates
- retrieved pattern candidates
- reuse confidence
- chosen implementation strategy
- optional artifact targets and notes

This is the reviewable planning snapshot of why the blueprint landed where it did.

### `FeatureContract`

Current core contract:

```ts
interface FeatureContractSurface {
  id: string;
  kind: "event" | "data" | "capability" | "state" | "integration";
  summary: string;
}

interface FeatureContract {
  exports: FeatureContractSurface[];
  consumes: FeatureContractSurface[];
  integrationSurfaces: string[];
  stateScopes: FeatureStateScope[];
}
```

Important current truth:

- Dota2 provider grant export uses `kind = "capability"`
- core contract shape did not grow a Dota2-specific surface kind

### `FeatureDependencyEdge`

Current shape is still narrow:

```ts
interface FeatureDependencyEdge {
  relation: FeatureDependencyRelation;
  targetFeatureId?: string;
  targetSurfaceId?: string;
  required?: boolean;
  summary?: string;
}
```

Current boundary:

- unresolved cross-feature write-blocking state does not live on this type
- that staging still belongs to clarification authority and later validation/final-gate logic

### `ValidationStatus` And `CommitDecision`

Current validation and commit objects are layered:

```ts
interface ValidationStatus {
  status: ValidationOutcome;
  warnings: string[];
  blockers: string[];
  lastValidatedAt?: string;
  blueprint?: ValidationStageStatus;
  synthesis?: ValidationStageStatus;
  repair?: ValidationStageStatus;
  dependency?: ValidationStageStatus;
  host?: ValidationStageStatus;
  runtime?: ValidationStageStatus;
}

interface CommitDecision {
  outcome: "committable" | "exploratory" | "blocked";
  canAssemble: boolean;
  canWriteHost: boolean;
  requiresReview: boolean;
  reasons: string[];
  stage?: "blueprint" | "final";
  impactedFeatures?: string[];
  dependencyBlockers?: string[];
  downgradedFeatures?: string[];
  reviewModules?: string[];
}
```

## 3. Pattern-Facing And Assembly Contracts

### `ModuleNeed`

Current shipped pattern-facing seam is:

```ts
interface ModuleNeed {
  moduleId: string;
  semanticRole: string;
  backboneKind?: "gameplay_ability" | "ui_surface" | "supporting_surface";
  facetIds?: string[];
  coLocatePreferred?: boolean;
  requiredCapabilities: string[];
  optionalCapabilities?: string[];
  requiredOutputs?: string[];
  stateExpectations?: string[];
  integrationHints?: string[];
  invariants?: string[];
  boundedVariability?: string[];
  explicitPatternHints?: string[];
  prohibitedTraits?: string[];
}
```

Current rule:

- `explicitPatternHints` are tie-break inputs
- they are not final pattern resolution

### `AssemblyPlan`

Current shipped `AssemblyPlan` includes:

```ts
interface AssemblyPlan {
  blueprintId: string;
  selectedPatterns: SelectedPattern[];
  moduleRecords?: ModuleImplementationRecord[];
  unresolvedModuleNeeds?: UnresolvedModuleNeed[];
  synthesisBundles?: SynthesisBundlePlan[];
  modules?: AssemblyModule[];
  connections?: BlueprintConnection[];
  writeTargets: WriteTarget[];
  bridgeUpdates?: BridgeUpdate[];
  validations: ValidationContract[];
  readyForHostWrite: boolean;
  hostWriteReadiness?: HostWriteReadiness;
  parameters?: Record<string, unknown>;
  featureAuthoring?: FeatureAuthoring;
  fillContracts?: FillContract[];
  implementationStrategy?: ImplementationStrategy;
  validationStatus?: ValidationStatus;
  dependencyEdges?: FeatureDependencyEdge[];
  commitDecision?: CommitDecision;
  sourceKind?: ModuleSourceKind;
  synthesizedArtifacts?: SynthesizedArtifact[];
  artifactSynthesisResult?: ArtifactSynthesisResult;
}
```

`SelectedPattern` is currently still narrow:

```ts
interface SelectedPattern {
  patternId: string;
  role: string;
  parameters?: Record<string, unknown>;
}
```

Current truth:

- unresolved needs may survive pattern resolution and continue into synthesis-forward handling
- that is not a schema error by itself

## 4. Generic Source-Backed And Adapter-Owned Surfaces

Core carries a generic source-backed envelope:

```ts
interface FeatureAuthoringProposal {
  mode: "source-backed";
  profile: string;
  objectKind?: string;
  parameters: object;
  parameterSurface: object;
  proposalSource?: "llm" | "fallback" | "existing-feature";
  notes?: string[];
}

interface FeatureAuthoring {
  mode: "source-backed";
  profile: string;
  objectKind?: string;
  parameters: object;
  parameterSurface: object;
  sourceArtifactRef?: FeatureAuthoringSourceArtifactRef;
  notes?: string[];
}
```

Current boundary:

- profile-specific artifacts are adapter-owned, not core schema truth
- Dota2 artifacts such as `selection-pool.source.json`, `selection-grant-bindings.json`, and `dota2-provider-ability-export.json` do not belong in the core schema contract

Current update-preservation rule:

- local-only source-backed updates should preserve existing adapter-owned dependency sidecars unless the update explicitly rewires or removes them

## 5. Hard Boundaries

The current contract surface must preserve these boundaries:

1. `IntentSchema` is semantic truth, not host routing or write authority.
2. clarification authority stages planning/write blockers, but it is not the final commit gate.
3. `FinalBlueprint` owns structure and strategy, not file paths or generator routing.
4. `FeatureDependencyEdge` stays narrow; unresolved write-blocking context is handled elsewhere.
5. `AssemblyPlan` is the write-facing planning object, not the final workspace result.
6. adapter sidecars may refine host truth, but they must not leak back into core schema authority.

## Summary

The shipped schema surface is now broader than the old `IntentSchema -> Blueprint -> validate` story.

Current truthful reading order is:

1. Wizard-side semantics and clarification authority
2. blueprint-stage structure, dependency, and strategy truth
3. assembly-stage module records and unresolved-need continuation
4. adapter-owned source-backed artifacts and host-specific sidecars

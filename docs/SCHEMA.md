# SCHEMA

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-18
> Read when: aligning IntentSchema, FinalBlueprint, ModuleNeed, and AssemblyPlan contract boundaries
> Do not use for: execution priority or host realization policy by itself

## 目标

Rune Weaver 通过一组中间对象把自然语言稳定转成宿主代码输出。

当前接受的核心对象与 seam 是：

- `IntentSchema`
- `BlueprintProposal`
- `FinalBlueprint`
- `ModuleNeed`
- `UIDesignSpec`
- `ExtensionPoint`
- `ValidationIssue`
- `AssemblyPlan`

说明：

- 当前 baseline 接受 richer `IntentSchema` 与 deterministic `FinalBlueprint` 的方向
- 迁移策略应保持 `optional fields first`
- 旧的 `Blueprint` 说法在迁移期仍可能出现，但下游可信 seam 应收敛到 `FinalBlueprint`

## 1. IntentSchema

### 职责

`IntentSchema` 负责需求澄清。

它表达：

- 原始需求
- 当前目标
- typed semantic requirements
- optional sparse v2 facets
  - `interaction`
  - `targeting`
  - `timing`
  - `spatial`
  - `outcomes`
  - `contentModel`
  - `composition`
- state / flow / selection / effect / integration 语义
- derived-first `normalizedMechanics`
- acceptance invariants
- uncertainties
- scalar / module-safe parameters

不再属于 `IntentSchema` authority 的内容：

- `ready | weak | blocked`
- `requiredClarifications`
- `openQuestions`
- `isReadyForBlueprint`
- implementation candidates
- family / pattern / source-model proposal truth

### 推荐结构

```ts
export interface IntentSchema {
  version: string;
  host: HostDescriptor;
  request: UserRequestSummary;
  classification: IntentClassification;
  actors?: IntentActor[];
  requirements: IntentRequirements;
  constraints: IntentConstraints;
  interaction?: IntentInteractionContract;
  targeting?: IntentTargetingContract;
  timing?: IntentTimingContract;
  spatial?: IntentSpatialContract;
  stateModel?: IntentStateContract;
  flow?: IntentFlowContract;
  selection?: IntentSelectionContract;
  effects?: IntentEffectContract;
  outcomes?: IntentOutcomeContract;
  contentModel?: IntentContentModelContract;
  composition?: IntentCompositionContract;
  integrations?: IntentIntegrationContract;
  uiRequirements?: UIRequirementSummary;
  normalizedMechanics: NormalizedMechanics;
  acceptanceInvariants?: IntentInvariant[];
  uncertainties?: IntentUncertainty[];
  resolvedAssumptions: string[];
  parameters?: Record<string, unknown>;
  // deprecated compatibility-only legacy fields may still exist for one migration round
}

export interface WizardInterpretation {
  intentSchema: IntentSchema;
  clarificationPlan?: WizardClarificationPlan;
}

export interface WorkspaceFeatureHandle {
  featureId: string;
  featureName?: string;
  aliases: string[];
  intentKind: string;
  selectedPatterns: string[];
  sourceBacked: boolean;
  integrationPoints: string[];
  semanticHints: string[];
}

export interface WorkspaceSemanticContext {
  featureCount: number;
  features: WorkspaceFeatureHandle[];
}

export interface RelationCandidate {
  relation:
    | "reads"
    | "writes"
    | "triggers"
    | "grants"
    | "syncs-with"
    | "depends-on"
    | "extends"
    | "conflicts-with";
  targetFeatureId: string;
  featureName?: string;
  matchedAlias: string;
  confidence: "low" | "medium" | "high";
  score: number;
  reason: string;
}

export interface CurrentFeatureContext {
  featureId: string;
  revision: number;
  intentKind: string;
  selectedPatterns: string[];
  sourceBacked: boolean;
  sourceModel?: {
    ref?: FeatureAuthoringSourceArtifactRef;
    artifact?: Record<string, unknown>;
  };
  featureAuthoring?: FeatureAuthoring;
  admittedSkeleton: string[];
  preservedInvariants: string[];
  boundedFields: Record<string, unknown>;
}

export interface UpdateIntent {
  version: string;
  mode: "update";
  target: {
    featureId: string;
    revision: number;
    profile?: SourceBackedFeatureProfile;
    sourceBacked: boolean;
  };
  currentFeatureContext: CurrentFeatureContext;
  requestedChange: IntentSchema;
  delta: {
    preserve: UpdateDeltaItem[];
    add: UpdateDeltaItem[];
    modify: UpdateDeltaItem[];
    remove: UpdateDeltaItem[];
  };
  resolvedAssumptions: string[];
  // deprecated compatibility-only legacy fields may still exist for one migration round
}

export interface UpdateWizardInterpretation {
  requestedChange: IntentSchema;
  updateIntent: UpdateIntent;
  clarificationPlan?: WizardClarificationPlan;
}

export interface IntentActor {
  id: string;
  role: string;
  label: string;
}

export interface IntentRequirement {
  id: string;
  kind: "trigger" | "state" | "rule" | "effect" | "resource" | "ui" | "integration" | "generic";
  summary: string;
  actors?: string[];
  inputs?: string[];
  outputs?: string[];
  invariants?: string[];
  parameters?: Record<string, unknown>;
  priority?: "must" | "should" | "could";
}

export interface IntentRequirements {
  functional: string[];
  typed?: IntentRequirement[];
  interactions?: string[];
  dataNeeds?: string[];
  outputs?: string[];
}

export interface IntentConstraints {
  requiredPatterns?: string[];
  forbiddenPatterns?: string[];
  hostConstraints?: string[];
  nonFunctional?: string[];
}

export interface IntentInteractionContract {
  activations?: Array<{
    actor?: string;
    kind: "key" | "mouse" | "event" | "passive" | "system";
    input?: string;
    phase?: "press" | "release" | "hold" | "enter" | "occur";
    repeatability?: "one-shot" | "repeatable" | "toggle" | "persistent";
    confirmation?: "none" | "implicit" | "explicit";
  }>;
}

export interface IntentTargetingContract {
  subject?: "self" | "ally" | "enemy" | "unit" | "point" | "area" | "direction" | "global";
  selector?: "cursor" | "current-target" | "nearest" | "random" | "none";
  teamScope?: "self" | "ally" | "enemy" | "any";
}

export interface IntentTimingContract {
  cooldownSeconds?: number;
  delaySeconds?: number;
  intervalSeconds?: number;
  duration?: {
    kind: "instant" | "timed" | "persistent";
    seconds?: number;
  };
}

export interface IntentSpatialContract {
  motion?: {
    kind: "dash" | "teleport" | "knockback" | "none";
    distance?: number;
    direction?: "cursor" | "facing" | "target" | "fixed";
  };
  area?: {
    shape: "circle" | "line" | "cone";
    radius?: number;
    length?: number;
    width?: number;
  };
  emission?: {
    kind: "projectile" | "pulse" | "wave" | "none";
    speed?: number;
    count?: number;
  };
}

export interface IntentStateContract {
  states: Array<{
    id: string;
    summary: string;
    owner?: "feature" | "session" | "external";
    lifetime?: "ephemeral" | "session" | "persistent";
    kind?: "scalar" | "counter" | "collection" | "inventory" | "selection-session" | "generic";
  }>;
}

export interface IntentFlowContract {
  triggerSummary?: string;
  sequence?: string[];
  supportsCancel?: boolean;
  supportsRetry?: boolean;
  requiresConfirmation?: boolean;
}

export interface IntentSelectionContract {
  mode?: "deterministic" | "weighted" | "filtered" | "user-chosen" | "hybrid";
  source?: "none" | "candidate-collection" | "weighted-pool" | "filtered-pool";
  choiceMode?: "none" | "user-chosen" | "random" | "weighted" | "hybrid";
  cardinality?: "single" | "multiple";
  choiceCount?: number;
  repeatability?: "one-shot" | "repeatable" | "persistent";
  duplicatePolicy?: "allow" | "avoid" | "forbid";
  commitment?: "immediate" | "confirm" | "deferred";
  inventory?: {
    enabled: boolean;
    capacity?: number;
    storeSelectedItems?: boolean;
    blockDrawWhenFull?: boolean;
    fullMessage?: string;
    presentation?: "persistent_panel";
  };
}

export interface IntentEffectContract {
  operations: Array<"apply" | "remove" | "stack" | "expire" | "consume" | "restore">;
  targets?: string[];
  durationSemantics?: "instant" | "timed" | "persistent";
}

export interface IntentOutcomeContract {
  operations?: Array<
    "apply-effect" | "move" | "spawn" | "grant-feature" | "update-state" | "consume-resource" | "emit-event"
  >;
}

export interface IntentIntegrationContract {
  expectedBindings: Array<{
    id: string;
    kind: "entry-point" | "event-hook" | "bridge-point" | "ui-surface" | "data-source";
    summary: string;
    required?: boolean;
  }>;
}

export interface IntentContentModelContract {
  collections?: Array<{
    id: string;
    role: "candidate-options" | "spawnables" | "progress-items" | "generic";
    ownership?: "feature" | "shared" | "external";
    updateMode?: "replace" | "merge" | "append";
    itemSchema?: Array<{
      name: string;
      type: "string" | "number" | "boolean" | "enum" | "effect-ref" | "object-ref";
      required?: boolean;
      semanticRole?: string;
    }>;
  }>;
}

export interface IntentCompositionContract {
  dependencies?: Array<{
    kind: "same-feature" | "cross-feature" | "external-system";
    relation: "reads" | "writes" | "triggers" | "grants" | "syncs-with";
    target?: string;
    required?: boolean;
  }>;
}

export interface NormalizedMechanics {
  trigger?: boolean;
  candidatePool?: boolean;
  weightedSelection?: boolean;
  playerChoice?: boolean;
  uiModal?: boolean;
  outcomeApplication?: boolean;
  resourceConsumption?: boolean;
}

export interface IntentInvariant {
  id: string;
  summary: string;
  severity: "error" | "warning";
}

export interface IntentUncertainty {
  id: string;
  summary: string;
  affects: Array<"intent" | "blueprint" | "pattern" | "realization">;
  severity: "low" | "medium" | "high";
}

export interface WizardClarificationQuestion {
  id: string;
  question: string;
  targetPaths?: string[];
  reason: string;
}

export interface WizardClarificationPlan {
  questions: WizardClarificationQuestion[];
  maxQuestions: number;
  requiredForFaithfulInterpretation: boolean;
  targetPaths: string[];
  reason: string;
}

export interface RequiredClarification {
  id: string;
  question: string;
  blocksFinalization: boolean;
}
```

兼容规则：

- `readiness / requiredClarifications / openQuestions / isReadyForBlueprint` 仍可保留一轮迁移兼容层，但它们不再是 authoritative schema contract
- richer typed sections 应先作为 optional fields 加入
- `blocked` 只属于 Blueprint / legality / adapter authority 层，不属于 Wizard / `IntentSchema`
- 上面新增的 v2 facet 全部是 sparse optional surface；简单被动或简单主动技能可以完全不出现大部分 facet

当前 code-truth 补充：

- `IntentSchema` 是唯一语义信源；它不承载 family / pattern / source-model proposal authority
- Wizard 必须始终 best-effort 产出一份 `IntentSchema`；即使当前下游做不到，也不能因为 legality 不足而拒绝建模
- `clarificationPlan` 是 Wizard sidecar；它决定是否需要追问 1-3 个结构性问题，但不回写 `IntentSchema` authority
- create/update 在 Wizard 之后可读取 derived `WorkspaceSemanticContext`，并输出 `RelationCandidate[]` sidecar 做 feature grounding；这些 sidecar 不回写 `IntentSchema`
- `update` 不再复用 create-style `IntentSchema` 入口；它读取 workspace-backed `CurrentFeatureContext`，再产出 `requestedChange: IntentSchema` + `UpdateIntent`
- `UpdateIntent` 是 update-only delta contract；它是 review-visible artifact，不在本轮持久化进 workspace history
- `CurrentFeatureContext` 与 `UpdateIntent` 当前都保持 generic contract：`boundedFields` 是可比较的 bounded snapshot，不是 family hint bag
- source-backed merge / family-specific authoring compile 必须发生在 generic update blueprint 之后的适配层，而不是回流进 Wizard / `UpdateIntent` / core builder authority
- `normalizedMechanics` 当前是 derived-first summary，优先从 `interaction / targeting / timing / spatial / selection / outcomes / contentModel / composition` 推导，旧字段只作为回退输入
- `parameters` 只保留 prompt-extracted scalar / module-safe 字段
- source refs、source artifact payload、planner-local authoring writeback hints 不应进入 `parameters`
- source-backed authoring candidate 不应再通过 `parameters` 携带
- create-time LLM 不读取完整 workspace authority；relation grounding 只发生在 Wizard 之后的 `WorkspaceSemanticContext + RelationCandidate[]` sidecar
- core builder 当前只消费 `IntentSchema` / `UpdateIntent`；source-backed authoring synthesis、module-parameter compile、fill contract activation 属于 adapter enrichment
- `buildUpdateBlueprint(UpdateIntent)` 是当前 accepted direct update-aware blueprint path；update semantics 不应再伪装成完整 create schema
- `selection.inventory` 本轮保留，但只作为 compatibility-only surface，不应继续扩张为新的语义主干
- `contentModel` 是语义证据，不等于 `sourceModel`
- Blueprint / FinalBlueprint 决定是否存在 Rune Weaver-owned source-backed artifact；Wizard 只负责把 content collection 语义表达出来
- create / update 可以额外导出演示用 `intent-schema*.json` / `update-intent.json` 快照，但这些 JSON 只属于 review/demo artifact，不进入 workspace authority
- core 当前已落地的 source-backed envelope 是 generic contract；具体 profile payload 与 legality 由 adapter 自己定义和校验：

```ts
export interface FeatureAuthoringProposal<
  Parameters extends object = object,
  Surface extends object = SourceBackedParameterSurface,
> {
  mode: "source-backed";
  profile: string;
  objectKind?: string;
  parameters: Parameters;
  parameterSurface: Surface;
  proposalSource?: "llm" | "fallback" | "existing-feature";
  notes?: string[];
}

export interface FeatureAuthoring<
  Parameters extends object = object,
  Surface extends object = SourceBackedParameterSurface,
> {
  mode: "source-backed";
  profile: string;
  objectKind?: string;
  parameters: Parameters;
  parameterSurface: Surface;
  sourceArtifactRef?: FeatureAuthoringSourceArtifactRef;
  notes?: string[];
}
```

补充说明：

- `FeatureAuthoringProposal.objectKind` / `FeatureAuthoring.objectKind` 若出现，只表示 metadata / example hint，不再是 authority-bearing field
- `selection_pool` 当前只是 Dota2 adapter registry 下的一个 profile implementation；它不再是 Wizard / core builder / planning 的 authority
- 某些 legacy selection-pool-specific type aliases 目前仍与 core schema type file 共存，但它们不应被视为 core authority surface；当前 authoritative seam 是 generic envelope + adapter-owned profile contract

## 2. Blueprint / FinalBlueprint

### 职责

`Blueprint` 阶段负责结构化编排设计。

当前接受的边界是：

- `BlueprintProposal`
  - 候选结构与不确定性表达
- `BlueprintNormalizer`
  - legality / canonicalization / policy gate
- generic `FinalBlueprint`
  - downstream 可确定性消费的最小骨架
- adapter enrichment
  - host/adapter-local source-backed proposal synthesis, authoring normalization, module-parameter compile, fill-contract activation, and adapter-local blockers/warnings

最终供下游消费的 enriched `FinalBlueprint` 不是宿主代码，它只描述：

- 模块
- 连接
- `ModuleNeed`
- 假设
- 验证要求
- normalized status

### 推荐结构

```ts
export type NormalizedBlueprintStatus = "ready" | "weak" | "blocked";

export interface FinalBlueprint {
  id: string;
  version: string;
  summary: string;
  status: NormalizedBlueprintStatus;
  sourceIntent: {
    goal: string;
    intentKind: IntentSchema["classification"]["intentKind"];
    normalizedMechanics: NormalizedMechanics;
  };
  modules: BlueprintModule[];
  connections: BlueprintConnection[];
  patternHints: PatternHint[];
  moduleNeeds: ModuleNeed[];
  assumptions: string[];
  validations: ValidationContract[];
  readyForAssembly: boolean;
  uiDesignSpec?: UIDesignSpec;
  featureAuthoring?: FeatureAuthoring;
  fillContracts?: FillContract[];
}

export interface BlueprintModule {
  id: string;
  role: string;
  category:
    | "trigger"
    | "data"
    | "rule"
    | "effect"
    | "ui"
    | "resource"
    | "integration";
  responsibilities: string[];
  inputs?: string[];
  outputs?: string[];
  parameters?: Record<string, unknown>;
}

export interface ModuleNeed {
  moduleId: string;
  semanticRole: string;
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

export interface BlueprintConnection {
  from: string;
  to: string;
  purpose: string;
}

export interface FillContract {
  boundaryId: string;
  targetModuleId: string;
  targetPatternId: string;
  mode: "closed";
  sourceBindings: string[];
  allowed: string[];
  forbidden: string[];
  invariants: string[];
  expectedOutput: string;
  fallbackPolicy: "deterministic-default";
}

export interface ValidationContract {
  scope: "schema" | "blueprint" | "assembly" | "host";
  rule: string;
  severity: "error" | "warning";
}
```

边界说明：

- `BlueprintProposal` 不是 downstream trust seam
- `BlueprintProposal` 不能把 source-backed family proposal 偷塞回 `IntentSchema` authority
- `FinalBlueprint` 不得携带 host realization family、generator family、write targets
- `FinalBlueprint.featureAuthoring` 是当前 source-backed authoring truth；不要再把它镜像回 planner-side `parameters`
- `FinalBlueprint.fillContracts` 是当前 Gap Fill closed-boundary authority；它绑定 boundary / owner module / owner pattern / sourceBindings / fallbackPolicy
- create/update relation grounding 只作为 Wizard 之后的 sidecar 证据输入，不替代 `FinalBlueprint` authority
- `ModuleNeed` 是 pattern-facing seam，不是 final pattern selection
- `explicitPatternHints` 只能作为下游 tie-break 输入，不能越级变成主路由
- `requiredCapabilities` / `optionalCapabilities` 应承载可复用机制 token，而不是 case 名、feature 名、catalog 名或业务故事
- 当前真实 capability 例子只承认 `timing.cooldown.local`
- 业务对象、catalog、feature-owned source data 与 host 决策不应直接塞进 `ModuleNeed`
- 如果一个 feature 需要 Rune Weaver-owned source-backed artifact，决定“该 artifact 是否存在、属于哪个 feature、拥有哪个 path / ownership 边界”的 authority 属于 `FinalBlueprint` skeleton，而不属于 `GapFill`
- 一旦该 artifact 的存在与 owned scope 已被上游固定，artifact 内的 object-data / config content 属于受控实现填充，可由 `GapFill` 在已分配 scope 内完成

## 3. UIDesignSpec

### 职责

`UIDesignSpec` 负责表达 UI 呈现方式，不承载业务规则本身。

它适合承载：

- 布局
- 信息密度
- 风格关键词
- 反馈方式

它不适合承载：

- 规则逻辑
- 数据抽取逻辑
- 结果应用逻辑

### 推荐结构

```ts
export interface UIDesignSpec {
  surfaces: UISurfaceSpec[];
  visualStyle?: UIVisualStyle;
  copyHints?: string[];
  feedbackHints?: string[];
}

export interface UISurfaceSpec {
  id: string;
  type: "modal" | "hud" | "hint" | "panel" | "overlay";
  purpose: string;
  inputs?: string[];
  outputs?: string[];
  layoutHints?: string[];
  interactionMode?: "blocking" | "lightweight" | "persistent";
}

export interface UIVisualStyle {
  tone?: string;
  density?: "low" | "medium" | "high";
  themeKeywords?: string[];
}
```

## 4. ExtensionPoint

### 职责

`ExtensionPoint` 用于承接暂时无法仅靠 schema + pattern 参数化表达的局部缺口。

当前它是受控扩展点，不是任意代码注入。

优先级规则：

- 能表达为 `ModuleNeed.boundedVariability -> FillSlot` 的，不应回退成新的架构 seam
- 已经属于既定 skeleton 之内、且只是实现肌肉/对象内容填充的问题，应优先视作 `GapFill` 或 artifact-local fill，而不是新的 module / pattern / host seam
- `ExtensionPoint` 不能承担模块结构、pattern 选择、host realization、write path 决策

### 推荐结构

```ts
export interface ExtensionPoint {
  id: string;
  purpose: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  constraints: string[];
}
```

## 5. ValidationIssue

### 职责

统一表达 schema、blueprint、assembly、host 各阶段的验证问题。

### 推荐结构

```ts
export interface ValidationIssue {
  code: string;
  scope: "schema" | "blueprint" | "assembly" | "host";
  severity: "error" | "warning";
  message: string;
  path?: string;
}
```

## 6. AssemblyPlan

### 职责

`AssemblyPlan` 是写入前最后一层结构化计划。

它回答：

- 选中了哪些 pattern
- 需要哪些代码产物
- 需要哪些 bridge updates
- 是否 ready for host write

### 推荐结构

```ts
export interface AssemblyPlan {
  blueprintId: string;
  selectedPatterns: SelectedPattern[];
  modules?: AssemblyModule[];
  writeTargets: WriteTarget[];
  bridgeUpdates?: BridgeUpdate[];
  validations: ValidationContract[];
  readyForHostWrite: boolean;
}

export interface SelectedPattern {
  patternId: string;
  role: string;
  parameters?: Record<string, unknown>;
}

export interface AssemblyModule {
  id: string;
  role: "gameplay-core" | "ui-surface" | "shared-support" | "bridge-support";
  selectedPatterns: string[];
  outputKinds: ("server" | "shared" | "ui" | "bridge")[];
  realizationHints?: {
    kvCapable?: boolean;
    runtimeHeavy?: boolean;
    uiRequired?: boolean;
  };
}

export interface WriteTarget {
  target: "server" | "shared" | "ui" | "config";
  path: string;
  summary: string;
}

export interface BridgeUpdate {
  target: "server" | "ui";
  file: string;
  action: "create" | "refresh" | "inject_once";
}

export interface ValidationContract {
  code: string;
  severity: "error" | "warning";
  message: string;
}
```

`AssemblyPlan.modules[].selectedPatterns` 应被视为已经解析完成的 core pattern subset。

它必须保持：

- resolved
- core-pattern based
- 全局 `AssemblyPlan.selectedPatterns` 的子集

它不应用于：

- unresolved hints
- raw mechanic keywords
- host realization classes
- host-specific pseudo-patterns

## 7. 关键边界

当前必须守住：

- `IntentSchema` 不是 `FinalBlueprint`
- `BlueprintProposal` 不是 `FinalBlueprint`
- `FinalBlueprint` 不是宿主代码
- `FinalBlueprint` 不决定 host / generator / write authority
- `ModuleNeed` 不是 pattern resolution result
- `ModuleNeed` 不是 feature-owned source data 或 source-backed artifact content 的存放点
- `UIDesignSpec` 不是业务规则
- `ExtensionPoint` 不是任意代码注入
- `GapFill` 可以填实现肌肉，但不能发明 skeleton
- `AssemblyPlan` 不是最终落盘结果

## 8. 当前结论

Rune Weaver 的核心，不是让模型直接写宿主代码，而是让模型和规则系统稳定地产出这些中间层对象，再由 Pattern / Host / Generator / Write 阶段受控落地。

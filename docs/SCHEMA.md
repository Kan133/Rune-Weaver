# SCHEMA

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-17
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
- 归一化 mechanics
- typed semantic requirements
- state / flow / selection / effect / integration 语义
- acceptance invariants
- uncertainties / required clarifications
- readiness 与迁移兼容字段

### 推荐结构

```ts
export type IntentReadiness = "ready" | "weak" | "blocked";

export interface IntentSchema {
  request: {
    rawPrompt: string;
    goal: string;
  };
  classification: {
    intentKind:
      | "micro-feature"
      | "standalone-system"
      | "cross-system-composition"
      | "ui-surface"
      | "unknown";
    confidence: "low" | "medium" | "high";
  };
  readiness?: IntentReadiness;
  normalizedMechanics: string[];
  actors?: IntentActor[];
  requirements: {
    functional: string[];
    typed?: IntentRequirement[];
    nonFunctional?: string[];
  };
  stateModel?: IntentStateContract;
  flow?: IntentFlowContract;
  selection?: IntentSelectionContract;
  effects?: IntentEffectContract;
  integrations?: IntentIntegrationContract;
  uiRequirements?: {
    needed: boolean;
    surfaces?: string[];
    styleHints?: string[];
  };
  constraints?: string[];
  acceptanceInvariants?: IntentInvariant[];
  uncertainties?: IntentUncertainty[];
  requiredClarifications?: RequiredClarification[];
  resolvedAssumptions: string[];
  openQuestions: string[];
  isReadyForBlueprint: boolean;
  parameters?: Record<string, unknown>;
  featureAuthoringProposal?: FeatureAuthoringProposal;
  fillIntentCandidates?: FillIntentCandidate[];
}

export interface IntentActor {
  id: string;
  role: string;
  label: string;
}

export interface IntentRequirement {
  id: string;
  kind: "trigger" | "state" | "rule" | "effect" | "resource" | "ui" | "integration";
  summary: string;
  actors?: string[];
  inputs?: string[];
  outputs?: string[];
  invariants?: string[];
  parameters?: Record<string, unknown>;
  priority?: "must" | "should" | "could";
}

export interface IntentStateContract {
  states: Array<{
    id: string;
    summary: string;
    owner?: "feature" | "session" | "external";
    lifetime?: "ephemeral" | "session" | "persistent";
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
  cardinality?: "single" | "multiple";
  repeatability?: "one-shot" | "repeatable" | "persistent";
}

export interface IntentEffectContract {
  operations: Array<"apply" | "remove" | "stack" | "expire" | "consume" | "restore">;
  targets?: string[];
}

export interface IntentIntegrationContract {
  expectedBindings: Array<{
    id: string;
    kind: "entry-point" | "event-hook" | "bridge-point" | "ui-surface" | "data-source";
    summary: string;
    required?: boolean;
  }>;
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

export interface RequiredClarification {
  id: string;
  question: string;
  blocksFinalization: boolean;
}
```

兼容规则：

- `isReadyForBlueprint` 仍可保留为迁移兼容层
- richer typed sections 应先作为 optional fields 加入
- `blocked` 不能被伪装成“继续生成再说”

当前 code-truth 补充：

- `parameters` 只保留 prompt-extracted scalar / module-safe 字段
- source refs、source artifact payload、planner-local authoring writeback hints 不应进入 `parameters`
- source-backed authoring candidate 不应再通过 `parameters` 携带
- 当前已落地的 typed proposal surface 是：

```ts
export interface FeatureAuthoringProposal {
  mode: "source-backed";
  profile: "selection_pool";
  objectKind: "talent" | "equipment" | "skill_card_placeholder";
  parameters: SelectionPoolFeatureAuthoringParameters;
  parameterSurface: SelectionPoolParameterSurface;
  proposalSource?: "llm" | "fallback" | "existing-feature";
  notes?: string[];
}

export interface FillIntentCandidate {
  boundaryId: string;
  summary: string;
  source: "llm" | "fallback" | "existing-feature" | "deterministic";
}
```

## 2. Blueprint / FinalBlueprint

### 职责

`Blueprint` 阶段负责结构化编排设计。

当前接受的边界是：

- `BlueprintProposal`
  - 候选结构与不确定性表达
- `BlueprintNormalizer`
  - legality / canonicalization / policy gate
- `FinalBlueprint`
  - downstream 可确定性消费的最小骨架

`FinalBlueprint` 不是宿主代码，它只描述：

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
  summary: string;
  status: NormalizedBlueprintStatus;
  sourceIntent: {
    goal: string;
    intentKind: IntentSchema["classification"]["intentKind"];
    normalizedMechanics: string[];
  };
  modules: FinalBlueprintModule[];
  connections: BlueprintConnection[];
  moduleNeeds: ModuleNeed[];
  assumptions: string[];
  validations: ValidationIssue[];
  uiDesignSpec?: UIDesignSpec;
  featureAuthoring?: FeatureAuthoring;
  fillContracts?: FillContract[];
}

export interface FinalBlueprintModule {
  id: string;
  category:
    | "trigger"
    | "data"
    | "rule"
    | "effect"
    | "resource"
    | "ui"
    | "integration";
  purpose: string;
  inputs?: string[];
  outputs?: string[];
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
```

边界说明：

- `BlueprintProposal` 不是 downstream trust seam
- `BlueprintProposal` 可以携带 candidate-only `featureAuthoringProposal` / `fillIntentCandidates`，但这些仍需经过 deterministic normalization
- `FinalBlueprint` 不得携带 host realization family、generator family、write targets
- `FinalBlueprint.featureAuthoring` 是当前 source-backed authoring truth；不要再把它镜像回 planner-side `parameters`
- `FinalBlueprint.fillContracts` 是当前 Gap Fill closed-boundary authority；它绑定 boundary / owner module / owner pattern / sourceBindings / fallbackPolicy
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

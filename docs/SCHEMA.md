# SCHEMA

## 目标

Rune Weaver 当前通过一组中间对象把自然语言稳定转成宿主代码输出。

当前核心对象是：

- `IntentSchema`
- `Blueprint`
- `UIDesignSpec`
- `ExtensionPoint`
- `ValidationIssue`
- `AssemblyPlan`

## 1. IntentSchema

### 职责

`IntentSchema` 负责需求澄清。

它表达：

- 原始需求
- 当前目标
- 归一化 mechanics
- 功能与约束
- 未解决问题
- 是否 ready for blueprint

### 推荐结构

```ts
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
  normalizedMechanics: string[];
  requirements: {
    functional: string[];
    nonFunctional?: string[];
  };
  uiRequirements?: {
    needed: boolean;
    surfaces?: string[];
    styleHints?: string[];
  };
  constraints?: string[];
  resolvedAssumptions: string[];
  openQuestions: string[];
  isReadyForBlueprint: boolean;
}
```

## 2. Blueprint

### 职责

`Blueprint` 负责结构化编排设计。

它不是宿主代码，而是描述：

- 模块
- 连接
- pattern hints
- 假设
- 验证要求

### 推荐结构

```ts
export interface Blueprint {
  id: string;
  summary: string;
  sourceIntent: {
    goal: string;
    intentKind: IntentSchema["classification"]["intentKind"];
    normalizedMechanics: string[];
  };
  modules: BlueprintModule[];
  connections: BlueprintConnection[];
  patternHints: string[];
  assumptions: string[];
  validations: ValidationIssue[];
  uiDesignSpec?: UIDesignSpec;
  readyForAssembly: boolean;
}

export interface BlueprintModule {
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

export interface BlueprintConnection {
  from: string;
  to: string;
  purpose: string;
}
```

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

## 7. 关键边界

当前必须守住：

- `IntentSchema` 不是 `Blueprint`
- `Blueprint` 不是宿主代码
- `UIDesignSpec` 不是业务规则
- `ExtensionPoint` 不是任意代码注入
- `AssemblyPlan` 不是最终落盘结果

## 8. 当前结论

Rune Weaver 现在的核心，不是让模型直接写宿主代码，而是让模型和规则系统稳定地产出这些中间层对象，再由 adapter 和 write 阶段受控落地。

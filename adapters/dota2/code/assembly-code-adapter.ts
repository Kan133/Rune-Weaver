/**
 * T071-T073: AssemblyPlan -> Server/Shared Generator Integration
 *
 * 将 AssemblyPlan 中的 server/shared 相关 pattern 转换为可审查的代码生成产物
 * 不直接写入宿主文件，只生成结构化 review artifacts
 */

import { AssemblyPlan, Blueprint, SelectedPattern } from "../../../core/schema/types.js";

/**
 * Server/Shared 代码生成结果
 */
export interface AssemblyGeneratedCodeFile {
  /** 文件路径 (相对宿主根目录) */
  filePath: string;
  /** 文件内容 */
  content: string;
  /** 文件类型 */
  fileType: "typescript" | "json";
  /** 行数统计 */
  lineCount: number;
  /** 来源 pattern */
  sourcePatternId: string;
  /** 生成的符号名 (类名/函数名) */
  generatedSymbol: string;
}

/**
 * 未解析的 server/shared 项目
 */
export interface UnresolvedCodeItem {
  /** pattern ID */
  patternId: string;
  /** 原因 */
  reason: string;
  /** 建议替代方案 */
  suggestedAlternative?: string;
}

/**
 * Server/Shared 生成结果
 */
export interface AssemblyCodeResult {
  /** 生成的 server 文件 */
  serverFiles: AssemblyGeneratedCodeFile[];
  /** 生成的 shared 文件 */
  sharedFiles: AssemblyGeneratedCodeFile[];
  /** 未解析项目 */
  unresolvedItems: UnresolvedCodeItem[];
  /** 生成的符号列表 */
  generatedSymbols: string[];
}

/**
 * Readiness Gate 定义
 */
export interface CodeReadinessGate {
  /** Gate 名称 */
  name: string;
  /** 是否通过 */
  passed: boolean;
  /** 严重程度 */
  severity: "error" | "warning";
  /** 描述信息 */
  message: string;
}

/**
 * Server/Shared Assembly Review Artifact
 */
export interface CodeAssemblyReviewArtifact {
  /** 版本 */
  version: string;
  /** Blueprint ID */
  blueprintId: string;
  /** Assembly 摘要 */
  assemblySummary: {
    id: string;
    patternCount: number;
    serverPatternCount: number;
    sharedPatternCount: number;
  };
  /** 选中的非 UI patterns */
  selectedNonUiPatterns: {
    patternId: string;
    role: string;
    supported: boolean;
  }[];
  /** 生成的文件摘要 */
  generatedFilesSummary: {
    fileName: string;
    fileType: "typescript" | "json";
    lineCount: number;
    patternId: string;
    generatedSymbol: string;
    target: "server" | "shared";
  }[];
  /** 未解析项目 */
  unresolvedItems: UnresolvedCodeItem[];
  /** 是否准备好写入集成 */
  readyForWriteIntegration: boolean;
  /** Readiness gates */
  readinessGates: CodeReadinessGate[];
  /** 生成时间 */
  generatedAt: string;
}

/**
 * 支持的 server/shared pattern 列表
 */
const SUPPORTED_CODE_PATTERNS = [
  "input.key_binding",
  "effect.dash",
  "resource.basic_pool",
  "data.weighted_pool",
  "rule.selection_flow",
];

/**
 * 识别 AssemblyPlan 中的 server/shared patterns
 */
export function recognizeCodePatterns(assemblyPlan: AssemblyPlan): {
  serverPatterns: SelectedPattern[];
  sharedPatterns: SelectedPattern[];
  unsupportedPatterns: SelectedPattern[];
} {
  const serverPatterns: SelectedPattern[] = [];
  const sharedPatterns: SelectedPattern[] = [];
  const unsupportedPatterns: SelectedPattern[] = [];

  for (const pattern of assemblyPlan.selectedPatterns) {
    // 跳过 UI patterns
    if (pattern.patternId.startsWith("ui.")) {
      continue;
    }

    if (SUPPORTED_CODE_PATTERNS.includes(pattern.patternId)) {
      // 根据 pattern 类型决定 target
      if (pattern.patternId.startsWith("data.")) {
        // data patterns 同时生成到 server 和 shared
        sharedPatterns.push(pattern);
        serverPatterns.push(pattern);
      } else if (pattern.patternId.startsWith("rule.")) {
        // rule patterns 主要生成到 server，但可能需要 shared 类型
        serverPatterns.push(pattern);
      } else {
        // input, effect, resource 生成到 server
        serverPatterns.push(pattern);
      }
    } else {
      unsupportedPatterns.push(pattern);
    }
  }

  return { serverPatterns, sharedPatterns, unsupportedPatterns };
}

/**
 * 检查 pattern 是否受支持
 */
function isSupportedCodePattern(patternId: string): boolean {
  return SUPPORTED_CODE_PATTERNS.includes(patternId);
}

/**
 * 获取建议的替代方案
 */
function getSuggestedAlternative(patternId: string): string | undefined {
  const alternatives: Record<string, string> = {
    "effect.blink": "Use effect.dash with custom parameters",
    "resource.mana_pool": "Use resource.basic_pool with mana configuration",
    "input.mouse_click": "Use input.key_binding with mouse key mapping",
  };
  return alternatives[patternId];
}

/**
 * 生成 Server 代码文件
 */
function generateServerFile(
  pattern: SelectedPattern,
  featureId: string,
  blueprintId: string
): AssemblyGeneratedCodeFile {
  const className = toPascalCase(featureId) + toPascalCase(pattern.patternId.split(".")[1]);
  const fileName = `${featureId}_${pattern.patternId.replace(".", "_")}.ts`;

  let content = "";

  switch (pattern.patternId) {
    case "input.key_binding":
      content = generateKeyBindingServerCode(className, featureId, pattern);
      break;
    case "effect.dash":
      content = generateDashServerCode(className, featureId, pattern);
      break;
    case "resource.basic_pool":
      content = generateResourcePoolServerCode(className, featureId, pattern);
      break;
    case "data.weighted_pool":
      content = generateWeightedPoolServerCode(className, featureId, pattern);
      break;
    case "rule.selection_flow":
      content = generateSelectionFlowServerCode(className, featureId, pattern);
      break;
    default:
      content = generateDefaultServerCode(className, featureId, pattern);
  }

  return {
    filePath: `game/scripts/src/rune_weaver/generated/server/${fileName}`,
    content,
    fileType: "typescript",
    lineCount: content.split("\n").length,
    sourcePatternId: pattern.patternId,
    generatedSymbol: className,
  };
}

/**
 * 生成 Shared 代码文件
 */
function generateSharedFile(
  pattern: SelectedPattern,
  featureId: string,
  blueprintId: string
): AssemblyGeneratedCodeFile {
  const className = toPascalCase(featureId) + toPascalCase(pattern.patternId.split(".")[1]);
  const fileName = `${featureId}_${pattern.patternId.replace(".", "_")}.ts`;

  let content = "";

  switch (pattern.patternId) {
    case "data.weighted_pool":
      content = generateWeightedPoolSharedCode(className, featureId, pattern);
      break;
    case "rule.selection_flow":
      content = generateSelectionFlowSharedCode(className, featureId, pattern);
      break;
    default:
      content = generateDefaultSharedCode(className, featureId, pattern);
  }

  return {
    filePath: `game/scripts/src/rune_weaver/generated/shared/${fileName}`,
    content,
    fileType: "typescript",
    lineCount: content.split("\n").length,
    sourcePatternId: pattern.patternId,
    generatedSymbol: className,
  };
}

/**
 * 从 AssemblyPlan 生成 Server/Shared 代码
 */
export function generateCodeFromAssembly(
  assemblyPlan: AssemblyPlan,
  blueprint: Blueprint | null,
  featureId: string
): AssemblyCodeResult {
  const { serverPatterns, sharedPatterns, unsupportedPatterns } = recognizeCodePatterns(assemblyPlan);

  const serverFiles: AssemblyGeneratedCodeFile[] = [];
  const sharedFiles: AssemblyGeneratedCodeFile[] = [];
  const unresolvedItems: UnresolvedCodeItem[] = [];
  const generatedSymbols: string[] = [];

  // 生成 server 文件
  for (const pattern of serverPatterns) {
    try {
      const file = generateServerFile(pattern, featureId, assemblyPlan.blueprintId);
      serverFiles.push(file);
      generatedSymbols.push(file.generatedSymbol);
    } catch (error) {
      unresolvedItems.push({
        patternId: pattern.patternId,
        reason: `Failed to generate server code: ${error}`,
        suggestedAlternative: getSuggestedAlternative(pattern.patternId),
      });
    }
  }

  // 生成 shared 文件
  for (const pattern of sharedPatterns) {
    try {
      const file = generateSharedFile(pattern, featureId, assemblyPlan.blueprintId);
      sharedFiles.push(file);
      if (!generatedSymbols.includes(file.generatedSymbol)) {
        generatedSymbols.push(file.generatedSymbol);
      }
    } catch (error) {
      unresolvedItems.push({
        patternId: pattern.patternId,
        reason: `Failed to generate shared code: ${error}`,
        suggestedAlternative: getSuggestedAlternative(pattern.patternId),
      });
    }
  }

  // 添加不支持的 patterns 到 unresolved
  for (const pattern of unsupportedPatterns) {
    unresolvedItems.push({
      patternId: pattern.patternId,
      reason: `Unsupported code pattern: ${pattern.patternId}`,
      suggestedAlternative: getSuggestedAlternative(pattern.patternId),
    });
  }

  return {
    serverFiles,
    sharedFiles,
    unresolvedItems,
    generatedSymbols,
  };
}

/**
 * 评估 readiness gates
 */
function evaluateReadinessGates(
  recognition: ReturnType<typeof recognizeCodePatterns>,
  result: AssemblyCodeResult
): CodeReadinessGate[] {
  const gates: CodeReadinessGate[] = [];

  // Gate 1: 所有 code patterns 都受支持
  const allPatternsSupported = recognition.unsupportedPatterns.length === 0;
  gates.push({
    name: "ALL_CODE_PATTERNS_SUPPORTED",
    passed: allPatternsSupported,
    severity: "error",
    message: allPatternsSupported
      ? "All code patterns are supported"
      : `${recognition.unsupportedPatterns.length} code patterns are not supported`,
  });

  // Gate 2: 至少生成了一个 server 或 shared 文件
  const hasGeneratedFiles = result.serverFiles.length > 0 || result.sharedFiles.length > 0;
  gates.push({
    name: "CODE_GENERATION_SUCCESS",
    passed: hasGeneratedFiles,
    severity: "error",
    message: hasGeneratedFiles
      ? `${result.serverFiles.length} server files, ${result.sharedFiles.length} shared files generated`
      : "No code files were generated",
  });

  // Gate 3: 无阻塞级别的 unresolved items
  const hasBlockingUnresolved = result.unresolvedItems.some((item) =>
    isSupportedCodePattern(item.patternId)
  );
  gates.push({
    name: "NO_BLOCKING_UNRESOLVED",
    passed: !hasBlockingUnresolved,
    severity: "error",
    message: hasBlockingUnresolved
      ? "Some supported patterns failed to generate"
      : "No blocking unresolved items",
  });

  // Gate 4: 文件名不冲突 (检查唯一性)
  const allFilePaths = [
    ...result.serverFiles.map((f) => f.filePath),
    ...result.sharedFiles.map((f) => f.filePath),
  ];
  const uniquePaths = new Set(allFilePaths);
  const noFileConflicts = uniquePaths.size === allFilePaths.length;
  gates.push({
    name: "NO_FILE_CONFLICTS",
    passed: noFileConflicts,
    severity: "error",
    message: noFileConflicts
      ? "All file paths are unique"
      : "File path conflicts detected",
  });

  // Gate 5: Bridge / write target 语义不矛盾 (warning)
  const hasConsistentTargets = true; // TODO: 实现更复杂的检查
  gates.push({
    name: "CONSISTENT_WRITE_TARGETS",
    passed: hasConsistentTargets,
    severity: "warning",
    message: hasConsistentTargets
      ? "Write targets are consistent"
      : "Potential write target conflicts detected",
  });

  return gates;
}

/**
 * 生成 Code Assembly Review Artifact
 */
export function generateCodeReviewArtifact(
  assemblyPlan: AssemblyPlan,
  blueprint: Blueprint | null,
  featureId: string,
  result: AssemblyCodeResult
): CodeAssemblyReviewArtifact {
  const recognition = recognizeCodePatterns(assemblyPlan);
  const readinessGates = evaluateReadinessGates(recognition, result).map((gate) => {
    if (gate.name !== "CONSISTENT_WRITE_TARGETS") {
      return gate;
    }

    const declaredTargets = new Set(assemblyPlan.writeTargets.map((target) => target.target));
    const requiresServerTarget = result.serverFiles.length > 0;
    const requiresSharedTarget = result.sharedFiles.length > 0;
    const passed =
      (!requiresServerTarget || declaredTargets.has("server")) &&
      (!requiresSharedTarget || declaredTargets.has("shared"));

    return {
      ...gate,
      passed,
      message: passed
        ? "Write targets are consistent"
        : "Generated targets are not fully covered by AssemblyPlan.writeTargets",
    };
  });

  // 判断是否准备好写入集成 (所有 error severity 的 gate 都必须通过)
  const readyForWriteIntegration = readinessGates
    .filter((g) => g.severity === "error")
    .every((g) => g.passed);

  return {
    version: "1.0",
    blueprintId: assemblyPlan.blueprintId,
    assemblySummary: {
      id: `assembly_${Date.now()}`,
      patternCount: assemblyPlan.selectedPatterns.length,
      serverPatternCount: recognition.serverPatterns.length,
      sharedPatternCount: recognition.sharedPatterns.length,
    },
    selectedNonUiPatterns: assemblyPlan.selectedPatterns
      .filter((p) => !p.patternId.startsWith("ui."))
      .map((p) => ({
        patternId: p.patternId,
        role: p.role || "default",
        supported: isSupportedCodePattern(p.patternId),
      })),
    generatedFilesSummary: [
      ...result.serverFiles.map((f) => ({
        fileName: f.filePath.split("/").pop() || "",
        fileType: f.fileType,
        lineCount: f.lineCount,
        patternId: f.sourcePatternId,
        generatedSymbol: f.generatedSymbol,
        target: "server" as const,
      })),
      ...result.sharedFiles.map((f) => ({
        fileName: f.filePath.split("/").pop() || "",
        fileType: f.fileType,
        lineCount: f.lineCount,
        patternId: f.sourcePatternId,
        generatedSymbol: f.generatedSymbol,
        target: "shared" as const,
      })),
    ],
    unresolvedItems: result.unresolvedItems,
    readyForWriteIntegration,
    readinessGates,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// 代码生成辅助函数
// ============================================================================

function toPascalCase(str: string): string {
  return str
    .split(/[_\-\.]+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join("");
}

// Key Binding Server Code
function generateKeyBindingServerCode(
  className: string,
  featureId: string,
  pattern: SelectedPattern
): string {
  const key = (pattern.parameters?.key as string) || "Q";

  return `/**
 * ${className}
 * 按键绑定模块 - Generated by Rune Weaver
 * Pattern: input.key_binding
 * Feature: ${featureId}
 */

export class ${className} {
  private static instance: ${className};
  private boundKeys: Set<string> = new Set();

  static getInstance(): ${className} {
    if (!${className}.instance) {
      ${className}.instance = new ${className}();
    }
    return ${className}.instance;
  }

  /**
   * 绑定按键
   */
  bindKey(key: string, callback: () => void): void {
    if (this.boundKeys.has(key)) {
      print(\`[Rune Weaver] Key \${key} already bound, skipping\`);
      return;
    }
    
    this.boundKeys.add(key);
    
    // 监听按键事件 - 使用 GameRules 和自定义事件系统
    if (GameRules && "XNetTable" in GameRules && (GameRules as any).XNetTable) {
      CustomGameEventManager.RegisterListener("player_key_pressed", (event: any) => {
        if (event.key === key) {
          callback();
        }
      });
    }
    
    print(\`[Rune Weaver] Bound key: \${key}\`);
  }

  /**
   * 解绑按键
   */
  unbindKey(key: string): void {
    this.boundKeys.delete(key);
    print(\`[Rune Weaver] Unbound key: \${key}\`);
  }
}

/**
 * 注册函数 - 由 Bridge 调用
 */
export function register${className}(): void {
  const binding = ${className}.getInstance();
  print("[Rune Weaver] ${className} registered");
  
  // TODO: Add your key bindings here
  // Example: binding.bindKey("${key}", () => { /* your logic */ });
}
`;
}

// Dash Effect Server Code
function generateDashServerCode(
  className: string,
  featureId: string,
  pattern: SelectedPattern
): string {
  const distance = (pattern.parameters?.distance as number) || 300;

  return `/**
 * ${className}
 * 冲刺效果 - Generated by Rune Weaver
 * Pattern: effect.dash
 * Feature: ${featureId}
 */

import { BaseAbility } from "../../../utils/dota_ts_adapter";

export class ${className} extends BaseAbility {
  private readonly DEFAULT_DISTANCE: number = ${distance};
  private readonly DEFAULT_SPEED: number = 1200;

  /**
   * 执行冲刺
   */
  executeDash(): void {
    const caster = this.GetCaster();
    if (!caster || !IsServer()) return;

    const direction = caster.GetForwardVector();
    const distance = this.GetSpecialValueFor("distance") || this.DEFAULT_DISTANCE;
    const speed = this.GetSpecialValueFor("speed") || this.DEFAULT_SPEED;

    const startPos = caster.GetAbsOrigin();
    const endPos = startPos.__add(direction.__mul(distance)) as Vector;

    caster.AddNewModifier(
      caster,
      this,
      "modifier_${className.toLowerCase()}_motion",
      {
        duration: distance / speed,
        x: endPos.x,
        y: endPos.y,
        z: endPos.z,
      }
    );

    const particleId = ParticleManager.CreateParticle(
      "particles/units/heroes/hero_phantom_assassin/phantom_assassin_phantom_strike_start.vpcf",
      ParticleAttachment.ABSORIGIN_FOLLOW,
      caster
    );
    ParticleManager.ReleaseParticleIndex(particleId);

    caster.EmitSound("Hero_PhantomAssassin.PhantomStrike");
  }

  OnSpellStart(): void {
    this.executeDash();
  }
}

export function register${className}(): void {
  print("[Rune Weaver] ${className} registered");
}
`;
}

// Resource Pool Server Code
function generateResourcePoolServerCode(
  className: string,
  featureId: string,
  pattern: SelectedPattern
): string {
  return `/**
 * ${className}
 * 资源池（冷却/能量系统）- Generated by Rune Weaver
 * Pattern: resource.basic_pool
 * Feature: ${featureId}
 */

interface ResourceState {
  current: number;
  max: number;
  lastUsedTime: number;
}

export class ${className} {
  private static instance: ${className};
  private playerResources: Map<number, ResourceState> = new Map();
  private readonly defaultMax: number = 100;
  private readonly regenRate: number = 0;

  static getInstance(): ${className} {
    if (!${className}.instance) {
      ${className}.instance = new ${className}();
    }
    return ${className}.instance;
  }

  initPlayer(playerId: number, maxValue?: number): void {
    this.playerResources.set(playerId, {
      current: maxValue || this.defaultMax,
      max: maxValue || this.defaultMax,
      lastUsedTime: 0,
    });
    print(\`[Rune Weaver] Initialized resource for player \${playerId}\`);
  }

  hasEnough(playerId: number, amount: number): boolean {
    const res = this.playerResources.get(playerId);
    if (!res) return false;
    return res.current >= amount;
  }

  consume(playerId: number, amount: number): boolean {
    if (!this.hasEnough(playerId, amount)) return false;
    
    const res = this.playerResources.get(playerId)!;
    res.current -= amount;
    res.lastUsedTime = GameRules.GetGameTime();
    
    this.syncToClient(playerId);
    return true;
  }

  restore(playerId: number, amount: number): void {
    const res = this.playerResources.get(playerId);
    if (!res) return;
    
    res.current = math.min(res.current + amount, res.max);
    this.syncToClient(playerId);
  }

  getCurrent(playerId: number): number {
    return this.playerResources.get(playerId)?.current || 0;
  }

  getMax(playerId: number): number {
    return this.playerResources.get(playerId)?.max || 0;
  }

  private syncToClient(playerId: number): void {
    const res = this.playerResources.get(playerId);
    if (!res) return;
    
    if (GameRules && "XNetTable" in GameRules && (GameRules as any).XNetTable) {
      (GameRules as any).XNetTable.SetTableValue(
        "rune_weaver_resources",
        \`player_\${playerId}\`,
        { current: res.current, max: res.max }
      );
    }
  }
}

export function register${className}(): void {
  const pool = ${className}.getInstance();
  print("[Rune Weaver] ${className} registered");
  
  // 监听玩家连接事件 - 使用 GameRules 和自定义事件
  ListenToGameEvent("player_connect_full", (event: any) => {
    const playerId = event.PlayerID;
    if (playerId !== undefined) {
      pool.initPlayer(playerId);
    }
  }, undefined);
}
`;
}

// Weighted Pool Server Code
function generateWeightedPoolServerCode(
  className: string,
  featureId: string,
  pattern: SelectedPattern
): string {
  return `/**
 * ${className}
 * 加权随机池 - Generated by Rune Weaver
 * Pattern: data.weighted_pool
 * Feature: ${featureId}
 */

interface WeightedItem<T> {
  item: T;
  weight: number;
  tier?: number;
}

export class ${className}<T = any> {
  private items: WeightedItem<T>[] = [];
  private totalWeight: number = 0;

  add(item: T, weight: number, tier?: number): void {
    this.items.push({ item, weight, tier });
    this.totalWeight += weight;
  }

  remove(item: T): boolean {
    const index = this.items.findIndex(i => i.item === item);
    if (index === -1) return false;
    
    this.totalWeight -= this.items[index].weight;
    this.items.splice(index, 1);
    return true;
  }

  clear(): void {
    this.items = [];
    this.totalWeight = 0;
  }

  draw(): T | null {
    if (this.items.length === 0 || this.totalWeight <= 0) {
      return null;
    }

    let random = RandomFloat(0, this.totalWeight);
    
    for (const item of this.items) {
      random -= item.weight;
      if (random <= 0) {
        return item.item;
      }
    }
    
    return this.items[this.items.length - 1]?.item || null;
  }

  drawMultiple(count: number): T[] {
    const result: T[] = [];
    const tempPool = new ${className}<T>();
    
    for (const item of this.items) {
      tempPool.add(item.item, item.weight, item.tier);
    }
    
    for (let i = 0; i < count && i < this.items.length; i++) {
      const drawn = tempPool.draw();
      if (drawn !== null) {
        result.push(drawn);
        tempPool.remove(drawn);
      }
    }
    
    return result;
  }
}

export function register${className}(): void {
  print("[Rune Weaver] ${className} registered");
}
`;
}

// Selection Flow Server Code
function generateSelectionFlowServerCode(
  className: string,
  featureId: string,
  pattern: SelectedPattern
): string {
  return `/**
 * ${className}
 * 选择流程（如三选一天赋）- Generated by Rune Weaver
 * Pattern: rule.selection_flow
 * Feature: ${featureId}
 */

// Pool import removed - only used if data.weighted_pool pattern is selected

interface SelectionOption {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

interface PlayerSelection {
  playerId: number;
  options: SelectionOption[];
  selectedIndex: number;
  isConfirmed: boolean;
}

export class ${className} {
  private static instance: ${className};
  private activeSelections: Map<number, PlayerSelection> = new Map();
  private selectionCallbacks: Map<number, (option: SelectionOption) => void> = new Map();

  static getInstance(): ${className} {
    if (!${className}.instance) {
      ${className}.instance = new ${className}();
    }
    return ${className}.instance;
  }

  startSelection(
    playerId: number,
    options: SelectionOption[],
    onSelected: (option: SelectionOption) => void
  ): void {
    if (options.length === 0) {
      print(\`[Rune Weaver] Cannot start selection with empty options\`);
      return;
    }

    this.activeSelections.set(playerId, {
      playerId,
      options,
      selectedIndex: -1,
      isConfirmed: false,
    });
    this.selectionCallbacks.set(playerId, onSelected);

    this.sendToClient(playerId, options);
    print(\`[Rune Weaver] Started selection for player \${playerId}\`);
  }

  onPlayerSelect(playerId: number, optionIndex: number): void {
    const selection = this.activeSelections.get(playerId);
    if (!selection) return;

    if (optionIndex < 0 || optionIndex >= selection.options.length) {
      print(\`[Rune Weaver] Invalid option index: \${optionIndex}\`);
      return;
    }

    selection.selectedIndex = optionIndex;
    print(\`[Rune Weaver] Player \${playerId} selected option \${optionIndex}\`);
  }

  onPlayerConfirm(playerId: number): void {
    const selection = this.activeSelections.get(playerId);
    if (!selection) return;

    if (selection.selectedIndex === -1) {
      print(\`[Rune Weaver] Player \${playerId} has not selected any option\`);
      return;
    }

    selection.isConfirmed = true;
    const selectedOption = selection.options[selection.selectedIndex];
    
    const callback = this.selectionCallbacks.get(playerId);
    if (callback) {
      callback(selectedOption);
    }

    this.activeSelections.delete(playerId);
    this.selectionCallbacks.delete(playerId);
    
    print(\`[Rune Weaver] Player \${playerId} confirmed selection: \${selectedOption.name}\`);
  }

  private sendToClient(playerId: number, options: SelectionOption[]): void {
    if (GameRules && "XNetTable" in GameRules && (GameRules as any).XNetTable) {
      (GameRules as any).XNetTable.SetTableValue(
        "rune_weaver_selection",
        \`player_\${playerId}\`,
        { options, status: "waiting" }
      );
    }
  }

  // @ts-ignore - pool may not be available
  generateOptionsFromPool<T extends SelectionOption>(pool: any, count: number): T[] {
    if (pool && typeof pool.drawMultiple === "function") {
      return pool.drawMultiple(count);
    }
    print(\`[Rune Weaver] Pool not available for ${className}, using default options\`);
    return [];
  }
}

export function register${className}(): void {
  const flow = ${className}.getInstance();
  print("[Rune Weaver] ${className} registered");
}
`;
}

// Default Server Code
function generateDefaultServerCode(
  className: string,
  featureId: string,
  pattern: SelectedPattern
): string {
  return `/**
 * ${className}
 * 默认模块 - Generated by Rune Weaver
 * Pattern: ${pattern.patternId}
 * Feature: ${featureId}
 */

export class ${className} {
  private static instance: ${className};

  static getInstance(): ${className} {
    if (!${className}.instance) {
      ${className}.instance = new ${className}();
    }
    return ${className}.instance;
  }

  init(): void {
    print("[Rune Weaver] ${className} initialized");
  }
}

export function register${className}(): void {
  const instance = ${className}.getInstance();
  instance.init();
  print("[Rune Weaver] ${className} registered");
}
`;
}

// Weighted Pool Shared Code
function generateWeightedPoolSharedCode(
  className: string,
  featureId: string,
  pattern: SelectedPattern
): string {
  return `/**
 * ${className}
 * 加权随机池类型定义 - Generated by Rune Weaver
 * Pattern: data.weighted_pool
 * Feature: ${featureId}
 */

export interface WeightedItem<T = any> {
  item: T;
  weight: number;
  tier?: number;
}

export interface I${className}<T = any> {
  add(item: T, weight: number, tier?: number): void;
  remove(item: T): boolean;
  clear(): void;
  draw(): T | null;
  drawMultiple(count: number): T[];
  drawByTier(tier: number): T | null;
  getAllItems(): WeightedItem<T>[];
  getCount(): number;
}

export const ${className}Defaults = {
  defaultTier: 1,
  minWeight: 1,
  maxWeight: 100,
} as const;
`;
}

// Selection Flow Shared Code
function generateSelectionFlowSharedCode(
  className: string,
  featureId: string,
  pattern: SelectedPattern
): string {
  return `/**
 * ${className}
 * 选择流程类型定义 - Generated by Rune Weaver
 * Pattern: rule.selection_flow
 * Feature: ${featureId}
 */

export interface SelectionOption {
  id: string;
  name: string;
  description: string;
  icon?: string;
  metadata?: Record<string, unknown>;
}

export interface PlayerSelection {
  playerId: number;
  options: SelectionOption[];
  selectedIndex: number;
  isConfirmed: boolean;
}

export interface SelectionConfig {
  minOptions: number;
  maxOptions: number;
  allowReroll: boolean;
  timeLimit?: number;
}

export const ${className}Events = {
  SELECTION_STARTED: "${featureId}_selection_started",
  OPTION_SELECTED: "${featureId}_option_selected",
  SELECTION_CONFIRMED: "${featureId}_selection_confirmed",
  SELECTION_CANCELLED: "${featureId}_selection_cancelled",
} as const;
`;
}

// Default Shared Code
function generateDefaultSharedCode(
  className: string,
  featureId: string,
  pattern: SelectedPattern
): string {
  return `/**
 * ${className}
 * 共享类型定义 - Generated by Rune Weaver
 * Pattern: ${pattern.patternId}
 * Feature: ${featureId}
 */

export interface I${className} {
  // TODO: Define shared interface
}

export const ${className}Constants = {
  // TODO: Define shared constants
} as const;
`;
}

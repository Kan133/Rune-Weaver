// F006: Dev-Only Local Backend Bridge
// Provides a more realistic local entry point for structured workbench results
// This bridge simulates what a real backend API would return, without HTTP
//
// RESPONSIBILITIES:
// - Provide dev-only structured result entry (like a local API mock)
// - Define realistic result structures that mirror backend responses
// - Be replaceable by real HTTP API in production
//
// NOT RESPONSIBILITIES:
// - HTTP transport (this is dev-only, local)
// - UI state management
// - Type transformation (handled by adapter)

import type { WorkbenchResult } from "../../../workbench/contract";

// F006: Realistic create result - mirrors what backend would return after processing
export const bridgeCreateResult: WorkbenchResult = {
  success: true,
  featureCard: {
    id: "feat_bridge_001",
    displayLabel: "冲刺技能 (Bridge)",
    systemLabel: "dash_ability_bridge",
    summary: "通过 Local Bridge 加载的冲刺技能",
    host: "dota2",
    status: "ready",
    riskLevel: "medium",
    needsConfirmation: false,
    createdAt: new Date("2026-04-09T10:00:00.000Z"),
    updatedAt: new Date("2026-04-09T10:00:00.000Z"),
  },
  featureDetail: {
    cardId: "feat_bridge_001",
    basicInfo: {
      id: "feat_bridge_001",
      displayLabel: "冲刺技能 (Bridge)",
      systemLabel: "dash_ability_bridge",
      intentSummary: "通过 Local Bridge 加载：实现一个向前冲刺技能",
      hostScope: "dota2",
      createdAt: new Date("2026-04-09T10:00:00.000Z"),
      updatedAt: new Date("2026-04-09T10:00:00.000Z"),
    },
    status: {
      status: "ready",
      riskLevel: "medium",
      needsConfirmation: false,
      conflictCount: 0,
      lastConflictSummary: "",
    },
    editableParams: {
      knownInputs: {
        abilityName: "dash_ability_bridge",
        hotkey: "Q",
        distance: 400,
        cooldown: 8,
      },
      missingParams: [],
      canEdit: true,
    },
    hostOutput: {
      host: "dota2",
      expectedSurfaces: ["ability", "kv", "lua"],
      impactAreas: ["gameplay", "ability_system"],
      integrationPointCount: 3,
      outputSummary: "Bridge: 将产出 ability_kv、lua_ability 文件",
    },
    patternBindings: {
      patterns: ["effect.dash"],
      isBound: true,
    },
  },
  lifecycleActions: {
    cardId: "feat_bridge_001",
    actions: [
      { kind: "create", enabled: true, reason: "Bridge: 功能卡片已就绪", nextHint: "点击创建开始生成" },
      { kind: "read", enabled: true, reason: "可以查看详情" },
      { kind: "update", enabled: false, reason: "功能尚未创建" },
      { kind: "archive", enabled: false, reason: "功能未创建" },
    ],
    currentStage: "ready",
    persistenceState: "new",
    persistenceReason: "Bridge: 新功能待写入",
  },
  featureRouting: {
    decision: "create",
    confidence: "high",
    candidates: [],
    rationale: "Bridge: 用户请求创建新功能",
    nextHint: "进入生成流程",
  },
  featureFocus: {
    focusType: "newly_created",
    featureId: "feat_bridge_001",
    featureLabel: "冲刺技能 (Bridge)",
    reason: "Bridge 加载的新功能",
    source: "local_bridge",
    persistenceRelation: "待写入工作区",
  },
};

// F006: Realistic governance-blocked result with full evidence
export const bridgeGovernanceResult: WorkbenchResult = {
  success: true,
  featureCard: {
    id: "feat_gov_bridge_001",
    displayLabel: "强力技能 (Bridge Gov)",
    systemLabel: "powerful_ability_bridge",
    summary: "通过 Local Bridge 加载的治理阻塞场景",
    host: "dota2",
    status: "blocked",
    riskLevel: "high",
    needsConfirmation: true,
    createdAt: new Date("2026-04-09T10:00:00.000Z"),
    updatedAt: new Date("2026-04-09T10:00:00.000Z"),
  },
  featureDetail: {
    cardId: "feat_gov_bridge_001",
    basicInfo: {
      id: "feat_gov_bridge_001",
      displayLabel: "强力技能 (Bridge Gov)",
      systemLabel: "powerful_ability_bridge",
      intentSummary: "通过 Local Bridge 加载：高伤害技能需要治理确认",
      hostScope: "dota2",
      createdAt: new Date("2026-04-09T10:00:00.000Z"),
      updatedAt: new Date("2026-04-09T10:00:00.000Z"),
    },
    status: {
      status: "blocked",
      riskLevel: "high",
      needsConfirmation: true,
      conflictCount: 2,
      lastConflictSummary: "Bridge: 检测到高风险变更",
    },
    editableParams: {
      knownInputs: { abilityName: "powerful_ability_bridge", damage: 500 },
      missingParams: [],
      canEdit: false,
    },
    hostOutput: {
      host: "dota2",
      expectedSurfaces: ["ability", "kv"],
      impactAreas: ["gameplay"],
      integrationPointCount: 2,
      outputSummary: "Bridge: 高伤害技能配置",
    },
    patternBindings: {
      patterns: ["effect.damage"],
      isBound: true,
    },
  },
  lifecycleActions: {
    cardId: "feat_gov_bridge_001",
    actions: [
      { kind: "create", enabled: false, reason: "Bridge: 存在治理阻塞" },
      { kind: "read", enabled: true, reason: "可以查看详情" },
      { kind: "update", enabled: false, reason: "存在治理阻塞" },
      { kind: "archive", enabled: false, reason: "功能未创建" },
    ],
    currentStage: "blocked",
    persistenceState: "new",
    persistenceReason: "Bridge: 治理检查未通过",
  },
  featureRouting: {
    decision: "create",
    confidence: "high",
    candidates: [],
    rationale: "Bridge: 用户请求创建，但存在治理阻塞",
  },
  featureFocus: {
    focusType: "newly_created",
    featureId: "feat_gov_bridge_001",
    featureLabel: "强力技能 (Bridge Gov)",
    reason: "Bridge 加载的治理阻塞功能",
    source: "local_bridge",
    persistenceRelation: "治理阻塞中",
  },
  governanceRelease: {
    status: "blocked",
    blockedReason: "Bridge: 检测到高风险变更，需要人工确认",
    requiredConfirmations: [
      {
        itemId: "conflict_bridge_001",
        itemType: "conflict",
        description: "Bridge: 高伤害值可能影响游戏平衡",
        severity: "high",
      },
      {
        itemId: "param_bridge_001",
        itemType: "parameter",
        description: "Bridge: 建议降低伤害值至300以下",
        severity: "medium",
      },
    ],
    nextAllowedTransition: null,
    releaseHint: "Bridge: 请确认是否继续创建此高伤害技能",
    canSelfRelease: false,
  },
};

// F006: Realistic write-success result with full write evidence
export const bridgeWriteSuccessResult: WorkbenchResult = {
  success: true,
  featureCard: {
    id: "feat_bridge_001",
    displayLabel: "冲刺技能 (Bridge Written)",
    systemLabel: "dash_ability_bridge",
    summary: "通过 Local Bridge 加载 - 已写入工作区",
    host: "dota2",
    status: "ready",
    riskLevel: "low",
    needsConfirmation: false,
    createdAt: new Date("2026-04-09T10:00:00.000Z"),
    updatedAt: new Date("2026-04-09T15:00:00.000Z"),
  },
  featureDetail: {
    cardId: "feat_bridge_001",
    basicInfo: {
      id: "feat_bridge_001",
      displayLabel: "冲刺技能 (Bridge Written)",
      systemLabel: "dash_ability_bridge",
      intentSummary: "Bridge: 代码已成功生成并写入",
      hostScope: "dota2",
      createdAt: new Date("2026-04-09T10:00:00.000Z"),
      updatedAt: new Date("2026-04-09T15:00:00.000Z"),
    },
    status: {
      status: "ready",
      riskLevel: "low",
      needsConfirmation: false,
      conflictCount: 0,
      lastConflictSummary: "",
    },
    editableParams: {
      knownInputs: { abilityName: "dash_ability_bridge" },
      missingParams: [],
      canEdit: true,
    },
    hostOutput: {
      host: "dota2",
      expectedSurfaces: ["ability", "kv", "lua"],
      impactAreas: ["gameplay"],
      integrationPointCount: 3,
      outputSummary: "Bridge: 代码已成功生成并写入工作区",
    },
    patternBindings: {
      patterns: ["effect.dash"],
      isBound: true,
    },
  },
  lifecycleActions: {
    cardId: "feat_bridge_001",
    actions: [
      { kind: "create", enabled: false, reason: "Bridge: 功能已创建" },
      { kind: "read", enabled: true, reason: "可以查看详情" },
      { kind: "update", enabled: true, reason: "可以更新" },
      { kind: "archive", enabled: true, reason: "可以归档" },
    ],
    currentStage: "ready",
    persistenceState: "persisted",
    persistedFeatureId: "feat_bridge_001",
    persistenceReason: "Bridge: 功能已成功写入工作区",
  },
  featureRouting: {
    decision: "create",
    confidence: "high",
    candidates: [],
    rationale: "Bridge: 功能已成功创建",
  },
  featureFocus: {
    focusType: "persisted_existing",
    featureId: "feat_bridge_001",
    featureLabel: "冲刺技能 (Bridge Written)",
    reason: "Bridge 加载的已写入功能",
    source: "local_bridge",
    persistenceRelation: "工作区现有功能",
  },
  updateWriteResult: {
    writeStatus: "written",
    targetFeatureId: "feat_bridge_001",
    targetFeatureLabel: "冲刺技能 (Bridge Written)",
    writeMode: "actual",
    touchedOutputs: [
      {
        outputKind: "ability_kv",
        outputPath: "game/scripts/npc/abilities/dash_ability_bridge.txt",
        description: "Bridge: 技能KV配置",
        status: "created",
      },
      {
        outputKind: "lua_ability",
        outputPath: "game/scripts/src/rune_weaver/abilities/dash_ability_bridge.lua",
        description: "Bridge: Lua技能逻辑",
        status: "created",
      },
    ],
    writeReason: "Bridge: 已成功写入工作区",
    nextHint: "Bridge: 可以在游戏中测试",
    canRetry: false,
  },
};

// F006: Local bridge results registry
// Maps scenario keys to their corresponding bridge results
// F008: Aligned scenario keys with mock scenarios for cross-source consistency
export const localBridgeResults: Record<string, WorkbenchResult> = {
  "create": bridgeCreateResult,
  "governance-blocked": bridgeGovernanceResult,
  "write-success": bridgeWriteSuccessResult,
};

// F006: Get available scenario keys for local bridge mode
export function getLocalBridgeScenarios(): string[] {
  return Object.keys(localBridgeResults);
}

// F006: Get a specific result by scenario key
export function getLocalBridgeResult(scenario: string): WorkbenchResult | null {
  return localBridgeResults[scenario] || null;
}

// F006: Check if local bridge has a specific scenario
export function hasLocalBridgeScenario(scenario: string): boolean {
  return scenario in localBridgeResults;
}

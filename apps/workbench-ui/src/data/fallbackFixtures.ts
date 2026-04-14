// F005-R2: Fallback Fixtures Source
// Extracted from scenarioAdapter.ts to separate fallback data definition from adapter logic
// This file provides minimal synchronous fallbacks when async loading fails
// These are intentionally SMALL - just enough to render without crashing

import type { AdapterInput } from "../adapters/workbenchResultAdapter";

// F005-R2: Create scenario fallback - minimal data for create flow
export const createFallback: AdapterInput = {
  featureCard: {
    id: "feat_001",
    displayLabel: "冲刺技能",
    systemLabel: "dash_ability",
    summary: "一个向前冲刺的位移技能",
    host: "dota2",
    status: "ready",
    riskLevel: "medium",
    needsConfirmation: false,
    createdAt: new Date("2026-04-09T10:00:00.000Z"),
    updatedAt: new Date("2026-04-09T10:00:00.000Z"),
  },
  featureDetail: {
    cardId: "feat_001",
    basicInfo: {
      id: "feat_001",
      displayLabel: "冲刺技能",
      systemLabel: "dash_ability",
      intentSummary: "实现一个向前冲刺的位移技能",
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
      knownInputs: { abilityName: "dash_ability" },
      missingParams: [],
      canEdit: true,
    },
    hostOutput: {
      host: "dota2",
      expectedSurfaces: ["ability", "kv", "lua"],
      impactAreas: ["gameplay", "ability_system"],
      integrationPointCount: 3,
      outputSummary: "将产出 ability_kv、lua_ability、server_ts 三类文件",
    },
    patternBindings: {
      patterns: ["effect.dash"],
      isBound: true,
    },
  },
  lifecycleActions: {
    cardId: "feat_001",
    actions: [
      { kind: "create", enabled: true, reason: "功能卡片已就绪，可以创建" },
      { kind: "read", enabled: true, reason: "可以查看详情" },
      { kind: "update", enabled: false, reason: "功能尚未创建，无法更新" },
      { kind: "archive", enabled: false, reason: "功能未创建，无法归档" },
    ],
    currentStage: "ready",
    persistenceState: "new",
    persistenceReason: "新功能尚未写入工作区",
  },
  featureRouting: {
    decision: "create",
    confidence: "high",
    candidates: [],
    rationale: "用户请求创建一个新功能，系统识别为 create 路径",
  },
  featureFocus: {
    focusType: "newly_created",
    featureId: "feat_001",
    featureLabel: "冲刺技能",
    reason: "新创建的 feature",
    source: "user_intake",
    persistenceRelation: "待写入工作区",
  },
};

// F005-R2: Update scenario fallback - minimal data for update flow
export const updateFallback: AdapterInput = {
  featureCard: {
    id: "feat_001",
    displayLabel: "冲刺技能",
    systemLabel: "dash_ability",
    summary: "一个向前冲刺的位移技能",
    host: "dota2",
    status: "ready",
    riskLevel: "medium",
    needsConfirmation: false,
    createdAt: new Date("2026-04-09T10:00:00.000Z"),
    updatedAt: new Date("2026-04-09T12:00:00.000Z"),
  },
  featureDetail: {
    cardId: "feat_001",
    basicInfo: {
      id: "feat_001",
      displayLabel: "冲刺技能",
      systemLabel: "dash_ability",
      intentSummary: "实现一个向前冲刺的位移技能",
      hostScope: "dota2",
      createdAt: new Date("2026-04-09T10:00:00.000Z"),
      updatedAt: new Date("2026-04-09T12:00:00.000Z"),
    },
    status: {
      status: "ready",
      riskLevel: "medium",
      needsConfirmation: false,
      conflictCount: 0,
      lastConflictSummary: "",
    },
    editableParams: {
      knownInputs: { abilityName: "dash_ability" },
      missingParams: [],
      canEdit: true,
    },
    hostOutput: {
      host: "dota2",
      expectedSurfaces: ["ability", "kv", "lua"],
      impactAreas: ["gameplay", "ability_system"],
      integrationPointCount: 3,
      outputSummary: "将更新 ability_kv、lua_ability 文件",
    },
    patternBindings: {
      patterns: ["effect.dash"],
      isBound: true,
    },
  },
  lifecycleActions: {
    cardId: "feat_001",
    actions: [
      { kind: "create", enabled: false, reason: "功能已存在" },
      { kind: "read", enabled: true, reason: "可以查看详情" },
      { kind: "update", enabled: true, reason: "功能已就绪，可以更新" },
      { kind: "archive", enabled: true, reason: "可以归档" },
    ],
    currentStage: "ready",
    persistenceState: "persisted",
    persistedFeatureId: "feat_001",
    persistenceReason: "功能已持久化到工作区",
  },
  featureRouting: {
    decision: "update",
    confidence: "high",
    candidates: [],
    rationale: "用户请求更新现有功能",
  },
  featureFocus: {
    focusType: "persisted_existing",
    featureId: "feat_001",
    featureLabel: "冲刺技能",
    reason: "更新已存在的 feature",
    source: "workspace_persisted",
    persistenceRelation: "工作区现有 feature",
  },
  updateHandoff: {
    status: "direct_target",
    targetFeatureId: "feat_001",
    targetFeatureLabel: "冲刺技能",
    handoverReason: "直接匹配到现有 feature",
  },
  updateHandler: {
    status: "ready_for_dry_run",
    targetFeatureId: "feat_001",
    targetFeatureLabel: "冲刺技能",
    handlerReason: "更新目标已确定，进入 dry-run 准备",
    confidence: "high",
    dryRunEnabled: true,
  },
};

// F005-R2: Governance blocked scenario fallback - minimal data for governance flow
export const governanceBlockedFallback: AdapterInput = {
  featureCard: {
    id: "feat_002",
    displayLabel: "强力技能",
    systemLabel: "powerful_ability",
    summary: "一个可能破坏平衡的高伤害技能",
    host: "dota2",
    status: "blocked",
    riskLevel: "high",
    needsConfirmation: true,
    createdAt: new Date("2026-04-09T10:00:00.000Z"),
    updatedAt: new Date("2026-04-09T10:00:00.000Z"),
  },
  featureDetail: {
    cardId: "feat_002",
    basicInfo: {
      id: "feat_002",
      displayLabel: "强力技能",
      systemLabel: "powerful_ability",
      intentSummary: "实现一个高伤害技能，需要治理确认",
      hostScope: "dota2",
      createdAt: new Date("2026-04-09T10:00:00.000Z"),
      updatedAt: new Date("2026-04-09T10:00:00.000Z"),
    },
    status: {
      status: "blocked",
      riskLevel: "high",
      needsConfirmation: true,
      conflictCount: 1,
      lastConflictSummary: "检测到高风险变更",
    },
    editableParams: {
      knownInputs: { abilityName: "powerful_ability" },
      missingParams: [],
      canEdit: false,
    },
    hostOutput: {
      host: "dota2",
      expectedSurfaces: ["ability", "kv"],
      impactAreas: ["gameplay", "ability_system"],
      integrationPointCount: 2,
      outputSummary: "将产出高伤害技能配置",
    },
    patternBindings: {
      patterns: ["effect.damage"],
      isBound: true,
    },
  },
  lifecycleActions: {
    cardId: "feat_002",
    actions: [
      { kind: "create", enabled: false, reason: "存在治理阻塞" },
      { kind: "read", enabled: true, reason: "可以查看详情" },
      { kind: "update", enabled: false, reason: "存在治理阻塞" },
      { kind: "archive", enabled: false, reason: "功能未创建" },
    ],
    currentStage: "blocked",
    persistenceState: "new",
    persistenceReason: "治理检查未通过",
  },
  featureRouting: {
    decision: "create",
    confidence: "high",
    candidates: [],
    rationale: "用户请求创建新功能，但存在治理阻塞",
  },
  featureFocus: {
    focusType: "newly_created",
    featureId: "feat_002",
    featureLabel: "强力技能",
    reason: "新创建的 feature",
    source: "user_intake",
    persistenceRelation: "治理阻塞中",
  },
  governanceRelease: {
    status: "blocked",
    blockedReason: "检测到高风险变更，需要人工确认",
    requiredConfirmations: [
      {
        itemId: "conflict_001",
        itemType: "conflict",
        description: "高伤害值可能影响游戏平衡",
        severity: "high",
      },
    ],
    nextAllowedTransition: null,
    releaseHint: "请确认是否继续创建此高伤害技能",
    canSelfRelease: false,
  },
};

// F005-R2: Write success scenario fallback - minimal data for write success flow
export const writeSuccessFallback: AdapterInput = {
  featureCard: {
    id: "feat_001",
    displayLabel: "冲刺技能",
    systemLabel: "dash_ability",
    summary: "一个向前冲刺的位移技能 - 代码已生成",
    host: "dota2",
    status: "ready",
    riskLevel: "low",
    needsConfirmation: false,
    createdAt: new Date("2026-04-09T10:00:00.000Z"),
    updatedAt: new Date("2026-04-09T14:00:00.000Z"),
  },
  featureDetail: {
    cardId: "feat_001",
    basicInfo: {
      id: "feat_001",
      displayLabel: "冲刺技能",
      systemLabel: "dash_ability",
      intentSummary: "实现一个向前冲刺的位移技能，代码已成功生成",
      hostScope: "dota2",
      createdAt: new Date("2026-04-09T10:00:00.000Z"),
      updatedAt: new Date("2026-04-09T14:00:00.000Z"),
    },
    status: {
      status: "ready",
      riskLevel: "low",
      needsConfirmation: false,
      conflictCount: 0,
      lastConflictSummary: "",
    },
    editableParams: {
      knownInputs: { abilityName: "dash_ability" },
      missingParams: [],
      canEdit: true,
    },
    hostOutput: {
      host: "dota2",
      expectedSurfaces: ["ability", "kv", "lua"],
      impactAreas: ["gameplay"],
      integrationPointCount: 3,
      outputSummary: "代码已成功生成并写入工作区",
    },
    patternBindings: {
      patterns: ["effect.dash"],
      isBound: true,
    },
  },
  lifecycleActions: {
    cardId: "feat_001",
    actions: [
      { kind: "create", enabled: false, reason: "功能已创建" },
      { kind: "read", enabled: true, reason: "可以查看功能详情" },
      { kind: "update", enabled: true, reason: "可以更新功能" },
      { kind: "archive", enabled: true, reason: "可以归档功能" },
    ],
    currentStage: "ready",
    persistenceState: "persisted",
    persistedFeatureId: "feat_001",
    persistenceReason: "功能已成功写入工作区",
  },
  featureRouting: {
    decision: "create",
    confidence: "high",
    candidates: [],
    rationale: "功能已成功创建并写入",
  },
  featureFocus: {
    focusType: "persisted_existing",
    featureId: "feat_001",
    featureLabel: "冲刺技能",
    reason: "已写入的 feature",
    source: "workspace_persisted",
    persistenceRelation: "工作区现有 feature",
  },
  updateWriteResult: {
    writeStatus: "written",
    targetFeatureId: "feat_001",
    targetFeatureLabel: "冲刺技能",
    writeMode: "actual",
    touchedOutputs: [
      {
        outputKind: "ability_kv",
        outputPath: "game/scripts/npc/abilities/dash_ability.txt",
        description: "技能KV配置",
        status: "created",
      },
      {
        outputKind: "lua_ability",
        outputPath: "game/scripts/src/rune_weaver/dash_ability.lua",
        description: "Lua技能逻辑",
        status: "created",
      },
    ],
    writeReason: "已成功写入工作区",
    nextHint: "可以在游戏中测试新技能",
    canRetry: false,
  },
};

// F005-R2: Fallback fixtures registry
// Maps scenario keys to their corresponding fallback fixtures
export const fallbackFixtures: Record<string, AdapterInput> = {
  create: createFallback,
  update: updateFallback,
  "governance-blocked": governanceBlockedFallback,
  "write-success": writeSuccessFallback,
};

// F005-R2: Get available fallback scenario keys
export function getFallbackScenarios(): string[] {
  return Object.keys(fallbackFixtures);
}

// F005-R2: Get a specific fallback fixture by scenario key
export function getFallbackFixture(scenario: string): AdapterInput | null {
  return fallbackFixtures[scenario] || fallbackFixtures["create"] || null;
}

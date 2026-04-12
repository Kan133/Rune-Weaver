// F005-R1: Local Backend-Like Result Source
// Extracted from workbenchResultLoader.ts to separate data definition from loading logic
// This file acts as a replaceable local source layer - in production, this would be replaced by actual API calls

import type { WorkbenchResult } from "../../../workbench/types";

// F005-R1: Create feature result - simulates backend response after processing "create dash ability"
export const createDashResult: WorkbenchResult = {
  success: true,
  featureCard: {
    id: "feat_dash_001",
    displayLabel: "冲刺技能",
    systemLabel: "dash_ability",
    summary: "按Q键向前冲刺400距离的位移技能",
    host: "dota2",
    status: "ready",
    riskLevel: "medium",
    needsConfirmation: false,
    createdAt: new Date("2026-04-09T10:00:00.000Z"),
    updatedAt: new Date("2026-04-09T10:00:00.000Z"),
  },
  featureDetail: {
    cardId: "feat_dash_001",
    basicInfo: {
      id: "feat_dash_001",
      displayLabel: "冲刺技能",
      systemLabel: "dash_ability",
      intentSummary: "实现一个按Q键触发的向前冲刺技能，冲刺距离400，冷却8秒",
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
        abilityName: "dash_ability",
        hotkey: "Q",
        distance: 400,
        cooldown: 8,
        manaCost: "50 60 70 80",
      },
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
      patterns: ["effect.dash", "dota2.short_time_buff"],
      isBound: true,
    },
  },
  lifecycleActions: {
    cardId: "feat_dash_001",
    actions: [
      { kind: "create", enabled: true, reason: "功能卡片已就绪，可以创建", nextHint: "点击创建开始生成" },
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
    nextHint: "进入 blueprint 生成流程",
  },
  featureFocus: {
    focusType: "newly_created",
    featureId: "feat_dash_001",
    featureLabel: "冲刺技能",
    reason: "新创建的 feature",
    source: "user_intake",
    persistenceRelation: "待写入工作区",
  },
};

// F005-R1: Governance blocked result - simulates backend response with governance issues
export const governanceBlockedResult: WorkbenchResult = {
  success: true,
  featureCard: {
    id: "feat_power_001",
    displayLabel: "强力技能",
    systemLabel: "powerful_ability",
    summary: "高伤害技能，需要治理确认",
    host: "dota2",
    status: "blocked",
    riskLevel: "high",
    needsConfirmation: true,
    createdAt: new Date("2026-04-09T10:00:00.000Z"),
    updatedAt: new Date("2026-04-09T10:00:00.000Z"),
  },
  featureDetail: {
    cardId: "feat_power_001",
    basicInfo: {
      id: "feat_power_001",
      displayLabel: "强力技能",
      systemLabel: "powerful_ability",
      intentSummary: "实现一个高伤害技能，单次伤害500点",
      hostScope: "dota2",
      createdAt: new Date("2026-04-09T10:00:00.000Z"),
      updatedAt: new Date("2026-04-09T10:00:00.000Z"),
    },
    status: {
      status: "blocked",
      riskLevel: "high",
      needsConfirmation: true,
      conflictCount: 1,
      lastConflictSummary: "检测到高风险变更：伤害值过高",
    },
    editableParams: {
      knownInputs: { abilityName: "powerful_ability", damage: 500 },
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
    cardId: "feat_power_001",
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
    featureId: "feat_power_001",
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
      {
        itemId: "param_001",
        itemType: "parameter",
        description: "建议降低伤害值至300以下",
        severity: "medium",
      },
    ],
    nextAllowedTransition: null,
    releaseHint: "请确认是否继续创建此高伤害技能",
    canSelfRelease: false,
  },
};

// F005-R1: Write success result - simulates backend response after successful write
export const writeSuccessResult: WorkbenchResult = {
  success: true,
  featureCard: {
    id: "feat_dash_001",
    displayLabel: "冲刺技能",
    systemLabel: "dash_ability",
    summary: "按Q键向前冲刺400距离的位移技能 - 已生成",
    host: "dota2",
    status: "ready",
    riskLevel: "low",
    needsConfirmation: false,
    createdAt: new Date("2026-04-09T10:00:00.000Z"),
    updatedAt: new Date("2026-04-09T14:30:00.000Z"),
  },
  featureDetail: {
    cardId: "feat_dash_001",
    basicInfo: {
      id: "feat_dash_001",
      displayLabel: "冲刺技能",
      systemLabel: "dash_ability",
      intentSummary: "实现一个按Q键触发的向前冲刺技能，冲刺距离400，冷却8秒 - 代码已生成",
      hostScope: "dota2",
      createdAt: new Date("2026-04-09T10:00:00.000Z"),
      updatedAt: new Date("2026-04-09T14:30:00.000Z"),
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
    cardId: "feat_dash_001",
    actions: [
      { kind: "create", enabled: false, reason: "功能已创建" },
      { kind: "read", enabled: true, reason: "可以查看功能详情" },
      { kind: "update", enabled: true, reason: "可以更新功能" },
      { kind: "archive", enabled: true, reason: "可以归档功能" },
    ],
    currentStage: "ready",
    persistenceState: "persisted",
    persistedFeatureId: "feat_dash_001",
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
    featureId: "feat_dash_001",
    featureLabel: "冲刺技能",
    reason: "已写入的 feature",
    source: "workspace_persisted",
    persistenceRelation: "工作区现有 feature",
  },
  updateWriteResult: {
    writeStatus: "written",
    targetFeatureId: "feat_dash_001",
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
        outputPath: "game/scripts/src/rune_weaver/abilities/dash_ability.lua",
        description: "Lua技能逻辑",
        status: "created",
      },
      {
        outputKind: "typescript_types",
        outputPath: "game/scripts/src/rune_weaver/types/dash_ability.d.ts",
        description: "TypeScript类型定义",
        status: "created",
      },
    ],
    writeReason: "已成功写入工作区",
    nextHint: "可以在游戏中测试新技能",
    canRetry: false,
  },
};

// F005-R1: Local backend results registry
// Maps scenario keys to their corresponding backend results
// F008: Aligned scenario keys with mock scenarios for cross-source consistency
export const localBackendResults: Record<string, WorkbenchResult> = {
  "create": createDashResult,
  "governance-blocked": governanceBlockedResult,
  "write-success": writeSuccessResult,
};

// F005-R1: Get available scenario keys for local backend mode
export function getLocalBackendScenarios(): string[] {
  return Object.keys(localBackendResults);
}

// F005-R1: Get a specific result by scenario key
export function getLocalBackendResult(scenario: string): WorkbenchResult | null {
  return localBackendResults[scenario] || null;
}

import type { GovernanceBlockedFixtureData, WorkbenchResultFixture } from "./types.js";

const mockDate = new Date("2026-04-09T10:00:00.000Z");

export const governanceBlockedFixtureData: GovernanceBlockedFixtureData = {
  featureCard: {
    id: "feat_002",
    displayLabel: "闪烁技能",
    systemLabel: "blink_ability",
    summary: "一个闪烁技能",
    host: "dota2",
    status: "blocked",
    riskLevel: "high",
    needsConfirmation: true,
    createdAt: mockDate,
    updatedAt: mockDate,
  },
  featureDetail: {
    cardId: "feat_002",
    basicInfo: {
      id: "feat_002",
      displayLabel: "闪烁技能",
      systemLabel: "blink_ability",
      intentSummary: "实现一个闪烁技能，与现有技能冲突",
      hostScope: "dota2",
      createdAt: mockDate,
      updatedAt: mockDate,
    },
    status: {
      status: "blocked",
      riskLevel: "high",
      needsConfirmation: true,
      conflictCount: 1,
      lastConflictSummary: "与 ability_blink 存在 surface_overlap 冲突",
    },
    editableParams: {
      knownInputs: {
        abilityName: "blink_ability",
        cooldown: "12",
        maxDistance: "1000",
      },
      missingParams: [],
      canEdit: false,
    },
    hostOutput: {
      host: "dota2",
      expectedSurfaces: ["ability", "kv"],
      impactAreas: ["gameplay", "ability_system"],
      integrationPointCount: 2,
      outputSummary: "与现有 ability 冲突，无法创建",
    },
    patternBindings: {
      patterns: ["effect.dash"],
      isBound: true,
    },
  },
  lifecycleActions: {
    cardId: "feat_002",
    actions: [
      { kind: "create", enabled: false, reason: "功能被治理拦截，无法创建" },
      { kind: "read", enabled: true, reason: "可以查看详情" },
      { kind: "update", enabled: false, reason: "功能被阻塞，无法更新" },
      { kind: "archive", enabled: false, reason: "功能未创建，无法归档" },
    ],
    currentStage: "blocked",
    persistenceState: "new",
    persistenceReason: "新功能被治理拦截，尚未写入工作区",
  },
  featureRouting: {
    decision: "create",
    confidence: "high",
    candidates: [],
    rationale: "用户请求创建新功能",
    reason: "无现有匹配项，但存在冲突",
    nextHint: "治理阶段检测到冲突",
  },
  featureFocus: {
    focusType: "newly_created",
    featureId: "feat_002",
    featureLabel: "闪烁技能",
    reason: "新创建的 feature 被治理拦截",
    persistenceRelation: "待确认状态",
    source: "user_intake",
  },
  updateHandoff: {
    status: "unresolved",
    handoverReason: "存在治理冲突，无法确定更新目标",
    confidence: "low",
    nextHint: "请解决冲突后再试",
  },
  updateHandler: {
    status: "blocked_waiting_confirmation",
    targetFeatureId: "feat_002",
    targetFeatureLabel: "闪烁技能",
    handlerReason: "功能被治理拦截，需要用户确认",
    confidence: "medium",
    dryRunEnabled: false,
    nextHint: "解决冲突后可继续",
  },
  governanceRelease: {
    status: "blocked_by_conflict",
    blockedReason: "与现有功能 ability_blink 存在冲突",
    requiredConfirmations: [
      {
        itemId: "conflict_001",
        itemType: "conflict",
        description: "与现有功能 ability_blink 存在 surface_overlap 冲突: 两者都尝试写入 ability 表面",
        severity: "high",
        currentValue: "ability_blink",
        suggestedValue: "确认覆盖或修改设计",
      },
    ],
    nextAllowedTransition: "requires_confirmation",
    releaseHint: "需要确认 1 项: 与现有功能 ability_blink 存在 surface_overlap 冲突",
    canSelfRelease: false,
  },
  conflictResult: {
    featureId: "feat_002",
    hasConflict: true,
    conflicts: [
      {
        kind: "surface_overlap",
        conflictingPoint: "ability_surface",
        existingFeatureId: "ability_blink",
        existingFeatureLabel: "闪烁技能 (现有)",
        explanation: "两者都尝试写入 ability 表面",
        severity: "error",
      },
    ],
    status: "blocked",
    recommendedAction: "block",
    summary: "涓庣幇鏈夊姛鑳藉瓨鍦ㄥ啿绐?",
  },
};

export const governanceBlockedFixture: WorkbenchResultFixture = {
  scenario: "governance_blocked",
  description: "功能创建被治理拦截的完整路径",
  mockInput: {
    userPrompt: "做一个闪烁技能",
    hostRoot: "D:\\test1",
    dryRun: false,
  },
  expected: {
    success: false,
    featureCard: governanceBlockedFixtureData.featureCard,
    featureDetail: governanceBlockedFixtureData.featureDetail,
    lifecycleActions: governanceBlockedFixtureData.lifecycleActions,
    featureRouting: governanceBlockedFixtureData.featureRouting,
    featureFocus: governanceBlockedFixtureData.featureFocus,
    governanceRelease: governanceBlockedFixtureData.governanceRelease,
    error: "功能被治理拦截：与现有功能存在冲突",
  },
};

export function getGovernanceBlockedFixture(): WorkbenchResultFixture {
  return governanceBlockedFixture;
}

export function getGovernanceBlockedFixtureData(): GovernanceBlockedFixtureData {
  return governanceBlockedFixtureData;
}

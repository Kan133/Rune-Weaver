import type { CreateFixtureData, WorkbenchResultFixture } from "./types.js";

const mockDate = new Date("2026-04-09T10:00:00.000Z");

export const createFixtureData: CreateFixtureData = {
  featureCard: {
    id: "feat_001",
    displayLabel: "冲刺技能",
    systemLabel: "dash_ability",
    summary: "一个向前冲刺的位移技能",
    host: "dota2",
    status: "ready",
    riskLevel: "medium",
    needsConfirmation: false,
    createdAt: mockDate,
    updatedAt: mockDate,
  },
  featureDetail: {
    cardId: "feat_001",
    basicInfo: {
      id: "feat_001",
      displayLabel: "冲刺技能",
      systemLabel: "dash_ability",
      intentSummary: "实现一个向前冲刺的位移技能，冷却8秒，消耗50-80魔法值",
      hostScope: "dota2",
      createdAt: mockDate,
      updatedAt: mockDate,
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
        cooldown: "8",
        manaCost: "50 60 70 80",
        distance: "300",
        speed: "1200",
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
    cardId: "feat_001",
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
  actionRoute: {
    route: {
      routeId: "route_create_001",
      status: "matched",
      targetFeatureId: undefined,
      reason: "检测到新建请求",
      requestedAction: "create",
    },
    alternativeRoutes: [],
  },
  featureRouting: {
    decision: "create",
    confidence: "high",
    candidates: [],
    rationale: "用户请求创建一个新功能，系统识别为 create 路径",
    reason: "无现有匹配项，创建新 feature",
    nextHint: "进入 blueprint 生成流程",
  },
  featureFocus: {
    focusType: "newly_created",
    featureId: "feat_001",
    featureLabel: "冲刺技能",
    reason: "新创建的 feature",
    persistenceRelation: "待写入工作区",
    source: "user_intake",
  },
  featureIdentity: {
    id: "feat_001",
    label: "冲刺技能",
    intentSummary: "实现一个向前冲刺的位移技能，冷却8秒，消耗50-80魔法值",
    hostScope: "dota2",
    currentStage: "planning",
    createdAt: mockDate,
  },
  featureOwnership: {
    featureId: "feat_001",
    expectedSurfaces: ["ability", "kv", "lua", "ts"],
    impactAreas: ["gameplay", "ability_system"],
    confidence: "high",
    isComplete: true,
  },
};

export const createFixture: WorkbenchResultFixture = {
  scenario: "create",
  description: "成功创建新功能的完整路径",
  mockInput: {
    userPrompt: "做一个冲刺技能，冷却8秒，消耗50-80魔法，距离300",
    hostRoot: "D:\\test1",
    dryRun: false,
  },
  expected: {
    success: true,
    featureIdentity: createFixtureData.featureIdentity,
    featureOwnership: createFixtureData.featureOwnership,
    featureCard: createFixtureData.featureCard,
    featureDetail: createFixtureData.featureDetail,
    lifecycleActions: createFixtureData.lifecycleActions,
    actionRoute: createFixtureData.actionRoute,
    featureRouting: createFixtureData.featureRouting,
    featureFocus: createFixtureData.featureFocus,
  },
};

export function getCreateFixture(): WorkbenchResultFixture {
  return createFixture;
}

export function getCreateFixtureData(): CreateFixtureData {
  return createFixtureData;
}

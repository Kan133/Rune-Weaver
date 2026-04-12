import type { UpdateFixtureData, WorkbenchResultFixture } from "./types.js";

const mockDate = new Date("2026-04-09T10:00:00.000Z");
const updateDate = new Date("2026-04-09T12:00:00.000Z");

export const updateFixtureData: UpdateFixtureData = {
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
    updatedAt: updateDate,
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
      updatedAt: updateDate,
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
      { kind: "create", enabled: false, reason: "功能已存在" },
      { kind: "read", enabled: true, reason: "可以查看详情" },
      { kind: "update", enabled: true, reason: "功能已就绪，可以更新", nextHint: "选择更新目标" },
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
    reason: "匹配到现有 feature: feat_001",
    nextHint: "进入更新流程",
  },
  featureFocus: {
    focusType: "persisted_existing",
    featureId: "feat_001",
    featureLabel: "冲刺技能",
    reason: "更新已存在的 feature",
    persistenceRelation: "工作区现有 feature",
    source: "workspace_persisted",
  },
  updateHandoff: {
    status: "direct_target",
    targetFeatureId: "feat_001",
    targetFeatureLabel: "冲刺技能",
    handoverReason: "直接匹配到现有 feature",
    confidence: "high",
  },
  updateHandler: {
    status: "ready_for_dry_run",
    targetFeatureId: "feat_001",
    targetFeatureLabel: "冲刺技能",
    handlerReason: "更新目标已确定，进入 dry-run 准备",
    confidence: "high",
    dryRunEnabled: true,
    updatePlan: {
      planStatus: "planning_ready",
      targetFeatureId: "feat_001",
      targetFeatureLabel: "冲刺技能",
      operationType: "modify_existing",
      affectedSurfaces: [
        { surfaceKind: "ability", description: "修改 ability 表面", riskLevel: "medium" },
        { surfaceKind: "kv", description: "修改 KV 配置", riskLevel: "medium" },
        { surfaceKind: "lua", description: "修改 Lua 脚本", riskLevel: "medium" },
      ],
      planningReason: "更新计划已生成，可以执行",
      nextHint: "执行 dry-run 或直接写入",
      canProceed: true,
    },
  },
  updateWriteResult: {
    writeStatus: "simulated",
    targetFeatureId: "feat_001",
    targetFeatureLabel: "冲刺技能",
    writeMode: "dry_run",
    touchedOutputs: [
      { outputKind: "ability_kv", outputPath: "game/scripts/npc/abilities/dash_ability.txt", description: "KV 配置", status: "modified" },
      { outputKind: "lua_ability", outputPath: "game/scripts/vscripts/abilities/dash_ability.lua", description: "Lua 脚本", status: "modified" },
      { outputKind: "server_ts", outputPath: "game/scripts/src/abilities/dash_ability.ts", description: "TS 脚本", status: "modified" },
    ],
    writeReason: "dry-run 模式，仅模拟写入",
    canRetry: true,
  },
  governanceRelease: {
    status: "not_required",
    blockedReason: null,
    requiredConfirmations: [],
    nextAllowedTransition: null,
    releaseHint: "更新流程无需额外治理释放",
    canSelfRelease: true,
  },
};

export const updateFixture: WorkbenchResultFixture = {
  scenario: "update",
  description: "成功更新现有功能的完整路径",
  mockInput: {
    userPrompt: "更新冲刺技能，把冷却改成6秒",
    hostRoot: "D:\\test1",
    dryRun: true,
  },
  expected: {
    success: true,
    featureCard: updateFixtureData.featureCard,
    featureDetail: updateFixtureData.featureDetail,
    lifecycleActions: updateFixtureData.lifecycleActions,
    featureRouting: updateFixtureData.featureRouting,
    featureFocus: updateFixtureData.featureFocus,
    updateHandoff: updateFixtureData.updateHandoff,
    updateHandler: updateFixtureData.updateHandler,
    updateWriteResult: updateFixtureData.updateWriteResult,
    governanceRelease: updateFixtureData.governanceRelease,
  },
};

export function getUpdateFixture(): WorkbenchResultFixture {
  return updateFixture;
}

export function getUpdateFixtureData(): UpdateFixtureData {
  return updateFixtureData;
}

import type { WorkbenchState, MockScenario, FeatureCategory } from "../types/workbench";

// Mock Data Scenarios for Feature-First Workbench
// Three states: create, update, governance_blocked
// F003: Updated with beginner-friendly categories and simplified views

const baseSession = {
  sessionId: "session_001",
  hostRoot: "D:/test1",
  status: "active" as const,
};

// F003: Category labels mapping
const categoryLabels: Record<FeatureCategory, string> = {
  hero: "英雄",
  ability: "技能",
  talent: "天赋",
  item: "物品",
  ui_visual: "UI 表现",
  rule_mechanic: "规则机制",
  input_interaction: "输入交互",
  data_config: "数据配置",
  other: "其他",
};

// Scenario 1: Create Path - New Feature Creation
export const createScenario: WorkbenchState = {
  session: {
    ...baseSession,
    currentFeatureId: "feature_dash_skill_001",
  },
  featureCard: {
    id: "card_dash_001",
    displayLabel: "冲刺技能",
    systemLabel: "dash_skill_q",
    summary: "按Q键触发的前向冲刺技能，带有短暂无敌帧和位移效果",
    host: "dota2",
    status: "ready",
    riskLevel: "low",
    needsConfirmation: false,
    // F003: Beginner-friendly additions
    category: "ability",
    categoryLabel: categoryLabels["ability"],
    affectedAreas: ["技能系统", "输入绑定", "位移效果"],
    nextAction: '点击"继续生成"开始创建代码',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  featureDetail: {
    cardId: "card_dash_001",
    basicInfo: {
      id: "feature_dash_skill_001",
      displayLabel: "冲刺技能",
      systemLabel: "dash_skill_q",
      intentSummary: "做一个按Q键的冲刺技能，向前冲刺400距离，持续0.3秒，期间无敌",
      hostScope: "dota2",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    status: {
      status: "ready",
      riskLevel: "low",
      needsConfirmation: false,
      conflictCount: 0,
      lastConflictSummary: "无冲突",
    },
    editableParams: {
      knownInputs: {
        key: "Q",
        distance: 400,
        duration: 0.3,
        invulnerable: true,
      },
      missingParams: [],
      canEdit: true,
    },
    hostOutput: {
      host: "dota2",
      expectedSurfaces: ["ability", "lua", "kv"],
      impactAreas: ["gameplay", "ability_system"],
      integrationPointCount: 3,
      outputSummary: "将创建技能配置、Lua逻辑和KV定义",
    },
    patternBindings: {
      patterns: ["input.key_binding", "effect.dash", "dota2.short_time_buff"],
      isBound: true,
    },
  },
  featureReview: {
    summary: "冲刺技能：按Q键触发，向前冲刺400距离，0.3秒无敌帧",
    recognizedCapabilities: ["按键触发", "位移效果", "无敌修饰器"],
    knownInputs: {
      triggerKey: "Q",
      distance: 400,
      duration: 0.3,
    },
    conflictSummary: "无冲突",
    nextStep: "准备生成代码",
  },
  lifecycleActions: {
    cardId: "card_dash_001",
    currentStage: "ready",
    persistenceState: "new",
    persistedFeatureId: null,
    persistenceReason: "新建功能卡片",
    actions: [
      {
        kind: "create",
        enabled: true,
        reason: "功能已准备好创建",
        nextHint: "点击创建开始生成代码",
      },
      {
        kind: "read",
        enabled: true,
        reason: "可以查看功能详情",
      },
      {
        kind: "update",
        enabled: false,
        reason: "功能尚未持久化，无法更新",
      },
      {
        kind: "archive",
        enabled: true,
        reason: "可以放弃此功能",
      },
    ],
  },
  actionRoute: {
    primaryRoute: {
      kind: "create",
      targetCardId: "card_dash_001",
      targetCardLabel: "冲刺技能",
      status: "matched",
      reason: "新建功能路由",
    },
    alternativeRoutes: [],
  },
  featureRouting: {
    decision: "create",
    confidence: "high",
    candidates: [],
    rationale: "用户明确请求创建新功能",
    nextHint: "继续完成功能创建",
  },
  featureFocus: {
    focusType: "newly_created",
    featureId: "feature_dash_skill_001",
    featureLabel: "冲刺技能",
    reason: "用户请求创建新功能",
    source: "user_request",
  },
  updateHandoff: {
    status: "unresolved",
    handoverReason: "新建功能，无需更新交接",
    nextHint: "完成功能创建",
  },
  updateHandler: {
    status: "not_applicable",
    reason: "新建功能，不进入更新处理",
    nextHint: "完成功能创建",
  },
  governanceRelease: {
    status: "not_required",
    blockedReason: null,
    requiredConfirmations: [],
    nextAllowedTransition: null,
    releaseHint: "可直接发布",
    canSelfRelease: true,
  },
  confirmationActions: [],
  blueprintProposal: {
    blueprintId: "blueprint_dash_001",
    featureId: "feature_dash_skill_001",
    modules: [
      {
        moduleId: "mod_input_001",
        patternIds: ["input.key_binding"],
        role: "input",
        description: "Q键触发绑定",
      },
      {
        moduleId: "mod_effect_001",
        patternIds: ["effect.dash"],
        role: "effect",
        description: "冲刺位移效果",
      },
      {
        moduleId: "mod_dota2_001",
        patternIds: ["dota2.short_time_buff"],
        role: "gameplay-core",
        description: "Dota2无敌修饰器",
      },
    ],
    affectedSurfaces: ["ability", "lua", "kv"],
    rationale: "使用标准冲刺模式组合Dota2特定实现",
  },
  outputEvidence: [
    {
      filePath: "game/scripts/npc/abilities/dash_skill_q.txt",
      contentType: "kv",
      description: "技能KV配置",
      size: 1024,
    },
    {
      filePath: "game/scripts/vscripts/abilities/dash_skill_q.lua",
      contentType: "lua",
      description: "技能Lua逻辑",
      size: 2048,
    },
  ],
};

// Scenario 2: Update Path - Modify Existing Feature
export const updateScenario: WorkbenchState = {
  session: {
    ...baseSession,
    currentFeatureId: "feature_dash_skill_001",
  },
  featureCard: {
    id: "card_dash_001",
    displayLabel: "冲刺技能",
    systemLabel: "dash_skill_q",
    summary: "按Q键触发的前向冲刺技能（更新中：距离400→500，冷却10→8秒）",
    host: "dota2",
    status: "ready",
    riskLevel: "medium",
    needsConfirmation: true,
    // F003: Beginner-friendly additions
    category: "ability",
    categoryLabel: categoryLabels["ability"],
    affectedAreas: ["技能数值", "平衡性"],
    nextAction: "确认数值变更后应用更新",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  featureDetail: {
    cardId: "card_dash_001",
    basicInfo: {
      id: "feature_dash_skill_001",
      displayLabel: "冲刺技能",
      systemLabel: "dash_skill_q",
      intentSummary: "修改冲刺技能参数：距离增加到500，冷却减少到8秒",
      hostScope: "dota2",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    status: {
      status: "ready",
      riskLevel: "medium",
      needsConfirmation: true,
      conflictCount: 0,
      lastConflictSummary: "无冲突，但需要确认数值变更",
    },
    editableParams: {
      knownInputs: {
        key: "Q",
        distance: 500, // Changed from 400
        duration: 0.3,
        invulnerable: true,
        cooldown: 8, // Changed from 10
      },
      missingParams: [],
      canEdit: true,
    },
    hostOutput: {
      host: "dota2",
      expectedSurfaces: ["ability", "lua", "kv"],
      impactAreas: ["gameplay", "ability_system"],
      integrationPointCount: 3,
      outputSummary: "将更新技能数值配置",
    },
    patternBindings: {
      patterns: ["input.key_binding", "effect.dash", "dota2.short_time_buff"],
      isBound: true,
    },
  },
  featureReview: {
    summary: "冲刺技能参数更新：距离400→500，冷却10→8秒",
    recognizedCapabilities: ["按键触发", "位移效果", "数值调整"],
    knownInputs: {
      triggerKey: "Q",
      distance: 500,
      cooldown: 8,
    },
    conflictSummary: "无冲突，数值变更需要确认",
    nextStep: "确认数值变更",
  },
  lifecycleActions: {
    cardId: "card_dash_001",
    currentStage: "ready",
    persistenceState: "persisted",
    persistedFeatureId: "feature_dash_skill_001",
    persistenceReason: "功能已持久化",
    actions: [
      {
        kind: "create",
        enabled: false,
        reason: "功能已存在",
      },
      {
        kind: "read",
        enabled: true,
        reason: "可以查看功能详情",
      },
      {
        kind: "update",
        enabled: true,
        reason: "功能已持久化，可以更新",
        nextHint: "确认数值变更",
      },
      {
        kind: "archive",
        enabled: true,
        reason: "可以删除此功能",
      },
    ],
  },
  actionRoute: {
    primaryRoute: {
      kind: "update",
      targetCardId: "card_dash_001",
      targetCardLabel: "冲刺技能",
      requestedAction: "update",
      status: "matched",
      reason: "更新现有功能",
    },
    alternativeRoutes: [],
  },
  featureRouting: {
    decision: "update",
    confidence: "high",
    candidates: [
      {
        candidateId: "feature_dash_skill_001",
        featureLabel: "冲刺技能",
        confidence: "high",
        matchedPatterns: ["dash", "skill"],
        reason: "完全匹配现有功能",
      },
    ],
    rationale: "用户明确请求修改现有功能",
    nextHint: "确认更新参数",
  },
  featureFocus: {
    focusType: "persisted_existing",
    featureId: "feature_dash_skill_001",
    featureLabel: "冲刺技能",
    reason: "更新现有功能",
    source: "user_request",
    persistenceRelation: "persisted_match",
  },
  updateHandoff: {
    status: "direct_target",
    targetFeatureId: "feature_dash_skill_001",
    targetFeatureLabel: "冲刺技能",
    handoverReason: "直接定位到现有功能",
    nextHint: "确认参数变更",
  },
  updateHandler: {
    status: "ready_for_dry_run",
    reason: "参数变更已准备好",
    nextHint: "执行dry-run预览变更",
  },
  updateDryRunPlan: {
    planId: "plan_update_001",
    targetFeatureId: "feature_dash_skill_001",
    affectedSurfaces: [
      {
        surfaceId: "kv_ability_values",
        surfaceKind: "kv",
        changeType: "modify",
        riskLevel: "low",
      },
      {
        surfaceId: "lua_distance_calc",
        surfaceKind: "lua",
        changeType: "modify",
        riskLevel: "medium",
      },
    ],
    estimatedImpact: "中等影响：数值变更可能影响平衡性",
    canProceed: true,
    blockers: [],
  },
  governanceRelease: {
    status: "awaiting_confirmation",
    blockedReason: null,
    requiredConfirmations: [
      {
        itemId: "confirm_distance_change",
        itemType: "parameter",
        description: "确认将冲刺距离从400改为500",
        severity: "high",
      },
    ],
    nextAllowedTransition: "requires_confirmation",
    releaseHint: "需要确认数值变更",
    canSelfRelease: false,
  },
  confirmationActions: [
    {
      itemId: "confirm_distance_change",
      description: "确认将冲刺距离从400改为500",
      confirmed: false,
      required: true,
    },
  ],
  blueprintProposal: {
    blueprintId: "blueprint_dash_002",
    featureId: "feature_dash_skill_001",
    modules: [
      {
        moduleId: "mod_input_001",
        patternIds: ["input.key_binding"],
        role: "input",
        description: "Q键触发绑定（无变更）",
      },
      {
        moduleId: "mod_effect_001",
        patternIds: ["effect.dash"],
        role: "effect",
        description: "冲刺位移效果（数值更新）",
      },
      {
        moduleId: "mod_dota2_001",
        patternIds: ["dota2.short_time_buff"],
        role: "gameplay-core",
        description: "Dota2无敌修饰器（无变更）",
      },
    ],
    affectedSurfaces: ["ability", "lua", "kv"],
    rationale: "仅更新数值参数，保持原有结构",
  },
  outputEvidence: [
    {
      filePath: "game/scripts/npc/abilities/dash_skill_q.txt",
      contentType: "kv",
      description: "技能KV配置（已修改）",
      size: 1024,
    },
    {
      filePath: "game/scripts/vscripts/abilities/dash_skill_q.lua",
      contentType: "lua",
      description: "技能Lua逻辑（已修改）",
      size: 2048,
    },
  ],
};

// Scenario 3: Governance Blocked - Conflicts Need Resolution
export const governanceBlockedScenario: WorkbenchState = {
  session: {
    ...baseSession,
    currentFeatureId: undefined,
  },
  featureCard: {
    id: "card_talent_001",
    displayLabel: "天赋抽取系统",
    systemLabel: "talent_draw_system",
    summary: "按F4打开天赋抽取面板（创建被阻塞：存在冲突）",
    host: "dota2",
    status: "blocked",
    riskLevel: "high",
    needsConfirmation: true,
    // F003: Beginner-friendly additions
    category: "talent",
    categoryLabel: categoryLabels["talent"],
    affectedAreas: ["UI系统", "天赋数据", "按键绑定"],
    nextAction: "解决F4按键冲突和数据定义问题",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  featureDetail: {
    cardId: "card_talent_001",
    basicInfo: {
      id: "feature_talent_draw_001",
      displayLabel: "天赋抽取系统",
      systemLabel: "talent_draw_system",
      intentSummary: "创建一个天赋抽取系统，玩家可以按F4打开面板抽取随机天赋",
      hostScope: "dota2",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    status: {
      status: "blocked",
      riskLevel: "high",
      needsConfirmation: true,
      conflictCount: 2,
      lastConflictSummary: "F4按键被stats_panel占用，talent_pool数据未定义",
    },
    editableParams: {
      knownInputs: {
        triggerKey: "F4",
        uiPanel: "talent_draw",
      },
      missingParams: ["talent_pool_data", "ui_layout"],
      canEdit: false,
    },
    hostOutput: {
      host: "dota2",
      expectedSurfaces: ["ui", "data", "kv"],
      impactAreas: ["ui", "data"],
      integrationPointCount: 4,
      outputSummary: "需要解决冲突后才能确定输出",
    },
    patternBindings: {
      patterns: ["input.key_binding", "ui.panel", "data.random_pool"],
      isBound: false,
    },
  },
  featureReview: {
    summary: "天赋抽取系统：按F4打开面板抽取随机天赋",
    recognizedCapabilities: ["按键触发", "UI面板", "随机抽取"],
    knownInputs: {
      triggerKey: "F4",
    },
    conflictSummary: "存在2个冲突：F4按键占用，talent_pool未定义",
    nextStep: "解决冲突项",
  },
  lifecycleActions: {
    cardId: "card_talent_001",
    currentStage: "blocked",
    persistenceState: "runtime",
    persistedFeatureId: null,
    persistenceReason: "功能被阻塞，无法持久化",
    actions: [
      {
        kind: "create",
        enabled: false,
        reason: "存在未解决的冲突",
      },
      {
        kind: "read",
        enabled: true,
        reason: "可以查看功能详情",
      },
      {
        kind: "update",
        enabled: false,
        reason: "功能尚未创建",
      },
      {
        kind: "archive",
        enabled: true,
        reason: "可以放弃此功能",
      },
    ],
  },
  actionRoute: {
    primaryRoute: {
      kind: "create",
      targetCardId: "card_talent_001",
      targetCardLabel: "天赋抽取系统",
      status: "unavailable",
      reason: "存在阻塞项",
    },
    alternativeRoutes: [],
  },
  featureRouting: {
    decision: "unclear",
    confidence: "low",
    candidates: [
      {
        candidateId: "feature_quick_buy_001",
        featureLabel: "快速购买",
        confidence: "medium",
        matchedPatterns: ["input.key_binding"],
        reason: "使用相同按键F4",
      },
    ],
    rationale: "意图明确但存在冲突，需要用户决策",
    nextHint: "解决F4按键冲突",
  },
  featureFocus: {
    focusType: "newly_created",
    featureId: "feature_talent_draw_001",
    featureLabel: "天赋抽取系统",
    reason: "新功能创建被阻塞",
    source: "user_request",
  },
  updateHandoff: {
    status: "unresolved",
    handoverReason: "新建功能被阻塞，无法进入更新流程",
    nextHint: "解决阻塞后继续",
  },
  updateHandler: {
    status: "blocked_waiting_confirmation",
    reason: "等待冲突解决确认",
    nextHint: "解决冲突项",
  },
  governanceRelease: {
    status: "blocked",
    blockedReason: "存在2个阻塞项需要解决",
    requiredConfirmations: [
      {
        itemId: "resolve_f4_conflict",
        itemType: "conflict",
        description: "确认替换F4按键绑定",
        severity: "high",
      },
      {
        itemId: "talent_pool_data",
        itemType: "ownership",
        description: "确认天赋池数据来源",
        severity: "medium",
      },
    ],
    nextAllowedTransition: "blocked",
    releaseHint: "需要解决2个阻塞项才能继续",
    canSelfRelease: false,
  },
  confirmationActions: [
    {
      itemId: "resolve_f4_conflict",
      description: "将快速购买功能移至其他按键，F4用于天赋抽取",
      confirmed: false,
      required: true,
    },
    {
      itemId: "talent_pool_data",
      description: "定义talent_pool数据来源",
      confirmed: false,
      required: true,
    },
  ],
  blueprintProposal: {
    blueprintId: "blueprint_talent_001",
    featureId: "feature_talent_draw_001",
    modules: [
      {
        moduleId: "mod_input_002",
        patternIds: ["input.key_binding"],
        role: "input",
        description: "F4键触发绑定（待确认）",
      },
      {
        moduleId: "mod_ui_001",
        patternIds: ["ui.panel"],
        role: "ui",
        description: "天赋抽取面板",
      },
      {
        moduleId: "mod_data_001",
        patternIds: ["data.random_pool"],
        role: "data",
        description: "随机天赋池（待定义）",
      },
    ],
    affectedSurfaces: ["ui", "data", "kv"],
    rationale: "需要解决冲突后才能继续",
  },
  outputEvidence: [],
};

// Scenario 4: Write Success - Code Generated Successfully
export const writeSuccessScenario: WorkbenchState = {
  session: {
    ...baseSession,
    currentFeatureId: "feature_dash_skill_001",
    status: "completed",
  },
  featureCard: {
    id: "card_dash_001",
    displayLabel: "冲刺技能",
    systemLabel: "dash_skill_q",
    summary: "按Q键触发的前向冲刺技能 - 代码已生成",
    host: "dota2",
    status: "ready",
    riskLevel: "low",
    needsConfirmation: false,
    category: "ability",
    categoryLabel: categoryLabels["ability"],
    affectedAreas: ["技能系统", "Lua逻辑", "KV配置"],
    nextAction: "代码已生成，可在游戏中测试",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  featureDetail: {
    cardId: "card_dash_001",
    basicInfo: {
      id: "feature_dash_skill_001",
      displayLabel: "冲刺技能",
      systemLabel: "dash_skill_q",
      intentSummary: "按Q键触发的前向冲刺技能，代码已成功生成",
      hostScope: "dota2",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    status: {
      status: "ready",
      riskLevel: "low",
      needsConfirmation: false,
      conflictCount: 0,
      lastConflictSummary: "无冲突",
    },
    editableParams: {
      knownInputs: {
        key: "Q",
        distance: 400,
        duration: 0.3,
        invulnerable: true,
      },
      missingParams: [],
      canEdit: true,
    },
    hostOutput: {
      host: "dota2",
      expectedSurfaces: ["ability", "lua", "kv"],
      impactAreas: ["gameplay", "ability_system"],
      integrationPointCount: 3,
      outputSummary: "代码已成功生成并写入工作区",
    },
    patternBindings: {
      patterns: ["input.key_binding", "effect.dash", "dota2.short_time_buff"],
      isBound: true,
    },
  },
  featureReview: {
    summary: "冲刺技能代码生成完成",
    recognizedCapabilities: ["按键触发", "位移效果", "无敌修饰器"],
    knownInputs: {
      triggerKey: "Q",
      distance: 400,
      duration: 0.3,
    },
    conflictSummary: "无冲突",
    nextStep: "测试生成的代码",
  },
  lifecycleActions: {
    cardId: "card_dash_001",
    currentStage: "ready",
    persistenceState: "persisted",
    persistedFeatureId: "feature_dash_skill_001",
    persistenceReason: "功能已成功写入工作区",
    actions: [
      {
        kind: "create",
        enabled: false,
        reason: "功能已创建",
      },
      {
        kind: "read",
        enabled: true,
        reason: "可以查看功能详情",
      },
      {
        kind: "update",
        enabled: true,
        reason: "可以更新功能",
      },
      {
        kind: "archive",
        enabled: true,
        reason: "可以归档功能",
      },
    ],
  },
  actionRoute: {
    primaryRoute: {
      kind: "read",
      targetCardId: "card_dash_001",
      targetCardLabel: "冲刺技能",
      status: "matched",
      reason: "功能已创建",
    },
    alternativeRoutes: [],
  },
  featureRouting: {
    decision: "create",
    confidence: "high",
    candidates: [],
    rationale: "功能已成功创建",
    nextHint: "功能已就绪",
  },
  featureFocus: {
    focusType: "persisted_existing",
    featureId: "feature_dash_skill_001",
    featureLabel: "冲刺技能",
    reason: "功能已持久化",
    source: "workspace_persisted",
    persistenceRelation: "persisted_match",
  },
  updateHandoff: {
    status: "unresolved",
    handoverReason: "新建功能，无需更新",
    nextHint: "功能已就绪",
  },
  updateHandler: {
    status: "not_applicable",
    reason: "新建功能，不进入更新处理",
    nextHint: "功能已就绪",
  },
  updateWriteResult: {
    success: true,
    writtenFiles: [
      "game/scripts/npc/abilities/dash_skill_q.txt",
      "game/scripts/vscripts/abilities/dash_skill_q.lua",
      "game/scripts/src/rune_weaver/dash_skill_q.ts",
    ],
    failedFiles: [],
    rollbackAvailable: true,
    message: "代码已成功生成并写入工作区",
  },
  governanceRelease: {
    status: "released",
    blockedReason: null,
    requiredConfirmations: [],
    nextAllowedTransition: null,
    releaseHint: "已发布",
    canSelfRelease: true,
  },
  confirmationActions: [],
  blueprintProposal: {
    blueprintId: "blueprint_dash_001",
    featureId: "feature_dash_skill_001",
    modules: [
      {
        moduleId: "mod_input_001",
        patternIds: ["input.key_binding"],
        role: "input",
        description: "Q键触发绑定",
      },
      {
        moduleId: "mod_effect_001",
        patternIds: ["effect.dash"],
        role: "effect",
        description: "冲刺位移效果",
      },
      {
        moduleId: "mod_dota2_001",
        patternIds: ["dota2.short_time_buff"],
        role: "gameplay-core",
        description: "Dota2无敌修饰器",
      },
    ],
    affectedSurfaces: ["ability", "lua", "kv"],
    rationale: "使用标准冲刺模式组合Dota2特定实现",
  },
  outputEvidence: [
    {
      filePath: "game/scripts/npc/abilities/dash_skill_q.txt",
      contentType: "kv",
      description: "技能KV配置（已创建）",
      size: 1024,
    },
    {
      filePath: "game/scripts/vscripts/abilities/dash_skill_q.lua",
      contentType: "lua",
      description: "技能Lua逻辑（已创建）",
      size: 2048,
    },
    {
      filePath: "game/scripts/src/rune_weaver/dash_skill_q.ts",
      contentType: "ts",
      description: "TypeScript类型定义（已创建）",
      size: 512,
    },
  ],
};

// Export all scenarios
// F004: Updated to use kebab-case for consistency with adapter
export const allScenarios: Array<{
  id: MockScenario;
  label: string;
  description: string;
}> = [
  {
    id: "create",
    label: "创建场景",
    description: "做一个按Q键的冲刺技能，向前冲刺400距离",
  },
  {
    id: "update",
    label: "更新场景",
    description: "把冲刺技能的距离改成500，冷却降到8秒",
  },
  {
    id: "governance-blocked",
    label: "治理阻塞",
    description: "做一个天赋抽取系统，按F4打开面板",
  },
  {
    id: "write-success",
    label: "写入成功",
    description: "冲刺技能代码已成功生成",
  },
];

export function getMockScenario(scenario: MockScenario): WorkbenchState {
  switch (scenario) {
    case "create":
      return createScenario;
    case "update":
      return updateScenario;
    case "governance-blocked":
      return governanceBlockedScenario;
    case "write-success":
      return writeSuccessScenario;
    default:
      return createScenario;
  }
}

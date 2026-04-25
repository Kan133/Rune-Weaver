import type { Feature, Group } from '@/types/feature';

export const mockGroups: Group[] = [
  { id: 'all', name: '全部 Features', icon: 'Layers', count: 12 },
  { id: 'skill', name: '技能', icon: 'Zap', count: 5 },
  { id: 'hero', name: '英雄', icon: 'User', count: 3 },
  { id: 'system', name: '系统', icon: 'Settings', count: 4 },
];

const baseMockFeatures: Feature[] = [
  {
    id: '1',
    displayName: '天赋抽取系统',
    systemId: 'talent-draw',
    group: 'system',
    parentId: null,
    childrenIds: ['2', '3', '4'],
    status: 'active',
    revision: 5,
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    patterns: ['ability_system', 'state_machine', 'event_driven'],
    generatedFiles: [
      'abilities/talent_draw.lua',
      'scripts/vscripts/talent_system.lua',
      'scripts/vscripts/talent_manager.lua',
    ],
    hostRealization: {
      host: 'Dota2',
      context: '天赋系统模块',
      syncStatus: 'synced',
    },
    reviewSignals: {
      proposalStatus: {
        ready: true,
        percentage: 100,
        message: '所有 pattern 验证通过',
      },
      gapFillSummary: {
        autoFilled: 3,
        needsAttention: 0,
      },
      categoryEClarification: {
        count: 2,
        items: ['天赋稀有度定义', '抽取概率计算'],
      },
      invalidPatternIds: [],
      readiness: {
        score: 95,
        warnings: [],
      },
    },
  },
  {
    id: '2',
    displayName: '天赋池',
    systemId: 'talent-pool',
    group: 'system',
    parentId: '1',
    childrenIds: [],
    status: 'active',
    revision: 3,
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    patterns: ['data_container', 'pool_manager'],
    generatedFiles: [
      'scripts/vscripts/talent_pool.lua',
    ],
    hostRealization: {
      host: 'Dota2',
      context: '天赋池数据管理',
      syncStatus: 'synced',
    },
    reviewSignals: {
      proposalStatus: {
        ready: true,
        percentage: 100,
        message: '所有 pattern 验证通过',
      },
      gapFillSummary: {
        autoFilled: 2,
        needsAttention: 0,
      },
      categoryEClarification: {
        count: 0,
        items: [],
      },
      invalidPatternIds: [],
      readiness: {
        score: 100,
        warnings: [],
      },
    },
  },
  {
    id: '3',
    displayName: '选择弹窗',
    systemId: 'selection-modal',
    group: 'system',
    parentId: '1',
    childrenIds: [],
    status: 'draft',
    revision: 2,
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    patterns: ['ui_modal', 'event_handler'],
    generatedFiles: [
      'panorama/layout/custom_game/talent_selection.xml',
      'panorama/scripts/custom_game/talent_selection.js',
    ],
    hostRealization: {
      host: 'Dota2',
      context: 'UI 弹窗界面',
      syncStatus: 'pending',
    },
    reviewSignals: {
      proposalStatus: {
        ready: false,
        percentage: 60,
        message: '缺少 UI 布局细节',
      },
      gapFillSummary: {
        autoFilled: 1,
        needsAttention: 2,
      },
      categoryEClarification: {
        count: 1,
        items: ['弹窗动画时长'],
      },
      invalidPatternIds: [],
      readiness: {
        score: 60,
        warnings: ['UI 样式未确认'],
      },
    },
  },
  {
    id: '4',
    displayName: '效果处理器',
    systemId: 'effect-handler',
    group: 'system',
    parentId: '1',
    childrenIds: [],
    status: 'active',
    revision: 4,
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    patterns: ['effect_system', 'modifier_manager'],
    generatedFiles: [
      'scripts/vscripts/talent_effects.lua',
    ],
    hostRealization: {
      host: 'Dota2',
      context: '效果处理模块',
      syncStatus: 'synced',
    },
    reviewSignals: {
      proposalStatus: {
        ready: true,
        percentage: 100,
        message: '所有 pattern 验证通过',
      },
      gapFillSummary: {
        autoFilled: 4,
        needsAttention: 0,
      },
      categoryEClarification: {
        count: 0,
        items: [],
      },
      invalidPatternIds: [],
      readiness: {
        score: 98,
        warnings: [],
      },
    },
  },
  {
    id: '5',
    displayName: '冲刺技能',
    systemId: 'dash-ability',
    group: 'skill',
    parentId: null,
    childrenIds: ['6', '7'],
    status: 'active',
    revision: 8,
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    patterns: ['ability_active', 'dash_movement', 'cooldown_manager'],
    generatedFiles: [
      'abilities/dash_skill.lua',
      'scripts/vscripts/abilities/dash.lua',
    ],
    hostRealization: {
      host: 'Dota2',
      context: '主动技能',
      syncStatus: 'synced',
    },
    reviewSignals: {
      proposalStatus: {
        ready: true,
        percentage: 100,
        message: '所有 pattern 验证通过',
      },
      gapFillSummary: {
        autoFilled: 2,
        needsAttention: 0,
      },
      categoryEClarification: {
        count: 1,
        items: ['冲刺距离确认'],
      },
      invalidPatternIds: [],
      readiness: {
        score: 96,
        warnings: [],
      },
    },
  },
  {
    id: '6',
    displayName: '冲刺特效',
    systemId: 'dash-effect',
    group: 'skill',
    parentId: '5',
    childrenIds: [],
    status: 'active',
    revision: 3,
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    patterns: ['particle_system'],
    generatedFiles: [
      'particles/units/heroes/hero_dash_effect.vpcf',
    ],
    hostRealization: {
      host: 'Dota2',
      context: '特效资源',
      syncStatus: 'synced',
    },
    reviewSignals: {
      proposalStatus: {
        ready: true,
        percentage: 100,
        message: '所有 pattern 验证通过',
      },
      gapFillSummary: {
        autoFilled: 1,
        needsAttention: 0,
      },
      categoryEClarification: {
        count: 0,
        items: [],
      },
      invalidPatternIds: [],
      readiness: {
        score: 100,
        warnings: [],
      },
    },
  },
  {
    id: '7',
    displayName: '冲刺音效',
    systemId: 'dash-sound',
    group: 'skill',
    parentId: '5',
    childrenIds: [],
    status: 'draft',
    revision: 1,
    updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    patterns: ['sound_event'],
    generatedFiles: [
      'soundevents/game_sounds_dash.vsndevts',
    ],
    hostRealization: {
      host: 'Dota2',
      context: '音效资源',
      syncStatus: 'pending',
    },
    reviewSignals: {
      proposalStatus: {
        ready: false,
        percentage: 40,
        message: '等待音效资源确认',
      },
      gapFillSummary: {
        autoFilled: 0,
        needsAttention: 1,
      },
      categoryEClarification: {
        count: 0,
        items: [],
      },
      invalidPatternIds: [],
      readiness: {
        score: 40,
        warnings: ['缺少音效文件'],
      },
    },
  },
  {
    id: '8',
    displayName: '风行英雄',
    systemId: 'windranger-hero',
    group: 'hero',
    parentId: null,
    childrenIds: ['9', '10'],
    status: 'active',
    revision: 12,
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    patterns: ['hero_definition', 'attribute_system'],
    generatedFiles: [
      'scripts/npc/heroes/windranger_custom.txt',
      'scripts/vscripts/heroes/windranger.lua',
    ],
    hostRealization: {
      host: 'Dota2',
      context: '自定义英雄',
      syncStatus: 'synced',
    },
    reviewSignals: {
      proposalStatus: {
        ready: true,
        percentage: 100,
        message: '所有 pattern 验证通过',
      },
      gapFillSummary: {
        autoFilled: 5,
        needsAttention: 0,
      },
      categoryEClarification: {
        count: 2,
        items: ['基础攻击力', '攻击范围'],
      },
      invalidPatternIds: [],
      readiness: {
        score: 94,
        warnings: [],
      },
    },
  },
  {
    id: '9',
    displayName: '束缚击',
    systemId: 'shackleshot',
    group: 'hero',
    parentId: '8',
    childrenIds: [],
    status: 'active',
    revision: 6,
    updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    patterns: ['ability_target_unit', 'stun_modifier'],
    generatedFiles: [
      'abilities/shackleshot_custom.lua',
    ],
    hostRealization: {
      host: 'Dota2',
      context: '英雄技能',
      syncStatus: 'synced',
    },
    reviewSignals: {
      proposalStatus: {
        ready: true,
        percentage: 100,
        message: '所有 pattern 验证通过',
      },
      gapFillSummary: {
        autoFilled: 3,
        needsAttention: 0,
      },
      categoryEClarification: {
        count: 0,
        items: [],
      },
      invalidPatternIds: [],
      readiness: {
        score: 97,
        warnings: [],
      },
    },
  },
  {
    id: '10',
    displayName: '强力击',
    systemId: 'powershot',
    group: 'hero',
    parentId: '8',
    childrenIds: [],
    status: 'error',
    revision: 4,
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    patterns: ['ability_channeled', 'projectile_system'],
    generatedFiles: [
      'abilities/powershot_custom.lua',
    ],
    hostRealization: {
      host: 'Dota2',
      context: '英雄技能',
      syncStatus: 'error',
    },
    reviewSignals: {
      proposalStatus: {
        ready: false,
        percentage: 70,
        message: 'projectile_system pattern 有冲突',
      },
      gapFillSummary: {
        autoFilled: 2,
        needsAttention: 1,
      },
      categoryEClarification: {
        count: 0,
        items: [],
      },
      invalidPatternIds: ['projectile_system_v1'],
      readiness: {
        score: 65,
        warnings: ['Pattern 版本不匹配'],
      },
    },
  },
  {
    id: '11',
    displayName: '商店系统',
    systemId: 'shop-system',
    group: 'system',
    parentId: null,
    childrenIds: [],
    status: 'archived',
    revision: 2,
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    patterns: ['shop_interface'],
    generatedFiles: [
      'scripts/vscripts/shop_manager.lua',
    ],
    hostRealization: {
      host: 'Dota2',
      context: '商店模块',
      syncStatus: 'synced',
    },
    reviewSignals: {
      proposalStatus: {
        ready: true,
        percentage: 100,
        message: '已归档',
      },
      gapFillSummary: {
        autoFilled: 1,
        needsAttention: 0,
      },
      categoryEClarification: {
        count: 0,
        items: [],
      },
      invalidPatternIds: [],
      readiness: {
        score: 100,
        warnings: [],
      },
    },
  },
  {
    id: '12',
    displayName: '经验系统',
    systemId: 'xp-system',
    group: 'system',
    parentId: null,
    childrenIds: [],
    status: 'active',
    revision: 7,
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    patterns: ['xp_calculator', 'level_manager'],
    generatedFiles: [
      'scripts/vscripts/xp_system.lua',
      'scripts/vscripts/level_manager.lua',
    ],
    hostRealization: {
      host: 'Dota2',
      context: '经验等级系统',
      syncStatus: 'synced',
    },
    reviewSignals: {
      proposalStatus: {
        ready: true,
        percentage: 100,
        message: '所有 pattern 验证通过',
      },
      gapFillSummary: {
        autoFilled: 4,
        needsAttention: 0,
      },
      categoryEClarification: {
        count: 1,
        items: ['等级上限'],
      },
      invalidPatternIds: [],
      readiness: {
        score: 92,
        warnings: [],
      },
    },
  },
];

function buildCompatibilityOnlyMockReviewSignals(feature: Feature): Feature['reviewSignals'] {
  const reviewSignals = feature.reviewSignals;
  return {
    ...reviewSignals,
    lifecycle: {
      featureStatus:
        feature.status === 'active'
          ? 'active'
          : feature.status === 'archived'
            ? 'archived'
            : 'unknown',
      maturity: null,
      implementationStrategy: null,
      commitOutcome: null,
      canAssemble: null,
      canWriteHost: null,
      requiresReview: reviewSignals.readiness.warnings.length > 0,
      reasons: reviewSignals.readiness.warnings,
      summary: 'Compatibility-only mock fixture: lifecycle details are display-only and not canonical governance truth.',
    },
    reusableGovernance: {
      admittedCount: 0,
      attentionCount: 0,
      familyAdmissions: [],
      patternAdmissions: [],
      seamAdmissions: [],
      summary: 'Compatibility-only mock fixture: reusable governance admissions are unavailable.',
    },
    compatibilitySource: 'compatibility-only',
    grounding: {
      status: 'none_required',
      reviewRequired: false,
      verifiedSymbolCount: 0,
      allowlistedSymbolCount: 0,
      weakSymbolCount: 0,
      unknownSymbolCount: 0,
      warningCount: 0,
      warnings: [],
      reasonCodes: [],
      summary: 'Compatibility-only mock fixture: grounding quality is unavailable.',
    },
    repairability: {
      status: 'not_checked',
      reasons: [],
      summary: 'Compatibility-only mock fixture: live repairability observation is unavailable.',
    },
    readiness: {
      score: null,
      warnings: [...reviewSignals.readiness.warnings],
    },
  };
}

export const mockFeatures: Feature[] = baseMockFeatures.map((feature) => ({
  ...feature,
  reviewSignals: buildCompatibilityOnlyMockReviewSignals(feature),
}));

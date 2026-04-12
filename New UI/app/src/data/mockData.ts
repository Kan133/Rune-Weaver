import type { Feature, Group } from '@/types/feature';

export const mockGroups: Group[] = [
  { id: 'all', name: '全部 Features', icon: 'Layers', count: 12 },
  { id: 'skill', name: '技能', icon: 'Zap', count: 5 },
  { id: 'hero', name: '英雄', icon: 'User', count: 3 },
  { id: 'system', name: '系统', icon: 'Settings', count: 4 },
];

export const mockFeatures: Feature[] = [
  {
    id: '1',
    displayName: '天赋抽取系统',
    systemId: 'talent-draw',
    group: 'system',
    parentId: null,
    childrenIds: ['2', '3', '4'],
    status: 'active',
    revision: 5,
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2小时前
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
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4小时前
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
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1天前
    patterns: ['ui_modal', 'selection_interface'],
    generatedFiles: [
      'panorama/layout/custom_game/talent_modal.xml',
      'panorama/scripts/custom_game/talent_modal.js',
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
        message: 'UI pattern 需要完善',
      },
      gapFillSummary: {
        autoFilled: 1,
        needsAttention: 2,
      },
      categoryEClarification: {
        count: 1,
        items: ['弹窗动画时序'],
      },
      invalidPatternIds: [],
      readiness: {
        score: 60,
        warnings: ['缺少关闭回调', '动画未定义'],
      },
    },
  },
  {
    id: '4',
    displayName: '效果应用',
    systemId: 'effect-apply',
    group: 'system',
    parentId: '1',
    childrenIds: [],
    status: 'regenerate',
    revision: 4,
    updatedAt: new Date(Date.now() - 30 * 60 * 1000), // 30分钟前
    patterns: ['effect_applier', 'modifier_system'],
    generatedFiles: [
      'scripts/vscripts/talent_effect.lua',
    ],
    hostRealization: {
      host: 'Dota2',
      context: '天赋效果应用',
      syncStatus: 'error',
    },
    reviewSignals: {
      proposalStatus: {
        ready: true,
        percentage: 90,
        message: 'Pattern 变更需要重建',
      },
      gapFillSummary: {
        autoFilled: 2,
        needsAttention: 1,
      },
      categoryEClarification: {
        count: 0,
        items: [],
      },
      invalidPatternIds: ['modifier_v3'],
      readiness: {
        score: 85,
        warnings: ['Pattern 版本过期'],
      },
    },
  },
  {
    id: '5',
    displayName: '技能冷却系统',
    systemId: 'skill-cooldown',
    group: 'skill',
    parentId: null,
    childrenIds: ['6', '7'],
    status: 'error',
    revision: 1,
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3天前
    patterns: ['cooldown_manager', 'timer_system'],
    generatedFiles: [],
    hostRealization: {
      host: 'Dota2',
      context: '技能冷却管理',
      syncStatus: 'error',
    },
    reviewSignals: {
      proposalStatus: {
        ready: false,
        percentage: 30,
        message: '核心 pattern 配置错误',
      },
      gapFillSummary: {
        autoFilled: 0,
        needsAttention: 4,
      },
      categoryEClarification: {
        count: 0,
        items: [],
      },
      invalidPatternIds: ['cooldown_v1', 'timer_basic'],
      readiness: {
        score: 30,
        warnings: ['缺少冷却缩减计算', '无法解析 pattern'],
      },
    },
  },
  {
    id: '6',
    displayName: '冷却计算',
    systemId: 'cooldown-calc',
    group: 'skill',
    parentId: '5',
    childrenIds: [],
    status: 'active',
    revision: 2,
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    patterns: ['calculation_engine'],
    generatedFiles: [
      'scripts/vscripts/cooldown_calc.lua',
    ],
    hostRealization: {
      host: 'Dota2',
      context: '冷却时间计算',
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
    displayName: '冷却减免',
    systemId: 'cooldown-reduce',
    group: 'skill',
    parentId: '5',
    childrenIds: [],
    status: 'draft',
    revision: 1,
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    patterns: ['reduction_handler'],
    generatedFiles: [],
    hostRealization: {
      host: 'Dota2',
      context: '冷却减免处理',
      syncStatus: 'pending',
    },
    reviewSignals: {
      proposalStatus: {
        ready: false,
        percentage: 45,
        message: 'Pattern 不完整',
      },
      gapFillSummary: {
        autoFilled: 0,
        needsAttention: 2,
      },
      categoryEClarification: {
        count: 1,
        items: ['减免叠加规则'],
      },
      invalidPatternIds: [],
      readiness: {
        score: 45,
        warnings: ['缺少叠加逻辑'],
      },
    },
  },
  {
    id: '8',
    displayName: '英雄属性系统',
    systemId: 'hero-attrs',
    group: 'hero',
    parentId: null,
    childrenIds: ['9', '10'],
    status: 'active',
    revision: 3,
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    patterns: ['attribute_system', 'stat_manager'],
    generatedFiles: [
      'scripts/vscripts/hero_attributes.lua',
      'scripts/vscripts/stat_calculator.lua',
    ],
    hostRealization: {
      host: 'Dota2',
      context: '英雄属性管理',
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
    id: '9',
    displayName: '力量属性',
    systemId: 'str-attr',
    group: 'hero',
    parentId: '8',
    childrenIds: [],
    status: 'active',
    revision: 1,
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    patterns: ['strength_handler'],
    generatedFiles: [
      'scripts/vscripts/attributes/strength.lua',
    ],
    hostRealization: {
      host: 'Dota2',
      context: '力量属性计算',
      syncStatus: 'synced',
    },
    reviewSignals: {
      proposalStatus: {
        ready: true,
        percentage: 100,
        message: '所有 pattern 验证通过',
      },
      gapFillSummary: {
        autoFilled: 0,
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
    id: '10',
    displayName: '敏捷属性',
    systemId: 'agi-attr',
    group: 'hero',
    parentId: '8',
    childrenIds: [],
    status: 'active',
    revision: 1,
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    patterns: ['agility_handler'],
    generatedFiles: [
      'scripts/vscripts/attributes/agility.lua',
    ],
    hostRealization: {
      host: 'Dota2',
      context: '敏捷属性计算',
      syncStatus: 'synced',
    },
    reviewSignals: {
      proposalStatus: {
        ready: true,
        percentage: 100,
        message: '所有 pattern 验证通过',
      },
      gapFillSummary: {
        autoFilled: 0,
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
    id: '11',
    displayName: '技能伤害计算',
    systemId: 'skill-damage',
    group: 'skill',
    parentId: null,
    childrenIds: [],
    status: 'active',
    revision: 4,
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    patterns: ['damage_calculator', 'formula_engine'],
    generatedFiles: [
      'scripts/vscripts/damage_calculator.lua',
    ],
    hostRealization: {
      host: 'Dota2',
      context: '技能伤害计算',
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
    id: '12',
    displayName: '技能范围检测',
    systemId: 'skill-range',
    group: 'skill',
    parentId: null,
    childrenIds: [],
    status: 'draft',
    revision: 2,
    updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    patterns: ['range_detector', 'aoe_handler'],
    generatedFiles: [
      'scripts/vscripts/range_detector.lua',
    ],
    hostRealization: {
      host: 'Dota2',
      context: '技能范围检测',
      syncStatus: 'pending',
    },
    reviewSignals: {
      proposalStatus: {
        ready: false,
        percentage: 70,
        message: 'AOE pattern 需要调整',
      },
      gapFillSummary: {
        autoFilled: 1,
        needsAttention: 1,
      },
      categoryEClarification: {
        count: 0,
        items: [],
      },
      invalidPatternIds: [],
      readiness: {
        score: 70,
        warnings: ['AOE 范围计算待完善'],
      },
    },
  },
];

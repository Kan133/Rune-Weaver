# Dota 2 Arcade Dev Copilot —— 实施计划书（v2.0）

## 一、项目定位与最终形态

我们要做一个**Dota 2 游廊 Feature 组装引擎**。它的核心不是"生成 Ability 代码"，而是将用户的自然语言需求转化为**跨 Server-Client-UI 的完整功能包（Feature Package）**，并通过预定义的 Pattern 模板组装出经过验证的、可直接编译运行的代码。

### 最终用户体验

**场景 A：Cursor + MCP**
```text
用户：我要一个灵能冲刺系统，按 D 键消耗灵能向鼠标方向位移一段距离，并且无敌 0.4 秒

[Cursor 调用 MCP Tool: dota2_generate_feature]

AI 输出：
✅ 已解析 Feature: psionic_dash
   ├─ System Pattern: custom_resource (mana_like) → "灵能"
   ├─ System Pattern: key_binding_with_mouse_direction → "D键"
   ├─ Ability Pattern: dash_motion_horizontal (400距离, 1600速度)
   ├─ Modifier Pattern: invulnerability_frame (0.4秒)
   └─ UI Pattern: resource_bar + key_hint

📝 生成/修改文件:
   ├── game/scripts/src/modules/psionic_energy_system.ts   [新增]
   ├── game/scripts/src/abilities/psionic_dash.ts          [新增]
   ├── game/scripts/src/modifiers/modifier_psionic_dash.ts [新增]
   ├── content/panorama/src/hud/components/psionic_bar.tsx [新增]
   ├── shared/net_tables.d.ts                              [追加类型]
   └── game/scripts/src/utils/precache.ts                  [追加资源]

🔍 静态检查:
   ✓ TypeScript 编译通过
   ✓ NetTable 定义与使用一致
   ✓ Custom Game Event 注册无冲突
   ⚠ 提示: 请在 excels/技能表.xlsx 中为 ability_psionic_dash 补充 KV 配置
```

**场景 B：Kimi CLI + Skill**
```text
用户 @ kimi-cli: 帮我做一个天赋抽取系统，按 F3 三选一，有 R/SR/SSR/UR 等级，最多 25 个天赋

Kimi 调用 Skill → 解析为 FeatureBlueprint → 调用本地引擎组装代码 → 返回完整文件 diff
```

---

## 二、核心设计原则

### 原则 1：Feature 是基本单位，而非 Ability
一个 Feature 可以包含：
- 自定义资源系统（如"灵能"）
- 自定义输入系统（如按键绑定）
- Ability / Modifier 效果
- Panorama UI 组件
- NetTable 数据定义
- Precache 资源声明

### 原则 2：三层 Pattern 体系
| 层级 | 稳定性 | 来源 | LLM 参与度 |
|------|--------|------|-----------|
| **System Patterns** | 极高 | 预定义模板 | **0%** |
| **Ability/Modifier Patterns** | 高 | x-template + 开源代码库 | **10%**（只填边界数值/条件） |
| **UI Patterns** | 中高 | x-template Panorama 组件 | **20%**（样式/布局微调） |

**System Patterns** 涉及资源管理、网络同步、单例生命周期，一旦出错会导致整个游戏崩溃或不同步，**必须由模板提供，不允许 LLM 生成**。

### 原则 3：Blueprint 是唯一的中间表示（IR）
自然语言首先被转换为结构化的 `FeatureBlueprint`，然后由引擎进行 Pattern 检索和代码组装。LLM **绝不直接输出代码文件**，只输出配置。

### 原则 4：项目状态感知
引擎必须能够读取现有项目的状态：
- 已有哪些自定义资源系统？（避免重复注册"灵能"）
- 已占用了哪些按键？（避免 D 键冲突）
- NetTable 中已定义的类型？
- Precache 列表中已有的资源？

---

## 三、技术架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            接口层 (Interface Layer)                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────────┐  │
│  │  MCP Server │    │ Kimi Skill  │    │      CLI (dota2-dev-copilot)    │  │
│  │  (Cursor)   │    │  (Kimi CLI) │    │  $ dota2-ai generate-feature    │  │
│  └──────┬──────┘    └──────┬──────┘    └────────────────┬────────────────┘  │
│         └────────────────────┘                           │                  │
│                            │                             │                  │
└────────────────────────────┼─────────────────────────────┼──────────────────┘
                             │                             │
                             ▼                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         编排层 (Orchestration Layer)                         │
│              ┌───────────────────────────────────────────┐                  │
│              │         Pipeline: generateFeature()       │                  │
│              │  1. NL → FeatureBlueprint (LLM/规则解析)  │                  │
│              │  2. Project State Scan (扫描现有项目状态)  │                  │
│              │  3. Pattern Resolution (解析需要的 Pattern)│                  │
│              │  4. Feature Assembly (跨文件代码组装)      │                  │
│              │  5. Validation & Diff Generation           │                  │
│              └───────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          核心引擎层 (Core Engine)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  blueprint/  │  │  template/   │  │   pattern/   │  │  project-state  │ │
│  │   Parser     │  │   Engine     │  │   Library    │  │     Scanner     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │   kv-gen/    │  │   diff-gen/  │  │  validator/  │  │  wiring-engine  │ │
│  │   Engine     │  │   Engine     │  │              │  │ (数据流连接)     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            资源层 (Asset Layer)                              │
│  ┌──────────────┐  ┌─────────────────────┐  ┌───────────────────────────┐   │
│  │  x-template/ │  │     patterns/       │  │       dota-api/           │   │
│  │  (骨架模板)   │  │  (系统+能力+UI片段)  │  │    (类型定义+API文档)      │   │
│  └──────────────┘  └─────────────────────┘  └───────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 四、模块详细设计

### 4.1 FeatureBlueprint 层

FeatureBlueprint 是连接自然语言和代码的桥梁，能够表达跨系统的复杂需求。

```typescript
interface FeatureBlueprint {
  name: string;
  description: string;
  version: string;

  // 该 Feature 需要的子系统功能
  features: {
    customResource?: CustomResourceFeature;
    customInput?: CustomInputFeature;
    abilityEffect?: AbilityEffectFeature;
    modifiers?: ModifierFeature[];
    uiComponents?: UIComponentFeature[];
    dataSystem?: DataSystemFeature;      // 如天赋库、卡牌池
    ruleEngine?: RuleEngineFeature;      // 如合成规则、抽取规则
  };

  // 跨系统数据流连接
  wiring: WiringConnection[];
}

// --- 子系统 Feature 定义 ---

interface CustomResourceFeature {
  resourceId: string;
  displayName: string;
  pattern: 'mana_like' | 'charge_like' | 'combo_point' | 'rage';
  maxValue: number;
  regenPerSecond?: number;
  netTableSync: boolean;
  cost?: number; // 默认消耗，可被具体调用覆盖
}

interface CustomInputFeature {
  key: string;
  inputMode: 'keypress' | 'keypress_with_mouse_direction' | 'keypress_with_cursor_target';
  clientEvent: string; // 发送到服务端的 Custom Game Event 名称
}

interface AbilityEffectFeature {
  executorType: 'instant_cast' | 'modifier_motion_horizontal' | 'modifier_motion_vertical';
  effects: Array<
    | { type: 'dash'; distance: number; speed: number; direction: 'caster_forward' | 'mouse_cursor' }
    | { type: 'invulnerable'; duration: number }
    | { type: 'damage_aoe'; radius: number; damage: number; damageType: DamageTypes }
    | { type: 'projectile_linear'; speed: number; radius: number }
  >;
}

interface UIComponentFeature {
  type: 'resource_bar' | 'key_hint' | 'selection_modal' | 'inventory_grid';
  // ... 根据组件类型有不同的配置
}

interface DataSystemFeature {
  // 用于天赋抽取、卡牌库等数据驱动系统
  dataType: 'talent_pool' | 'card_pool' | 'item_pool';
  maxEntries?: number; // 如最多 25 个天赋
  rarityTiers?: string[]; // ['R', 'SR', 'SSR', 'UR']
}

interface RuleEngineFeature {
  // 合成规则、抽取规则等
  rules: Array<{
    trigger: 'on_acquire' | 'on_combine' | 'on_draw';
    condition: string; // 简单的 DSL 表达式
    action: 'combine_into' | 'upgrade' | 'trigger_effect';
    target: string;
  }>;
}

interface WiringConnection {
  id: string;
  from: string; // 例如: "customInput.psionic_dash_requested"
  to: string;   // 例如: "customResource.consume"
  condition?: string;
  dataMap?: Record<string, string>;
}
```

### 4.2 Pattern Library（三层结构）

```
patterns/
├── systems/                           # 系统级 Pattern（极高稳定性）
│   ├── custom_resource/
│   │   ├── mana_like/
│   │   │   ├── server_core.ts.template
│   │   │   ├── net_table_defs.ts.fragment
│   │   │   └── panorama_bar.tsx.template
│   │   └── charge_like/
│   ├── custom_input/
│   │   ├── keypress/
│   │   │   ├── panorama_binding.ts.fragment
│   │   │   └── server_event_handler.ts.fragment
│   │   └── keypress_with_mouse_direction/
│   ├── data_system/
│   │   ├── talent_pool/
│   │   │   ├── server_manager.ts.template
│   │   │   ├── panorama_selection_modal.tsx.template
│   │   │   └── net_table_schema.json
│   │   └── card_pool/
│   └── rule_engine/
│       └── simple_combiner/
├── abilities/                         # 能力级 Pattern
│   ├── dash_horizontal/
│   ├── invulnerability_frame/
│   ├── damage_aoe_instant/
│   └── projectile_linear/
├── modifiers/                         # Modifier 级 Pattern
│   ├── modifier_motion_dash/
│   ├── modifier_invulnerable/
│   └── modifier_dot_damage/
└── ui/                                # UI 级 Pattern
    ├── resource_bar/
    ├── key_hint/
    ├── selection_modal/
    └── inventory_grid/
```

### 4.2.1 Pattern 实例化机制：基类 + 子类覆写

System Pattern 不是直接生成一堆零散函数，而是提供一个**可复用的基类**，Feature 的具体参数通过**子类覆写方法**来实例化。

**例子：`custom_resource/mana_like`**

Pattern 提供基类：
```typescript
// patterns/systems/custom_resource/mana_like/server_core.ts.template
export abstract class BaseResourceSystem {
    abstract getResourceId(): string;
    abstract getDisplayName(): string;
    abstract getMaxValue(): number;
    abstract getRegenRate(): number;

    private resources: Map<PlayerID, number> = new Map();

    init() {
        Timers.CreateTimer(1.0, () => this.tickRegen());
    }

    consume(playerId: PlayerID, amount: number): boolean {
        const current = this.resources.get(playerId) || 0;
        if (current < amount) return false;
        this.resources.set(playerId, current - amount);
        this.syncToClient(playerId);
        return true;
    }

    // ... 其他通用逻辑
}
```

Feature 生成子类：
```typescript
// 由引擎自动生成
export class PsionicEnergySystem extends BaseResourceSystem {
    getResourceId() { return 'psionic_energy'; }
    getDisplayName() { return '灵能'; }
    getMaxValue() { return 100; }
    getRegenRate() { return 2; }
}
```

**优势**：
- 基类逻辑经过验证，不会被 LLM 篡改
- 子类只做声明式覆写，几乎不可能出错
- 新增 Feature 时，如果模式相同，只需要改几行配置

### 4.2.2 Template Engine：Handlebars + ts-morph 混合

不同层级的 Pattern 使用不同的代码生成策略：

| 场景 | 技术 | 原因 |
|------|------|------|
| **System Pattern 核心文件** | Handlebars 文本模板 | 结构固定，变量替换简单直观 |
| **Ability/Modifier 骨架** | Handlebars 文本模板 | x-template 代码风格稳定，模板可读性高 |
| **跨文件 import 注入** | `ts-morph` AST | 精确管理引用关系，避免 import 遗漏 |
| **现有文件追加内容**（如 `net_tables.d.ts`） | `ts-morph` AST | 不能覆盖原有内容，必须精确插入 |
| **KV 文件追加** | 文本 append | KV 不是 TS，无需 AST |

**工作流程**：
1. Handlebars 渲染出

引擎在生成代码前，必须扫描现有项目，避免冲突和重复。

```typescript
interface ProjectState {
  // 已注册的自定义资源
  customResources: Array<{ id: string; displayName: string }>;
  // 已占用的按键绑定
  keyBindings: Array<{ key: string; featureName: string }>;
  // 已有的 NetTable 类型定义
  netTableTypes: string[];
  // 已有的 Custom Game Events
  gameEvents: string[];
  // 已有的 Ability/Modifier 名称
  abilityNames: string[];
  modifierNames: string[];
  // Precache 列表
  precachedResources: string[];
}
```

**应用场景**：
- 如果用户说"我要一个新的灵能护盾"，但项目中已有 `psionic_energy` 系统，则只复用，不重新生成核心。
- 如果 D 键已被占用，引擎在生成 diff 时自动选择下一个可用按键，或在报告中提示冲突。

### 4.4 代码组装与 Diff 生成

生成的不是一个孤立的文件，而是对多个现有文件的**修改（Patch）**。引擎需要：
1. 从 Pattern Library 读取模板
2. 实例化模板（替换变量名、数值、资源路径）
3. 使用 AST 操作将代码片段插入正确的位置
4. 生成人类可读的 diff 报告

**关键技术**：
- `@typescript-eslint/parser` 解析现有文件和模板
- `recast` 或 `ts-morph` 进行 AST 级代码注入
- Handlebars 做简单的文本级模板渲染

### 4.5 KV Generator 与 x-template 的兼容

x-template 本身已有 `excels/技能表.xlsx` → `scripts/npc/abilities.txt` 的 KV 生成流程。我们的策略是：
- **短期**：在 `npc_abilities_custom.txt` 中直接追加生成的 KV 片段，保证立即可用
- **中期**：生成对应的 Excel 表行数据（可选，便于原 x-template 工作流兼容）
- **长期**：完全从 TS 装饰器/类属性反向推导 KV，取代 Excel 流程

### 4.6 MCP Server 与 Skill 接口

**MCP Tools**：
- `dota2_generate_feature(naturalLanguage: string)` —— 端到端生成 Feature
- `dota2_resolve_blueprint(naturalLanguage: string)` —— 仅输出 Blueprint JSON（供调试）
- `dota2_search_pattern(query: string, layer: 'system' | 'ability' | 'modifier' | 'ui')` —— 检索 Pattern
- `dota2_validate_project()` —— 扫描并验证整个项目的一致性
- `dota2_preview_diff(featureBlueprint: string)` —— 预览生成结果但不写入文件

**Kimi Skill**：
- `SKILL.md`：定义触发条件（当用户要求生成 Dota2 游廊功能时触发）
- `scripts/generate_feature.py`：调用本地 Node CLI 的 bridge
- `scripts/validate.py`：快速运行验证

---

## 五、Demo 目标分析

### Demo 1：灵能冲刺（Psionic Dash）—— MVP 目标
**复杂度**：★★★☆☆

这个 Feature 横跨 4 个子系统：
1. 自定义资源系统（灵能）
2. 自定义输入系统（D键+鼠标方向）
3. 效果执行系统（位移+无敌）
4. UI 展示系统（灵能条+按键提示）

**为什么选它做 MVP？**
- 足够复杂，能验证**跨系统 Feature 组装**的核心能力
- 不涉及复杂的持久化数据或规则引擎
- 用户可以立刻在游戏中体验到反馈（按 D 键冲刺）
- 能充分展示"零代码"的价值：传统开发这个 Feature 需要写 5+ 个文件

### Demo 2：天赋抽取（Talent Draw）—— v0.2 旗舰目标
**复杂度**：★★★★★

这个 Feature 涉及：
1. **数据系统**：天赋池（R/SR/SSR/UR 分级）、玩家已拥有天赋（最多 25 个）
2. **规则引擎**：抽取概率、部分天赋的自动合成规则
3. **UI 系统**：三选一弹窗、天赋背包展示
4. **输入系统**：F3 键触发抽取
5. **效果应用系统**：数值天赋（+10 攻击力）通过 Modifier 应用；机制天赋（获得新技能）通过 Ability 注册
6. **网络同步**：天赋状态需要在 NetTable 中实时同步给客户端 UI

**为什么不适合和灵能冲刺同时做？**
- 它的核心挑战不是"代码组装"，而是**数据驱动 + 规则引擎 + 复杂 UI 状态管理**
- 需要我们先建立稳固的 System Pattern 基础（尤其是数据系统和规则引擎），否则会变成 LLM 生成大量不可维护的 UI 和规则代码
- 天赋中的"机制天赋"可能会动态生成新的 Ability/Modifier，这对项目状态感知和命名空间管理提出了更高要求

#### 天赋抽取的核心设计决策

**1. 天赋数据存储：Inline TypeScript 数组（Demo 期）**

Phase 5 初期，天赋池定义直接内嵌在生成的 `talent_manager.ts` 中：
```typescript
const TALENT_POOL: TalentDefinition[] = [
  { id: 'talent_attack_10', name: '锐锋', rarity: 'R', type: 'stat', damage: 10 },
  { id: 'talent_psionic_dash', name: '灵能觉醒', rarity: 'SSR', type: 'mechanic', abilityName: 'psionic_dash' },
];
```

- **原因**：与代码生成引擎集成最简单，无需处理额外的 JSON/Excel 解析链路
- **后续扩展**：可支持从 JSON 文件或 `excels/天赋表.xlsx` 导入数据

**2. 机制天赋的实现方式：预注册已有 Ability（强烈推荐）**

机制天赋（如"获得火焰冲刺"）**不是**在天赋 Pattern 内部嵌套 Ability 代码生成，而是引用一个**已存在的 Ability/Feature**：
```typescript
if (talent.type === 'mechanic') {
    hero.AddAbility(talent.abilityName); // abilityName 指向已生成的 psionic_dash
}
```

- **原因**：保持天赋系统"纯数据驱动"，避免在数据 Pattern 里嵌套复杂的代码生成逻辑
- **工作流程**：用户先用 Feature 生成器创建 `psionic_dash`，再将其注册为可抽取的天赋

**3. 合成规则引擎：最小化 AND 组合**

首期只支持"拥有 A 和 B 就自动合成 C"的规则：
```typescript
{ required: ['talent_fire_1', 'talent_fire_2'], result: 'talent_fire_3', consumeInputs: true }
```

- OR 组合、数量阈值等高级规则在后续版本中扩展

**结论**：
- **先做灵能冲刺**，验证"自然语言 → Blueprint → 跨系统代码组装 → 可运行"的完整链路
- **再做天赋抽取**，在它的开发过程中沉淀出 `data_system` 和 `rule_engine` 的 System Pattern，这将是产品的真正护城河

---

## 六、Fallback 策略：当 Pattern 库中找不到对应代码时

### 策略 1：模式分解（Pattern Decomposition）—— 首选
复杂的新机制往往可以拆解为已知 Pattern 的组合。

**例子**："灵能冲刺" = `custom_resource` + `key_binding` + `dash_modifier` + `invulnerability_modifier`

**实现**：FeatureBlueprint Parser 中内置 `decompose` 模块，将用户描述映射为元机制组合。如果一个需求无法被单一 Pattern 覆盖，系统会尝试用 2-4 个 Pattern 组合实现。

### 策略 2：Pattern 参数化（Parameterized Pattern）—— 次选
很多"新机制"其实只是在已有 Pattern 上改变参数。

**例子**："向鼠标方向冲刺" vs "向前方冲刺"
- 不是两个不同的 Pattern，而是同一个 `dash_horizontal` Pattern 的 `direction` 参数不同
- `direction: 'mouse_cursor'` 在模板内部已经预置了对应的代码分支

**好处**：不需要 LLM 写方向计算代码，引擎直接插入已知正确的代码片段。

### 策略 3：LLM 生成"补洞代码"（LLM Gap-Filling）—— 慎用
**触发条件**：
- 模式分解和参数化均失败
- 需求包含独特的自定义算法（如特殊的伤害衰减公式）

**严格约束**：
- 只填充一个**已有函数签名内部**
- 长度限制在 **30 行以内**
- Prompt 中必须注入相关的 API 文档片段和参考代码
- 生成后必须通过 **tsc + Domain Validator + ESLint** 三重检查
- 任何一关失败，**立即降级到专家模式**（不重试）

**绝对禁止 LLM 生成**：
- System Pattern 的核心代码（资源管理、网络同步）
- 完整的 Ability/Modifier 类定义
- NetTable 类型声明
- 跨文件引用关系

### 策略 4：专家模式（Expert Mode）—— 兜底
当系统置信度 < 0.6 时，拒绝自动生成，转为引导用户手动拼装。

**系统行为**：
```text
⚠️ 系统无法高置信度地解析你的需求。

可能原因：
1. 描述中包含未被 Pattern 库覆盖的全新机制
2. 涉及过多未定义的自定义逻辑

请选择：
[A] 用 Feature Blueprint 表单手动配置（推荐）
[B] 提供一个代码骨架，由你填充核心逻辑
[C] 详细描述以下信息：
   - 涉及哪些子系统？（资源/输入/Ability/UI/数据/规则）
   - 核心效果是什么？（位移/伤害/控制/增益/召唤）
   - 是否有参考的游戏或技能？
```

### 策略 5：学习模式（Learning Mode）—— 长期进化
当用户通过专家模式成功实现了一个新机制后，系统可将其抽象为新的 Pattern。

**流程**：
1. 用户提交一段成功的自定义代码
2. 运行 `pattern_extract` 脚本，去除项目特定硬编码，提取通用结构
3. 人工审核后入库
4. 下次遇到类似需求时直接复用

---

## 六、参考仓库与 Phase 2 Pattern 提取策略

我们已获取两个大型 Dota 2 游廊开源仓库作为 Pattern 提取来源：
- `Angel-Arena-Reborn` (https://github.com/CryDeS/Angel-Arena-Reborn/)
- `dota_imba` (https://github.com/EarthSalamander42/dota_imba)

它们的主要代码位于 `./game/scripts/vscripts/` 下。

### 6.1 仓库评估

| 维度 | Angel Arena Reborn | dota_imba |
|------|-------------------|-----------|
| 代码风格 | 原始 Lua，`class({})` | 原始 Lua，`class({})` |
| 机制丰富度 | ★★★★☆（dash、blink、aura、百分比伤害、召唤 scaling） | ★★★★★（Hook、法球框架、击退库、Blink 变体） |
| 代码质量 | 中等，有硬编码和 TODO | 较高，有大量可复用通用 modifier |
| 最佳用途 | 补充特定机制 | **Pattern Library 核心来源** |

### 6.2 高价值 Pattern 清单

按优先级排序：

| Pattern | 来源 | 价值 | 状态 |
|---------|------|------|------|
| `modifier/knockback_parabolic` | dota_imba `modifier_generic_knockback_lua` | ★★★★★ 物理击退通用库，使用正确的运动控制器 | 待翻译 |
| `modifier/orb_effect_framework` | dota_imba `modifier_generic_orb_effect_lua` | ★★★★★ 法球效果完整框架 | 待翻译 |
| `ability/blink_with_clamp_and_penalty` | dota_imba `item_blink.lua` | ★★★★☆ 含超距 clamping、受击惩罚、双键回泉水 | 待翻译 |
| `ability/projectile_linear_with_pullback` | dota_imba `hero_pudge.lua` | ★★★★☆ 线性投射物 + 命中拖拽返回 | 待翻译 |
| `modifier/summon_scaling` | Angel Arena `modifier_summon.lua` | ★★★☆☆ 基于游戏时间的动态属性增长 | 待翻译 |
| `modifier/invulnerability_frame` | 两仓库的 CheckState 组合 | ★★★★☆ 可直接参考 | 待翻译 |
| `ability/dash_horizontal` | Angel Arena `dash.lua` | ★★☆☆☆ 手动 SetAbsOrigin 方式过时，**仅参考碰撞追踪逻辑**，运动部分需重写 | 待重构 |

### 6.3 API 更迭要求

这些仓库基于较老 Lua API，必须对照 `dota2_api/` 进行现代化才能用于 x-template：

| 旧写法 | 现代 x-template 等价 | 说明 |
|--------|---------------------|------|
| `my_ability = class({})` | `@registerAbility() class ... extends BaseAbility` | tstl 装饰器 |
| `LinkLuaModifier(...)` | `@registerModifier() class ... extends BaseModifier` | tstl 自动注册 |
| `CustomNetTables:SetTableValue(...)` | `XNetTable.SetTableValue(...)` | x-template 网络层封装 |
| `Timers:CreateTimer(...)` | x-template `timer_utils.ts` / `timers.ts` | 需适配 |
| `MODIFIER_PROPERTY_EXTRA_HEALTH_BONUS` | `ModifierFunction.EXTRA_HEALTH_BONUS` | 枚举名更新 |
| `PATTACH_CUSTOMORIGIN` | `ParticleAttachment.CUSTOMORIGIN` | 枚举名更新 |
| `ACT_DOTA_FLAIL` | `GameActivity.DOTA_FLAIL` | 枚举名更新 |
| `caster:HasTalent(...)` | 移除 / 替换为 `GetSpecialValueFor` | 自定义天赋系统不在 x-template 中 |

### 6.4 Phase 2 提取策略

**绝不现在就开始翻译这些仓库**。Phase 1 的目标是建立"从 Blueprint 到可编译代码"的管道，没有管道，再多的 Pattern 也无法组装。

**Phase 2 的标准操作流程**：
1. 从仓库中选定一个待翻译的 modifier/ability 文件
2. 阅读原始 Lua，理解其核心机制（忽略 talent 硬编码、项目特定逻辑）
3. 去除硬编码数值，替换为 `GetSpecialValueFor` 或 Blueprint 参数
4. 将 Lua 语法翻译为 TypeScript/tstl 语法
5. 对照 `dota2_api/` 更新所有 API 调用
6. 放入 `patterns/` 目录，编写对应的 Handlebars 模板
7. 运行验证：用该 Pattern 生成一个测试 Feature，确保通过 `tsc`

---

## 七、开发阶段与里程碑

### Phase 0: 基础设施与 x-template 深度解析（第 1 周）
**目标**：搭建项目骨架，彻底理解 x-template 的约束和扩展点。

**交付物**：
- [ ] Monorepo 结构（pnpm workspace）
- [ ] `packages/blueprint` —— FeatureBlueprint JSON Schema + TypeScript 类型定义
- [ ] `packages/project-scanner` —— 扫描现有 x-template 项目状态的基础能力
- [ ] 解析 x-template 的关键机制：
  - `registerAbility` / `registerModifier` 装饰器的元数据
  - `XNetTable` 的扩展方式
  - `keybinding.ts` 的注册和事件分发模式
  - `excels/` → KV 的现有流程
- [ ] 测试框架（Vitest）

### Phase 1: 系统级 Pattern 库（第 2-3 周）
**目标**：建立最核心、最稳定的 System Pattern，支撑 MVP Demo。

**交付物**：
- [ ] `custom_resource/mana_like` Pattern（服务器核心 + NetTable + UI 血条）
- [ ] `custom_input/keypress_with_mouse_direction` Pattern（Panorama 绑定 + Custom Game Event）
- [ ] `ability/dash_horizontal` Pattern + `modifier/modifier_motion_dash` Pattern
- [ ] `modifier/invulnerability_frame` Pattern
- [ ] `ui/resource_bar` Pattern + `ui/key_hint` Pattern
- [ ] `template-engine` 支持跨文件代码组装和 AST 注入
- [ ] **里程碑 1**：能用 Blueprint 手动组装出"灵能冲刺"的所有文件

### Phase 2: 编排层与验证层（第 4 周）
**目标**：跑通"Blueprint → 代码 → Diff → 验证"的完整流水线。

**交付物**：
- [ ] `wiring-engine`：根据 Blueprint `wiring` 字段连接各子系统
- [ ] `diff-engine`：生成人类可读的文件变更报告
- [ ] `validator`：
  - `tsc` 编译检查
  - NetTable 定义一致性检查
  - Custom Game Event 重复注册检查
  - Ability/Modifier 名称冲突检查
- [ ] `kv-gen`：生成 `npc_abilities_custom.txt` 追加片段
- [ ] **里程碑 2**：输入一个手写的 FeatureBlueprint，自动输出可编译的项目 diff

### Phase 3: 效果组合与 CLI 交互 ✅ 已完成

**目标**：将系统从"基础代码生成器"升级为"智能功能组合平台"。

**架构设计**：
```
Layer 1: Blueprint Schema Extensions
  ├── EffectComposer: sequential / parallel / conditional 组合模式
  ├── AbilityVariants: Toggle / Charge / Channel / MultiStage
  └── VisualEditorMetadata
Layer 2: Smart Composition Engine
  ├── EffectCombiner: 效果兼容性分析 + 组合代码生成
  ├── ModifierAutoRegistry: 自动发现/冲突检测/注册表生成
  └── ParticleSystemBridge
Layer 3: Developer Experience
  ├── InteractiveCLI: wizard / analyze / visualize / compose
  └── ValidationDiagnostics
```

**交付物**（全部完成）：
- [x] `packages/blueprint/src/composition.ts` — ComposedEffect / EffectStage / AbilityVariant 等 10+ 新类型
- [x] `packages/feature-assembler/src/composer.ts` — EffectComposer 三种组合模式
- [x] `packages/feature-assembler/src/modifier-registry.ts` — ModifierAutoRegistry
- [x] `apps/cli/src/wizard.ts` — wizard / analyze / visualize / compose 命令
- [x] 效果类型扩展：knockback / stun / silence / heal / buff / particle / custom

**已知限制**：
- Wizard 命令为模拟模式（硬编码默认值，非真实交互）
- `delayBetweenStages` 未实际实现

### Phase 4: 可视化 Blueprint 编辑器 🔸 暂停维护

> **决策（2026-04-03）**：MVP 目标聚焦 LLM 接入后自动产出代码，Editor 作为可视化辅助工具暂时搁置。核心管线（Blueprint JSON → FeatureAssembler → 代码）不依赖 Editor，CLI 和 MCP Server 已覆盖其功能。代码保留在 `apps/editor/`，后续有需要时可恢复开发。

**已完成**：
- [x] 拖拽式节点编辑器（Dash/Stun/Damage AoE/Invulnerable/Heal/Knockback/Particle）
- [x] 属性面板 + 代码预览（Blueprint JSON / TypeScript / KV 三标签页）
- [x] `pnpm cli editor` 一键启动 localhost:3000
- [x] 导出 JSON

**已知问题（未修复）**：
- 后端 `/api/compose` 依赖 Phase 3 模块导入，可能报错
- 后端 `/api/generate` 未实现（TODO）
- `/api/validate` 未连接实际验证逻辑

**搁置的待完善项**：
- 撤销重做、复制粘贴、保存加载、节点分组、条件分支
- 直接写入项目、实时预览到 Dota 2、多人协作
- 自然语言转节点、智能推荐、自动平衡

### Phase 5: Pattern 验证生态 🔄 进行中（50%）

**目标**：确保每个 Pattern 通过 TypeScript + tstl 编译 + 运行验证。

**已完成**：
- [x] Step 1: Pattern 结构验证 (`packages/pattern-validator/`)
- [x] Step 2: TypeScript 编译检查
- [x] CLI 集成：`pnpm cli validate-pattern` / `pnpm cli test-pattern`

**进行中 / 待完成**：
- [ ] Step 3: tstl 编译检查（待完善）
- [ ] Step 4: 单元测试框架 (`packages/pattern-test-kit/`)
  - Mock 工具：createMockHero / createMockAbility / simulateGameTime / resetGameState
  - 测试结构：每个 Pattern 目录下 `test/unit.spec.ts` + `test/integration.spec.ts`
- [ ] Step 5: CI/CD 集成（GitHub Actions，paths: patterns/**）

**验收标准**：
| Step | 验收条件 | 状态 |
|------|---------|------|
| 1 | `validate-pattern` 可用，检测文件缺失 + JSON 语法错误 | ✅ |
| 2 | `test-pattern` 可用，编译通过 + 详细报告 | ✅ |
| 3 | tstl 编译检查集成到 validate-pattern | ⏳ |
| 4 | weighted_pool 有完整单元测试 | ⏳ |
| 5 | GitHub Actions 自动验证 PR | ⏳ |

### Phase 6: LLM 接入与 Blueprint 智能编排 ⏳ 待开始

**前置条件**：Phase 1-5 系统基础设施就绪。

**目标**：实现自然语言 → FeatureBlueprint 的端到端编排，让用户可以用自然语言描述需求，系统自动解析、检索 Pattern、生成完整代码。

**架构**：
```
┌─────────────────────────────────────────────────────────────────┐
│  接口层                                                          │
│  ├── MCP Server (Cursor/Claude) — dota2_generate_feature        │
│  ├── Kimi Skill — SKILL.md + scripts/                           │
│  └── CLI wizard — 真实交互（替换当前模拟模式）                     │
├─────────────────────────────────────────────────────────────────┤
│  编排层                                                          │
│  ├── NL → Blueprint Parser (NLU + JSON Schema 校验)              │
│  ├── Pattern Resolution (语义检索 + 参数化)                       │
│  ├── Project State Scan (冲突检测 + 自动规避)                     │
│  ├── Fallback Chain (分解 → 参数化 → Gap-Filling → 专家模式)     │
│  └── Quality Gate (置信度检测 + 三重校验)                         │
├─────────────────────────────────────────────────────────────────┤
│  LLM 能力层                                                     │
│  ├── Prompt Engineering (System Prompt + Mechanic Ontology)      │
│  ├── Multi-provider (OpenAI / Anthropic / 智谱)                  │
│  └── Pattern Embedding (ChromaDB 语义检索)                       │
└─────────────────────────────────────────────────────────────────┘
```

#### Step 1: NLU Prompt 设计（2-3 天）

**交付物**：
- [ ] System Prompt v1（注入 Pattern Catalog + Mechanic Ontology + API 约束）
- [ ] Few-shot 示例集（5-10 个覆盖不同复杂度的 Blueprint）
- [ ] JSON Schema 强校验层（reject 非 FeatureBlueprint 格式的输出）
- [ ] 置信度评分机制（< 0.6 自动降级到专家模式）

**核心约束**：
- LLM **只输出** FeatureBlueprint JSON，绝不直接输出代码文件
- System Pattern 核心代码禁止 LLM 生成
- Gap-Filling 代码限制 30 行以内

#### Step 2: MCP Server 开发（3-4 天）

**位置**：`mcp-server/`（当前为空目录）

**Tools**：
| Tool | 功能 |
|------|------|
| `dota2_generate_feature(nl)` | 端到端：自然语言 → 代码 diff |
| `dota2_resolve_blueprint(nl)` | 仅输出 Blueprint JSON（调试用） |
| `dota2_search_pattern(query, layer)` | Pattern 语义检索 |
| `dota2_validate_project()` | 扫描项目一致性 |
| `dota2_preview_diff(blueprint)` | 预览不写入 |

**集成**：使用 `@modelcontextprotocol/sdk`，支持 Cursor / Claude Desktop 接入。

#### Step 3: Kimi Skill 开发（2-3 天）

**位置**：`kimi-skill/`（当前为空目录）

**交付物**：
- [ ] `SKILL.md` — 触发条件定义
- [ ] `scripts/generate_feature.py` — 调用本地 Node CLI 的 bridge
- [ ] `scripts/validate.py` — 快速验证
- [ ] 端到端测试：Kimi CLI 输入自然语言，返回文件 diff

#### Step 4: CLI Wizard 升级（2 天）

**当前状态**：`apps/cli/src/wizard.ts` 为模拟模式（硬编码默认值）。

**升级内容**：
- [ ] 接入 LLM，实现真实自然语言交互
- [ ] 模糊需求追问（置信度 < 0.6 时触发）
- [ ] 智能推荐（基于已有 Pattern + 项目状态）
- [ ] 专家模式兜底（引导用户手动拼装 Blueprint）

#### Step 5: 端到端验证（2-3 天）

**Demo A（Cursor + MCP）**：
```
用户：我要一个灵能冲刺系统，按 D 键消耗灵能向鼠标方向位移一段距离，并且无敌 0.4 秒
→ AI 自动输出 FeatureBlueprint + 代码 diff
→ 验证：tsc 编译通过 + Dota 2 加载成功
```

**Demo B（Kimi CLI）**：
```
用户 @ kimi-cli: 帮我做一个天赋抽取系统，按 F3 三选一，R/SR/SSR/UR 等级
→ AI 解析为 FeatureBlueprint → 调用本地引擎组装代码 → 返回完整文件 diff
```

**验收标准**：
- [ ] Demo A 端到端跑通
- [ ] Demo B 端到端跑通
- [ ] 置信度检测正常工作（模糊需求自动追问）
- [ ] 专家模式兜底正常（LLM 无法解析时引导手动配置）
- [ ] 代码生成质量：tsc + domain validator + ESLint 三重通过

**风险**：
| 风险 | 应对 |
|-----|------|
| LLM 输出不稳定 | JSON Schema 强校验 + 重试 + 降级 |
| Pattern 检索不准确 | ChromaDB 语义嵌入 + 关键词混合检索 |
| 复杂需求理解偏差 | 分步确认机制 + 专家模式兜底 |

---

### Phase 7: 打磨与发布 ⏳ 待开始

**前置条件**：Phase 1-6 全部完成。

**目标**：发布 v0.1.0。

**交付物**：
- [ ] 两个 Demo 的演示视频
- [ ] README 快速开始指南
- [ ] Pattern 贡献指南（让社区可以提交新 Pattern）
- [ ] CLI 安装包发布到 npm

---

## 八、技术栈

| 层级 | 技术选型 | 理由 |
|------|---------|------|
| **语言** | TypeScript | 与 x-template 一致，类型系统是关键护城河 |
| **包管理** | pnpm + Turborepo | Monorepo 管理，构建快 |
| **模板渲染** | Handlebars + `ts-morph` | Handlebars 做简单文本替换，`ts-morph` 做 AST 级精确注入 |
| **向量检索** | ChromaDB (本地) | 零配置，用于 Pattern 语义检索 |
| **LLM 调用** | OpenAI SDK / Anthropic SDK | 兼容多家，支持模型切换 |
| **MCP** | `@modelcontextprotocol/sdk` | 官方标准 |
| **测试** | Vitest | 快，TS 原生支持 |
| **CLI** | `commander.js` + `chalk` + `ora` | 成熟的 Node CLI 方案 |
| **AST 解析** | `ts-morph` | 比 `@typescript-eslint/parser` 更适合代码生成和修改 |

---

## 九、风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| 开源代码质量参差不齐 | Pattern Library 效果差 | 设定严格的 Pattern 入选标准，只保留通用、无硬编码的代码 |
| x-template 更新导致不兼容 | 模板失效 | 将 x-template 版本锁定在 Pattern 元数据中，定期适配 |
| LLM Blueprint 输出不稳定 | 自然语言理解失败 | JSON Schema 强校验 + 置信度阈值 + 失败时 fallback 到专家模式 |
| 天赋抽取的复杂度超出预期 | 里程碑 5 延期 | 将天赋抽取拆为两阶段：先做基础抽取（无合成），再做规则引擎 |
| 项目状态扫描不准确 | 生成代码冲突 | 使用 AST 解析而非正则扫描，保证准确性 |

---

## 十、下一步行动

**当前阶段**：Phase 5 收尾 + Phase 6 准备

**Phase 5 收尾（本周）**：
1. 完善 Pattern 验证器的 tstl 编译检查
2. 为 weighted_pool 编写单元测试
3. 配置 GitHub Actions CI（paths: patterns/**）

**Phase 6 准备**：
1. 评估 LLM provider 选型（OpenAI / Anthropic / 智谱）
2. 搭建 `mcp-server/` 项目骨架
3. 设计 NLU System Prompt v0（注入 Pattern Catalog + Mechanic Ontology）
4. 将 `apps/cli/src/wizard.ts` 从模拟模式升级为真实 LLM 交互

**下一个可验证的里程碑**：
> 在 Cursor 中通过 MCP Tool 调用 `dota2_generate_feature`，输入自然语言描述，自动生成通过 tsc 编译的 Dota 2 代码 diff。

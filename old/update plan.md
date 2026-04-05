# Dota 2 Dev Copilot — 优化路线图与开发指南

> 本文档记录项目从当前状态达到 **LLM 集成目标** 的完整 5 步优化路径，以及 Architecture v2 错误版本的清理方案。
> 创建日期：2026-04-03 | 基于 `docs/` 教程知识 + `plan.md` 目标 + `LLM_INTEGRATION_ARCHITECTURE.md` 四层模型

---

## 一、背景判断



### 1.1 LLM_INTEGRATION_ARCHITECTURE 的核心洞察（我们的目标）

```
Layer 1: Pattern 库 (预定义, 0% LLM)    ← input_bridge, nettable_sync, talent_applier
Layer 2: Pattern 组合 (Blueprint JSON)     ← LLM 输出配置，不输出代码
Layer 3: 框架代码 (Blueprint 生成)         ← 输入监听、数据同步、事件分发、类型定义
Layer 4: 业务逻辑 (LLM 手写)              ← 天赋效果、UI样式、数值平衡

推荐比例：Blueprint 60-70% / LLM 20-30% / 人工 10%
```

### 1.2 docs/ 教程的价值未被利用

docs/ 下 6 份 ModDota 官方教程（共 ~12000 行）包含 Dota2 开发的完整知识，但当前只是静态 Markdown，LLM 无法精确消费：

| docs 文件 | 行数 | 可提取的核心知识 | 对应 Layer |
|-----------|------|-------------------|-----------|
| `moddota_scripting_typescript.md` | 1583 | Ability/Modifier 完整生命周期、Event/Timer/AsyncAwait | Layer 1 Pattern 参考 + Layer 3 框架模板 |
| `moddota_scripting_systems.md` | 2845 | Custom Resource System, Item Drop, Loot Chest, AI, Particle | Layer 1 System Pattern 来源 |
| `moddota_abilities.md` | 4303 | 全量 Ability API | Layer 4 LLM Prompt 上下文 |
| `moddota_units.md` | 1597 | Unit KV, Building 生成, AI 状态机 | Layer 1 Unit Pattern 来源 |
| `moddota_panorama_docs.md` | 1650 | Panorama TS, Keybinding, React+Webpack | Layer 1 UI Pattern 来源 |
| `LLM_INTEGRATION_ARCHITECTURE.md` | 305 | 4 层模型设计、适用性分析、工作流 | 总体架构指导 |

---


---

## 二、5 步优化路径（核心开发指南）

### Step 1：将 docs/ 教程结构化为 LLM 可消费知识库

**目标**：将 6 份 ModDota 教程从"人读 Markdown"转化为 "机器可消费的结构化知识"

**输入**：
- `docs/moddota_scripting_typescript.md` (1583行 — Ability/Modifier/Event/Timer 完整生命周期)
- `docs/moddota_scripting_systems.md` (2845行 — Custom Resource, Item Drop, AI 等)
- `docs/moddota_abilities.md` (4303行 — 全量 Ability API)
- `docs/moddota_units.md` (1597行 — Unit KV, Building, AI 状态机)
- `docs/moddota_panorama_docs.md` (1650行 — Panorama TS, React, Webpack)
- `docs/LLM_INTEGRATION_ARCHITECTURE.md` (305行 — 4层模型参考)

**输出结构**：
```
knowledge/
├── MEMORY.md                          # [更新] 加入新索引，移除 core/ 引用
├── troubleshooting/                    # [保留] 现有 3 个文件不变
│   ├── ui_not_showing.md
│   ├── keybinding_issues.md
│   └── data_serialization.md
├── patterns/                          # [新建] 从教程提取的 Pattern 规范 (目标: 15-20 个高质量)
│   │
│   │  ═══ 来自 moddota_scripting_typescript.md (4 个) ═══
│   ├── ability_lifecycle.md           # Ability 标准骨架 (@registerAbility→OnSpellStart→Projectile→Damage)
│   ├── modifier_lifecycle.md          # Modifier 声明周期 (CheckState→DeclareFunctions→GetModifierXxx)
│   ├── event_timer_pattern.md         # 事件监听 + Timer + async-await 模式
│   └── tooltip_generation.md          # TypeScript 驱动的 localization 生成
│   │
│   │  ═══ 来自 moddota_scripting_systems.md (9 个!) ═══
│   ├── custom_resource_system.md      # 自定义资源 (Rage/Mana/Energy, ~210行源码)
│   ├── item_restriction_pattern.md    # 物品限制/需求规则系统
│   ├── data_driven_item_drop.md       # 数据驱动掉落系统 (~1320行! 源码丰富)
│   ├── looting_chest_pattern.md       # RPG 风格掉落箱
│   ├── shop_spawning_pattern.md       # 脚本化商店生成
│   ├── zone_damage_pattern.md         # 区域持续伤害 (Lava Damage 模式)
│   ├── filter_pattern.md              # Order Filter / Damage Filter (游戏规则拦截)
│   ├── particle_attachment.md         # 粒子挂载系统 (~480行! ParticleAttachment+SetControlEnt)
│   └── vector_math_utilities.md       # 向量数学工具函数集
│   │
│   │  ═══ 来自 moddota_units.md (6 个) ═══
│   ├── unit_kv_definition.md          # 标准 Unit KV 模板 (npc_dota_creature完整参数)
│   ├── unit_producing_building.md     # 建筑造兵系统 (Hammer + Lua 双模式)
│   ├── timed_unit_spawn.md            # 限时召唤单位 (modifier_kill 模式)
│   ├── simple_unit_ai.md              # 基础单位 AI 行为
│   ├── neutral_ai_state_machine.md    # 中立AI状态机 (Idle→Aggressive→Leash→Returning)
│   └── creature_wearable_pattern.md   # 单位装饰/装备挂载
│   │
│   │  ═══ 来自 moddota_panorama_docs.md (6 个) ═══
│   ├── panorama_ts_setup.md           # Panorama TS 初始化模板 (tsconfig + package.json)
│   ├── panorama_keybinding.md         # 按键绑定 (addoninfo.txt + Game.AddCommand)
│   ├── dota_scene_panel.md            # 3D模型展示面板 (DOTAScenePanel)
│   ├── valve_style_button.md          # Valve 风格按钮 CSS 组件
│   ├── panorama_webpack_setup.md      # Webpack 打包配置 (JS/TS/React/SASS)
│   └── react_hud_component.md         # React HUD 组件 (hooks + useGameEvent + CustomUI)
│
├── api-reference/                      # [新建] 场景化 API 片段 (目标: 5-8 集)
│   ├── ability_api_snippets.md        # 常用 Ability API: GetSpecialValueFor, ApplyDamage, ProjectileManager.CreateTrackingProjectile...
│   ├── modifier_api_snippets.md      # 常用 Modifier API: AddNewModifier, DeclareFunctions, SetStackCount...
│   ├── panorama_api_snippets.md        # 常用 Panorama API: GameEvents.Subscribe, $.Msg, CustomGameEventManager...
│   ├── event_system_snippets.md        # ListenToGameEvent, CustomGameEventManager.Send_ServerToPlayer...
│   └── timer_async_snippets.md         # Timers.CreateTimer, sleep/async-await, OnIntervalThink
└── anti-patterns/                      # [新建] 反模式手册 (~4 个)
    ├── lua_gotchas_in_typescript.md     # Lua 开发者转 TS 常见错误 (nil vs undefined, table vs array...)
    ├── panorama_gotchas.md              # Panorama 常坑 (symlink, XML include 路径, CSS 优先级)
    ├── kv_common_mistakes.md            # KV 配置常见错误 (ScriptFile路径, AbilityValues格式)
    └── nettable_pitfalls.md             # NetTable 同步陷阱 (类型不一致, 更新频率, 客户端延迟)
```

**每个 pattern 文档的标准格式**：
```markdown
# {Pattern 名称}

## 来源
- 原始文档: `docs/{source}.md` 第 {lines} 行
- 对应实现: `patterns/{category}/{name}/` (metadata.json + template)

## 标准代码骨架
\`\`\`typescript
// 这里是从教程中提取的"标准写法"，LLM 应遵循此模式
// [完整代码示例]
\`\`\`

## LLM 边界标记
- ✅ **允许 LLM 写的**: [具体的业务逻辑部分]
- ❌ **禁止 LLM 改的**: [框架代码/类型定义/注册调用]

## 常见变体
- 变体 1: [不同使用场景的变体代码]
- 变体 2: ...

## 相关 API 片段
- 见: `api-reference/{对应snippet}.md`
```

**验收标准**：
- [ ] knowledge/patterns/ ≥ **15 个**高质量规范文档（保守底线 8 个，目标 20）
- [ ] knowledge/api-reference/ ≥ 5 个片段集
- [ ] knowledge/anti-patterns/ ≥ 4 个反模式文档
- [ ] MEMORY.md 已更新索引并移除 core/ 引用
- [ ] 每个 pattern 可独立注入 LLM Prompt

> **为什么能提取 15-20+？** docs 文件的实际内容远超最初估计：
> - `moddota_scripting_systems.md` 包含 **9 个独立系统**（Custom Mana, Item Drop 1320行, Particle Attachment 480行 等），每个都是可直接复用的 Pattern
> - `moddota_units.md` 包含 **6 个章节**（Unit KV, Building, AI 状态机, Wearables）
> - `moddota_panorama_docs.md` 包含 **8 个主题**（Keybinding, ScenePanel, React, Webpack 等）
> - `moddota_scripting_typescript.md` 包含 **4 个核心模式**（Ability/Modifier/Event-Timer/Tooltip）
> - 总计可识别 **27+ 个独立知识条目**，去重合并后保守可得 15-20 个高质量 Pattern 规范

**衔接点**：现有的 `patterns/` (206个文件) 是 Pattern **实现**，knowledge/patterns/ 是 Pattern **规范文档**（告诉 LLM "为什么这样写"）。两者互补。

---

### Step 2：实现 Layer 3 框架代码生成器（带 Gap 标记）

**目标**：让 Template Engine 生成的框架代码明确标注 "LLM 可填充区域"

**关键数据结构**：
```typescript
// Gap Region — 在 template 中标记 LLM 可编辑区域
interface GapRegion {
  id: string;                    // 唯一标识, 如 "on_spell_start_logic"
  type: 'parameter_select' | 'logic_impl'; // [重要] 区分参数选择型 vs 逻辑实现型
  description: string;           // 该区域应实现的功能描述
  
  // === type = 'parameter_select' 时使用 (低复杂度, 3-8行) ===
  options?: string[];            // 可选值列表, 如 ["mouse_cursor", "caster_forward", "caster_target"]
  output_var?: string;           // 选择结果存入的变量名
  
  // === type = 'logic_impl' 时使用 (中高复杂度, 10-30行) ===
  allowed_apis?: string[];       // 允许使用的 API 列表 (Dota2 API 白名单)
  forbidden?: string[];          // 禁止的操作
  max_lines?: number;            // 最大行数限制, 默认 30
  context_refs?: string[];       // 引用的 knowledge/ 文档路径
  hint?: string;                 // 给 LLM 的提示
}
```

> **关于 GapRegion.type 的设计决策（回答"API 参数还是复杂逻辑？"）**
>
> 以 "鼠标方向冲刺 vs 前方冲刺" 为例，差异可能出现在两个层面：
>
> **情况 A — 纯参数差异（不需要 LLM Gap）**：
> ```typescript
> // direction 只是 enum 参数，template 用 {{#if}} 分支处理即可
> const target = this.GetDirection() === 'mouse_cursor'
>   ? this.GetCursorTarget()      // API 1: 鼠标目标点
>   : null;                        // 不需要目标，用前方向量
> ```
> → `type: 'parameter_select'`, options: ["mouse_cursor", "caster_forward"], max_lines: 8
>
> **情况 B — 需要完全不同的计算逻辑（必须 LLM Gap）**：
> ```typescript
> // 鼠标方向需要: 射线检测 + 地面高度 + 向量归一化 + 边界修正
> const mousePos = this.GetCursorPosition();
> const casterPos = this.GetCaster().GetAbsOrigin();
> const direction = (mousePos - casterPos).Normalized();
> const groundZ = GetGroundPosition(direction);   // 射线检测（游戏物理）
> if (groundZ < casterPos.z) { direction.z = casterPos.z; }  // 地形修正
> ```
> → `type: 'logic_impl'`, allowed_apis: ["GetCursorPosition","GetAbsOrigin","Vector","GetGroundPosition"], max_lines: 20
>
> **判断标准**：如果差异仅涉及"调用哪个 API"→ `parameter_select`；如果涉及"算法/数学/游戏物理计算"→ `logic_impl`

 // 元数据文件 (与 template 同目录的 gap_regions.json)
{
  "template": "ability_dash_horizontal.ts.template",
  "gap_regions": [
    {
      "id": "dash_direction_calc",
      "description": "计算位移方向和目标位置",
      "allowed_apis": ["GetCursorTarget", "GetForwardVector", "GetCursorPosition"],
      "forbidden": ["SetAbsOrigin"], 
      "context_refs": ["knowledge/api-reference/ability_api_snippets.md"],
      "max_lines": 15,
      "hint": "根据 direction 参数 ('mouse_cursor' | 'caster_forward') 选择方向计算方式"
    }
  ]
}
```

**生成的代码示例**（以 dash_horizontal 为例）：
```typescript
@registerAbility()
export class {ability_name} extends BaseAbility {
  // === Layer 1: Pattern 库预定义 (0% LLM, 自动生成) ===
  private dashSpeed: number = {dash_speed};
  private dashDistance: number = {dash_distance};
  
  OnSpellStart() {
    const caster = this.GetCaster();
    const duration = this.dashDistance / this.dashSpeed;
    
    // ===== Layer 4: LLM Gap Region (需 LLM 填充) =====
    // [GAP: dash_direction_calc]
    // 描述: 计算位移方向和目标位置
    // 允许 API: GetCursorTarget, GetForwardVector, GetAbsOrigin, Vector
    // 禁止: SetAbs_origin (由框架后续处理)
    // 参考: knowledge/api-reference/ability_api_snippets.md
    // 最大行数: 15
    // 提示: 根据 direction 参数选择 'mouse_cursor' 或 'caster_forward'
    // ===== BEGIN LLM FILL (≤15 lines) =====
    
    __LLM_GAP_DASH_DIRECTION_CALC__
    
    // ===== END LLM FILL =====
    
    // === 回到 Layer 3: 框架代码继续 (自动生成) ===
    caster.AddNewModifier(caster, this, 'modifier_motion_dash', {
      duration: duration,
      targetX: __GAP_OUTPUT_target_x__,   // 引用 Gap 输出变量
      targetY: __GAP_OUTPUT_target_y__,
    });
  }
}
```

**需要改造的 Top 5 核心 Pattern**（按优先级）：
1. `patterns/systems/mechanics/input_bridge.ts.template` — 事件处理逻辑 Gap
2. `patterns/systems/mechanics/talent_applier.ts.template` — 天赋效果应用 Gap
3. `patterns/systems/data_system/weighted_pool.ts.template` — 抽取规则 Gap
4. `patterns/abilities/dash_horizontal.ts.template` (如存在) — 方向计算 Gap
5. `patterns/ui/selection_modal.tsx.template` — 样式/交互逻辑 Gap

**验收标准**：
- [ ] `GapRegion` TypeScript 类型定义完成
- [ ] Top 5 Pattern 的 `gap_regions.json` 元数据创建完毕
- [ ] Template Engine 能输出带 Gap 标记的代码
- [ ] 每个 Gap 区域可自动生成专用 Prompt 片段（含 context_refs 注入）

---

### Step 3：构建 LLM Context Injection 系统

**目标**：根据用户需求动态组装高质量的 System Prompt

**新建包**：`packages/llm-context/`

```
packages/llm-context/
├── src/
│   ├── types.ts                         # ContextPackage, Section, Constraint 类型
│   ├── context-assembly.ts              # 核心：按需组装上下文
│   ├── pattern-catalog.ts               # 扫描 patterns/ 目录生成可用 Pattern 清单
│   ├── mechanism-ontology.ts            # 效果/目标/行为类型分类体系
│   ├── api-constraints.ts                # API 使用安全约束规则
│   └── prompt-templates.ts             # System Prompt 模板引擎
├── templates/
│   ├── system-prompt-base.txt          # 基础 System Prompt 模板
│   ├── gap-fill-prompt.txt              # Gap 填充专用 Prompt
│   ├── blueprint-review-prompt.txt       # Blueprint 审核专用 Prompt
│   └── fallback-expert-prompt.txt        # 专家模式引导 Prompt
└── package.json
```

**ContextAssembly 工作流**：
```
用户自然语言输入
    ↓
[1] 分析需求 → 识别涉及的子系统 (custom_resource? ability_effect? ui?)
    ↓
[2] 从 pattern-catalog 匹配相关 Pattern
    ↓  
[3] 从 knowledge/ 加载:
    - pattern 规范 (knowledge/patterns/)
    - API 片段 (knowledge/api-reference/)
    - 反模式警告 (knowledge/anti-patterns/)
    ↓
[4] 从 project-scanner 获取当前项目状态 (已有包)
    ↓
[5] 从 mechanism-ontology 应用约束
    ↓
[6] 组装最终 ContextPackage → 渲染为 System Prompt
```

**System Prompt 模板结构**：
```
你是 Dota2 Dev Copilot，一个专门用于 Dota 2 游廊开发的 AI 代码助手。

## 你的能力范围 (Pattern Catalog)
{{#each patternCatalog}}
- {{name}}: {{description}} (稳定性: {{stability}}, LLM参与度: {{llmInvolvement}})
{{/each}}

## 机制类型 (Mechanism Ontology)
{{mechanismOntology.effects}}
{{mechanismOntology.targets}}
{{mechanismOntology.behaviors}}

## API 使用约束
{{apiConstraints.whitelist}}
{{apiConstraints.blacklist}}
{{apiConstraints.safetyRules}}

## 当前项目状态
{{projectState.resources}}
{{projectState.keyBindings}}
{{projectState.abilities}}

## 反模式警告
{{#each antiPatterns}}
- ⚠️ {{title}}: {{description}}
  ❌ 错误: {{wrong}}  ✅ 正确: {{correct}}
{{/each}}

## 输出要求
1. 必须输出合法的 FeatureBlueprint JSON，不要直接输出代码文件
2. System Pattern 核心代码禁止修改或重新生成
3. 置信度 < 0.6 时进入专家模式

## 参考资料 (动态注入)
{{apiReferences}}
```

**验收标准**：
- [ ] `packages/llm-context/` 可独立构建
- [ ] 输入任意自然语言 → 组装出完整的 ContextPackage
- [ ] 组装的 Prompt 包含正确的 Pattern 清单 + API 约束 + 项目状态
- [ ] 4 个 Prompt 模板均可正常渲染
- [ ] 按 Feature 类型动态过滤（Ability-heavy vs UI-heavy）

---

### Step 4：Fallback Chain 与四层 Pipeline 集成

**目标**：端到端打通 "自然语言 → 代码" 完整流水线

**Pipeline 架构**：
```
┌─────────────────────────────────────────────────────┐
│                  接口层 (Interface)                    │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐   │
│  │ MCP Server │  │ Kimi Skill │  │ CLI Wizard │   │
│  └─────┬──────┘  └─────┬──────┘  └─────┬───────┘   │
└────────┼─────────────────┼──────────────────┼─────────────┘
         └─────────────────┼──────────────────┘
                           ▼
┌─────────────────────────────────────────────────────┐
│              Pipeline: generateFeature()              │
│                                                      │
│  Stage 1: NLU Parser                                  │
│  ├─ 自然语言 → FeatureBlueprint JSON + confidence     │
│  └─ confidence < 0.8? → 进入 Fallback Chain           │
│                                                      │
│  Stage 2: Pattern Resolution (Layer 1+2)               │
│  ├─ 解析 features → 所需 Pattern 列表                   │
│  ├─ 加载 template + gap_regions 元数据                │
│  └─ 输出: Pattern 实例列表 + 参数绑定                 │
│                                                      │
│  Stage 3: Framework Generation (Layer 3)              │
│  ├─ Handlebars 渲染 template → 框架代码               │
│  ├─ ts-morph AST 注入 (import/net_table/kv 追加)      │
│  └─ 输出: 带 [GAP] 标记的 60-70% 代码               │
│                                                      │
│  Stage 4: Gap Filling (Layer 4)                       │
│  ├─ 遍历所有 GapRegion                                │
│  ├─ 为每个 Gap 组装专用 Prompt (注入 knowledge/)    │
│  ├─ 调用 LLM 填充 (限制 max_lines, 校验 API 白名单)    │
│  └─ tsc + DomainValidator + ESLint 三重校验             │
│                                                      │
│  Stage 5: Diff Generation & Validation              │
│  ├─ 对比生成代码与现有项目 → 人类可读 diff             │
│  ├─ 运行 validator (tsc + NetTable一致性 + Event 冲突)  │
│  └─ 输出: 最终 diff + 验证报告                        │
└─────────────────────────────────────────────────────┘
                           
                           ▼
┌─────────────────────────────────────────────────────┐
│                 Fallback Chain                      │
│                                                      │
│  Level 1: Pattern Decomposition (自动, ~60%)          │
│  "灵能冲刺" = custom_resource + key_binding + dash     │
│           + invulnerability                            │
│                                                      │
│  Level 2: Parameterized Pattern (自动, ~25%)         │
│  "鼠标方向冲刺" vs "前方冲刺":                          │
│  - 若仅是 API 选择差异 → parameter_select Gap (3-8行) │
│  - 若涉及方向计算/射线检测 → logic_impl Gap (10-30行) │
│                                                      │
│  Level 3: LLM Gap-Filling (半自动, ~10%)             │
│  仅在 [LLM_GAP] 区域内编写                    │
│  强制注入 knowledge/ 上下文                          │
│  三重校验通过后才接受                                    │
│                                                      │
│  Level 4: Expert Mode (人工, 兜底)                   │
│  引导用户通过表单/向导手动配置 Blueprint             │
│  或提供代码骨架让用户填充                               │
│  触发条件: confidence < 0.6 或 Level 1-3 全部失败     │
└─────────────────────────────────────────────────────┘
```

**MCP Tools 实现** (`mcp-server/src/`)：

| Tool | 功能 | 对应 Stage |
|------|------|------------|
| `dota2_generate_feature(nl)` | 端到端：自然语言 → 代码 diff | Stage 1→5 |
| `dota2_resolve_blueprint(nl)` | 仅输出 Blueprint JSON | Stage 1 |
| `dota2_search_pattern(query)` | Pattern 语义检索 | Pre-stage |
| `dota2_validate_project()` | 扫描项目一致性 | Post-stage |
| `dota2_preview_diff(blueprint)` | 预览不写入文件 | Stage 5 (read-only) |

**CLI Wizard 升级** (`apps/cli/src/wizard.ts`)：
- 当前：模拟模式（硬编码默认值）
- 升级后：
  - 接入 `packages/llm-context/` 的 ContextAssembly
  - 置信度 < 0.6 时触发追问（"您是指 X 还是 Y？"）
  - 支持 Expert Mode（逐步表单配置）

**验收标准**：
- [ ] MCP Server 可启动并在 Cursor/Claude 中注册 Tool
- [ ] `dota2_generate_feature("灵能冲刺系统...")` 能输出完整 diff
- [ ] CLI Wizard 可进行真实自然语言对话
- [ ] Fallback Chain 四级降级均正常触发
- [ ] 天赋抽取系统端到端测试通过

---

### Step 5：重写 README + 归档 v2

**目标**：用反映实际架构的内容替代过时的 Architecture v2

**新 README 结构**：
```markdown
# Dota 2 Dev Copilot

Dota 2 游廊 **Feature 组装引擎** —— 用自然语言生成跨 Server-Client-UI 的完整功能代码。

## Quick Start

### 方式 A：Cursor / Claude Desktop (MCP)
1. npm install -g dota2-dev-copilot
2. 配置 MCP Server
3. 输入: "我要一个灵能冲刺系统，按D键消耗灵能向鼠标方向位移，无敌0.4秒"
4. AI 自动生成完整代码 + diff 报告

### 方式 B：CLI
$ npx dota2-dev-copilot generate "F3天赋抽取系统，三选一，R/SR/SSR/UR等级"

## 工作原理 (四层代码生成)

| 层 | 内容 | 生成方 | 占比 |
|----|------|--------|------|
| Layer 1 | Pattern 库 (预定义模板) | 引擎自动 | 35% |
| Layer 2 | Pattern 组合 (Blueprint 配置) | LLM 辅助 | 15% |
| Layer 3 | 框架代码 (输入监听/数据同步/事件分发) | 引擎自动 | 25% |
| Layer 4 | 业务逻辑 (具体效果/数值/UI样式) | LLM 生成 | 20% |
| 人工 | 微调与审核 | 开发者 | 5% |

## 架构
(引用 plan.md 的四层架构图: Interface → Orchestration → Core Engine → Asset Layer)

## 当前进度
- ✅ Phase 0: 基础设施与 x-template 深度解析
- ✅ Phase 1: 系统级 Pattern 库 (206个 pattern 文件)
- ✅ Phase 2: 编排层与验证层
- ✅ Phase 3: 效果组合与 CLI 交互
- 🔄 Phase 5: Pattern 验证生态 (50%)
- ⏳ Phase 6: LLM 接入与智能编排 ← **下一步 (本路线图)**
- ⏳ Phase 7: 打磨与发布

## 知识库
集成 ModDota 官方教程的结构化知识:
- TypeScript Scripting 完整指南 (Ability/Modifier/Event/Timer)
- Units & Buildings KV 参考
- Panorama UI 开发指南 (TS + React + Webpack)
- Scripting Systems 模式 (自定义资源/物品掉落/AI状态机)
详见 `docs/` 和 `knowledge/` 目录。

## 示例: 天赋抽取系统
(引用 examples/talent_draw_system/ 完整流程)

## 开发指南
- [Pattern 贡献指南](PATTERN_AUTHORING_GUIDE.md)
- [Pattern 提取指南](PATTERN_EXTRACTION_GUIDE.md)
- [LLM 集成架构](docs/LLM_INTEGRATION_ARCHITECTURE.md)

## 目录结构
(反映真实的 monorepo 结构: apps/, packages/, patterns/, knowledge/, mcp-server/)
```

**验收标准**：
- [ ] 新 README 准确反映 plan.md 的 Feature 组装引擎定位
- [ ] 四层代码生成模型清晰展示
- [ ] 当前 Phase 进度准确标注
- [ ] 与 docs/ knowledge/ 的关系明确说明
- [ ] 旧版 README 已归档至 `archive/readme-v2-architecture.md`

---

## 三、执行计划与优先级

```
Step 1: 知识库结构化 ████████░░░░ (预估 2-3天)  ← 最先做，其他都依赖它
    ↓
Step 2: 框架生成器(Gap标记) ████████░░░░ (预估 2-3天)  ← 与Step3可并行
    ↓                              ↓
Step 3: Context Injection ████████░░░░ (预估 2-3天)  ← 与Step2可并行
    ↓                              ↓
    └──────────┬───────────────────┘
               ↓
Step 4: Pipeline 集成 ██████████░░░░░ (预估 4-5天)  ← 核心交付，整合前3步
    ↓
Step 5: README 重写   ████░░░░░░░░░░░ (预估 0.5天)  ← 最后收尾
```


## 四、关键数据结构速查

```typescript
// Gap Region — template 中的 LLM 可编辑区域
interface GapRegion {
  id: string;
  description: string;
  allowed_apis: string[];
  forbidden: string[];
  max_lines: number;
  context_refs: string[];
  hint: string;
}

// Pattern 元数据扩展
interface PatternMetadataExtended {
  layer: 1 | 2 | 3;
  gap_regions: GapRegion[];
  doc_sources: string[];
  anti_pattern_ids: string[];
}

// Context Assembly 输出
interface AssembledContext {
  system_prompt: string;
  pattern_catalog: PatternCatalogEntry[];
  relevant_apis: ApiSnippet[];
  relevant_anti_patterns: AntiPattern[];
  project_state: ProjectState;
  gap_instructions: GapInstruction[];
}
```

---

## 五、与现有代码的衔接关系

| 本路线图步骤 | 使用的现有代码/目录 | 需要新建/修改 |
|-------------|-------------------|---------------|
| Step 1 | `docs/` (只读), `knowledge/` (扩充), `patterns/` (参考映射) | knowledge/patterns/, knowledge/api-reference/, knowledge/anti-patterns/ (新建目录) |
| Step 2 | `patterns/` (扩展 template, 增加 gap_regions.json), `packages/feature-assembler/` (修改 TemplateEngine), `examples/talent_draw_system/` (验证基准) | gap_regions.json 元数据文件 |
| Step 3 | 无 (全新包) | `packages/llm-context/` (新建包) |
| Step 4 | `mcp-server/` (实现 Pipeline), `apps/cli/` (升级 wizard), `packages/project-scanner/` (对接), `packages/blueprint/` (对接), Step 2 的 Gap 引擎 | mcp-server/src/pipeline/* (新建), apps/cli/src/wizard.ts (修改) |
| Step 5 | `README.md` (重写) | `archive/readme-v2-architecture.md` (归档) |

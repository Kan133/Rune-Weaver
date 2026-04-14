# UI Pattern Strategy

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: temporary
> Last verified: 2026-04-14
> Read when: evaluating future UI pattern strategy and UI-specific pattern modeling
> Do not use for: current baseline pattern taxonomy, current UI host rules, or execution routing

## 1. UI Pattern 的定义

### 1.1 什么是 UI Pattern

UI Pattern 是 Rune Weaver Pattern Catalog 中专门解决 "UI 功能形态" 的一类模式。

它是一个：

> **可复用、可参数化、可验证的 UI 功能构件，解决特定交互场景下的 surface 形态问题。**

UI Pattern 的核心职责：

| 职责 | 说明 | 示例 |
|------|------|------|
| Surface 形态 | 定义 UI 是什么类型的界面元素 | modal / hint / bar |
| 交互骨架 | 定义用户如何与之交互 | 点击选择 / 悬停提示 / 实时显示 |
| 数据接口 | 定义需要什么数据输入 | 选项列表 / 按键绑定 / 资源数值 |
| 宿主落点 | 定义如何落到 Dota2 Panorama | TSX + LESS + bridge |

### 1.2 UI Pattern 不是什么

UI Pattern **不是**：

- ❌ 完整的页面设计（如 "天赋选择页面"）
- ❌ 业务规则定义器（如 "选择后如何应用到英雄"）
- ❌ 视觉设计系统（如 "所有按钮的 hover 效果"）
- ❌ 任意布局生成器（如 "帮我排个好看的界面"）

这些要么属于 `UIDesignSpec`，要么不属于 Rune Weaver 当前阶段范围。

### 1.3 UI Pattern 与 Mechanic Pattern 的关系

```
Mechanic Pattern (规则层)
├── input.key_binding      → 触发规则
├── rule.selection_flow    → 选择规则
├── effect.dash            → 效果规则
└── resource.basic_pool    → 资源规则
         ↓
    需要 UI 呈现
         ↓
UI Pattern (呈现层)
├── ui.selection_modal     ← 承接 rule.selection_flow
├── ui.key_hint            ← 承接 input.key_binding  
└── ui.resource_bar        ← 承接 resource.basic_pool
```

UI Pattern 从属于 Mechanic Pattern，而不是独立存在。

---

## 2. UI Pattern 与 UIDesignSpec 的边界

### 2.1 分层职责

| 层级 | 解决问题 | 关键问题 | 示例 |
|------|----------|----------|------|
| **UI Pattern** | "用什么 UI 形态" | 用弹窗？用提示？用资源条？ | `ui.selection_modal` |
| **UIDesignSpec** | "这个 UI 长什么样" | 什么风格？什么密度？什么文案？ | `tone: "神秘感"` |
| **Gap Fill** | "微小个性化如何补全" | hover 文案怎么写？颜色微调？ | 微文案补全 |

### 2.2 边界判断准则

**属于 UI Pattern**：
- ✅ 是否改变 UI 的功能形态？
- ✅ 是否影响用户交互方式？
- ✅ 是否需要在宿主中创建新的组件类型？

**属于 UIDesignSpec**：
- ✅ 是否只改变呈现方式，不改变功能？
- ✅ 是否可以通过参数/配置表达？
- ✅ 是否属于 "换皮不换骨"？

**示例对比**：

| 需求 | 归属 | 理由 |
|------|------|------|
| "三选一弹窗" | UI Pattern | 功能形态是选择弹窗 |
| "弹窗风格要神秘感" | UIDesignSpec | 只是风格变化 |
| "选择后自动关闭弹窗" | Mechanic Pattern (rule) | 这是规则逻辑 |
| "弹窗倒计时 10 秒" | UIDesignSpec / Pattern 参数 | 可参数化表达 |

---

## 3. UI Pattern 与 Constrained Gap Fill 的边界

### 3.1 Gap Fill 在 UI 中的有限介入

Constrained Gap Fill **只应**承接 UI 的尾部个性化：

- ✅ 微文案补全（如按钮 hover 提示的具体文字）
- ✅ Style token 局部扩展（如特定颜色值的微调）
- ✅ 小型布局变体（如选项卡片内的元素排列）
- ✅ 局部反馈文案（如错误提示的具体内容）

### 3.2 Gap Fill 不应承接的 UI 内容

- ❌ 整个 UI 结构生成
- ❌ 整个 UI 状态机逻辑
- ❌ 宿主 UI 代码主逻辑
- ❌ 复杂布局计算

### 3.3 判断公式

```
如果问题可以表述为：
"在给定 Pattern 骨架和 Spec 指导下，
 还有哪些微小细节需要补全？"
→ 可能属于 Gap Fill

如果问题需要：
"从头设计一个 UI 组件"
→ 属于新增 Pattern（需审慎）
```

---

## 4. 当前推荐保留的 UI Pattern Family

### 4.1 核心 UI Pattern（当前保留）

| Pattern | 职责 | 承接的 Mechanic | 优先级 |
|---------|------|----------------|--------|
| `ui.selection_modal` | 选择弹窗 | `rule.selection_flow` | P0 |
| `ui.key_hint` | 按键提示 | `input.key_binding` | P0 |
| `ui.resource_bar` | 资源条 | `resource.basic_pool` | P0 |

**保留理由**：
- 覆盖当前三个核心用例（A/B/C）
- 功能形态稳定，可参数化
- 有明确的宿主落点
- 不依赖领域专用逻辑

### 4.2 后续候选 UI Pattern

| Pattern | 可能场景 | 当前状态 |
|---------|----------|----------|
| `ui.toast` | 短暂提示、成就通知 | 候选 |
| `ui.overlay_panel` | 全屏遮罩、信息展示 | 候选 |

**不立即新增理由**：
- 当前三个核心 Pattern 已覆盖 MVP 需求
- 新增 Pattern 需要配套的 Host Binding 和 Adapter 支持
- 过早扩展会分散稳定性验证精力

### 4.3 明确不应新增的领域专用 UI Pattern

| 不应新增 | 原因 | 正确做法 |
|----------|------|----------|
| `ui.talent_screen` | 领域专用（天赋系统） | 用 `ui.selection_modal` + 领域参数 |
| `ui.card_builder` | 领域专用（卡牌构筑） | 用 `ui.selection_modal` + 领域参数 |
| `ui.hero_dashboard` | 过于复杂、领域专用 | 不属于当前阶段范围 |
| `ui.inventory_grid` | 领域专用（背包系统） | 超出当前阶段 |
| `ui.skill_tree` | 领域专用、过于复杂 | 超出当前阶段 |

**核心原则**：

> 如果某个 UI 需求可以通过 "核心 UI Pattern + UIDesignSpec 参数" 表达，
> 就不应新增一个领域专用的 UI Pattern。

这是防止 Pattern Catalog 膨胀为 "领域模板库" 的关键边界。

---

## 5. UI Wizard 的最小问题集合

### 5.1 UI Wizard 的进入条件

UI Wizard **只在以下情况进入**：

1. 明确需要 UI
2. 没有 UI 则无法测试或感知结果
3. 用户明确提出视觉、布局或交互要求

### 5.2 UI Wizard 应优先澄清的问题

| 问题类别 | 具体问题 | 输出到 |
|----------|----------|--------|
| **Surface 类型** | "需要弹窗、提示条还是资源条？" | `UIDesignSpec.surfaces[].type` |
| **交互强度** | "强打断（modal）还是弱提示（hint）？" | `UIDesignSpec.surfaces[].interactionMode` |
| **信息密度** | "简洁还是详细？" | `UIDesignSpec.visualStyle.density` |
| **风格关键词** | "功能型、神秘感、科技感？" | `UIDesignSpec.visualStyle.themeKeywords` |
| **关键文案偏好** | "简短直接还是带 flavor？" | `UIDesignSpec.copyHints` |

### 5.3 UI Wizard 不应问的问题

| 不应问 | 原因 | 正确归属 |
|--------|------|----------|
| "选择后如何应用到英雄？" | 这是业务规则 | `rule` Pattern |
| "从哪个数据源抽取选项？" | 这是数据逻辑 | `data` Pattern |
| "资源上限是多少？回复速度？" | 这是资源规则 | `resource` Pattern |
| "弹窗关闭后触发什么效果？" | 这是效果规则 | `effect` Pattern |
| "具体用什么颜色？字体大小？" | 这是细节实现 | Gap Fill / 模板默认值 |

### 5.4 两段式澄清回顾

```
主 Wizard
  ├── 是否需要 UI？ → uiRequirements.needed
  ├── 没有 UI 是否可感知？
  └── 需要哪类 surface？ → uiRequirements.surfaces
        ↓ (如果需要详细 UI 设计)
      UI Wizard
        ├── 交互强度？
        ├── 信息密度？
        ├── 风格关键词？
        └── 关键文案偏好？
              ↓
          UIDesignSpec
```

---

## 6. 分层判断表

| 需求描述 | 应归属哪一层 | 示例/说明 |
|----------|-------------|-----------|
| "需要一个三选一弹窗" | **UI Pattern** | `ui.selection_modal` |
| "按键提示显示 Q 键" | **UI Pattern** | `ui.key_hint` |
| "显示能量资源条" | **UI Pattern** | `ui.resource_bar` |
| "风格要神秘感" | **UIDesignSpec** | `visualStyle.themeKeywords: ["神秘感"]` |
| "按钮 hover 显示'点击选择'" | **UIDesignSpec / Gap Fill** | `copyHints` 或微文案补全 |
| "弹窗 10 秒后自动关闭" | **UIDesignSpec** | `autoDismissMs: 10000` 或等价的 UI 行为参数 |
| "奖励应用到英雄的属性" | **Mechanic Pattern (rule)** | `rule.selection_flow` 的结果应用逻辑 |
| "从 NetTable 同步数据到 UI" | **Host Binding** | Adapter 层数据流配置 |
| "选项按三角形排列" | **Constrained Gap Fill** | 布局变体，Pattern 骨架不变 |
| "弹窗背景用暗紫色渐变" | **UIDesignSpec** | `visualStyle` 或 style token |
| "选择时播放音效" | **UIDesignSpec** | `feedbackHints` |
| "显示玩家当前分数排名" | **Mechanic + UI** | `data` + `ui.resource_bar` 复用 |
| "一个完整的天赋选择页面" | **不属于当前范围** | 过于领域专用，应拆解为 Pattern 组合 |

### 6.1 快速判断流程

```
需求描述
    ↓
是否改变 UI 功能形态？
    ├── 是 → UI Pattern
    ↓ 否
是否改变呈现方式（风格/密度/文案）？
    ├── 是 → UIDesignSpec
    ↓ 否
是否微小个性化细节？
    ├── 是 → Constrained Gap Fill
    ↓ 否
是否业务规则/数据逻辑？
    ├── 是 → Mechanic Pattern (非 UI)
    ↓ 否
是否过于领域专用/复杂页面？
    ├── 是 → 拒绝 / 拆解
    ↓ 否
    → 需要进一步澄清
```

---

## 7. Dota2 宿主中的落地关系

### 7.1 UI Pattern 在 Dota2 中的分层

```
Dota2 Panorama 宿主
├── content/panorama/src/
│   ├── hud/script.tsx              # UI Entry (inject_once)
│   └── rune_weaver/
│       ├── index.tsx               # RW UI Root (create)
│       └── generated/ui/
│           ├── index.tsx           # UI Index (refresh)
│           ├── rw_talent_draw.tsx  # ui.selection_modal 落地
│           ├── rw_talent_draw.less # UIDesignSpec 影响样式
│           ├── rw_dash_q.tsx       # ui.key_hint 落地
│           └── rw_energy_bar.tsx   # ui.resource_bar 落地
│
└── game/scripts/src/
    └── rune_weaver/
        └── generated/shared/
            └── nettables.d.ts      # UI/Server 共享类型
```

### 7.2 各层职责映射

| Rune Weaver 层 | Dota2 落地 | 文件示例 |
|---------------|-----------|----------|
| UI Pattern | TSX 组件骨架 | `rw_talent_draw.tsx` |
| UIDesignSpec | LESS 样式参数 | 密度、风格影响 CSS 类 |
| Gap Fill | 微文案注入 | hover 文案、提示文字 |
| Host Binding | Bridge 接线 | `hud/script.tsx` inject_once |

### 7.3 数据流关系

```
Server (game/scripts)
    ↓ CustomNetTables.SetTableValue()
Shared (nettable definitions)
    ↓ 类型共享
UI (content/panorama)
    ↓ CustomNetTables.SubscribeNetTableListener()
Panorama Panel
```

---

## 8. 下一阶段建议

### 8.1 当前阶段（U1-U2）

**目标**：让 UI 成为可感知的代码输出面

**行动**：
- ✅ 稳定 `ui.selection_modal` / `ui.key_hint` / `ui.resource_bar`
- ✅ 实现最小 UI Wizard（5 个问题）
- ✅ 让 UIDesignSpec 能指导 Host Adapter 生成差异化样式

### 8.2 下一阶段（U3）考虑

**条件**：三个核心 UI Pattern 稳定运行后

**可选方向**：
1. **Constrained Gap Fill 介入 UI 尾部**
   - 微文案补全
   - 小型布局变体

2. **新增 Toast/Overlay Pattern**
   - 如果需求确实频繁出现
   - 且无法被现有 Pattern 覆盖

3. **UI Pattern 参数扩展**
   - 更丰富的 `interactionMode`
   - 更灵活的 `layoutHints`

### 8.3 明确不做的方向

| 不做 | 原因 |
|------|------|
| 独立 UI 设计产品 | UI 必须从属于 NL-to-Code 主线 |
| 领域专用 UI 模板库 | 违背 Mechanic + Skin 分离原则 |
| 任意布局生成 | 属于 uncontrolled gap fill |
| 可视化 UI 编辑器 | 超出当前产品边界 |

---

## 9. 总结

Rune Weaver 的 UI Strategy 核心原则：

> **UI 是代码输出的一个面，不是独立产品。**
> 
> **UI Pattern 解决形态问题，UIDesignSpec 解决呈现问题，Gap Fill 只补全尾部细节。**
> 
> **领域专用 UI 需求应被拆解为 Pattern 组合，而不是新增 Pattern。**

当前守住三个核心 UI Pattern，让 UI 成为主链路中稳定、可感知、可复用的能力面。

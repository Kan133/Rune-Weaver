# Rune Weaver 通用性验证审查

## 1. 文档目的

本文档验证 Rune Weaver 当前架构是否支持"同骨架不同皮"的通用性。

验证方法：围绕三个 family cases 进行结构化分析，判断它们是否可归一化为相近的 IntentSchema 和 mechanic structure，是否主要复用同一组 Pattern。

---

## 2. Family Cases 定义

### 2.1 Case 1: 天赋三选一

**原始需求描述**：
> 做一个按F4触发的三选一天赋抽取系统，有R/SR/SSR/UR稀有度，玩家可以抽取天赋卡片，选择后应用到英雄身上。

**领域关键词**：天赋、稀有度、F4键、抽取、应用

---

### 2.2 Case 2: 卡牌三选一

**原始需求描述**：
> 做一个战斗中可触发的卡牌抽取系统，玩家积累能量后按Q键抽取3张战斗卡牌，选择一张立即打出效果。

**领域关键词**：卡牌、能量、Q键、战斗、打出

---

### 2.3 Case 3: 装备随机升级三选一

**原始需求描述**：
> 做一个装备升级系统，玩家可以在基地按E键打开升级界面，从3个随机升级选项中选择一项强化当前装备。

**领域关键词**：装备、升级、基地、E键、强化

---

## 3. 归一化分析

### 3.1 IntentSchema 层面的归一化

| 维度 | 天赋三选一 | 卡牌三选一 | 装备升级三选一 | 归一化结论 |
|------|-----------|-----------|---------------|-----------|
| **意图类型** | standalone-system | standalone-system | standalone-system | ✅ 相同 |
| **核心机制** | 抽取→展示→选择→应用 | 抽取→展示→选择→应用 | 抽取→展示→选择→应用 | ✅ 相同 |
| **触发方式** | 按键(F4) | 按键(Q) | 按键(E) | ✅ 参数化差异 |
| **候选源** | 加权池(带稀有度) | 加权池(能量驱动) | 加权池(装备相关) | ✅ 同 Pattern |
| **选择数量** | 3 | 3 | 3 | ✅ 相同 |
| **展示方式** | 弹窗选择 | 弹窗选择 | 弹窗选择 | ✅ 相同 |
| **结果应用** | 应用到英雄 | 立即打出 | 强化装备 | ⚠️ 应用目标不同 |

**结论**：三个 case 在 IntentSchema 层面可归一化为相同的 `standalone-system` 类型，核心流程完全一致，差异仅在参数和最终应用目标。

---

### 3.2 Mechanic Structure 归一化

**共用骨架（Mechanic Structure）**：

```
输入触发 → 候选抽取 → 选择展示 → 用户决策 → 结果应用
```

**各步骤映射**：

| 步骤 | Mechanic Pattern | 天赋 Case | 卡牌 Case | 装备 Case |
|------|-----------------|-----------|-----------|-----------|
| 输入触发 | input.key_binding | F4键 | Q键 | E键 |
| 候选抽取 | data.weighted_pool | 天赋池 | 卡池 | 升级池 |
| 选择流程 | rule.selection_flow | 3选1 | 3选1 | 3选1 |
| 选择展示 | ui.selection_modal | 天赋卡 | 卡牌 | 升级选项 |
| 结果应用 | effect.* | apply_talent | play_card | upgrade_item |

**结论**：前4个步骤完全复用同一组 Pattern，只有最后"结果应用"步骤因领域不同而需要不同的 effect Pattern。

---

### 3.3 领域皮肤（Domain Skin）vs 机制骨架（Mechanic Structure）

#### 领域皮肤（可替换的名称/主题）

| 皮肤维度 | 天赋 | 卡牌 | 装备升级 |
|---------|------|------|---------|
| 名词 | 天赋/稀有度 | 卡牌/能量 | 装备/升级 |
| 视觉主题 | 魔法符文 | 卡牌图案 | 锻造火花 |
| 术语 | R/SR/SSR/UR | 法术/随从/陷阱 | +1/+2/+3 |
| 触发情境 | 任意时刻 | 战斗中有能量 | 在基地时 |

#### 机制骨架（稳定复用的结构）

| 骨架组件 | Pattern |
|---------|---------|
| 触发输入 | input.key_binding |
| 候选池 | data.weighted_pool |
| 选择流程 | rule.selection_flow |
| 选择UI | ui.selection_modal |
| 资源限制 | resource.basic_pool |
| 结果应用 | effect.* (按领域选择) |

---

## 4. Pattern 复用分析

### 4.1 三个 Case 的 Pattern 列表

#### 天赋三选一
```
input.key_binding      (F4触发)
data.weighted_pool     (带权重的天赋池)
rule.selection_flow    (三选一流程)
ui.selection_modal     (天赋卡展示)
ui.key_hint            (F4键提示)
```

#### 卡牌三选一
```
input.key_binding      (Q键触发)
resource.basic_pool    (能量资源)
effect.resource_consume (消耗能量)
data.weighted_pool     (带权重的卡池)
rule.selection_flow    (三选一流程)
ui.selection_modal     (卡牌展示)
ui.resource_bar        (能量条)
ui.key_hint            (Q键提示)
```

#### 装备升级三选一
```
input.key_binding      (E键触发)
data.weighted_pool     (升级选项池)
rule.selection_flow    (三选一流程)
ui.selection_modal     (升级选项展示)
ui.key_hint            (E键提示)
```

### 4.2 复用度统计

| Pattern | 天赋 | 卡牌 | 装备 | 复用率 |
|---------|------|------|------|--------|
| input.key_binding | ✅ | ✅ | ✅ | 100% |
| data.weighted_pool | ✅ | ✅ | ✅ | 100% |
| rule.selection_flow | ✅ | ✅ | ✅ | 100% |
| ui.selection_modal | ✅ | ✅ | ✅ | 100% |
| ui.key_hint | ✅ | ✅ | ✅ | 100% |
| resource.basic_pool | ❌ | ✅ | ❌ | 33% |
| effect.resource_consume | ❌ | ✅ | ❌ | 33% |
| ui.resource_bar | ❌ | ✅ | ❌ | 33% |

**核心 Pattern（100%复用）**：4个  
**可选 Pattern（按需使用）**：3个

---

## 5. 当前架构下的复用判断

### 5.1 复用结论

✅ **当前架构已具备通用性潜力**

三个表面上完全不同的领域系统（天赋/卡牌/装备升级），实际上共享完全相同的机制骨架：

- 相同的触发 Pattern
- 相同的抽取 Pattern  
- 相同的选择流程 Pattern
- 相同的选择 UI Pattern

差异仅体现在：
- 参数值（按键、数量）
- 领域名词（天赋/卡牌/升级）
- 最终应用的效果类型

### 5.2 无需新增领域专用 Pattern

以下做法是错误的（当前架构已避免）：
- ❌ `talent_selection_flow`
- ❌ `card_selection_flow`  
- ❌ `forge_selection_flow`

正确做法是复用：
- ✅ `rule.selection_flow`

领域差异不应直接塞进核心 mechanic pattern 参数。
更合理的做法是：

- `rule.selection_flow` 只保留机制级参数
- 领域文案、视觉主题、展示映射交给 `UIDesignSpec`
- 领域名词和表现层上下文放在独立的 `domain overlay/context`

```typescript
// 核心 mechanic pattern 只表达机制
rule.selection_flow({
  choiceCount: 3,
  selectionPolicy: "single",
})

// 领域皮肤在展示层或上下文层表达
uiDesignSpec({
  stylePreset: "talent" | "card" | "forge",
})
```

---

## 6. 当前缺口和风险

### 6.1 已识别的缺口

| 缺口 | 风险等级 | 说明 |
|------|---------|------|
| 无统一的 "结果应用" 抽象 | 中 | 三个 case 最终应用不同，需要 effect.apply_talent、effect.play_card、effect.upgrade_item 等具体 Pattern |
| 无 domain context 传递机制 | 低 | UI 展示需要知道是"天赋"还是"卡牌"以显示不同文案/样式，当前通过 params 传递，但无强制约束 |
| 无权重池的领域过滤 | 低 | 卡牌 case 需要"战斗中可用"过滤，天赋 case 需要"已拥有"过滤，当前 weights 参数不足以表达复杂过滤规则 |

### 6.2 未来退化风险

**最可能退化成"每个系统一套专用模板"的场景**：

1. **Assembler 层硬编码领域分支**
   ```typescript
   // 错误做法
   if (domain === "talent") generateTalentModal();
   if (domain === "card") generateCardModal();
   ```

2. **Pattern 参数过度膨胀**
   ```typescript
   // 危险信号
   rule.selection_flow({
     isTalent: true,
     isCard: false,
     cardType: null,
     talentRarity: ["R", "SR"]
   })
   ```

3. **新增领域专用 Pattern**
   ```typescript
   // 退化信号
   patternResolver.register("talent.draw_flow");
   patternResolver.register("card.draw_flow");
   ```

---

## 7. 下一步建议（保护通用性）

### 建议 1: 固化 Selection 家族 Pattern 的参数规范
**优先级**: P0  
**行动**: 为 `data.weighted_pool` 和 `rule.selection_flow` 定义清晰的扩展点接口，允许注入领域特定的过滤逻辑，而不是在 Pattern 内硬编码。

### 建议 2: 建立 UIDesignSpec 的领域覆盖机制
**优先级**: P1  
**行动**: `ui.selection_modal` 不应关心是"天赋卡"还是"卡牌"，这些差异应通过 `UIDesignSpec` 的 `stylePreset` 和 `dataMapping` 来表达。

### 建议 3: 定义 Effect 家族的最小接口
**优先级**: P1  
**行动**: 三个 case 最终都需要一个"结果应用"的 effect，应定义 `effect.apply_selection_result` 的最小接口，允许参数化指定应用逻辑，而非为每个领域新建 Pattern。

---

## 8. 结论总结

| 问题 | 答案 |
|------|------|
| 当前架构是否具备通用性潜力？ | ✅ 是。三个 case 可完全复用同一组核心 Pattern |
| 哪一层最可能破坏通用性？ | ⚠️ Assembler 层。最容易硬编码领域分支 |
| 下一步最该做什么？ | 1. 固化 Selection Pattern 参数规范 2. 建立 UIDesignSpec 覆盖机制 3. 定义 Effect 应用接口 |

---

## 9. 附录：与 Pattern 文档的关联

本文档验证的 Pattern 来自：
- `PATTERN-BACKLOG.md` - P0 Pattern 候选
- `PATTERN-SPEC.md` - Pattern 元模型定义
- `adapters/dota2/patterns/index.ts` - 具体 Pattern 实现

验证结论支持 `PATTERN-SPEC.md` 的家族验证原则（第9节）。

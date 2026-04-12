# Rune Weaver

## 一句话

**Rune Weaver 是一个"用自然语言描述功能 → 自动生成代码 → 统一管理功能"的工具。**

你告诉它"我想做一个三选一天赋系统"，它会帮你生成 Dota2 所需的 Lua 代码、KV 配置、UI 界面，并且记住你创建了这个功能，方便后续维护和修改。

## 当前状态说明

上面的描述是 Rune Weaver 的**目标产品结果**。

当前面向实现与 agent 协作时，请额外遵循：

- [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)：当前 MVP 边界与能力口径
- [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)：当前操作入口与下一步优先级

当前正在收口的核心能力是：

- host 分离
- feature registry / workspace
- `create`
- `update`
- `delete`
- 最低限度的跨 feature 冲突治理

`regenerate` 和 `rollback` 暂不作为当前 MVP 的必达项。

### Create Path 当前状态

> ✅ **Packet A/B/C/D 已完成**：CLI `dota2 run` 是 authoritative lifecycle path。

**当前 authoritative 入口：**
- `npm run cli -- dota2 run "<request>" --host <path>` — 完整的 create 流程，支持真实文件写入
- `npm run cli -- dota2 --list --host <path>` — 列出已创建的功能
- `npm run cli -- dota2 --inspect <featureId> --host <path>` — 查看功能详情

**产品流程描述与当前支持的对应关系：**
| 流程步骤 | 目标形态 | 当前可靠支持 |
|----------|----------|--------------|
| 自然语言输入 | ✅ | ✅ 可用 |
| Wizard 澄清 | ✅ | ⚠️ 基础实现，可能降级到 fallback |
| Proposal Review | ✅ | ✅ workspace-backed governance 已可用 |
| 代码生成 | ✅ | ⚠️ 产品级可用，仍在演进中 |
| 写入与追踪 | ✅ | ✅ 真实文件写入已可用 |

**关键结论：** CLI `dota2 run` 是 **authoritative lifecycle path**。workbench/UI 是可视化/编排层，不是独立执行系统。

***

## 这个工具的流程是什么？

### 用户视角的完整流程

> ⚠️ **注意**：以下流程描述的是**产品目标形态**。当前 MVP 版本已实现基础链路，但 Wizard、完整 Proposal Review 和部分代码生成能力仍在完善中。详见 [CURRENT-STATE-VS-TARGET.md](/D:/Rune%20Weaver/docs/CURRENT-STATE-VS-TARGET.md)。

```
1️⃣ 描述你的想法 ✅
   ↓
   "我想做一个三选一天赋系统，每个玩家可以选一个增益"
   ↓
2️⃣ Wizard 帮你理清细节 ⚠️ 部分实现
   ↓
   系统问："天赋池有多少个选项？选择策略是什么？"
   你回答后，系统生成 IntentSchema（结构化的需求）
   ↓
3️⃣ 提案审查 ⚠️ 部分实现
   ↓
   你可以看到系统理解了你要什么：哪些 Pattern 会用到，
   会生成哪些文件，有什么冲突风险
   你确认或修改
   ↓
4️⃣ 代码生成 ⚠️ 产品级可用，仍在演进中
   ↓
   系统根据 Blueprint 生成 Dota2 的：
   - Lua 技能代码
   - KV 技能配置
   - UI 界面代码
   ↓
5️⃣ 写入与追踪 ✅ 真实文件写入已可用
   ↓
   功能被保存到 Feature Registry（功能注册表）
   你可以查看、修改、删除某个功能
```

***

## 什么是 Gap Fill？（未来能力）

> ⏸️ **未来能力**：Gap Fill 是规划中的能力，当前版本尚未实现。

**Gap Fill = 系统在细节不确定时，用规则填充，而不是胡乱猜测。**

### 问题 ❌ 未实现

用户说"做一个加速技能"，但没说加速多少、持续多久。

### 传统方式 ❌ 未实现

LLM 自由发挥，可能生成一个不合理的数值。

### Rune Weaver 方式 ❌ 未实现

Gap Fill 会根据 Dota2 的游戏规则自动推断合理默认值：

- 如果没说持续时间 → 用同类技能的常见值
- 如果没说冷却 → 用同类技能的常见值
- **但不会自己发明"这个技能应该有击退效果"**

Gap Fill 的原则是：**只能填充细节，不能发明机制。**

***

## 和传统模板代码生成器的区别？

| <br />   | 传统模板生成器    | Rune Weaver             | 当前实现状态 |
| -------- | ---------- | ----------------------- | -------- |
| **输入**   | 选模板 + 填参数  | 自然语言描述需求                | ✅ 已实现   |
| **灵活性**  | 参数可调，但结构固定 | Wizard 帮你确定结构           | ⚠️ 部分实现 |
| **代码风格** | 模板决定，你改不了  | 基于 Pattern，风格统一         | ✅ 已实现   |
| **维护性**  | 生成完就不管了    | Feature Registry 追踪所有功能 | ✅ 已实现   |

### 举个例子

**传统方式：**

```
1. 选择"技能模板"
2. 填写：名称=冲刺, 速度=400, 冷却=10
3. 生成代码，结束
```

**Rune Weaver 方式：**

```
1. 说"我想做一个冲刺技能，位移300距离"
2. Wizard 问："冲刺是朝鼠标方向还是固定方向？"
3. 你回答后，系统生成：
   - 技能代码（Lua）
   - 技能配置（KV）
   - 特效配置
4. 功能被保存，你可以查看、修改、删除
```

***

## 和 Vibe Coding 的区别？

| <br />     | Vibe Coding               | Rune Weaver                  |
| ---------- | ------------------------- | ---------------------------- |
| **LLM 角色** | LLM 直接生成代码，**想生成什么就生成什么** | LLM 只做**提案**，系统**规则决定**最终代码  |
| **可预测性**   | 每次生成可能不一样                 | 同样的需求，永远生成同类的结构              |
| **冲突处理**   | 不知道会不会和已有代码冲突             | 目标是在写入前检查冲突，当前版本提供基础检测（完善中） |
| **产物**     | 一堆代码文件，不知道谁是谁             | **Feature** 是一等公民，你知道每个功能是什么 |
| **维护**     | 时间久了不知道改了什么               | Feature Registry 让你清楚有哪些功能（基础版本已可用）   |

> 📊 **当前状态**：详见 [CURRENT-STATE-VS-TARGET.md](/D:/Rune%20Weaver/docs/CURRENT-STATE-VS-TARGET.md)

### 核心区别

**Vibe Coding = LLM 自由发挥**
**Rune Weaver = LLM 提案 + 规则约束 + 结构化管理**

***

## Rune Weaver 的核心优势

> **实现状态**：以下描述的是产品目标优势。当前版本已实现基础能力，完整优势需等待 MVP 完成。详见 [CURRENT-STATE-VS-TARGET.md](/D:/Rune%20Weaver/docs/CURRENT-STATE-VS-TARGET.md)。

### 1. Feature 是一等公民，不是代码碎片 ✅ 已实现

你面对的是**功能**：

- "天赋选择系统"
- "冲刺技能"
- "护盾效果"

而不是：

- `ability_kv.txt`
- `modifier_shield.lua`
- `panel_shop.js`

**好处**：你能用业务语言思考，而不是用文件路径思考。

### 2. 写入前就知道影响 ✅ 已实现

当你创建或修改一个功能时，系统会告诉你：

- 这个功能会生成/修改哪些文件
- 会和哪些已有功能冲突
- 有什么风险需要确认

**好处**：不是生成完代码才发现问题，而是生成前就清楚。

> 当前状态：workspace-backed governance 已可用，提供跨 feature 冲突检测。

### 3. 同一类功能，结构永远一致 ✅ 已实现

不管你哪天心情好还是心情差，不管你用了什么提示词，同一个 Pattern 生成的结构是一样的。

**好处**：团队协作容易，代码风格统一，不会出现"同样的功能不同的写法"。

### 4. 宿主无关的抽象层 ⚠️ 部分实现

Dota2 只是第一个实验宿主。核心是：

- Pattern（什么功能）
- Blueprint（怎么组合）
- Host Adapter（怎么落地到具体游戏）

如果未来支持 Warcraft3，同样的 Blueprint 会生成 JASS + Lua 代码，而不是重新设计。

> 当前状态：Dota2 宿主适配器已可用，第二宿主支持 deferred。

***

## Rune Weaver 不是什么

- ❌ 不是"给个需求就能生成任何代码"的万能工具
- ❌ 不是纯 LLM 自由发挥的聊天工具
- ❌ 不是只针对 Dota2 的硬编码生成器
- ❌ 不是假装智能但实际是模板替换的套娃

***

## 代码库结构

- `core/` — 核心引擎：Schema、Pipeline、LLM、Pattern 逻辑
- `adapters/` — 宿主适配器：Dota2 是第一个，后面可以扩展到其他游戏
- `apps/workbench/` — 命令行入口：输入需求，触发完整流程
- `apps/workbench-ui/` — 图形界面：可视化地管理 Feature
- `docs/` — 产品设计文档、架构说明、开发规划

***

## 快速开始

```bash
# 安装
npm install

# 验证核心链路（无需 LLM）
npm run examples

# 初始化宿主（首次使用）
npm run cli -- dota2 init --host <path>

# 运行 CLI（需要 LLM API Key）
npm run cli -- dota2 run "做一个简单的冲刺技能" --host <path>

# 查看已创建的功能
npm run cli -- dota2 --list --host <path>

# 查看功能详情
npm run cli -- dota2 --inspect <featureId> --host <path>
```

> 📚 **演示指南**：详见 [DEMO-PATHS.md](/D:/Rune%20Weaver/docs/DEMO-PATHS.md)  
> 📊 **当前状态**：详见 [CURRENT-STATE-VS-TARGET.md](/D:/Rune%20Weaver/docs/CURRENT-STATE-VS-TARGET.md)

***

## 总结

Rune Weaver 想做的是：

**"让开发者用业务语言描述功能，用结构化的方式生成代码，用功能注册的思路管理项目。"**

不是替代程序员，而是让小白开发者的日常工作更高效、更少出错、更容易维护。

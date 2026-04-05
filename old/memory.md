# Dota2 Dev Copilot - 后续优化点记录

> 记录时间: 2026-04-04
> 当前状态: E2E (talent_draw_system) 已通过，patternId  hallucination 已修复，但仍有长期优化空间。

---

## 近期已修复的编译/健壮性问题

### 1. Panorama `draw_modal.tsx` 编译错误
**问题**：`assembleTalentDrawCoordinator` 生成了 `import { SelectionModal } from './talent_draw_system_selection_modal'`，但 `SelectionModal` 组件从未被生成，导致模块找不到。
**修复**：将 `draw_modal.tsx` 改为不依赖外部组件的独立完整 Panel 组件，直接内联渲染三选一卡片和稀有度颜色。

### 2. `GameEvents.SendCustomGameEventToServer` 类型报错 `never`
**问题**：当 `shared/gameevents.d.ts` 中事件声明缺失或格式损坏时，TypeScript 推断出 `never` 参数类型。
**修复**：调用处改为 `(GameEvents as any).SendCustomGameEventToServer(...)`。

### 3. `ability.GetBehavior()` 按位与 TS2362 报错
**问题**：某些 dota2-ts 类型定义下 `GetBehavior()` 返回类型不被视为 `number`，`behavior & AbilityBehavior.NO_TARGET` 报错。
**修复**：生成代码时显式转换为 `number`：`const behavior = ability.GetBehavior() as number;` 以及 `(AbilityBehavior.NO_TARGET as number)`。

### 4. `DeepCopyTable` 未定义 (TS2304)
**问题**：`WeightedPool` 模板使用了 Dota2 Lua 全局函数 `DeepCopyTable`，但 TypeScript 环境中没有声明。
**修复**：在 `weighted_pool/server.ts.template` 顶部添加 `declare function DeepCopyTable<T>(table: T): T;`。

### 5. `RuleDefinition` 接口过于严格
**问题**：LLM 经常在 rule 对象中添加 `value`、`dataSystem` 等额外字段，导致 TS2353。
**修复**：在 `RuleDefinition` 接口中添加 `[key: string]: any;`。

### 6. `net-table-*.d.ts` 类型声明冲突
**问题**：每个资源系统生成独立的 `net-table-${resourceId}.d.ts`，多次声明 `XNetTableDefinitions` 的 `resource_systems` 属性导致 TS2717。
**修复**：
- 修改 `x-template/shared/x-net-table.d.ts`，统一声明 `resource_systems: { [key: string]: any };`。
- `assembleCustomResource` 不再生成单独的 `net-table-*.d.ts` 文件。

### 7. `gameevents.d.ts` 插入位置错误导致格式损坏
**问题**：`wiring-engine` 的 `insertInterfaceProperty` 使用正则匹配接口结尾，遇到嵌套类型（如 `c2s_test_event_with_params: { foo: number; }`）时会在第一个内层 `}` 处错误插入，导致文件语法混乱。
**修复**：将 `insertInterfaceProperty` 完全重写为 ts-morph AST 操作，通过 `intf.getLastChildByKind(SyntaxKind.CloseBraceToken)` 精确定位闭括号并插入。

### 8. `preCleanFeature` 对 net-table 文件清理遗漏
**问题**：`preCleanFeature` 只清理 `net-table-${featureName}*.d.ts`，但 resourceId 可能与 featureName 不同（如 `talent_draw_cooldown`）。
**修复**：将 `preCleanFeature` 签名改为接收 `FeatureBlueprint`，并增加对 `net-table-${resourceId}` 的清理。

---

## 1. Pattern 匹配的向量化 (Embedding-based Retrieval)
**优先级: 高**

当前 `llm-context` 使用硬编码的 tag + synonym table 进行模式匹配。随着 pattern 数量增长（目前 51 个），维护同义词表成本越来越高。

**优化方向:**
- 为每个 pattern 的 `metadata.json` 生成文本摘要（name + description + tags + parameters）。
- 使用轻量级 embedding 模型（如 `BAAI/bge-small-zh` 或 OpenAI `text-embedding-3-small`）将 pattern 摘要向量化。
- 用户输入需求同样 embedding 后，通过向量相似度（cosine similarity）检索 Top-K patterns，替代或增强现有的 tag 匹配。
- 好处：自然语言泛化能力更强，无需手动维护 `synonym-table.ts`。

---

## 2. Blueprint 校验层 (Pre-Assembly Validation)
**优先级: 高**

目前 LLM 仍可能返回重复的 modifiers（如 4 个 `modifiers/stat_bonus`）或不合理的参数。 assembler 端通过过滤兜底，但更好的做法是在 assemble 前进行结构化校验。

**优化方向:**
- 在 `feature-assembler` 入口增加 `validateBlueprint(blueprint)` 函数。
- 校验规则示例：
  - `patternId` 必须存在于 `patterns/index.json` 白名单（已部分实现 fuzzy match）。
  - modifiers 数组去重：相同 `patternId` 且参数可合并时自动合并。
  - 检查 coordinator 冲突：当 `dataSystem + selection_modal` 存在时，modifiers 中不应再包含 `stat_bonus`（由 coordinator 统一生成）。
- 校验失败时向 LLM 发送一轮 self-correction（类似 ReAct 循环）。

---

## 3. Shared File 清理从 Regex 升级为 AST/ts-morph
**优先级: 中**

`preCleanFeature` 目前使用正则表达式清理 `modules/index.ts`、`feature_layer.tsx` 等共享文件。在多次迭代后可能留下空行或残缺的 import。

**优化方向:**
- 引入 `ts-morph` 对 TypeScript 共享文件进行 AST 级删除：
  - 精确移除特定 import statement。
  - 精确移除特定函数调用（如 `activateTalentDrawSystem()`）。
- 对 Panorama `.tsx` 文件使用 Babel/SWC parser 进行 AST 清理。
- 对 KV 文件（`abilities_generated.txt`）使用 KV parser（如 `simple-kv`）进行结构化 block 删除，而不是字符串替换。

---

## 4. KV 文件结构化生命周期管理
**优先级: 中**

`abilities_generated.txt` 和 `npc_abilities_custom.txt` 在多次 E2E 运行后容易累积僵尸条目。当前 `preCleanFeature` 的 KV block 删除基于字符串索引，健壮性不足。

**优化方向:**
- 为每个生成的 KV block 注入注释标记：`// GENERATED_BY: talent_draw_system`。
- 使用 KV parser 读取整个文件为 AST/对象树，按标记删除对应子树，再序列化回写。
- 或者在生成阶段将每个 feature 的 KV 拆分为独立文件（`npc_abilities_custom.d/`），通过 `#base` 指令聚合，避免修改共享文件。

---

## 5. Prompt 工程: 动态示例 (Dynamic Few-Shot)
**优先级: 中**

当前 prompt 中的白名单和 negative example 是静态文本。对于复杂需求，LLM 仍然可能构造出不合理的 wiring 或 ruleEngine。

**优化方向:**
- 建立一个 `examples/` 目录，存放高质量的 Blueprint JSON 示例（如 talent_draw、dash、projectile）。
- 在 `prompt-builder.ts` 中，根据需求 embedding 匹配最相似的 1-2 个示例，注入到 system prompt 中作为 few-shot。
- 可以显著提升 wiring 和 ruleEngine 的生成质量。

---

## 6. Wiring Engine 的可视化与可调试性
**优先级: 中低**

当前 wiring 以数组形式存在，难以直观理解 feature 之间的数据流。

**优化方向:**
- 生成一个 Mermaid 或 Graphviz 图，展示 `customInput -> ruleEngine -> dataSystem -> UI -> modifiers` 的完整链路。
- 在 E2E 输出中附带该图，便于快速审阅架构是否合理。
- 未来可集成到 MCP Server 的返回中，供 IDE/前端渲染。

---

## 7. 多轮 Self-Correction (ReAct) 循环
**优先级: 中**

当前 pipeline 是单轮 LLM 调用。如果 blueprint 有轻微错误（如 patternId 不对、wiring 缺失），只能依赖 assembler 的兜底逻辑。

**优化方向:**
- 在 `mcp-server` 的 pipeline 中增加一个 feedback loop：
  1. LLM 生成 blueprint。
  2. Validator 检查并输出错误列表。
  3. 将错误列表回传给 LLM，要求修正。
- 限制最多 2-3 轮，避免 token 爆炸和延迟过高。

---

## 8. Pattern 版本管理与自动迁移
**优先级: 低**

随着 Pattern 库演进，旧项目中的生成代码可能与新版 Pattern 不兼容。

**优化方向:**
- 在 `metadata.json` 中增加 `version` 和 `migrations` 字段。
- 扫描项目中的 `// GENERATED_BY_PATTERN: xxx` 标记，检测版本漂移。
- 提供 `migrate` CLI 命令，自动将旧生成代码升级到新模板（类似 Django migrations）。

---

## 9. 编译时集成与热重载
**优先级: 低**

目前生成代码后需要手动运行 `yarn dev` 和 `yarn launch`。

**优化方向:**
- 在 E2E pipeline 成功后，自动触发 `tstl` 编译，并检测编译错误。
- 如果编译失败，将 TypeScript 错误信息回传给 LLM 进行 fix。
- 可选：监听生成文件变化，自动调用 `gulp` 或 `tstl --watch` 进行增量编译。

---

## 10. Prompt Token Budget 的精细化管理
**优先级: 低**

当前 `prompt-builder.ts` 已有 segment trimming 逻辑，但白名单部分（51 个 pattern ID）在 pattern 数量达到数百时会非常占 token。

**优化方向:**
- 白名单只注入与需求最相关的 category 的 pattern IDs（如需求提到 modifier，就只列 modifiers/*）。
- 或者将白名单从 prompt 中彻底移除，改为在 LLM 输出后由 validator 进行硬校验 + self-correction。

---

*End of Memory*


---

## UI Wizard 架构讨论 (2026-04-04)

### 当前架构的核心缺陷
当前流水线中，LLM 单轮生成 Blueprint 后，Assembler 直接“顺手”硬编码了 UI 的位置、颜色和布局（如 `margin-top: 140px`、`flow-children: down`）。这导致：
- **LLM 对 Dota2 Panorama 知识薄弱**：不了解 `flow-children`、`horizontal-align`、z-index、安全区等惯例。
- **Assembler 越权**：后端组装逻辑不应该负责像素级 UI 编排。
- **用户无设计参与**：没有机会表达“放在底部中央”、“仿照 DOTA Plus 风格”等需求。

### 理想的分层架构
UI 应该被拆为三层：

1. **功能蓝图层（Feature Blueprint）**
   LLM 只声明需要什么 UI 能力，不涉及布局。
   ```json
   { "uiComponents": [
     { "type": "selection_modal", "purpose": "talent_draw_3_choices" },
     { "type": "key_hint", "purpose": "activate_draw", "key": "F4" }
   ]}
   ```

2. **UI 设计规范层（UI Design Spec）**
   由专门的 Wizard / UI Designer Agent 生成，可通过交互询问用户偏好，并结合 RAG 检索 Dota2 Panorama 布局知识库。
   ```json
   {
     "layoutSystem": "bottom_center_dock",
     "components": {
       "key_hint": { "anchor": "bottom_center", "offset": [0, -40] },
       "selection_modal": { "type": "card_tray", "position": "screen_center" }
     }
   }
   ```

3. **UI 代码生成层（UI Assembler）**
   同时读取 Blueprint（数据+事件）和 Design Spec（位置+样式），生成具体的 `.tsx` 和 `.less`。

### 为什么 Dota2 必须做 Wizard + RAG
- Panorama 是“异类前端”：CSS 子集 + JSX，布局规则与 Web 差异大，性能陷阱多。
- 风格极度主观：同一功能可能有原神风、Artifact 风、极简风等多种需求，无法从一句话推断。
- 社区知识传承：优秀布局模式（bottom_hud_dock、floating_notification）没有官方文档，适合用 RAG 注入。

### 短期可落地建议
1. **紧急止血**：停止 assembler 硬编码 `margin`/`position`，改为统一 className + 全局 `design-tokens.less`。
2. **中期引入 UI Design Wizard**：检测到 `uiComponents` 时进入第二轮交互，生成 `uiDesignSpec.json`。
3. **长期 Visual Preview**：生成后展示静态布局图或 Mermaid 图，用户反馈“太靠左”后回退修正 Design Spec，而不是改 assembler。

---

## 关于项目通用性的诚实评估

### 现状：Pattern 可复用，但 Pipeline 不够健壮
如果隔天要做“抽取技能”的 feature，**80% 的组件可以直接复用**（weighted_pool、selection_modal、ability shell）。但**仍然可能遇到 2-4 次调试循环**。

### 根因不是业务复杂，而是基础设施脆弱
| 脆弱点 | 表现 | 对新 feature 的影响 |
|---|---|---|
| LLM 输出不稳定 | 同需求跑三次，blueprint 结构不同 | 任何 feature 都可能触发新边界 |
| Assembler 防御性不足 | manager.ts import 不存在的文件 | LLM 少一个字段就编译失败 |
| TS ↔ Lua 运行时鸿沟 | `DeepCopyTable` 编译通过但 nil | 任何 server template 都可能踩 |
| Shared file 历史污染 | modules/index.ts 越跑越脏 | 即使 feature 不同，旧污染仍会报错 |
| UI 硬编码布局 | margin-top: 140px 写死 | 任何带 UI 的 feature 都会冲突 |

### “一次跑通”的条件
只有当以下三个条件同时满足时，新 feature 才能一次成功：
1. LLM 输出完美匹配 assembler 预期；
2. 项目是第一次跑 E2E（无历史污染）；
3. 不触及任何未防御的边界。
这三个条件同时满足的概率约为 **30%-50%**。

### 真正提升通用性的关键（优先级高于新增 pattern）
1. **Blueprint Validator**：预组装校验，失败时回传 LLM 做 Self-Correction（ReAct）。
2. **Template 沙箱化**：每个 pattern 入库前必须通过 `tstl` 编译 + Dota2 运行时加载测试。
3. **AST 级 Shared File 管理**：用 `ts-morph` 替代 regex，或彻底改为动态 import 聚合。
4. **UI 与功能解耦**：引入 UI Design Spec / Wizard。

> 如果这四层护栏建好，“抽取技能”、“装备锻造”、“卡牌对战”等同构 feature 确实可以做到一次生成、直接可玩。

*End of Memory*


---

## Wizard + RAG 架构讨论 (2026-04-04 续)

### 现有语料评估：`moddota_panorama_docs.md`
- **内容**：53KB 的 ModDota Panorama 教程合集，覆盖 TS/React 配置、Webpack、DOTAScenePanel、Button 示例、第一个简单 UI。
- **缺陷**：严重缺少系统的 CSS 布局参考、常见 HUD 模式、性能知识、优秀案例拆解。
- **结论**：**可以起步，但质量受限**。直接用这份文档做 RAG，Wizard 能回答基础语法，但很难生成复杂的布局设计（如 Artifact 风格的底部滑轨）。

### 需要补充的两份语料
1. **`panorama_css_cookbook.md`**（自制，5-10KB）
   - 常见问题 → 代码片段（如何居中、底部停靠、不支持的 CSS 属性清单）。
2. **`dota2_ui_patterns.md`**（案例拆解，5KB）
   - 5-8 个常见 HUD 模式：Bottom HUD Dock、Center Modal、Top-Left Resource Bar、Card Tray 等。

### 最小可行的 Wizard + RAG 流程（MVP）
1. **构建向量库**：
   - 把 `moddota_panorama_docs.md` + `panorama_css_cookbook.md` + `dota2_ui_patterns.md` 切成 300-500 字 chunk。
   - 用智谱 `embedding-3`（2048 维）生成向量，存入本地 `ui-knowledge-embeddings.json`。
2. **Wizard 交互**：
   - 检测到 `uiComponents` 后，询问用户位置/风格偏好。
   - 将用户回答 embedding，做 cosine similarity 检索 Top-3 chunk。
3. **生成 Design Spec**：
   - Prompt 里注入用户偏好 + RAG 片段，输出严格的 `uiDesignSpec.json`。
4. **UI Assembler 消费 Spec**：
   - 不再硬编码 `margin-top: 140px`，而是根据 Spec 中的 `anchor`/`offset` 生成 className 和 `.less`。

### 智谱 API 可用信息
- Endpoint: `https://open.bigmodel.cn/api/paas/v4/embeddings`
- Model: `embedding-3`
- Dimensions: 2048
- Key: `2478270609b043aa9e868a2f7c6324c3.svlje7DyPob7RO8a`

### 下一步建议
- **快速路线**：我立即写一份 `panorama_css_cookbook.md`，用现有文档 + 自制 cookbok 搭最小可用 Wizard。
- **完善路线**：先花时间收集优秀自定义游戏 UI 案例，做成 `dota2_ui_patterns.md`，再统一 embedding。

---

## 关于项目通用性的补充

### 当前 truth
- **Pattern 层面通用性已有**（weighted_pool、selection_modal、stat_bonus 等可复用）。
- **Pipeline 工程健壮性不足**：换一个新 feature（如"抽取技能"），仍有 **50%-70% 概率需要 2-4 轮调试**。

### 根因
问题不在业务差异，而在基础设施脆弱：
1. LLM 输出不稳定（字段时有时无）→ Blueprint Validator 缺失
2. Assembler 防御性不足（import 不存在的文件）
3. TS ↔ Lua 运行时鸿沟（编译通过但 nil value）
4. Shared file 历史污染（regex cleanup 不完美）
5. UI 硬编码布局（任何带 UI 的 feature 都会冲突）

### 长期优先级
修好上述四层护栏（尤其是 **Validator + ReAct + UI 解耦**），比新增第 52 个 pattern 更能提升通用性。

 直接让 LLM 写 Panorama 代码是不可取的，原因我们已经验证过了：

  • LLM 会把 Web CSS 思维带进来：display: flex、position: absolute、box-shadow 等属性在 Panorama 里要么行为不同，要么直接不支持。
  • 它记不住 Panorama 的特殊 API（如 hittest、GameEvents.Subscribe 的参数类型、Panel 的生命周期）。
  • 生成的代码编译可能通过（因为 TS 定义比较宽松），但运行时很容易报错或表现异常。

  更理想的流程：分层生成

  用户偏好 + 截图描述
          ↓
      [Wizard]
          ↓
    "我需要底部卡片托盘，横向排列，居中"
          ↓
      [RAG检索]
          ↓
    Top-3 相关模式：Card Tray + Bottom Dock + flow-children: right
          ↓
      [LLM生成 Design Spec]
          ↓
    { "layoutSystem": "bottom_dock", "cardFlow": "right", ... }
          ↓
      [Assembler根据Spec+模板生成代码]
          ↓
    精确无误的 .tsx + .less

  这个架构把设计决策（LLM 擅长）和精确语法（Assembler 擅长）分开了：

  • LLM 只需要判断"三选一卡片应该横向排列在屏幕底部"，不需要记住 Panorama CSS 的具体写法。
  • Assembler 拿到 flow: right 和 anchor: bottom_center 后，从模板库里选最接近的模板进行填充，保证语法 100% 正确。

  RAG + Few-Shot + Cookbook 的价值就在于：让 LLM 做它擅长的"高层设计"，同时用检索到的知识约束它的设计空间，避免生成不切实际的布局。
*End of Memory*

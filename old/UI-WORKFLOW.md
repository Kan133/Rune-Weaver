# Dota2 Dev Copilot - UI Wizard 工作流指南

> 本指南记录如何收集游廊地图 UI 素材、构建 RAG 向量库、运行 UI Wizard，以及将其接入代码生成 Pipeline。

---

## 一、收集游廊地图 UI 素材

### 1.1 为什么需要收集
现有的 `moddota_panorama_docs.md` 是一份入门教程，缺少**真实项目中的布局模式、视觉风格、交互设计**。通过收集优秀游廊地图的 UI 案例，可以建立一个 `dota2_ui_patterns.md` 知识库，供 RAG 检索使用。

### 1.2 推荐收集方法：截图 + 三层标注
**不建议直接翻源码**。游廊代码质量参差不齐，源码分散且噪声大。

#### 步骤 1：获取截图
- **B 站 / YouTube**：搜索该游廊地图的实况视频，在关键帧暂停截图。
- **自己进游戏**：打开目标游廊地图，控制台输入 `dota_hud_stats 0` 隐藏默认 HUD，只保留自定义 UI 后截图。

#### 步骤 2：结构标注（在截图上框选+文字）
对每个 UI 组件标注以下信息：

| 标注项 | 说明 | 示例 |
|--------|------|------|
| **锚点 (Anchor)** | 组件相对于屏幕的哪个边 | `bottom-center` / `top-left` / `screen-center` |
| **尺寸 (Size)** | 固定像素宽度？还是百分比撑满？ | `width: 100%` / `固定 280px` |
| **流方向 (Flow)** | 内部子元素如何排列 | `flow-children: right` (横向) / `down` (纵向) |
| **层级 (Z-Index)** | 是否盖在其他 UI 之上 | `z-index: 100` (模态) / 无 (普通 HUD) |

#### 步骤 3：行为标注
- **出现/消失方式**：淡入？从底部滑入？直接显示？
- **是否可交互**：可点击？仅展示？是否需 `hittest: true`？
- **数据来源**：NetTable？Custom Game Event？Local Event？

### 1.3 整理成 `dota2_ui_patterns.md`
将收集的案例按以下格式写入文档：

```markdown
## [模式名称] - [简短描述]（参考《[地图名]》）
- **锚点**：底部中央 (`horizontal-align: center; vertical-align: bottom;`)
- **流方向**：`flow-children: right;`
- **尺寸**：卡片固定 200x280px，托盘宽度自适应
- **动画**：从屏幕下方 `translateY(100px)` 滑入，持续 0.3s
- **遮罩**：半透明黑色背景 `#000000aa`，`hittest: true` 防止穿透
- **布局 CSS 核心**：
  ```css
  .card-tray {
      horizontal-align: center;
      vertical-align: bottom;
      margin-bottom: 80px;
      flow-children: right;
  }
  .card {
      width: 200px;
      height: 280px;
      margin: 0 10px;
      flow-children: down;
      background-color: #1a1a1a;
      border-radius: 8px;
  }
  ```
```

建议收集 **5-8 个典型模式**，例如：
1. **底部技能/卡片托盘**（参考：刀塔自走棋、选技生存）
2. **中央模态选择框**（参考：各种抽卡/三选一系统）
3. **左上角资源条组**（参考：RPG 地图的血量+蓝量+能量条）
4. **右上角通知流**（参考：Overthrow 击杀提示）
5. **底部按键提示**（参考：自定义技能快捷栏）
6. **全屏 BUFF/装备面板**（参考： imba / epic boss fight）

文档放置位置：
```
dota2-dev-copilot/docs/dota2_ui_patterns.md
```

---

## 二、更新 RAG Embedding 向量库

### 2.1 什么时候需要更新
- 新增/修改了 `docs/panorama_css_cookbook.md`
- 新增/修改了 `docs/dota2_ui_patterns.md`
- 更新了 `docs/moddota_panorama_docs.md`

### 2.2 更新步骤

```bash
cd dota2-dev-copilot/packages/ui-wizard
node dist/build-embeddings.js
```

执行后，会自动：
1. 读取 `docs/` 目录下的所有 `.md` 文档
2. 按 `##` / `###` 标题切分成 chunk
3. 调用**智谱 `embedding-3`** API 生成 2048 维向量
4. 写入本地文件：`dota2-dev-copilot/packages/ui-wizard/rag-store.json`

### 2.3 检查更新结果
```bash
# 查看生成的 chunk 数量
node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync('rag-store.json')); console.log('Chunks:', d.count); d.chunks.slice(0,3).forEach(c=>console.log('-', c.tag));"
```

---

## 三、运行 UI Wizard

### 3.1 独立运行（测试/调试）
```bash
cd dota2-dev-copilot/packages/ui-wizard
node dist/cli.js
```

按提示回答 5 个问题后，会输出一个 `uiDesignSpec.json` 结构，例如：

```json
{
  "version": "1.0.0",
  "layoutSystem": "default",
  "components": {
    "selection_modal": {
      "position": "screen_center",
      "offset": [0, 0],
      "flow": "right",
      "style": "card_tray"
    },
    "resource_bar": {
      "position": "top_left",
      "offset": [20, 20]
    },
    "key_hint": {
      "position": "bottom_left",
      "offset": [20, -20]
    }
  },
  "designTokens": {
    "backdropColor": "#000000aa",
    "cardBorderRadius": "8px",
    "rarityColors": { "R": "#22cc44", "SR": "#2288ff", "SSR": "#ff8800", "UR": "#ff2222" },
    "glowIntensity": "low"
  },
  "ragContext": [ ... ]
}
```

### 3.2 程序化调用（在 Pipeline 中）

```typescript
import { UIWizard } from '@dota2-copilot/ui-wizard';

const wizard = new UIWizard();
const answers = {
  modal_position: '底部中央 (bottom_center)',
  card_flow: '横向排列 (horizontal)',
  resource_position: '左上角 (top_left)',
  keyhint_position: '左下角 (bottom_left)',
  style_theme: '炫酷发光 (glowing)',
};
const spec = await wizard.generateDesignSpec(answers, 'talent_draw_system');
```

---

## 四、将 UI Wizard 接入 Pipeline

### 4.1 接入点
在 `mcp-server` 或 `test-e2e-full.mjs` 的流程中，**LLM 生成 Blueprint 之后、Assembler 执行之前**，插入 Wizard 步骤：

```
用户输入需求
    ↓
LLM 生成 FeatureBlueprint
    ↓
【新增】如果 blueprint 包含 uiComponents，运行 UI Wizard
    ↓
将 uiDesignSpec 附加到 blueprint
    ↓
Assembler 读取 blueprint.uiDesignSpec 生成代码
```

### 4.2 Assembler 改造目标
当前 `feature-assembler` 中的 UI 生成逻辑是**硬编码**的（如 `margin-top: 140px`）。改造后：

- **不再写死任何像素值**
- 从 `blueprint.uiDesignSpec` 读取：
  - `components.selection_modal.position` → 决定模态框的 CSS 类/容器结构
  - `designTokens.backdropColor` → 遮罩层颜色
  - `designTokens.rarityColors` → 卡片边框颜色
- 模板系统根据 `position` 和 `flow` 选择对应的布局片段进行填充

### 4.3 需要修改的文件
- `dota2-dev-copilot/packages/feature-assembler/src/index.ts`
  - `assembleFeature()`：读取 `blueprint.uiDesignSpec`
  - `assembleTalentDrawCoordinator()`：用动态布局替代硬编码 `draw_modal.tsx`
  - `assembleCustomResource()`：资源条位置由 Spec 驱动
  - `assembleKeyHint()`：按键提示位置由 Spec 驱动

---

## 五、快速检查清单

| 步骤 | 命令/动作 | 检查点 |
|------|-----------|--------|
| 收集 UI 素材 | 截图 + 写 `docs/dota2_ui_patterns.md` | 至少 5 个模式，带锚点和流方向 |
| 更新 Embedding | `node dist/build-embeddings.js` | `rag-store.json` 中 chunk 数量 > 0 |
| 运行 Wizard | `node dist/cli.js` | 输出 JSON 包含 `components` 和 `designTokens` |
| 编译 Assembler | `pnpm build` | `feature-assembler` 无 TS 错误 |
| E2E 测试 | `node test-e2e-full.mjs` | 生成代码编译通过，UI 位置符合预期 |

---

## 六、智谱 API 信息

- **Endpoint**: `https://open.bigmodel.cn/api/paas/v4/embeddings`
- **Model**: `embedding-3`
- **Dimensions**: `2048`
- **API Key**: `2478270609b043aa9e868a2f7c6324c3.svlje7DyPob7RO8a`

---

*Last updated: 2026-04-05*

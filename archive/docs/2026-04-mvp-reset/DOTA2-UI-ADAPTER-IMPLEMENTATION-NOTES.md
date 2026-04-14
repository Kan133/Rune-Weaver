# Dota2 UI Adapter Implementation Notes

## 1. 文档目的

为下一轮 UI Adapter 实现提供清晰边界和入口。

目标：
- 明确先做什么，不做什么
- 回答关键实现问题
- 让后续 agent 可以直接开始最小实现

---

## 2. 核心问题回答

### 2.1 模板文件应放在哪

**源代码模板**（供 Adapter 读取和填充）：

```
adapters/dota2/ui/templates/
├── selection-modal/
│   ├── component.tsx.template
│   └── styles.less.template
├── key-hint/
│   ├── component.tsx.template
│   └── styles.less.template
└── resource-bar/
    ├── component.tsx.template
    └── styles.less.template
```

**生成的宿主文件**：

```
content/panorama/src/rune_weaver/generated/ui/
├── index.tsx              # 由 Adapter 生成
├── {featureId}.tsx        # 由 Adapter 生成
├── {featureId}.less       # 由 Adapter 生成
└── types.d.ts             # 可选，共享类型
```

### 2.2 TSX / LESS / Index 如何组织

**生成层级**：

```
AssemblyPlan
  ↓
UIAdapter.generate()
  ↓
├── 读取模板 (templates/)
├── 应用 UIDesignSpec 映射
├── 填充 AssemblyPlan 数据
├── 生成 {featureId}.tsx
├── 生成 {featureId}.less
└── 更新 index.tsx (刷新导出列表)
```

**index.tsx 刷新逻辑**：

```typescript
// 读取 workspace 中所有 active features
// 为每个 ui.* pattern 生成 import
// 生成 RuneWeaverGeneratedUIRoot 组件

// 示例输出：
import { RwDashQHint } from "./rw_dash_q";
import { RwTalentDrawModal } from "./rw_talent_draw";
import { RwEnergyBar } from "./rw_energy_bar";

export function RuneWeaverGeneratedUIRoot(): React.ReactElement {
  return (
    <>
      <RwDashQHint />
      <RwTalentDrawModal />
      <RwEnergyBar />
    </>
  );
}
```

### 2.3 哪些字段由 AssemblyPlan 决定

**AssemblyPlan 提供的结构数据**：

| 字段 | 示例 | 用途 |
|------|------|------|
| `featureId` | `"rw_dash_q"` | 文件名、组件名 |
| `patternId` | `"ui.key_hint"` | 选择哪个模板 |
| `blueprintId` | `"dash_ability_xxx"` | 注释/元数据 |
| `selectedPatterns` | 关联的已选 patterns | 数据接口推导 |

**数据接口推导示例**：

```typescript
// AssemblyPlan 中选中 patterns
selectedPatterns: [
  { patternId: "ui.key_hint", role: "hint" },
  { patternId: "input.key_binding", role: "trigger" },
  { patternId: "effect.dash", role: "effect" }
]

// UI Adapter 推导数据接口
// key_hint 需要从 key_binding 获取：
// - keyBinding: string (来自 input.key_binding 配置)
// - abilityName: string (来自 effect.dash 或 blueprint)
```

### 2.4 哪些字段由 UIDesignSpec 决定

**UIDesignSpec 影响的呈现层**：

| UIDesignSpec 字段 | 影响文件 | 影响方式 |
|------------------|----------|----------|
| `visualStyle.density` | LESS | 变量替换 |
| `visualStyle.themeKeywords` | LESS | 颜色映射 |
| `visualStyle.tone` | TSX | 文案模板 |
| `copyHints` | TSX | 占位符填充 |
| `feedbackHints` | LESS | CSS 类/动画 |
| `surfaces[].interactionMode` | TSX + LESS | 条件渲染/样式 |
| `surfaces[].layoutHints` | LESS | 布局类 |

**生成时合并**：

```typescript
function generateComponent(
  assemblyPlan: AssemblyPlan,
  designSpec: UIDesignSpec
): GeneratedUIComponent {
  // 1. 从 AssemblyPlan 获取结构
  const template = selectTemplate(assemblyPlan.patternId);
  const featureId = assemblyPlan.featureId;
  
  // 2. 从 UIDesignSpec 获取样式映射
  const styleVars = generateLessVariables(designSpec);
  const copyContent = selectCopyTemplates(designSpec);
  
  // 3. 合并生成
  return {
    tsx: fillTemplate(template.tsx, { featureId, copyContent }),
    less: fillTemplate(template.less, { styleVars })
  };
}
```

### 2.5 哪些暂时保留默认值

| 内容 | 默认值 | 暂不参数化原因 |
|------|--------|---------------|
| 动画时长 | 0.2s | 先稳定基础 |
| 缓动函数 | ease-out | 统一体验 |
| 字体族 | defaultFont | Panorama 标准 |
| 阴影算法 | 固定偏移 | 简化变量 |
| 响应式断点 | 无 | 先固定尺寸 |
| 复杂交互 | 无 | 超出第一阶段 |

---

## 3. 下一轮实现边界

### 3.1 应先做什么（优先级 P0）

1. **模板文件创建**
   - 创建 `adapters/dota2/ui/templates/` 目录
   - 编写 3 个 Pattern 的基础模板（参考 `DOTA2-UI-TEMPLATE-SCOPE.md`）

2. **Style Mapping 实现**
   - 实现 `style-mappings.ts`
   - 支持 density、themeKeywords 的基本映射

3. **最小生成器**
   - 实现 `UIAdapter.generate()` 基础流程
   - 能生成可编译的 TSX/LESS 文件

4. **Index 刷新逻辑**
   - 实现 `refreshUIIndex()`
   - 正确聚合所有 active features

### 3.2 应后做什么（优先级 P1）

1. **NetTable 集成**
   - 生成 NetTable 监听代码
   - 类型定义同步

2. **复杂布局变体**
   - 支持 layoutHints 的更多选项

3. **文案国际化**
   - copyHints 的多语言支持

### 3.3 明确不做（超出本轮）

| 不做 | 原因 |
|------|------|
| 真实写入宿主文件 | 需 Write Executor 就绪 |
| 更复杂的 React Panorama 特性扩展 | Phase 1 暂不扩，先沿用当前宿主的 TSX/React 基线 |
| 复杂动画系统 | 超出范围 |
| 可视化 UI 编辑器 | 超出产品边界 |
| 任意布局生成 | 属于 gap fill |

---

## 4. 代码结构建议

### 4.1 推荐目录结构

```
adapters/dota2/
├── ui/
│   ├── index.ts                    # 主入口
│   ├── types.ts                    # UI 类型定义
│   ├── generator.ts                # 生成器核心
│   ├── templates/                  # 模板文件
│   │   ├── selection-modal/
│   │   ├── key-hint/
│   │   └── resource-bar/
│   ├── mappings/                   # 映射规则
│   │   ├── style-mappings.ts       # 样式映射
│   │   └── copy-mappings.ts        # 文案映射
│   └── utils/                      # 工具函数
│       ├── template-engine.ts      # 模板填充
│       └── naming.ts               # 命名规范
```

### 4.2 核心接口定义

```typescript
// adapters/dota2/ui/types.ts

export interface UITemplate {
  id: string;
  tsxTemplate: string;
  lessTemplate: string;
}

export interface UIGenerationOptions {
  featureId: string;
  patternId: string;
  blueprintId: string;
  designSpec: UIDesignSpec;
  assemblyData: Record<string, unknown>;
}

export interface GeneratedUIComponent {
  fileName: string;
  tsxContent: string;
  lessContent: string;
  dependencies: string[];
}

export interface UIAdapter {
  generate(options: UIGenerationOptions): GeneratedUIComponent;
  refreshIndex(features: string[]): string;
}
```

### 4.3 最小实现骨架

```typescript
// adapters/dota2/ui/generator.ts

import { UITemplate, UIGenerationOptions, GeneratedUIComponent } from "./types.js";
import { templates } from "./templates/index.js";
import { generateLessVariables, generateCopyContent } from "./mappings/index.js";

export function generateUIComponent(
  options: UIGenerationOptions
): GeneratedUIComponent {
  const { featureId, patternId, designSpec } = options;
  
  // 1. 选择模板
  const template = templates[patternId];
  if (!template) {
    throw new Error(`Unknown UI pattern: ${patternId}`);
  }
  
  // 2. 生成样式变量
  const styleVars = generateLessVariables(designSpec.visualStyle);
  
  // 3. 生成文案内容
  const copyContent = generateCopyContent(designSpec);
  
  // 4. 填充模板
  const tsxContent = fillTemplate(template.tsxTemplate, {
    featureName: toPascalCase(featureId),
    featureId,
    ...copyContent
  });
  
  const lessContent = fillTemplate(template.lessTemplate, {
    featureId,
    ...styleVars
  });
  
  return {
    fileName: `${featureId}.tsx`,
    tsxContent,
    lessContent: `${featureId}.less`,
    lessContent,
    dependencies: extractDependencies(tsxContent)
  };
}

function fillTemplate(template: string, data: Record<string, string>): string {
  // 简单的占位符替换
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
}
```

---

## 5. 与现有系统的集成

### 5.1 与 Assembler 的关系

```
Assembler
  ├── ServerAssembler
  ├── SharedAssembler
  └── UIAssembler (新增)
        ↓
      UIAdapter.generate()
```

### 5.2 与 Write Executor 的关系

```
UIAdapter.generate() -> GeneratedUIComponent
  ↓
WriteExecutor
  ├── 写入 {featureId}.tsx
  ├── 写入 {featureId}.less
  └── 刷新 index.tsx
```

### 5.3 与 Workspace 的关系

- 从 Workspace 读取 active features
- 更新 index.tsx 时基于当前 active features
- 不直接操作 workspace 文件

---

## 6. 测试与验证

### 6.1 单元测试建议

```typescript
// 测试用例示例
describe("UIAdapter", () => {
  test("should generate selection_modal with mystery theme", () => {
    const result = generateUIComponent({
      featureId: "rw_test",
      patternId: "ui.selection_modal",
      designSpec: {
        visualStyle: { themeKeywords: ["mystery"] }
      }
    });
    
    expect(result.lessContent).toContain("#6b4c9a");  // 紫色主题
  });
  
  test("should apply density mapping correctly", () => {
    const result = generateUIComponent({
      featureId: "rw_test",
      patternId: "ui.key_hint",
      designSpec: {
        visualStyle: { density: "low" }
      }
    });
    
    expect(result.lessContent).toContain("48px");  // 大尺寸
  });
});
```

### 6.2 集成验证

1. **类型检查**：生成的 TSX 能通过 TypeScript 编译
2. **样式检查**：生成的 LESS 无语法错误
3. **结构检查**：index.tsx 正确导出所有组件

---

## 7. 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 模板过于僵化 | 保留占位符扩展点 |
| UIDesignSpec 映射不完善 | 提供合理的默认值 |
| Panorama API 变化 | 模板版本化 |
| 生成的代码风格不一致 | 使用统一的 template engine |

---

## 8. 下一步行动清单

### 立即可以开始（有清晰边界）：

- [ ] 创建 `adapters/dota2/ui/` 目录结构
- [ ] 创建 3 个 Pattern 的模板文件
- [ ] 实现 `style-mappings.ts`
- [ ] 实现基础 `generator.ts`

### 等待依赖就绪：

- [ ] 集成到 Assembler（等待 Assembler 接口稳定）
- [ ] 真实写入宿主（等待 Write Executor）
- [ ] 端到端测试（等待完整链路）

---

## 9. 关键文档索引

实现时需参考：

| 文档 | 用途 |
|------|------|
| `DOTA2-UI-TEMPLATE-SCOPE.md` | TSX/LESS 模板结构 |
| `UIDESIGNSPEC-TO-TEMPLATE-MAPPING.md` | 字段映射规则 |
| `UI-PATTERN-STRATEGY.md` | UI Pattern 边界 |
| `DOTA2-UI-ADAPTER-SCOPE.md` | 宿主目录和 bridge |

---

## 10. 总结

下一轮实现的核心原则：

> **先让 3 个核心 Pattern 能生成可编译的代码，再扩展能力。**
>
> **AssemblyPlan.selectedPatterns 决定结构，UIDesignSpec 决定呈现，默认值保底。**

从模板文件开始，逐步连接生成器和现有系统。

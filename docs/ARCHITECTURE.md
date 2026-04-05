# ARCHITECTURE

## 分层

Rune Weaver 当前推荐分四层：

1. Interface
2. Core Planning
3. Adapter
4. Host Execution

## 1. Interface

负责用户入口与结构化输入输出。

主要包括：

- CLI
- Wizard CLI
- Blueprint CLI
- Assembly CLI

这一层不应硬编码 provider 细节，也不应直接写宿主文件。

## 2. Core Planning

这是当前产品核心。

主要包括：

- Wizard
- IntentSchema
- Blueprint Builder
- Pattern Resolution
- AssemblyPlan Builder
- Validation

主链路：

```text
User Request
  -> Wizard
  -> IntentSchema
  -> Blueprint
  -> Pattern Resolution
  -> AssemblyPlan
```

这一层负责把自然语言逐步收敛成受控代码计划。

## 3. Adapter

Adapter 负责把抽象计划对齐到具体宿主语义。

当前主要是 Dota2 Adapter，负责：

- host scanning
- host validation
- host mapping
- bridge planning
- assembler scope
- UI adapter scope

Adapter 不应污染 Core 的抽象对象。

## 4. Host Execution

这一层负责最终写入和运行。

当前只允许受控写入：

- RW 自有文件
- RW 索引刷新
- 明确允许的 `inject_once`

不允许：

- 任意宿主旧文件智能改写
- 任意 merge
- 全项目重构

## 核心对象流

```text
IntentSchema
  -> Blueprint
  -> AssemblyPlan
  -> Host Write Plan
```

边界必须保持：

- `IntentSchema` 不是 `Blueprint`
- `Blueprint` 不是宿主代码
- `AssemblyPlan` 不是最终落盘结果

## UI 在架构中的位置

UI 是代码输出面的一个子集，不是平行于主产品的新主线。

当前应拆成三层理解：

1. UI mechanic
2. UI host binding
3. UI design support

### UI mechanic

例如：

- `ui.selection_modal`
- `ui.key_hint`
- `ui.resource_bar`

### UI host binding

负责把 UI mechanic 落到 Panorama / TSX / LESS / bridge 规则。

### UI design support

由 `UIDesignSpec` 表达：

- 布局
- 信息密度
- 风格关键词
- 表现层提示

### UI Wizard 的位置

UI Wizard 不应取代主 Wizard。

推荐结构是：

- 主 Wizard 先产出 `IntentSchema`
- Blueprint 或 UI Need Detection 判断是否需要 UI 分支
- 只有在必要时进入 UI Wizard
- UI Wizard 只负责产出 `UIDesignSpec`

## UI 入口原则

在 Dota2 宿主中，UI 入口应分两层理解：

- `UI entry root`
  - 例如宿主 HUD 入口 `content/panorama/src/hud/script.tsx`
  - 只负责一次性桥接接线
- `UI surfaces`
  - 例如 `content/panorama/src/rune_weaver/generated/ui/**`
  - 负责具体生成的 UI 组件与样式

因此：

- `script.tsx` 是桥接入口，不是全部 UI 的唯一位置
- 具体 UI surface 应落到 Rune Weaver 自己的命名空间目录

## LLM 在架构中的位置

当前不引入 `LangChain` / `LangGraph`。

当前推荐：

- 统一 `LLMClient`
- Wizard 消费有限上下文
- Blueprint Builder 消费结构化 `IntentSchema`
- Pattern Resolution 优先走 catalog 和规则

## 当前最危险的退化方向

### 1. Assembler 硬编码领域分支

例如：

```ts
if (domain === "talent") {
  generateTalentModal();
}
```

这是错误方向。

### 2. Pattern 参数被领域词污染

例如：

- `isTalent`
- `isCard`
- `isForgeUpgrade`

### 3. Host write 范围失控

例如：

- 散写宿主各处文件
- 任意 patch 手写逻辑
- 让生成器修改自己不拥有的区域

## 当前架构结论

Rune Weaver 当前不是“自然语言直接到宿主代码”的单跳系统。

它是一个通过 `IntentSchema -> Blueprint -> AssemblyPlan` 保持可验证、可复用、可控宿主写入边界的 `NL-to-Code` 系统。

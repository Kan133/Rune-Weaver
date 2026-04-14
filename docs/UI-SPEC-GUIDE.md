# UI-SPEC-GUIDE

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: temporary
> Last verified: 2026-04-14
> Read when: planning future `UIDesignSpec` scope and UI intake boundaries
> Do not use for: current baseline architecture, current UI realization authority, or proof that UI spec contracts are already shipped

## 目标

这份文档定义 `UIDesignSpec` 的最小可执行范围，并明确：

- 哪些问题属于 UI Wizard
- 哪些问题属于 UI pattern
- 哪些问题才可能进入 constrained gap fill

## UIDesignSpec 的角色

`UIDesignSpec` 负责表达 UI 呈现方式，而不是业务规则。

它应帮助 Dota2 UI Adapter 解决：

- surface 怎么组织
- 信息怎么呈现
- 交互强度如何
- 风格与文案偏向如何

它不应解决：

- 规则逻辑
- 结果应用逻辑
- server 数据来源逻辑

## 最小字段建议

```ts
export interface UIDesignSpec {
  surfaces: UISurfaceSpec[];
  visualStyle?: UIVisualStyle;
  copyHints?: string[];
  feedbackHints?: string[];
}

export interface UISurfaceSpec {
  id: string;
  type: "modal" | "hud" | "hint" | "panel" | "overlay";
  purpose: string;
  inputs?: string[];
  outputs?: string[];
  layoutHints?: string[];
  interactionMode?: "blocking" | "lightweight" | "persistent";
  autoDismissMs?: number;
}

export interface UIVisualStyle {
  tone?: string;
  density?: "low" | "medium" | "high";
  themeKeywords?: string[];
}
```

## UI Wizard 应问什么

UI Wizard 当前只应问高价值问题。

### 1. 需要哪类 surface

例如：

- modal
- hint
- resource bar
- overlay

### 2. 交互强度

例如：

- 强打断
- 弱提示
- 常驻显示

### 3. 信息密度

例如：

- 低密度
- 中密度
- 高密度

### 4. 风格关键词

例如：

- 功能型
- 神秘感
- 科技感
- 战斗感

### 5. 关键文案偏好

例如：

- 简短直接
- 说明型
- 带 flavor text

## 哪些属于 UI pattern

以下内容优先属于 UI pattern：

- 选择弹窗
- 按键提示
- 资源条
- toast
- overlay panel

也就是说，“UI 的功能形态”优先由 pattern 承接。

## 哪些属于 UIDesignSpec

以下内容优先属于 `UIDesignSpec`：

- 布局提示
- 密度
- 风格关键词
- 文案提示
- 反馈方式

也就是说，“UI 长什么样”优先由 spec 承接。

## 哪些才属于 constrained gap fill

只有这些尾部内容才适合考虑 constrained gap fill：

- 微文案补全
- style token 局部扩展
- 小型布局变体
- 局部反馈文案

当前不应让 gap fill 承接：

- 整个 UI 结构
- 整个 UI 状态机
- 宿主 UI 代码主逻辑

## 与宿主的关系

在 Dota2 宿主中：

- `content/panorama/src/hud/script.tsx` 是 `UI entry root`
- `content/panorama/src/rune_weaver/generated/ui/**` 是实际 UI surface 落地点

`UIDesignSpec` 最终应被消费为：

- TSX 组件骨架
- LESS / style 骨架
- UI bridge 接入要求

## 当前推荐做法

当前阶段：

- 先保持 `UIDesignSpec` 小而稳
- 先支持 `ui.selection_modal` / `ui.key_hint` / `ui.resource_bar`
- 先让 UI Wizard 只问少量关键问题
- 不要提前做成复杂 UI 设计系统

## 当前结论

`UIDesignSpec` 应被看作 `NL-to-Code` 链路中的一个受控辅助对象。它的工作是让 UI 输出更可用、更清晰、更可感知，而不是替代 Pattern 或替代宿主代码生成。

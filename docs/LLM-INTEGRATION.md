# LLM Integration

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-14
> Read when: aligning LLM placement, provider boundaries, and proposal-stage usage rules
> Do not use for: granting LLM final authority over blueprint, host realization, or write execution

## 1. 文档目的

本文档定义 Rune Weaver 的最小 LLM 接入方案。

目标不是引入重型 agent framework，而是先为下面这条链路提供稳定接口：

`Wizard -> IntentSchema -> optional BlueprintProposal -> BlueprintNormalizer -> FinalBlueprint`

当前阶段重点：

- 先接入真实模型
- 先跑通最小闭环
- 不把上层产品模型绑死在某个 SDK 或厂商上

## 2. 当前结论

Rune Weaver 当前不应优先引入：

- `LangChain`
- `LangGraph`

原因：

- 当前主要问题不在 agent graph，而在产品核心模型和宿主闭环
- `IntentSchema / FinalBlueprint / AssemblyPlan` 这些对象已经是 Rune Weaver 自己的核心抽象
- 过早引入外部编排框架，容易让产品编排被框架抽象反向主导

因此当前方案是：

`薄 Provider 层 + 统一内部 LLMClient 接口 + .env 配置`

并且在架构边界上明确：

- LLM 可以帮助 `Wizard`
- LLM 可以帮助生成 `BlueprintProposal`
- `BlueprintNormalizer` 与 `FinalBlueprint` 仍然必须是 deterministic gate
- LLM 不是 final pattern authority
- LLM 不是 final host realization authority
- LLM 不是 final write-path authority

## 3. 设计原则

### 3.1 上层只依赖 Rune Weaver 自己的接口

`Wizard`、`BlueprintProposalRunner`、后续其他上层编排器都不应直接依赖：

- OpenAI SDK
- Anthropic SDK
- 厂商私有响应对象

它们只应依赖 Rune Weaver 内部的 `LLMClient`。

### 3.2 抽象“能力”，不是抽象“品牌”

Rune Weaver 真正在乎的是：

- 生成文本
- 生成结构化对象
- 控制 system / user 消息
- 控制 temperature / max tokens
- 是否支持兼容 base URL

因此抽象应围绕这些能力，而不是围绕品牌名。

### 3.3 Provider 层要薄

Provider 层职责仅限于：

- 读取配置
- 调用底层 SDK 或兼容 HTTP 接口
- 归一化响应
- 把错误转换成 Rune Weaver 自己的错误类型

Provider 层不应承载：

- Wizard 业务逻辑
- Blueprint finalization 逻辑
- Pattern 选择逻辑
- 宿主写入逻辑

## 4. 推荐实现层次

推荐分三层：

### 4.1 配置层

负责：

- 从 `.env` 读取 provider、base URL、api key、model
- 校验必要配置是否存在

### 4.2 Provider 层

负责：

- 实现 `LLMClient`
- 适配 OpenAI-compatible 或 Anthropic-compatible 能力

### 4.3 应用层

负责：

- `WizardRunner`
- `BlueprintProposalRunner`
- 其他需要 LLM 的上层流程

应用层不关心底层 SDK，只关心 `LLMClient`。

## 5. 当前推荐 Provider 分类

当前不建议一开始就写很多厂商专属 provider。

第一阶段只建议支持两类：

### 5.1 `openai-compatible`

适用于：

- OpenAI
- Kimi（若提供 OpenAI 兼容接口）
- 其他兼容 OpenAI Chat/Responses 风格的服务

### 5.2 `anthropic`

适用于：

- Anthropic Claude

当前阶段建议：

- 先正式实现 `openai-compatible`
- `anthropic` 可以先定义接口和配置格式，稍后补实现

## 6. 配置方案

### 6.1 `.env` 示例：OpenAI-compatible

```env
LLM_PROVIDER=openai-compatible

OPENAI_BASE_URL=https://your-compatible-endpoint
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=your_model_name
```

### 6.2 `.env` 示例：Anthropic

```env
LLM_PROVIDER=anthropic

ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_API_KEY=your_api_key
ANTHROPIC_MODEL=claude-...
```

### 6.3 安全约束

- 仓库中的 `api.txt` 只可作为本地人工参考
- 正式实现不应直接读取 `api.txt`
- 代码应优先从环境变量读取密钥
- 不应把真实 key 写进源码、测试快照或文档示例

## 7. 最小接口建议

### 7.1 消息类型

```ts
export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
```

### 7.2 文本生成输入输出

```ts
export interface GenerateTextInput {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateTextResult {
  text: string;
  raw?: unknown;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}
```

### 7.3 结构化对象生成输入输出

```ts
export interface GenerateObjectInput<T> {
  messages: LLMMessage[];
  schemaName: string;
  schemaDescription?: string;
  schema: unknown;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateObjectResult<T> {
  object: T;
  rawText?: string;
  raw?: unknown;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}
```

### 7.4 统一客户端接口

```ts
export interface LLMClient {
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
  generateObject<T>(input: GenerateObjectInput<T>): Promise<GenerateObjectResult<T>>;
}
```

## 8. Provider 工厂

建议提供统一入口：

```ts
export function createLLMClientFromEnv(): LLMClient
```

职责：

- 读取 `LLM_PROVIDER`
- 读取对应环境变量
- 创建对应 provider
- 配置缺失时抛出明确错误

当前建议支持：

- `openai-compatible`
- `anthropic`

## 9. 当前建议目录

```text
core/
  llm/
    types.ts
    errors.ts
    factory.ts
    providers/
      openai-compatible.ts
      anthropic.ts
```

## 10. 与 Wizard / Blueprint 的接入方式

当前阶段最合理的第一步不是让 LLM 直接产代码，而是：

`自然语言 -> LLM -> IntentSchema`

因此第一版优先支持：

- `WizardRunner` 调 `generateObject<IntentSchema>()`

在 blueprint 阶段，允许的下一步是：

- `BlueprintProposalRunner` 调 `generateObject<BlueprintProposal>()`
- 然后交给 deterministic `BlueprintNormalizer`

而不是优先支持：

- 任意代码生成
- 工具调用编排
- 多 agent 图执行

这能先验证：

- 真实模型是否能稳定进入 Rune Weaver 主链路
- `IntentSchema` 是否足够承接真实语言输入
- proposal 阶段是否能补充规则系统难以恢复的结构信息

必须继续禁止：

- 让 LLM 直接产出 final executable blueprint
- 让 LLM 决定 final pattern selection
- 让 LLM 决定 host realization family
- 让 LLM 决定 generator routing
- 让 LLM 决定 write targets

## 11. 错误处理建议

建议统一错误类型，例如：

```ts
export class LLMConfigError extends Error {}
export class LLMRequestError extends Error {}
export class LLMResponseParseError extends Error {}
```

要求：

- 配置缺失报配置错误
- HTTP / SDK 请求失败报请求错误
- 结构化输出无法解析时报解析错误

上层不应直接处理 SDK 私有错误对象。

## 12. 当前不做的事

当前阶段不做：

- 引入 LangChain
- 引入 LangGraph
- 多 provider 的高级路由
- prompt registry 平台化
- tool calling agent graph
- 长流程 checkpoint / resume
- 自动 fallback 到多个模型
- LLM final blueprint authority
- LLM host/write authority

## 13. 推荐下一步

围绕本方案，建议按这个顺序推进：

1. 建立 `core/llm/types.ts`
2. 建立 `core/llm/factory.ts`
3. 实现 `openai-compatible` provider
4. 用真实模型打通 `Wizard -> IntentSchema`
5. 在需要时补 `BlueprintProposal`
6. 用 deterministic `BlueprintNormalizer` 做 proposal gate
7. 再决定是否需要补 `anthropic`

## 14. 当前结论

Rune Weaver 当前最合理的 LLM 接入方式是：

`用 Rune Weaver 自己的统一 LLMClient 接口，底层只做薄 Provider 适配，优先支持 openai-compatible，通过 .env 读取 base_url / api_key / model；LLM 可以帮助 Wizard 和可选 BlueprintProposal，但 FinalBlueprint、HostRealization、GeneratorRouting、Write authority 仍保持 deterministic control。`

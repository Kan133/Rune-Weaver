# Blueprint CLI 使用指南

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-14
> Read when: using or reviewing the current blueprint CLI entry points
> Do not use for: final blueprint authority semantics, current planning truth, or proof that newer blueprint proposals are shipped

## 1. 目的

本文档说明 Rune Weaver 当前的 `blueprint` CLI 如何使用，以及它的输入输出边界。

当前 `blueprint` 命令负责：

- 从自然语言运行 `Wizard -> IntentSchema -> Blueprint`
- 从已有 `IntentSchema` 文件生成 `Blueprint`
- 验证 `Blueprint`
- 输出结构化 JSON 或写入文件

它当前不负责：

- 直接写入 Dota2 宿主
- 直接生成 `AssemblyPlan`
- 直接落地宿主代码

## 2. 快速开始

### 2.1 从自然语言生成 Blueprint

```bash
npm run cli -- blueprint "做一个按Q键的冲刺技能"
```

### 2.2 JSON 输出

```bash
npm run cli -- blueprint "做一个按Q键的冲刺技能" --json
```

### 2.3 输出到文件

```bash
npm run cli -- blueprint "做一个按Q键的冲刺技能" --output tmp/blueprint.json
```

### 2.4 从 IntentSchema 文件生成

```bash
npm run cli -- blueprint --from tmp/intent-schema.json
```

### 2.5 验证 Blueprint

```bash
npm run cli -- blueprint validate --from tmp/blueprint.json
```

## 3. 命令说明

### 3.1 `blueprint "<需求文本>"`

执行完整链路：

```text
自然语言
  -> Wizard
  -> IntentSchema
  -> BlueprintBuilder
  -> Blueprint Validation
```

### 3.2 `blueprint --from <file>`

跳过 Wizard，直接从已有 `IntentSchema` 文件生成 `Blueprint`。

适合：

- 调试 BlueprintBuilder
- 固定 schema 回归验证
- agent 接力执行

### 3.3 `blueprint validate --from <file>`

只验证 `Blueprint` 文件，不重新跑 Wizard。

## 4. 当前返回状态

`blueprint --json` 当前使用以下状态：

| 状态 | 含义 |
|---|---|
| `success` | Blueprint 生成成功，且验证通过 |
| `schema_not_ready` | IntentSchema 需要继续澄清，这是正常分支 |
| `validation_error` | Blueprint 已生成，但验证未通过 |
| `execution_error` | 命令执行失败，属于真正错误 |

## 5. JSON 输出结构

### 5.1 `success`

```json
{
  "status": "success",
  "schema": {
    "version": "1.0",
    "request": {
      "rawPrompt": "做一个按Q键的冲刺技能",
      "goal": "按Q触发一次冲刺效果"
    },
    "classification": {
      "intentKind": "micro-feature",
      "confidence": "medium"
    },
    "normalizedMechanics": {
      "trigger": true,
      "outcomeApplication": true
    },
    "isReadyForBlueprint": true
  },
  "blueprint": {
    "id": "micro_feature_xxx",
    "version": "1.0",
    "summary": "按Q触发一次冲刺效果",
    "sourceIntent": {
      "intentKind": "micro-feature",
      "goal": "按Q触发一次冲刺效果",
      "normalizedMechanics": {
        "trigger": true,
        "outcomeApplication": true
      }
    },
    "modules": [
      {
        "id": "mod_input_0",
        "role": "处理按键输入",
        "category": "trigger",
        "responsibilities": ["处理按键输入"]
      },
      {
        "id": "mod_effect_0",
        "role": "应用冲刺效果",
        "category": "effect",
        "responsibilities": ["应用冲刺效果"]
      }
    ],
    "connections": [
      {
        "from": "mod_input_0",
        "to": "mod_effect_0",
        "purpose": "触发效果应用"
      }
    ],
    "patternHints": [
      {
        "category": "input",
        "suggestedPatterns": ["input.key_binding"],
        "rationale": "需要输入触发机制"
      }
    ],
    "assumptions": [],
    "validations": [],
    "readyForAssembly": true
  },
  "validation": {
    "valid": true,
    "errors": [],
    "warnings": [],
    "stats": {
      "moduleCount": 2,
      "connectionCount": 1,
      "inputModuleCount": 1,
      "effectModuleCount": 1,
      "uiModuleCount": 0,
      "dataModuleCount": 0,
      "maxDepth": 1
    }
  },
  "reviewArtifact": {
    "version": "1.0",
    "generatedAt": "2026-04-05T00:00:00.000Z",
    "sourceSchema": {
      "goal": "按Q触发一次冲刺效果",
      "intentKind": "micro-feature",
      "isReadyForBlueprint": true
    },
    "blueprint": {
      "id": "micro_feature_xxx",
      "summary": "按Q触发一次冲刺效果",
      "moduleCount": 2,
      "connectionCount": 1
    },
    "patternHints": [],
    "assumptions": [],
    "readyForAssembly": true,
    "notes": []
  },
  "message": "Blueprint 生成成功"
}
```

### 5.2 `schema_not_ready`

```json
{
  "status": "schema_not_ready",
  "schema": {
    "request": {
      "goal": "做一个按Q键的冲刺技能"
    },
    "openQuestions": [
      "冲刺距离是多少？",
      "是否有冷却或资源消耗？"
    ],
    "resolvedAssumptions": [
      "当前默认这是一个微功能需求"
    ],
    "isReadyForBlueprint": false
  },
  "message": "IntentSchema 需要进一步澄清"
}
```

这不是错误，而是正常澄清分支。

### 5.3 `validation_error`

```json
{
  "status": "validation_error",
  "blueprint": { "...": "..." },
  "validation": {
    "valid": false,
    "errors": [
      {
        "code": "EMPTY_MODULES",
        "scope": "blueprint",
        "severity": "error",
        "message": "Blueprint 必须至少包含一个模块",
        "path": "modules"
      }
    ],
    "warnings": []
  },
  "message": "Blueprint 验证未通过"
}
```

### 5.4 `execution_error`

```json
{
  "status": "execution_error",
  "message": "LLM provider 初始化失败"
}
```

## 6. I/O 边界说明

### 6.1 stdout

当使用 `--json` 时：

- `stdout` 只用于输出结构化 JSON
- 机器消费应只读取 `stdout`

### 6.2 stderr

以下内容可能输出到 `stderr`：

- 进度日志
- 提示信息
- 人类可读错误信息

因此：

- `stderr` 不应被当作 JSON 解析输入
- 如果后续需要更干净的自动化消费，可再考虑增加 `--quiet`

## 7. 常见场景

### 7.1 Blueprint 还没 ready

现象：

- 返回 `schema_not_ready`

处理方式：

- 读取 `openQuestions`
- 补充需求信息
- 重新运行 `blueprint`

### 7.2 只想回放固定 schema

做法：

```bash
npm run cli -- blueprint --from tmp/intent-schema.json --json
```

### 7.3 只想检查 Blueprint 是否合格

做法：

```bash
npm run cli -- blueprint validate --from tmp/blueprint.json --json
```

## 8. 当前限制

当前 `blueprint` 命令仍有以下限制：

- 还没有进入真实 `AssemblyPlan`
- 还没有直接接入 Dota2 写入链路
- Pattern 仍以 `patternHints` 形式存在，不等于最终解析结果
- `schema_not_ready` 时不会自动继续追问，只会返回澄清需求

## 9. 下一步位置

当前 `blueprint` CLI 的正确位置是：

```text
Wizard
  -> IntentSchema
  -> Blueprint
  -> Blueprint Validation
```

下一阶段才应继续推进：

```text
Blueprint
  -> Pattern Resolution
  -> AssemblyPlan
  -> Host Write
```

# ⚠️ 此文档已归档 (ARCHIVED)

**状态**: 已过时 (Obsolete)  
**归档日期**: 2026-04-05  
**替代文档**: [docs/HOST-INTEGRATION-DOTA2.md](/D:/Rune%20Weaver/docs/HOST-INTEGRATION-DOTA2.md)

---

## 归档原因

本文档描述的集成规范已被新的宿主集成方案取代：

| 过时内容 | 新规范 (HOST-INTEGRATION-DOTA2.md) |
|---------|-----------------------------------|
| 输出到 `game/scripts/vscripts/` | 输出到 `game/scripts/src/rune_weaver/` |
| 使用 `addon_init.lua` 注册 | 通过 `modules/index.ts` 桥接 |
| 使用 `.rune-weaver/manifest.json` | 使用 `rune-weaver.workspace.json` |
| 以 `Modular.lua` 判定 x-template | 以 `scripts/addon.config.ts` 等判定 |
| XML/CSS 输出 | TSX/LESS 输出 |

---

## 当前权威文档

请优先参考以下文档：

1. **[docs/HOST-INTEGRATION-DOTA2.md](/D:/Rune%20Weaver/docs/HOST-INTEGRATION-DOTA2.md)**
   - 当前唯一的 Dota2 宿主集成权威规范
   - 定义 `dota2-x-template` 宿主识别规则
   - 定义命名空间目录结构
   - 定义 bridge 接入策略

2. **[docs/WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)**
   - 定义 `rune-weaver.workspace.json` 工作区模型
   - 定义 feature 生命周期管理

---

## 历史内容（已过时）

<details>
<summary>点击展开历史内容（仅供参考，不应作为实现依据）</summary>

# Dota2 Host Integration Spec (ARCHIVED)

## 1. 文档目的

本文档定义 Rune Weaver 如何与 Dota2 宿主项目（目标：`D:\test1`）集成，明确输出目录结构、注册机制和操作模式。

**核心原则**：禁止直接散写宿主工程，所有输出必须通过 Write Plan 审查后执行。

---

## 2. 目标宿主 (已过时)

旧目录结构参考，现已改用 `game/scripts/src/` 和 `content/panorama/src/`。

---

## 3. 生成目录映射 (已过时)

旧映射参考，现已改用 `rune_weaver/` 命名空间。

---

## 4. 注册入口 (已过时)

旧注册方式参考，现已改用 bridge 模式：
- 服务端: `game/scripts/src/rune_weaver/index.ts` -> `modules/index.ts`
- UI: `content/panorama/src/rune_weaver/index.tsx` -> `hud/script.tsx`

---

## 5. Manifest 管理 (已过时)

旧 manifest 格式参考，现已改用 `rune-weaver.workspace.json`。

---

## 6. 三种操作模式

Create/Update/Regenerate 概念仍然适用，但实现细节请参考 WORKSPACE-MODEL.md。

---

## 7. 禁止事项 (仍然适用)

- 直接写入宿主工程而不经过 Write Plan
- 修改非 Rune Weaver 生成的文件
- 硬编码绝对路径

---

## 8. 集成流程 (已过时)

流程概念参考，但具体步骤已实现为：
- `scanner` - 扫描宿主
- `init` - 初始化宿主
- `create` - 创建功能
- `executor` - 执行写入
- `bridge refresh` - 刷新桥接

---

## 9. 错误处理

错误处理策略仍然适用。

---

## 10. 未来扩展

部分扩展项已实现或重新规划。

</details>

---

## 迁移指南

如果你之前基于本文档进行开发，请迁移到以下实现：

### 宿主识别
```typescript
// 新方式
import { scanDota2Project } from "./adapters/dota2/scanner/index.js";
const result = scanDota2Project("D:\\test1");
// result.hostType === "dota2-x-template"
```

### 初始化宿主
```bash
# 新方式
npm run cli -- dota2 init --host D:\test1
```

### 写入执行
```typescript
// 新方式
import { applyWritePlan } from "./adapters/dota2/executor/index.js";
import { refreshBridge } from "./adapters/dota2/bridge/index.js";
```

---

**注意**: 新 agent 不应再参考本文档进行实现。请以 `docs/HOST-INTEGRATION-DOTA2.md` 为唯一权威。

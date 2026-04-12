# Dota2 Host Integration

> Status Note
> This document is an active Dota2 host reference, but it mixes current boundary rules with environment-specific and historical notes.
> For current MVP ownership, workspace truth, and lifecycle acceptance, prefer [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md), [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md), and [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md).
> Concrete example paths such as `D:\\test1` should be treated as reference examples, not required product assumptions.

## 1. 文档目的

本文档定义 Rune Weaver 与 Dota2 宿主工程的接入方式。

当前唯一正式支持的宿主类型：

- `dota2-x-template`

当前目标宿主路径：

- `D:\test1`

本文档回答五个问题：

1. Rune Weaver 如何识别一个 Dota2 宿主工程
2. Rune Weaver 首次接入时要初始化什么
3. Rune Weaver 允许写哪些目录和文件
4. Rune Weaver 如何调用宿主的安装、构建和启动流程
5. Rune Weaver 如何为无开发基础用户提供“一键测试”体验

---

## 2. 接入原则

Rune Weaver 在 Dota2 模式下不是单纯代码生成器，而是：

`受控生成器 + 宿主初始化器 + 测试启动器`

但它仍然必须守住边界：

- 只支持明确识别的宿主类型
- 只写受控目录
- 只修改少量明确注册点
- 不直接散写宿主已有业务代码
- 不默认修改 Rune Weaver 之外的手写业务文件

---

## 3. 当前正式支持的宿主类型

### 3.1 宿主标识

当前正式支持：

- `dota2-x-template`

它的典型特征包括：

- 存在 `scripts/addon.config.ts`
- 存在 `scripts/install.ts`
- 存在 `scripts/launch.ts`
- 存在 `game/scripts/src`
- 存在 `content/panorama/src`

### 3.2 当前参考宿主

当前参考工程：

- `D:\test1`

其关键行为已经具备：

- `yarn install` 会调用 `scripts/install.ts`，把 `game/` 和 `content/` 链接到 Dota2 的 `dota_addons` 目录
- `yarn dev` 会开启 Panorama 和 VScripts 的开发构建
- `yarn launch` 会调用 `scripts/launch.ts`，直接启动 Dota2 Tools

因此 Rune Weaver 不应重造这一套能力，而应复用它。

---

## 4. 宿主识别规则

Rune Weaver 对宿主执行 `scan-host` 时，必须检查以下条件：

### 4.1 必须存在的路径

- `scripts/addon.config.ts`
- `scripts/install.ts`
- `scripts/launch.ts`
- `game/scripts/src`
- `content/panorama/src`
- `package.json`

### 4.2 必须存在的宿主脚本

`package.json` 应至少包含：

- `postinstall`
- `launch`

推荐同时存在：

- `dev`
- `prod`

### 4.3 识别结果

识别成功时返回：

```json
{
  "hostType": "dota2-x-template",
  "hostRoot": "D:/test1",
  "capabilities": [
    "install-link",
    "launch-tools",
    "panorama-build",
    "vscripts-build"
  ]
}
```

识别失败时，不允许继续进入写入阶段。

---

## 5. 首次接入初始化

### 5.1 采用方案 B

Rune Weaver 采用：

- `方案 B：首次接入时由 Rune Weaver 负责宿主初始化`

原因：

- 对无开发基础用户更友好
- 能减少手工配置错误
- 能让后续 create/update/test 流程保持一致

### 5.2 初始化命令

建议命令：

```bash
npm run cli -- dota2 init --host D:\test1
```

### 5.3 初始化阶段必须完成的事情

1. 识别宿主是否为 `dota2-x-template`
2. 检查 `scripts/addon.config.ts`
3. 读取 `addon_name`
4. 如果 `addon_name === "x_template"`，要求用户提供合法项目名
5. 将新项目名写回宿主配置
6. 初始化 Rune Weaver 自己的命名空间目录
7. 初始化 Rune Weaver 工作区 manifest
8. 调用宿主 `install`

### 5.4 addon_name 规则

参考 `scripts/addon.config.ts`，项目名必须：

- 以小写字母开头
- 只能包含小写字母、数字、下划线

因此 Rune Weaver 在初始化时必须校验：

```text
^[a-z][a-z0-9_]*$
```

### 5.5 init 交互草案

Rune Weaver 在 `init` 阶段不应要求用户理解 `addon.config.ts` 的内部细节，而应提供最小交互：

1. 显示当前宿主路径
2. 显示检测到的宿主类型
3. 检查当前 `addon_name`
4. 如果当前值为 `x_template`，提示用户输入项目名
5. 立即校验输入是否合法
6. 显示最终将写入的项目名并要求确认
7. 写回宿主配置并继续初始化

推荐交互示例：

```text
Detected host: D:\test1
Host type: dota2-x-template
Current addon_name: x_template

This host has not been initialized for a real project yet.
Please enter a project name:
> test1

Validated addon_name: test1
Rune Weaver will update scripts/addon.config.ts and initialize the host.
Continue? [y/N]
```

交互要求：

- 输入非法时必须阻止继续
- 默认值应直接取宿主目录名，例如 `D:\test1 -> test1`
- 不应额外生成“推荐名”
- 用户确认前不写文件

### 5.6 初始化成功后的结果

初始化成功后，宿主应具备：

- 有效的 `addon_name`
- 已完成 `install`
- 已存在 Rune Weaver 的工作区配置
- 已存在 Rune Weaver 的生成目录与桥接目录

### 5.7 install 的执行时机

在 MVP 阶段，Rune Weaver 应在 `init` 成功后立即执行一次：

```bash
yarn install
```

原因：

- `init` 的语义就是让宿主进入“可用状态”
- `x-template` 的 `install` 负责建立到 Dota2 addon 目录的链接
- 如果把这一步延迟到第一次代码生成之后，会让宿主状态判断变脏

因此在 MVP 阶段建议固定：

- `init`：负责宿主初始化，并在成功后执行 `yarn install`
- `create/update/regenerate`：负责功能变化
- `--run`：负责启动 Dota2 测试

---

## 6. 允许写入的目录

Rune Weaver 只允许写入以下命名空间目录：

### 6.1 服务端

- `game/scripts/src/rune_weaver/`
- `game/scripts/src/rune_weaver/generated/`
- `game/scripts/src/rune_weaver/generated/server/`
- `game/scripts/src/rune_weaver/generated/shared/`

### 6.2 Panorama

- `content/panorama/src/rune_weaver/`
- `content/panorama/src/rune_weaver/generated/`
- `content/panorama/src/rune_weaver/generated/ui/`

### 6.3 工作区文件

- `rune-weaver.workspace.json`

### 6.4 不允许直接散写的目录

在没有明确桥接规则前，不允许直接散写：

- `game/scripts/src/examples/`
- `game/scripts/src/modules/` 下的任意现有业务文件
- `content/panorama/src/hud/` 下的现有复杂实现
- `content/panorama/src/utils/` 下的现有工具文件

---

## 7. 允许修改的桥接文件

Rune Weaver 允许修改的宿主非命名空间文件必须极少，并且受控。

当前建议只允许以下桥接点：

### 7.1 服务端桥接

首选新增：

- `game/scripts/src/rune_weaver/index.ts`

再由宿主入口在单一位置引入它。

如果需要接入服务端模块激活流程，建议只在以下位置做一次接入：

- `game/scripts/src/modules/index.ts`

目标是让该文件只增加一行或极少量稳定代码，例如：

```ts
import { activateRuneWeaverModules } from "../rune_weaver";
```

以及：

```ts
activateRuneWeaverModules();
```

更完整的最小 bridge 形态应类似：

```ts
import { activateRwGeneratedServer } from "./generated/server";

export function activateRuneWeaverModules(): void {
  activateRwGeneratedServer();
}
```

要求：

- bridge 只做聚合与接线
- bridge 不承载具体业务逻辑
- 后续 feature 增减只刷新 `generated/server/index.ts`

### 7.2 Panorama 桥接

首选新增：

- `content/panorama/src/rune_weaver/index.tsx`

再由 HUD 主入口在单一位置挂接。

如果需要接入 HUD，建议只在以下位置做一次接入：

- `content/panorama/src/hud/script.tsx`

目标同样是：

- 只插入一次受控桥接
- 后续只改 Rune Weaver 自己的桥接文件，不反复 patch HUD 主逻辑

更完整的最小 bridge 形态应类似：

```tsx
import React from "react";
import { RuneWeaverGeneratedUIRoot } from "./generated/ui";

export function RuneWeaverHUDRoot() {
  return <RuneWeaverGeneratedUIRoot />;
}
```

要求：

- UI bridge 只负责挂载 Rune Weaver 自己的 UI 根
- 现有 HUD Root 保持宿主主导
- 生成内容全部进入 `generated/ui`

---

## 8. 宿主入口映射

### 8.1 服务端入口

当前 `x-template` 服务端入口链路为：

- `game/scripts/src/addon_game_mode.ts`
- `game/scripts/src/modules/index.ts`

Rune Weaver 不应直接接管 `addon_game_mode.ts`。

推荐模式：

- 宿主原有入口保持不动
- Rune Weaver 通过 `modules/index.ts` 的单次桥接接入

### 8.2 Panorama 入口

当前 `x-template` Panorama HUD 入口为：

- `content/panorama/src/hud/script.tsx`

Rune Weaver 不应直接重写整个 HUD。

推荐模式：

- 保留原有 HUD Root
- 增加一个 Rune Weaver Root 容器或桥接挂载点

宿主中的最小接入应类似：

```tsx
import { RuneWeaverHUDRoot } from "../rune_weaver";

const Root: FC = () => {
  return (
    <>
      {/* existing HUD content */}
      <RuneWeaverHUDRoot />
    </>
  );
};
```

服务端中的最小接入应类似：

```ts
import { activateRuneWeaverModules } from "../rune_weaver";

export function ActivateModules() {
  if (GameRules.XNetTable == null) {
    GameRules.XNetTable = new XNetTable();
    new GameConfig();
    new Debug();
    activateRuneWeaverModules();
  }
}
```

---

## 9. 宿主命令调用策略

Rune Weaver 不应自行实现 Dota2 安装、链接、启动逻辑，而应复用宿主脚本。

### 9.1 初始化阶段

初始化后调用：

```bash
yarn install
```

原因：

- `postinstall` 已绑定宿主链接逻辑

### 9.2 开发测试阶段

当用户要求“生成并运行测试”时，Rune Weaver 可调用：

- `yarn launch`

根据宿主情况，也可以在未来增加：

- `yarn dev`

### 9.3 第一阶段的推荐行为

P1 前建议：

- Rune Weaver 在 `init` 成功后触发 `yarn install`
- Rune Weaver 在 `--run` 场景触发 `yarn launch`
- Rune Weaver 暂不负责长期守护 `yarn dev`

**注意**: --run 参数目前为计划中的功能，尚未实现。当前用户需要手动执行 `yarn launch`。

这样可先实现"一次生成，一次启动测试"的闭环。

---

## 10. 面向无开发基础用户的体验要求

### 10.1 用户不应理解宿主内部目录

用户不应需要理解：

- `game/scripts/src`
- `content/panorama/src`
- `webpack`
- `tstl`
- `addon_name`

Rune Weaver 应隐藏这些细节。

### 10.2 推荐命令形态

```bash
npm run cli -- dota2 init --host D:\test1
npm run cli -- dota2 run "做一个冲刺技能" --host D:\test1
npm run cli -- dota2 update --host D:\test1 --feature rw_dash_q
```

**注意**: --run 参数目前为计划中的功能，尚未实现。当前用户需要手动执行 `yarn launch`。

### 10.3 `--run` 的标准含义

`--run` 至少表示：

1. 写入宿主
2. 确保宿主已完成初始化
3. 调用宿主启动命令
4. 让用户可以直接进入 Dota2 Tools 测试

---

## 11. 当前不做的事情

当前阶段不做：

- 自动重构整个 `x-template` 项目
- 任意修改宿主已有手写逻辑
- 自动合并用户改过的生成文件
- 同时支持多个不同 Dota2 模板
- 接管宿主所有构建生命周期

---

## 12. 当前结论

Rune Weaver 的第一版 Dota2 宿主接入应被定义为：

`以 x-template 为唯一正式支持宿主，通过初始化 addon_name、受控写入 Rune Weaver 命名空间目录、桥接服务端与 HUD 入口、复用宿主 install/launch 脚本，为用户提供"生成后立即启动 Dota2 Tools 测试"的闭环体验。`

---

## 13. T121 E2E 验证状态（截至 T126 consolidation）

### 13.1 已验证的能力

T121 已确认达到**最小真实 Dota2 E2E**：

- baseline 3 技能在宿主中正常出现
- fresh identity RW ability 能挂到英雄
- 可施放
- 有蓝耗和冷却
- modifier 创建成功
- buff 出现并持续约 6 秒

### 13.2 当前质量边界

以下内容**已验证但属于 minimal viable 质量**，不应夸大为 polished：

- 视觉效果：minimal
- 数值效果：functional but minimal
- 错误处理：basic
- 多技能组合：未充分测试

### 13.3 dota_ts_adapter 状态

`dota_ts_adapter` repair 已 **mainlined**：

- 通过正式入口接入 `init` / `refresh`
- 不再是临时 patch 或旁路

### 13.4 baseline migration 状态

baseline migration 已进入正式 refresh 主路径：

- `XLSXContent -> DOTAAbilities` 转换在主路径执行
- 不再依赖旧的迁移旁路

---

## 14. Lua 写入路径状态（T125 结论）

### 14.1 已 mainlined 的部分

以下能力已进入正式主路径：

- **lua entry production**: normal pipeline 自然产出 `contentType: "lua"` entry
- **lua code generation**: generator 生成 same-file ability + modifier Lua 代码
- **lua write integration**: write executor 能实际写出 `.lua` 文件到宿主路径
- **旧旁路退出**: KV→lua 旁路已退出正式执行路径

### 14.2 当前边界与限制

**重要：当前 lua metadata 仅适用于 `dota2.short_time_buff` 及近似 case**

这不是通用 lua ability framework。具体限制：

- same-file modifier 目前是 short_time_buff 风格主线
- 不支持任意 ability archetype 的 lua 生成
- 不支持复杂多 modifier 链式结构
- 不支持自定义事件驱动逻辑的通用 lua 模板
- metadata schema 是为 buff 类 mechanic 定制的

### 14.3 Lua 文件写入位置

Lua 能力文件写入路径遵循受控命名空间：

- `game/scripts/vscripts/rune_weaver/abilities/<abilityName>.lua`

此路径在允许写入的服务端命名空间范围内。

---

## 15. 宿主粒度原则

Rune Weaver 在宿主中只负责：

- `game/scripts/src/rune_weaver/**`
- `content/panorama/src/rune_weaver/**`
- 少量明确允许的桥接点

Rune Weaver 不负责：

- 用户原有业务代码
- 任意宿主旧文件的智能修改
- 超出受控桥接点之外的宿主散写

## UI 入口原则

UI 入口不应被理解为“所有 UI 都在 `script.tsx`”。

正确划分是：

- `script.tsx` 这类宿主文件只作为 `UI entry root`
- 真实生成内容落在 `rune_weaver/generated/ui/**`

也就是说：

- 宿主入口负责接线
- Rune Weaver 负责自己的 UI surfaces

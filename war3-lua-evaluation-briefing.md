# 工程评估简报：Warcraft III 1.29 Lua 宿主新增方案

> 评估目标：现有 Dota2 定向代码生成/宿主集成项目扩展支持 Warcraft III 1.29 宿主\
> 约束条件：TypeScript → Lua、完全不支持 JASS

***

## 一、Warcraft III 1.29 对 Lua 脚本与地图开发的实际支持边界

### 1.1 版本支持时间线

| 版本             | Lua 支持状态       | 关键限制                                    |
| -------------- | -------------- | --------------------------------------- |
| 1.29 (2018.04) | ❌ **不支持 Lua**  | 仅有 JASS，但新增了 24 玩家、宽屏支持、大量 `Blz` 前缀原生函数 |
| 1.31 (2019.05) | ✅ **首次支持 Lua** | Beta 状态引入；需要 World Editor 设置脚本语言为 Lua   |

**重要结论**：严格意义上的 1.29 版本**没有官方 Lua 支持**。如果项目必须锁定 1.29，则无法直接运行 Lua。但社区实践中通常将"1.29 宿主"理解为**支持 1.29+ 版本特性且向前兼容到 1.31 Lua 支持**的语境。

### 1.2 Lua 支持的硬性边界（1.31+）

```
地图配置层级：
├─ Scenario → Map Options → Script Language: [JASS | Lua]
├─ 保存为文件夹模式（1.31+）：允许直接编辑 war3map.lua
└─ 入口点：war3map.lua（位于地图包根目录，与 war3map.j 互斥）
```

**核心约束**：

1. **单文件入口**：`war3map.lua` 是唯一的脚本入口，不支持原生 `require`/`module`（已被移除）
2. **无标准 IO**：文件读写被限制在 `Documents\Warcraft III\CustomMapData` 目录，且仅支持 `.txt` 和 `.pld` 扩展名
3. **字符串长度限制**：预加载文件系统依赖 `BlzSendSyncData`，单包数据限制约 180 字符
4. **GC 疑似禁用**：社区观测到 Lua GC 行为异常，需要手动管理内存
5. **无协程支持**：标准 Lua 协程 API 不可用

### 1.3 原生函数边界

**1.29 新增的关键** **`Blz`** **前缀原生函数**：

```lua
-- 鼠标追踪
BlzGetTriggerPlayerMouseX/Y/Position/Button()

-- 技能数据运行时修改
BlzSetAbilityTooltip(abilCode, tooltip, level)
BlzSetAbilityIcon(abilCode, iconPath)
BlzGetAbilityPosX/Y(abilCode)

-- 单位属性
Get/SetUnitMaxHP/MaxMana()
SetUnitAbilityCooldown()
GetUnitAbilityCooldownRemaining()

-- 同步数据（关键）
BlzSendSyncData(prefix, data)  -- 用于网络同步和预加载数据流
BlzGetTriggerSyncPrefix/Text()
```

**1.31 新增**：Frame API（完整的 UI 框架操作）、Instance Object API（运行时对象数据修改）。

***

## 二、社区常用工具链/文档/博客

### 2.1 TypeScript → Lua 编译链

| 组件                   | 用途             | 关键配置                                       |
| -------------------- | -------------- | ------------------------------------------ |
| **TypeScriptToLua**  | TS 到 Lua 的转译核心 | `tsconfig.json` 中的 `luaTarget: "5.1"`      |
| **w3ts**             | War3 类型定义和封装库  | 提供 Handle 类型包装、辅助函数                        |
| **war3-transformer** | TSTL 后处理       | 修复 node\_modules 导入路径、添加 `compiletime()` 宏 |
| **war3-objectdata**  | 对象数据读写         | 支持 .w3u/.w3a/.w3t 等二进制格式转换                 |

**典型项目结构**（wc3-ts-template）：

```
project/
├── src/
│   ├── main.ts           # 入口
│   └── tsconfig.json     # TSTL 配置
├── maps/
│   └── map.w3x/          # 地图文件夹（1.31+ 格式）
│       ├── war3map.lua   # 编译输出
│       └── war3map.w3i   # 地图信息
├── config.json           # 游戏路径等配置
└── package.json
```

### 2.2 地图打包/解包工具

| 工具                   | 功能                  | 状态                      |
| -------------------- | ------------------- | ----------------------- |
| **WC3MapTranslator** | war3map ⇄ JSON 双向转换 | 成熟，支持 w3e/doo/w3u/w3a 等 |
| **war3map** (npm)    | TypeScript 地图数据操作   | 开发中，版本 < 1.0.0          |
| **war3-lua-seed**    | Lua 代码分割与打包         | Node.js 脚本，支持 luabundle |
| **warcraft-vscode**  | VSCode 插件           | 提供调试、打包、宏支持             |

### 2.3 核心文档资源

**API 参考**：

- [lep/jassdoc](https://github.com/lep/jassdoc) - War3 原生函数文档（JASS 命名，Lua 兼容）
- [Hive Workshop - common.j](https://www.hiveworkshop.com/pastebin/5456133e67453a4c86d63b50d1f8bc2e.13710) - 完整原生函数列表
- [w3ts 文档](https://cipherxof.github.io/w3ts/) - TypeScript API 封装参考

**关键社区**：

- **Hive Workshop** (hiveworkshop.com) - 主要技术社区
- **The Helper** (thehelper.net) - 历史文档资源
- **WC3:CE** (Warcraft III: Community Edition) - 1.29.2 专用启动器项目

### 2.4 Lua 模块打包方案

由于 War3 Lua 移除了 `require`，社区采用以下策略：

```lua
-- 方案 A：静态打包（luabundle）
-- 使用 Node.js 工具将所有模块合并到单个 war3map.lua

-- 方案 B：运行时模拟
local _modules = {}
function require(name)
    return _modules[name]
end

-- 方案 C：编译时代码注入（war3-transformer）
-- 在 TSTL 输出阶段内联所有 import
```

***

## 三、与 Dota2 类型宿主的关键差异点

### 3.1 架构层面差异

| 维度        | Dota 2                | Warcraft III 1.29/1.31       |
| --------- | --------------------- | ---------------------------- |
| **脚本模式**  | Addon 目录，多文件自由组织      | 单文件 war3map.lua，需打包          |
| **模块系统**  | 完整 Lua 5.1 + C 模块支持   | 无 `require`，需静态链接            |
| **文件 IO** | 完整文件系统访问              | 仅 CustomMapData 目录，.txt/.pld |
| **网络同步**  | 服务器权威，客户端预测           | 强制帧同步，需手动 BlzSendSyncData    |
| **UI 系统** | Panorama (JS/CSS/XML) | Frame API (原生 Lua) 或 fdf 定义  |
| **对象数据**  | KV 文件，数据驱动            | 二进制 w3u/w3a，运行时修改需专用 API     |
| **调试能力**  | 完整控制台、断点、热重载          | print() + 游戏内控制台，有限          |

### 3.2 最容易踩的差异点（工程风险）

#### 🔴 高风险：内存管理

**Dota2**：垃圾回收完全自动化\
**War3**：

- Handle (unit/item/timer 等) 需要显式 `Destroy()`
- Location/Group 等临时对象极易泄漏
- 社区观测到 Lua GC 可能未启用，需 `collectgarbage()` 手动触发

```lua
-- War3 需要显式清理
local g = CreateGroup()
-- ... 使用 ...
DestroyGroup(g)  -- 必须调用
```

#### 🔴 高风险：同步模型

**Dota2**：Source 2 网络架构，延迟补偿\
**War3**：

- 严格帧同步，所有随机数必须同步种子
- 文件预加载必须通过 `BlzSendSyncData` + 事件接收
- 禁止异步操作（如本地文件读取）

```lua
-- 预加载数据的标准模式
BlzSendSyncData("mydata", chunk)  -- 发送
TriggerRegisterPlayerSyncEvent(trig, player, "mydata", false)  -- 接收
```

#### 🟡 中风险：类型系统映射

| Dota2 Lua  | War3 Lua         | 注意                      |
| ---------- | ---------------- | ----------------------- |
| `handle`   | `handle` + 扩展类型  | War3 有更多 Handle 子类型     |
| `Vector`   | `location` (需销毁) | War3 使用 location 而非直接坐标 |
| `ConVars`  | 无直接对应            | 使用 `Get/SetGameState`   |
| `Entities` | `group` 枚举       | 无面向对象的 Entity 系统        |

#### 🟡 中风险：字符串/Rawcode

**War3 特有约束**：

```lua
-- 错误：单引号 rawcode 在 Lua 中不工作
local id = 'hfoo'

-- 正确：使用 FourCC()
local id = FourCC("hfoo")

-- 不等号差异
-- JASS: !=  
-- Lua: ~=
```

#### 🟢 低风险：TypeScript 适配

**已有成熟方案**：

- `w3ts` 提供与 Dota2 API 风格接近的 TS 封装
- `TypeScriptToLua` 对 War3 场景已优化
- `noImplicitSelf` 选项可处理 War3 的 `self` 传参差异

***

## 四、需要补充的部件清单

### 4.1 代码生成层（Codegen）

```
新增部件：
├─ War3TargetHost.ts          # 宿主接口实现
├─ war3-lua-emitter.ts        # Lua 代码生成器（复用 TSTL）
├─ war3-bundle-strategy.ts    # 单文件打包策略
└─ war3-handle-wrapper.ts     # Handle 生命周期管理
```

**关键适配点**：

1. **导入解析**：移除所有 ES Module 语法，转为静态内联
2. **Handle 追踪**：为每个 CreateXxx 调用注入对应的 DestroyXxx
3. **常量内联**：`FourCC()` 调用在编译期求值

### 4.2 运行时支持层（Runtime）

```
新增部件：
├─ war3-polyfills.lua         # 缺失标准库函数
│   ├─ 模拟 require()
│   ├─ table.pack/unpack 兼容
│   └─ 字符串处理增强
├─ war3-sync-helper.ts        # 网络同步封装
└─ war3-io-bridge.ts          # 文件 IO 沙箱
```

### 4.3 对象数据层（Object Data）

```
新增部件：
├─ war3-object-serializer.ts  # w3u/w3a/w3t 序列化
├─ war3-upgrade-chain.ts      # 科技树/升级数据管理
└─ war3-skin-definition.ts    # Skin 文件（UI 自定义）支持
```

### 4.4 构建/测试工具链

```
新增部件：
├─ war3-map-packer.ts         # w3x 打包器（MPQ 格式）
├─ war3-launch-config.ts      # 游戏启动配置
└─ war3-test-runner.ts        # 自动化测试（基于 -loadfile）
```

***

## 五、结论与建议

### 5.1 可行性评估

| 项目           | 评估                             |
| ------------ | ------------------------------ |
| 技术可行性        | ✅ 高，社区已有成熟 TS→War3Lua 方案       |
| 版本锁定 1.29    | ⚠️ 需澄清：1.29 无官方 Lua，需支持到 1.31+ |
| 与 Dota2 代码复用 | ⚠️ 中等，业务逻辑可复用，宿主适配层需重写         |
| 维护成本         | 中，社区生态较 Dota2 小，文档分散           |

### 5.2 工程建议

1. **版本策略**：建议支持 1.31+（Lua 官方支持），而非严格 1.29
2. **复用策略**：复用 TypeScript 业务逻辑层，重写宿主适配层
3. **关键依赖**：
   - 以 `w3ts` 为基础类型定义
   - 以 `war3-transformer` 为基础构建流程
   - 参考 `wc3-ts-template` 项目结构
4. **测试策略**：由于 War3 无官方 headless 模式，需依赖社区工具如 WC3:CE 进行自动化测试

***

*简报生成日期：2026-04-13*\
*基于公开资料整理，具体实现需根据实际项目架构调整*

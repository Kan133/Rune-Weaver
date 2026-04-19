# Panorama 构建、输入与 Scene Pattern

## 1. 用途

把 ModDota Panorama 相关 reference 中最适合 Rune Weaver 使用的宿主知识清洗成一份文档，覆盖：

- Panorama TypeScript 入口与面板组织
- webpack / manifest / CSS 资源管线
- 自定义按键绑定
- `DOTAScenePanel` 的场景面板能力
- React in Panorama 的状态与事件模式

## 2. 上游来源

- `references/dota2/docs/moddota_panorama_docs.md`
- 章节:
  - `Introduction to Panorama UI with TypeScript`
  - `Keybindings`
  - `DOTAScenePanel`
  - `Bundling scripts with webpack`
  - `React in Panorama`
- 关键页面:
  - https://moddota.com/panorama/introduction-to-panorama-ui-with-typescript
  - https://moddota.com/panorama/keybindings
  - https://moddota.com/panorama/dotascenepanel
  - https://moddota.com/panorama/webpack
  - https://moddota.com/panorama/react

## 3. 核心要点

### 3.1 Panorama TypeScript 的基本心智是“Panel 包装成类 / 组件”

上游教程的基础模式不是在 XML 里堆所有逻辑，而是：

- 先拿 `$.GetContextPanel()` 包装成入口类
- 再把 snippet 或子 panel 包装成更小的 UI 单元
- 通过 `FindChildTraverse` 定位关键子节点并维护更新方法

这对 Rune Weaver 的价值是：

- UI 模块可以按“根面板 + 子组件”分层生成
- snippet / panel id 是非常重要的桥接点
- UI 更新最好经由明确的 setter / render path，而不是散落的匿名 DOM 操作

### 3.2 Panorama 资源管线最好显式化，而不是手工同步多个入口

上游 webpack 文档给出的关键结论是：

- script bundle 可以由 `PanoramaTargetPlugin` 管理
- layout 也可以纳入 webpack 管线，而不是单独人工维护
- `PanoramaManifestPlugin` 可以生成 `custom_ui_manifest.xml`
- CSS / SASS 也可以进入统一资产管线

对 Rune Weaver 来说，最重要的不是具体 loader 名字，而是这几个结构性事实：

- 存在“脚本入口”“布局入口”“manifest 入口”三层
- 手工同步这些入口非常脆弱
- 如果宿主已经用了 webpack / manifest plugin，新增 UI 时应优先复用现有入口模式

### 3.3 `custom_ui_manifest.xml` 更像注册表，而不是普通附属文件

上游把 manifest 生成问题单独拎出来，说明它承担的是 UI entry registry 角色。

这意味着：

- 新 UI 是否真正被加载，不只取决于 layout / script 是否存在
- 还取决于它是否被 manifest 纳入正确的 type
- `Hud`、`GameSetup`、`EndScreen` 这类 type 是宿主接入点，而不是随便命名的标签

如果主 session 后续把 retrieval 接到 registry 思维，这类 manifest 正是 UI 侧最接近“注册表”的知识面。

### 3.4 Keybinding 是 `addoninfo.txt` 与 Panorama 事件处理的双端契约

上游 keybinding 模式分两段：

1. 在 `addoninfo.txt` 的 `Default_Keys` 里声明键与命令
2. 在 Panorama 中通过 `Game.AddCommand` 监听命令

其中有三个关键约束：

- `Key` 使用大写字母
- `Command` 前缀决定按下 / 松开语义
- Panorama 侧既可以监听 `+command`，也可以监听 `-command`

对 Rune Weaver 的直接启发：

- `input.key_binding` 类能力通常不是纯 UI，也不是纯 server，而是宿主配置 + UI handler 的双端桥接
- 负向约束例如“不要 UI 但要按键触发”时，必须谨慎判断是否需要 Panorama 层

### 3.5 `DOTAScenePanel` 是 3D 场景挂到 Panorama 的专用能力面

上游对 `DOTAScenePanel` 的关键结论包括：

- 用来在 Panorama 中显示 3D 内容
- `particleonly="false"` 对显示单位模型很重要
- 自定义背景图依赖 background map + light + camera
- 某些运行时变化不能直接改现有 panel，只能重新创建 layout
- 可通过 `DOTAGlobalSceneFireEntityInput` 向场景实体发输入

这让它适合这些类型的 UI：

- 预览角色 / 单位
- 装备 / 外观展示
- 带 camera 切换的 3D 选择界面
- 用 IO 事件驱动动画或 scene 实体行为

但也要保持边界意识：

- 这是特殊 UI 能力，不该被当成默认列表/面板方案
- `allowrotation` 与自定义背景图并非总是兼容
- 通过 scene 触发 clientside Lua 是可行的，但能力受限，不能误判成完整游戏逻辑执行面

### 3.6 React in Panorama 适合“状态驱动 UI”，不适合把事件副作用塞进 render

上游 React 教程最值得 Rune Weaver 吸收的是几条结构规则：

- 组件 = 小而可复用的 UI 单元
- `useState` 管局部状态
- 游戏事件监听要放进 `useEffect` 或 `useGameEvent`
- 共享事件逻辑可以抽成 custom hook

因此若宿主已经是 React Panorama：

- 生成 UI 时应优先遵守组件树和状态驱动模式
- 监听器要在 effect / hook 里注册和清理
- 不要把命令订阅、事件订阅和状态变更写成散乱的全局脚本

## 4. 对 Rune Weaver 的直接价值

| 场景 | 价值 |
|------|------|
| `ui.selection_modal` | 明确 root panel、state、事件监听与 manifest 接入方式 |
| `input.key_binding` | 明确 `addoninfo` + `Game.AddCommand` 双端桥接 |
| `ui.resource_bar` | 有利于 React / panel-class 风格的数据驱动更新 |
| Scene UI | 为 3D 预览、摄像机切换、模型展示提供专门能力面 |
| Build / Validation | UI 是否被宿主真正加载，取决于 bundle + layout + manifest 全链路 |

## 5. 当前最相关的 Pattern / Module

- `ui.selection_modal`
- `input.key_binding`
- `ui.resource_bar`
- 任何需要 `DOTAScenePanel` 的角色/单位预览 UI

## 6. 后续注意事项

- 如果宿主已存在固定的 webpack / manifest 规范，应先复用，不要额外发明第二套路由
- `DOTAScenePanel` 适合特殊 3D 场景，不应替代普通 HUD 组件
- React / non-React Panorama 不能混为一谈，先识别宿主 UI 栈再生成

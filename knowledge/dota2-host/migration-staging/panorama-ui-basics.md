# Panorama UI Basics

## 1. 什么时候用

当需求涉及这些 Panorama 基础问题时，优先看这份文档：

- HUD / panel 应该如何组织
- 什么时候用普通 panel，什么时候用 React Panorama
- UI 与 server 的边界在哪里
- keybinding、events、nettables 在 Panorama 里各司其职是什么

## 2. 来源与迁移状态

- 来源文件:
  - `references/dota2/docs/moddota_panorama_docs.md`
- 来源章节:
  - `Introduction to Panorama UI with TypeScript`
  - `Keybindings`
  - `React in Panorama`
- 合并整理: 是
- future canonical candidate: 是
- 必须继续保留的原文:
  - `references/dota2/docs/moddota_panorama_docs.md`
  - `references/dota2/dota-data/files/**` 中与 Panorama symbols/events 相关的 raw structured reference

## 3. 基本分层

### 3.1 Panorama 只负责 UI，不负责宿主真相

Panorama 更适合做：

- 面板显示
- 输入采集
- 事件响应
- 状态渲染

不适合做：

- 权限判断真相
- 资源结算真相
- gameplay 规则真相

因此 UI 里的“能不能做”判断，通常只应是显示层提示；真正裁决仍在 server。

### 3.2 三种常见 UI 组织方式

- XML + 原生脚本
- TypeScript class 包装 panel/snippet
- React Panorama 组件树

选择原则：

- 现有宿主已经用哪套，就优先沿用哪套
- 不要为了一个小面板把非 React 宿主硬改成 React
- 也不要在 React 宿主里回退成大量全局脚本拼装

## 4. 数据与事件怎么分

### 4.1 一次性触发 -> Custom Events

适合：

- 打开弹窗
- 提交选择
- 发错误提示
- 发送按键意图

### 4.2 持续状态 -> NetTables

适合：

- 资源条
- 倒计时状态
- 当前选择内容
- 共享 UI 所需状态

### 4.3 UI 本地瞬时状态 -> 组件/Panel 自身状态

适合：

- 折叠/展开
- hover
- 选中高亮
- 本地动画阶段

不要把这些纯展示状态强行同步回 server。

## 5. 输入面

### 5.1 Keybinding 不是纯 UI 技巧

keybinding 同时包含：

- `addoninfo.txt` 里的默认按键映射
- Panorama 里的命令监听
- 需要时发送给 server 的后续事件

所以它属于 host realization seam，而不是某个 UI 组件私有细节。

### 5.2 `DOTAScenePanel` 是特殊面，不是默认 UI 容器

适合：

- 3D 模型展示
- 角色/单位预览
- camera scene 切换

不适合：

- 普通列表
- 文本驱动 HUD
- 简单交互表单

## 6. 常见坑

- 不要把 server 真相塞进 Panorama
- 不要把一次性事件误建成持续状态
- 不要把持续状态误建成一连串手动事件补丁
- 不要在 render 里注册事件监听
- 不要在没有需要时引入 `DOTAScenePanel`

## 7. 推荐做法

- 先分清 UI 显示、输入采集、状态同步三层
- 事件走 custom events，状态走 nettables
- 跟现有宿主 UI 栈保持一致
- 把复杂度放在组件或 panel 类边界里，不要散落在全局脚本里

## 8. 对 Rune Weaver 的直接价值

- 给 `ui.selection_modal`、`ui.resource_bar`、`input.key_binding` 提供更清晰的 UI staging 面
- 帮后续主 session 识别哪些 UI 需求是 host-realization seam，哪些只是展示层细节

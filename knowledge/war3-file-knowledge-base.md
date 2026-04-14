# Warcraft III File Knowledge Base

> **Rune Weaver B 组前置知识文档**  
> **版本**: 1.0 (2026-04-13)  
> **适用范围**: Warcraft III: Reforged (1.32+) / Classic (1.27-1.31) / KK 宿主

---

## 结论摘要

Warcraft III 地图文件（`.w3x` / `.w3m`）本质是 **MPQ 归档文件**，包含 512 字节头部（w3x 额外有 260 字节认证尾部）。对于 Rune Weaver 的代码生成与地图处理工作流，**P0 优先级文件**为：`war3map.w3i`（元数据）、`war3map.w3e`（地形）、`war3mapUnits.doo`（预放置单位）、`war3map.j/lua`（脚本）、`war3map.imp`（资源清单）。这些文件格式稳定、文档完善、且对运行时行为有决定性影响。

**关键决策建议**：
- 地形/单位数据复用：优先解析 `w3e` + `Units.doo`，而非逆向脚本
- 物编数据注入：直接操作 `w3u/w3a/w3t` 二进制格式，避免依赖 World Editor
- 版本兼容性：Reforged (1.32+) 与 Classic 在文件版本上存在差异，需做适配层

---

## 1. 地图容器格式：W3X/W3M & MPQ

### 1.1 文件结构

| 区域 | 大小 | 说明 |
|------|------|------|
| Header | 512 bytes | 文件标识 "HM3W" + 地图名 + 标志位 + 最大玩家数 |
| Footer (w3x only) | 260 bytes | "NGIS" + 256 bytes 认证数据（官方地图使用） |
| MPQ Archive | 变长 | 标准 MoPaQ 格式，可提取/注入文件 |

**关键标志位**（影响宿主加载行为）：
- `0x0004`: Melee 地图（决定初始化逻辑）
- `0x0080`: 使用自定义科技树
- `0x0100`: 使用自定义技能
- `0x0200`: 使用自定义升级

### 1.2 对 Rune Weaver 的价值

| 场景 | 策略 |
|------|------|
| 地图作为知识源 | 解压 MPQ → 提取 `w3e` + `Units.doo` 获取地形/单位布局 |
| 代码生成后注入 | 将生成的 `war3map.lua` 打包进 MPQ，替换原有脚本 |
| 资源管理 | 通过 `war3map.imp` 追踪导入资源依赖 |

**风险**: 部分加密地图会扰乱 MPQ 文件列表或移动脚本到 `Scripts\war3map.j`，需做路径回退处理。

---

## 2. 核心工作文件详解

### 2.1 地图元数据：`war3map.w3i`

**P0 优先级** | **格式**: 二进制 | **版本**: 25 (Classic) / 31 (1.32) / 33 (2.0.3)

包含地图初始化所需的全部静态配置：
- 地图名、作者、描述（指向 `w3s` 的字符串索引）
- 玩家槽位配置（数量、种族、控制者类型）
- 镜头边界（Camera Bounds）与可玩区域
- 全局开关（随机英雄、随机种族、观看者设置）

**解析策略**: 
- 必须支持多版本解析（版本字段位于偏移 0x4）
- 字符串字段通常为 `TRIGSTR_XXX` 引用，需关联 `w3ts` 解析

### 2.2 地形数据：`war3map.w3e`

**P0 优先级** | **格式**: 二进制 | **版本**: 11 (Classic/1.32) / 12 (2.0.3)

存储地形网格信息：
- Tileset 类型（如 Lordaeron Summer、Barrens）
- 每个 tile point 的高度、地面纹理、水域信息
- 悬崖/坡道标志位

**复用价值**:
- 高：地形数据是"世界知识"的核心载体
- 可作为 RAG/Agent 的上下文输入（如"地图中央有一片水域"）

**解析注意**: 地图尺寸 = (width + 1) × (height + 1) tile points，存在 1 点边界冗余。

### 2.3 预放置单位/物品：`war3mapUnits.doo`

**P0 优先级** | **格式**: 二进制 | **版本**: 7+ / SubVersion 9/11

记录地图初始化时的单位/物品/可破坏物实例：
- 类型 ID（4CC 如 `'hfoo'`）、位置 (X, Y, Z)、旋转、缩放
- 所有者玩家索引、生命值/法力值覆盖
- 随机单位/物品表引用（用于随机掉落）

**代码生成关联**:
- 可作为 `CreateUnit` 调用的静态替代（减少初始化脚本体积）
- 对于动态生成逻辑，需解析此文件以避免位置冲突

### 2.4 装饰物数据：`war3map.doo`

**P1 优先级** | **格式**: 二进制

树木、岩石等装饰物的放置信息。结构类似 `Units.doo`，但包含特殊 doodad（如悬崖）的附加数据。

### 2.5 对象定义文件（物编）

| 文件 | 内容 | 优先级 | 备注 |
|------|------|--------|------|
| `war3map.w3u` | 自定义单位 | P1 | 双表结构：原始单位修改 + 新建单位 |
| `war3map.w3a` | 自定义技能 | P1 | 支持等级数据（Level/Data Pointer） |
| `war3map.w3t` | 自定义物品 | P2 | 结构类似 w3u |
| `war3map.w3b` | 可破坏物 | P2 | 建筑/门/桥等 |
| `war3map.w3d` | 装饰物定义 | P2 | 地形装饰物变体 |
| `war3map.w3q` | 升级/科技 | P2 | 科技树修改 |
| `war3map.w3h` | 魔法效果 | P3 | Buff/Effect 定义 |

**格式共性**:
- Header: `int version` (通常为 1 或 2)
- 双表结构：Original Table（修改官方对象）+ Custom Table（新建对象）
- 修改项结构：Mod ID (4CC) + Var Type + Value + [Level + Data Pointer]

**代码生成建议**:
- 若需动态修改物编，生成 `w3u/w3a` 文件并打包比运行时注册更高效
- 注意 Var Type 映射：0=int, 1=real, 2=unreal, 3=string

### 2.6 脚本文件

| 文件 | 语言 | 优先级 | 说明 |
|------|------|--------|------|
| `war3map.j` | JASS2 | P0 | Classic 默认，文本格式 |
| `war3map.lua` | Lua | P0 | 1.31+ 支持，推荐目标格式 |
| `war3map.wct` | 混合 | P1 | 自定义文本触发器（WE GUI 转换后的代码）|
| `war3map.wtg` | 二进制 | P2 | 触发器结构（变量/分类信息）|
| `war3map.wts` | 文本 | P1 | 字符串表，`TRIGSTR_XXX` 定义 |

**关键决策**:
- Rune Weaver 代码生成应直接生成 `war3map.lua`，跳过 JASS 层
- 多语言地图需处理 `wts` 字符串引用替换

### 2.7 资源与配置

| 文件 | 用途 | 优先级 |
|------|------|--------|
| `war3map.imp` | 导入文件清单 | P1 | 记录自定义资源路径，加密地图常被删除 |
| `war3mapMisc.txt` | 游戏平衡常数 | P2 | 伤害系数、经验值曲线等（类 INI 格式）|
| `war3mapSkin.txt` | UI 皮肤 | P3 | 界面文本覆盖 |
| `war3mapExtra.txt` | 额外属性 | P3 | 外部数据源、天空盒引用 |

---

## 3. 对 Rune Weaver 的直接建议

### 3.1 文件解析/生成策略

```
输入处理（知识提取）:
  w3x → MPQ解压 → w3e(地形) + Units.doo(单位布局) + w3i(元数据)
  ↓
  转换为内部知识表示（JSON/AST）

输出生成（代码注入）:
  生成 war3map.lua → 打包进 MPQ → 替换原地图脚本
  ↓
  可选：同步修改 w3u/w3a 注入物编数据
```

### 3.2 版本兼容性处理

| 游戏版本 | 文件版本差异 | 处理建议 |
|----------|--------------|----------|
| Classic (≤1.27) | w3i v25, w3e v11 | 基础支持，功能受限 |
| TFT (1.28-1.31) | w3i v25-31 | 主流兼容目标 |
| Reforged (1.32+) | w3i v31, w3e v11, 支持 Lua | 主要开发目标 |
| Reforged (2.0+) | w3i v33, w3e v12 | 需跟进新字段 |

### 3.3 工具链推荐

- **MPQ 操作**: StormLib (C++) / mpyq (Python) / MPQEditor
- **文件解析**: 参考 [WC3MapTranslator](https://github.com/ChiefOfGxBxL/WC3MapTranslator) (Node.js) 或 [war3map](https://github.com/invoker-bot/war3map) (Python)
- **规范文档**: [WC3MapSpecification](https://github.com/ChiefOfGxBxL/WC3MapSpecification)

---

## 4. 建议继续验证的未知项

| 问题 | 风险等级 | 验证方法 |
|------|----------|----------|
| KK 宿主对 MPQ 文件的额外校验 | 中 | 测试注入修改后的地图 |
| Reforged 2.0 新文件版本 (w3e v12) 的字段变更 | 中 | 对比 1.32 与 2.0 输出 |
| `war3map.w3o`（物编导出格式）的完整规范 | 低 | 社区文档已较完善 |
| 加密地图的常见混淆模式 | 高 | 样本分析 |
| Lua 脚本文件大小限制（MPQ/引擎）| 中 | 压力测试 |

---

## 5. 参考来源清单

### 官方/半官方
1. **Blizzard Developer Documentation** - JASS 与 Lua API 参考（游戏内编辑器帮助）
2. **WarCraft III: Reforged Patch Notes** - 文件版本更新记录

### 社区权威来源
3. **WC3MapSpecification** (GitHub: ChiefOfGxBxL) - 活跃的格式规范文档  
   https://github.com/ChiefOfGxBxL/WC3MapSpecification
4. **WC3MapTranslator** (GitHub: ChiefOfGxBxL) - 双向转换库 (war3map ⇄ JSON)  
   https://github.com/ChiefOfGxBxL/WC3MapTranslator
5. **HiveWorkshop File Format Guides** - 历史文档集合  
   https://www.hiveworkshop.com/threads/guide-format-explanation-of-w3m-and-w3x-files.7080/
6. **XGM (Russian Community)** - w3x 格式俄文详解  
   https://xgm.guru/p/wc3/w3x-ru
7. **TheHelper.net** - 经典文件格式教程  
   https://world-editor-tutorials.thehelper.net/

### 工具参考
8. **MPQEditor** - MPQ 文件操作工具文档
9. **war3map (Python)** - 解析库实现参考  
   https://github.com/invoker-bot/war3map
10. **pyw3x** - Python StormLib 绑定  
    https://github.com/sethmachine/pyw3x

---

## 附录：文件优先级速查表

| 文件 | P0 | P1 | P2 | P3 | 读写复杂度 |
|------|:--:|:--:|:--:|:--:|:----------:|
| war3map.w3i | ✓ | | | | 低 |
| war3map.w3e | ✓ | | | | 中 |
| war3mapUnits.doo | ✓ | | | | 中 |
| war3map.lua | ✓ | | | | 低（文本）|
| war3map.j | ✓ | | | | 低（文本）|
| war3map.imp | | ✓ | | | 低 |
| war3map.wts | | ✓ | | | 低（文本）|
| war3map.w3u | | ✓ | | | 高 |
| war3map.w3a | | ✓ | | | 高 |
| war3map.doo | | | ✓ | | 中 |
| war3map.w3t/w3b/w3d | | | ✓ | | 高 |
| war3mapMisc.txt | | | ✓ | | 低（文本）|
| war3mapSkin.txt | | | | ✓ | 低（文本）|
| war3map.w3h/w3q | | | | ✓ | 高 |

---

*文档结束*

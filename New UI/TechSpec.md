# Rune Weaver - 技术规范文档

---

## 1. 组件清单

### shadcn/ui 组件
| 组件 | 用途 |
|------|------|
| Button | 所有按钮交互 |
| Card | Feature Cards、信息卡片 |
| Input | 搜索框、表单输入 |
| Badge | 状态标签、分组标签 |
| Dialog | Create Feature 模态框 |
| DropdownMenu | 更多操作菜单 |
| ScrollArea | 可滚动区域 |
| Separator | 分隔线 |
| Tooltip | 提示信息 |
| Collapsible | 可折叠区域 |
| Avatar | 用户头像 |
| Select | 下拉选择 |
| Sheet | 移动端抽屉 |
| Skeleton | 加载骨架屏 |
| Progress | 准备度进度条 |
| AlertDialog | 危险操作确认 |

### 自定义组件
| 组件 | 用途 |
|------|------|
| FeatureCard | 中间列表的 Feature 卡片 |
| FeatureTree | 左侧树形结构 |
| GroupList | 左侧分组列表 |
| DetailPanel | 右侧详情面板 |
| ReviewSignals | Review 信号展示 |
| LifecycleActions | 生命周期操作按钮组 |
| StatusBadge | 状态徽章 |
| PatternTag | Pattern 标签 |

---

## 2. 动画实现方案

| 动画 | 库 | 实现方式 | 复杂度 |
|------|-----|---------|--------|
| 按钮 hover/点击 | Tailwind CSS | transition + hover: | 低 |
| 卡片 hover | Tailwind CSS | transition + hover: | 低 |
| 面板切换 | Framer Motion | AnimatePresence + motion.div | 中 |
| 树节点展开/折叠 | Framer Motion | motion.div height animation | 中 |
| 模态框出现/消失 | Framer Motion | AnimatePresence + scale/opacity | 中 |
| 抽屉滑入/滑出 | Framer Motion | motion.div x animation | 中 |
| Skeleton 脉冲 | Tailwind CSS | animate-pulse | 低 |
| 进度条动画 | Tailwind CSS | transition-all | 低 |
| 列表项 stagger | Framer Motion | staggerChildren | 中 |

### 动画参数
```typescript
// 通用过渡
const transitions = {
  fast: { duration: 0.15, ease: "easeOut" },
  standard: { duration: 0.2, ease: "easeOut" },
  smooth: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
  slow: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
};

// 面板动画
const panelVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: transitions.smooth },
  exit: { opacity: 0, x: -20, transition: transitions.fast },
};

// 模态框动画
const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: transitions.smooth },
  exit: { opacity: 0, scale: 0.95, transition: transitions.fast },
};

// 列表 stagger
const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: transitions.standard },
};
```

---

## 3. 项目结构

```
app/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui 组件
│   │   ├── layout/          # 布局组件
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   └── MainLayout.tsx
│   │   ├── feature/         # Feature 相关组件
│   │   │   ├── FeatureCard.tsx
│   │   │   ├── FeatureList.tsx
│   │   │   ├── FeatureTree.tsx
│   │   │   ├── GroupList.tsx
│   │   │   └── FeatureDetail.tsx
│   │   ├── review/          # Review 相关组件
│   │   │   ├── ReviewSignals.tsx
│   │   │   ├── ProposalStatus.tsx
│   │   │   ├── GapFillSummary.tsx
│   │   │   └── CategoryEClarification.tsx
│   │   └── shared/          # 共享组件
│   │       ├── StatusBadge.tsx
│   │       ├── PatternTag.tsx
│   │       └── AnimatedPanel.tsx
│   ├── hooks/
│   │   ├── useFeature.ts
│   │   ├── useFeatureStore.ts
│   │   └── useAnimationConfig.ts
│   ├── types/
│   │   └── feature.ts
│   ├── data/
│   │   └── mockData.ts
│   ├── lib/
│   │   └── utils.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
├── index.html
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

---

## 4. 状态管理

使用 Zustand 进行状态管理:

```typescript
interface FeatureStore {
  // 数据
  features: Feature[];
  groups: Group[];
  
  // 选中状态
  selectedGroupId: string | null;
  selectedFeatureId: string | null;
  
  // UI 状态
  expandedNodes: Set<string>;
  
  // 操作
  selectGroup: (id: string) => void;
  selectFeature: (id: string) => void;
  toggleNode: (id: string) => void;
  createFeature: (data: CreateFeatureData) => void;
  updateFeature: (id: string, data: Partial<Feature>) => void;
  deleteFeature: (id: string) => void;
}
```

---

## 5. 依赖列表

### 核心依赖
- react
- react-dom
- typescript
- vite
- tailwindcss

### UI 组件
- @radix-ui/* (shadcn/ui 依赖)
- class-variance-authority
- clsx
- tailwind-merge
- lucide-react

### 动画
- framer-motion

### 状态管理
- zustand

### 工具
- date-fns (日期格式化)

---

## 6. 颜色配置 (Tailwind)

```javascript
// tailwind.config.js 扩展
colors: {
  background: {
    DEFAULT: '#1a1a1a',
    secondary: '#1e1e1e',
    tertiary: '#252525',
    quaternary: '#2a2a2a',
  },
  foreground: {
    DEFAULT: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)',
    tertiary: 'rgba(255, 255, 255, 0.5)',
    quaternary: 'rgba(255, 255, 255, 0.3)',
  },
  brand: {
    DEFAULT: '#6366f1',
    light: '#818cf8',
    dark: '#4f46e5',
  },
  status: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  border: {
    DEFAULT: 'rgba(255, 255, 255, 0.1)',
    highlight: 'rgba(255, 255, 255, 0.2)',
  },
}
```

---

## 7. 响应式断点

```javascript
screens: {
  'sm': '640px',
  'md': '768px',
  'lg': '1024px',
  'xl': '1440px',
  '2xl': '1920px',
}
```

---

import type { Variants, Transition } from 'framer-motion';

// 通用过渡配置
const createTransition = (duration: number, ease: [number, number, number, number] | string): Transition => ({
  duration,
  ease: ease as [number, number, number, number],
});

export const transitions = {
  fast: createTransition(0.15, [0.4, 0, 0.2, 1]),
  standard: createTransition(0.2, [0.4, 0, 0.2, 1]),
  smooth: createTransition(0.25, [0.16, 1, 0.3, 1]),
  slow: createTransition(0.3, [0.16, 1, 0.3, 1]),
};

// 面板动画
export const panelVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.smooth,
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: transitions.fast,
  },
};

// 模态框动画
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.smooth,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: transitions.fast,
  },
};

// 抽屉动画
export const drawerVariants: Variants = {
  hidden: { opacity: 0, x: '100%' },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.smooth,
  },
  exit: {
    opacity: 0,
    x: '100%',
    transition: transitions.fast,
  },
};

// 列表 stagger 动画
export const listVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.standard,
  },
};

// 淡入动画
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: transitions.standard,
  },
  exit: {
    opacity: 0,
    transition: transitions.fast,
  },
};

// 树节点展开动画
export const treeNodeVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: transitions.fast,
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: transitions.standard,
  },
};

// 卡片 hover 动画
export const cardHoverAnimation = {
  rest: {
    scale: 1,
    transition: transitions.fast,
  },
  hover: {
    scale: 1.01,
    transition: transitions.fast,
  },
};

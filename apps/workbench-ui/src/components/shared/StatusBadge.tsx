import React from 'react';
import { cn } from '@/lib/utils';
import type { FeatureStatus } from '@/types/feature';

interface StatusBadgeProps {
  status: FeatureStatus;
  className?: string;
}

const statusConfig: Record<FeatureStatus, { label: string; color: string }> = {
  draft: {
    label: '草稿',
    color: 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/30',
  },
  active: {
    label: '活跃',
    color: 'bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/30',
  },
  archived: {
    label: '已归档',
    color: 'bg-white/10 text-white/50 border-white/20',
  },
  error: {
    label: '错误',
    color: 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border',
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  );
}

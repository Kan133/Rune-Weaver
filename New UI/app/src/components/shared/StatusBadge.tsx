import { cn } from '@/lib/utils';
import type { FeatureStatus } from '@/types/feature';

interface StatusBadgeProps {
  status: FeatureStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const statusConfig = {
  active: {
    color: '#22c55e',
    label: '活跃',
    bgColor: 'rgba(34, 197, 94, 0.15)',
  },
  draft: {
    color: '#f59e0b',
    label: '草稿',
    bgColor: 'rgba(245, 158, 11, 0.15)',
  },
  error: {
    color: '#ef4444',
    label: '错误',
    bgColor: 'rgba(239, 68, 68, 0.15)',
  },
  regenerate: {
    color: '#3b82f6',
    label: '待重建',
    bgColor: 'rgba(59, 130, 246, 0.15)',
  },
};

export function StatusBadge({ status, showLabel = true, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full',
        size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1'
      )}
      style={{ backgroundColor: config.bgColor }}
    >
      <span
        className={cn('rounded-full', size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2')}
        style={{ backgroundColor: config.color }}
      />
      {showLabel && (
        <span
          className={cn(
            'font-medium',
            size === 'sm' ? 'text-[10px]' : 'text-xs'
          )}
          style={{ color: config.color }}
        >
          {config.label}
        </span>
      )}
    </div>
  );
}

export function StatusDot({ status, size = 'md' }: { status: FeatureStatus; size?: 'sm' | 'md' }) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-block rounded-full flex-shrink-0',
        size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5'
      )}
      style={{ backgroundColor: config.color }}
    />
  );
}

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatternTagProps {
  pattern: string;
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

export function PatternTag({ pattern, removable, onRemove, className }: PatternTagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium',
        'bg-[#6366f1]/10 text-[#818cf8] border border-[#6366f1]/20',
        className
      )}
    >
      {pattern}
      {removable && (
        <button
          onClick={onRemove}
          className="hover:text-[#6366f1] transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatternTagProps {
  pattern: string;
  onRemove?: () => void;
  removable?: boolean;
}

export function PatternTag({ pattern, onRemove, removable = false }: PatternTagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono',
        'bg-[#252525] border border-white/10 text-white/80'
      )}
    >
      {pattern}
      {removable && onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 p-0.5 rounded hover:bg-white/10 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

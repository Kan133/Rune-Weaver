import { cn } from '@/lib/utils';
import { War3AnchorPanelHeader, War3AnchorPanelContent } from './War3AnchorPanelSections';
import { useWar3AnchorPanelController } from './useWar3AnchorPanelController';
import type { War3AnchorPanelProps } from './war3AnchorPanel.types';

export function War3AnchorPanel({ variant = 'main' }: War3AnchorPanelProps) {
  const controller = useWar3AnchorPanelController();
  const isMain = variant === 'main';

  return (
    <div
      className={cn(
        'h-full bg-[#1a1a1a] flex flex-col',
        isMain ? 'flex-1 min-w-0' : 'min-w-[320px] w-[360px] border-l border-white/5',
      )}
    >
      <War3AnchorPanelHeader controller={controller} isMain={isMain} />
      <War3AnchorPanelContent controller={controller} isMain={isMain} />
    </div>
  );
}

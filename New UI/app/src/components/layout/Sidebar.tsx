import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { GroupList } from '@/components/feature/GroupList';
import { FeatureTree } from '@/components/feature/FeatureTree';

export function Sidebar() {
  return (
    <aside className="w-60 bg-[#1a1a1a] border-r border-white/10 flex flex-col flex-shrink-0">
      <ScrollArea className="flex-1 py-3">
        <GroupList />
        <Separator className="my-3 bg-white/5" />
        <FeatureTree />
      </ScrollArea>
    </aside>
  );
}

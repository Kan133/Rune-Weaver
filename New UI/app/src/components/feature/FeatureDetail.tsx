import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileCode2,
  FolderOpen,
  Server,
  Plus,
  RotateCw,
  Eye,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useFeatureStore } from '@/hooks/useFeatureStore';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PatternTag } from '@/components/shared/PatternTag';
import { ReviewSignals } from '@/components/review/ReviewSignals';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function FeatureDetail() {
  const selectedFeature = useFeatureStore((state) => state.getSelectedFeature());
  const deleteFeature = useFeatureStore((state) => state.deleteFeature);
  const regenerateFeature = useFeatureStore((state) => state.regenerateFeature);

  const [filesOpen, setFilesOpen] = useState(false);
  const [hostOpen, setHostOpen] = useState(true);

  if (!selectedFeature) {
    return (
      <div className="flex-1 bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <FileCode2 className="h-8 w-8 text-white/20" />
          </div>
          <p className="text-white/50">选择一个 feature 查看详情</p>
        </div>
      </div>
    );
  }

  const groupNames: Record<string, string> = {
    skill: '技能',
    hero: '英雄',
    system: '系统',
  };

  const parentFeature = selectedFeature.parentId
    ? useFeatureStore.getState().features.find((f) => f.id === selectedFeature.parentId)
    : null;

  const childrenFeatures = useFeatureStore
    .getState()
    .features.filter((f) => selectedFeature.childrenIds.includes(f.id));

  return (
    <div className="flex-1 bg-[#1a1a1a] flex flex-col min-w-0">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-white mb-2">
                {selectedFeature.displayName}
              </h1>
              <div className="flex items-center gap-3">
                <StatusBadge status={selectedFeature.status} />
                <span className="text-xs font-mono text-white/40">
                  #{selectedFeature.systemId}
                </span>
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#252525] rounded-lg p-3 border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                System ID
              </p>
              <p className="text-sm font-mono text-white/80">
                {selectedFeature.systemId}
              </p>
            </div>
            <div className="bg-[#252525] rounded-lg p-3 border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                Group
              </p>
              <p className="text-sm text-white/80">
                {groupNames[selectedFeature.group] || selectedFeature.group}
              </p>
            </div>
            <div className="bg-[#252525] rounded-lg p-3 border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                Parent
              </p>
              <p className="text-sm text-white/80">
                {parentFeature ? parentFeature.displayName : '-'}
              </p>
            </div>
            <div className="bg-[#252525] rounded-lg p-3 border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                Revision
              </p>
              <p className="text-sm font-mono text-white/80">
                v{selectedFeature.revision}
              </p>
            </div>
            <div className="bg-[#252525] rounded-lg p-3 border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                Children
              </p>
              <p className="text-sm text-white/80">
                {childrenFeatures.length > 0
                  ? `${childrenFeatures.length} 个子项`
                  : '-'}
              </p>
            </div>
            <div className="bg-[#252525] rounded-lg p-3 border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                Updated
              </p>
              <p className="text-sm text-white/80">
                {formatDistanceToNow(selectedFeature.updatedAt, {
                  locale: zhCN,
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>

          <Separator className="bg-white/5" />

          {/* Selected Patterns */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white">Selected Patterns</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-[#818cf8] hover:text-[#6366f1] hover:bg-[#6366f1]/10"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedFeature.patterns.map((pattern) => (
                <PatternTag key={pattern} pattern={pattern} removable />
              ))}
              {selectedFeature.patterns.length === 0 && (
                <p className="text-xs text-white/30">暂无 patterns</p>
              )}
            </div>
          </div>

          <Separator className="bg-white/5" />

          {/* Generated Files */}
          <Collapsible open={filesOpen} onOpenChange={setFilesOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between py-2 group">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-white/50" />
                  <h3 className="text-sm font-medium text-white">Generated Files</h3>
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 bg-white/5 text-white/50 border-0"
                  >
                    {selectedFeature.generatedFiles.length}
                  </Badge>
                </div>
                {filesOpen ? (
                  <ChevronUp className="h-4 w-4 text-white/40 group-hover:text-white/60" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/40 group-hover:text-white/60" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              {selectedFeature.generatedFiles.length > 0 ? (
                <div className="space-y-1">
                  {selectedFeature.generatedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#252525] border border-white/5"
                    >
                      <FileCode2 className="h-3.5 w-3.5 text-white/40" />
                      <span className="text-xs font-mono text-white/60 truncate">
                        {file}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/30">暂无生成的文件</p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Host Realization */}
          <Collapsible open={hostOpen} onOpenChange={setHostOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between py-2 group">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-white/50" />
                  <h3 className="text-sm font-medium text-white">Host Realization</h3>
                </div>
                {hostOpen ? (
                  <ChevronUp className="h-4 w-4 text-white/40 group-hover:text-white/60" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/40 group-hover:text-white/60" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="bg-[#252525] rounded-lg p-4 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Host</span>
                  <span className="text-sm text-white/80">
                    {selectedFeature.hostRealization.host}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Context</span>
                  <span className="text-sm text-white/80">
                    {selectedFeature.hostRealization.context || '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Sync Status</span>
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      selectedFeature.hostRealization.syncStatus === 'synced'
                        ? 'bg-green-500/10 text-green-400'
                        : selectedFeature.hostRealization.syncStatus === 'error'
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-amber-500/10 text-amber-400'
                    )}
                  >
                    {selectedFeature.hostRealization.syncStatus === 'synced'
                      ? '已同步'
                      : selectedFeature.hostRealization.syncStatus === 'error'
                      ? '错误'
                      : '等待中'}
                  </span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator className="bg-white/5" />

          {/* Review Signals */}
          <div>
            <h3 className="text-sm font-medium text-white mb-4">Review Signals</h3>
            <ReviewSignals feature={selectedFeature} />
          </div>

          <Separator className="bg-white/5" />

          {/* Lifecycle Actions */}
          <div>
            <h3 className="text-sm font-medium text-white mb-4">Actions</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="h-8 bg-white/5 hover:bg-white/10 text-white border-0"
              >
                <RotateCw className="h-3.5 w-3.5 mr-1.5" />
                Update
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 bg-[#6366f1]/10 hover:bg-[#6366f1]/20 text-[#818cf8] border-0"
                onClick={() => regenerateFeature(selectedFeature.id)}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Regenerate
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 bg-white/5 hover:bg-white/10 text-white border-0"
              >
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                Inspect
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 bg-red-500/10 hover:bg-red-500/20 text-red-400 border-0"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#1e1e1e] border-white/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">
                      确认删除 Feature?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-white/60">
                      此操作将永久删除 <strong>{selectedFeature.displayName}</strong>{' '}
                      及其所有子 features 和生成的文件。此操作不可撤销。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-white/5 hover:bg-white/10 text-white border-white/10">
                      取消
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteFeature(selectedFeature.id)}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      确认删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

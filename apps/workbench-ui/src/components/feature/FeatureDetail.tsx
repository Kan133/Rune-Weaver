import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileCode2,
  FolderOpen,
  Server,
  Plus,
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
    <div className="flex-1 bg-[#1a1a1a] flex flex-col min-w-0 h-full overflow-hidden">
      <ScrollArea className="flex-1 h-full">
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
                分组
              </p>
              <p className="text-sm text-white/80">
                {groupNames[selectedFeature.group] || selectedFeature.group}
              </p>
            </div>
            <div className="bg-[#252525] rounded-lg p-3 border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                父项
              </p>
              <p className="text-sm text-white/80">
                {parentFeature ? parentFeature.displayName : '-'}
              </p>
            </div>
            <div className="bg-[#252525] rounded-lg p-3 border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                版本
              </p>
              <p className="text-sm font-mono text-white/80">
                v{selectedFeature.revision}
              </p>
            </div>
            <div className="bg-[#252525] rounded-lg p-3 border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                子项
              </p>
              <p className="text-sm text-white/80">
                {childrenFeatures.length > 0
                  ? `${childrenFeatures.length} 个子项`
                  : '-'}
              </p>
            </div>
            <div className="bg-[#252525] rounded-lg p-3 border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                更新时间
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
              <h3 className="text-sm font-medium text-white">已选 Patterns</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-[#818cf8] hover:text-[#6366f1] hover:bg-[#6366f1]/10"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                添加
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
                  <h3 className="text-sm font-medium text-white">生成文件</h3>
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
            <CollapsibleContent>
              <div className="mt-2 space-y-1">
                {selectedFeature.generatedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#252525] text-xs text-white/60"
                  >
                    <FileCode2 className="h-3.5 w-3.5 text-white/30" />
                    <span className="font-mono">{file}</span>
                  </div>
                ))}
                {selectedFeature.generatedFiles.length === 0 && (
                  <p className="text-xs text-white/30 px-3">暂无生成文件</p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator className="bg-white/5" />

          {/* Host Realization */}
          <Collapsible open={hostOpen} onOpenChange={setHostOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between py-2 group">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-white/50" />
                  <h3 className="text-sm font-medium text-white">Host Realization</h3>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[10px] px-1.5 py-0 border-0',
                      selectedFeature.hostRealization.syncStatus === 'synced'
                        ? 'bg-[#22c55e]/20 text-[#22c55e]'
                        : selectedFeature.hostRealization.syncStatus === 'error'
                        ? 'bg-[#ef4444]/20 text-[#ef4444]'
                        : 'bg-[#f59e0b]/20 text-[#f59e0b]'
                    )}
                  >
                    {selectedFeature.hostRealization.syncStatus === 'synced'
                      ? '已同步'
                      : selectedFeature.hostRealization.syncStatus === 'error'
                      ? '错误'
                      : '等待中'}
                  </Badge>
                </div>
                {hostOpen ? (
                  <ChevronUp className="h-4 w-4 text-white/40 group-hover:text-white/60" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/40 group-hover:text-white/60" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2 px-3">
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-white/40">Host</span>
                  <span className="text-xs text-white/80">
                    {selectedFeature.hostRealization.host}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-white/40">Context</span>
                  <span className="text-xs text-white/80">
                    {selectedFeature.hostRealization.context || '-'}
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

          {/* Actions */}
          <div className="pt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 bg-transparent border-white/10 text-white/70 hover:bg-white/5 hover:text-white"
                onClick={() => regenerateFeature(selectedFeature.id)}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                重新生成
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 bg-transparent border-white/10 text-white/70 hover:bg-white/5 hover:text-white"
              >
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                预览
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9 bg-transparent border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    删除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#1e1e1e] border-white/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">确认删除</AlertDialogTitle>
                    <AlertDialogDescription className="text-white/50">
                      确定要删除 &quot;{selectedFeature.displayName}&quot; 吗？此操作不可撤销。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">
                      取消
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-[#ef4444] hover:bg-[#dc2626]"
                      onClick={() => deleteFeature(selectedFeature.id)}
                    >
                      删除
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

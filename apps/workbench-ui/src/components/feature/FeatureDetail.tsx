import { useEffect, useState } from 'react';
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
  WandSparkles,
  Sparkles,
  GitBranchPlus,
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
import { ExecutionOutputPanel } from '@/components/project-setup/ExecutionOutputPanel';
import { Textarea } from '@/components/ui/textarea';
import { useCLIExecutor } from '@/hooks/useCLIExecutor';
import type { CLIReviewAction, CLIReviewStageStatus, GapFillProductStatus } from '@/hooks/useCLIExecutor';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { describeGapFillBoundary } from '@/types/gapFill';
import {
  buildCanonicalGapFillGuidance,
  deriveCanonicalAcceptanceStatus,
  deriveGapFillContinuationState,
  TALENT_DRAW_CANONICAL_BOUNDARY,
  TALENT_DRAW_CANONICAL_PROMPT,
} from '@/lib/gapFillCanonical';

function extractApprovalFile(command?: string): string | undefined {
  if (!command) {
    return undefined;
  }
  const quoted = command.match(/--approve\s+"([^"]+)"/);
  if (quoted?.[1]) {
    return quoted[1];
  }
  const bare = command.match(/--approve\s+([^\s]+)/);
  return bare?.[1];
}

const gapFillStatusLabel: Record<GapFillProductStatus, string> = {
  ready_to_apply: '可继续应用',
  needs_confirmation: '需要确认',
  blocked_by_host: '宿主阻塞',
  blocked_by_policy: '策略阻塞',
};

const reviewStageStatusLabel: Record<CLIReviewStageStatus, string> = {
  success: '通过',
  failure: '失败',
  warning: '提醒',
  info: '信息',
};

export function FeatureDetail() {
  const selectedFeature = useFeatureStore((state) => state.getSelectedFeature());
  const deleteFeature = useFeatureStore((state) => state.deleteFeature);
  const regenerateFeature = useFeatureStore((state) => state.regenerateFeature);
  const workspace = useFeatureStore((state) => state.workspace);
  const hostConfig = useFeatureStore((state) => state.hostConfig);
  const {
    executeGapFill,
    executeRepairBuild,
    executeLaunch,
    isRunning,
    status,
    currentCommand,
    output,
    result,
    error,
    clearOutput,
  } = useCLIExecutor();

  const [filesOpen, setFilesOpen] = useState(false);
  const [hostOpen, setHostOpen] = useState(true);
  const [gapFillOpen, setGapFillOpen] = useState(true);
  const [selectedBoundary, setSelectedBoundary] = useState<string>('');
  const [gapFillInstruction, setGapFillInstruction] = useState('');

  // No feature selected - show a Dota2-focused empty state
  if (!selectedFeature) {
    return (
      <div className="flex-1 bg-[#1a1a1a] flex items-center justify-center min-w-0 h-full overflow-hidden">
        <div className="max-w-md text-center px-6">
          <div className="w-16 h-16 rounded-full bg-white/5 mx-auto flex items-center justify-center mb-4">
            <Sparkles className="h-7 w-7 text-white/25" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">选择一个功能查看详情</h2>
          <p className="text-sm text-white/45 leading-relaxed">
            左侧可以查看已存在的功能，也可以先通过“项目准备”完成宿主配置、初始化、安装依赖和运行检查。
          </p>
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

  const hostRoot = workspace?.hostRoot || hostConfig.hostRoot;
  const gapFillBoundaries = selectedFeature.gapFillBoundaries || [];
  const effectiveBoundary = selectedBoundary || gapFillBoundaries[0] || '';
  const canRunGapFill =
    !!hostRoot &&
    selectedFeature.status === 'active' &&
    gapFillBoundaries.length > 0 &&
    gapFillInstruction.trim().length > 0 &&
    !isRunning;

  const review = result?.review ?? null;
  const gapFillStatus = review?.gapFillStatus;
  const decisionRecord = review?.gapFillDecisionRecord;
  const structuredReadiness = review?.gapFillReadiness;
  const readiness = selectedFeature.reviewSignals.readiness;
  const readinessStage = review?.stages.find((stage) => stage.id === 'gap-readiness');
  const readinessScore = Math.max(0, Math.min(100, readiness.score));
  const readinessWarnings = structuredReadiness?.blockingItems || readinessStage?.details || readiness.warnings || [];

  const reviewActions = review?.recommendedActions || [];
  const approvalAction =
    reviewActions.find((action) => action.kind === 'primary' || action.kind === 'launch') ||
    reviewActions[0];
  const applyAction =
    reviewActions.find((action) => action.kind === 'repair') || reviewActions[1];
  const validateAction =
    reviewActions.find((action) => action.kind === 'inspect' || action.kind === 'secondary') ||
    reviewActions[2];
  const approvalFile = extractApprovalFile(approvalAction?.command) || extractApprovalFile(validateAction?.command);
  const canContinueAfterApply =
    gapFillStatus === 'ready_to_apply' &&
    review?.stages.some((stage) => stage.id === 'gap-validation' && stage.status === 'success');
  const continuationState = deriveGapFillContinuationState({
    status: gapFillStatus,
    validationSucceeded: !!canContinueAfterApply,
    hostReady: structuredReadiness?.hostReady ?? true,
  });
  const canLaunchAfterApply = continuationState.canLaunchHost;
  const canonicalGuidance =
    review?.canonicalGapFillGuidance ||
    buildCanonicalGapFillGuidance({
      boundaryId: effectiveBoundary || decisionRecord?.selectedBoundary,
      instruction: gapFillInstruction.trim() || decisionRecord?.originalInstruction,
      status: gapFillStatus,
      approvalFile,
      validationSucceeded: !!canContinueAfterApply,
      hostReady: structuredReadiness?.hostReady ?? false,
    });
  const canonicalAcceptance =
    review?.canonicalAcceptance ||
    deriveCanonicalAcceptanceStatus({
      boundaryId: effectiveBoundary || decisionRecord?.selectedBoundary,
      instruction: gapFillInstruction.trim() || decisionRecord?.originalInstruction,
      status: gapFillStatus,
      validationSucceeded: !!canContinueAfterApply,
      hostReady: structuredReadiness?.hostReady ?? false,
      continuationVisible: continuationState.showContinuationRail,
    });

  const summaryStatusStyles: Record<CLIReviewStageStatus, string> = {
    success: 'bg-[#22c55e]/20 text-[#22c55e]',
    failure: 'bg-[#ef4444]/20 text-[#ef4444]',
    warning: 'bg-[#fbbf24]/20 text-[#fbbf24]',
    info: 'bg-[#6366f1]/20 text-[#c4b5fd]',
  };

  const stageStatusStyles: Record<CLIReviewStageStatus, string> = {
    success: 'text-[#22c55e]',
    failure: 'text-[#ef4444]',
    warning: 'text-[#fbbf24]',
    info: 'text-[#6366f1]',
  };

  const reviewActionSlots: Array<{ title: string; action?: CLIReviewAction }> = [
    {
      title: '确认',
      action: approvalAction,
    },
    {
      title: '应用',
      action: applyAction,
    },
    {
      title: '校验',
      action: validateAction,
    },
  ];

  const actionSlotDescription: Record<string, string> = {
    确认: '查看审批单元与确认要求',
    应用: '执行补丁应用或后续修复',
    校验: '检查应用后的结果与建议',
  };

  useEffect(() => {
    setSelectedBoundary('');
    setGapFillInstruction('');
  }, [selectedFeature.id]);

  const handleRunGapFill = async () => {
    if (!hostRoot || !gapFillInstruction.trim()) {
      return;
    }
    const boundaryId = effectiveBoundary || undefined;
    await executeGapFill(hostRoot, selectedFeature.id, gapFillInstruction.trim(), boundaryId, 'review');
  };

  const handleApplyGapFill = async () => {
    if (!hostRoot || !gapFillInstruction.trim()) {
      return;
    }
    const boundaryId = effectiveBoundary || undefined;
    await executeGapFill(
      hostRoot,
      selectedFeature.id,
      gapFillInstruction.trim(),
      boundaryId,
      'apply',
      approvalFile,
    );
  };

  const handleValidateGapFill = async () => {
    if (!hostRoot || (!gapFillInstruction.trim() && !approvalFile)) {
      return;
    }
    const boundaryId = effectiveBoundary || undefined;
    await executeGapFill(
      hostRoot,
      selectedFeature.id,
      gapFillInstruction.trim(),
      boundaryId,
      'validate-applied',
      approvalFile,
    );
  };

  const handleRepairBuild = async () => {
    if (!hostRoot) {
      return;
    }
    await executeRepairBuild(hostRoot);
  };

  const handleLaunchHost = async () => {
    if (!hostRoot) {
      return;
    }
    await executeLaunch(hostRoot, workspace?.addonName, workspace?.mapName);
  };

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
                  <h3 className="text-sm font-medium text-white">宿主落点</h3>
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

          {/* Gap Fill */}
          <Collapsible open={gapFillOpen} onOpenChange={setGapFillOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between py-2 group">
                <div className="flex items-center gap-2">
                  <WandSparkles className="h-4 w-4 text-white/50" />
                  <h3 className="text-sm font-medium text-white">业务逻辑填充</h3>
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 bg-white/5 text-white/50 border-0"
                  >
                    {gapFillBoundaries.length}
                  </Badge>
                </div>
                {gapFillOpen ? (
                  <ChevronUp className="h-4 w-4 text-white/40 group-hover:text-white/60" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/40 group-hover:text-white/60" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-4 rounded-lg border border-white/5 bg-[#252525] p-4">
                <div className="flex items-center gap-3 rounded border border-white/5 bg-[#161b22] px-3 py-2">
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[10px] px-2 py-0 uppercase tracking-widest',
                      summaryStatusStyles[review?.status ?? 'info']
                    )}
                  >
                      {gapFillStatus ? gapFillStatusLabel[gapFillStatus] : reviewStageStatusLabel[review?.status ?? 'info']}
                  </Badge>
                  <div className="flex-1 space-y-0.5">
                    <p className="text-sm font-semibold text-white">
                      {review?.title ?? '等待业务逻辑填充评审'}
                    </p>
                    <p className="text-xs text-white/50">
                      {review?.summary ?? '运行 gap fill 后，这里会显示结构化评审结果与下一步。'}
                    </p>
                  </div>
                  <span className="text-[10px] text-white/40">
                    {review?.artifactPath ? '评审产物已生成' : '等待执行'}
                  </span>
                </div>
                <div
                  className={cn(
                    'rounded border p-3 space-y-2',
                    canonicalGuidance.classification === 'canonical'
                      ? 'border-[#22c55e]/20 bg-[#0f1a13]'
                      : 'border-[#f59e0b]/20 bg-[#1d180f]'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Canonical 演示引导</p>
                      <p className="mt-1 text-[12px] font-medium text-white">{canonicalGuidance.title}</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'border-0 text-[10px]',
                        canonicalGuidance.classification === 'canonical'
                          ? 'bg-[#22c55e]/15 text-[#86efac]'
                          : 'bg-[#f59e0b]/15 text-[#fcd34d]'
                      )}
                    >
                      {canonicalGuidance.classification === 'canonical' ? '标准验收路径' : '探索性运行'}
                    </Badge>
                  </div>
                  <p className="text-[11px] font-medium text-white/90">{canonicalAcceptance.summary}</p>
                  <p className="text-[11px] text-white/70">{canonicalGuidance.summary}</p>
                  <div className="grid gap-2 md:grid-cols-2 text-[10px] text-white/55">
                    <p>
                      固定指令:
                      <span className="ml-1 text-white/75">{canonicalGuidance.expectedPrompt}</span>
                    </p>
                    <p>
                      固定边界:
                      <span className="ml-1 font-mono text-white/75">{canonicalGuidance.expectedBoundary}</span>
                    </p>
                  </div>
                  <p className="text-[11px] text-white/80">
                    当前下一步: {canonicalAcceptance.nextStep}
                  </p>
                  {gapFillInstruction.trim() !== TALENT_DRAW_CANONICAL_PROMPT && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-white/10 bg-transparent text-white/80 hover:bg-white/5"
                      onClick={() => setGapFillInstruction(TALENT_DRAW_CANONICAL_PROMPT)}
                    >
                      填入 Talent Draw canonical 指令
                    </Button>
                  )}
                  {!selectedBoundary && effectiveBoundary !== TALENT_DRAW_CANONICAL_BOUNDARY && (
                    <p className="text-[10px] text-white/45">
                      如需 canonical acceptance evidence，请选择 <span className="font-mono text-white/70">{TALENT_DRAW_CANONICAL_BOUNDARY}</span>。
                    </p>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2 rounded border border-white/5 bg-[#1c2028] p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">边界</p>
                      <span className="text-[10px] text-white/50">
                        {gapFillBoundaries.length} 个可用边界
                      </span>
                    </div>
                    {gapFillBoundaries.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {gapFillBoundaries.map((boundaryId) => {
                          const boundaryMeta = describeGapFillBoundary(boundaryId);
                          const isActive = (selectedBoundary || gapFillBoundaries[0]) === boundaryId;
                          return (
                            <button
                              key={boundaryId}
                              type="button"
                              onClick={() => setSelectedBoundary(boundaryId)}
                              className={cn(
                                'flex flex-col gap-0.5 rounded border px-2 py-1 text-left text-[10px] transition-colors',
                                isActive
                                  ? 'border-[#6366f1]/60 bg-[#6366f1]/15 text-[#c7d2fe]'
                                  : 'border-white/10 bg-transparent text-white/60 hover:bg-white/5'
                              )}
                            >
                              <span className="text-xs font-semibold leading-tight">{boundaryMeta.label}</span>
                              <span className="text-[9px] text-white/40 truncate">
                                {boundaryMeta.description || boundaryMeta.id}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-white/40">
                        当前 feature 还没有声明可做 gap fill 的 boundary。
                      </p>
                    )}
                  </div>
                  <div className="space-y-3 rounded border border-white/5 bg-[#1c2028] p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">准备度</p>
                      <span className="text-[11px] text-white/70">{readinessScore}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#16a34a] to-[#38bdf8]"
                        style={{ width: `${readinessScore}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-white/40">
                      {readinessWarnings.length > 0
                        ? `${readinessWarnings.length} 个准备项提醒`
                        : (readinessStage?.summary || '当前没有额外准备项提醒。')}
                    </p>
                    {readinessWarnings.length > 0 && (
                      <ul className="space-y-1 text-[9px] text-[#fbbf24]">
                        {readinessWarnings.map((warning, index) => (
                          <li key={`${warning}-${index}`} className="truncate">
                            {warning}
                          </li>
                        ))}
                      </ul>
                    )}
                    {structuredReadiness?.advisoryItems && structuredReadiness.advisoryItems.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[9px] uppercase tracking-[0.16em] text-white/35">可继续项</p>
                        <ul className="space-y-1 text-[9px] text-white/45">
                          {structuredReadiness.advisoryItems.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded border border-white/10 bg-[#10151c] p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">审批 / 确认单元</p>
                    <span className="text-[10px] text-white/45">
                      {decisionRecord?.decision ?? '等待评审'}
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 text-[10px] text-white/60">
                    <div className="space-y-2">
                      <div>
                        <p className="text-white/35">原始指令</p>
                        <p className="mt-1 text-white/75">
                          {decisionRecord?.originalInstruction || '运行 review 后显示'}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/35">选中边界</p>
                        <p className="mt-1 text-white/75">
                          {decisionRecord?.selectedBoundaryLabel || decisionRecord?.selectedBoundary || effectiveBoundary || '未选择'}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/35">精确下一步</p>
                        <p className="mt-1 text-white/75">
                          {decisionRecord?.exactNextStep || '运行 review 后显示下一步'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-white/35">已采用假设</p>
                        <ul className="mt-1 space-y-1">
                          {(decisionRecord?.assumptionsMade?.length ? decisionRecord.assumptionsMade : ['当前没有记录假设']).map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-white/35">用户输入</p>
                        <ul className="mt-1 space-y-1">
                          {(decisionRecord?.userInputsUsed?.length ? decisionRecord.userInputsUsed : ['当前没有记录']).map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-white/35">推断输入</p>
                        <ul className="mt-1 space-y-1">
                          {(decisionRecord?.inferredInputsUsed?.length ? decisionRecord.inferredInputsUsed : ['当前没有额外推断']).map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(decisionRecord?.failureCategories?.length ? decisionRecord.failureCategories : ['暂无 failure taxonomy']).map((item) => (
                      <Badge
                        key={item}
                        variant="secondary"
                        className="border-0 bg-white/8 text-[10px] text-white/70"
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-white/35">业务逻辑指令</p>
                  <Textarea
                    value={gapFillInstruction}
                    onChange={(event) => setGapFillInstruction(event.target.value)}
                    placeholder="例如：把稀有度映射改成 R/SR/SSR/UR 分别对应 1/2/4/7 点全属性，并保留现有事件和桥接。"
                    className="min-h-[88px] resize-none bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2 text-[10px] text-white/45">
                  <p>
                    宿主: <span className="text-white/65 font-mono">{hostRoot || '（未连接宿主）'}</span>
                  </p>
                  <p>
                    功能: <span className="text-white/65 font-mono">{selectedFeature.id}</span>
                  </p>
                  {effectiveBoundary && (
                    <p>
                      边界: <span className="text-white/65 font-mono">{effectiveBoundary}</span>
                    </p>
                  )}
                  <p>
                    这一步只会生成补丁计划或确认记录，不会直接改宿主运行时文件。
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-9 bg-[#6366f1] hover:bg-[#4f46e5] text-white"
                    disabled={!canRunGapFill}
                    onClick={() => void handleRunGapFill()}
                  >
                    <GitBranchPlus className="h-3.5 w-3.5 mr-1.5" />
                    {isRunning && currentCommand === 'gap-fill' ? '规划中...' : '生成评审'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 border-white/10 bg-transparent text-white/80 hover:bg-white/5"
                    disabled={
                      isRunning ||
                      !hostRoot ||
                      (
                        gapFillStatus === 'needs_confirmation'
                          ? !approvalFile
                          : !canRunGapFill
                      ) ||
                      gapFillStatus === 'blocked_by_policy'
                    }
                    onClick={() => void handleApplyGapFill()}
                  >
                    应用补丁
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 border-white/10 bg-transparent text-white/80 hover:bg-white/5"
                    disabled={!hostRoot || (!gapFillInstruction.trim() && !approvalFile) || isRunning}
                    onClick={() => void handleValidateGapFill()}
                  >
                    校验结果
                  </Button>
                  {!hostRoot && (
                    <p className="text-[10px] text-[#9e6a03]">
                      先在左侧接入宿主，才能执行 gap fill。
                    </p>
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {reviewActionSlots.map(({ title, action }) => (
                    <div
                      key={title}
                      className="rounded border border-white/10 bg-[#10151c] p-3 text-[10px] text-white/70"
                    >
                      <p className="text-[9px] uppercase tracking-[0.2em] text-white/40">{title}</p>
                      <p className="mt-1 text-[11px] text-white">
                        {action?.label ?? '等待结构化动作'}
                      </p>
                      {action?.command && (
                        <code className="mt-1 block break-all text-[9px] text-[#6366f1]/80">
                          {action.command}
                        </code>
                      )}
                      <p className="mt-2 text-[9px] text-white/40">
                        {actionSlotDescription[title] ?? '等待结构化动作'}
                      </p>
                    </div>
                  ))}
                </div>
                {continuationState.showContinuationRail && (
                  <div className="rounded border border-white/10 bg-[#10151c] p-3 space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">后续动作</p>
                      <p className="mt-1 text-[12px] text-white/80">
                        {continuationState.nextStep}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 border-white/10 bg-transparent text-white/80 hover:bg-white/5"
                        disabled={!hostRoot || isRunning}
                        onClick={() => void handleRepairBuild()}
                      >
                        修复并构建
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 border-white/10 bg-transparent text-white/80 hover:bg-white/5"
                        disabled={!hostRoot || isRunning || !canLaunchAfterApply}
                        onClick={() => void handleLaunchHost()}
                      >
                        启动宿主
                      </Button>
                    </div>
                  </div>
                )}
                {review ? (
                  <div className="space-y-3">
                    <div className="rounded border border-white/10 bg-[#0d1219] p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-wider text-white/40">评审结果</p>
                        <span className="text-[10px] text-white/50">
                          {review.generatedFiles?.length ?? 0} 个目标文件
                        </span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-[11px] text-white/70">要点</p>
                          <ul className="mt-2 space-y-1 text-[10px] text-white/60">
                            {review.highlights.length > 0 ? (
                              review.highlights.map((item) => (
                                <li key={item} className="truncate text-white/60">
                                  – {item}
                                </li>
                              ))
                            ) : (
                              <li className="text-white/40">等待结构化要点。</li>
                            )}
                          </ul>
                        </div>
                        <div>
                          <p className="text-[11px] text-white/70">阶段</p>
                          <div className="mt-2 space-y-1">
                            {review.stages.slice(0, 4).map((stage) => (
                              <div
                                key={stage.id}
                                className="rounded border border-white/10 bg-white/[0.02] px-2 py-1"
                              >
                                <div className="flex items-center justify-between">
                                  <p className="text-[10px] text-white/70">{stage.label}</p>
                                  <span
                                    className={cn(
                                      'text-[9px] uppercase tracking-wider',
                                      stageStatusStyles[stage.status]
                                    )}
                                  >
                                    {reviewStageStatusLabel[stage.status]}
                                  </span>
                                </div>
                                <p className="text-[10px] text-white/60">{stage.summary}</p>
                                {stage.details && stage.details.length > 0 && (
                                  <ul className="mt-1 space-y-0.5 text-[9px] text-white/40">
                                    {stage.details.map((detail) => (
                                      <li key={detail}>- {detail}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      {review.blockers.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-white/40">阻塞项</p>
                          <ul className="mt-1 space-y-1 text-[10px] text-[#f87171]">
                            {review.blockers.slice(0, 4).map((blocker) => (
                              <li key={blocker}>- {blocker}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    {review.generatedFiles?.length ? (
                      <div className="rounded border border-white/10 bg-[#0d1219] p-3 space-y-2">
                        <p className="text-[11px] text-white/70">检查目标</p>
                        <ul className="space-y-1 text-[10px] text-white/60">
                          {review.generatedFiles.map((file) => (
                            <li key={file} className="flex items-center justify-between gap-2">
                              <span className="truncate">{file}</span>
                              <span className="text-[9px] text-white/40">变更</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded border border-white/10 bg-[#0d1219] p-3">
                      <p className="text-[10px] text-white/40">
                      运行业务逻辑填充后，这里会出现变更摘要、阶段结果和审批建议。
                    </p>
                  </div>
                )}
                <ExecutionOutputPanel
                  isRunning={isRunning && currentCommand === 'gap-fill'}
                  status={currentCommand === 'gap-fill' ? status : 'idle'}
                  output={currentCommand === 'gap-fill' ? output : []}
                  result={currentCommand === 'gap-fill' ? result : null}
                  error={currentCommand === 'gap-fill' ? error : null}
                  maxHeight="220px"
                  onClear={clearOutput}
                />
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

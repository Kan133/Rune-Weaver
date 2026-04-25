import {
  ChevronDown,
  ChevronUp,
  FileCode2,
  FolderOpen,
  GitBranchPlus,
  Play,
  RefreshCw,
  Sparkles,
  Trash2,
  WandSparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { PatternTag } from '@/components/shared/PatternTag';
import { ReviewSignals } from '@/components/review/ReviewSignals';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ExecutionOutputPanel } from '@/components/project-setup/ExecutionOutputPanel';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { FeatureDetailController } from './useFeatureDetailController';
import { getActionCommand, getGapFillStatusLabel } from './useFeatureDetailController';

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#252525] rounded-lg p-3 border border-white/5">
      <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">{label}</p>
      <p className="text-sm text-white/80 break-words">{value}</p>
    </div>
  );
}

function OutputPanelForCommand({
  controller,
  command,
  maxHeight,
}: {
  controller: FeatureDetailController;
  command: 'update' | 'gap-fill' | 'delete';
  maxHeight: string;
}) {
  const isCurrent = controller.cli.currentCommand === command;
  return (
    <ExecutionOutputPanel
      isRunning={controller.cli.isRunning && isCurrent}
      status={isCurrent ? controller.cli.status : 'idle'}
      output={isCurrent ? controller.cli.output : []}
      result={isCurrent ? controller.cli.result : null}
      error={isCurrent ? controller.cli.error : null}
      maxHeight={maxHeight}
      onClear={controller.cli.clearOutput}
    />
  );
}

export function FeatureDetailContent({ controller }: { controller: FeatureDetailController }) {
  const { feature } = controller;

  if (!feature) {
    return (
      <div className="flex-1 bg-[#1a1a1a] flex items-center justify-center min-w-0 h-full overflow-hidden">
        <div className="max-w-md text-center px-6">
          <div className="w-16 h-16 rounded-full bg-white/5 mx-auto flex items-center justify-center mb-4">
            <Sparkles className="h-7 w-7 text-white/25" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Select a feature</h2>
          <p className="text-sm text-white/45 leading-relaxed">
            The left pane shows the connected workspace. Select one feature to inspect lifecycle actions here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#1a1a1a] flex flex-col min-w-0 h-full overflow-hidden">
      <ScrollArea className="flex-1 h-full">
        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-white mb-2">{feature.displayName}</h1>
              <div className="flex items-center gap-3">
                <StatusBadge status={feature.status} />
                <span className="text-xs font-mono text-white/40">#{feature.systemId}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InfoCard label="System ID" value={feature.systemId} />
            <InfoCard label="Group" value={controller.groupLabel} />
            <InfoCard label="Parent" value={controller.parentFeature?.displayName || 'None'} />
            <InfoCard label="Revision" value={feature.revision !== null ? `v${feature.revision}` : 'Unknown'} />
            <InfoCard label="Children" value={String(controller.childrenFeatures.length)} />
            <InfoCard label="Updated" value={controller.updatedLabel} />
          </div>

          <Separator className="bg-white/5" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white">Patterns</h3>
              <Badge variant="secondary" className="bg-white/5 text-white/50 border-0">
                {feature.patterns.length}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {feature.patterns.map((pattern) => (
                <PatternTag key={pattern} pattern={pattern} removable={false} />
              ))}
              {feature.patterns.length === 0 && (
                <p className="text-xs text-white/35">No pattern binding recorded.</p>
              )}
            </div>
          </div>

          <Separator className="bg-white/5" />

          <Collapsible open={controller.filesOpen} onOpenChange={controller.setFilesOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between py-2 group">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-white/50" />
                  <h3 className="text-sm font-medium text-white">Generated Files</h3>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-white/5 text-white/50 border-0">
                    {feature.generatedFiles.length}
                  </Badge>
                </div>
                {controller.filesOpen ? (
                  <ChevronUp className="h-4 w-4 text-white/40 group-hover:text-white/60" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/40 group-hover:text-white/60" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2">
              {feature.generatedFiles.length > 0 ? (
                feature.generatedFiles.map((file) => (
                  <div key={file} className="rounded border border-white/10 bg-[#10151c] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FileCode2 className="h-3.5 w-3.5 text-[#818cf8]" />
                      <code className="text-[11px] text-white/70 break-all">{file}</code>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded border border-white/10 bg-[#10151c] px-3 py-2 text-[11px] text-white/45">
                  No generated file evidence recorded yet.
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          <Separator className="bg-white/5" />

          <Collapsible open={controller.hostOpen} onOpenChange={controller.setHostOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between py-2 group">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-white/50" />
                  <h3 className="text-sm font-medium text-white">Host / Output</h3>
                </div>
                {controller.hostOpen ? (
                  <ChevronUp className="h-4 w-4 text-white/40 group-hover:text-white/60" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/40 group-hover:text-white/60" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="grid gap-3 md:grid-cols-2">
              <InfoCard label="Host" value={feature.hostRealization.host || 'Unknown'} />
              <InfoCard label="Sync Status" value={feature.hostRealization.syncStatus} />
              <InfoCard label="Context" value={feature.hostRealization.context || 'No host context recorded'} />
              <InfoCard
                label="Integration Points"
                value={feature.integrationPoints.length > 0 ? feature.integrationPoints.join(', ') : 'No integration points recorded'}
              />
            </CollapsibleContent>
          </Collapsible>

          <Separator className="bg-white/5" />

          <Collapsible open={controller.updateOpen} onOpenChange={controller.setUpdateOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between py-2 group">
                <div className="flex items-center gap-2">
                  <WandSparkles className="h-4 w-4 text-white/50" />
                  <h3 className="text-sm font-medium text-white">Update</h3>
                </div>
                {controller.updateOpen ? (
                  <ChevronUp className="h-4 w-4 text-white/40 group-hover:text-white/60" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/40 group-hover:text-white/60" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3">
              <Textarea
                value={controller.updatePrompt}
                onChange={(event) => controller.setUpdatePrompt(event.target.value)}
                placeholder="Describe the change you want to make to this feature."
                className="min-h-[96px] resize-none bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30"
              />
              <div className="flex items-center gap-2">
                <Button size="sm" className="h-9 bg-[#6366f1] hover:bg-[#4f46e5] text-white" disabled={!controller.canRunUpdate} onClick={() => void controller.handlePreviewUpdate()}>
                  Preview Update
                </Button>
                <Button size="sm" variant="outline" className="h-9 border-white/10 bg-transparent text-white/80 hover:bg-white/5" disabled={!controller.canRunUpdate} onClick={() => void controller.handleApplyUpdate()}>
                  Apply Update
                </Button>
              </div>
              <OutputPanelForCommand controller={controller} command="update" maxHeight="220px" />
            </CollapsibleContent>
          </Collapsible>

          <Separator className="bg-white/5" />

          <Collapsible open={controller.gapFillOpen} onOpenChange={controller.setGapFillOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between py-2 group">
                <div className="flex items-center gap-2">
                  <GitBranchPlus className="h-4 w-4 text-white/50" />
                  <h3 className="text-sm font-medium text-white">Gap Fill</h3>
                </div>
                {controller.gapFillOpen ? (
                  <ChevronUp className="h-4 w-4 text-white/40 group-hover:text-white/60" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/40 group-hover:text-white/60" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2 rounded border border-white/5 bg-[#1c2028] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Boundaries</p>
                    <span className="text-[10px] text-white/50">{controller.gapFillBoundaries.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {controller.gapFillBoundaries.map((boundaryId) => {
                      const boundary = controller.describeGapFillBoundary(boundaryId);
                      const active = controller.effectiveBoundary === boundaryId;
                      return (
                        <button
                          key={boundaryId}
                          type="button"
                          onClick={() => controller.setSelectedBoundary(boundaryId)}
                          className={cn(
                            'flex flex-col gap-0.5 rounded border px-2 py-1 text-left text-[10px] transition-colors',
                            active ? 'border-[#6366f1]/60 bg-[#6366f1]/15 text-[#c7d2fe]' : 'border-white/10 bg-transparent text-white/60 hover:bg-white/5',
                          )}
                        >
                          <span className="text-xs font-semibold leading-tight">{boundary.label}</span>
                          <span className="text-[9px] text-white/40 truncate">{boundary.description || boundary.id}</span>
                        </button>
                      );
                    })}
                    {controller.gapFillBoundaries.length === 0 && (
                      <p className="text-[10px] text-white/40">No declared gap-fill boundary on this feature.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 rounded border border-white/5 bg-[#1c2028] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Readiness</p>
                    <span className="text-[10px] text-white/70">
                      {controller.readinessScore === null ? 'Unknown' : `${controller.readinessScore}%`}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#16a34a] to-[#38bdf8]" style={{ width: `${controller.readinessScore ?? 0}%` }} />
                  </div>
                  <p className="text-[10px] text-white/50">Status: {getGapFillStatusLabel(controller.review?.gapFillStatus)}</p>
                </div>
              </div>

              <Textarea
                value={controller.gapFillInstruction}
                onChange={(event) => controller.setGapFillInstruction(event.target.value)}
                placeholder="Describe the bounded gap-fill change you want reviewed."
                className="min-h-[88px] resize-none bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30"
              />

              <div className="grid gap-2 text-[10px] text-white/45">
                <p>Boundary: <span className="text-white/65 font-mono">{controller.effectiveBoundary || 'None selected'}</span></p>
                <p>Guidance: <span className="text-white/65">{controller.canonicalGuidance.summary}</span></p>
                <p>Acceptance: <span className="text-white/65">{controller.canonicalAcceptance.summary}</span></p>
                {controller.approvalUnit && (
                  <p>Approval unit: <span className="text-white/65">{controller.approvalUnit.verdictLabel}</span></p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" className="h-9 bg-[#6366f1] hover:bg-[#4f46e5] text-white" disabled={!controller.canRunGapFill} onClick={() => void controller.handleRunGapFill()}>
                  Generate Review
                </Button>
                <Button size="sm" variant="outline" className="h-9 border-white/10 bg-transparent text-white/80 hover:bg-white/5" disabled={controller.cli.isRunning || !controller.hostRoot || (controller.review?.gapFillStatus === 'needs_confirmation' ? !controller.approvalFile : !controller.canRunGapFill) || controller.review?.gapFillStatus === 'blocked_by_policy'} onClick={() => void controller.handleApplyGapFill()}>
                  Apply Patch
                </Button>
                <Button size="sm" variant="outline" className="h-9 border-white/10 bg-transparent text-white/80 hover:bg-white/5" disabled={!controller.hostRoot || (!controller.gapFillInstruction.trim() && !controller.approvalFile) || controller.cli.isRunning} onClick={() => void controller.handleValidateGapFill()}>
                  Validate Applied
                </Button>
                <Button size="sm" variant="outline" className="h-9 border-white/10 bg-transparent text-white/80 hover:bg-white/5" disabled={!controller.hostRoot || controller.cli.isRunning} onClick={() => void controller.handleRepairBuild()}>
                  Repair Build
                </Button>
                <Button size="sm" variant="outline" className="h-9 border-white/10 bg-transparent text-white/80 hover:bg-white/5" disabled={!controller.hostRoot || controller.cli.isRunning || !controller.continuationState.canLaunchHost} onClick={() => void controller.handleLaunchHost()}>
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Launch Host
                </Button>
              </div>

              {controller.reviewActions.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { title: 'Confirm', action: controller.approvalAction },
                    { title: 'Apply', action: controller.applyAction },
                    { title: 'Validate', action: controller.validateAction },
                  ].map(({ title, action }) => (
                    <div key={title} className="rounded border border-white/10 bg-[#10151c] p-3 text-[10px] text-white/70">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-white/40">{title}</p>
                      <p className="mt-1 text-[11px] text-white">{action?.label || 'Waiting for structured action'}</p>
                      <code className="mt-1 block break-all text-[9px] text-[#6366f1]/80">{getActionCommand(action)}</code>
                    </div>
                  ))}
                </div>
              )}

              <OutputPanelForCommand controller={controller} command="gap-fill" maxHeight="240px" />
            </CollapsibleContent>
          </Collapsible>

          <Separator className="bg-white/5" />

          <div>
            <h3 className="text-sm font-medium text-white mb-4">Review Signals</h3>
            <ReviewSignals feature={controller.selectedFeature} />
          </div>

          <div className="pt-4 border-t border-white/5">
            <div className="mb-3 rounded border border-white/10 bg-white/[0.02] px-3 py-2 text-[10px] text-white/45">
              Current workbench flow keeps only real lifecycle actions: Create / Update / Delete. Review output now lives in one place: the execution panel below each command.
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 w-full bg-transparent border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10" disabled={!controller.hostRoot || controller.cli.isRunning}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete Feature
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#1e1e1e] border-white/10">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Confirm Delete</AlertDialogTitle>
                  <AlertDialogDescription className="text-white/50">
                    Delete "{feature.displayName}" from the connected workspace?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction className="bg-[#ef4444] hover:bg-[#dc2626]" onClick={() => void controller.handleDeleteFeature()}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <OutputPanelForCommand controller={controller} command="delete" maxHeight="180px" />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

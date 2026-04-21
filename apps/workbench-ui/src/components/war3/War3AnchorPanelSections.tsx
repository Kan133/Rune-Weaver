import { useRef } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import {
  Anchor,
  ArrowRight,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Copy,
  Eye,
  FileText,
  Loader2,
  MapPin,
  MousePointer2,
  Plus,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { ANCHOR_ROLES, type AnchorRole, type ConfirmedAnchor, type ConfirmedLandmark, type SuggestionItem } from './war3AnchorPanel.types';
import { getRoleDisplay } from './war3AnchorPanel.utils';
import type { War3AnchorPanelController } from './useWar3AnchorPanelController';

interface SectionProps {
  controller: War3AnchorPanelController;
  isMain: boolean;
}

export function War3AnchorPanelHeader({ controller, isMain }: SectionProps) {
  return (
    <div className={cn('border-b border-white/5', isMain ? 'px-6 py-4' : 'px-4 py-3')}>
      <div className={cn('flex items-center gap-2 mb-3', isMain && 'mb-4')}>
        <Anchor className={cn('text-[#818cf8]', isMain ? 'h-5 w-5' : 'h-4 w-4')} />
        <h3 className={cn('font-medium text-white', isMain ? 'text-lg' : 'text-sm')}>War3 锚点工作台</h3>
      </div>

      <div className={cn('flex gap-3', isMain ? 'flex-row items-center' : 'flex-col space-y-2')}>
        <Input
          value={controller.localHostRoot}
          onChange={(event) => controller.setLocalHostRoot(event.target.value)}
          placeholder="输入地图目录路径..."
          className={cn(
            'bg-[#252525] border-white/10 text-white placeholder:text-white/30',
            isMain ? 'flex-1 h-10 text-sm' : 'h-8 text-xs',
          )}
        />
        <Button
          onClick={controller.handleLoadAnchors}
          disabled={controller.loading}
          className={cn(
            'bg-[#818cf8] hover:bg-[#6366f1] text-white shrink-0',
            isMain ? 'h-10 px-6 text-sm' : 'h-8 text-xs w-full',
          )}
        >
          {controller.loading ? (
            <>
              <Loader2 className={cn('mr-1.5 animate-spin', isMain ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
              加载中...
            </>
          ) : (
            <>
              <MapPin className={cn('mr-1.5', isMain ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
              加载锚点
            </>
          )}
        </Button>
      </div>

      {controller.error && (
        <div className={cn('mt-3 rounded bg-[#ef4444]/10 text-[#ef4444]', isMain ? 'px-3 py-2 text-sm' : 'px-2 py-1.5 text-xs')}>
          {controller.error}
        </div>
      )}
    </div>
  );
}

export function War3AnchorPanelContent({ controller, isMain }: SectionProps) {
  return (
    <div className="flex-1 overflow-hidden flex">
      <ScrollArea className="flex-1">
        <div className={cn('space-y-4', isMain ? 'p-6' : 'p-4')}>
          {controller.hasData && <MapPreviewSection controller={controller} isMain={isMain} />}
          {controller.selectedData && <SelectedSuggestionSection controller={controller} isMain={isMain} />}
          {controller.confirmedCount > 0 && <ConfirmedAnchorsSection controller={controller} isMain={isMain} />}
          {controller.hasData && <PromptBuilderSection controller={controller} isMain={isMain} />}
          {(controller.anchorSuggestions.length > 0 || controller.doodadSuggestions.length > 0 || controller.manualAnchors.length > 0) && (
            <ContextDraftSection controller={controller} isMain={isMain} />
          )}
          {controller.canvasHint && <OverviewSection controller={controller} isMain={isMain} />}
          {controller.manualAnchors.length > 0 && <ManualAnchorsSection controller={controller} isMain={isMain} />}
          {(controller.anchorSuggestions.length > 0 || controller.doodadSuggestions.length > 0) && (
            <SuggestionsSection controller={controller} isMain={isMain} />
          )}
          {controller.issues.length > 0 && <IssuesSection controller={controller} />}
          {!controller.loading && !controller.error && !controller.hasData && <EmptyState isMain={isMain} />}
        </div>
      </ScrollArea>
    </div>
  );
}

function MapPreviewSection({ controller, isMain }: SectionProps) {
  return (
    <div className={cn('bg-[#252525] rounded-lg border border-white/5', isMain ? 'p-4' : 'p-3')}>
      <div className="flex items-center gap-2 mb-3">
        <Eye className="h-4 w-4 text-white/50" />
        <span className="text-sm font-medium text-white/70">地图预览</span>
        {controller.canvasHint && (
          <span className="text-xs text-white/40 ml-auto">
            {controller.canvasHint.width} × {controller.canvasHint.height}
          </span>
        )}
      </div>

      <MapPreview
        canvasHint={controller.canvasHint}
        anchorSuggestions={controller.anchorSuggestions}
        doodadSuggestions={controller.doodadSuggestions}
        manualAnchors={controller.manualAnchors}
        selectedSuggestion={controller.selectedSuggestion}
        onSelectAnchor={controller.handleSelectAnchor}
        onSelectDoodad={controller.handleSelectDoodad}
        onSelectManual={controller.handleSelectManualAnchor}
        onMapClick={controller.handleMapClick}
        isManualAnchorMode={controller.isManualAnchorMode}
        compact={!isMain}
      />

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-white/40">
          <LegendDot className="rounded-full bg-[#22c55e]" label="单位" />
          <LegendDot className="bg-[#f59e0b]" label="装饰物" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
          <LegendDot className="rounded-full bg-[#a855f7]" label="手动" />
        </div>
        <Button
          onClick={() => controller.setIsManualAnchorMode(!controller.isManualAnchorMode)}
          disabled={!controller.canvasHint}
          className={cn(
            'h-7 text-xs px-3',
            controller.isManualAnchorMode
              ? 'bg-[#a855f7] hover:bg-[#9333ea] text-white'
              : 'bg-[#333] hover:bg-[#444] text-white/70',
          )}
        >
          {controller.isManualAnchorMode ? (
            <>
              <MousePointer2 className="h-3 w-3 mr-1" /> 点击地图添加
            </>
          ) : (
            <>
              <Plus className="h-3 w-3 mr-1" /> 手动锚点
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function LegendDot({ className, label, style }: { className: string; label: string; style?: CSSProperties }) {
  return (
    <div className="flex items-center gap-1">
      <span className={cn('w-2 h-2', className)} style={style} />
      <span>{label}</span>
    </div>
  );
}

function SelectedSuggestionSection({ controller, isMain }: SectionProps) {
  const selectedData = controller.selectedData;
  if (!selectedData) {
    return null;
  }

  return (
    <div className={cn('bg-[#252525] rounded-lg border border-[#818cf8]/30', isMain ? 'p-4' : 'p-3')}>
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 className="h-4 w-4 text-[#818cf8]" />
        <span className="text-sm font-medium text-white/70">选中点详情</span>
        <Badge
          className={cn(
            'text-[10px] px-1.5 py-0 border-0 ml-auto',
            selectedData.confirmed ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-white/10 text-white/50',
          )}
        >
          {selectedData.confirmed ? '已确认' : '未确认'}
        </Badge>
      </div>
      <SuggestionDetails
        suggestion={selectedData}
        onSemanticNameChange={controller.updateSelectedSemanticName}
        onToggleConfirm={controller.toggleSelectedConfirmation}
        onRoleChange={selectedData.confirmed ? controller.updateSelectedRole : undefined}
        onRoleLabelChange={selectedData.confirmed ? controller.updateSelectedRoleLabel : undefined}
        compact={!isMain}
      />
    </div>
  );
}

function ConfirmedAnchorsSection({ controller, isMain }: SectionProps) {
  return (
    <div className={cn('bg-[#252525] rounded-lg border border-[#22c55e]/20', isMain ? 'p-4' : 'p-3')}>
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />
        <span className="text-sm font-medium text-white/70">已确认锚点</span>
        <Badge className="text-[10px] px-1.5 py-0 bg-[#22c55e]/20 text-[#22c55e] border-0 ml-auto">
          {controller.confirmedCount} 个
        </Badge>
      </div>
      <div className="space-y-2">
        {controller.allConfirmedItems.map((item, listIndex) => {
          const roleDisplay = getRoleDisplay(item.data);
          const isFirst = listIndex === 0;
          const isLast = listIndex === controller.allConfirmedItems.length - 1;

          return (
            <div
              key={`${item.type}-${item.index}`}
              onClick={() => controller.setSelectedSuggestion({ type: item.type, index: item.index })}
              className={cn(
                'flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors',
                controller.selectedSuggestion?.type === item.type && controller.selectedSuggestion?.index === item.index
                  ? 'bg-[#333] border-[#818cf8]/50'
                  : 'bg-[#1a1a1a] border-white/5 hover:border-white/10',
              )}
            >
              <span className="text-[10px] text-white/30 w-5 text-center">{listIndex + 1}</span>
              {roleDisplay && (
                <Badge className="text-[10px] px-1.5 py-0 border-0 shrink-0" style={{ backgroundColor: `${roleDisplay.color}20`, color: roleDisplay.color }}>
                  {roleDisplay.displayLabel}
                </Badge>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/80 truncate">{item.data.semanticName || item.data.label || item.data.id}</p>
                <p className="text-[10px] text-white/40 truncate">
                  {item.type === 'anchor' ? '单位' : item.type === 'doodad' ? '装饰物' : '手动'} · {item.data.regionHint}
                </p>
              </div>
              <div className="flex flex-col gap-0.5">
                <ReorderButton direction="up" disabled={isFirst} onClick={() => controller.moveConfirmedItem(item.type, item.index, 'up')} />
                <ReorderButton direction="down" disabled={isLast} onClick={() => controller.moveConfirmedItem(item.type, item.index, 'down')} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-white/30 mt-2">点击项目查看详情，使用箭头调整顺序</p>
    </div>
  );
}

function ReorderButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'up' | 'down';
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === 'up' ? ChevronUp : ChevronDown;

  return (
    <button
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className="p-0.5 rounded hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
    >
      <Icon className="h-3 w-3 text-white/50" />
    </button>
  );
}

function PromptBuilderSection({ controller, isMain }: SectionProps) {
  const fields = [
    ['商店交互模式', controller.shopInteractionMode, controller.setShopInteractionMode, 'open-shop-ui / grant-item / unlock-purchase'],
    ['目标玩家', controller.targetPlayers, controller.setTargetPlayers, 'all-players / player-1 / owner-only'],
    ['欢迎提示时长（秒）', controller.hintDurationSeconds, controller.setHintDurationSeconds, '5'],
    ['显式提示文案', controller.explicitHintText, controller.setExplicitHintText, 'Welcome to the mid zone!'],
    ['商店对象 ID / 代理单位 ID', controller.shopObjectId, controller.setShopObjectId, 'nmrk / hfoo / custom-shop-proxy'],
    ['商店目标模式', controller.shopTargetMode, controller.setShopTargetMode, 'unknown / existing-anchor / existing-unit-id / generated-proxy'],
    ['商店目标来源 ID', controller.shopTargetSourceId, controller.setShopTargetSourceId, 'central_shop_proxy / gg_unit_nmrk_0001'],
    ['商店解锁机制', controller.shopUnlockMechanism, controller.setShopUnlockMechanism, 'unknown / issue-order / enable-ability / custom-event'],
    ['商店命令模式', controller.shopOrderMode, controller.setShopOrderMode, 'unknown / target-order-by-id / neutral-target-order-by-id'],
    ['商店命令 ID', controller.shopOrderId, controller.setShopOrderId, '852566'],
    ['触发区域模式', controller.triggerAreaMode, controller.setTriggerAreaMode, 'unknown / existing-region / generated-radius / generated-rect'],
    ['触发区域来源 ID', controller.triggerAreaSourceId, controller.setTriggerAreaSourceId, 'gg_rct_mid_trigger_zone / editor-region-id'],
    ['触发区域半径', controller.triggerAreaRadius, controller.setTriggerAreaRadius, '256'],
    ['触发区域宽度', controller.triggerAreaWidth, controller.setTriggerAreaWidth, '512'],
    ['触发区域高度', controller.triggerAreaHeight, controller.setTriggerAreaHeight, '512'],
  ] as const;

  return (
    <div className={cn('bg-[#252525] rounded-lg border border-[#818cf8]/20', isMain ? 'p-4' : 'p-3')}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-[#818cf8]" />
        <span className="text-sm font-medium text-white/70">Feature Prompt Builder</span>
        {controller.confirmedCount > 0 && (
          <Badge className="text-[10px] px-1.5 py-0 bg-[#818cf8]/20 text-[#818cf8] border-0 ml-auto">
            {controller.confirmedCount} 个已确认锚点
          </Badge>
        )}
      </div>

      <div className="mb-3">
        <p className="text-[10px] text-white/40 mb-1.5">描述你想实现的功能</p>
        <Textarea
          value={controller.featureDescription}
          onChange={(event) => controller.setFeatureDescription(event.target.value)}
          placeholder="例如：在地图中央创建一个商店区域，玩家可以在这里购买装备..."
          className={cn(
            'bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 resize-none',
            isMain ? 'min-h-[80px] text-sm' : 'min-h-[60px] text-xs',
          )}
        />
      </div>

      <div className="mb-3">
        <p className="text-[10px] text-white/40 mb-1.5">补充输入</p>
        <div className={cn('grid gap-2', isMain ? 'grid-cols-2' : 'grid-cols-1')}>
          {fields.map(([label, value, setValue, placeholder]) => (
            <div key={label}>
              <p className="text-[10px] text-white/30 mb-1">{label}</p>
              <Input
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={placeholder}
                className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 h-8 text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] text-white/40 mb-1.5">生成的完整 Prompt</p>
        {controller.featurePrompt ? (
          <Textarea value={controller.featurePrompt} readOnly className={cn('bg-[#1a1a1a] border-white/10 text-white/80 font-mono resize-none', isMain ? 'min-h-[140px] text-xs' : 'min-h-[100px] text-[10px]')} />
        ) : (
          <div className="rounded bg-[#1a1a1a] border border-white/5 px-3 py-6 text-center">
            <p className="text-white/40 text-xs">
              {controller.confirmedCount > 0 ? '输入功能描述以生成完整 Prompt' : '确认锚点后，输入功能描述以生成 Prompt'}
            </p>
          </div>
        )}
      </div>

      {(controller.featurePrompt || controller.intakeArtifactText) && <HandoffSection controller={controller} isMain={isMain} />}
    </div>
  );
}

function HandoffSection({ controller, isMain }: SectionProps) {
  return (
    <div className="mt-4 pt-4 border-t border-white/10">
      <div className="flex items-center gap-2 mb-3">
        <ArrowRight className="h-4 w-4 text-[#22c55e]" />
        <span className="text-sm font-medium text-white/70">下一步入口</span>
      </div>

      <div className="bg-[#1a1a1a] rounded-lg border border-[#22c55e]/20 p-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <p className="text-xs text-white/80">
              {controller.handoffStats.total} 个已确认锚点
              {controller.handoffStats.keyRoles.length > 0 && (
                <span className="text-white/50"> · 包含 {controller.handoffStats.keyRoles.join('、')} 等关键角色</span>
              )}
            </p>
            {(controller.mapSummary?.name || controller.mapSummary?.tileset || controller.mapSummary?.scriptType !== undefined) && (
              <p className="text-[10px] text-white/45 mt-1">
                {controller.mapSummary?.name || '未命名地图'}
                {controller.mapSummary?.tileset ? ` · Tileset ${controller.mapSummary.tileset}` : ''}
                {controller.mapSummary?.scriptType !== undefined ? ` · ${controller.mapSummary.scriptType === 1 ? 'Lua' : 'Jass'}` : ''}
              </p>
            )}
          </div>
        </div>

        {controller.featurePrompt && (
          <div className="mb-3">
            <p className="text-[10px] text-white/40 mb-1.5">Prompt 预览</p>
            <div className="bg-[#252525] rounded border border-white/5 p-2 max-h-24 overflow-y-auto">
              <pre className="text-[10px] text-white/60 font-mono whitespace-pre-wrap">
                {controller.featurePrompt.slice(0, 200)}
                {controller.featurePrompt.length > 200 ? '...' : ''}
              </pre>
            </div>
          </div>
        )}

        {controller.intakeArtifactText && <ArtifactBlock title="Intake Artifact" badge="war3-intake/v1" value={controller.intakeArtifactText} minHeight={isMain ? 'min-h-[220px]' : 'min-h-[160px]'} />}
        {controller.handoffPreview && <ArtifactBlock title="LLM Handoff Bundle" badge={controller.handoffPreview.schemaVersion} tone="success" value={controller.handoffBundleText} minHeight={isMain ? 'min-h-[240px]' : 'min-h-[180px]'} />}
        {controller.skeletonPreview && <ArtifactBlock title="War3 Skeleton Preview" badge={controller.skeletonPreview.schemaVersion} tone="warning" value={controller.skeletonPreviewText} minHeight={isMain ? 'min-h-[220px]' : 'min-h-[160px]'} />}

        {controller.bridgePreview && <BridgePreviewSection controller={controller} />}
        {controller.sidecarPreview && <SidecarPreviewSection controller={controller} />}
        {controller.writePreviewArtifact && <WritePreviewSection controller={controller} />}

        {controller.handoffPreviewError && <ErrorBlock message={controller.handoffPreviewError} />}
        {controller.skeletonPreviewError && <ErrorBlock message={controller.skeletonPreviewError} />}

        <div className="flex gap-2 flex-wrap">
          {controller.featurePrompt && <CopyButton status={controller.copyStatus} idleLabel="复制 Prompt" copiedLabel="已复制 Prompt" errorLabel="Prompt 复制失败" onClick={controller.handleCopyHandoff} tone="primary" />}
          {controller.intakeArtifactText && <CopyButton status={controller.artifactCopyStatus} idleLabel="复制 Artifact" copiedLabel="已复制 Artifact" errorLabel="Artifact 复制失败" onClick={controller.handleCopyArtifact} />}
          {controller.intakeArtifactText && (
            <Button onClick={controller.handleGenerateHandoffPreview} disabled={controller.handoffPreviewLoading} className="flex-1 text-xs h-8 bg-[#22c55e]/15 hover:bg-[#22c55e]/25 text-[#22c55e]">
              {controller.handoffPreviewLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> 生成 Bundle...
                </>
              ) : (
                <>
                  <ArrowRight className="h-3.5 w-3.5 mr-1.5" /> 生成 LLM Bundle
                </>
              )}
            </Button>
          )}
          {controller.handoffBundleText && <CopyButton status={controller.handoffBundleCopyStatus} idleLabel="复制 Bundle" copiedLabel="已复制 Bundle" errorLabel="Bundle 复制失败" onClick={controller.handleCopyHandoffBundle} />}
          {controller.intakeArtifactText && (
            <Button onClick={controller.handleGenerateSkeletonPreview} disabled={controller.skeletonPreviewLoading} className="flex-1 text-xs h-8 bg-[#f59e0b]/15 hover:bg-[#f59e0b]/25 text-[#f59e0b]">
              {controller.skeletonPreviewLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> 生成 Skeleton...
                </>
              ) : (
                <>
                  <ArrowRight className="h-3.5 w-3.5 mr-1.5" /> 生成 Skeleton Preview
                </>
              )}
            </Button>
          )}
          {controller.skeletonPreviewText && <CopyButton status={controller.skeletonCopyStatus} idleLabel="复制 Skeleton" copiedLabel="已复制 Skeleton" errorLabel="Skeleton 复制失败" onClick={controller.handleCopySkeletonPreview} />}
        </div>
      </div>
    </div>
  );
}

function ArtifactBlock({
  title,
  badge,
  value,
  minHeight,
  tone = 'neutral',
}: {
  title: string;
  badge: string;
  value: string;
  minHeight: string;
  tone?: 'neutral' | 'success' | 'warning';
}) {
  const badgeClassName =
    tone === 'success'
      ? 'bg-[#22c55e]/15 text-[#22c55e]'
      : tone === 'warning'
        ? 'bg-[#f59e0b]/15 text-[#f59e0b]'
        : 'bg-white/10 text-white/60';

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-[10px] text-white/40">{title}</p>
        <Badge className={cn('text-[10px] px-1.5 py-0 border-0', badgeClassName)}>{badge}</Badge>
      </div>
      <Textarea value={value} readOnly className={cn('bg-[#252525] border-white/5 text-white/70 font-mono resize-none text-[10px]', minHeight)} />
    </div>
  );
}

function BridgePreviewSection({ controller }: { controller: War3AnchorPanelController }) {
  const preview = controller.bridgePreview;
  if (!preview) {
    return null;
  }

  return (
    <div className="mb-3 rounded-lg border border-[#818cf8]/20 bg-[#818cf8]/8 px-3 py-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <p className="text-[10px] text-white/40">War3 Bridge Preview</p>
          <p className="text-[11px] text-white/70 mt-0.5">{preview.sliceKind} {' to '} intent / host binding</p>
        </div>
        <Badge className="text-[10px] px-1.5 py-0 bg-[#818cf8]/15 text-[#818cf8] border-0">{preview.schemaVersion}</Badge>
      </div>

      <InfoCard
        title="Intent"
        lines={[preview.intentSchema.request.goal]}
        badges={[
          preview.intentSchema.classification.intentKind,
          preview.intentSchema.classification.confidence,
          ...controller.bridgeMechanics,
        ].filter(Boolean) as string[]}
      />

      <div className="grid gap-2 mb-2 mt-2 md:grid-cols-3">
        <InfoCard title="Trigger Area" lines={[`mode: ${preview.hostBinding.triggerArea.mode}`, `anchor: ${preview.hostBinding.triggerArea.sourceAnchorSemanticName || 'unknown'}`, `radius: ${preview.hostBinding.triggerArea.radius}`]} footer={preview.hostBinding.triggerArea.rectMaterialization} />
        <InfoCard title="Shop Target" lines={[`mode: ${preview.hostBinding.shopTarget.mode}`, `anchor: ${preview.hostBinding.shopTarget.sourceAnchorSemanticName || 'unknown'}`, `symbol: ${preview.hostBinding.shopTarget.bindingSymbol || 'unknown'}`]} footer={`shopObjectId: ${preview.hostBinding.shopTarget.shopObjectId || 'unknown'}`} />
        <InfoCard title="Shop Action" lines={[`unlock: ${preview.hostBinding.shopAction.unlockMechanism}`, `order mode: ${preview.hostBinding.shopAction.orderMode}`, `order id: ${preview.hostBinding.shopAction.orderId ?? 'unknown'}`]} />
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <BridgeListCard title="Warnings" items={preview.warnings} emptyLabel="no warnings" tone="warning" />
        <BridgeListCard title="Blockers" items={preview.blockers} emptyLabel="no blockers" tone="error" />
        <BridgeListCard title="Unresolved Bindings" items={preview.hostBinding.unresolvedBindings} emptyLabel="no unresolved bindings" tone="neutral" />
      </div>
    </div>
  );
}

function SidecarPreviewSection({ controller }: { controller: War3AnchorPanelController }) {
  const preview = controller.sidecarPreview;
  if (!preview) {
    return null;
  }

  return (
    <div className="mb-3 rounded-lg border border-[#22c55e]/20 bg-[#22c55e]/8 px-3 py-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <p className="text-[10px] text-white/40">War3 Assembly Sidecar</p>
          <p className="text-[11px] text-white/70 mt-0.5">blueprint: {preview.sourceBlueprintId}</p>
        </div>
        <Badge className="text-[10px] px-1.5 py-0 bg-[#22c55e]/15 text-[#22c55e] border-0">{preview.schemaVersion}</Badge>
      </div>
      <div className="grid gap-2 mb-2 md:grid-cols-2">
        <InfoCard title="Trigger Semantics" lines={[`mode: ${preview.triggerSemantics.mode}`, `source: ${preview.triggerSemantics.source}`, `anchor: ${preview.triggerSemantics.sourceAnchorSemanticName || 'unknown'}`, `center: ${preview.triggerSemantics.centerX}, ${preview.triggerSemantics.centerY}`]} footer={`radius: ${preview.triggerSemantics.radius} / filter: ${preview.triggerSemantics.playerFilter}`} />
        <InfoCard title="Effect Semantics" lines={[`mode: ${preview.effectSemantics.mode}`, `target: ${preview.effectSemantics.targetAnchorSemanticName || 'unknown'}`, `symbol: ${preview.effectSemantics.targetBindingSymbol || 'unknown'}`, `order: ${preview.effectSemantics.orderMode} / ${preview.effectSemantics.orderId ?? 'unknown'}`]} footer={`hint: ${preview.effectSemantics.hintText} (${preview.effectSemantics.hintDurationSeconds}s)`} />
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <BridgeListCard title="Write Targets" items={preview.writeTargets.map((item) => `${item.target}: ${item.pathHint}`)} emptyLabel="no write target hints" tone="neutral" />
        <BridgeListCard title="Bridge Updates" items={preview.bridgeUpdates.map((item) => `${item.action}: ${item.pathHint}`)} emptyLabel="no bridge update hints" tone="neutral" />
        <BridgeListCard title="Unresolved Bindings" items={preview.unresolvedHostBindings} emptyLabel="no unresolved bindings" tone="warning" />
      </div>
    </div>
  );
}

function WritePreviewSection({ controller }: { controller: War3AnchorPanelController }) {
  const preview = controller.writePreviewArtifact;
  if (!preview) {
    return null;
  }

  return (
    <div className="mb-3 rounded-lg border border-white/10 bg-white/5 px-3 py-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <p className="text-[10px] text-white/40">War3 Write Preview Artifact</p>
          <p className="text-[11px] text-white/70 mt-0.5">{preview.summary.sliceKind} / {preview.summary.blueprintId}</p>
        </div>
        <Badge className="text-[10px] px-1.5 py-0 bg-white/10 text-white/80 border-0">{preview.schemaVersion}</Badge>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <InfoCard title="Summary" lines={[`symbol: ${preview.summary.targetBindingSymbol || 'unknown'}`, `unresolved: ${preview.summary.unresolvedBindingCount}`]} />
        <BridgeListCard title="Manifest Targets" items={preview.hostBindingManifest.writeTargets.map((item) => `${item.target}: ${item.pathHint}`)} emptyLabel="no manifest targets" tone="neutral" />
        <BridgeListCard title="Manifest Updates" items={preview.hostBindingManifest.bridgeUpdates.map((item) => `${item.action}: ${item.pathHint}`)} emptyLabel="no manifest updates" tone="neutral" />
      </div>
    </div>
  );
}

function InfoCard({
  title,
  lines,
  footer,
  badges = [],
}: {
  title: string;
  lines: string[];
  footer?: string;
  badges?: string[];
}) {
  return (
    <div className="rounded border border-white/6 bg-[#202020] px-2.5 py-2">
      <p className="text-[10px] text-white/40 mb-1">{title}</p>
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {badges.map((badge) => (
            <Badge key={`${title}-${badge}`} className="text-[10px] px-1.5 py-0 bg-white/10 text-white/70 border-0">
              {badge}
            </Badge>
          ))}
        </div>
      )}
      {lines.map((line, index) => (
        <p key={`${title}-${index}`} className="text-[11px] text-white/75 leading-relaxed">
          {line}
        </p>
      ))}
      {footer && <p className="text-[11px] text-white/55 mt-1">{footer}</p>}
    </div>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="mb-3 rounded border border-[#ef4444]/20 bg-[#ef4444]/10 px-3 py-2">
      <p className="text-[10px] text-[#ef4444]">{message}</p>
    </div>
  );
}

function CopyButton({
  status,
  idleLabel,
  copiedLabel,
  errorLabel,
  onClick,
  tone = 'neutral',
}: {
  status: 'idle' | 'copied' | 'error';
  idleLabel: string;
  copiedLabel: string;
  errorLabel: string;
  onClick: () => void;
  tone?: 'primary' | 'neutral';
}) {
  const className =
    status === 'copied'
      ? 'bg-[#22c55e] hover:bg-[#22c55e] text-white'
      : status === 'error'
        ? 'bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444]'
        : tone === 'primary'
          ? 'bg-[#818cf8] hover:bg-[#6366f1] text-white'
          : 'bg-white/10 hover:bg-white/15 text-white';

  return (
    <Button onClick={onClick} className={cn('flex-1 text-xs h-8', className)}>
      {status === 'copied' ? (
        <>
          <Check className="h-3.5 w-3.5 mr-1.5" /> {copiedLabel}
        </>
      ) : status === 'error' ? (
        <>
          <XCircle className="h-3.5 w-3.5 mr-1.5" /> {errorLabel}
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5 mr-1.5" /> {idleLabel}
        </>
      )}
    </Button>
  );
}

function ContextDraftSection({ controller, isMain }: SectionProps) {
  return (
    <div className={cn('bg-[#252525] rounded-lg border border-white/5', isMain ? 'p-4' : 'p-3')}>
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-white/50" />
        <span className="text-sm font-medium text-white/70">锚点上下文草稿</span>
        {controller.confirmedCount > 0 && (
          <Badge className="text-[10px] px-1.5 py-0 bg-[#818cf8]/20 text-[#818cf8] border-0 ml-auto">
            {controller.confirmedCount} 个已确认
          </Badge>
        )}
      </div>
      {controller.contextDraft ? (
        <Textarea value={controller.contextDraft} readOnly className={cn('bg-[#1a1a1a] border-white/10 text-white/80 font-mono resize-none', isMain ? 'min-h-[100px] text-xs' : 'min-h-[60px] text-[10px]')} />
      ) : (
        <div className="rounded bg-[#1a1a1a] border border-white/5 px-3 py-4 text-center">
          <p className="text-white/40 text-xs">暂无已确认的锚点</p>
          <p className="text-white/30 text-[10px] mt-1">确认锚点后将在此处生成上下文文本</p>
        </div>
      )}
    </div>
  );
}

function OverviewSection({ controller, isMain }: SectionProps) {
  return (
    <div className={cn('bg-[#252525] rounded-lg border border-white/5', isMain ? 'p-4' : 'p-3')}>
      <div className="flex items-center gap-2 mb-3">
        <Box className="h-4 w-4 text-white/50" />
        <span className="text-sm font-medium text-white/70">地图概览</span>
      </div>
      <div className={cn('grid gap-4', isMain ? 'grid-cols-4' : 'grid-cols-2 gap-2')}>
        <StatBlock label="尺寸" value={`${controller.canvasHint?.width} × ${controller.canvasHint?.height}`} />
        <StatBlock label="偏移" value={`(${controller.canvasHint?.offsetX}, ${controller.canvasHint?.offsetY})`} />
        <StatBlock label="总建议" value={String(controller.totalSuggestions)} />
        <StatBlock label="已确认" value={String(controller.confirmedCount)} valueClassName={controller.confirmedCount > 0 ? 'text-[#22c55e]' : 'text-white/80'} />
      </div>
    </div>
  );
}

function StatBlock({
  label,
  value,
  valueClassName = 'text-white/80',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">{label}</p>
      <p className={cn('text-sm font-mono', valueClassName)}>{value}</p>
    </div>
  );
}

function ManualAnchorsSection({ controller, isMain }: SectionProps) {
  return (
    <div className={cn('bg-[#252525] rounded-lg border border-white/5', isMain ? 'p-4' : 'p-3')}>
      <div className="flex items-center gap-2 mb-3">
        <MousePointer2 className="h-4 w-4 text-[#a855f7]" />
        <span className="text-sm font-medium text-white/70">手动锚点 ({controller.manualAnchors.length})</span>
      </div>
      <div className="space-y-2">
        {controller.manualAnchors.map((anchor, index) => (
          <ManualAnchorCard
            key={anchor.id}
            anchor={anchor}
            selected={controller.selectedSuggestion?.type === 'manual' && controller.selectedSuggestion.index === index}
            onSemanticNameChange={(name) => controller.updateManualAnchorSemanticName(index, name)}
            onConfirm={() => controller.confirmManualAnchor(index)}
            onUnconfirm={() => controller.unconfirmManualAnchor(index)}
            onSelect={() => controller.handleSelectManualAnchor(index)}
            onRemove={() => controller.removeManualAnchor(index)}
            compact={!isMain}
          />
        ))}
      </div>
    </div>
  );
}

function SuggestionsSection({ controller, isMain }: SectionProps) {
  return (
    <div className={cn('grid gap-4', isMain ? 'grid-cols-2' : 'grid-cols-1')}>
      {controller.anchorSuggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Anchor className="h-4 w-4 text-[#22c55e]" />
            <span className="text-sm font-medium text-white/70">单位锚点 ({controller.anchorSuggestions.length})</span>
          </div>
          <div className="space-y-2">
            {controller.anchorSuggestions.map((suggestion, index) => (
              <SuggestionCard
                key={`anchor-${index}`}
                suggestion={suggestion}
                semanticName={suggestion.semanticName}
                confirmed={suggestion.confirmed}
                selected={controller.selectedSuggestion?.type === 'anchor' && controller.selectedSuggestion.index === index}
                onSemanticNameChange={(name) => controller.updateAnchorSemanticName(index, name)}
                onConfirm={() => controller.confirmAnchor(index)}
                onUnconfirm={() => controller.unconfirmAnchor(index)}
                onSelect={() => controller.handleSelectAnchor(index)}
                showOwner
                compact={!isMain}
              />
            ))}
          </div>
        </div>
      )}
      {controller.doodadSuggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Box className="h-4 w-4 text-[#f59e0b]" />
            <span className="text-sm font-medium text-white/70">装饰物地标 ({controller.doodadSuggestions.length})</span>
          </div>
          <div className="space-y-2">
            {controller.doodadSuggestions.map((suggestion, index) => (
              <SuggestionCard
                key={`doodad-${index}`}
                suggestion={suggestion}
                semanticName={suggestion.semanticName}
                confirmed={suggestion.confirmed}
                selected={controller.selectedSuggestion?.type === 'doodad' && controller.selectedSuggestion.index === index}
                onSemanticNameChange={(name) => controller.updateDoodadSemanticName(index, name)}
                onConfirm={() => controller.confirmDoodad(index)}
                onUnconfirm={() => controller.unconfirmDoodad(index)}
                onSelect={() => controller.handleSelectDoodad(index)}
                compact={!isMain}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IssuesSection({ controller }: { controller: War3AnchorPanelController }) {
  return (
    <div className="bg-[#f59e0b]/10 rounded-lg p-3 border border-[#f59e0b]/20">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-[#f59e0b]">注意</span>
      </div>
      <ul className="space-y-1">
        {controller.issues.map((issue, index) => (
          <li key={index} className="text-xs text-white/50">
            • {issue}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({ isMain }: { isMain: boolean }) {
  return (
    <div className={cn('text-center', isMain ? 'py-16' : 'py-8')}>
      <div className={cn('rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4', isMain ? 'w-20 h-20' : 'w-16 h-16')}>
        <Compass className={cn('text-white/20', isMain ? 'h-10 w-10' : 'h-8 w-8')} />
      </div>
      <p className={cn('text-white/50 mb-2', isMain ? 'text-base' : 'text-xs')}>输入地图目录路径并点击"加载锚点"</p>
      <p className={cn('text-white/30', isMain ? 'text-sm' : 'text-[10px]')}>系统将解析 War3 地图中的单位和装饰物数据</p>
    </div>
  );
}

function MapPreview({
  canvasHint,
  anchorSuggestions,
  doodadSuggestions,
  manualAnchors,
  selectedSuggestion,
  onSelectAnchor,
  onSelectDoodad,
  onSelectManual,
  onMapClick,
  isManualAnchorMode,
  compact = false,
}: {
  canvasHint: War3AnchorPanelController['canvasHint'];
  anchorSuggestions: ConfirmedAnchor[];
  doodadSuggestions: ConfirmedLandmark[];
  manualAnchors: ConfirmedAnchor[];
  selectedSuggestion: War3AnchorPanelController['selectedSuggestion'];
  onSelectAnchor: (index: number) => void;
  onSelectDoodad: (index: number) => void;
  onSelectManual: (index: number) => void;
  onMapClick: (x: number, y: number) => void;
  isManualAnchorMode: boolean;
  compact?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapWidth = canvasHint ? canvasHint.width * 128 : 512;
  const mapHeight = canvasHint ? canvasHint.height * 128 : 512;
  const minX = canvasHint?.offsetX ?? 0;
  const minY = canvasHint?.offsetY ?? 0;
  const hasValidHint = canvasHint !== null;

  const worldToPercent = (x: number, y: number) => ({
    x: Math.max(0, Math.min(100, ((x - minX) / mapWidth) * 100)),
    y: Math.max(0, Math.min(100, ((y - minY) / mapHeight) * 100)),
  });

  const handleContainerClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!isManualAnchorMode || !containerRef.current || !hasValidHint) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * 100;
    const py = ((event.clientY - rect.top) / rect.height) * 100;
    onMapClick((px / 100) * mapWidth + minX, (py / 100) * mapHeight + minY);
  };

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className={cn('relative bg-[#1a1a1a] rounded border border-white/10 overflow-hidden', isManualAnchorMode && hasValidHint && 'cursor-crosshair', compact ? 'h-40' : 'h-64')}
    >
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20% 20%',
        }}
      />
      {isManualAnchorMode && hasValidHint && <div className="absolute top-2 left-2 bg-[#a855f7]/90 text-white text-[10px] px-2 py-1 rounded z-10">点击地图添加锚点</div>}
      {!hasValidHint && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white/30 text-xs">无地图尺寸信息</span>
        </div>
      )}

      {anchorSuggestions.map((suggestion, index) => (
        <MapPoint key={`map-anchor-${index}`} position={worldToPercent(suggestion.x, suggestion.y)} selected={selectedSuggestion?.type === 'anchor' && selectedSuggestion.index === index} tone={suggestion.confirmed ? 'bg-[#22c55e]' : 'bg-[#22c55e]/60'} shadow="shadow-[#22c55e]/50" title={`${suggestion.label || suggestion.id} (${suggestion.x.toFixed(0)}, ${suggestion.y.toFixed(0)})`} onClick={() => onSelectAnchor(index)} />
      ))}
      {doodadSuggestions.map((suggestion, index) => (
        <MapPoint key={`map-doodad-${index}`} position={worldToPercent(suggestion.x, suggestion.y)} selected={selectedSuggestion?.type === 'doodad' && selectedSuggestion.index === index} tone={suggestion.confirmed ? 'bg-[#f59e0b]' : 'bg-[#f59e0b]/60'} shadow="shadow-[#f59e0b]/50" title={`${suggestion.label || suggestion.id} (${suggestion.x.toFixed(0)}, ${suggestion.y.toFixed(0)})`} onClick={() => onSelectDoodad(index)} style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
      ))}
      {manualAnchors.map((anchor, index) => (
        <MapPoint key={`map-manual-${anchor.id}`} position={worldToPercent(anchor.x, anchor.y)} selected={selectedSuggestion?.type === 'manual' && selectedSuggestion.index === index} tone={anchor.confirmed ? 'bg-[#a855f7]' : 'bg-[#a855f7]/60'} shadow="shadow-[#a855f7]/50" title={`${anchor.semanticName || anchor.label} (${anchor.x.toFixed(0)}, ${anchor.y.toFixed(0)})`} onClick={() => onSelectManual(index)} />
      ))}
    </div>
  );
}

function MapPoint({
  position,
  selected,
  tone,
  shadow,
  title,
  onClick,
  style,
}: {
  position: { x: number; y: number };
  selected: boolean;
  tone: string;
  shadow: string;
  title: string;
  onClick: () => void;
  style?: CSSProperties;
}) {
  return (
    <button
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        'absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all',
        'hover:scale-125 focus:outline-none focus:ring-2 focus:ring-white/50',
        tone,
        selected && cn('ring-2 ring-white scale-125 shadow-lg', shadow),
      )}
      style={{ left: `${position.x}%`, top: `${position.y}%`, ...style }}
      title={title}
    />
  );
}

function BridgeListCard({
  title,
  items,
  emptyLabel,
  tone,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
  tone: 'neutral' | 'warning' | 'error';
}) {
  const toneClassName = tone === 'error' ? 'border-[#ef4444]/20 bg-[#ef4444]/8' : tone === 'warning' ? 'border-[#f59e0b]/20 bg-[#f59e0b]/8' : 'border-white/6 bg-[#202020]';
  const textClassName = tone === 'error' ? 'text-[#ef4444]' : tone === 'warning' ? 'text-[#f59e0b]' : 'text-white/70';

  return (
    <div className={cn('rounded border px-2.5 py-2', toneClassName)}>
      <p className="text-[10px] text-white/40 mb-1.5">{title}</p>
      {items.length > 0 ? (
        <div className="space-y-1">
          {items.map((item, index) => (
            <p key={`${title}-${index}`} className={cn('text-[11px] leading-relaxed', textClassName)}>
              {item}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-white/35">{emptyLabel}</p>
      )}
    </div>
  );
}

function SuggestionDetails({
  suggestion,
  onSemanticNameChange,
  onToggleConfirm,
  onRoleChange,
  onRoleLabelChange,
  compact = false,
}: {
  suggestion: SuggestionItem;
  onSemanticNameChange: (name: string) => void;
  onToggleConfirm: () => void;
  onRoleChange?: (role: AnchorRole) => void;
  onRoleLabelChange?: (label: string) => void;
  compact?: boolean;
}) {
  const isAnchor = 'owner' in suggestion;
  const isManual = suggestion.kind === 'manual';

  return (
    <div className="space-y-3">
      <div className={cn('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-3')}>
        <InfoGridCell label="ID" value={suggestion.id} mono />
        <InfoGridCell label="类型" value={isManual ? '手动' : isAnchor ? '单位' : '装饰物'} />
        <InfoGridCell label="区域" value={suggestion.regionHint} />
        <InfoGridCell label="坐标" value={`${suggestion.x.toFixed(0)}, ${suggestion.y.toFixed(0)}, ${suggestion.z.toFixed(0)}`} mono />
        {isAnchor && suggestion.owner !== undefined && <InfoGridCell label="所有者" value={`P${suggestion.owner}`} />}
        <InfoGridCell label="标签" value={suggestion.label} className={compact ? 'col-span-2' : 'col-span-1'} />
      </div>

      {suggestion.confirmed && onRoleChange && (
        <div>
          <p className="text-[10px] text-white/40 mb-1.5">锚点角色</p>
          <div className={cn('flex flex-wrap gap-1.5', compact && 'max-h-16 overflow-y-auto')}>
            {ANCHOR_ROLES.map((role) => (
              <button
                key={role.value}
                onClick={() => onRoleChange(role.value)}
                className={cn(
                  'px-2 py-1 rounded text-[10px] transition-colors border',
                  suggestion.anchorRole === role.value ? 'text-white' : 'bg-transparent text-white/50 border-white/10 hover:border-white/20',
                )}
                style={{
                  backgroundColor: suggestion.anchorRole === role.value ? `${role.color}30` : undefined,
                  borderColor: suggestion.anchorRole === role.value ? role.color : undefined,
                  color: suggestion.anchorRole === role.value ? role.color : undefined,
                }}
              >
                {role.label}
              </button>
            ))}
          </div>

          {suggestion.anchorRole === 'custom' && onRoleLabelChange && (
            <div className="mt-2">
              <Input
                value={suggestion.roleLabel || ''}
                onChange={(event) => onRoleLabelChange(event.target.value)}
                placeholder="输入自定义角色名称..."
                className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 h-7 text-xs"
              />
            </div>
          )}
        </div>
      )}

      <InfoGridCell label="原因" value={suggestion.reason} valueClassName="text-xs text-white/50" />

      <div>
        <p className="text-[10px] text-white/40 mb-1">语义名称</p>
        <div className="flex gap-2">
          <Input
            value={suggestion.semanticName}
            onChange={(event) => onSemanticNameChange(event.target.value)}
            placeholder="输入语义名称..."
            disabled={suggestion.confirmed}
            className="flex-1 bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 h-8 text-xs"
          />
          <Button
            onClick={onToggleConfirm}
            className={cn(
              'shrink-0 h-8 text-xs px-3',
              suggestion.confirmed
                ? 'bg-transparent border border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10'
                : 'bg-[#22c55e] hover:bg-[#16a34a] text-white',
            )}
          >
            {suggestion.confirmed ? (
              <>
                <XCircle className="h-3.5 w-3.5 mr-1" /> 取消
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> 确认
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoGridCell({
  label,
  value,
  className,
  mono = false,
  valueClassName,
}: {
  label: string;
  value: string;
  className?: string;
  mono?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className={cn('bg-[#1a1a1a] rounded px-2 py-1.5', className)}>
      <p className="text-[10px] text-white/40">{label}</p>
      <p className={cn(valueClassName || 'text-xs text-white/70 truncate', mono && 'font-mono')}>{value}</p>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  semanticName,
  confirmed,
  selected = false,
  onSemanticNameChange,
  onConfirm,
  onUnconfirm,
  onSelect,
  showOwner,
  compact = false,
}: {
  suggestion: ConfirmedAnchor | ConfirmedLandmark;
  semanticName: string;
  confirmed: boolean;
  selected?: boolean;
  onSemanticNameChange: (name: string) => void;
  onConfirm: () => void;
  onUnconfirm: () => void;
  onSelect: () => void;
  showOwner?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className={cn('rounded-lg border transition-colors cursor-pointer', confirmed ? 'bg-[#22c55e]/10 border-[#22c55e]/30' : 'bg-[#252525] border-white/5', selected && 'ring-2 ring-[#818cf8]/50 border-[#818cf8]/30', compact ? 'p-3' : 'p-4')}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-mono text-white/80 truncate">{suggestion.id}</span>
            {confirmed && <Badge className="text-[10px] px-1 py-0 bg-[#22c55e]/20 text-[#22c55e] border-0">已确认</Badge>}
          </div>
          <Input
            value={semanticName}
            onChange={(event) => onSemanticNameChange(event.target.value)}
            placeholder="输入语义名称..."
            disabled={confirmed}
            onClick={(event) => event.stopPropagation()}
            className={cn('bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30', compact ? 'h-7 text-xs' : 'h-8 text-sm')}
          />
        </div>
      </div>
      <div className={cn('flex flex-wrap gap-x-4 gap-y-1 text-white/40 mb-2', compact ? 'text-[10px]' : 'text-xs')}>
        <span>区域: <span className="text-white/60">{suggestion.regionHint}</span></span>
        <span>坐标: <span className="text-white/60">{suggestion.x.toFixed(0)}, {suggestion.y.toFixed(0)}, {suggestion.z.toFixed(0)}</span></span>
        {showOwner && 'owner' in suggestion && suggestion.owner !== undefined && <span>所有者: <span className="text-white/60">P{suggestion.owner}</span></span>}
      </div>
      <div className={cn('text-white/30 mb-3', compact ? 'text-[10px]' : 'text-xs')}>原因: {suggestion.reason}</div>
      <Button
        onClick={(event) => {
          event.stopPropagation();
          if (confirmed) {
            onUnconfirm();
          } else {
            onConfirm();
          }
        }}
        className={cn('w-full text-xs', confirmed ? 'bg-transparent border border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/10' : 'bg-[#818cf8] hover:bg-[#6366f1] text-white', compact ? 'h-7' : 'h-8')}
      >
        {confirmed ? '取消确认' : '确认锚点'}
      </Button>
    </div>
  );
}

function ManualAnchorCard({
  anchor,
  selected = false,
  onSemanticNameChange,
  onConfirm,
  onUnconfirm,
  onSelect,
  onRemove,
  compact = false,
}: {
  anchor: ConfirmedAnchor;
  selected?: boolean;
  onSemanticNameChange: (name: string) => void;
  onConfirm: () => void;
  onUnconfirm: () => void;
  onSelect: () => void;
  onRemove: () => void;
  compact?: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className={cn('rounded-lg border transition-colors cursor-pointer', anchor.confirmed ? 'bg-[#a855f7]/10 border-[#a855f7]/30' : 'bg-[#252525] border-white/5', selected && 'ring-2 ring-[#a855f7]/50 border-[#a855f7]/30', compact ? 'p-3' : 'p-4')}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-mono text-white/80 truncate">{anchor.id}</span>
            {anchor.confirmed && <Badge className="text-[10px] px-1 py-0 bg-[#a855f7]/20 text-[#a855f7] border-0">已确认</Badge>}
          </div>
          <Input
            value={anchor.semanticName}
            onChange={(event) => onSemanticNameChange(event.target.value)}
            placeholder="输入语义名称..."
            disabled={anchor.confirmed}
            onClick={(event) => event.stopPropagation()}
            className={cn('bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30', compact ? 'h-7 text-xs' : 'h-8 text-sm')}
          />
        </div>
      </div>
      <div className={cn('flex flex-wrap gap-x-4 gap-y-1 text-white/40 mb-2', compact ? 'text-[10px]' : 'text-xs')}>
        <span>区域: <span className="text-white/60">{anchor.regionHint}</span></span>
        <span>坐标: <span className="text-white/60">{anchor.x.toFixed(0)}, {anchor.y.toFixed(0)}, {anchor.z.toFixed(0)}</span></span>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={(event) => {
            event.stopPropagation();
            if (anchor.confirmed) {
              onUnconfirm();
            } else {
              onConfirm();
            }
          }}
          className={cn('flex-1 text-xs', anchor.confirmed ? 'bg-transparent border border-[#a855f7]/30 text-[#a855f7] hover:bg-[#a855f7]/10' : 'bg-[#a855f7] hover:bg-[#9333ea] text-white', compact ? 'h-7' : 'h-8')}
        >
          {anchor.confirmed ? '取消确认' : '确认锚点'}
        </Button>
        <Button
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className={cn('bg-transparent border border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10 text-xs', compact ? 'h-7 px-2' : 'h-8 px-3')}
        >
          删除
        </Button>
      </div>
    </div>
  );
}

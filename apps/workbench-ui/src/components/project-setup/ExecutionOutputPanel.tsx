/**
 * ExecutionOutputPanel - CLI 执行输出面板
 * 
 * 展示 CLI 实时输出（stdout/stderr）、执行结果和 artifact 摘要
 */

import { useState, useRef, useEffect } from 'react';
import { 
  Terminal, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Trash2,
  Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { ExecutionStatus, CLIExecutionResult } from '@/hooks/useCLIExecutor';

// 组件属性
export interface ExecutionOutputPanelProps {
  // 执行状态
  isRunning: boolean;
  status: ExecutionStatus;
  
  // 输出和结果
  output: string[];
  result: CLIExecutionResult | null;
  error: string | null;
  
  // 可选配置
  className?: string;
  maxHeight?: string;
  showArtifactSummary?: boolean;
  
  // 回调
  onClear?: () => void;
}

/**
 * 执行输出面板组件
 * 
 * 展示 CLI 执行过程中的实时输出、执行结果和 artifact 摘要
 */
export function ExecutionOutputPanel({
  isRunning,
  status,
  output,
  result,
  error,
  className,
  maxHeight = '300px',
  showArtifactSummary = true,
  onClear,
}: ExecutionOutputPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showTimestamp, setShowTimestamp] = useState(false);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const outputContainerRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (isExpanded && outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output, isExpanded]);

  // 如果没有输出且不正在运行，不显示面板
  if (output.length === 0 && !isRunning && !result && !error) {
    return null;
  }

  // 状态配置
  const statusConfig = {
    idle: { icon: Terminal, color: 'text-white/40', bg: 'bg-white/5', label: '就绪' },
    running: { icon: Loader2, color: 'text-[#6366f1]', bg: 'bg-[#6366f1]/10', label: '执行中' },
    success: { icon: CheckCircle2, color: 'text-[#238636]', bg: 'bg-[#238636]/10', label: '成功' },
    failure: { icon: XCircle, color: 'text-[#da3633]', bg: 'bg-[#da3633]/10', label: '失败' },
  };

  const { icon: StatusIcon, color: statusColor, bg: statusBg, label: statusLabel } = statusConfig[status];

  // 复制输出到剪贴板
  const handleCopy = () => {
    const text = output.join('\n');
    navigator.clipboard.writeText(text);
  };

  // 解析 artifact 路径
  const artifactPath = result?.artifactPath;
  const review = result?.review;
  const reviewStatusColor =
    review?.status === 'success'
      ? 'text-[#238636]'
      : review?.status === 'failure'
        ? 'text-[#da3633]'
        : review?.status === 'warning'
          ? 'text-[#9e6a03]'
          : 'text-[#6366f1]';

  return (
    <div
      className={cn('border border-white/10 rounded bg-[#0d1117]', className)}
      data-testid="execution-output-panel"
    >
      {/* 面板头部 */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="w-full">
          <div className={cn('flex items-center gap-2 px-3 py-2 rounded-t', statusBg)}>
            <StatusIcon className={cn('h-4 w-4', statusColor, status === 'running' && 'animate-spin')} />
            <span className={cn('text-xs font-medium', statusColor)}>
              {isRunning ? '执行中...' : statusLabel}
            </span>
            
            {/* 统计信息 */}
            {output.length > 0 && (
              <span className="text-[10px] text-white/40 ml-2">
                {output.length} 行
              </span>
            )}
            
            {/* Artifact 链接 */}
            {artifactPath && showArtifactSummary && (
              <Badge 
                variant="outline" 
                className="ml-2 text-[9px] border-[#6366f1]/30 text-[#6366f1]/70 bg-transparent"
              >
                <FileText className="h-3 w-3 mr-1" />
                产物
              </Badge>
            )}
            
            <div className="ml-auto flex items-center gap-1">
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-white/40" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-white/40" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          {/* 工具栏 */}
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/5 bg-[#161b22]">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-white/40 hover:text-white/60"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTimestamp(!showTimestamp);
                }}
              >
                {showTimestamp ? '隐藏时间' : '显示时间'}
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-white/40 hover:text-white/60"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
                title="复制输出"
              >
                <Copy className="h-3 w-3" />
              </Button>
              {onClear && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-white/40 hover:text-white/60"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  title="清空输出"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* 输出内容 */}
          <div
            ref={outputContainerRef}
            data-testid="execution-output-lines"
            className="font-mono text-[11px] leading-relaxed overflow-auto p-3 bg-[#0d1117]"
            style={{ maxHeight }}
          >
            {output.length === 0 && isRunning && (
              <div className="text-white/30 italic">开始执行...</div>
            )}
            
            {output.map((line, index) => (
              <div key={index} className="flex gap-2">
                {showTimestamp && (
                  <span className="text-white/20 select-none shrink-0">
                    {new Date().toLocaleTimeString('en-US', { 
                      hour12: false, 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      second: '2-digit' 
                    })}
                  </span>
                )}
                <span 
                  className={cn(
                    'break-all',
                    line.startsWith('Error:') || line.startsWith('❌') ? 'text-[#da3633]' :
                    line.startsWith('✅') ? 'text-[#238636]' :
                    line.startsWith('⚠️') || line.startsWith('Warning:') ? 'text-[#9e6a03]' :
                    line.startsWith('ℹ️') || line.startsWith('Info:') ? 'text-[#6366f1]' :
                    'text-white/70'
                  )}
                >
                  {line}
                </span>
              </div>
            ))}
            
            {isRunning && (
              <div className="flex items-center gap-2 mt-2 text-white/40">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-[10px]">等待更多输出...</span>
              </div>
            )}
            
            <div ref={outputEndRef} />
          </div>

          {/* 执行结果摘要 */}
          {result && showArtifactSummary && (
            <div className="border-t border-white/10 p-3 bg-[#161b22]">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-3.5 w-3.5 text-[#6366f1]" />
                <span className="text-[10px] text-white/50 uppercase tracking-wider">
                  执行结果
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="flex items-center gap-1.5" data-testid="execution-result-status">
                  <span className="text-white/40">状态：</span>
                  <span className={result.success ? 'text-[#238636]' : 'text-[#da3633]'}>
                    {result.success ? '成功' : '失败'}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5" data-testid="execution-result-exit-code">
                  <span className="text-white/40">退出码：</span>
                  <span className={result.exitCode === 0 ? 'text-[#238636]' : 'text-[#da3633]'}>
                    {result.exitCode}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 col-span-2" data-testid="execution-result-command">
                  <span className="text-white/40">命令：</span>
                  <code className="text-white/60 font-mono bg-white/5 px-1.5 py-0.5 rounded">
                    {result.command}
                  </code>
                </div>
                
                {artifactPath && (
                  <div className="flex items-center gap-1.5 col-span-2">
                    <span className="text-white/40">产物：</span>
                    <code className="text-[#6366f1]/80 font-mono text-[9px] truncate">
                      {artifactPath}
                    </code>
                  </div>
                )}
              </div>

              {result.error && (
                <div className="mt-2 p-2 rounded bg-[#da3633]/10 border border-[#da3633]/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-[#da3633] mt-0.5 flex-shrink-0" />
                    <span className="text-[10px] text-[#da3633]">{result.error}</span>
                  </div>
                </div>
              )}

              {review && (
                <div className="mt-3 space-y-3 rounded border border-white/10 bg-[#0d1117] p-3">
                  <div>
                    <p className="text-[10px] text-white/35 uppercase tracking-wider">Review Surface</p>
                    <p className={cn("mt-1 text-[12px] font-medium", reviewStatusColor)}>{review.title}</p>
                    <p className="mt-1 text-[11px] text-white/60">{review.summary}</p>
                  </div>

                  {review.highlights.length > 0 && (
                    <div>
                      <p className="text-[10px] text-white/35 uppercase tracking-wider">Highlights</p>
                      <ul className="mt-1 space-y-1">
                        {review.highlights.map((item) => (
                          <li key={item} className="text-[10px] text-white/65">
                            - {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {review.stages.length > 0 && (
                    <div>
                      <p className="text-[10px] text-white/35 uppercase tracking-wider">Stages</p>
                      <div className="mt-1 space-y-2">
                        {review.stages.map((stage) => (
                          <div key={stage.id} className="rounded border border-white/10 bg-white/[0.03] px-2.5 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] text-white/75">{stage.label}</p>
                              <span
                                className={cn(
                                  "text-[9px] uppercase tracking-wider",
                                  stage.status === 'success'
                                    ? 'text-[#238636]'
                                    : stage.status === 'failure'
                                      ? 'text-[#da3633]'
                                      : stage.status === 'warning'
                                        ? 'text-[#9e6a03]'
                                        : 'text-[#6366f1]'
                                )}
                              >
                                {stage.status}
                              </span>
                            </div>
                            <p className="mt-1 text-[10px] text-white/55">{stage.summary}</p>
                            {stage.details && stage.details.length > 0 && (
                              <ul className="mt-1 space-y-0.5">
                                {stage.details.map((detail) => (
                                  <li key={detail} className="text-[9px] text-white/40">
                                    - {detail}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {review.blockers.length > 0 && (
                    <div>
                      <p className="text-[10px] text-white/35 uppercase tracking-wider">Blockers</p>
                      <ul className="mt-1 space-y-1">
                        {review.blockers.map((blocker) => (
                          <li key={blocker} className="text-[10px] text-[#da3633]">
                            - {blocker}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {review.recommendedActions.length > 0 && (
                    <div>
                      <p className="text-[10px] text-white/35 uppercase tracking-wider">Next Actions</p>
                      <div className="mt-1 space-y-1.5">
                        {review.recommendedActions.map((action, index) => (
                          <div key={`${action.label}-${index}`} className="rounded border border-white/10 bg-white/[0.03] px-2 py-1.5">
                            <p className="text-[10px] text-white/70">{action.label}</p>
                            {action.command && (
                              <code className="mt-1 block break-all text-[9px] text-[#6366f1]/80">
                                {action.command}
                              </code>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 错误显示 */}
          {error && !result && (
            <div className="border-t border-white/10 p-3 bg-[#da3633]/5">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-[#da3633] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-[#da3633] font-medium">执行错误</p>
                  <p className="text-[10px] text-white/50 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default ExecutionOutputPanel;

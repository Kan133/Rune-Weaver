import { useState } from 'react';
import { X, Send, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFeatureStore } from '@/hooks/useFeatureStore';
import { motion, AnimatePresence } from 'framer-motion';

interface ExecuteAPIResponse {
  success: boolean;
  result?: {
    success: boolean;
    command: string;
    exitCode: number;
    output: string[];
    error?: string;
    artifactPath?: string;
    review?: {
      status?: 'success' | 'warning' | 'failure' | 'info';
      title: string;
      summary: string;
      blockers: string[];
      highlights: string[];
      recommendedActions: Array<{ label: string; command?: string }>;
    };
  };
  error?: string;
}

async function readErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      const data = (await response.json()) as ExecuteAPIResponse;
      return data.error || `HTTP error! status: ${response.status}`;
    } catch {
      return `HTTP error! status: ${response.status}`;
    }
  }

  try {
    const text = await response.text();
    return text.trim() || `HTTP error! status: ${response.status}`;
  } catch {
    return `HTTP error! status: ${response.status}`;
  }
}

function summarizeOutput(output: string[]): string[] {
  const important = output.filter((line) => {
    const trimmed = line.trim();
    return (
      trimmed.startsWith('Action Summary:') ||
      trimmed.startsWith('Reason:') ||
      trimmed.startsWith('Command:') ||
      trimmed.startsWith('Next Command:') ||
      trimmed.startsWith('Review Artifact:') ||
      trimmed.startsWith('Generated Files') ||
      trimmed.startsWith('Final Result:') ||
      trimmed.startsWith('Error:') ||
      trimmed.startsWith('❌') ||
      trimmed.startsWith('✅')
    );
  });

  if (important.length > 0) {
    return important.slice(-8);
  }

  return output.slice(-8);
}

function normalizePromptForCLI(prompt: string): string {
  return prompt
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function didWriteFeatureToHost(result: ExecuteAPIResponse['result'] | null): boolean {
  if (!result) {
    return false;
  }

  return result.success || result.review?.status === 'warning';
}

export function WizardDialog() {
  const wizard = useFeatureStore((state) => state.wizard);
  const closeWizard = useFeatureStore((state) => state.closeWizard);
  const addWizardMessage = useFeatureStore((state) => state.addWizardMessage);
  const setWizardStep = useFeatureStore((state) => state.setWizardStep);
  const setDraftFeature = useFeatureStore((state) => state.setDraftFeature);
  const connectedHostRoot = useFeatureStore((state) => state.connectedHostRoot);
  const hostConfig = useFeatureStore((state) => state.hostConfig);
  const reloadConnectedWorkspace = useFeatureStore((state) => state.reloadConnectedWorkspace);

  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!wizard.isActive) return null;

  const promptDraft =
    typeof wizard.draftFeature?.displayName === 'string' ? wizard.draftFeature.displayName : '';

  const handleSendMessage = async () => {
    if (isProcessing) return;

    if (wizard.currentStep === 'intent') {
      if (!inputValue.trim()) return;

      addWizardMessage({
        role: 'user',
        content: inputValue,
      });

      setDraftFeature({ displayName: normalizePromptForCLI(inputValue) });
      setInputValue('');

      if (!connectedHostRoot || !hostConfig.hostValid) {
        addWizardMessage({
          role: 'assistant',
          content:
            '当前还没有已连接的有效宿主。请先在左侧输入路径并点击“连接宿主”，再从这里创建 feature。',
        });
        return;
      }

      addWizardMessage({
        role: 'assistant',
        content: `我会把这段需求直接交给真实的 dota2 CLI 主链去生成并写入宿主。\n\n宿主：${connectedHostRoot}\n模式：write\n\n确认后我会开始生成。`,
      });
      setWizardStep('confirmation');
      return;
    }

    if (wizard.currentStep !== 'confirmation' || !promptDraft.trim()) {
      return;
    }

    setIsProcessing(true);
    addWizardMessage({
      role: 'system',
      content: '正在调用真实 CLI 主链生成 feature...',
    });
    setWizardStep('generating');

    try {
      const response = await fetch('/api/cli/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'run',
          hostRoot: connectedHostRoot,
          prompt: promptDraft,
          write: true,
          force: false,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffered = '';
      let resultPayload: ExecuteAPIResponse['result'] | null = null;
      const outputLines: string[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            buffered += decoder.decode();
            break;
          }

          buffered += decoder.decode(value, { stream: true });
          const lines = buffered.split('\n');
          buffered = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line) as
                | { type: 'output'; content: string }
                | { type: 'result'; result: NonNullable<ExecuteAPIResponse['result']> }
                | { type: 'error'; error: string };

              if (data.type === 'output') {
                outputLines.push(data.content);
              } else if (data.type === 'result') {
                resultPayload = data.result;
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch {
              outputLines.push(line);
            }
          }
        }
      }

      if (buffered.trim()) {
        try {
          const data = JSON.parse(buffered) as
            | { type: 'output'; content: string }
            | { type: 'result'; result: NonNullable<ExecuteAPIResponse['result']> }
            | { type: 'error'; error: string };

          if (data.type === 'output') {
            outputLines.push(data.content);
          } else if (data.type === 'result') {
            resultPayload = data.result;
          } else if (data.type === 'error') {
            throw new Error(data.error);
          }
        } catch {
          outputLines.push(buffered);
        }
      }

      if (!resultPayload) {
        throw new Error('CLI did not return a final result');
      }

      if (!didWriteFeatureToHost(resultPayload)) {
        const detail = summarizeOutput(resultPayload.output || outputLines).join('\n');
        const reviewBlock = resultPayload.review
          ? [
              resultPayload.review.title,
              resultPayload.review.summary,
              ...(resultPayload.review.blockers || []).slice(0, 3),
              ...(resultPayload.review.recommendedActions || [])
                .slice(0, 2)
                .map((action) => action.command ? `${action.label}: ${action.command}` : action.label),
            ].filter(Boolean).join('\n')
          : '';
        throw new Error(
          `${resultPayload.error || `CLI exited with code ${resultPayload.exitCode}`}${reviewBlock ? `\n\n${reviewBlock}` : ''}${detail ? `\n\n${detail}` : ''}`
        );
      }

      await reloadConnectedWorkspace(null);
      const reviewSummary = resultPayload.review
        ? [
            resultPayload.review.title,
            resultPayload.review.summary,
            ...(resultPayload.review.highlights || []).slice(0, 4),
            ...(resultPayload.review.recommendedActions || [])
              .slice(0, 2)
              .map((action) => action.command ? `${action.label}: ${action.command}` : action.label),
          ].filter(Boolean).join('\n')
        : summarizeOutput(outputLines).join('\n');
      const wroteWithFollowUp = !resultPayload.success && resultPayload.review?.status === 'warning';
      addWizardMessage({
        role: 'assistant',
        content: wroteWithFollowUp
          ? `⚠️ Feature 已写入宿主，但还需要后续处理。\n\n${reviewSummary}`
          : `✅ Feature 已写入宿主。\n\n${reviewSummary}`,
      });
      setDraftFeature(null);
      setWizardStep('intent');
      setInputValue('');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addWizardMessage({
        role: 'assistant',
        content: `❌ 生成失败。\n\n${message}`,
      });
      setWizardStep('confirmation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const getStepLabel = () => {
    switch (wizard.currentStep) {
      case 'intent':
        return '输入需求';
      case 'confirmation':
        return '确认写入';
      case 'generating':
        return '真实生成中';
      default:
        return '输入需求';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl h-[600px] bg-[#1e1e1e] rounded-xl border border-white/10 shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="h-14 bg-[#1a1a1a] border-b border-white/10 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#4f46e5] flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Rune Weaver Wizard</h2>
              <p className="text-xs text-white/40">{getStepLabel()}</p>
            </div>
          </div>
          <button
            onClick={closeWizard}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4 text-white/60" />
          </button>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <AnimatePresence>
              {wizard.messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex gap-3', message.role === 'user' ? 'flex-row-reverse' : '')}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      message.role === 'user'
                        ? 'bg-[#6366f1]'
                        : message.role === 'system'
                          ? 'bg-white/10'
                          : 'bg-gradient-to-br from-[#6366f1] to-[#4f46e5]'
                    )}
                  >
                    {message.role === 'user' ? (
                      <span className="text-xs text-white font-medium">U</span>
                    ) : message.role === 'system' ? (
                      <Loader2 className="h-4 w-4 text-white/60 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap',
                      message.role === 'user'
                        ? 'bg-[#6366f1] text-white rounded-br-md'
                        : message.role === 'system'
                          ? 'bg-white/5 text-white/60 rounded-bl-md'
                          : 'bg-[#252525] text-white/90 border border-white/5 rounded-bl-md'
                    )}
                  >
                    {message.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>

        <div className="p-4 bg-[#1a1a1a] border-t border-white/10">
          {wizard.currentStep === 'confirmation' ? (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="flex-1 bg-transparent border-white/10 text-white/70 hover:bg-white/5"
                onClick={() => setWizardStep('intent')}
                disabled={isProcessing}
              >
                返回编辑
              </Button>
              <Button
                className="flex-1 bg-[#6366f1] hover:bg-[#4f46e5] text-white"
                onClick={() => void handleSendMessage()}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    确认生成
                  </>
                )}
              </Button>
            </div>
          ) : wizard.currentStep === 'generating' ? (
            <div className="flex items-center justify-center py-3">
              <div className="flex items-center gap-2 text-white/50">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">正在调用真实 CLI 主链...</span>
              </div>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="描述你想要创建的功能，我会直接把它交给真实的 dota2 CLI 主链..."
                className="flex-1 min-h-[44px] max-h-[120px] bg-[#252525] border-white/10 text-white placeholder:text-white/40 resize-none"
                rows={1}
              />
              <Button
                size="icon"
                className="h-11 w-11 bg-[#6366f1] hover:bg-[#4f46e5] text-white flex-shrink-0"
                onClick={() => void handleSendMessage()}
                disabled={!inputValue.trim() || isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

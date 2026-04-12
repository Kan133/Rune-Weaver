import { useState } from 'react';
import { X, Send, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFeatureStore } from '@/hooks/useFeatureStore';
import { motion, AnimatePresence } from 'framer-motion';

export function WizardDialog() {
  const wizard = useFeatureStore((state) => state.wizard);
  const closeWizard = useFeatureStore((state) => state.closeWizard);
  const addWizardMessage = useFeatureStore((state) => state.addWizardMessage);
  const setWizardStep = useFeatureStore((state) => state.setWizardStep);
  const createFeature = useFeatureStore((state) => state.createFeature);

  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!wizard.isActive) return null;

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    // Add user message
    addWizardMessage({
      role: 'user',
      content: inputValue,
    });

    const userInput = inputValue;
    setInputValue('');
    setIsProcessing(true);

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulate assistant response based on step
    if (wizard.currentStep === 'intent') {
      addWizardMessage({
        role: 'assistant',
        content: `我理解你想要创建: "${userInput}"

让我为你分析这个需求：
• 这是一个主动技能
• 需要位移效果
• 需要冷却时间管理

请确认或补充更多细节：
1. 冲刺距离是多少？
2. 是否有无敌帧？
3. 冷却时间大概多久？`,
      });
      setWizardStep('clarification');
    } else if (wizard.currentStep === 'clarification') {
      addWizardMessage({
        role: 'assistant',
        content: `收到！基于你的描述，我已经整理出以下信息：

**功能名称**: 冲刺技能
**System ID**: dash-ability
**所属分组**: 技能
**Patterns**: ability_active, dash_movement, cooldown_manager

**Gap Fill 结果**:
• 冲刺距离: 400 (默认)
• 冷却时间: 12秒 (同类技能平均值)
• 魔法消耗: 75 (根据效果推断)

请确认以上信息，我将为你生成代码。`,
      });
      setWizardStep('confirmation');
    } else if (wizard.currentStep === 'confirmation') {
      addWizardMessage({
        role: 'system',
        content: '正在生成代码...',
      });
      setWizardStep('generating');

      // Simulate generation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Create the feature
      createFeature({
        displayName: '冲刺技能',
        systemId: 'dash-ability',
        group: 'skill',
      });

      addWizardMessage({
        role: 'assistant',
        content: '✅ Feature 创建成功！\n\n已生成以下文件:\n• abilities/dash_skill.lua\n• scripts/vscripts/abilities/dash.lua\n\n你可以在 Feature List 中查看新创建的功能。',
      });

      setIsProcessing(false);
      return;
    }

    setIsProcessing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStepLabel = () => {
    switch (wizard.currentStep) {
      case 'intent':
        return '描述需求';
      case 'clarification':
        return '澄清细节';
      case 'confirmation':
        return '确认生成';
      case 'generating':
        return '生成中';
      default:
        return '';
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
        {/* Header */}
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

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <AnimatePresence>
              {wizard.messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  )}
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

        {/* Input Area */}
        <div className="p-4 bg-[#1a1a1a] border-t border-white/10">
          {wizard.currentStep === 'confirmation' ? (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="flex-1 bg-transparent border-white/10 text-white/70 hover:bg-white/5"
                onClick={() => setWizardStep('clarification')}
                disabled={isProcessing}
              >
                返回修改
              </Button>
              <Button
                className="flex-1 bg-[#6366f1] hover:bg-[#4f46e5] text-white"
                onClick={handleSendMessage}
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
                <span className="text-sm">正在生成代码...</span>
              </div>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  wizard.currentStep === 'intent'
                    ? '描述你想要创建的功能...'
                    : '补充更多细节或确认...'
                }
                className="flex-1 min-h-[44px] max-h-[120px] bg-[#252525] border-white/10 text-white placeholder:text-white/40 resize-none"
                rows={1}
              />
              <Button
                size="icon"
                className="h-11 w-11 bg-[#6366f1] hover:bg-[#4f46e5] text-white flex-shrink-0"
                onClick={handleSendMessage}
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

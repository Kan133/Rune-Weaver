/**
 * useCLIExecutor - CLI 执行 Hook
 * 
 * 封装 CLI spawn 调用，支持 init, run 命令
 * 返回执行状态、输出、结果和错误
 */

import { useState, useCallback } from 'react';

// CLI 命令类型
export type CLICommand = 'init' | 'run';

// 执行状态
export type ExecutionStatus = 'idle' | 'running' | 'success' | 'failure';

// CLI 执行选项
export interface CLIExecuteOptions {
  command: CLICommand;
  hostRoot: string;
  prompt?: string; // for 'run' command
  write?: boolean; // for 'run' command - whether to actually write files
  force?: boolean; // for 'run' command - force override readiness gate
}

// CLI 执行结果
export interface CLIExecutionResult {
  success: boolean;
  command: string;
  exitCode: number;
  output: string[];
  error?: string;
  artifactPath?: string; // Path to the generated review artifact
}

// Hook 返回类型
export interface UseCLIExecutorReturn {
  // 执行状态
  isRunning: boolean;
  status: ExecutionStatus;
  currentCommand: CLICommand | null;
  
  // 输出和结果
  output: string[];
  result: CLIExecutionResult | null;
  error: string | null;
  
  // 操作
  execute: (options: CLIExecuteOptions) => Promise<void>;
  executeInit: (hostRoot: string) => Promise<void>;
  executeRun: (hostRoot: string, prompt: string, write?: boolean) => Promise<void>;
  
  // 控制
  clearOutput: () => void;
  reset: () => void;
}

// API 响应类型
interface ExecuteAPIResponse {
  success: boolean;
  result?: CLIExecutionResult;
  error?: string;
}

/**
 * 使用 CLI Executor
 * 
 * 示例:
 * ```typescript
 * const { executeInit, executeRun, isRunning, output, result } = useCLIExecutor();
 * 
 * // Initialize host
 * await executeInit('D:\\test1');
 * 
 * // Run feature creation
 * await executeRun('D:\\test1', '做一个按Q键的冲刺技能', false);
 * ```
 */
export function useCLIExecutor(): UseCLIExecutorReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [currentCommand, setCurrentCommand] = useState<CLICommand | null>(null);
  const [output, setOutput] = useState<string[]>([]);
  const [result, setResult] = useState<CLIExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * 执行 CLI 命令
   * 
   * @param options - 执行选项
   */
  const execute = useCallback(async (options: CLIExecuteOptions) => {
    const { command, hostRoot, prompt, write = false, force = false } = options;

    if (!hostRoot) {
      setError('Host root path is required');
      setStatus('failure');
      return;
    }

    if (command === 'run' && !prompt) {
      setError('Prompt is required for run command');
      setStatus('failure');
      return;
    }

    setIsRunning(true);
    setStatus('running');
    setCurrentCommand(command);
    setOutput([]);
    setResult(null);
    setError(null);

    try {
      // 调用后端 API 执行 CLI 命令
      const response = await fetch('/api/cli/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          hostRoot,
          prompt,
          write,
          force,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 处理流式响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const newOutput: string[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              
              if (data.type === 'output') {
                newOutput.push(data.content);
                setOutput(prev => [...prev, data.content]);
              } else if (data.type === 'result') {
                setResult(data.result);
                setStatus(data.result.success ? 'success' : 'failure');
                if (data.result.error) {
                  setError(data.result.error);
                }
              } else if (data.type === 'error') {
                setError(data.error);
                setStatus('failure');
              }
            } catch {
              // 如果不是 JSON，直接作为输出行
              newOutput.push(line);
              setOutput(prev => [...prev, line]);
            }
          }
        }
      } else {
        // 非流式响应
        const data: ExecuteAPIResponse = await response.json();

        if (data.success && data.result) {
          setResult(data.result);
          setOutput(data.result.output || []);
          setStatus(data.result.success ? 'success' : 'failure');
          if (data.result.error) {
            setError(data.result.error);
          }
        } else {
          setError(data.error || 'Execution failed');
          setStatus('failure');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setStatus('failure');
      setOutput(prev => [...prev, `Error: ${errorMessage}`]);
    } finally {
      setIsRunning(false);
    }
  }, []);

  /**
   * 执行 init 命令
   * 
   * @param hostRoot - 宿主项目根目录
   */
  const executeInit = useCallback(async (hostRoot: string) => {
    await execute({ command: 'init', hostRoot });
  }, [execute]);

  /**
   * 执行 run 命令
   * 
   * @param hostRoot - 宿主项目根目录
   * @param prompt - 功能需求描述
   * @param write - 是否实际写入文件（默认为 dry-run 模式）
   */
  const executeRun = useCallback(async (hostRoot: string, prompt: string, write: boolean = false) => {
    await execute({ command: 'run', hostRoot, prompt, write });
  }, [execute]);

  /**
   * 清除输出
   */
  const clearOutput = useCallback(() => {
    setOutput([]);
  }, []);

  /**
   * 重置所有状态
   */
  const reset = useCallback(() => {
    setIsRunning(false);
    setStatus('idle');
    setCurrentCommand(null);
    setOutput([]);
    setResult(null);
    setError(null);
  }, []);

  return {
    // 执行状态
    isRunning,
    status,
    currentCommand,
    
    // 输出和结果
    output,
    result,
    error,
    
    // 操作
    execute,
    executeInit,
    executeRun,
    
    // 控制
    clearOutput,
    reset,
  };
}

export default useCLIExecutor;

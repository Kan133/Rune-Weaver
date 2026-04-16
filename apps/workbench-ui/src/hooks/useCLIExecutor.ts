/**
 * useCLIExecutor - CLI 执行 Hook
 * 
 * 封装 CLI spawn 调用，支持 init/run/doctor/validate/install/dev/launch
 * 返回执行状态、输出、结果和错误
 */

import { useState, useCallback } from 'react';

// CLI 命令类型
export type CLICommand =
  | 'init'
  | 'run'
  | 'update'
  | 'delete'
  | 'demo-prepare'
  | 'doctor'
  | 'validate'
  | 'install'
  | 'dev'
  | 'repair-build'
  | 'launch'
  | 'gap-fill';

// 执行状态
export type ExecutionStatus = 'idle' | 'running' | 'success' | 'failure';

// CLI 执行选项
export interface CLIExecuteOptions {
  command: CLICommand;
  hostRoot: string;
  prompt?: string; // for prompt-driven commands such as 'run' and 'update'
  write?: boolean; // for prompt-driven commands - whether to actually write files
  force?: boolean; // for prompt-driven commands - force override readiness gate
  featureId?: string;
  boundaryId?: string;
  instruction?: string;
  gapFillMode?: 'review' | 'apply' | 'validate-applied';
  approvalFile?: string;
  addonName?: string; // for init/demo-prepare
  mapName?: string; // for demo-prepare
}

// CLI 执行结果
export interface CLIActionSummary {
  headline: string;
  reason: string;
  command?: string;
}

export type CLIReviewStageStatus = 'success' | 'failure' | 'warning' | 'info';

export interface CLIReviewStage {
  id: string;
  label: string;
  status: CLIReviewStageStatus;
  summary: string;
  details?: string[];
}

export interface CLIReviewAction {
  label: string;
  command?: string;
  kind: 'primary' | 'secondary' | 'repair' | 'launch' | 'inspect';
}

export type GapFillProductStatus =
  | 'ready_to_apply'
  | 'needs_confirmation'
  | 'blocked_by_host'
  | 'blocked_by_policy';

export interface CLIGapFillDecisionRecord {
  originalInstruction: string;
  selectedBoundary: string;
  selectedBoundaryLabel?: string;
  assumptionsMade: string[];
  userInputsUsed: string[];
  inferredInputsUsed: string[];
  decision: string;
  failureCategories: string[];
  exactNextStep?: string;
  approvalFile?: string;
}

export interface CLIGapFillReadiness {
  hostReady: boolean;
  workspaceConsistent: boolean;
  blockingItems: string[];
  advisoryItems: string[];
}

export interface CLICanonicalGapFillGuidance {
  classification: 'canonical' | 'exploratory';
  title: string;
  summary: string;
  nextStep: string;
  evidenceMode: 'acceptance' | 'exploratory';
  expectedPrompt: string;
  expectedBoundary: string;
}

export interface CLICanonicalAcceptance {
  classification: 'canonical_acceptance_ready' | 'canonical_but_incomplete' | 'exploratory';
  summary: string;
  nextStep: string;
}

export interface CLIReviewPayload {
  title: string;
  summary: string;
  status: CLIReviewStageStatus;
  stages: CLIReviewStage[];
  blockers: string[];
  highlights: string[];
  recommendedActions: CLIReviewAction[];
  artifactPath?: string;
  featureId?: string;
  generatedFiles?: string[];
  integrationPoints?: string[];
  gapFillStatus?: GapFillProductStatus;
  gapFillDecisionRecord?: CLIGapFillDecisionRecord;
  gapFillReadiness?: CLIGapFillReadiness;
  canonicalGapFillGuidance?: CLICanonicalGapFillGuidance;
  canonicalAcceptance?: CLICanonicalAcceptance;
}

export interface CLIExecutionResult {
  success: boolean;
  command: string;
  exitCode: number;
  output: string[];
  error?: string;
  artifactPath?: string; // Path to the generated review artifact
  actionSummary?: CLIActionSummary;
  review?: CLIReviewPayload;
}

export interface LaunchPreflightResult {
  ready: boolean;
  missingArtifacts: string[];
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
  executeInit: (hostRoot: string, addonName?: string) => Promise<void>;
  executeRun: (hostRoot: string, prompt: string, write?: boolean, featureId?: string) => Promise<void>;
  executeUpdate: (hostRoot: string, featureId: string, prompt: string, write?: boolean) => Promise<void>;
  executeDelete: (hostRoot: string, featureId: string, write?: boolean) => Promise<void>;
  executeDemoPrepare: (hostRoot: string, addonName?: string, mapName?: string) => Promise<void>;
  executeDoctor: (hostRoot: string) => Promise<void>;
  executeValidate: (hostRoot: string) => Promise<void>;
  executeInstall: (hostRoot: string) => Promise<void>;
  executeDev: (hostRoot: string) => Promise<void>;
  executeRepairBuild: (hostRoot: string) => Promise<void>;
  executeLaunch: (hostRoot: string, addonName?: string, mapName?: string) => Promise<void>;
  executeGapFill: (
    hostRoot: string,
    featureId: string,
    instruction: string,
    boundaryId?: string,
    gapFillMode?: 'review' | 'apply' | 'validate-applied',
    approvalFile?: string,
  ) => Promise<void>;
  checkLaunchPreflight: (hostRoot: string) => Promise<LaunchPreflightResult>;
  
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

export function commandRequiresPrompt(command: CLICommand): boolean {
  return command === 'run' || command === 'update';
}

async function readErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
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

function localizeVisibleText(text: string): string {
  const replacements: Array<[string, string]> = [
    ["Prepare the host before runtime checks", "请先准备宿主，再进行运行检查"],
    ["The addon configuration or install outputs are not ready yet.", "当前 addon 配置或安装产物还没有准备好。"],
    ["Initialize or repair the Rune Weaver workspace", "请初始化或修复 Rune Weaver 工作区"],
    ["The workspace record is missing or out of sync with this host.", "工作区记录缺失，或与当前宿主不同步。"],
    ["Repair generated/runtime wiring", "修复生成物与运行时接线"],
    ["Generated files or bridge wiring are inconsistent with a runnable host.", "生成文件或桥接接线与可运行宿主不一致。"],
    ["Rebuild host scripts and Panorama assets", "重新构建宿主脚本和 Panorama 资源"],
    ["The host is missing compiled build artifacts needed at runtime.", "宿主缺少运行时所需的构建产物。"],
    ["Launch the prepared host", "启动已准备好的宿主"],
    ["Doctor did not find any blocking runtime issues.", "运行诊断没有发现阻塞性的运行时问题。"],
    ["Validation passed", "生成校验已通过"],
    ["Post-generation validation completed without blocking issues.", "生成校验已完成，且没有阻塞性问题。"],
    ["Repair generated/runtime inconsistencies", "修复生成物与运行时不一致问题"],
    ["Validation reported post-generation issues that should be repaired before launch.", "生成校验发现了启动前需要修复的问题。"],
    ["Fix addon.config name", "修正 addon.config 名称"],
    ["Install dependencies", "安装依赖"],
    ["Prepare install outputs", "准备安装产物"],
    ["Check package scripts", "检查 package scripts"],
    ["Initialize workspace", "初始化工作区"],
    ["Write demo feature", "写入演示功能"],
    ["Build host", "构建宿主"],
    ["Launch Dota2", "启动 Dota2"],
    ["Follow the next runbook step.", "请执行 runbook 建议的下一步。"],
    ["Runtime Doctor", "运行诊断"],
    ["Post-Generation Validation", "生成校验"],
  ];

  let localized = text;
  for (const [source, target] of replacements) {
    localized = localized.split(source).join(target);
  }
  return localized;
}

function parseActionSummary(output: string[], command: CLICommand, success: boolean): CLIActionSummary | undefined {
  let headline: string | undefined;
  let reason: string | undefined;
  let recommendedCommand: string | undefined;
  let nextCommand: string | undefined;

  for (const line of output) {
    const trimmed = line.trim();

    if (!headline && trimmed.startsWith("Action Summary:")) {
      headline = trimmed.replace(/^Action Summary:\s*/, "");
      continue;
    }

    if (!reason && trimmed.startsWith("Reason:")) {
      reason = trimmed.replace(/^Reason:\s*/, "");
      continue;
    }

    if (!recommendedCommand && trimmed.startsWith("Command:")) {
      recommendedCommand = trimmed.replace(/^Command:\s*/, "");
      continue;
    }

    if (!nextCommand && trimmed.startsWith("Next Command:")) {
      nextCommand = trimmed.replace(/^Next Command:\s*/, "");
      continue;
    }
  }

  if (headline && reason) {
    return {
      headline: localizeVisibleText(headline),
      reason: localizeVisibleText(reason),
      command: recommendedCommand || nextCommand,
    };
  }

  if (command === "validate") {
    const repairCommand = output.find((line) => line.includes("npm run cli -- dota2 repair --host"));
    if (!success && repairCommand) {
      return {
        headline: "Repair generated/runtime inconsistencies",
        reason: "Validation reported post-generation issues that should be repaired before launch.",
        command: repairCommand.trim(),
      };
    }

    if (success) {
      return {
        headline: "Validation passed",
        reason: "Post-generation validation completed without blocking issues.",
      };
    }
  }

  if (command === "install") {
    if (!success) {
      return {
        headline: "依赖安装失败",
        reason: "请检查主机目录中的 package manager 配置和输出日志。",
      };
    }

    return {
      headline: "依赖安装完成",
      reason: "宿主依赖已经就绪。下一步更适合先运行诊断，再决定是直接启动还是继续演示准备。",
    };
  }

  if (command === "dev") {
    return success
      ? {
          headline: "开发构建已启动",
          reason: "Workbench 已在宿主目录后台启动 yarn dev。接下来等它完成首次构建，再启动宿主。",
        }
      : {
          headline: "开发构建启动失败",
          reason: "请检查宿主目录、依赖安装状态和输出日志，再重新尝试启动 yarn dev。",
        };
  }

  if (command === "repair-build") {
    return success
      ? {
          headline: "修复并构建完成",
          reason: "安全修复和一次性宿主构建都已完成。现在应该可以重新进行启动前检查并启动宿主。",
        }
      : {
          headline: "修复并构建失败",
          reason: "请先处理输出里的阻塞问题，再重新执行修复并构建。",
        };
  }

  if (command === "init") {
    return success
      ? {
          headline: "初始化完成",
          reason: "宿主骨架和 Rune Weaver 工作区已经写好。下一步请先安装依赖，再做运行检查。",
        }
      : {
          headline: "初始化失败",
          reason: "请先修正宿主路径、addon 名称或输出里的阻塞项，再重新初始化。",
        };
  }

  if (command === "demo-prepare") {
    return success
      ? {
          headline: "演示准备完成",
          reason: "宿主已经按演示路径完成准备。现在可以运行诊断，或者直接启动进入地图验证。",
        }
      : {
          headline: "演示准备未完成",
          reason: "请先按输出修复宿主状态，再重新执行演示准备。",
        };
  }

  if (command === "doctor") {
    return success
      ? {
          headline: "运行诊断完成",
          reason: "如果没有新的阻塞项，下一步可以直接启动宿主验证真实运行效果。",
        }
      : {
          headline: "运行诊断发现问题",
          reason: "请先按诊断结果修复阻塞项，再尝试启动宿主。",
        };
  }

  if (command === "launch") {
    return success
      ? {
          headline: "启动命令已派发",
          reason: "Workbench 已把启动请求交给宿主。现在请回到 Dota2 Tools 确认是否成功进入 addon。",
        }
      : {
          headline: "启动失败",
          reason: "请先检查初始化、依赖安装和宿主配置，再重新尝试启动。",
        };
  }

  if (command === "gap-fill") {
    return success
      ? {
          headline: "Gap Fill 计划已生成",
          reason: "这一步已经拿到边界内的 patch plan。请先检查 review、decision 和 approval/apply 建议，再决定是否继续。",
        }
      : {
          headline: "Gap Fill 未完成",
          reason: "请先处理边界解析、LLM 配置或 approval/apply 阻塞项，再重新生成计划。",
        };
  }

  return undefined;
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

  const checkLaunchPreflight = useCallback(async (hostRoot: string): Promise<LaunchPreflightResult> => {
    const response = await fetch('/api/host/launch-preflight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostRoot }),
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    const data = await response.json() as {
      success: boolean;
      result?: LaunchPreflightResult;
      error?: string;
    };

    if (!data.success || !data.result) {
      throw new Error(data.error || 'Launch preflight failed');
    }

    return data.result;
  }, []);

  /**
   * 执行 CLI 命令
   * 
   * @param options - 执行选项
   */
  const execute = useCallback(async (options: CLIExecuteOptions) => {
    const {
      command,
      hostRoot,
      prompt,
      write = false,
      force = false,
      featureId,
      boundaryId,
      instruction,
      gapFillMode,
      approvalFile,
      addonName,
      mapName,
    } = options;

    if (!hostRoot) {
      setError('Host root path is required');
      setStatus('failure');
      return;
    }

    if (commandRequiresPrompt(command) && !prompt) {
      setError(`Prompt is required for ${command} command`);
      setStatus('failure');
      return;
    }

    if ((command === 'update' || command === 'delete') && !featureId) {
      setError(`Feature ID is required for ${command} command`);
      setStatus('failure');
      return;
    }

    if (command === 'gap-fill' && !approvalFile && (!instruction || !featureId)) {
      setError('Gap fill review requires feature ID and instruction unless an approval file is provided');
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
          featureId,
          boundaryId,
          instruction,
          gapFillMode,
          approvalFile,
          addonName,
          mapName,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      // 处理流式响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const newOutput: string[] = [];
      let buffered = '';

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
            if (!line.trim()) {
              continue;
            }
            try {
              const data = JSON.parse(line);
              
              if (data.type === 'output') {
                newOutput.push(data.content);
                setOutput(prev => [...prev, data.content]);
              } else if (data.type === 'result') {
                const enrichedResult: CLIExecutionResult = {
                  ...data.result,
                  actionSummary: parseActionSummary(newOutput, command, data.result.success),
                };
                setResult(enrichedResult);
                setStatus(enrichedResult.success ? 'success' : 'failure');
                if (enrichedResult.error) {
                  setError(enrichedResult.error);
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

        if (buffered.trim()) {
          try {
            const data = JSON.parse(buffered);
            if (data.type === 'result') {
              const enrichedResult: CLIExecutionResult = {
                ...data.result,
                actionSummary: parseActionSummary(newOutput, command, data.result.success),
              };
              setResult(enrichedResult);
              setStatus(enrichedResult.success ? 'success' : 'failure');
              if (enrichedResult.error) {
                setError(enrichedResult.error);
              }
            } else if (data.type === 'error') {
              setError(data.error);
              setStatus('failure');
            } else if (data.type === 'output') {
              newOutput.push(data.content);
              setOutput(prev => [...prev, data.content]);
            }
          } catch {
            newOutput.push(buffered);
            setOutput(prev => [...prev, buffered]);
          }
        }
      } else {
        // 非流式响应
        const data: ExecuteAPIResponse = await response.json();

        if (data.success && data.result) {
          const enrichedResult: CLIExecutionResult = {
            ...data.result,
            actionSummary: parseActionSummary(data.result.output || [], command, data.result.success),
          };
          setResult(enrichedResult);
          setOutput(enrichedResult.output || []);
          setStatus(enrichedResult.success ? 'success' : 'failure');
          if (enrichedResult.error) {
            setError(enrichedResult.error);
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
  const executeInit = useCallback(async (hostRoot: string, addonName?: string) => {
    await execute({ command: 'init', hostRoot, addonName });
  }, [execute]);

  /**
   * 执行 run 命令
   * 
   * @param hostRoot - 宿主项目根目录
   * @param prompt - 功能需求描述
   * @param write - 是否实际写入文件（默认为 dry-run 模式）
   */
  const executeRun = useCallback(async (
    hostRoot: string,
    prompt: string,
    write: boolean = false,
    featureId?: string,
  ) => {
    await execute({ command: 'run', hostRoot, prompt, write, featureId });
  }, [execute]);

  /**
   * 执行 update 命令
   *
   * @param hostRoot - 宿主项目根目录
   * @param featureId - 需要更新的 feature ID
   * @param prompt - 更新指令
   * @param write - 是否实际写入文件（默认为 dry-run 模式）
   */
  const executeUpdate = useCallback(async (
    hostRoot: string,
    featureId: string,
    prompt: string,
    write: boolean = false,
  ) => {
    await execute({ command: 'update', hostRoot, featureId, prompt, write });
  }, [execute]);

  /**
   * 执行 delete 命令
   */
  const executeDelete = useCallback(async (
    hostRoot: string,
    featureId: string,
    write: boolean = true,
  ) => {
    await execute({ command: 'delete', hostRoot, featureId, write });
  }, [execute]);

  /**
   * 执行 demo prepare 命令
   */
  const executeDemoPrepare = useCallback(async (hostRoot: string, addonName?: string, mapName?: string) => {
    await execute({ command: 'demo-prepare', hostRoot, addonName, mapName });
  }, [execute]);

  /**
   * 执行 doctor 命令
   */
  const executeDoctor = useCallback(async (hostRoot: string) => {
    await execute({ command: 'doctor', hostRoot });
  }, [execute]);

  /**
   * 执行 validate 命令
   */
  const executeValidate = useCallback(async (hostRoot: string) => {
    await execute({ command: 'validate', hostRoot });
  }, [execute]);

  /**
   * 执行 yarn install
   */
  const executeInstall = useCallback(async (hostRoot: string) => {
    await execute({ command: 'install', hostRoot });
  }, [execute]);

  /**
   * 启动 yarn dev
   */
  const executeDev = useCallback(async (hostRoot: string) => {
    await execute({ command: 'dev', hostRoot });
  }, [execute]);

  /**
   * 执行安全修复并启动构建
   */
  const executeRepairBuild = useCallback(async (hostRoot: string) => {
    await execute({ command: 'repair-build', hostRoot });
  }, [execute]);

  /**
   * 执行 launch 命令
   */
  const executeLaunch = useCallback(async (hostRoot: string, addonName?: string, mapName?: string) => {
    await execute({ command: 'launch', hostRoot, addonName, mapName });
  }, [execute]);

  /**
   * Execute gap-fill planning for a written feature
   */
  const executeGapFill = useCallback(async (
    hostRoot: string,
    featureId: string,
    instruction: string,
    boundaryId?: string,
    gapFillMode: 'review' | 'apply' | 'validate-applied' = 'review',
    approvalFile?: string,
  ) => {
    await execute({ command: 'gap-fill', hostRoot, featureId, instruction, boundaryId, gapFillMode, approvalFile });
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
    executeUpdate,
    executeDelete,
    executeDemoPrepare,
    executeDoctor,
    executeValidate,
    executeInstall,
    executeDev,
    executeRepairBuild,
    executeLaunch,
    executeGapFill,
    checkLaunchPreflight,
    
    // 控制
    clearOutput,
    reset,
  };
}

export default useCLIExecutor;

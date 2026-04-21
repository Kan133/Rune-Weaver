import { useCallback, useState } from 'react';
import { enrichExecutionResult } from './cli/cliPresentation';
import { checkLaunchPreflightRequest, executeCLIRequest } from './cli/cliTransport';
import type {
  CLICommand,
  CLIExecuteOptions,
  CLIExecutionResult,
  LaunchPreflightResult,
  UseCLIExecutorReturn,
} from './cli/types';

export type {
  CLIActionSummary,
  CLICommand,
  CLICanonicalAcceptance,
  CLICanonicalGapFillGuidance,
  CLIExecuteOptions,
  CLIExecutionResult,
  CLIGapFillDecisionRecord,
  CLIGapFillReadiness,
  CLIReviewAction,
  CLIReviewPayload,
  CLIReviewStage,
  CLIReviewStageStatus,
  ExecutionStatus,
  ExecuteAPIResponse,
  GapFillProductStatus,
  LaunchPreflightResult,
  UseCLIExecutorReturn,
} from './cli/types';

export function commandRequiresPrompt(command: CLICommand): boolean {
  return command === 'run' || command === 'update';
}

export function useCLIExecutor(): UseCLIExecutorReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'failure'>('idle');
  const [currentCommand, setCurrentCommand] = useState<CLICommand | null>(null);
  const [output, setOutput] = useState<string[]>([]);
  const [result, setResult] = useState<CLIExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkLaunchPreflight = useCallback(async (hostRoot: string): Promise<LaunchPreflightResult> => {
    return checkLaunchPreflightRequest(hostRoot);
  }, []);

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
      const streamedOutput: string[] = [];
      await executeCLIRequest(
        {
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
        },
        {
          onOutput: (line) => {
            streamedOutput.push(line);
            setOutput((prev) => [...prev, line]);
          },
          onResult: (rawResult) => {
            const nextOutput = streamedOutput.length > 0 ? streamedOutput : rawResult.output || [];
            const enrichedResult = enrichExecutionResult(rawResult, nextOutput, command);
            setResult(enrichedResult);
            setOutput(nextOutput);
            setStatus(enrichedResult.success ? 'success' : 'failure');
            if (enrichedResult.error) {
              setError(enrichedResult.error);
            }
          },
          onError: (message) => {
            setError(message);
            setStatus('failure');
          },
        },
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setStatus('failure');
      setOutput((prev) => [...prev, `Error: ${errorMessage}`]);
    } finally {
      setIsRunning(false);
    }
  }, []);

  const executeInit = useCallback(async (hostRoot: string, addonName?: string) => {
    await execute({ command: 'init', hostRoot, addonName });
  }, [execute]);

  const executeRun = useCallback(async (
    hostRoot: string,
    prompt: string,
    write: boolean = false,
    featureId?: string,
  ) => {
    await execute({ command: 'run', hostRoot, prompt, write, featureId });
  }, [execute]);

  const executeUpdate = useCallback(async (
    hostRoot: string,
    featureId: string,
    prompt: string,
    write: boolean = false,
  ) => {
    await execute({ command: 'update', hostRoot, featureId, prompt, write });
  }, [execute]);

  const executeDelete = useCallback(async (
    hostRoot: string,
    featureId: string,
    write: boolean = true,
  ) => {
    await execute({ command: 'delete', hostRoot, featureId, write });
  }, [execute]);

  const executeDemoPrepare = useCallback(async (hostRoot: string, addonName?: string, mapName?: string) => {
    await execute({ command: 'demo-prepare', hostRoot, addonName, mapName });
  }, [execute]);

  const executeDoctor = useCallback(async (hostRoot: string) => {
    await execute({ command: 'doctor', hostRoot });
  }, [execute]);

  const executeValidate = useCallback(async (hostRoot: string) => {
    await execute({ command: 'validate', hostRoot });
  }, [execute]);

  const executeInstall = useCallback(async (hostRoot: string) => {
    await execute({ command: 'install', hostRoot });
  }, [execute]);

  const executeDev = useCallback(async (hostRoot: string) => {
    await execute({ command: 'dev', hostRoot });
  }, [execute]);

  const executeRepairBuild = useCallback(async (hostRoot: string) => {
    await execute({ command: 'repair-build', hostRoot });
  }, [execute]);

  const executeLaunch = useCallback(async (hostRoot: string, addonName?: string, mapName?: string) => {
    await execute({ command: 'launch', hostRoot, addonName, mapName });
  }, [execute]);

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

  const clearOutput = useCallback(() => {
    setOutput([]);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setStatus('idle');
    setCurrentCommand(null);
    setOutput([]);
    setResult(null);
    setError(null);
  }, []);

  return {
    isRunning,
    status,
    currentCommand,
    output,
    result,
    error,
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
    clearOutput,
    reset,
  };
}

export default useCLIExecutor;

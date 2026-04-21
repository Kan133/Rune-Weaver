import type {
  CLIExecuteOptions,
  CLIExecutionResult,
  ExecuteAPIResponse,
  LaunchPreflightResult,
} from './types';

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

export async function executeCLIRequest(
  options: CLIExecuteOptions,
  handlers: {
    onOutput: (line: string) => void;
    onResult: (result: CLIExecutionResult) => void;
    onError: (error: string) => void;
  },
): Promise<void> {
  const response = await fetch('/api/cli/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffered = '';

  const flushLine = (line: string) => {
    if (!line.trim()) {
      return;
    }

    try {
      const data = JSON.parse(line);
      if (data.type === 'output') {
        handlers.onOutput(data.content);
        return;
      }
      if (data.type === 'result') {
        handlers.onResult(data.result as CLIExecutionResult);
        return;
      }
      if (data.type === 'error') {
        handlers.onError(data.error as string);
        return;
      }
    } catch {
      handlers.onOutput(line);
      return;
    }
  };

  if (!reader) {
    const data = (await response.json()) as ExecuteAPIResponse;
    if (data.success && data.result) {
      handlers.onResult(data.result);
      return;
    }
    handlers.onError(data.error || 'Execution failed');
    return;
  }

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
      flushLine(line);
    }
  }

  if (buffered.trim()) {
    flushLine(buffered);
  }
}

export async function checkLaunchPreflightRequest(hostRoot: string): Promise<LaunchPreflightResult> {
  const response = await fetch('/api/host/launch-preflight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostRoot }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const data = (await response.json()) as {
    success: boolean;
    result?: LaunchPreflightResult;
    error?: string;
  };

  if (!data.success || !data.result) {
    throw new Error(data.error || 'Launch preflight failed');
  }

  return data.result;
}

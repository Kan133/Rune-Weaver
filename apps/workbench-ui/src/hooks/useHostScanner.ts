/**
 * useHostScanner - Host 状态扫描 Hook
 * 
 * 封装 scanDota2Project() 和 checkHostStatus() 调用
 * 提供真实的宿主项目扫描和状态检查功能
 */

import { useState, useCallback } from 'react';
import type { Dota2GovernanceReadModel, RuneWeaverWorkspace } from '@/types/workspace';

// 扫描结果类型
export interface HostScanResult {
  valid: boolean;
  hostType: 'dota2-x-template' | 'unknown';
  errors: string[];
  warnings: string[];
  capabilities: string[];
}

// Bridge 状态详情
export interface BridgeStatus {
  entryExists: boolean;
  indexExists: boolean;
  hostEntryInjected: boolean;
  ready: boolean;
}

// 接入状态类型
export interface IntegrationStatus {
  initialized: boolean;
  namespaceReady: boolean;
  workspaceReady: boolean;
  serverBridge: BridgeStatus;
  uiBridge: BridgeStatus;
  ready: boolean;
}

// Host 状态结果
export interface HostStatusResult {
  hostRoot: string;
  supported: boolean;
  hostType: 'dota2-x-template' | 'unknown';
  rwStatus: IntegrationStatus;
  workspace?: RuneWeaverWorkspace;
  governanceReadModel?: Dota2GovernanceReadModel | null;
  issues: HostIssue[];
  checkedAt: string;
}

// Host 问题
export interface HostIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  step: HostSetupStep;
  suggestion?: string;
}

// 宿主设置步骤
export type HostSetupStep =
  | 'scan'
  | 'init'
  | 'workspace'
  | 'namespace'
  | 'server-bridge'
  | 'ui-bridge'
  | 'host-entry';

// Hook 返回类型
export interface UseHostScannerReturn {
  // 扫描状态
  isScanning: boolean;
  isCheckingStatus: boolean;
  scanResult: HostScanResult | null;
  scanErrors: string[];
  statusErrors: string[];
  
  // Host 状态
  hostStatus: HostStatusResult | null;
  integrationStatus: IntegrationStatus | null;
  
  // 快捷状态
  hostValid: boolean;
  hostType: 'dota2-x-template' | 'unknown';
  fullyReady: boolean;
  
  // 操作
  scan: (hostRoot: string) => Promise<HostScanResult | null>;
  checkStatus: (hostRoot: string) => Promise<HostStatusResult | null>;
  refresh: (hostRoot: string) => Promise<void>;
  
  // 重置
  reset: () => void;
}

// API 响应类型
export interface ScanAPIResponse {
  success: boolean;
  result?: {
    valid: boolean;
    hostType: 'dota2-x-template' | 'unknown';
    errors: string[];
    warnings: string[];
    capabilities: string[];
  };
  error?: string;
}

export interface StatusAPIResponse {
  success: boolean;
  result?: HostStatusResult;
  error?: string;
}

export async function fetchHostScan(hostRoot: string): Promise<HostScanResult> {
  const response = await fetch('/api/host/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostRoot }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: ScanAPIResponse = await response.json();
  if (!data.success || !data.result) {
    throw new Error(data.error || 'Scan failed');
  }

  return {
    valid: data.result.valid,
    hostType: data.result.hostType,
    errors: data.result.errors || [],
    warnings: data.result.warnings || [],
    capabilities: data.result.capabilities || [],
  };
}

export async function fetchHostStatus(hostRoot: string): Promise<HostStatusResult | null> {
  const response = await fetch('/api/host/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostRoot }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: StatusAPIResponse = await response.json();
  if (!data.success || !data.result) {
    throw new Error(data.error || 'Status check failed');
  }

  return data.result;
}

/**
 * 使用 Host Scanner
 * 
 * 示例:
 * ```typescript
 * const { scan, hostValid, integrationStatus, isScanning } = useHostScanner();
 * 
 * useEffect(() => {
 *   scan('/path/to/host');
 * }, []);
 * ```
 */
export function useHostScanner(): UseHostScannerReturn {
  const [isScanning, setIsScanning] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [scanResult, setScanResult] = useState<HostScanResult | null>(null);
  const [hostStatus, setHostStatus] = useState<HostStatusResult | null>(null);
  const [scanErrors, setScanErrors] = useState<string[]>([]);
  const [statusErrors, setStatusErrors] = useState<string[]>([]);

  /**
   * 扫描宿主项目
   * 调用后端 API 执行 scanDota2Project
   */
  const scan = useCallback(async (hostRoot: string) => {
    if (!hostRoot) {
      setScanErrors(['Host root path is required']);
      return null;
    }

    setIsScanning(true);
    setScanErrors([]);

    try {
      const result = await fetchHostScan(hostRoot);
      setScanResult(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setScanErrors([errorMessage]);
      const failedResult = {
        valid: false,
        hostType: 'unknown',
        errors: [errorMessage],
        warnings: [],
        capabilities: [],
      } satisfies HostScanResult;
      setScanResult(failedResult);
      return failedResult;
    } finally {
      setIsScanning(false);
    }
  }, []);

  /**
   * 检查宿主状态
   * 调用后端 API 执行 checkHostStatus
   */
  const checkStatus = useCallback(async (hostRoot: string) => {
    if (!hostRoot) {
      setStatusErrors(['Host root path is required']);
      return null;
    }

    setIsCheckingStatus(true);
    setStatusErrors([]);

    try {
      const result = await fetchHostStatus(hostRoot);
      if (result) {
        setHostStatus(result);
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setStatusErrors([errorMessage]);
      return null;
    } finally {
      setIsCheckingStatus(false);
    }
  }, []);

  /**
   * 刷新 - 同时执行扫描和状态检查
   */
  const refresh = useCallback(async (hostRoot: string) => {
    await scan(hostRoot);
    await checkStatus(hostRoot);
  }, [scan, checkStatus]);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setIsScanning(false);
    setIsCheckingStatus(false);
    setScanResult(null);
    setHostStatus(null);
    setScanErrors([]);
    setStatusErrors([]);
  }, []);

  // 计算快捷状态
  const hostValid = scanResult?.valid ?? false;
  const hostType = scanResult?.hostType ?? 'unknown';
  const integrationStatus = hostStatus?.rwStatus ?? null;
  const fullyReady = integrationStatus?.ready ?? false;

  return {
    // 扫描状态
    isScanning,
    isCheckingStatus,
    scanResult,
    scanErrors,
    statusErrors,
    
    // Host 状态
    hostStatus,
    integrationStatus,
    
    // 快捷状态
    hostValid,
    hostType,
    fullyReady,
    
    // 操作
    scan,
    checkStatus,
    refresh,
    reset,
  };
}

export default useHostScanner;

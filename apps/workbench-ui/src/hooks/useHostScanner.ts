/**
 * useHostScanner - Host 状态扫描 Hook
 * 
 * 封装 scanDota2Project() 和 checkHostStatus() 调用
 * 提供真实的宿主项目扫描和状态检查功能
 */

import { useState, useCallback, useEffect } from 'react';

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
  scan: (hostRoot: string) => Promise<void>;
  checkStatus: (hostRoot: string) => Promise<void>;
  refresh: (hostRoot: string) => Promise<void>;
  
  // 重置
  reset: () => void;
}

// API 响应类型
interface ScanAPIResponse {
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

interface StatusAPIResponse {
  success: boolean;
  result?: HostStatusResult;
  error?: string;
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
      return;
    }

    setIsScanning(true);
    setScanErrors([]);

    try {
      // 调用后端 API 扫描项目
      const response = await fetch('/api/host/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostRoot }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ScanAPIResponse = await response.json();

      if (data.success && data.result) {
        setScanResult({
          valid: data.result.valid,
          hostType: data.result.hostType,
          errors: data.result.errors || [],
          warnings: data.result.warnings || [],
          capabilities: data.result.capabilities || [],
        });
      } else {
        setScanErrors([data.error || 'Scan failed']);
        setScanResult({
          valid: false,
          hostType: 'unknown',
          errors: [data.error || 'Scan failed'],
          warnings: [],
          capabilities: [],
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setScanErrors([errorMessage]);
      setScanResult({
        valid: false,
        hostType: 'unknown',
        errors: [errorMessage],
        warnings: [],
        capabilities: [],
      });
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
      return;
    }

    setIsScanning(true);
    setStatusErrors([]);

    try {
      // 调用后端 API 检查状态
      const response = await fetch('/api/host/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostRoot }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: StatusAPIResponse = await response.json();

      if (data.success && data.result) {
        setHostStatus(data.result);
      } else {
        setStatusErrors([data.error || 'Status check failed']);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setStatusErrors([errorMessage]);
    } finally {
      setIsScanning(false);
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

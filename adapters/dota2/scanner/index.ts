/**
 * Dota2 Adapter - Scanner
 * 
 * 扫描宿主项目状态，识别 dota2-x-template 类型宿主
 * 目标宿主：D:\test1
 * 
 * 模块结构（T024-A-R1 修复后）：
 * - project-scan.ts: 基础项目扫描逻辑
 * - host-status.ts: Host Status 完整状态检查
 * - index.ts: 统一导出（barrel 文件）
 */

// 从 project-scan.ts 导出基础扫描功能
export {
  scanDota2Project,
  isSupportedHost,
  getProjectSummary,
  type Dota2ProjectScanResult,
} from "./project-scan.js";

// 从 host-status.ts 导出 Host Status 功能
export {
  checkHostStatus,
  getHostStatusSummary,
  isHostFullyReady,
  getNextSetupSteps,
  type HostStatusResult,
  type RWIntegrationStatus,
  type BridgeStatus,
  type HostIssue,
  type HostSetupStep,
} from "./host-status.js";

// ProjectSetupPanel - Product-level UI entry for Rune Weaver project setup
// Provides visual configuration for Host, Project, Launch and Integration status
// Product Entry Integration: Now connected to real CLI calls

import { useState, useEffect, useCallback } from "react";
import {
  FolderOpen,
  Box,
  Play,
  Layers,
  ChevronDown,
  ChevronRight,
  Terminal,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  RefreshCw,
  HardDriveDownload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFeatureStore } from "@/hooks/useFeatureStore";
import { useHostScanner } from "@/hooks/useHostScanner";
import { useCLIExecutor } from "@/hooks/useCLIExecutor";
import { ExecutionOutputPanel } from "./ExecutionOutputPanel";

function normalizeAddonName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function deriveAddonNameFromHostRoot(hostRoot: string): string {
  if (!hostRoot) return "";
  const segments = hostRoot.split(/[\\/]+/).filter(Boolean);
  const basename = segments[segments.length - 1] || "";
  return normalizeAddonName(basename);
}

function isValidAddonName(value: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(value);
}

// Status indicator component
function StatusIndicator({
  status,
  label,
  testId,
}: {
  status: "success" | "warning" | "error" | "pending" | "idle";
  label: string;
  testId?: string;
}) {
  const config = {
    success: { icon: CheckCircle2, color: "text-[#238636]", bg: "bg-[#238636]/10" },
    warning: { icon: AlertCircle, color: "text-[#9e6a03]", bg: "bg-[#9e6a03]/10" },
    error: { icon: XCircle, color: "text-[#da3633]", bg: "bg-[#da3633]/10" },
    pending: { icon: Loader2, color: "text-[#6366f1]", bg: "bg-[#6366f1]/10" },
    idle: { icon: Info, color: "text-white/40", bg: "bg-white/5" },
  };

  const { icon: Icon, color, bg } = config[status];

  return (
    <div
      className={cn("flex items-center gap-2 px-2 py-1.5 rounded", bg)}
      data-testid={testId}
      data-status={status}
    >
      <Icon
        className={cn(
          "h-3.5 w-3.5",
          color,
          status === "pending" && "animate-spin"
        )}
      />
      <span className={cn("text-[11px]", color)}>{label}</span>
    </div>
  );
}

// Section header component
function SectionHeader({
  icon: Icon,
  title,
  isOpen,
}: {
  icon: React.ElementType;
  title: string;
  isOpen: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-white/70">
      <Icon className="h-4 w-4 text-[#6366f1]" />
      <span className="text-xs font-medium">{title}</span>
      {isOpen ? (
        <ChevronDown className="h-3 w-3 ml-auto text-white/40" />
      ) : (
        <ChevronRight className="h-3 w-3 ml-auto text-white/40" />
      )}
    </div>
  );
}

// Host Config Section - Connected to real host scanner
function HostConfigSection({ hostScanner }: { hostScanner: ReturnType<typeof useHostScanner> }) {
  const [isOpen, setIsOpen] = useState(true);
  const { hostConfig, setHostRoot, setHostScanResult } = useFeatureStore();
  const { scan, isScanning, scanResult, scanErrors } = hostScanner;

  const handleHostRootChange = async (value: string) => {
    setHostRoot(value);

    if (value) {
      // Trigger real scan via API
      await scan(value);
    }
  };

  // Sync scan result to store
  useEffect(() => {
    if (scanResult) {
      setHostScanResult(
        scanResult.valid,
        scanResult.hostType,
        scanResult.errors
      );
    }
  }, [scanResult, setHostScanResult]);

  const getStatusLabel = () => {
    if (isScanning) return "扫描中...";
    if (!hostConfig.hostRoot) return "未配置";
    if (hostConfig.hostValid) return `有效 (${hostConfig.hostType})`;
    if (scanErrors.length > 0) return "路径无效";
    return "未配置";
  };

  const getStatus = (): "success" | "error" | "pending" | "idle" => {
    if (isScanning) return "pending";
    if (!hostConfig.hostRoot) return "idle";
    if (hostConfig.hostValid) return "success";
    if (scanErrors.length > 0) return "error";
    return "idle";
  };

  const handlePickDirectory = async () => {
    setHostScanResult(false, "unknown", [
      "当前开发环境下目录选择器不稳定，先手动粘贴绝对路径更可靠，例如 D:\\testC。",
    ]);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <SectionHeader icon={FolderOpen} title="宿主配置" isOpen={isOpen} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-white/40 uppercase tracking-wider">
              宿主目录
            </label>
            <span className="text-[9px] text-white/30">已接通</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={hostConfig.hostRoot}
              onChange={(e) => handleHostRootChange(e.target.value)}
              placeholder="例如：D:\\test1（x-template 宿主根目录）"
              data-testid="host-root-input"
              className="h-8 text-xs bg-[#252525] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#6366f1]"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePickDirectory}
              title="当前环境下请手动粘贴绝对路径"
              className="h-8 px-3 bg-transparent border-white/10 text-white/70 hover:bg-white/5 hover:text-white"
            >
              手动填
            </Button>
          </div>
          <p className="text-[9px] text-white/35">
            目录选择器暂时不稳定，请直接粘贴 Windows 绝对路径。
          </p>
        </div>
        
        {/* Scan Errors Display */}
        {scanErrors.length > 0 && (
          <div className="p-2 rounded bg-[#da3633]/5 border border-[#da3633]/20">
            <p className="text-[10px] text-[#da3633] font-medium mb-1">扫描错误：</p>
            <ul className="space-y-0.5">
              {scanErrors.map((error, idx) => (
                <li key={idx} className="text-[9px] text-white/50">{error}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="flex gap-2">
          <StatusIndicator
            status={getStatus()}
            label={getStatusLabel()}
            testId="host-status-indicator"
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Project Naming Section
function ProjectNamingSection() {
  const [isOpen, setIsOpen] = useState(false);
  const { hostConfig, setAddonName } = useFeatureStore();
  const derivedAddonName = deriveAddonNameFromHostRoot(hostConfig.hostRoot);
  const effectiveAddonName = hostConfig.addonName.trim() || derivedAddonName;
  const namingStatus =
    !hostConfig.hostRoot && !hostConfig.addonName
      ? "idle"
      : effectiveAddonName && isValidAddonName(effectiveAddonName)
      ? "valid"
      : "invalid";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <SectionHeader icon={Box} title="项目命名" isOpen={isOpen} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-white/40 uppercase tracking-wider">
              推导项目名
            </label>
            <span className="text-[9px] text-white/30">来自宿主路径</span>
          </div>
          <Input
            value={derivedAddonName}
            readOnly
            placeholder="来自宿主路径"
            className="h-8 text-xs bg-[#252525] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#6366f1]"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-white/40 uppercase tracking-wider">
              Addon 名称（可选）
            </label>
            <span className="text-[9px] text-white/30">用于初始化 / 演示准备</span>
          </div>
          <Input
            value={hostConfig.addonName}
            onChange={(e) => setAddonName(normalizeAddonName(e.target.value))}
            placeholder={derivedAddonName || "my_addon"}
            className="h-8 text-xs bg-[#252525] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#6366f1]"
          />
        </div>
        <div className="rounded border border-white/10 bg-white/5 px-2 py-1.5">
          <p className="text-[9px] text-white/30 uppercase tracking-wider">实际 Addon 名称</p>
          <p className="text-[11px] text-white/70 mt-1">{effectiveAddonName || "（等待宿主路径）"}</p>
        </div>
        <StatusIndicator
          status={
            namingStatus === "valid"
              ? "success"
              : namingStatus === "invalid"
              ? "error"
              : "idle"
          }
          label={
            namingStatus === "valid"
              ? "命名有效"
              : namingStatus === "invalid"
              ? "命名无效（请使用 snake_case）"
              : "未配置"
          }
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

// Launch Config Section
function LaunchConfigSection() {
  const [isOpen, setIsOpen] = useState(false);
  const { hostConfig, setMapName } = useFeatureStore();
  const effectiveAddonName = hostConfig.addonName.trim() || deriveAddonNameFromHostRoot(hostConfig.hostRoot) || "<addon>";
  const effectiveMapName = hostConfig.mapName.trim() || "temp";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <SectionHeader icon={Play} title="启动配置" isOpen={isOpen} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-white/40 uppercase tracking-wider">
              地图名
            </label>
            <span className="text-[9px] text-white/30">用于演示准备 / 启动</span>
          </div>
          <Input
            value={hostConfig.mapName}
            onChange={(e) => setMapName(e.target.value.trim())}
            placeholder="temp"
            className="h-8 text-xs bg-[#252525] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#6366f1]"
          />
        </div>
        <div className="rounded border border-white/10 bg-white/5 px-2 py-1.5">
          <p className="text-[9px] text-white/30 uppercase tracking-wider">启动预览</p>
          <p className="text-[11px] text-white/70 mt-1 font-mono">
            yarn launch {effectiveAddonName} {effectiveMapName}
          </p>
        </div>
        <StatusIndicator
          status={hostConfig.hostRoot ? "success" : "idle"}
          label={hostConfig.hostRoot ? "启动参数已就绪" : "等待宿主路径"}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

// Integration Status Section - Connected to real host-status scanner
function IntegrationStatusSection({ hostScanner }: { hostScanner: ReturnType<typeof useHostScanner> }) {
  const [isOpen, setIsOpen] = useState(true);
  const { hostConfig, setIntegrationStatus } = useFeatureStore();
  const { checkStatus, hostStatus, isCheckingStatus, statusErrors } = hostScanner;

  // Check status when host is valid
  const refreshStatus = useCallback(async () => {
    if (hostConfig.hostRoot && hostConfig.hostValid) {
      await checkStatus(hostConfig.hostRoot);
    }
  }, [hostConfig.hostRoot, hostConfig.hostValid, checkStatus]);

  // Sync host status to store
  useEffect(() => {
    if (hostStatus?.rwStatus) {
      setIntegrationStatus({
        initialized: hostStatus.rwStatus.initialized,
        namespaceReady: hostStatus.rwStatus.namespaceReady,
        workspaceReady: hostStatus.rwStatus.workspaceReady,
        serverBridge: hostStatus.rwStatus.serverBridge.ready,
        uiBridge: hostStatus.rwStatus.uiBridge.ready,
        ready: hostStatus.rwStatus.ready,
      });
    }
  }, [hostStatus, setIntegrationStatus]);

  // Auto-check on mount if host is valid
  useEffect(() => {
    if (hostConfig.hostValid && !hostConfig.integrationStatus) {
      refreshStatus();
    }
  }, [hostConfig.hostValid, hostConfig.integrationStatus, refreshStatus]);

  const statusItems = [
    { key: "initialized", label: "已初始化", hint: "项目已初始化" },
    { key: "namespaceReady", label: "命名空间", hint: "目录结构就绪" },
    { key: "workspaceReady", label: "工作区", hint: "配置已加载" },
    { key: "serverBridge", label: "服务端桥接", hint: "服务端桥接已接入" },
    { key: "uiBridge", label: "界面桥接", hint: "界面桥接已接入" },
    { key: "ready", label: "可创建", hint: "可以创建功能" },
  ] as const;

  const integrationStatus = hostConfig.integrationStatus || {
    initialized: false,
    namespaceReady: false,
    workspaceReady: false,
    serverBridge: false,
    uiBridge: false,
    ready: false,
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <SectionHeader icon={Layers} title="集成状态" isOpen={isOpen} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        {/* Status Errors Display */}
        {statusErrors.length > 0 && (
          <div className="p-2 rounded bg-[#da3633]/5 border border-[#da3633]/20 mb-2">
            <p className="text-[10px] text-[#da3633] font-medium mb-1">状态检查错误：</p>
            <ul className="space-y-0.5">
              {statusErrors.map((error, idx) => (
                <li key={idx} className="text-[9px] text-white/50">{error}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <RefreshCw className={cn("h-3 w-3 text-[#6366f1]", isCheckingStatus && "animate-spin")} />
            <span className="text-[9px] text-white/30">
              {isCheckingStatus ? "检查中..." : "已接通宿主状态检查"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-2 text-[9px] text-white/40 hover:text-white/60"
            onClick={(e) => {
              e.stopPropagation();
              refreshStatus();
            }}
            disabled={isCheckingStatus || !hostConfig.hostValid}
          >
            刷新
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {statusItems.map(({ key, label, hint }) => (
            <div
              key={key}
              data-testid={`integration-status-${key}`}
              data-ready={integrationStatus[key] ? "true" : "false"}
              className={cn(
                "flex flex-col px-2 py-1.5 rounded",
                integrationStatus[key]
                  ? "bg-[#238636]/10"
                  : "bg-white/5"
              )}
            >
              <div className="flex items-center gap-1.5">
                {integrationStatus[key] ? (
                  <CheckCircle2 className="h-3 w-3 text-[#238636]" />
                ) : (
                  <XCircle className="h-3 w-3 text-white/30" />
                )}
                <span
                  className={cn(
                    "text-[10px]",
                    integrationStatus[key] ? "text-[#238636]" : "text-white/40"
                  )}
                >
                  {label}
                </span>
              </div>
              <span
                className={cn(
                  "text-[9px] mt-0.5",
                  integrationStatus[key] ? "text-[#238636]/70" : "text-white/30"
                )}
              >
                {hint}
              </span>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Next Action Section - Connected to real CLI executor
function NextActionSection({ hostScanner }: { hostScanner: ReturnType<typeof useHostScanner> }) {
  const { hostConfig } = useFeatureStore();
  const {
    executeInit,
    executeInstall,
    executeRepairBuild,
    executeDoctor,
    executeLaunch,
    checkLaunchPreflight,
    isRunning,
    status,
    currentCommand,
    output,
    result,
    error,
    clearOutput,
  } = useCLIExecutor();
  const { checkStatus } = hostScanner;
  const effectiveAddonName = hostConfig.addonName.trim() || deriveAddonNameFromHostRoot(hostConfig.hostRoot);
  const effectiveMapName = hostConfig.mapName.trim() || "temp";
  const [launchPreflight, setLaunchPreflight] = useState<{ ready: boolean; missingArtifacts: string[] } | null>(null);
  const [preflightError, setPreflightError] = useState<string | null>(null);

  const canInitialize = hostConfig.hostValid && !hostConfig.integrationStatus?.initialized && isValidAddonName(effectiveAddonName);
  const canInspect = hostConfig.hostValid;
  const canRepairBuild = hostConfig.hostValid && !!hostConfig.integrationStatus?.initialized;
  const canLaunch = hostConfig.hostValid && !!hostConfig.integrationStatus?.initialized && !!launchPreflight?.ready;

  // Refresh host status after CLI operations that can change host readiness.
  useEffect(() => {
    if (
      result?.success &&
      hostConfig.hostRoot &&
      (result.command === "init" || result.command === "install" || result.command === "repair-build")
    ) {
      checkStatus(hostConfig.hostRoot);
    }
  }, [result, hostConfig.hostRoot, checkStatus]);

  useEffect(() => {
    const loadPreflight = async () => {
      if (!hostConfig.hostRoot || !hostConfig.hostValid || !hostConfig.integrationStatus?.initialized) {
        setLaunchPreflight(null);
        setPreflightError(null);
        return;
      }

      try {
        const next = await checkLaunchPreflight(hostConfig.hostRoot);
        setLaunchPreflight(next);
        setPreflightError(null);
      } catch (err) {
        setLaunchPreflight(null);
        setPreflightError(err instanceof Error ? err.message : String(err));
      }
    };

    void loadPreflight();
  }, [
    checkLaunchPreflight,
    hostConfig.hostRoot,
    hostConfig.hostValid,
    hostConfig.integrationStatus?.initialized,
    result,
  ]);

  const handleInitialize = async () => {
    if (!hostConfig.hostRoot) return;
    await executeInit(hostConfig.hostRoot, effectiveAddonName);
  };

  const handleDoctor = async () => {
    if (!hostConfig.hostRoot) return;
    await executeDoctor(hostConfig.hostRoot);
  };

  const handleInstall = async () => {
    if (!hostConfig.hostRoot) return;
    await executeInstall(hostConfig.hostRoot);
  };

  const handleRepairBuild = async () => {
    if (!hostConfig.hostRoot) return;
    await executeRepairBuild(hostConfig.hostRoot);
  };

  const handleLaunch = async () => {
    if (!hostConfig.hostRoot) return;
    await executeLaunch(hostConfig.hostRoot, effectiveAddonName, effectiveMapName);
  };

  return (
    <div className="pt-2 border-t border-white/10 space-y-2">
      <div className="flex items-center gap-2">
        <Terminal className="h-3.5 w-3.5 text-[#6366f1]" />
        <span className="text-[10px] text-white/50 uppercase tracking-wider">
          运行操作
        </span>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={handleInitialize}
          disabled={!canInitialize || isRunning}
          data-testid="initialize-button"
          className={cn(
            "px-3 py-2 rounded text-xs font-medium transition-colors",
            canInitialize
              ? "bg-[#6366f1] hover:bg-[#6366f1]/80 text-white"
              : "bg-[#6366f1]/20 text-[#6366f1]/50 cursor-not-allowed"
          )}
          title={canInitialize ? "初始化宿主项目" : "宿主无效，或已经初始化"}
        >
          {isRunning && currentCommand === 'init' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : null}
          初始化
        </Button>
        <Button
          onClick={handleInstall}
          disabled={!hostConfig.hostValid || !hostConfig.integrationStatus?.initialized || isRunning}
          className={cn(
            "px-3 py-2 rounded text-xs font-medium transition-colors",
            hostConfig.hostValid && hostConfig.integrationStatus?.initialized
              ? "bg-[#2563eb] hover:bg-[#2563eb]/80 text-white"
              : "bg-[#2563eb]/20 text-[#2563eb]/50 cursor-not-allowed"
          )}
        >
          {isRunning && currentCommand === "install" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <HardDriveDownload className="h-3.5 w-3.5 mr-1" />
          )}
          安装依赖
        </Button>
        <Button
          onClick={handleRepairBuild}
          disabled={!canRepairBuild || isRunning}
          className={cn(
            "px-3 py-2 rounded text-xs font-medium transition-colors",
            canRepairBuild
              ? "bg-[#1f6feb] hover:bg-[#1f6feb]/80 text-white"
              : "bg-[#1f6feb]/20 text-[#1f6feb]/50 cursor-not-allowed"
          )}
        >
          {isRunning && currentCommand === "repair-build" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
          )}
          修复并构建
        </Button>
        <Button
          onClick={handleDoctor}
          disabled={!canInspect || isRunning}
          className={cn(
            "px-3 py-2 rounded text-xs font-medium transition-colors",
            canInspect
              ? "bg-[#9e6a03] hover:bg-[#9e6a03]/80 text-white"
              : "bg-[#9e6a03]/20 text-[#9e6a03]/50 cursor-not-allowed"
          )}
        >
          {isRunning && currentCommand === "doctor" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : null}
          运行诊断
        </Button>
        <Button
          onClick={handleLaunch}
          disabled={!canLaunch || isRunning}
          className={cn(
            "col-span-2 px-3 py-2 rounded text-xs font-medium transition-colors",
            canLaunch
              ? "bg-[#0f766e] hover:bg-[#0f766e]/80 text-white"
              : "bg-[#0f766e]/20 text-[#0f766e]/50 cursor-not-allowed"
          )}
        >
          {isRunning && currentCommand === "launch" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <Play className="h-3.5 w-3.5 mr-1" />
          )}
          启动宿主
        </Button>
      </div>

      {preflightError && (
        <div className="rounded border border-[#da3633]/20 bg-[#da3633]/5 px-2.5 py-2">
          <p className="text-[10px] text-[#da3633]">无法完成启动前检查：{preflightError}</p>
        </div>
      )}

      {launchPreflight && !launchPreflight.ready && (
        <div className="rounded border border-[#9e6a03]/20 bg-[#9e6a03]/5 px-2.5 py-2">
          <p className="text-[10px] text-[#9e6a03] font-medium">启动已被拦住：先执行“修复并构建”</p>
          <ul className="mt-1 space-y-0.5">
            {launchPreflight.missingArtifacts.slice(0, 3).map((artifact) => (
              <li key={artifact} className="text-[9px] text-white/55">
                - {artifact}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-1 text-[9px] text-white/40">
        <p>
          {canInitialize
            ? `初始化会使用 addon 名称 "${effectiveAddonName}".`
            : !hostConfig.hostValid
            ? "请先配置有效的项目路径。"
            : !hostConfig.integrationStatus?.initialized
            ? "先完成初始化，再进行安装、修复构建和启动。"
            : "主链建议：安装依赖 -> 修复并构建 -> 运行诊断 -> 启动宿主。"}
        </p>
        <p>
          启动预览：<span className="text-white/60 font-mono">yarn launch {effectiveAddonName || "<addon>"} {effectiveMapName}</span>
        </p>
        <p>创建功能请使用中栏顶部的 Create。左栏只负责宿主接入、构建和启动。</p>
      </div>

      {/* CLI Output Panel */}
      <ExecutionOutputPanel
        isRunning={isRunning}
        status={status}
        output={output}
        result={result}
        error={error}
        maxHeight="200px"
        onClear={clearOutput}
      />

      {/* Status Badges */}
      <div className="flex items-center justify-center gap-1.5 pt-1">
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] bg-transparent",
            hostConfig.integrationStatus?.ready
              ? "border-[#238636]/30 text-[#238636]/60"
              : "border-white/10 text-white/30"
          )}
        >
          {hostConfig.integrationStatus?.ready ? "宿主已就绪" : "宿主未就绪"}
        </Badge>
        <Badge
          variant="outline"
          className="text-[9px] border-[#6366f1]/30 text-[#6366f1]/60 bg-transparent"
        >
          CLI 已连接
        </Badge>
      </div>
    </div>
  );
}

// Main Panel Component
export function ProjectSetupPanel() {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // 统一持有 useHostScanner 实例
  const hostScanner = useHostScanner();

  return (
    <div className="p-3 border-b border-white/10 bg-[#161b22]">
      {/* Panel Header */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-white/40">
              项目接入
            </span>
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-white/40" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-white/40" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-3 space-y-3">
          {/* Connected Mode Banner */}
          <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#238636]/5 border border-[#238636]/20">
            <CheckCircle2 className="h-3 w-3 text-[#238636]" />
            <span className="text-[10px] text-[#238636]/80">
              UI → CLI 桥接：所有操作通过 dota2-cli 执行
            </span>
          </div>

          {/* Configuration Sections */}
          <div className="space-y-2">
            <HostConfigSection hostScanner={hostScanner} />
            <ProjectNamingSection />
            <LaunchConfigSection />
            <IntegrationStatusSection hostScanner={hostScanner} />
          </div>

          {/* Next Action */}
          <NextActionSection hostScanner={hostScanner} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

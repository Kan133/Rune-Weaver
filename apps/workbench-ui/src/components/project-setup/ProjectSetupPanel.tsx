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

// Types for project setup state
interface ProjectConfig {
  projectName: string;
  addonName: string;
  namingStatus: "idle" | "validating" | "valid" | "invalid" | "conflict";
}

interface LaunchConfig {
  mapName: string;
  launchReadiness: "not_ready" | "partial" | "ready";
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
    if (isScanning) return "Scanning...";
    if (!hostConfig.hostRoot) return "Not configured";
    if (hostConfig.hostValid) return `Valid (${hostConfig.hostType})`;
    if (scanErrors.length > 0) return "Invalid path";
    return "Not configured";
  };

  const getStatus = (): "success" | "error" | "pending" | "idle" => {
    if (isScanning) return "pending";
    if (!hostConfig.hostRoot) return "idle";
    if (hostConfig.hostValid) return "success";
    if (scanErrors.length > 0) return "error";
    return "idle";
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <SectionHeader icon={FolderOpen} title="Host Configuration" isOpen={isOpen} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-white/40 uppercase tracking-wider">
              Host Root Path
            </label>
            <span className="text-[9px] text-white/30">Connected</span>
          </div>
          <Input
            value={hostConfig.hostRoot}
            onChange={(e) => handleHostRootChange(e.target.value)}
            placeholder="e.g., D:\\test1 (x-template project root)"
            data-testid="host-root-input"
            className="h-8 text-xs bg-[#252525] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#6366f1]"
          />
        </div>
        
        {/* Scan Errors Display */}
        {scanErrors.length > 0 && (
          <div className="p-2 rounded bg-[#da3633]/5 border border-[#da3633]/20">
            <p className="text-[10px] text-[#da3633] font-medium mb-1">Scan Errors:</p>
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
  const [projectConfig, setProjectConfig] = useState<ProjectConfig>({
    projectName: "",
    addonName: "",
    namingStatus: "idle",
  });

  const handleProjectNameChange = (value: string) => {
    setProjectConfig((prev) => ({
      ...prev,
      projectName: value,
      namingStatus: value ? "validating" : "idle",
    }));

    if (value) {
      setTimeout(() => {
        setProjectConfig((prev) => ({
          ...prev,
          namingStatus: /^[a-z][a-z0-9_]*$/.test(value) ? "valid" : "invalid",
        }));
      }, 300);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <SectionHeader icon={Box} title="Project Naming" isOpen={isOpen} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-white/40 uppercase tracking-wider">
              Project Name
            </label>
            <span className="text-[9px] text-white/30">Not connected to CLI</span>
          </div>
          <Input
            value={projectConfig.projectName}
            onChange={(e) => handleProjectNameChange(e.target.value)}
            placeholder="my_addon"
            className="h-8 text-xs bg-[#252525] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#6366f1]"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-white/40 uppercase tracking-wider">
              Addon Name (optional)
            </label>
            <span className="text-[9px] text-white/30">Not connected to CLI</span>
          </div>
          <Input
            value={projectConfig.addonName}
            onChange={(e) =>
              setProjectConfig((prev) => ({ ...prev, addonName: e.target.value }))
            }
            placeholder="My Addon"
            className="h-8 text-xs bg-[#252525] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#6366f1]"
          />
        </div>
        <StatusIndicator
          status={
            projectConfig.namingStatus === "valid"
              ? "success"
              : projectConfig.namingStatus === "invalid"
              ? "error"
              : projectConfig.namingStatus === "validating"
              ? "pending"
              : "idle"
          }
          label={
            projectConfig.namingStatus === "valid"
              ? "Valid naming"
              : projectConfig.namingStatus === "invalid"
              ? "Invalid format (use snake_case)"
              : projectConfig.namingStatus === "validating"
              ? "Validating..."
              : "Not configured"
          }
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

// Launch Config Section
function LaunchConfigSection() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <SectionHeader icon={Play} title="Launch Configuration" isOpen={isOpen} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-white/40 uppercase tracking-wider">
              Map Name
            </label>
            <span className="text-[9px] text-[#9e6a03]">Deferred to Phase 4</span>
          </div>
          <Input
            disabled
            value=""
            placeholder="Feature coming in Phase 4"
            className="h-8 text-xs bg-[#252525] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#6366f1]"
          />
        </div>
        <StatusIndicator
          status="idle"
          label="Deferred to Phase 4"
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

// Integration Status Section - Connected to real host-status scanner
function IntegrationStatusSection({ hostScanner }: { hostScanner: ReturnType<typeof useHostScanner> }) {
  const [isOpen, setIsOpen] = useState(true);
  const { hostConfig, setIntegrationStatus } = useFeatureStore();
  const { checkStatus, hostStatus, isScanning, statusErrors } = hostScanner;

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
    { key: "initialized", label: "Initialized", hint: "项目已初始化" },
    { key: "namespaceReady", label: "Namespace", hint: "目录结构就绪" },
    { key: "workspaceReady", label: "Workspace", hint: "配置已加载" },
    { key: "serverBridge", label: "Server", hint: "服务端桥接" },
    { key: "uiBridge", label: "UI Bridge", hint: "界面桥接" },
    { key: "ready", label: "Ready", hint: "可以创建功能" },
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
        <SectionHeader icon={Layers} title="Integration Status" isOpen={isOpen} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        {/* Status Errors Display */}
        {statusErrors.length > 0 && (
          <div className="p-2 rounded bg-[#da3633]/5 border border-[#da3633]/20 mb-2">
            <p className="text-[10px] text-[#da3633] font-medium mb-1">Status Errors:</p>
            <ul className="space-y-0.5">
              {statusErrors.map((error, idx) => (
                <li key={idx} className="text-[9px] text-white/50">{error}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <RefreshCw className={cn("h-3 w-3 text-[#6366f1]", isScanning && "animate-spin")} />
            <span className="text-[9px] text-white/30">
              {isScanning ? "Checking..." : "Connected to host-status scanner"}
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
            disabled={isScanning || !hostConfig.hostValid}
          >
            Refresh
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
  const { executeInit, executeRun, isRunning, status, currentCommand, output, result, error, clearOutput } = useCLIExecutor();
  const { checkStatus } = hostScanner;
  const [prompt, setPrompt] = useState("");

  const canInitialize = hostConfig.hostValid && !hostConfig.integrationStatus?.initialized;
  const canCreate = hostConfig.integrationStatus?.ready || false;

  // Refresh host status after init completes successfully
  useEffect(() => {
    if (result?.success && result.command === 'init' && hostConfig.hostRoot) {
      checkStatus(hostConfig.hostRoot);
    }
  }, [result, hostConfig.hostRoot, checkStatus]);

  const handleInitialize = async () => {
    if (!hostConfig.hostRoot) return;
    await executeInit(hostConfig.hostRoot);
  };

  const handleCreate = async () => {
    if (!hostConfig.hostRoot || !prompt) return;
    // Default to dry-run mode for safety
    await executeRun(hostConfig.hostRoot, prompt, false);
  };

  return (
    <div className="pt-2 border-t border-white/10 space-y-2">
      <div className="flex items-center gap-2">
        <Terminal className="h-3.5 w-3.5 text-[#6366f1]" />
        <span className="text-[10px] text-white/50 uppercase tracking-wider">
          Next Action
        </span>
      </div>

      {/* Operation Flow Guide */}
      <div className="text-[9px] text-white/40 space-y-0.5 mb-2">
        <p>Step 1: 输入项目路径 → 自动扫描验证</p>
        <p>Step 2: 点击 Initialize → 创建命名空间和配置</p>
        <p>Step 3: 输入需求 → 点击 Create 生成功能</p>
      </div>

      {/* Feature Prompt Input */}
      <div className="space-y-1.5">
        <label className="text-[10px] text-white/40 uppercase tracking-wider">
          Feature Prompt
        </label>
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='e.g., 做一个按Q键的冲刺技能'
          data-testid="feature-prompt-input"
          className="h-8 text-xs bg-[#252525] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#6366f1]"
        />
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
          title={canInitialize ? "Initialize host project" : "Host not valid or already initialized"}
        >
          {isRunning && currentCommand === 'init' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : null}
          Initialize
        </Button>
        {!canInitialize && (
          <p className="text-[9px] text-white/40 mt-1">
            {!hostConfig.hostValid 
              ? "请先配置有效的项目路径" 
              : "项目已初始化，无需重复操作"}
          </p>
        )}
        <Button
          onClick={handleCreate}
          disabled={!canCreate || isRunning || !prompt}
          data-testid="create-dry-run-button"
          className={cn(
            "px-3 py-2 rounded text-xs font-medium transition-colors",
            canCreate && prompt
              ? "bg-[#238636] hover:bg-[#238636]/80 text-white"
              : "bg-[#238636]/20 text-[#238636]/50 cursor-not-allowed"
          )}
          title={canCreate ? "Create feature (dry-run mode)" : "Host not fully ready"}
        >
          {isRunning && currentCommand === 'run' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : null}
          Create (Dry-run)
        </Button>
        {!canCreate && hostConfig.integrationStatus && (
          <p className="text-[9px] text-white/40 mt-1">
            {!hostConfig.integrationStatus.ready
              ? "请先完成项目初始化"
              : "请输入功能需求描述"}
          </p>
        )}
        <p className="text-[9px] text-white/30 text-center mt-1">
          Dry-run: 预览生成结果，不写入文件
        </p>
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
          {hostConfig.integrationStatus?.ready ? "Host Ready" : "Host Not Ready"}
        </Badge>
        <Badge
          variant="outline"
          className="text-[9px] border-[#6366f1]/30 text-[#6366f1]/60 bg-transparent"
        >
          CLI Connected
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
              Project Setup
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
              UI → CLI Bridge: 所有操作通过 dota2-cli 执行
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

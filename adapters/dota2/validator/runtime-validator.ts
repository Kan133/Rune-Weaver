/**
 * Host Runtime Validation
 *
 * T094-T096: 最小 runtime validation
 *
 * 本模块提供宿主运行时前验证能力：
 * - Server 侧：TypeScriptToLua 编译检查
 * - UI 侧：TypeScript/Webpack 编译检查
 *
 * 重要约束：
 * - 不伪装成"真实启动 Dota2"
 * - 只做最小编译检查
 * - 如果某一侧无法验证，明确报告限制
 */

import { exec } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { promisify } from "util";
import {
  buildExternalRuntimeDiagnosticLimitation,
  extractDiagnosticFileFromMessage,
  partitionRuntimeValidationDiagnostics,
} from "./runtime-validation-scope.js";

const execAsync = promisify(exec);

export interface RuntimeValidationResult {
  side: "server" | "ui";
  success: boolean;
  checked: boolean;
  checkedFiles: string[];
  errorCount: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  limitations: string[];
  duration: number;
}

export interface ValidationError {
  file: string;
  line?: number;
  column?: number;
  message: string;
  code?: string;
}

export interface ValidationWarning {
  file: string;
  line?: number;
  message: string;
}

export interface RuntimeValidationArtifact {
  version: string;
  generatedAt: string;
  hostRoot: string;
  server: RuntimeValidationResult;
  ui: RuntimeValidationResult;
  overall: {
    success: boolean;
    serverPassed: boolean;
    uiPassed: boolean;
    checked: boolean;
    limitations: string[];
  };
}

export async function validateServerRuntime(
  hostRoot: string
): Promise<RuntimeValidationResult> {
  const startTime = Date.now();
  const result: RuntimeValidationResult = {
    side: "server",
    success: false,
    checked: false,
    checkedFiles: [],
    errorCount: 0,
    errors: [],
    warnings: [],
    limitations: [],
    duration: 0,
  };

  const tsconfigPath = join(hostRoot, "game/scripts/tsconfig.json");
  const runeWeaverDir = join(hostRoot, "game/scripts/src/rune_weaver");

  if (!existsSync(tsconfigPath)) {
    result.limitations.push("Server tsconfig.json not found");
    result.duration = Date.now() - startTime;
    return result;
  }

  if (!existsSync(runeWeaverDir)) {
    result.limitations.push("Rune Weaver server directory not found");
    result.duration = Date.now() - startTime;
    return result;
  }

  const nodeModulesPath = join(hostRoot, "node_modules");
  if (!existsSync(nodeModulesPath)) {
    result.limitations.push("Dependencies not installed (node_modules not found). Run 'yarn install' first.");
    result.duration = Date.now() - startTime;
    return result;
  }

  try {
    let stdout = "";
    let stderr = "";
    
    try {
      const result = await execAsync(
        "node node_modules/typescript-to-lua/dist/tstl.js --project game/scripts/tsconfig.json",
        {
          cwd: hostRoot,
          timeout: 120000,
        }
      );
      stdout = result.stdout || "";
      stderr = result.stderr || "";
    } catch (execError) {
      const err = execError as { stdout?: string; stderr?: string; message?: string };
      stdout = err.stdout || "";
      stderr = err.stderr || "";
      if (!stdout && !stderr && err.message) {
        throw execError;
      }
    }

    result.checked = true;
    result.success = true;

    const output = stdout + stderr;
    if (output && output.trim().length > 0) {
      const parsedErrors = parseTypeScriptErrors(output, hostRoot);
      applyScopedDiagnostics(result, parsedErrors, "server", hostRoot);
    }

    result.checkedFiles = findCheckedFiles(runeWeaverDir);

  } catch (error) {
    result.checked = true;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorObj = error as { stdout?: string; stderr?: string };
    
    const fullOutput = [errorMessage, errorObj.stdout || "", errorObj.stderr || ""].join("\n");
    const parsedErrors = parseTypeScriptErrors(fullOutput, hostRoot);
    result.success = true;
    applyScopedDiagnostics(result, parsedErrors, "server", hostRoot);

    if (result.errors.length > 0) {
      result.success = false;
    } else {
      result.limitations.push(`Server validation failed: ${errorMessage.split("\n").slice(0, 3).join("; ")}`);
      result.checked = false;
    }
  }

  result.duration = Date.now() - startTime;
  return result;
}

export async function validateUIRuntime(
  hostRoot: string
): Promise<RuntimeValidationResult> {
  const startTime = Date.now();
  const result: RuntimeValidationResult = {
    side: "ui",
    success: false,
    checked: false,
    checkedFiles: [],
    errorCount: 0,
    errors: [],
    warnings: [],
    limitations: [],
    duration: 0,
  };

  const tsconfigPath = join(hostRoot, "content/panorama/tsconfig.json");
  const runeWeaverDir = join(hostRoot, "content/panorama/src/rune_weaver");

  if (!existsSync(tsconfigPath)) {
    result.limitations.push("UI tsconfig.json not found");
    result.duration = Date.now() - startTime;
    return result;
  }

  if (!existsSync(runeWeaverDir)) {
    result.limitations.push("Rune Weaver UI directory not found");
    result.duration = Date.now() - startTime;
    return result;
  }

  const nodeModulesPath = join(hostRoot, "node_modules");
  if (!existsSync(nodeModulesPath)) {
    result.limitations.push("Dependencies not installed (node_modules not found). Run 'yarn install' first.");
    result.duration = Date.now() - startTime;
    return result;
  }

  try {
    let stdout = "";
    let stderr = "";
    
    try {
      const result = await execAsync(
        "node node_modules/typescript/bin/tsc --noEmit --project content/panorama/tsconfig.json",
        {
          cwd: hostRoot,
          timeout: 120000,
        }
      );
      stdout = result.stdout || "";
      stderr = result.stderr || "";
    } catch (execError) {
      const err = execError as { stdout?: string; stderr?: string; message?: string };
      stdout = err.stdout || "";
      stderr = err.stderr || "";
      if (!stdout && !stderr && err.message) {
        throw execError;
      }
    }

    result.checked = true;
    result.success = true;

    const output = stdout + stderr;
    if (output && output.trim().length > 0) {
      const parsedErrors = parseTypeScriptErrors(output, hostRoot);
      applyScopedDiagnostics(result, parsedErrors, "ui", hostRoot);
    }

    result.checkedFiles = findCheckedFiles(runeWeaverDir);

  } catch (error) {
    result.checked = true;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorObj = error as { stdout?: string; stderr?: string };
    
    const fullOutput = [errorMessage, errorObj.stdout || "", errorObj.stderr || ""].join("\n");
    const parsedErrors = parseTypeScriptErrors(fullOutput, hostRoot);
    result.success = true;
    applyScopedDiagnostics(result, parsedErrors, "ui", hostRoot);

    if (result.errors.length > 0) {
      result.success = false;
    } else {
      result.limitations.push(`UI validation failed: ${errorMessage.split("\n").slice(0, 3).join("; ")}`);
      result.checked = false;
    }
  }

  result.duration = Date.now() - startTime;
  return result;
}

export async function validateHostRuntime(
  hostRoot: string
): Promise<RuntimeValidationArtifact> {
  const [serverResult, uiResult] = await Promise.all([
    validateServerRuntime(hostRoot),
    validateUIRuntime(hostRoot),
  ]);

  const limitations: string[] = [];
  if (serverResult.limitations.length > 0) {
    limitations.push(...serverResult.limitations.map((l) => `Server: ${l}`));
  }
  if (uiResult.limitations.length > 0) {
    limitations.push(...uiResult.limitations.map((l) => `UI: ${l}`));
  }

  const overall = {
    success: serverResult.success && uiResult.success,
    serverPassed: serverResult.success,
    uiPassed: uiResult.success,
    checked: serverResult.checked || uiResult.checked,
    limitations,
  };

  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    hostRoot,
    server: serverResult,
    ui: uiResult,
    overall,
  };
}

function parseTypeScriptErrors(
  output: string,
  hostRoot: string
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const lines = output.split("\n");
  const errorPattern1 = /^(.+?)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)$/;
  const errorPattern2 = /^(.+?):(\d+):(\d+)\s*-\s*error\s+(TS\d+):\s*(.+)$/;
  const errorPattern3 = /^error\s+(TSTL):\s*(.+)$/;
  const errorPattern4 = /^error\s+(TSTL):\s*(.+)/;
  const warningPattern = /^(.+?)\((\d+),(\d+)\):\s*warning\s+(TS\d+):\s*(.+)$/;

  for (const line of lines) {
    let errorMatch = line.match(errorPattern1);
    if (errorMatch) {
      const [, file, lineNum, column, code, message] = errorMatch;
      const relativePath = file.replace(hostRoot, "").replace(/^[\/\\]/, "");

      errors.push({
        file: relativePath,
        line: parseInt(lineNum, 10),
        column: parseInt(column, 10),
        code,
        message,
      });
      continue;
    }

    errorMatch = line.match(errorPattern2);
    if (errorMatch) {
      const [, file, lineNum, column, code, message] = errorMatch;
      const relativePath = file.replace(hostRoot, "").replace(/^[\/\\]/, "");

      errors.push({
        file: relativePath,
        line: parseInt(lineNum, 10),
        column: parseInt(column, 10),
        code,
        message,
      });
      continue;
    }

    errorMatch = line.match(errorPattern3);
    if (errorMatch) {
      const [, code, message] = errorMatch;

      errors.push({
        file: extractDiagnosticFileFromMessage(message) || "",
        line: 0,
        column: 0,
        code,
        message,
      });
      continue;
    }

    errorMatch = line.match(errorPattern4);
    if (errorMatch) {
      const [, code, message] = errorMatch;

      errors.push({
        file: extractDiagnosticFileFromMessage(message) || "",
        line: 0,
        column: 0,
        code,
        message,
      });
      continue;
    }

    const warningMatch = line.match(warningPattern);
    if (warningMatch) {
      const [, file, lineNum, , , message] = warningMatch;
      const relativePath = file.replace(hostRoot, "").replace(/^[\/\\]/, "");

      warnings.push({
        file: relativePath,
        line: parseInt(lineNum, 10),
        message,
      });
    }
  }

  return { errors, warnings };
}

function applyScopedDiagnostics(
  result: RuntimeValidationResult,
  parsedDiagnostics: { errors: ValidationError[]; warnings: ValidationWarning[] },
  side: "server" | "ui",
  hostRoot: string,
): void {
  const scopedErrors = partitionRuntimeValidationDiagnostics(parsedDiagnostics.errors, side, hostRoot);
  const scopedWarnings = partitionRuntimeValidationDiagnostics(parsedDiagnostics.warnings, side, hostRoot);
  const externalLimitation = buildExternalRuntimeDiagnosticLimitation(
    scopedErrors.external,
    side,
    hostRoot,
  );

  result.errors = scopedErrors.relevant;
  result.warnings = scopedWarnings.relevant;
  result.errorCount = scopedErrors.relevant.length;

  if (externalLimitation) {
    result.limitations.push(externalLimitation);
  }

  if (result.errorCount > 0) {
    result.success = false;
  }
}

function findCheckedFiles(dir: string): string[] {
  const files: string[] = [];

  if (!existsSync(dir)) {
    return files;
  }

  try {
    const { readdirSync, statSync } = require("fs");
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...findCheckedFiles(fullPath));
      } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
        files.push(fullPath);
      }
    }
  } catch {
    // Ignore errors
  }

  return files;
}

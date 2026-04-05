/**
 * Dota2 Adapter - Host Validator
 * 
 * Dota2 特定的宿主验证
 * 与新版 SCHEMA.md 对齐
 */

import { AssemblyPlan, ValidationIssue, SelectedPattern } from "../../../core/schema/types";
import { dota2Patterns, Dota2PatternMeta } from "../patterns";

export interface Dota2ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  hostSpecific: {
    serverFiles: string[];
    panoramaFiles: string[];
    configFiles: string[];
  };
}

export function validateDota2AssemblyPlan(plan: AssemblyPlan): Dota2ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const serverFiles: string[] = [];
  const panoramaFiles: string[] = [];
  const configFiles: string[] = [];

  for (const binding of plan.selectedPatterns) {
    const patternMeta = dota2Patterns.find((p) => p.id === binding.patternId);

    if (!patternMeta) {
      errors.push({
        code: `MISSING_DOTA2_BINDING_${binding.patternId}`,
        scope: "host",
        severity: "error",
        message: `Pattern '${binding.patternId}' has no Dota2 binding implementation`,
        path: `selectedPatterns.${binding.role}`,
      });
      continue;
    }

    const paramIssues = validatePatternParams(binding, patternMeta);
    errors.push(...paramIssues.errors);
    warnings.push(...paramIssues.warnings);

    const fileName = binding.role.replace(/\s+/g, "_").toLowerCase();
    switch (patternMeta.hostTarget) {
      case "dota2.server":
        serverFiles.push(`${fileName}.ts`);
        if (patternMeta.dota2Params?.requiresAbility) {
          serverFiles.push(`${fileName}_ability.ts`);
        }
        if (patternMeta.dota2Params?.requiresModifier) {
          serverFiles.push(`${fileName}_modifier.ts`);
        }
        break;
      case "dota2.panorama":
        panoramaFiles.push(`${fileName}.tsx`);
        if (patternMeta.dota2Params?.requiresPanel) {
          panoramaFiles.push(`${fileName}.less`);
        }
        break;
      case "dota2.shared":
        serverFiles.push(`${fileName}.ts`);
        break;
      case "dota2.config":
        configFiles.push(`${fileName}.kv`);
        break;
    }
  }

  const hostIssues = validateHostConstraints(plan);
  errors.push(...hostIssues.errors);
  warnings.push(...hostIssues.warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    hostSpecific: { serverFiles, panoramaFiles, configFiles },
  };
}

function validatePatternParams(
  binding: SelectedPattern,
  meta: Dota2PatternMeta
): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const params = binding.parameters || {};

  for (const input of meta.inputs) {
    if (input.required && !(input.name in params)) {
      errors.push({
        code: `MISSING_PARAM_${binding.role}_${input.name}`,
        scope: "host",
        severity: "error",
        message: `Pattern '${binding.patternId}' requires parameter '${input.name}'`,
        path: `selectedPatterns.${binding.role}.parameters`,
      });
    }
  }

  return { errors, warnings };
}

function validateHostConstraints(plan: AssemblyPlan): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const hasServerCode = plan.selectedPatterns.some((b) => {
    const meta = dota2Patterns.find((p) => p.id === b.patternId);
    return meta?.hostTarget === "dota2.server";
  });

  const hasInputBinding = plan.selectedPatterns.some((b) =>
    b.patternId.startsWith("input.")
  );

  if (hasServerCode && !hasInputBinding) {
    warnings.push({
      code: "SERVER_WITHOUT_INPUT",
      scope: "host",
      severity: "warning",
      message: "AssemblyPlan has server logic but no input binding",
      path: "selectedPatterns",
    });
  }

  const hasUI = plan.selectedPatterns.some((b) => b.patternId.startsWith("ui."));
  const hasServerSupport = plan.selectedPatterns.some((b) => {
    const meta = dota2Patterns.find((p) => p.id === b.patternId);
    return meta?.hostTarget === "dota2.server";
  });

  if (hasUI && !hasServerSupport) {
    warnings.push({
      code: "UI_WITHOUT_SERVER",
      scope: "host",
      severity: "warning",
      message: "AssemblyPlan has UI but no server logic support",
      path: "selectedPatterns",
    });
  }

  return { errors, warnings };
}

export function printDota2ValidationReport(result: Dota2ValidationResult): string {
  const lines: string[] = [];

  lines.push("=".repeat(60));
  lines.push("Dota2 Host Validation Report");
  lines.push("=".repeat(60));
  lines.push(`\nResult: ${result.valid ? "PASS" : "FAIL"}`);
  lines.push(`Errors: ${result.errors.length}, Warnings: ${result.warnings.length}`);

  lines.push("\n--- Output Files ---");
  lines.push("Server:");
  for (const file of result.hostSpecific.serverFiles) {
    lines.push(`  - ${file}`);
  }
  lines.push("Panorama:");
  for (const file of result.hostSpecific.panoramaFiles) {
    lines.push(`  - ${file}`);
  }
  lines.push("Config:");
  for (const file of result.hostSpecific.configFiles) {
    lines.push(`  - ${file}`);
  }

  if (result.errors.length > 0) {
    lines.push("\n--- Errors ---");
    for (const error of result.errors) {
      lines.push(`[${error.code}] ${error.message}`);
      if (error.path) {
        lines.push(`  Path: ${error.path}`);
      }
    }
  }

  if (result.warnings.length > 0) {
    lines.push("\n--- Warnings ---");
    for (const warning of result.warnings) {
      lines.push(`[${warning.code}] ${warning.message}`);
    }
  }

  lines.push("\n" + "=".repeat(60));
  return lines.join("\n");
}

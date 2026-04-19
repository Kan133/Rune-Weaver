/**
 * Rune Weaver - Assembly Plan Validator
 *
 * 验证 AssemblyPlan 的完整性和可执行性
 */

import {
  AssemblyPlan,
  SelectedPattern,
  WriteTarget,
  BridgeUpdate,
  ValidationIssue,
} from "../schema/types";

/**
 * AssemblyPlan 验证结果
 */
export interface AssemblyValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  stats: AssemblyStats;
}

/**
 * Assembly 统计
 */
export interface AssemblyStats {
  patternCount: number;
  requiredPatternCount: number;
  preferredPatternCount: number;
  writeTargetCount: number;
  bridgeUpdateCount: number;
}

/**
 * 验证 AssemblyPlan
 */
export function validateAssemblyPlan(plan: AssemblyPlan): AssemblyValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // 1. 验证 selectedPatterns
  const patternIssues = validateSelectedPatterns(plan);
  errors.push(...patternIssues.errors);
  warnings.push(...patternIssues.warnings);

  // 2. 验证 writeTargets
  const targetIssues = validateWriteTargets(plan.writeTargets);
  errors.push(...targetIssues.errors);
  warnings.push(...targetIssues.warnings);

  // 3. 验证 bridgeUpdates
  const bridgeIssues = validateBridgeUpdates(plan.bridgeUpdates || []);
  errors.push(...bridgeIssues.errors);
  warnings.push(...bridgeIssues.warnings);

  // 4. 验证 validations（validation contracts 是描述性的，不直接作为 actual errors）
  const validationIssues = validateValidations(plan.validations);
  errors.push(...validationIssues.errors);
  warnings.push(...validationIssues.warnings);

  // 5. 验证一致性
  const consistencyIssues = validateConsistency(plan);
  errors.push(...consistencyIssues.errors);
  warnings.push(...consistencyIssues.warnings);

  const stats = calculateStats(plan);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats,
  };
}

/**
 * 验证 selectedPatterns
 */
function validateSelectedPatterns(plan: AssemblyPlan): {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
} {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const patterns = plan.selectedPatterns;

  // 检查非空
  if (patterns.length === 0) {
    const hasModuleTruth =
      (plan.moduleRecords?.length || 0) > 0
      || (plan.modules?.length || 0) > 0
      || (plan.synthesizedArtifacts?.length || 0) > 0;
    (hasModuleTruth ? warnings : errors).push({
      code: "EMPTY_SELECTED_PATTERNS",
      scope: "assembly",
      severity: hasModuleTruth ? "warning" : "error",
      message: hasModuleTruth
        ? "AssemblyPlan has no selected reusable patterns, but module-level truth/artifact synthesis is present"
        : "AssemblyPlan must have at least one selected pattern",
    });
    if (hasModuleTruth) {
      return { errors, warnings };
    }
    return { errors, warnings };
  }

  // 检查重复
  const patternIds = new Set<string>();
  for (const p of patterns) {
    if (patternIds.has(p.patternId)) {
      errors.push({
        code: "DUPLICATE_PATTERN",
        scope: "assembly",
        severity: "error",
        message: `Duplicate pattern: ${p.patternId}`,
        path: `selectedPatterns.${p.patternId}`,
      });
    }
    patternIds.add(p.patternId);

    // 检查必需字段
    if (!p.patternId || p.patternId.trim() === "") {
      errors.push({
        code: "MISSING_PATTERN_ID",
        scope: "assembly",
        severity: "error",
        message: "Pattern ID is required",
      });
    }

    if (!p.role || p.role.trim() === "") {
      warnings.push({
        code: "MISSING_PATTERN_ROLE",
        scope: "assembly",
        severity: "warning",
        message: `Pattern ${p.patternId} has no role assigned`,
        path: `selectedPatterns.${p.patternId}.role`,
      });
    }
  }

  // 检查核心 pattern
  const hasTrigger = patterns.some((p) => p.patternId.startsWith("input."));
  const hasEffect = patterns.some((p) => p.patternId.startsWith("effect."));
  const hasData = patterns.some((p) => p.patternId.startsWith("data."));

  if (!hasTrigger && !hasEffect) {
    warnings.push({
      code: "MISSING_CORE_PATTERN",
      scope: "assembly",
      severity: "warning",
      message: "No trigger or effect pattern found. This may be a passive system.",
    });
  }

  if (hasTrigger && hasData && !hasEffect) {
    warnings.push({
      code: "TRIGGER_DATA_WITHOUT_EFFECT",
      scope: "assembly",
      severity: "warning",
      message: "Trigger and data patterns found but no effect pattern. Check if outcome is defined.",
    });
  }

  return { errors, warnings };
}

/**
 * 验证 writeTargets
 */
function validateWriteTargets(targets: WriteTarget[]): {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
} {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const validTargets: WriteTarget["target"][] = ["server", "shared", "ui", "config"];

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];

    if (!validTargets.includes(target.target)) {
      errors.push({
        code: "INVALID_WRITE_TARGET",
        scope: "assembly",
        severity: "error",
        message: `Invalid write target: ${target.target}`,
        path: `writeTargets[${i}].target`,
      });
    }

    if (!target.path || target.path.trim() === "") {
      errors.push({
        code: "MISSING_TARGET_PATH",
        scope: "assembly",
        severity: "error",
        message: `Write target path is required`,
        path: `writeTargets[${i}].path`,
      });
    }

    if (!target.summary || target.summary.trim() === "") {
      warnings.push({
        code: "MISSING_TARGET_SUMMARY",
        scope: "assembly",
        severity: "warning",
        message: `Write target summary is recommended`,
        path: `writeTargets[${i}].summary`,
      });
    }
  }

  return { errors, warnings };
}

/**
 * 验证 bridgeUpdates
 */
function validateBridgeUpdates(updates: BridgeUpdate[]): {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
} {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const validTargets: BridgeUpdate["target"][] = ["server", "ui"];
  const validActions: BridgeUpdate["action"][] = ["create", "refresh", "inject_once"];

  for (let i = 0; i < updates.length; i++) {
    const update = updates[i];

    if (!validTargets.includes(update.target)) {
      errors.push({
        code: "INVALID_BRIDGE_TARGET",
        scope: "assembly",
        severity: "error",
        message: `Invalid bridge target: ${update.target}`,
        path: `bridgeUpdates[${i}].target`,
      });
    }

    if (!validActions.includes(update.action)) {
      errors.push({
        code: "INVALID_BRIDGE_ACTION",
        scope: "assembly",
        severity: "error",
        message: `Invalid bridge action: ${update.action}`,
        path: `bridgeUpdates[${i}].action`,
      });
    }

    if (!update.file || update.file.trim() === "") {
      errors.push({
        code: "MISSING_BRIDGE_FILE",
        scope: "assembly",
        severity: "error",
        message: `Bridge update file is required`,
        path: `bridgeUpdates[${i}].file`,
      });
    }
  }

  return { errors, warnings };
}

/**
 * 验证 validations (Validation Contracts)
 * 
 * Validation contracts 是描述性的，声明"需要满足什么条件"
 * 不直接作为 actual errors，而是用于记录和验证
 */
function validateValidations(validations: AssemblyPlan["validations"]): {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
} {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const validScopes: ValidationIssue["scope"][] = ["schema", "blueprint", "assembly", "host"];

  for (let i = 0; i < validations.length; i++) {
    const v = validations[i];

    if (!validScopes.includes(v.scope)) {
      errors.push({
        code: "INVALID_VALIDATION_SCOPE",
        scope: "assembly",
        severity: "error",
        message: `Invalid validation scope: ${v.scope}`,
        path: `validations[${i}].scope`,
      });
    }

    if (!v.rule || v.rule.trim() === "") {
      errors.push({
        code: "MISSING_VALIDATION_RULE",
        scope: "assembly",
        severity: "error",
        message: `Validation rule is required`,
        path: `validations[${i}].rule`,
      });
    }

    // 检查 validation contract 的 severity 是否为 error
    // 这表示该条件必须满足，如果未满足应视为问题
    if (v.severity === "error") {
      // 这是一个"必须满足的条件"，但只是标记，实际错误应在其他地方生成
      // 这里只记录，不产生 actual error
      warnings.push({
        code: "VALIDATION_CONTRACT_REQUIRES_CONDITION",
        scope: "assembly",
        severity: "warning",
        message: `Validation contract requires condition to be met: ${v.rule}`,
        path: `validations[${i}]`,
      });
    }
  }

  return { errors, warnings };
}

/**
 * 验证一致性
 */
function validateConsistency(plan: AssemblyPlan): {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
} {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // 检查 readyForHostWrite 与错误状态一致
  // 注意：validation contracts 的 severity 不等于 actual errors
  // actual errors 应该在 selectedPatterns、writeTargets 等验证中生成
  const hasValidationContractErrors = plan.validations.some((v) => v.severity === "error");
  const hasUnresolvedContracts = hasValidationContractErrors && 
    plan.validations.some(v => v.rule.includes("could not be resolved"));

  // readyForHostWrite 为 true 但存在 unresolved contracts（catalog 外 pattern）
  if (plan.readyForHostWrite && hasUnresolvedContracts) {
    errors.push({
      code: "READY_WITH_UNRESOLVED",
      scope: "assembly",
      severity: "error",
      message: "readyForHostWrite is true but has unresolved patterns. This is a contradiction.",
    });
  }

  // readyForHostWrite 为 false 但没有 actual errors（可能有 unresolved patterns）
  if (!plan.readyForHostWrite && plan.selectedPatterns.length > 0 && !hasUnresolvedContracts) {
    warnings.push({
      code: "NOT_READY_WITHOUT_ERRORS",
      scope: "assembly",
      severity: "warning",
      message: "readyForHostWrite is false but no blocking errors found. Check if manual review is needed.",
    });
  }

  // 检查 pattern 与 writeTargets 一致性
  const hasServerPattern = plan.selectedPatterns.some((p) =>
    ["input.", "effect.", "rule.", "resource."].some((prefix) =>
      p.patternId.startsWith(prefix)
    )
  );
  const hasServerTarget = plan.writeTargets.some((t) => t.target === "server");

  if (hasServerPattern && !hasServerTarget) {
    warnings.push({
      code: "SERVER_PATTERN_WITHOUT_TARGET",
      scope: "assembly",
      severity: "warning",
      message: "Server patterns selected but no server write target defined",
    });
  }

  const hasUIPattern = plan.selectedPatterns.some((p) => p.patternId.startsWith("ui."));
  const hasUITarget = plan.writeTargets.some((t) => t.target === "ui");

  if (hasUIPattern && !hasUITarget) {
    warnings.push({
      code: "UI_PATTERN_WITHOUT_TARGET",
      scope: "assembly",
      severity: "warning",
      message: "UI patterns selected but no UI write target defined",
    });
  }

  return { errors, warnings };
}

/**
 * 计算统计
 */
function calculateStats(plan: AssemblyPlan): AssemblyStats {
  return {
    patternCount: plan.selectedPatterns.length,
    requiredPatternCount: 0, // Will be calculated when priority is tracked
    preferredPatternCount: 0,
    writeTargetCount: plan.writeTargets.length,
    bridgeUpdateCount: plan.bridgeUpdates?.length || 0,
  };
}

/**
 * 打印验证报告
 */
export function printAssemblyValidationReport(
  result: AssemblyValidationResult
): string {
  const lines: string[] = [];

  lines.push("=".repeat(60));
  lines.push("Assembly Plan Validation Report");
  lines.push("=".repeat(60));

  lines.push(`\nResult: ${result.valid ? "PASS" : "FAIL"}`);
  lines.push(`Errors: ${result.errors.length}, Warnings: ${result.warnings.length}`);

  lines.push("\n--- Stats ---");
  lines.push(`Patterns: ${result.stats.patternCount}`);
  lines.push(`Write Targets: ${result.stats.writeTargetCount}`);
  lines.push(`Bridge Updates: ${result.stats.bridgeUpdateCount}`);

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

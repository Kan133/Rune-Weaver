/**
 * Rune Weaver - Schema Validator
 * 
 * 对 IntentSchema 进行结构验证
 * 返回统一的 ValidationIssue 格式
 * 与 docs/SCHEMA.md 4.2 节对齐
 */

import { IntentSchema, ValidationIssue } from "../schema/types";

/**
 * 验证 IntentSchema 的结构完整性
 * @param schema 待验证的 IntentSchema
 * @returns ValidationIssue[] 问题列表，空数组表示验证通过
 */
export function validateIntentSchema(schema: IntentSchema): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. 验证 classification.intentKind 是否存在且合法
  const intentKindIssue = validateIntentKind(schema);
  if (intentKindIssue) {
    issues.push(intentKindIssue);
  }

  // 2. 验证 requirements.functional 是否为空
  const functionalIssues = validateFunctionalRequirements(schema);
  issues.push(...functionalIssues);

  // 3. 验证 isReadyForBlueprint 与 openQuestions 是否矛盾
  const completionIssue = validateCompletionState(schema);
  if (completionIssue) {
    issues.push(completionIssue);
  }

  // 4. 验证 request.goal 是否存在
  const goalIssue = validateGoal(schema);
  if (goalIssue) {
    issues.push(goalIssue);
  }

  // 5. 验证 version 是否存在
  const versionIssue = validateVersion(schema);
  if (versionIssue) {
    issues.push(versionIssue);
  }

  return issues;
}

/**
 * 验证意图分类是否有效
 */
function validateIntentKind(schema: IntentSchema): ValidationIssue | null {
  const validKinds = [
    "micro-feature",
    "standalone-system",
    "cross-system-composition",
    "ui-surface",
    "unknown",
  ];

  const { intentKind } = schema.classification;

  if (!intentKind) {
    return {
      code: "MISSING_INTENT_KIND",
      scope: "schema",
      severity: "error",
      message: "classification.intentKind 必须存在",
      path: "classification.intentKind",
    };
  }

  if (!validKinds.includes(intentKind)) {
    return {
      code: "INVALID_INTENT_KIND",
      scope: "schema",
      severity: "error",
      message: `classification.intentKind '${intentKind}' 不是合法的意图类型`,
      path: "classification.intentKind",
    };
  }

  return null;
}

/**
 * 验证功能需求是否为空
 */
function validateFunctionalRequirements(schema: IntentSchema): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { functional } = schema.requirements;

  if (!functional || functional.length === 0) {
    issues.push({
      code: "EMPTY_FUNCTIONAL_REQUIREMENTS",
      scope: "schema",
      severity: "error",
      message: "requirements.functional 不能为空，至少需要一项功能需求",
      path: "requirements.functional",
    });
    return issues;
  }

  // 验证每个功能需求是否为非空字符串
  for (let i = 0; i < functional.length; i++) {
    const req = functional[i];
    
    if (!req || typeof req !== "string" || req.trim() === "") {
      issues.push({
        code: `INVALID_FUNCTIONAL_REQ_${i}`,
        scope: "schema",
        severity: "error",
        message: `requirements.functional[${i}] 必须是非空字符串`,
        path: `requirements.functional[${i}]`,
      });
    }
  }

  return issues;
}

/**
 * 验证完成状态是否自洽
 * 检查：isReadyForBlueprint 为 true 时，不应存在 openQuestions
 */
function validateCompletionState(schema: IntentSchema): ValidationIssue | null {
  const { isReadyForBlueprint } = schema;
  const { openQuestions } = schema;

  if (isReadyForBlueprint && openQuestions.length > 0) {
    return {
      code: "CONTRADICTORY_COMPLETION_STATE",
      scope: "schema",
      severity: "error",
      message: `isReadyForBlueprint 为 true，但存在 ${openQuestions.length} 个未解决问题`,
      path: "isReadyForBlueprint",
    };
  }

  // 额外检查：isReadyForBlueprint 为 true 但 functional 为空的情况
  if (isReadyForBlueprint && (!schema.requirements.functional || schema.requirements.functional.length === 0)) {
    return {
      code: "READY_BUT_NO_FUNCTIONAL",
      scope: "schema",
      severity: "error",
      message: "isReadyForBlueprint 为 true，但 functional 需求为空",
      path: "isReadyForBlueprint",
    };
  }

  // 警告：isReadyForBlueprint 为 false 但没有 openQuestions
  if (!isReadyForBlueprint && openQuestions.length === 0) {
    return {
      code: "NOT_READY_BUT_NO_QUESTIONS",
      scope: "schema",
      severity: "warning",
      message: "isReadyForBlueprint 为 false，但 openQuestions 为空",
      path: "isReadyForBlueprint",
    };
  }

  return null;
}

/**
 * 验证 goal 是否存在
 */
function validateGoal(schema: IntentSchema): ValidationIssue | null {
  if (!schema.request.goal || schema.request.goal.trim() === "") {
    return {
      code: "MISSING_GOAL",
      scope: "schema",
      severity: "error",
      message: "request.goal 不能为空",
      path: "request.goal",
    };
  }

  return null;
}

/**
 * 验证版本号
 */
function validateVersion(schema: IntentSchema): ValidationIssue | null {
  if (!schema.version) {
    return {
      code: "MISSING_VERSION",
      scope: "schema",
      severity: "warning",
      message: "version 字段未设置",
      path: "version",
    };
  }

  return null;
}

/**
 * 获取验证摘要
 * @param issues 验证问题列表
 * @returns 摘要信息
 */
export function getValidationSummary(issues: ValidationIssue[]): {
  valid: boolean;
  errorCount: number;
  warningCount: number;
} {
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return {
    valid: errorCount === 0,
    errorCount,
    warningCount,
  };
}

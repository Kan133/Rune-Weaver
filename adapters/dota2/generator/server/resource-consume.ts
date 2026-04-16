/**
 * Resource Consume Generator
 *
 * Generates a narrow server-side resource consumer for effect.resource_consume.
 * This slice stays honest by auto-binding to a same-feature resource.basic_pool
 * companion when present and deferring unsupported standalone shapes upstream.
 */

import { WritePlanEntry } from "../../assembler/index.js";

export interface ResourceConsumeParams {
  amount?: number | string;
  resourceType?: string;
  failBehavior?: string;
}

interface ResourceConsumeCompositionMetadata {
  resourcePoolImportPath?: string;
  resourcePoolTargetPath?: string;
  resourcePoolClassName?: string;
  resourcePoolResourceId?: string;
  resourceCostComposition?: string;
}

function toPositiveNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

function toStringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function parseFailBehavior(value: unknown): "block" | "report" {
  const raw = toStringValue(value, "block").toLowerCase();

  if (raw === "report") {
    return "report";
  }

  if (raw === "block") {
    return "block";
  }

  throw new Error(
    `effect.resource_consume only supports failBehavior "block" or "report" in the current admitted slice (received "${raw}")`
  );
}

export function generateResourceConsumeCode(
  className: string,
  featureId: string,
  entry: WritePlanEntry
): string {
  const caseParams = (entry.parameters || {}) as ResourceConsumeParams;
  const composition = (entry.metadata || {}) as ResourceConsumeCompositionMetadata;
  const amount = toPositiveNumber(caseParams.amount, 1);
  const resourceType = toStringValue(caseParams.resourceType, "mana");
  const failBehavior = parseFailBehavior(caseParams.failBehavior);
  const hasAutoComposition =
    composition.resourceCostComposition === "feature-local-auto-bind" &&
    typeof composition.resourcePoolImportPath === "string" &&
    composition.resourcePoolImportPath.length > 0 &&
    typeof composition.resourcePoolClassName === "string" &&
    composition.resourcePoolClassName.length > 0;
  const importBlock = hasAutoComposition
    ? `import { ${composition.resourcePoolClassName} } from "${composition.resourcePoolImportPath}";\n\n`
    : "";
  const compositionNote = hasAutoComposition
    ? ` * - composition: auto-bind to ${composition.resourcePoolClassName} (${composition.resourcePoolTargetPath})\n`
    : " * - composition: no same-feature resource.basic_pool companion metadata was provided\n";
  const ensureBindingBlock = hasAutoComposition
    ? `    const pool = ${composition.resourcePoolClassName}.getInstance();
    if (typeof pool.supportsResource === "function" && !pool.supportsResource("${resourceType}")) {
      print(
        "[Rune Weaver] ${className} companion pool rejected resourceType ${resourceType}; composition metadata is inconsistent"
      );
      this.clearPool();
      return;
    }
    this.bindPool(pool);
`
    : "    return;\n";
  const registerNote = hasAutoComposition
    ? `"[Rune Weaver] ${className} registered (auto-bound to resource.basic_pool:${resourceType})"`
    : `"[Rune Weaver] ${className} registered (requires resource.basic_pool binding before use)"`;

  return `${importBlock}/**
 * ${className}
 * Resource consume runtime for effect.resource_consume.
 *
 * This is a family-specific materialization for the admitted resource/cost slice.
 * It does not create a generic bridge or generic resource framework.
 * It only auto-composes when the same feature provides a compatible resource.basic_pool companion.
 *
 * Config:
 * - featureId: "${featureId}"
 * - amount: ${amount}
 * - resourceType: "${resourceType}"
 * - failBehavior: "${failBehavior}"
${compositionNote} */

interface ResourcePoolLike {
  hasEnough?(playerId: number, amount: number): boolean;
  consume?(playerId: number, amount: number): boolean;
  getCurrent?(playerId: number): number;
  supportsResource?(resourceType: string): boolean;
}

export interface ResourceConsumeResult {
  success: boolean;
  remaining: number;
  requested: number;
  resourceType: string;
  reason?: "missing_pool" | "invalid_amount" | "insufficient_resource" | "unsupported_pool_surface";
}

export class ${className} {
  private static instance: ${className};
  private resourcePool?: ResourcePoolLike;
  private readonly configuredAmount: number = ${amount};
  private readonly resourceType: string = "${resourceType}";
  private readonly failBehavior: "block" | "report" = "${failBehavior}";

  static getInstance(): ${className} {
    if (!${className}.instance) {
      ${className}.instance = new ${className}();
    }
    return ${className}.instance;
  }

  bindPool(pool: ResourcePoolLike): void {
    this.resourcePool = pool;
    print(\`[Rune Weaver] ${className}: bound resource pool for \${this.resourceType}\`);
  }

  clearPool(): void {
    this.resourcePool = undefined;
  }

  hasBoundPool(): boolean {
    this.ensureComposedPoolBinding();
    return this.resourcePool !== undefined;
  }

  ensureComposedPoolBinding(): void {
    if (this.resourcePool) {
      return;
    }
${ensureBindingBlock}  }

  consumeConfiguredAmount(playerId: number): ResourceConsumeResult {
    this.ensureComposedPoolBinding();
    return this.tryConsume(playerId, this.configuredAmount);
  }

  tryConsume(playerId: number, amount: number = this.configuredAmount): ResourceConsumeResult {
    this.ensureComposedPoolBinding();
    if (amount <= 0) {
      return this.buildFailure(amount, this.readRemaining(playerId), "invalid_amount");
    }

    if (!this.resourcePool) {
      return this.buildFailure(amount, 0, "missing_pool");
    }

    const remainingBefore = this.readRemaining(playerId);
    const canConsume =
      typeof this.resourcePool.hasEnough === "function"
        ? this.resourcePool.hasEnough(playerId, amount)
        : remainingBefore >= amount;

    if (!canConsume) {
      return this.buildFailure(amount, remainingBefore, "insufficient_resource");
    }

    if (typeof this.resourcePool.consume !== "function") {
      return this.buildFailure(amount, remainingBefore, "unsupported_pool_surface");
    }

    const success = this.resourcePool.consume(playerId, amount);
    const remaining = this.readRemaining(playerId);

    if (!success) {
      return this.buildFailure(amount, remaining, "unsupported_pool_surface");
    }

    return {
      success: true,
      remaining,
      requested: amount,
      resourceType: this.resourceType,
    };
  }

  private readRemaining(playerId: number): number {
    if (!this.resourcePool || typeof this.resourcePool.getCurrent !== "function") {
      return 0;
    }

    return this.resourcePool.getCurrent(playerId);
  }

  private buildFailure(
    amount: number,
    remaining: number,
    reason: ResourceConsumeResult["reason"]
  ): ResourceConsumeResult {
    if (this.failBehavior === "report") {
      print(
        \`[Rune Weaver] ${className}: consume failed (\${reason}) for \${this.resourceType}, requested=\${amount}, remaining=\${remaining}\`
      );
    }

    return {
      success: false,
      remaining,
      requested: amount,
      resourceType: this.resourceType,
      reason,
    };
  }
}

export function register${className}(): void {
  const consumer = ${className}.getInstance();
  consumer.ensureComposedPoolBinding();
  print(${registerNote});
}
`;
}

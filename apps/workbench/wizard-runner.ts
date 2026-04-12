import { runWizardToIntentSchema } from "../../core/wizard/index.js";
import type { WizardIntentOptions } from "../../core/wizard/index.js";
import type { IntentSchema } from "../../core/schema/types.js";
import type { WizardDegradationInfo } from "./types.js";

export interface WizardRunResult {
  wizardResult: Awaited<ReturnType<typeof runWizardToIntentSchema>>;
  wizardDegradation?: WizardDegradationInfo;
}

function createFallbackSchema(userRequest: string): IntentSchema {
  return {
    version: "1.0",
    host: {
      kind: "dota2-x-template",
    },
    request: {
      rawPrompt: userRequest,
      goal: `Partial feature based on: "${userRequest.substring(0, 50)}..."`,
    },
    classification: {
      intentKind: "unknown",
      confidence: "low",
    },
    requirements: {
      functional: [],
    },
    constraints: {
      nonFunctional: [],
    },
    uiRequirements: {
      needed: false,
    },
    normalizedMechanics: {},
    openQuestions: [],
    resolvedAssumptions: [],
    isReadyForBlueprint: false,
  };
}

export async function runWorkbenchWizard(
  userRequest: string,
  wizardOptions: WizardIntentOptions,
): Promise<WizardRunResult> {
  console.log("\n[Main Wizard] Running wizard to generate IntentSchema...");

  const forceDegrade = process.env.RW_FORCE_WIZARD_DEGRADE === "1";

  if (forceDegrade) {
    const forcedError = new Error("FORCED_WIZARD_DEGRADATION: Debug validation hook triggered");
    console.log("\n⚠️ [Main Wizard] Forced degradation triggered by RW_FORCE_WIZARD_DEGRADE=1");

    return {
      wizardResult: {
        valid: false,
        schema: createFallbackSchema(userRequest),
        issues: [{
          severity: "error" as const,
          code: "WIZARD_FORCED_DEGRADATION",
          scope: "schema" as const,
          message: forcedError.message,
        }],
      },
      wizardDegradation: {
        status: "partial",
        reason: "Forced degradation for local validation (RW_FORCE_WIZARD_DEGRADE=1)",
        availableObjects: [
          "featureIdentity",
          "featureOwnership",
          "integrationPoints",
          "conflictResult",
          "knownInputs",
          "featureCard",
          "featureDetail",
          "lifecycleActions",
          "actionRoute",
        ],
      },
    };
  }

  try {
    const wizardResult = await runWizardToIntentSchema(wizardOptions);
    return {
      wizardResult,
      wizardDegradation: {
        status: "none",
        reason: "Wizard completed successfully",
        availableObjects: ["schema", "issues"],
      },
    };
  } catch (wizardError) {
    const errorMessage = wizardError instanceof Error ? wizardError.message : String(wizardError);
    const isOverload = errorMessage.includes("429") ||
      errorMessage.includes("overload") ||
      errorMessage.includes("Overloaded");

    console.log(`\n⚠️ [Main Wizard] Wizard failed: ${errorMessage}`);

    return {
      wizardResult: {
        valid: false,
        schema: createFallbackSchema(userRequest),
        issues: [{
          severity: "error" as const,
          code: isOverload ? "WIZARD_OVERLOAD" : "WIZARD_ERROR",
          scope: "schema" as const,
          message: errorMessage,
        }],
      },
      wizardDegradation: {
        status: "partial",
        reason: isOverload
          ? "Wizard overloaded (429), lifecycle objects may still render"
          : `Wizard failed: ${errorMessage}, lifecycle objects may still render`,
        availableObjects: [
          "featureIdentity",
          "featureOwnership",
          "integrationPoints",
          "conflictResult",
          "knownInputs",
          "featureCard",
          "featureDetail",
          "lifecycleActions",
          "actionRoute",
        ],
      },
    };
  }
}

export function printWizardDegradation(
  wizardResult: Awaited<ReturnType<typeof runWizardToIntentSchema>>,
  wizardDegradation?: WizardDegradationInfo,
): void {
  if (wizardDegradation && wizardDegradation.status !== "none") {
    console.log("\n" + "=".repeat(60));
    console.log("⚠️ WIZARD DEGRADATION STATUS");
    console.log("=".repeat(60));
    console.log(`   Status: ${wizardDegradation.status.toUpperCase()}`);
    console.log(`   Reason: ${wizardDegradation.reason}`);
    console.log(`   Available Objects: ${(wizardDegradation.availableObjects ?? []).join(", ") || "(none)"}`);
    console.log("=".repeat(60));
  } else if (!wizardResult.valid) {
    console.log("\n[Main Wizard] Wizard generated issues:");
    for (const issue of wizardResult.issues || []) {
      console.log(`  - ${issue.severity}: ${issue.message}`);
    }
  }
}

import { createInterface } from "readline";

import type {
  CurrentFeatureContext,
  IntentSchema,
  HostDescriptor,
  PromptConstraintBundle,
  RetrievalBundle,
  RelationCandidate,
  UpdateIntent,
  ValidationIssue,
  WizardClarificationAuthority,
  WizardClarificationPlan,
  WorkspaceSemanticContext,
} from "../../../core/schema/types.js";
import type { LLMClient } from "../../../core/llm/types.js";
import type { WizardRefinementContext } from "../../../core/wizard/types.js";
import {
  analyzeIntentSemanticLayers,
  buildWizardClarificationPlan,
  deriveWizardClarificationAuthority,
  resolveRelationCandidates,
  runWizardToIntentSchema,
  runWizardToUpdateIntent,
} from "../../../core/wizard/index.js";
import type { IntentSemanticAnalysis } from "../../../core/wizard/index.js";
import { loadWorkspaceSemanticContext } from "../../../core/workspace/index.js";

interface SharedWizardInput {
  client: LLMClient;
  rawText: string;
  model?: string;
  temperature?: number;
  providerOptions?: Record<string, unknown>;
  hostRoot?: string;
  allowInteractive?: boolean;
}

function buildWizardHostDescriptor(hostRoot?: string) {
  return hostRoot
    ? {
        kind: "dota2-x-template" as const,
        projectRoot: hostRoot,
      }
    : undefined;
}

function resolveWizardHostDescriptor(hostRoot?: string): HostDescriptor {
  return buildWizardHostDescriptor(hostRoot) ?? { kind: "dota2-x-template" as const };
}

export interface WizardFlowResult {
  schema: IntentSchema;
  semanticAnalysis?: IntentSemanticAnalysis;
  clarificationPlan?: WizardClarificationPlan;
  clarificationAuthority: WizardClarificationAuthority;
  relationCandidates?: RelationCandidate[];
  workspaceSemanticContext?: WorkspaceSemanticContext;
  promptPackageId?: string;
  promptConstraints?: PromptConstraintBundle;
  retrievalBundle?: RetrievalBundle;
  issues: ValidationIssue[];
  valid: boolean;
  usedFallback: boolean;
  requiresClarification: boolean;
}

export interface UpdateWizardFlowResult extends WizardFlowResult {
  currentFeatureContext: CurrentFeatureContext;
}

function detectWizardFallback(issues: ValidationIssue[]): boolean {
  return issues.some((issue) =>
    issue.code === "WIZARD_GENERIC_FALLBACK" || issue.code === "UPDATE_WIZARD_GENERIC_FALLBACK",
  );
}

function shouldRunInteractiveClarification(
  allowInteractive: boolean | undefined,
  clarificationPlan: WizardClarificationPlan | undefined,
): boolean {
  return Boolean(
    allowInteractive
      && clarificationPlan?.questions.length
      && process.stdin.isTTY
      && process.stdout.isTTY,
  );
}

async function askQuestion(
  rl: ReturnType<typeof createInterface>,
  prompt: string,
): Promise<string> {
  return new Promise((resolveAnswer) => {
    rl.question(prompt, resolveAnswer);
  });
}

async function collectClarificationAnswers(
  clarificationPlan: WizardClarificationPlan,
): Promise<Array<{ questionId: string; question: string; answer: string }>> {
  const transcript: Array<{ questionId: string; question: string; answer: string }> = [];
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log("");
    console.log("🧭 Rune Weaver 需要几条高信号补充信息来稳定语义解释：");
    for (const question of clarificationPlan.questions) {
      const answer = await askQuestion(rl, `- ${question.question}\n> `);
      if (!answer.trim()) {
        continue;
      }
      transcript.push({
        questionId: question.id,
        question: question.question,
        answer: answer.trim(),
      });
    }
  } finally {
    rl.close();
  }

  return transcript;
}

function resolveWorkspaceSemanticContext(hostRoot?: string): WorkspaceSemanticContext | undefined {
  if (!hostRoot) {
    return undefined;
  }
  const loaded = loadWorkspaceSemanticContext(hostRoot);
  return loaded.success ? loaded.context : undefined;
}

function buildClarificationState(input: {
  rawText: string;
  schema: IntentSchema;
  semanticAnalysis?: IntentSemanticAnalysis;
  hostRoot?: string;
  currentFeatureContext?: CurrentFeatureContext;
}): {
  workspaceSemanticContext?: WorkspaceSemanticContext;
  relationCandidates?: RelationCandidate[];
  clarificationPlan?: WizardClarificationPlan;
  clarificationAuthority: WizardClarificationAuthority;
} {
  const workspaceSemanticContext = resolveWorkspaceSemanticContext(input.hostRoot);
  const relationCandidates = resolveRelationCandidates({
    rawText: input.rawText,
    schema: input.schema,
    workspaceSemanticContext,
  });
  const clarificationPlan = buildWizardClarificationPlan({
    rawText: input.rawText,
    schema: input.schema,
    semanticAnalysis: input.semanticAnalysis,
    currentFeatureContext: input.currentFeatureContext,
    workspaceSemanticContext,
    relationCandidates,
  });

  return {
    ...(workspaceSemanticContext ? { workspaceSemanticContext } : {}),
    ...(relationCandidates.length > 0 ? { relationCandidates } : {}),
    ...(clarificationPlan ? { clarificationPlan } : {}),
    clarificationAuthority: deriveWizardClarificationAuthority(clarificationPlan),
  };
}

export async function resolveCreateWizardFlow(
  input: SharedWizardInput,
): Promise<WizardFlowResult> {
  let refinementContext: WizardRefinementContext | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await runWizardToIntentSchema({
      client: input.client,
      input: {
        rawText: input.rawText,
        host: buildWizardHostDescriptor(input.hostRoot),
        model: input.model,
        temperature: input.temperature,
        providerOptions: input.providerOptions,
        refinementContext,
      },
    });
    const semanticAnalysis = analyzeIntentSemanticLayers(
      result.schema,
      input.rawText,
      resolveWizardHostDescriptor(input.hostRoot),
    );
    const clarificationState = buildClarificationState({
      rawText: input.rawText,
      schema: result.schema,
      semanticAnalysis,
      hostRoot: input.hostRoot,
    });

    if (!shouldRunInteractiveClarification(input.allowInteractive, clarificationState.clarificationPlan)) {
      return {
        schema: result.schema,
        semanticAnalysis,
        issues: result.issues,
        valid: result.valid,
        usedFallback: detectWizardFallback(result.issues),
        requiresClarification: Boolean(clarificationState.clarificationPlan?.questions.length),
        promptPackageId: result.interpretation.promptPackageId,
        promptConstraints: result.interpretation.promptConstraints,
        retrievalBundle: result.interpretation.retrievalBundle,
        ...clarificationState,
      };
    }

    const transcript = await collectClarificationAnswers(clarificationState.clarificationPlan!);
    if (transcript.length === 0) {
      return {
        schema: result.schema,
        semanticAnalysis,
        issues: result.issues,
        valid: result.valid,
        usedFallback: detectWizardFallback(result.issues),
        requiresClarification: true,
        promptPackageId: result.interpretation.promptPackageId,
        promptConstraints: result.interpretation.promptConstraints,
        retrievalBundle: result.interpretation.retrievalBundle,
        ...clarificationState,
      };
    }

    refinementContext = {
      priorSchema: result.schema,
      clarificationTranscript: transcript,
    };
  }

  const finalResult = await runWizardToIntentSchema({
    client: input.client,
    input: {
      rawText: input.rawText,
      host: buildWizardHostDescriptor(input.hostRoot),
      model: input.model,
      temperature: input.temperature,
      providerOptions: input.providerOptions,
      refinementContext,
    },
  });
  const semanticAnalysis = analyzeIntentSemanticLayers(
    finalResult.schema,
    input.rawText,
    resolveWizardHostDescriptor(input.hostRoot),
  );
  const clarificationState = buildClarificationState({
    rawText: input.rawText,
    schema: finalResult.schema,
    semanticAnalysis,
    hostRoot: input.hostRoot,
  });

  return {
    schema: finalResult.schema,
    semanticAnalysis,
    issues: finalResult.issues,
    valid: finalResult.valid,
    usedFallback: detectWizardFallback(finalResult.issues),
    requiresClarification: Boolean(clarificationState.clarificationPlan?.questions.length),
    promptPackageId: finalResult.interpretation.promptPackageId,
    promptConstraints: finalResult.interpretation.promptConstraints,
    retrievalBundle: finalResult.interpretation.retrievalBundle,
    ...clarificationState,
  };
}

export async function resolveUpdateWizardFlow(
  input: SharedWizardInput & {
    currentFeatureContext: CurrentFeatureContext;
  },
): Promise<UpdateWizardFlowResult & { updateIntent: UpdateIntent }> {
  let refinementContext: WizardRefinementContext | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await runWizardToUpdateIntent({
      client: input.client,
      input: {
        rawText: input.rawText,
        currentFeatureContext: input.currentFeatureContext,
        host: buildWizardHostDescriptor(input.hostRoot),
        model: input.model,
        temperature: input.temperature,
        providerOptions: input.providerOptions,
        refinementContext,
      },
    });
    const clarificationState = buildClarificationState({
      rawText: input.rawText,
      schema: result.requestedChange,
      hostRoot: input.hostRoot,
      currentFeatureContext: input.currentFeatureContext,
    });

    if (!shouldRunInteractiveClarification(input.allowInteractive, clarificationState.clarificationPlan)) {
      return {
        schema: result.requestedChange,
        currentFeatureContext: input.currentFeatureContext,
        updateIntent: result.updateIntent,
        issues: result.issues,
        valid: result.valid,
        usedFallback: detectWizardFallback(result.issues),
        requiresClarification: Boolean(clarificationState.clarificationPlan?.questions.length),
        promptPackageId: result.interpretation.promptPackageId,
        promptConstraints: result.interpretation.promptConstraints,
        retrievalBundle: result.interpretation.retrievalBundle,
        ...clarificationState,
      };
    }

    const transcript = await collectClarificationAnswers(clarificationState.clarificationPlan!);
    if (transcript.length === 0) {
      return {
        schema: result.requestedChange,
        currentFeatureContext: input.currentFeatureContext,
        updateIntent: result.updateIntent,
        issues: result.issues,
        valid: result.valid,
        usedFallback: detectWizardFallback(result.issues),
        requiresClarification: true,
        promptPackageId: result.interpretation.promptPackageId,
        promptConstraints: result.interpretation.promptConstraints,
        retrievalBundle: result.interpretation.retrievalBundle,
        ...clarificationState,
      };
    }

    refinementContext = {
      priorSchema: result.requestedChange,
      clarificationTranscript: transcript,
    };
  }

  const finalResult = await runWizardToUpdateIntent({
    client: input.client,
    input: {
      rawText: input.rawText,
      currentFeatureContext: input.currentFeatureContext,
      host: buildWizardHostDescriptor(input.hostRoot),
      model: input.model,
      temperature: input.temperature,
      providerOptions: input.providerOptions,
      refinementContext,
    },
  });
  const clarificationState = buildClarificationState({
    rawText: input.rawText,
    schema: finalResult.requestedChange,
    hostRoot: input.hostRoot,
    currentFeatureContext: input.currentFeatureContext,
  });

  return {
    schema: finalResult.requestedChange,
    currentFeatureContext: input.currentFeatureContext,
    updateIntent: finalResult.updateIntent,
    issues: finalResult.issues,
    valid: finalResult.valid,
    usedFallback: detectWizardFallback(finalResult.issues),
    requiresClarification: Boolean(clarificationState.clarificationPlan?.questions.length),
    promptPackageId: finalResult.interpretation.promptPackageId,
    promptConstraints: finalResult.interpretation.promptConstraints,
    retrievalBundle: finalResult.interpretation.retrievalBundle,
    ...clarificationState,
  };
}

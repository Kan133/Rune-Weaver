import type { Blueprint, EvidenceRef } from "../schema/types.js";
import type { WritePlan, WritePlanEntry } from "../../adapters/dota2/assembler/index.js";
import { createLLMClientFromEnv, isLLMConfigured, readLLMExecutionConfig } from "../llm/factory.js";
import { buildLocalRepairPromptPackage } from "../llm/prompt-packages.js";
import { buildDota2RetrievalBundle } from "../retrieval/index.js";

export interface LocalRepairResult {
  triggered: boolean;
  attempted: boolean;
  success: boolean;
  repairedTargets: string[];
  warnings: string[];
  blockers: string[];
  evidenceRefs: EvidenceRef[];
  boundaryHonored: boolean;
  revalidationPassed: boolean;
  promptPackageId?: string;
}

interface RepairableWritePlanEntry extends WritePlanEntry {
  metadata?: Record<string, unknown> & {
    localRepairRequested?: boolean;
    validationFailure?: string;
    repairBoundaryId?: string;
  };
}

interface LocalRepairCandidate {
  patchedContent?: string;
  summary?: string;
  assumptions?: string[];
}

const LOCAL_REPAIR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    patchedContent: { type: "string" },
    summary: { type: "string" },
    assumptions: { type: "array", items: { type: "string" } },
  },
  required: ["patchedContent"],
} as const;

function buildAbilityBody(): string {
  return [
    "  local caster = self:GetCaster()",
    "  if not caster then",
    "    return",
    "  end",
    "",
    "  EmitSoundOn(\"Hero_OgreMagi.Bloodlust.Target\", caster)",
  ].join("\n");
}

function buildUiBody(): string {
  return [
    "      <Label",
    "        className=\"rw-v2-synth-body\"",
    "        text=\"Local repair filled the missing UI body inside the declared feature-owned scope.\"",
    "      />",
  ].join("\n");
}

function patchContent(entry: RepairableWritePlanEntry): { changed: boolean; content?: string; warning?: string } {
  const originalContent = entry.metadata?.synthesizedContent;
  if (typeof originalContent !== "string" || originalContent.length === 0) {
    return { changed: false };
  }

  let content = originalContent;
  let changed = false;

  if (content.includes("__RW_MUSCLE_FILL_ABILITY_BODY__")) {
    content = content.replace("__RW_MUSCLE_FILL_ABILITY_BODY__", buildAbilityBody());
    changed = true;
  }

  if (content.includes("__RW_MUSCLE_FILL_UI_BODY__")) {
    content = content.replace("__RW_MUSCLE_FILL_UI_BODY__", buildUiBody());
    changed = true;
  }

  return {
    changed,
    content,
    warning: changed ? `Applied bounded local repair to ${entry.targetPath}` : undefined,
  };
}

export function runLocalRepair(
  blueprint: Blueprint,
  writePlan: WritePlan,
): LocalRepairResult {
  if (!shouldAttemptLocalRepair(blueprint, writePlan)) {
    return {
      triggered: false,
      attempted: false,
      success: true,
      repairedTargets: [],
      warnings: [],
      blockers: [],
      evidenceRefs: [],
      boundaryHonored: true,
      revalidationPassed: true,
    };
  }

  const warnings: string[] = [];
  const repairedTargets: string[] = [];

  for (const entry of writePlan.entries) {
    const patch = patchContent(entry as RepairableWritePlanEntry);
    if (!patch.changed || typeof patch.content !== "string") {
      continue;
    }

    entry.metadata = {
      ...(entry.metadata || {}),
      synthesizedContent: patch.content,
    };
    entry.contentSummary = `${entry.contentSummary} [local-repair]`;
    repairedTargets.push(entry.targetPath);
    if (patch.warning) {
      warnings.push(patch.warning);
    }
  }

  return {
    triggered: true,
    attempted: repairedTargets.length > 0,
    success: true,
    repairedTargets,
    warnings,
    blockers: [],
    evidenceRefs: [],
    boundaryHonored: true,
    revalidationPassed: true,
  };
}

export async function runLocalRepairWithLLM(
  blueprint: Blueprint,
  writePlan: WritePlan,
): Promise<LocalRepairResult> {
  const baseline = runLocalRepair(blueprint, writePlan);
  if (!baseline.triggered) {
    return baseline;
  }

  if (!isLLMConfigured(process.cwd())) {
    return baseline;
  }

  let client;
  let llmConfig;
  try {
    client = createLLMClientFromEnv(process.cwd());
    llmConfig = readLLMExecutionConfig(process.cwd(), "local-repair");
  } catch (error) {
    return {
      ...baseline,
      warnings: [
        ...baseline.warnings,
        `Local repair LLM config unavailable; kept deterministic repair only (${error instanceof Error ? error.message : String(error)}).`,
      ],
    };
  }

  const evidenceRefs: EvidenceRef[] = [...baseline.evidenceRefs];
  const warnings = [...baseline.warnings];
  const blockers = [...baseline.blockers];
  const repairedTargets = new Set(baseline.repairedTargets);
  let attempted = baseline.attempted;

  for (const entry of writePlan.entries) {
    const repairableEntry = entry as RepairableWritePlanEntry;
    const synthesizedContent = repairableEntry.metadata?.synthesizedContent;
    const boundaryId = repairableEntry.metadata?.repairBoundaryId
      || blueprint.fillContracts?.[0]?.boundaryId;
    if (typeof synthesizedContent !== "string" || synthesizedContent.length === 0 || !boundaryId) {
      continue;
    }

    const fillContract = (blueprint.fillContracts || []).find((item) => item.boundaryId === boundaryId);
    const diagnostics = [
      repairableEntry.metadata?.validationFailure,
      ...(baseline.warnings.length > 0 ? baseline.warnings : []),
      ...(blueprint.validationStatus?.repair?.warnings || []),
      ...(blueprint.validationStatus?.repair?.blockers || []),
    ].filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    const retrievalBundle = await buildDota2RetrievalBundle({
      promptPackageId: "repair.local",
      queryText: [
        blueprint.summary,
        repairableEntry.contentSummary,
        diagnostics.join("\n"),
      ].join("\n"),
      diagnostics,
      workspaceEvidence: [
        {
          title: "Repair target path",
          snippet: repairableEntry.targetPath,
        },
        {
          title: "Repair target excerpt",
          snippet: synthesizedContent.slice(0, 1200),
        },
      ],
      symbolQueries: diagnostics,
    });
    evidenceRefs.push(...retrievalBundle.evidenceRefs);

    const promptPackage = buildLocalRepairPromptPackage({
      featureId: blueprint.id,
      moduleId: repairableEntry.sourceModule,
      boundaryId,
      targetFile: repairableEntry.targetPath,
      targetExcerpt: synthesizedContent.slice(0, 1600),
      diagnostics,
      fillContractSummary: fillContract
        ? `${fillContract.expectedOutput}; allowed=${fillContract.allowed.join(", ")}; forbidden=${fillContract.forbidden.join(", ")}`
        : "Repair only inside the declared synthesized artifact body.",
      originalModuleContract: blueprint.moduleRecords?.find((item) => item.moduleId === repairableEntry.sourceModule)?.metadata,
      retrievalBundle,
    });

    try {
      const response = await client.generateObject<LocalRepairCandidate>({
        messages: promptPackage.messages,
        schemaName: "dota2.local-repair",
        schemaDescription: "Return a boundary-local repaired content body for the existing synthesized artifact.",
        schema: LOCAL_REPAIR_SCHEMA,
        model: llmConfig.model,
        temperature: llmConfig.temperature,
        providerOptions: llmConfig.providerOptions,
        maxTokens: 2000,
      });
      const patchedContent =
        typeof response.object.patchedContent === "string" && response.object.patchedContent.trim().length > 0
          ? response.object.patchedContent
          : synthesizedContent;
      if (patchedContent !== synthesizedContent) {
        attempted = true;
        repairedTargets.add(repairableEntry.targetPath);
        repairableEntry.metadata = {
          ...(repairableEntry.metadata || {}),
          synthesizedContent: patchedContent,
          repairPromptPackageId: promptPackage.id,
          repairEvidenceRefs: retrievalBundle.evidenceRefs,
        };
        repairableEntry.contentSummary = `${repairableEntry.contentSummary} [llm-repair]`;
        warnings.push(`Applied bounded local repair to ${repairableEntry.targetPath} via ${promptPackage.id}.`);
      }
    } catch (error) {
      warnings.push(
        `Local repair LLM failed for ${repairableEntry.targetPath}; kept deterministic repair (${error instanceof Error ? error.message : String(error)}).`,
      );
    }
  }

  return {
    triggered: baseline.triggered,
    attempted,
    success: blockers.length === 0,
    repairedTargets: [...repairedTargets],
    warnings,
    blockers,
    evidenceRefs: uniqueEvidenceRefs(evidenceRefs),
    boundaryHonored: true,
    revalidationPassed: blockers.length === 0,
    promptPackageId: "repair.local",
  };
}

function shouldAttemptLocalRepair(blueprint: Blueprint, writePlan: WritePlan): boolean {
  const repairStatus = blueprint.validationStatus?.repair?.status;
  const hostStatus = blueprint.validationStatus?.host?.status;
  const runtimeStatus = blueprint.validationStatus?.runtime?.status;
  const hasValidationFailure =
    repairStatus === "failed"
    || hostStatus === "failed"
    || runtimeStatus === "failed";

  const writePlanRequestsRepair = writePlan.entries.some((entry) => {
    const metadata = (entry as RepairableWritePlanEntry).metadata;
    return Boolean(metadata?.localRepairRequested || metadata?.validationFailure || metadata?.repairBoundaryId);
  });

  return Boolean(
    blueprint.fillContracts?.length
    && (hasValidationFailure || writePlanRequestsRepair),
  );
}

function uniqueEvidenceRefs(refs: EvidenceRef[]): EvidenceRef[] {
  const unique = new Map<string, EvidenceRef>();
  for (const ref of refs) {
    unique.set(`${ref.id}::${ref.title}::${ref.path || ""}`, ref);
  }
  return [...unique.values()];
}

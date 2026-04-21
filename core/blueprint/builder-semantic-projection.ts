import type { BlueprintModule, IntentRequirement, IntentSchema, ModuleFacetSpec } from "../schema/types.js";
import {
  describeMechanicResponsibility,
  extractModuleParameters,
  getCanonicalPatternIds,
  inferCategoriesFromMechanics,
  inferCategoryFromRequirement,
  inferRoleFromCategory,
  resolveRequirementCategory,
  resolveRequirementParameters,
  resolveRequirementRole,
} from "./blueprint-semantic-shaping";
import { stripNegativeConstraintFragments } from "./semantic-lexical";
import { buildModulePlanning } from "./module-planning.js";
import { getIntentGovernanceView } from "../wizard/intent-governance-view.js";
import { classifySchedulerTimerRisk, detectSelectionFlowAsk } from "./seam-authority";

export interface BlueprintSemanticProjection {
  modules: BlueprintModule[];
  moduleFacets: ModuleFacetSpec[];
}

function getSchemaParameters(schema: IntentSchema): Record<string, unknown> {
  const params = (schema as IntentSchema & { parameters?: Record<string, unknown> }).parameters;
  return params && typeof params === "object" ? params : {};
}

function hasConcreteTriggerBinding(parameters: Record<string, unknown>): boolean {
  return Boolean(
    (typeof parameters.key === "string" && parameters.key.trim().length > 0)
    || (typeof parameters.triggerKey === "string" && parameters.triggerKey.trim().length > 0)
    || (typeof parameters.toKey === "string" && parameters.toKey.trim().length > 0),
  );
}

function upsertModule(modules: BlueprintModule[], newModule: BlueprintModule): void {
  const existingIndex = modules.findIndex(
    (module) => module.category === newModule.category && module.role === newModule.role,
  );

  if (existingIndex >= 0) {
    const existing = modules[existingIndex];
    const mergedResponsibilities = [...new Set([...existing.responsibilities, ...newModule.responsibilities])];
    const mergedParameters = {
      ...(existing.parameters || {}),
      ...(newModule.parameters || {}),
    };
    const existingPatternIds = existing.patternIds || [];
    const newPatternIds = newModule.patternIds || [];

    modules[existingIndex] = {
      ...existing,
      responsibilities: mergedResponsibilities,
      ...(Object.keys(mergedParameters).length > 0 ? { parameters: mergedParameters } : {}),
      patternIds: existingPatternIds.length > 0 ? existingPatternIds : newPatternIds,
    };
    return;
  }

  modules.push(newModule);
}

function createTypedRequirementModule(
  req: IntentRequirement,
  index: number,
  prefix: string,
  schemaParams: Record<string, unknown>,
  schema: IntentSchema,
): BlueprintModule | null {
  const category = resolveRequirementCategory(req, schema);
  const role = resolveRequirementRole(req, category, schema, [
    req.id,
    req.summary,
    ...(req.inputs || []),
    ...(req.outputs || []),
  ]);
  const parameters = resolveRequirementParameters(req, category, schemaParams, schema);
  if (category === "trigger" && !hasConcreteTriggerBinding(parameters)) {
    return null;
  }

  return {
    id: `${prefix}typed_${req.id || index}`,
    role,
    category,
    patternIds: getCanonicalPatternIds(category, role),
    responsibilities: [req.summary, ...new Set(req.invariants || [])],
    inputs: req.inputs,
    outputs: req.outputs,
    ...(Object.keys(parameters).length > 0 ? { parameters } : {}),
  };
}

function isNegativeConstraintRequirement(req: string): boolean {
  const normalized = req.trim().toLowerCase();
  return /^(?:(?:the|this)\s+feature\s+)?(?:do not|don't|must not|mustn't|should not|no\b|without\b|绂佹|涓嶈|涓嶉渶瑕亅鏃犻渶|鍒珅涓嶈兘|涓嶅彲|涓嶅緱)/iu.test(normalized);
}

function createFunctionalModule(
  req: string,
  index: number,
  prefix: string,
  schemaParams: Record<string, unknown>,
): BlueprintModule | null {
  const sanitizedRequirement = stripNegativeConstraintFragments(req);
  if (isNegativeConstraintRequirement(req) || sanitizedRequirement.length === 0) {
    return null;
  }

  const category = inferCategoryFromRequirement(sanitizedRequirement);
  const role = inferRoleFromCategory(category, [sanitizedRequirement]);
  const parameters = extractModuleParameters(category, schemaParams);
  if (category === "trigger" && !hasConcreteTriggerBinding(parameters)) {
    return null;
  }

  return {
    id: `${prefix}func_${index}`,
    role,
    category,
    patternIds: getCanonicalPatternIds(category, role),
    responsibilities: [sanitizedRequirement],
    ...(Object.keys(parameters).length > 0 ? { parameters } : {}),
  };
}

function extractTimingMechanicParameters(schema: IntentSchema): Record<string, unknown> {
  const parameters: Record<string, unknown> = {};
  const copyNumeric = (key: string, value: unknown): void => {
    if (typeof value === "number" && Number.isFinite(value)) {
      parameters[key] = value;
    }
  };

  copyNumeric("delaySeconds", schema.timing?.delaySeconds);
  copyNumeric("intervalSeconds", schema.timing?.intervalSeconds);
  copyNumeric("cooldownSeconds", schema.timing?.cooldownSeconds);

  for (const requirement of schema.requirements.typed || []) {
    const requirementParameters = requirement.parameters || {};
    copyNumeric("initialDelaySeconds", requirementParameters.initialDelaySeconds);
    copyNumeric("delaySeconds", requirementParameters.delaySeconds);
    copyNumeric("tickSeconds", requirementParameters.tickSeconds);
    copyNumeric("intervalSeconds", requirementParameters.intervalSeconds);
    copyNumeric("cooldownSeconds", requirementParameters.cooldownSeconds);
    copyNumeric("cooldown", requirementParameters.cooldown);
    copyNumeric("abilityCooldown", requirementParameters.abilityCooldown);
  }

  return parameters;
}

function collectMechanicModuleParameters(
  schema: IntentSchema,
  category: BlueprintModule["category"],
  role: string,
  schemaParams: Record<string, unknown>,
): Record<string, unknown> {
  const parameters = {
    ...extractModuleParameters(category, schemaParams),
  };

  if (category === "rule" && role === "timed_rule") {
    Object.assign(parameters, extractTimingMechanicParameters(schema));
  }

  return parameters;
}

function collectMechanicContextSignals(
  schema: IntentSchema,
  category: BlueprintModule["category"],
): string[] {
  if (category !== "rule") {
    return [];
  }

  const signals: string[] = [];
  if (detectSelectionFlowAsk(schema)) {
    signals.push("selection");
  }
  if (classifySchedulerTimerRisk(schema) !== undefined) {
    signals.push("timer");
  }

  return signals;
}

function addMechanicModules(
  schema: IntentSchema,
  modules: BlueprintModule[],
  prefix: string,
  schemaParams: Record<string, unknown>,
): void {
  for (const category of inferCategoriesFromMechanics(schema)) {
    const role = inferRoleFromCategory(
      category,
      collectMechanicContextSignals(schema, category),
      detectSelectionFlowAsk(schema),
    );
    const parameters = collectMechanicModuleParameters(schema, category, role, schemaParams);
    if (category === "trigger" && !hasConcreteTriggerBinding(parameters)) {
      continue;
    }

    upsertModule(modules, {
      id: `${prefix}${category}_${modules.length}`,
      role,
      category,
      patternIds: getCanonicalPatternIds(category, role),
      responsibilities: [describeMechanicResponsibility(category)],
      ...(Object.keys(parameters).length > 0 ? { parameters } : {}),
    });

    if (
      category === "rule"
      && role === "selection_flow"
      && classifySchedulerTimerRisk(schema) === "synthesis_required"
    ) {
      const timedRuleParameters = collectMechanicModuleParameters(schema, category, "timed_rule", schemaParams);
      upsertModule(modules, {
        id: `${prefix}${category}_timed_${modules.length}`,
        role: "timed_rule",
        category,
        patternIds: getCanonicalPatternIds(category, "timed_rule"),
        responsibilities: ["Orchestrate non-reusable local timing semantics that require synthesis"],
        ...(Object.keys(timedRuleParameters).length > 0 ? { parameters: timedRuleParameters } : {}),
      });
    }
  }
}

function createInteractionModule(
  interaction: string,
  index: number,
  prefix: string,
  schemaParams: Record<string, unknown>,
): BlueprintModule {
  const parameters = extractModuleParameters("trigger", schemaParams);
  const role = inferRoleFromCategory("trigger");
  return {
    id: `${prefix}input_${index}`,
    role,
    category: "trigger",
    patternIds: getCanonicalPatternIds("trigger", role),
    responsibilities: [`澶勭悊浜や簰: ${interaction}`],
    ...(Object.keys(parameters).length > 0 ? { parameters } : {}),
  };
}

function createUIModule(
  surface: string,
  index: number,
  prefix: string,
  schemaParams: Record<string, unknown>,
): BlueprintModule {
  const parameters = extractModuleParameters("ui", schemaParams);
  const role = inferRoleFromCategory("ui", [surface]);
  return {
    id: `${prefix}ui_${index}`,
    role,
    category: "ui",
    patternIds: getCanonicalPatternIds("ui", role),
    responsibilities: [`娓叉煋 UI: ${surface}`],
    outputs: [surface],
    ...(Object.keys(parameters).length > 0 ? { parameters } : {}),
  };
}

function buildFlatModules(
  schema: IntentSchema,
  modulePrefix: string,
): BlueprintModule[] {
  const governance = getIntentGovernanceView(schema);
  const modules: BlueprintModule[] = [];
  const schemaParams = getSchemaParameters(schema);
  const typedRequirements = schema.requirements.typed || [];

  for (let i = 0; i < typedRequirements.length; i += 1) {
    const module = createTypedRequirementModule(
      typedRequirements[i],
      i,
      modulePrefix,
      schemaParams,
      schema,
    );
    if (module) {
      upsertModule(modules, module);
    }
  }

  for (let i = 0; i < schema.requirements.functional.length; i += 1) {
    const module = createFunctionalModule(
      schema.requirements.functional[i],
      i,
      modulePrefix,
      schemaParams,
    );
    if (module) {
      upsertModule(modules, module);
    }
  }

  addMechanicModules(schema, modules, modulePrefix, schemaParams);

  for (let i = 0; i < (schema.requirements.interactions || []).length; i += 1) {
    upsertModule(
      modules,
      createInteractionModule(schema.requirements.interactions![i], i, modulePrefix, schemaParams),
    );
  }

  if (governance.ui.needed && governance.ui.surfaces) {
    for (let i = 0; i < governance.ui.surfaces.length; i += 1) {
      upsertModule(
        modules,
        createUIModule(governance.ui.surfaces[i], i, modulePrefix, schemaParams),
      );
    }
  }

  return modules;
}

export function buildSemanticProjection(
  schema: IntentSchema,
  modulePrefix: string,
): BlueprintSemanticProjection {
  return buildModulePlanning(
    schema,
    buildFlatModules(schema, modulePrefix),
    modulePrefix,
  );
}

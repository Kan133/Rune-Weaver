import type {
  ExperienceEntry,
  ExperienceReference,
  FeatureOwnership,
  IntegrationPointRegistry,
} from "./types.js";

export const BUILTIN_EXPERIENCES: ExperienceEntry[] = [
  {
    id: "exp_talent_system",
    kind: "case_preset",
    host: "dota2",
    featureType: "talent_system",
    capabilityTags: ["talent", "selection", "upgrade", "choice"],
    suggestedModuleIds: ["talent_pool", "selection_rule", "selection_ui", "talent_buff"],
    suggestedPatternIds: ["data.weighted_pool", "rule.selection_flow", "ui.selection_modal", "effect.modifier_applier"],
    notes: ["Talent systems typically require 4 modules", "Use weighted_pool for talent entries", "Selection flow handles the choice logic"],
    maturity: "proven",
    risks: ["May conflict with existing talent systems"],
  },
  {
    id: "exp_dash_ability",
    kind: "feature_preset",
    host: "dota2",
    featureType: "dash_ability",
    capabilityTags: ["movement", "dash", "displacement"],
    suggestedModuleIds: ["dash_trigger", "dash_effect"],
    suggestedPatternIds: ["input.key_binding", "effect.dash"],
    notes: ["Dash abilities need trigger + effect", "Use effect.dash for movement"],
    maturity: "verified",
    risks: ["Movement abilities can conflict with other movement mods"],
  },
  {
    id: "exp_buff_spell",
    kind: "known_good_example",
    host: "dota2",
    featureType: "buff_spell",
    capabilityTags: ["buff", "增益", "effect", "modifier"],
    suggestedModuleIds: ["buff_data", "buff_effect"],
    suggestedPatternIds: ["data.weighted_pool", "effect.modifier_applier"],
    notes: ["Buff spells need data + effect modules", "Use modifier_applier for buff application"],
    maturity: "verified",
    risks: ["Modifier stacking rules need to be defined"],
  },
  {
    id: "exp_selection_modal",
    kind: "feature_preset",
    host: "dota2",
    featureType: "selection_modal",
    capabilityTags: ["selection", "modal", "choose", "pick"],
    suggestedModuleIds: ["selection_data", "selection_rule", "selection_ui"],
    suggestedPatternIds: ["data.weighted_pool", "rule.selection_flow", "ui.selection_modal"],
    notes: ["Selection modals need 3 modules minimum", "UI modal provides the visual interface"],
    maturity: "proven",
    risks: ["Modal timing and state management need care"],
  },
  {
    id: "exp_damage_ability",
    kind: "known_good_example",
    host: "dota2",
    featureType: "damage_ability",
    capabilityTags: ["damage", "伤害", "nuke", "burst"],
    suggestedModuleIds: ["damage_data", "damage_effect"],
    suggestedPatternIds: ["data.weighted_pool", "effect.modifier_applier"],
    notes: ["Damage abilities typically use 2 modules", "Can combine with kv_entry for ability definition"],
    maturity: "verified",
    risks: ["Damage calculation and targeting need specification"],
  },
];

export function findRelevantExperiences(
  featureLabel: string,
  integrationPoints: IntegrationPointRegistry,
  featureOwnership: FeatureOwnership,
): ExperienceReference[] {
  const references: ExperienceReference[] = [];
  const featureLabelLower = featureLabel.toLowerCase();
  const pointKinds = integrationPoints.points.map((point) => point.kind);
  const surfaces = featureOwnership.expectedSurfaces;

  for (const experience of BUILTIN_EXPERIENCES) {
    let matchScore = 0;
    let matchReason = "";

    if (
      experience.featureType &&
      (experience.featureType.includes(featureLabelLower) || featureLabelLower.includes(experience.featureType))
    ) {
      matchScore += 3;
      matchReason = "feature type match";
    }

    for (const tag of experience.capabilityTags ?? []) {
      if (pointKinds.some((pointKind) => pointKind.includes(tag)) || surfaces.some((surface) => surface.includes(tag))) {
        matchScore += 1;
        matchReason = "capability tag match";
      }
    }

    if (matchScore >= 1) {
      references.push({
        experienceId: experience.id,
        reason: matchReason || `relevance score: ${matchScore}`,
      });
    }
  }

  return references.slice(0, 3);
}

/**
 * Dota2 UI Generator
 * 
 * Generates TSX/LESS components from templates and UIDesignSpec
 */

import { UIGenerationOptions, GeneratedUIComponent } from "./types.js";
import { templates } from "./templates/index.js";
import { generateStyleVariables, variablesToLess } from "./mappings/style-mappings.js";
import { generateCopyContent, generateFeedbackFlags, generateInteractionFlags } from "./mappings/copy-mappings.js";
import { fillTemplate, toPascalCase, extractDependencies } from "./utils/template-engine.js";

/**
 * Generate UI component from options
 */
export function generateUIComponent(options: UIGenerationOptions): GeneratedUIComponent {
  const { featureId, patternId, designSpec } = options;
  
  // 1. Get template
  const templateLoader = templates[patternId as keyof typeof templates];
  if (!templateLoader) {
    throw new Error(`Unknown UI pattern: ${patternId}`);
  }
  const template = templateLoader();
  
  // 2. Generate style variables
  const surfaceSpec = designSpec.surfaces?.[0];
  const styleVars = generateStyleVariables(designSpec.visualStyle, surfaceSpec);
  const lessVars = variablesToLess(styleVars);
  
  // 3. Generate copy content
  const copyContent = generateCopyContent(designSpec);
  
  // 4. Generate flags
  const feedbackFlags = generateFeedbackFlags(designSpec.feedbackHints);
  const interactionFlags = generateInteractionFlags(surfaceSpec?.interactionMode);
  
  // 5. Prepare template data
  const featureName = toPascalCase(featureId);
  const templateData: Record<string, string | number | boolean> = {
    FEATURE_ID: featureId,
    FEATURE_NAME: featureName,
    BLUEPRINT_ID: options.blueprintId,
    // Copy content
    TITLE: copyContent.title,
    BUTTON_TEXT: copyContent.buttonText,
    HINT_TEXT: copyContent.hintText,
    EMPTY_TEXT: copyContent.emptyText,
    // Style variables
    ...lessVars,
    // Flags
    HAS_FEEDBACK_SOUND: feedbackFlags.hasSound,
    HAS_FEEDBACK_ANIMATION: feedbackFlags.hasAnimation,
    HAS_FEEDBACK_PARTICLE: feedbackFlags.hasParticle,
    IS_BLOCKING: interactionFlags.isBlocking,
    IS_LIGHTWEIGHT: interactionFlags.isLightweight,
    IS_PERSISTENT: interactionFlags.isPersistent,
  };
  
  // 6. Fill templates
  const tsxContent = fillTemplate(template.tsxTemplate, templateData);
  const lessContent = fillTemplate(template.lessTemplate, templateData);
  
  return {
    fileName: featureId,
    tsxFileName: `${featureId}.tsx`,
    tsxContent,
    lessFileName: `${featureId}.less`,
    lessContent,
    dependencies: extractDependencies(tsxContent),
  };
}

/**
 * Generate multiple UI components
 */
export function generateUIComponents(
  optionsList: UIGenerationOptions[]
): GeneratedUIComponent[] {
  return optionsList.map(options => generateUIComponent(options));
}

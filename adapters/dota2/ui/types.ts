/**
 * Dota2 UI Adapter Types
 */

import { UIDesignSpec } from "../../../core/schema/types.js";

export interface UITemplate {
  id: string;
  tsxTemplate: string;
  lessTemplate: string;
}

export interface UIGenerationOptions {
  featureId: string;
  patternId: string;
  blueprintId: string;
  designSpec: UIDesignSpec;
  assemblyData?: Record<string, unknown>;
}

export interface GeneratedUIComponent {
  fileName: string;
  tsxFileName: string;
  tsxContent: string;
  lessFileName: string;
  lessContent: string;
  dependencies: string[];
}

export interface UIIndexGenerationOptions {
  features: Array<{
    featureId: string;
    componentName: string;
  }>;
}

export interface GeneratedUIIndex {
  fileName: string;
  content: string;
}

// Template variable types
export interface TemplateVariables {
  FEATURE_ID: string;
  FEATURE_NAME: string;
  BLUEPRINT_ID: string;
  [key: string]: string | number | boolean;
}

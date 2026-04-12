// F008: Local Workspace Types
// Mirrors core/workspace/types.ts for frontend use
// Avoids importing from outside src directory

export interface EntryBinding {
  target: "server" | "ui" | "config";
  file: string;
  kind: "import" | "register" | "mount" | "append_index";
  symbol?: string;
}

export interface RuneWeaverFeatureRecord {
  featureId: string;
  featureName?: string;
  intentKind: string;
  status: "active" | "disabled" | "archived" | "rolled_back";
  revision: number;
  blueprintId: string;
  selectedPatterns: string[];
  generatedFiles: string[];
  entryBindings: EntryBinding[];
  dependsOn?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RuneWeaverWorkspace {
  version: string;
  hostType: "dota2-x-template";
  hostRoot: string;
  addonName: string;
  initializedAt: string;
  features: RuneWeaverFeatureRecord[];
}

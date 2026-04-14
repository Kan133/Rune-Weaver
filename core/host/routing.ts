export interface HostRouteContext {
  version: string;
  host: string;
  sourceBlueprintId: string;
  routes: HostRouteContextUnit[];
}

export interface HostRouteContextUnit {
  id: string;
  sourceUnitId: string;
  generatorFamily: string;
  routeKind: string;
  hostTarget: string;
  sourcePatternIds: string[];
  parameters?: Record<string, unknown>;
  blocked: boolean;
}

export interface HostRealizationContext {
  version: string;
  host: string;
  sourceBlueprintId: string;
  units: HostRealizationContextUnit[];
  isFallback: boolean;
}

export interface HostRealizationContextUnit {
  id: string;
  sourcePatternIds: string[];
  realizationType: string;
  hostTargets: string[];
  confidence: string;
}

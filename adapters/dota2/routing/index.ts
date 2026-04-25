/**
 * Dota2 Adapter - Generator Routing Engine
 * 
 * T115: Routes HostRealizationPlan to concrete generator families
 * Position: HostRealizationPlan -> GeneratorRoutingPlan -> Generators
 */

import { 
  HostRealizationPlan, 
  HostRealizationUnit,
  HostRealizationOutput,
  GeneratorRoutingPlan, 
  GeneratorRoute 
} from "../../../core/schema/types";

/**
 * T148: Route unit based on explicit outputs[] 
 * This is the preferred path for multi-output realization
 */
function routeUnitFromOutputs(unit: HostRealizationUnit): GeneratorRoute[] {
  const routes: GeneratorRoute[] = [];

  if (!unit.outputs || unit.outputs.length === 0) {
    return routes;
  }

  for (let i = 0; i < unit.outputs.length; i++) {
    const output = unit.outputs[i];
    
    let generatorFamily: GeneratorRoute["generatorFamily"];
    let routeKind: GeneratorRoute["routeKind"] = output.kind;

    // Map output kind to generator family
    switch (output.kind) {
      case "kv":
        generatorFamily = "dota2-kv";
        break;
      case "ts":
        generatorFamily = "dota2-ts";
        break;
      case "ui":
        generatorFamily = "dota2-ui";
        break;
      case "lua":
        generatorFamily = "dota2-lua";
        break;
      case "bridge":
        generatorFamily = "bridge-support";
        break;
      default:
        generatorFamily = "dota2-ts";
    }

    routes.push({
      id: `route_${unit.id}_${output.kind}_${i}`,
      sourceUnitId: unit.id,
      sourceKind: unit.sourceKind,
      generatorFamily,
      routeKind,
      hostTarget: output.target,
      sourcePatternIds: unit.sourcePatternIds,
      parameters: unit.parameters,
      rationale: [
        `output[${i}] kind "${output.kind}" routes to ${generatorFamily}`,
        ...unit.rationale,
      ],
      blockers: unit.blockers,
    });
  }

  return routes;
}

/**
 * Route a single HostRealizationUnit to one or more GeneratorRoutes
 * T148: Supports both explicit outputs[] and legacy realizationType for backward compatibility
 */
function routeUnit(unit: HostRealizationUnit): GeneratorRoute[] {
  // T148: If unit has explicit outputs[], use them directly
  if (unit.outputs && unit.outputs.length > 0) {
    return routeUnitFromOutputs(unit);
  }

  // Fallback to legacy realizationType-based routing
  const routes: GeneratorRoute[] = [];
  
  switch (unit.realizationType) {
    case "ts":
      routes.push({
        id: `route_${unit.id}_ts`,
        sourceUnitId: unit.id,
        sourceKind: unit.sourceKind,
        generatorFamily: "dota2-ts",
        routeKind: "ts",
        hostTarget: unit.hostTargets[0] || "server_ts",
        sourcePatternIds: unit.sourcePatternIds,
        parameters: unit.parameters,
        rationale: [
          `realizationType "ts" routes to dota2-ts generator`,
          ...unit.rationale
        ],
        blockers: unit.blockers,
      });
      break;
      
    case "shared-ts":
      routes.push({
        id: `route_${unit.id}_ts`,
        sourceUnitId: unit.id,
        sourceKind: unit.sourceKind,
        generatorFamily: "dota2-ts",
        routeKind: "ts",
        hostTarget: "server_shared_ts",
        sourcePatternIds: unit.sourcePatternIds,
        parameters: unit.parameters,
        rationale: [
          `realizationType "shared-ts" routes to dota2-ts generator (shared)`,
          ...unit.rationale
        ],
        blockers: unit.blockers,
      });
      break;
      
    case "ui":
      routes.push({
        id: `route_${unit.id}_ui`,
        sourceUnitId: unit.id,
        sourceKind: unit.sourceKind,
        generatorFamily: "dota2-ui",
        routeKind: "ui",
        hostTarget: unit.hostTargets[0] || "panorama_ui",
        sourcePatternIds: unit.sourcePatternIds,
        parameters: unit.parameters,
        rationale: [
          `realizationType "ui" routes to dota2-ui generator`,
          ...unit.rationale
        ],
        blockers: unit.blockers,
      });
      break;
      
    case "kv":
      routes.push({
        id: `route_${unit.id}_kv`,
        sourceUnitId: unit.id,
        sourceKind: unit.sourceKind,
        generatorFamily: "dota2-kv",
        routeKind: "kv",
        hostTarget: unit.hostTargets[0] || "kv",
        sourcePatternIds: unit.sourcePatternIds,
        parameters: unit.parameters,
        rationale: [
          `realizationType "kv" routes to dota2-kv generator`,
          ...unit.rationale
        ],
        blockers: unit.blockers,
      });
      break;
      
    case "kv+ts":
      // For kv+ts, we generate TWO routes:
      // 1. TS route (valid)
      const tsHostTarget = unit.hostTargets.find(t => t.includes("ts")) || "server_ts";
      routes.push({
        id: `route_${unit.id}_ts`,
        sourceUnitId: unit.id,
        sourceKind: unit.sourceKind,
        generatorFamily: "dota2-ts",
        routeKind: "ts",
        hostTarget: tsHostTarget,
        sourcePatternIds: unit.sourcePatternIds,
        parameters: unit.parameters,
        rationale: [
          `realizationType "kv+ts" - TS side routes to dota2-ts generator`,
          ...unit.rationale
        ],
        blockers: unit.blockers,
      });
      
      // 2. KV route (now valid - dota2-kv generator is implemented)
      const kvHostTarget = unit.hostTargets.find(t => t.includes("kv")) || "kv";
      routes.push({
        id: `route_${unit.id}_kv`,
        sourceUnitId: unit.id,
        sourceKind: unit.sourceKind,
        generatorFamily: "dota2-kv",
        routeKind: "kv",
        hostTarget: kvHostTarget,
        sourcePatternIds: unit.sourcePatternIds,
        parameters: unit.parameters,
        rationale: [
          `realizationType "kv+ts" - KV side routes to dota2-kv generator`,
          ...unit.rationale
        ],
        blockers: unit.blockers,
      });
      break;
      
    case "bridge-only":
      routes.push({
        id: `route_${unit.id}_bridge`,
        sourceUnitId: unit.id,
        sourceKind: unit.sourceKind,
        generatorFamily: "bridge-support",
        routeKind: "bridge",
        hostTarget: unit.hostTargets[0] || "bridge",
        sourcePatternIds: unit.sourcePatternIds,
        parameters: unit.parameters,
        rationale: [
          `realizationType "bridge-only" routes to bridge-support`,
          ...unit.rationale
        ],
        blockers: unit.blockers,
      });
      break;

    case "lua":
      routes.push({
        id: `route_${unit.id}_lua`,
        sourceUnitId: unit.id,
        sourceKind: unit.sourceKind,
        generatorFamily: "dota2-lua",
        routeKind: "lua",
        hostTarget: unit.hostTargets[0] || "lua_ability",
        sourcePatternIds: unit.sourcePatternIds,
        parameters: unit.parameters,
        rationale: [
          `realizationType "lua" routes to dota2-lua generator`,
          ...unit.rationale
        ],
        blockers: unit.blockers,
      });
      break;

    // T143-R1: kv+lua produces both lua runtime and kv static shell
    case "kv+lua": {
      // 1. Lua route (runtime behavior)
      const luaHostTarget = unit.hostTargets.find(t => t.includes("lua")) || "lua_ability";
      routes.push({
        id: `route_${unit.id}_lua`,
        sourceUnitId: unit.id,
        sourceKind: unit.sourceKind,
        generatorFamily: "dota2-lua",
        routeKind: "lua",
        hostTarget: luaHostTarget,
        sourcePatternIds: unit.sourcePatternIds,
        parameters: unit.parameters,
        rationale: [
          `realizationType "kv+lua" - Lua side routes to dota2-lua generator`,
          ...unit.rationale
        ],
        blockers: unit.blockers,
      });

      // 2. KV route (static shell)
      const kvHostTarget = unit.hostTargets.find(t => t.includes("kv")) || "ability_kv";
      routes.push({
        id: `route_${unit.id}_kv`,
        sourceUnitId: unit.id,
        sourceKind: unit.sourceKind,
        generatorFamily: "dota2-kv",
        routeKind: "kv",
        hostTarget: kvHostTarget,
        sourcePatternIds: unit.sourcePatternIds,
        parameters: unit.parameters,
        rationale: [
          `realizationType "kv+lua" - KV side routes to dota2-kv generator`,
          ...unit.rationale
        ],
        blockers: unit.blockers,
      });
      break;
    }
      
    default:
      routes.push({
        id: `route_${unit.id}_unknown`,
        sourceUnitId: unit.id,
        sourceKind: unit.sourceKind,
        generatorFamily: "dota2-ts",
        routeKind: "ts",
        hostTarget: "server_ts",
        sourcePatternIds: unit.sourcePatternIds,
        parameters: unit.parameters,
        rationale: [
          `Unknown realizationType - fallback to dota2-ts`,
          ...unit.rationale
        ],
        blockers: [
          `Unknown realizationType: ${(unit as any).realizationType}`,
          ...(unit.blockers || [])
        ],
      });
  }
  
  return routes;
}

/**
 * Generate GeneratorRoutingPlan from HostRealizationPlan
 */
export function generateGeneratorRoutingPlan(
  hostRealization: HostRealizationPlan
): GeneratorRoutingPlan {
  const routes: GeneratorRoute[] = [];
  const warnings: string[] = [];
  const blockers: string[] = [];
  
  for (const unit of hostRealization.units) {
    const unitRoutes = routeUnit(unit);
    routes.push(...unitRoutes);
    
    for (const route of unitRoutes) {
      if (route.blockers && route.blockers.length > 0) {
        warnings.push(
          `${route.routeKind.toUpperCase()} route blocked for unit ${unit.id}: ${route.blockers.join("; ")}`
        );
      }
    }
  }

  const blockedRoutes = routes.filter((route) => route.blockers && route.blockers.length > 0);
  if (blockedRoutes.length > 0) {
    blockers.push(`${blockedRoutes.length} generator route(s) remain blocked by realization constraints`);
  }
  
  return {
    version: "1.0",
    host: hostRealization.host,
    sourceBlueprintId: hostRealization.sourceBlueprintId,
    routes,
    warnings,
    blockers,
  };
}

/**
 * Get routes filtered by generator family
 */
export function getRoutesByFamily(
  plan: GeneratorRoutingPlan, 
  family: "dota2-ts" | "dota2-ui" | "dota2-kv" | "dota2-lua" | "bridge-support"
): GeneratorRoute[] {
  return plan.routes.filter(r => r.generatorFamily === family);
}

/**
 * Get routes filtered by route kind
 */
export function getRoutesByKind(
  plan: GeneratorRoutingPlan, 
  kind: "ts" | "ui" | "kv" | "lua" | "bridge"
): GeneratorRoute[] {
  return plan.routes.filter(r => r.routeKind === kind);
}

/**
 * Get unblocked routes (ready for generation)
 */
export function getUnblockedRoutes(
  plan: GeneratorRoutingPlan
): GeneratorRoute[] {
  return plan.routes.filter(r => !r.blockers || r.blockers.length === 0);
}

/**
 * Get blocked routes
 */
export function getBlockedRoutes(
  plan: GeneratorRoutingPlan
): GeneratorRoute[] {
  return plan.routes.filter(r => r.blockers && r.blockers.length > 0);
}

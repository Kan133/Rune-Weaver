/**
 * Dota2 Adapter - Generator Routing Engine
 * 
 * T115: Routes HostRealizationPlan to concrete generator families
 * Position: HostRealizationPlan -> GeneratorRoutingPlan -> Generators
 */

import { 
  HostRealizationPlan, 
  HostRealizationUnit,
  GeneratorRoutingPlan, 
  GeneratorRoute 
} from "../../../core/schema/types";

/**
 * Route a single HostRealizationUnit to one or more GeneratorRoutes
 */
function routeUnit(unit: HostRealizationUnit): GeneratorRoute[] {
  const routes: GeneratorRoute[] = [];
  
  switch (unit.realizationType) {
    case "ts":
      routes.push({
        id: `route_${unit.id}_ts`,
        sourceUnitId: unit.id,
        generatorFamily: "dota2-ts",
        routeKind: "ts",
        hostTarget: unit.hostTargets[0] || "server_ts",
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
        generatorFamily: "dota2-ts",
        routeKind: "ts",
        hostTarget: "server_shared_ts",
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
        generatorFamily: "dota2-ui",
        routeKind: "ui",
        hostTarget: unit.hostTargets[0] || "panorama_ui",
        rationale: [
          `realizationType "ui" routes to dota2-ui generator`,
          ...unit.rationale
        ],
        blockers: unit.blockers,
      });
      break;
      
    case "kv":
      // KV routes are now valid - dota2-kv generator is implemented
      // Blockers only added if unit has inherent blockers
      routes.push({
        id: `route_${unit.id}_kv`,
        sourceUnitId: unit.id,
        generatorFamily: "dota2-kv",
        routeKind: "kv",
        hostTarget: unit.hostTargets[0] || "kv",
        rationale: [
          `realizationType "kv" routes to dota2-kv generator`,
          ...unit.rationale
        ],
        blockers: unit.blockers, // Only use unit's inherent blockers, not "not implemented"
      });
      break;
      
    case "kv+ts":
      // For kv+ts, we generate TWO routes:
      // 1. TS route (valid)
      const tsHostTarget = unit.hostTargets.find(t => t.includes("ts")) || "server_ts";
      routes.push({
        id: `route_${unit.id}_ts`,
        sourceUnitId: unit.id,
        generatorFamily: "dota2-ts",
        routeKind: "ts",
        hostTarget: tsHostTarget,
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
        generatorFamily: "dota2-kv",
        routeKind: "kv",
        hostTarget: kvHostTarget,
        rationale: [
          `realizationType "kv+ts" - KV side routes to dota2-kv generator`,
          ...unit.rationale
        ],
        blockers: unit.blockers, // Only use unit's inherent blockers, not "not implemented"
      });
      break;
      
    case "bridge-only":
      routes.push({
        id: `route_${unit.id}_bridge`,
        sourceUnitId: unit.id,
        generatorFamily: "bridge-support",
        routeKind: "bridge",
        hostTarget: unit.hostTargets[0] || "bridge",
        rationale: [
          `realizationType "bridge-only" routes to bridge-support`,
          ...unit.rationale
        ],
        blockers: unit.blockers,
      });
      break;
      
    default:
      // Unknown realization type - create a blocked route
      routes.push({
        id: `route_${unit.id}_unknown`,
        sourceUnitId: unit.id,
        generatorFamily: "dota2-ts",
        routeKind: "ts",
        hostTarget: "server_ts",
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
    
    // Check for deferred/blocked routes
    for (const route of unitRoutes) {
      if (route.blockers && route.blockers.length > 0) {
        if (route.routeKind === "kv") {
          warnings.push(`KV route blocked for unit ${unit.id}: ${route.blockers.join("; ")}`);
        }
      }
    }
  }
  
  // Check for overall blockers
  const blockedKVCount = routes.filter(r => r.routeKind === "kv" && r.blockers && r.blockers.length > 0).length;
  if (blockedKVCount > 0) {
    blockers.push(`${blockedKVCount} KV route(s) blocked - dota2-kv generator not implemented`);
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
  family: "dota2-ts" | "dota2-ui" | "dota2-kv" | "bridge-support"
): GeneratorRoute[] {
  return plan.routes.filter(r => r.generatorFamily === family);
}

/**
 * Get routes filtered by route kind
 */
export function getRoutesByKind(
  plan: GeneratorRoutingPlan, 
  kind: "ts" | "ui" | "kv" | "bridge"
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

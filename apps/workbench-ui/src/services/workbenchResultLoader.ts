// F006: Workbench Result Loader
// Backend-like result loading service for frontend integration
// Supports multiple source modes: local-bridge, local-backend, shared-fixture, fallback
//
// RESPONSIBILITIES:
// - Mode routing (decide which source to load from)
// - Loading orchestration (async loading with delay simulation)
// - Fallback handling (graceful degradation across sources)
// - Metadata tracking (source, timing, fallback status)
//
// NOT RESPONSIBILITIES:
// - Data definition (handled by data/ layers)
// - Type transformation (handled by adapter layer)
// - UI state management (handled by App.tsx)

import type { WorkbenchResult } from "../../../workbench/types";

// F005-R1: Import local backend results from separate source layer
import {
  getLocalBackendResult,
  getLocalBackendScenarios,
} from "../data/backendResults";

// F006: Import local bridge results (dev-only backend simulation)
import {
  getLocalBridgeResult,
  getLocalBridgeScenarios,
} from "../data/localResultBridge";

// F006: Extended data source modes
// - mock: Frontend mock scenarios (F001-F003)
// - local-bridge: Dev-only local bridge (F006) - NEW
// - shared-fixture: Dynamic import from apps/workbench/fixtures (F004-R2)
// - local-backend: Load from local backend-like result source (F005)
export type DataSourceMode = "mock" | "local-bridge" | "shared-fixture" | "local-backend";

// F006: Result metadata to track source
export interface ResultMetadata {
  source: DataSourceMode;
  loadedAt: string;
  scenario?: string;
  isFallback?: boolean;
  fallbackChain?: string[];
}

export interface LoadedResult {
  result: WorkbenchResult;
  metadata: ResultMetadata;
}

// F006: Load result from local bridge (dev-only backend simulation)
// This is the most realistic local source - mirrors what a real API would return
async function loadFromLocalBridge(scenario: string): Promise<WorkbenchResult | null> {
  // Simulate network delay like real API
  await new Promise(resolve => setTimeout(resolve, 200));

  const result = getLocalBridgeResult(scenario);
  if (!result) {
    console.warn(`[F006] Local bridge result not found for scenario: ${scenario}`);
    return null;
  }

  console.log(`[F006] Loaded from local bridge: ${scenario}`);
  return result;
}

// F005-R1: Load result from local backend-like source
async function loadFromLocalBackend(scenario: string): Promise<WorkbenchResult | null> {
  // Simulate network delay like real API
  await new Promise(resolve => setTimeout(resolve, 300));

  const result = getLocalBackendResult(scenario);
  if (!result) {
    console.warn(`[F005-R1] Local backend result not found for scenario: ${scenario}`);
    return null;
  }

  console.log(`[F005-R1] Loaded from local backend: ${scenario}`);
  return result;
}

// F005-R1: Load result from shared fixtures (F004-R2 path)
async function loadFromSharedFixture(scenario: string): Promise<WorkbenchResult | null> {
  try {
    const scenarioMap: Record<string, string> = {
      create: "create",
      update: "update",
      "governance-blocked": "governance-blocked",
      "write-success": "forced-write-success",
    };

    const fixtureName = scenarioMap[scenario];
    if (!fixtureName) return null;

    switch (fixtureName) {
      case "create": {
        const { createFixtureData } = await import("../../../workbench/fixtures/create.fixture.js");
        return {
          success: true,
          ...createFixtureData,
        } as WorkbenchResult;
      }
      case "update": {
        const { updateFixtureData } = await import("../../../workbench/fixtures/update.fixture.js");
        return {
          success: true,
          ...updateFixtureData,
        } as WorkbenchResult;
      }
      case "governance-blocked": {
        const { governanceBlockedFixtureData } = await import("../../../workbench/fixtures/governance-blocked.fixture.js");
        return {
          success: true,
          ...governanceBlockedFixtureData,
        } as WorkbenchResult;
      }
      case "forced-write-success": {
        const { forcedWriteSuccessFixtureData } = await import("../../../workbench/fixtures/forced-write-success.fixture.js");
        return {
          success: true,
          ...forcedWriteSuccessFixtureData,
        } as WorkbenchResult;
      }
      default:
        return null;
    }
  } catch (error) {
    console.warn("[F005-R1] Failed to load shared fixture:", error);
    return null;
  }
}

// F006: Main loader function
// This is the entry point for loading backend-style results
// Supports cascading fallback: local-bridge -> local-backend -> shared-fixture
export async function loadWorkbenchResult(
  scenario: string,
  mode: DataSourceMode
): Promise<LoadedResult | null> {
  console.log(`[F006] Loading workbench result: scenario=${scenario}, mode=${mode}`);

  let result: WorkbenchResult | null = null;
  let metadata: ResultMetadata = {
    source: mode,
    loadedAt: new Date().toISOString(),
    scenario,
    fallbackChain: [],
  };

  switch (mode) {
    case "local-bridge":
      // F006: Try local bridge first (most realistic dev source)
      result = await loadFromLocalBridge(scenario);
      if (!result) {
        // Fallback chain: local-bridge -> local-backend -> shared-fixture
        console.warn(`[F006] Local bridge failed, trying local-backend`);
        metadata.fallbackChain?.push("local-backend");
        result = await loadFromLocalBackend(scenario);
        metadata.isFallback = true;
      }
      if (!result) {
        console.warn(`[F006] Local backend failed, trying shared-fixture`);
        metadata.fallbackChain?.push("shared-fixture");
        result = await loadFromSharedFixture(scenario);
        metadata.isFallback = true;
      }
      break;

    case "local-backend":
      result = await loadFromLocalBackend(scenario);
      break;

    case "shared-fixture":
      result = await loadFromSharedFixture(scenario);
      // F005-R1: Fallback logic - if shared fixture fails, try local backend
      if (!result) {
        console.warn(`[F005-R1] Shared fixture failed, trying local-backend fallback`);
        metadata.fallbackChain?.push("local-backend");
        result = await loadFromLocalBackend(scenario);
        metadata.isFallback = true;
      }
      break;

    default:
      console.warn(`[F006] Unknown mode: ${mode}`);
      return null;
  }

  if (!result) {
    console.error(`[F006] Failed to load result for scenario: ${scenario}`);
    return null;
  }

  return { result, metadata };
}

// F006: Get available scenarios for each mode
export function getAvailableScenarios(mode: DataSourceMode): string[] {
  switch (mode) {
    case "local-bridge":
      return getLocalBridgeScenarios();
    case "local-backend":
      return getLocalBackendScenarios();
    case "shared-fixture":
      return ["create", "update", "governance-blocked", "write-success"];
    default:
      return [];
  }
}

// F006: Check if a scenario is available in a given mode
export function isScenarioAvailable(scenario: string, mode: DataSourceMode): boolean {
  return getAvailableScenarios(mode).includes(scenario);
}

// F006: Workbench Result Loader
// Backend-like result loading service for frontend integration.
//
// RESPONSIBILITIES:
// - Route to exactly one concrete source per request
// - Guard dev/test-only sources from normal product paths
// - Track which source actually served the result
//
// NOT RESPONSIBILITIES:
// - Cascading fallback across unrelated sources
// - Type transformation (handled by adapter layer)
// - UI state management

import type { WorkbenchResult } from "../../../workbench/contract";

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

export type DataSourceMode = "mock" | "local-bridge" | "shared-fixture" | "local-backend";

// F006: Result metadata to track source
export interface ResultMetadata {
  source: DataSourceMode;
  loadedAt: string;
  scenario?: string;
  isFallback?: boolean;
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

const DEV_ONLY_SOURCE_MODES: ReadonlySet<DataSourceMode> = new Set([
  "mock",
  "local-bridge",
  "shared-fixture",
]);

function isExplicitDevOrTestMode(): boolean {
  return Boolean(import.meta.env.DEV || import.meta.env.MODE === "test");
}

function isSourceModeAllowed(mode: DataSourceMode): boolean {
  if (!DEV_ONLY_SOURCE_MODES.has(mode)) {
    return true;
  }

  return isExplicitDevOrTestMode();
}

function buildMetadata(source: DataSourceMode, scenario: string): ResultMetadata {
  return {
    source,
    loadedAt: new Date().toISOString(),
    scenario,
  };
}

export async function loadWorkbenchResult(
  scenario: string,
  mode: DataSourceMode
): Promise<LoadedResult | null> {
  console.log(`[F006] Loading workbench result: scenario=${scenario}, mode=${mode}`);

  if (!isSourceModeAllowed(mode)) {
    console.warn(`[F006] Source mode ${mode} is only available in explicit dev/test environments`);
    return null;
  }

  const metadata = buildMetadata(mode, scenario);
  let result: WorkbenchResult | null;

  switch (mode) {
    case "mock":
      console.warn("[F006] Mock scenarios are adapter-owned and are not served by workbenchResultLoader");
      return null;
    case "local-bridge":
      result = await loadFromLocalBridge(scenario);
      break;
    case "local-backend":
      result = await loadFromLocalBackend(scenario);
      break;
    case "shared-fixture":
      result = await loadFromSharedFixture(scenario);
      break;
    default:
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
  if (!isSourceModeAllowed(mode)) {
    return [];
  }

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

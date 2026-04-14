// F006: Scenario Adapter - Clean Adapter Orchestration Layer
// Provides a unified interface for mock scenarios, shared fixtures, local backend, and local bridge
// 
// RESPONSIBILITIES:
// - Mode-based scenario selection
// - Orchestrating calls to loader and adapter
// - Fallback orchestration (when primary sources fail)
// - Re-exporting types for convenience
//
// NOT RESPONSIBILITIES:
// - Fallback data definition (moved to data/fallbackFixtures.ts)
// - Source loading logic (handled by loader layer)
// - Type transformation (handled by workbenchResultAdapter)

import type { WorkbenchState, MockScenario } from "../types/workbench";
import { getMockScenario } from "../mocks/scenarios";
import { adaptWorkbenchResult } from "./workbenchResultAdapter";

// F005-R2: Import fallback fixtures from separate source layer
import {
  getFallbackFixture,
  getFallbackScenarios,
} from "../data/fallbackFixtures";

// F006: Import loader layer
import {
  loadWorkbenchResult,
  type DataSourceMode as LoaderDataSourceMode,
  type ResultMetadata,
} from "../services/workbenchResultLoader";

// F006: Re-export DataSourceMode from loader (source of truth)
export type DataSourceMode = LoaderDataSourceMode;

// F006: Export ResultMetadata for UI tracking
export type { ResultMetadata };

// F006: Import shared fixture types for loading
import type { AdapterInput } from "./workbenchResultAdapter";

// F006: Load shared fixture data dynamically from apps/workbench/fixtures
// This is the PRIMARY source - fallback fixtures are only used if this fails
async function loadSharedFixture(scenario: MockScenario): Promise<AdapterInput | null> {
  try {
    // Map scenario names to fixture file names
    const scenarioMap: Record<string, string> = {
      create: "create",
      update: "update",
      "governance-blocked": "governance-blocked",
      "governance_blocked": "governance-blocked",
      "write-success": "forced-write-success",
      "forced_write_success": "forced-write-success",
    };

    const fixtureName = scenarioMap[scenario];
    if (!fixtureName) return null;

    // Dynamic import of backend fixtures
    // In production, this would be replaced with an actual API call
    switch (fixtureName) {
      case "create": {
        const { createFixtureData } = await import("../../../workbench/fixtures/create.fixture.js");
        return {
          featureCard: createFixtureData.featureCard,
          featureDetail: createFixtureData.featureDetail,
          lifecycleActions: createFixtureData.lifecycleActions,
          featureRouting: createFixtureData.featureRouting,
          featureFocus: createFixtureData.featureFocus,
        };
      }
      case "update": {
        const { updateFixtureData } = await import("../../../workbench/fixtures/update.fixture.js");
        return {
          featureCard: updateFixtureData.featureCard,
          featureDetail: updateFixtureData.featureDetail,
          lifecycleActions: updateFixtureData.lifecycleActions,
          featureRouting: updateFixtureData.featureRouting,
          featureFocus: updateFixtureData.featureFocus,
          updateHandoff: updateFixtureData.updateHandoff,
          updateHandler: updateFixtureData.updateHandler,
        };
      }
      case "governance-blocked": {
        const { governanceBlockedFixtureData } = await import("../../../workbench/fixtures/governance-blocked.fixture.js");
        return {
          featureCard: governanceBlockedFixtureData.featureCard,
          featureDetail: governanceBlockedFixtureData.featureDetail,
          lifecycleActions: governanceBlockedFixtureData.lifecycleActions,
          featureRouting: governanceBlockedFixtureData.featureRouting,
          featureFocus: governanceBlockedFixtureData.featureFocus,
          updateHandoff: governanceBlockedFixtureData.updateHandoff,
          updateHandler: governanceBlockedFixtureData.updateHandler,
          governanceRelease: governanceBlockedFixtureData.governanceRelease,
        };
      }
      case "forced-write-success": {
        const { forcedWriteSuccessFixtureData } = await import("../../../workbench/fixtures/forced-write-success.fixture.js");
        return {
          featureCard: forcedWriteSuccessFixtureData.featureCard,
          featureDetail: forcedWriteSuccessFixtureData.featureDetail,
          lifecycleActions: forcedWriteSuccessFixtureData.lifecycleActions,
          featureRouting: forcedWriteSuccessFixtureData.featureRouting,
          featureFocus: forcedWriteSuccessFixtureData.featureFocus,
          updateHandoff: forcedWriteSuccessFixtureData.updateHandoff,
          updateHandler: forcedWriteSuccessFixtureData.updateHandler,
          updateWriteResult: forcedWriteSuccessFixtureData.updateWriteResult,
        };
      }
      default:
        return null;
    }
  } catch (error) {
    console.warn("[F006] Failed to load shared fixture, using fallback:", error);
    return null;
  }
}

// F006: Create adapted scenario from shared fixture source
// Primary: Load from apps/workbench/fixtures via dynamic import
// Fallback: Use minimal fallback fixtures if import fails
export async function createAdaptedScenarioAsync(scenario: MockScenario): Promise<WorkbenchState> {
  // Try to load from shared fixtures first
  const sharedFixture = await loadSharedFixture(scenario);
  if (sharedFixture) {
    console.log("[F006] Using shared fixture from apps/workbench/fixtures for scenario:", scenario);
    return adaptWorkbenchResult(sharedFixture);
  }

  // Fallback to minimal fixtures
  console.log("[F006] Using fallback fixture for scenario:", scenario);
  const fallback = getFallbackFixture(scenario);
  if (!fallback) {
    throw new Error(`[F006] No fallback available for scenario: ${scenario}`);
  }
  return adaptWorkbenchResult(fallback);
}

// F006: Synchronous version for backward compatibility
// Uses fallback fixtures directly (shared fixtures require async import)
export function createAdaptedScenario(scenario: MockScenario): WorkbenchState {
  // Use fallback fixtures (synchronous)
  const fallback = getFallbackFixture(scenario);
  if (!fallback) {
    throw new Error(`[F006] No fallback available for scenario: ${scenario}`);
  }
  return adaptWorkbenchResult(fallback);
}

// F006: Get scenario based on data source mode (synchronous)
export function getScenarioState(
  scenario: MockScenario,
  mode: DataSourceMode
): WorkbenchState {
  if (mode === "mock") {
    // Use existing mock scenario (F001-F003 path)
    return getMockScenario(scenario);
  } else {
    // Use adapted backend result (F004+ path)
    return createAdaptedScenario(scenario);
  }
}

// F006: Get scenario based on data source mode (asynchronous)
// Supports all modes: mock, local-bridge, local-backend, shared-fixture
export async function getScenarioStateAsync(
  scenario: MockScenario,
  mode: DataSourceMode
): Promise<WorkbenchState> {
  if (mode === "mock") {
    // Use existing mock scenario (F001-F003 path) - still synchronous
    return getMockScenario(scenario);
  } else if (mode === "local-bridge") {
    // F006: Use local bridge loading path (most realistic dev source)
    const loaded = await loadWorkbenchResult(scenario, mode);
    if (loaded) {
      return adaptWorkbenchResult(loaded.result);
    }
    // Fallback to shared fixture if local bridge fails
    console.warn("[F006] Local bridge failed, falling back to shared fixture");
    return createAdaptedScenarioAsync(scenario);
  } else if (mode === "local-backend") {
    // F005: Use local backend-like result loading path
    const loaded = await loadWorkbenchResult(scenario, mode);
    if (loaded) {
      return adaptWorkbenchResult(loaded.result);
    }
    // Fallback to shared fixture if local backend fails
    console.warn("[F006] Local backend failed, falling back to shared fixture");
    return createAdaptedScenarioAsync(scenario);
  } else {
    // F006: Use async shared fixture loading as default path
    // Falls back to synchronous fallback only if async loading fails
    return createAdaptedScenarioAsync(scenario);
  }
}

// F006: Get scenario with metadata (for tracking source)
export async function getScenarioStateWithMetadata(
  scenario: MockScenario,
  mode: DataSourceMode
): Promise<{ state: WorkbenchState; metadata?: ResultMetadata }> {
  if (mode === "mock") {
    return { state: getMockScenario(scenario) };
  } else if (mode === "local-bridge") {
    const loaded = await loadWorkbenchResult(scenario, mode);
    if (loaded) {
      return {
        state: adaptWorkbenchResult(loaded.result),
        metadata: loaded.metadata,
      };
    }
    // Fallback
    return { state: await createAdaptedScenarioAsync(scenario) };
  } else if (mode === "local-backend") {
    const loaded = await loadWorkbenchResult(scenario, mode);
    if (loaded) {
      return {
        state: adaptWorkbenchResult(loaded.result),
        metadata: loaded.metadata,
      };
    }
    // Fallback
    return { state: await createAdaptedScenarioAsync(scenario) };
  } else {
    // shared-fixture mode
    const loaded = await loadWorkbenchResult(scenario, mode);
    if (loaded) {
      return {
        state: adaptWorkbenchResult(loaded.result),
        metadata: loaded.metadata,
      };
    }
    return { state: await createAdaptedScenarioAsync(scenario) };
  }
}

// F006: Check if a scenario is available in adapted mode
export function isAdaptedScenarioAvailable(scenario: MockScenario): boolean {
  return getFallbackScenarios().includes(scenario);
}

// F006: Get list of available adapted scenarios
export function getAvailableAdaptedScenarios(): MockScenario[] {
  return ["create", "update", "governance-blocked", "write-success"];
}

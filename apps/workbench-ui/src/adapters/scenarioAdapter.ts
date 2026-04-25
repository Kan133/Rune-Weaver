// F006: Scenario Adapter - Clean Adapter Orchestration Layer
// Provides a unified interface for explicitly selected sources without hidden fallback chains.
// 
// RESPONSIBILITIES:
// - Mode-based scenario selection
// - Orchestrating calls to exactly one selected source
// - Re-exporting types for convenience
//
// NOT RESPONSIBILITIES:
// - Cascading fallback across unrelated sources
// - Source loading logic (handled by loader layer)
// - Type transformation (handled by workbenchResultAdapter)

import type { WorkbenchState, MockScenario } from "../types/workbench";
import { getMockScenario } from "../mocks/scenarios";
import { adaptWorkbenchResult } from "./workbenchResultAdapter";

// F005-R2: Import fallback fixtures from separate source layer
import { getFallbackFixture, getFallbackScenarios } from "../data/fallbackFixtures";

// F006: Import loader layer
import {
  loadWorkbenchResult,
  type DataSourceMode as LoaderDataSourceMode,
  type ResultMetadata,
} from "../services/workbenchResultLoader";
import { isWorkbenchDevOrTestMode } from "../lib/runtimeMode";

// F006: Re-export DataSourceMode from loader (source of truth)
export type DataSourceMode = LoaderDataSourceMode;

// F006: Export ResultMetadata for UI tracking
export type { ResultMetadata };

// F006: Import shared fixture types for loading
import type { AdapterInput } from "./workbenchResultAdapter";

function assertDevOnlyScenarioSource(mode: "shared-fixture" | "fallback-fixture"): void {
  if (!isWorkbenchDevOrTestMode()) {
    throw new Error(`[F006] ${mode} is only available in explicit dev/test environments`);
  }
}

function requireLoadedScenario(
  scenario: MockScenario,
  mode: Exclude<DataSourceMode, "mock">,
): Promise<WorkbenchState> {
  return loadWorkbenchResult(scenario, mode).then((loaded) => {
    if (!loaded) {
      throw new Error(`[F006] Failed to load scenario '${scenario}' from source '${mode}'`);
    }

    return adaptWorkbenchResult(loaded.result);
  });
}

// F006: Load shared fixture data dynamically from apps/workbench/fixtures.
// This is an explicit dev/test helper, not a silent fallback path.
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
    console.warn("[F006] Failed to load shared fixture:", error);
    return null;
  }
}

// F006: Create adapted scenario from explicit fixture sources.
// Shared fixtures are preferred in dev/test mode, with fallback fixtures as a deliberate
// adapter-owned escape hatch for fixture-driven UI work only.
export async function createAdaptedScenarioAsync(scenario: MockScenario): Promise<WorkbenchState> {
  assertDevOnlyScenarioSource("shared-fixture");

  const sharedFixture = await loadSharedFixture(scenario);
  if (sharedFixture) {
    console.log("[F006] Using shared fixture from apps/workbench/fixtures for scenario:", scenario);
    return adaptWorkbenchResult(sharedFixture);
  }

  assertDevOnlyScenarioSource("fallback-fixture");
  console.log("[F006] Using fallback fixture for scenario:", scenario);
  const fallback = getFallbackFixture(scenario);
  if (!fallback) {
    throw new Error(`[F006] No fallback available for scenario: ${scenario}`);
  }
  return adaptWorkbenchResult(fallback);
}

// F006: Synchronous version for backward compatibility.
// Uses explicit fallback fixtures only in dev/test mode.
export function createAdaptedScenario(scenario: MockScenario): WorkbenchState {
  assertDevOnlyScenarioSource("fallback-fixture");
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
    return getMockScenario(scenario);
  }

  return createAdaptedScenario(scenario);
}

// F006: Get scenario based on data source mode (asynchronous).
// Each request resolves through exactly one declared source.
export async function getScenarioStateAsync(
  scenario: MockScenario,
  mode: DataSourceMode
): Promise<WorkbenchState> {
  switch (mode) {
    case "mock":
      return getMockScenario(scenario);
    case "shared-fixture":
      return createAdaptedScenarioAsync(scenario);
    case "local-bridge":
    case "local-backend":
      return requireLoadedScenario(scenario, mode);
    default:
      throw new Error(`[F006] Unsupported data source mode: ${mode}`);
  }
}

// F006: Get scenario with metadata (for tracking source).
export async function getScenarioStateWithMetadata(
  scenario: MockScenario,
  mode: DataSourceMode
): Promise<{ state: WorkbenchState; metadata?: ResultMetadata }> {
  if (mode === "mock") {
    return { state: getMockScenario(scenario) };
  }

  if (mode === "shared-fixture") {
    return {
      state: await createAdaptedScenarioAsync(scenario),
      metadata: {
        source: mode,
        loadedAt: new Date().toISOString(),
        scenario,
      },
    };
  }

  const loaded = await loadWorkbenchResult(scenario, mode);
  if (!loaded) {
    throw new Error(`[F006] Failed to load scenario '${scenario}' from source '${mode}'`);
  }

  return {
    state: adaptWorkbenchResult(loaded.result),
    metadata: loaded.metadata,
  };
}

// F006: Check if a scenario is available in adapted mode
export function isAdaptedScenarioAvailable(scenario: MockScenario): boolean {
  return getFallbackScenarios().includes(scenario);
}

// F006: Get list of available adapted scenarios
export function getAvailableAdaptedScenarios(): MockScenario[] {
  return ["create", "update", "governance-blocked", "write-success"];
}

// F005: Adapter exports
export { adaptWorkbenchResult, type BackendWorkbenchResult } from "./workbenchResultAdapter";
export {
  createAdaptedScenario,
  createAdaptedScenarioAsync,
  getScenarioState,
  getScenarioStateAsync,
  getScenarioStateWithMetadata,
  type DataSourceMode,
  type ResultMetadata,
} from "./scenarioAdapter";

// F005: Re-export loader for direct access if needed
export {
  loadWorkbenchResult,
  getAvailableScenarios,
  type LoadedResult,
} from "../services/workbenchResultLoader";

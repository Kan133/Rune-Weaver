import type {
  WorkbenchResult,
  FeatureCard,
  FeatureDetail,
  LifecycleActions,
  ActionRouteResult,
  FeatureRouting,
  FeatureFocus,
  UpdateHandoff,
  UpdateHandler,
  UpdateWriteResult,
  GovernanceRelease,
  FeatureIdentity,
  FeatureOwnership,
  ConflictCheckResult,
} from "../types.js";

export type FixtureScenario = 
  | "create" 
  | "update" 
  | "governance_blocked" 
  | "forced_write_success";

export interface WorkbenchResultFixture {
  scenario: FixtureScenario;
  description: string;
  mockInput: {
    userPrompt: string;
    hostRoot: string;
    dryRun?: boolean;
    confirmedItemIds?: string[];
  };
  expected: Partial<WorkbenchResult>;
}

export interface CreateFixtureData {
  featureCard: FeatureCard;
  featureDetail: FeatureDetail;
  lifecycleActions: LifecycleActions;
  actionRoute: ActionRouteResult;
  featureRouting: FeatureRouting;
  featureFocus: FeatureFocus;
  featureIdentity: FeatureIdentity;
  featureOwnership: FeatureOwnership;
}

export interface UpdateFixtureData {
  featureCard: FeatureCard;
  featureDetail: FeatureDetail;
  lifecycleActions: LifecycleActions;
  featureRouting: FeatureRouting;
  featureFocus: FeatureFocus;
  updateHandoff: UpdateHandoff;
  updateHandler: UpdateHandler;
  updateWriteResult?: UpdateWriteResult;
  governanceRelease?: GovernanceRelease;
}

export interface GovernanceBlockedFixtureData {
  featureCard: FeatureCard;
  featureDetail: FeatureDetail;
  lifecycleActions: LifecycleActions;
  featureRouting: FeatureRouting;
  featureFocus: FeatureFocus;
  updateHandoff: UpdateHandoff;
  updateHandler: UpdateHandler;
  governanceRelease: GovernanceRelease;
  conflictResult?: ConflictCheckResult;
}

export interface ForcedWriteSuccessFixtureData {
  featureCard: FeatureCard;
  featureDetail: FeatureDetail;
  lifecycleActions: LifecycleActions;
  featureRouting: FeatureRouting;
  featureFocus: FeatureFocus;
  updateHandoff: UpdateHandoff;
  updateHandler: UpdateHandler;
  governanceRelease: GovernanceRelease;
  updateWriteResult: UpdateWriteResult;
}

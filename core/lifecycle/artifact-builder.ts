import type {
  LifecycleCompletionKind,
  LifecycleFinalVerdict,
} from "./types.js";

interface LifecycleArtifactLike {
  stages: Record<string, unknown>;
  finalVerdict: LifecycleFinalVerdict;
}

export class LifecycleArtifactBuilder<TArtifact extends LifecycleArtifactLike> {
  constructor(private readonly artifact: TArtifact) {}

  setStageResult(stageName: string, result: unknown): this {
    this.artifact.stages[stageName] = result;
    return this;
  }

  setFinalVerdict(fields: Partial<LifecycleFinalVerdict>): this {
    this.artifact.finalVerdict = {
      ...this.artifact.finalVerdict,
      ...fields,
    };
    return this;
  }

  setPipelineStatus(params: {
    pipelineComplete: boolean;
    weakestStage: string;
    completionKind: LifecycleCompletionKind;
    sufficientForDemo: boolean;
  }): this {
    return this.setFinalVerdict(params);
  }

  addRemainingRisk(risk: string): this {
    if (!this.artifact.finalVerdict.remainingRisks.includes(risk)) {
      this.artifact.finalVerdict.remainingRisks.push(risk);
    }
    return this;
  }

  addNextStep(step: string): this {
    if (!this.artifact.finalVerdict.nextSteps.includes(step)) {
      this.artifact.finalVerdict.nextSteps.push(step);
    }
    return this;
  }

  build(): TArtifact {
    return this.artifact;
  }
}

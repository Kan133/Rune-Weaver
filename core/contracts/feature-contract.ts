import type {
  FeatureContract,
  FeatureContractSurface,
  FeatureDependencyEdge,
} from "../schema/types.js";

export interface FeatureContractSurfaceIdentity {
  id: string;
  kind: FeatureContractSurface["kind"];
  contractId?: string;
}

export interface EnsureFeatureContractSurfaceInput extends FeatureContractSurfaceIdentity {
  summary: string;
}

export interface EnsureFeatureDependencyEdgeInput {
  relation: FeatureDependencyEdge["relation"];
  targetFeatureId?: string;
  targetSurfaceId?: string;
  targetContractId?: string;
  required?: boolean;
  summary?: string;
}

function cloneFeatureContract(contract?: FeatureContract): FeatureContract {
  return {
    exports: [...(contract?.exports || [])],
    consumes: [...(contract?.consumes || [])],
    integrationSurfaces: [...(contract?.integrationSurfaces || [])],
    stateScopes: [...(contract?.stateScopes || [])],
  };
}

function sameSurfaceIdentity(
  left: FeatureContractSurfaceIdentity,
  right: FeatureContractSurfaceIdentity,
): boolean {
  return left.id === right.id && left.kind === right.kind;
}

function mergeSurface(
  existing: FeatureContractSurface,
  next: EnsureFeatureContractSurfaceInput,
): FeatureContractSurface {
  return {
    ...existing,
    id: next.id,
    kind: next.kind,
    summary: next.summary,
    contractId: next.contractId || existing.contractId,
  };
}

function dependencyEdgeKey(edge: EnsureFeatureDependencyEdgeInput | FeatureDependencyEdge): string {
  return [
    edge.relation,
    edge.targetFeatureId || "",
    edge.targetSurfaceId || "",
  ].join(":");
}

export function createFeatureContractSurface(
  input: EnsureFeatureContractSurfaceInput,
): FeatureContractSurface {
  return {
    id: input.id,
    kind: input.kind,
    summary: input.summary,
    ...(input.contractId ? { contractId: input.contractId } : {}),
  };
}

export function ensureFeatureContractSurface(
  contract: FeatureContract | undefined,
  direction: "exports" | "consumes",
  input: EnsureFeatureContractSurfaceInput,
): FeatureContract {
  const nextContract = cloneFeatureContract(contract);
  const surfaces = [...nextContract[direction]];
  const existingIndex = surfaces.findIndex((surface) => sameSurfaceIdentity(surface, input));
  const nextSurface = createFeatureContractSurface(input);

  if (existingIndex >= 0) {
    surfaces[existingIndex] = mergeSurface(surfaces[existingIndex], input);
  } else {
    surfaces.push(nextSurface);
  }

  return {
    ...nextContract,
    [direction]: surfaces,
  };
}

export function findFeatureContractSurface(
  contract: FeatureContract | undefined,
  direction: "exports" | "consumes",
  identity: FeatureContractSurfaceIdentity,
): FeatureContractSurface | undefined {
  if (!contract) {
    return undefined;
  }

  return contract[direction].find((surface) => sameSurfaceIdentity(surface, identity));
}

export function ensureFeatureDependencyEdge(
  dependencyEdges: FeatureDependencyEdge[] | undefined,
  input: EnsureFeatureDependencyEdgeInput,
): FeatureDependencyEdge[] {
  const edges = [...(dependencyEdges || [])];
  const existingIndex = edges.findIndex((edge) => dependencyEdgeKey(edge) === dependencyEdgeKey(input));
  const nextEdge: FeatureDependencyEdge = {
    relation: input.relation,
    ...(input.targetFeatureId ? { targetFeatureId: input.targetFeatureId } : {}),
    ...(input.targetSurfaceId ? { targetSurfaceId: input.targetSurfaceId } : {}),
    ...(input.targetContractId ? { targetContractId: input.targetContractId } : {}),
    ...(input.required !== undefined ? { required: input.required } : {}),
    ...(input.summary ? { summary: input.summary } : {}),
  };

  if (existingIndex >= 0) {
    edges[existingIndex] = {
      ...edges[existingIndex],
      ...nextEdge,
      targetContractId: nextEdge.targetContractId || edges[existingIndex].targetContractId,
    };
    return edges;
  }

  return [...edges, nextEdge];
}

export function areFeatureContractSurfacesCompatible(
  expected: FeatureContractSurfaceIdentity,
  actual: FeatureContractSurface | undefined,
): boolean {
  if (!actual) {
    return false;
  }
  if (expected.id !== actual.id || expected.kind !== actual.kind) {
    return false;
  }
  if (expected.contractId && actual.contractId && expected.contractId !== actual.contractId) {
    return false;
  }
  return true;
}

export function featureContractSurfaceIdentityKey(surface: FeatureContractSurfaceIdentity): string {
  return `${surface.kind}:${surface.contractId || ""}:${surface.id}`;
}

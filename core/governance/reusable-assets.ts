import type { HostKind } from "../host/types.js";

export type ReusableAssetType = "pattern" | "family" | "seam";
export type ReusableAssetOriginLevel = "explore" | "pattern";
export type ReusableAssetAdmissionStatus = "candidate" | "admitted" | "deprecated";
export type PromotionPacketKind = "explore_to_pattern" | "explore_to_seam" | "pattern_to_family";

export interface ReusableAssetDecision {
  summary: string;
  decidedBy: string;
  decidedAt: string;
}

export interface ReusableAssetSourceBackedAuthority {
  sourceModelAdapter: string;
  updateAuthority: string;
  ownershipBoundary: string;
  dependencyBoundary: string;
}

export interface ReusableAssetPromotionRegistryEntry {
  assetId: string;
  assetType: ReusableAssetType;
  originLevel: ReusableAssetOriginLevel;
  hostKinds: HostKind[];
  status: ReusableAssetAdmissionStatus;
  contractRefs: string[];
  evidenceRefs: string[];
  acceptanceRefs: string[];
  packetId: string;
  decision: ReusableAssetDecision;
}

export interface ReusableAssetPromotionPacket {
  id: string;
  kind: PromotionPacketKind;
  assetId: string;
  assetType: ReusableAssetType;
  originLevel: ReusableAssetOriginLevel;
  hostKinds: HostKind[];
  contractRefs: string[];
  evidenceRefs: string[];
  acceptanceRefs: string[];
  invariants: string[];
  reviewRequiredRisks: string[];
  stableCapabilities?: string[];
  stableInputs?: string[];
  stableOutputs?: string[];
  sourceBackedAuthority?: ReusableAssetSourceBackedAuthority;
  decision: ReusableAssetDecision;
}

export interface ReusableAssetImplementationLookup {
  patternExists(assetId: string): boolean;
  familyExists(assetId: string): boolean;
  seamExists(assetId: string): boolean;
}

export interface ReusableAssetGovernanceValidationResult {
  valid: boolean;
  errors: string[];
}

function hasText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasAtLeastTwoDistinctRefs(refs: string[]): boolean {
  return new Set(refs.filter((ref) => hasText(ref))).size >= 2;
}

function validateDecision(
  decision: ReusableAssetDecision | undefined,
  prefix: string,
): string[] {
  if (!decision) {
    return [`${prefix}: missing manual decision`];
  }
  const errors: string[] = [];
  if (!hasText(decision.summary)) {
    errors.push(`${prefix}: decision.summary is required`);
  }
  if (!hasText(decision.decidedBy)) {
    errors.push(`${prefix}: decision.decidedBy is required`);
  }
  if (!hasText(decision.decidedAt)) {
    errors.push(`${prefix}: decision.decidedAt is required`);
  }
  return errors;
}

export function validatePromotionPacket(
  packet: ReusableAssetPromotionPacket,
): ReusableAssetGovernanceValidationResult {
  const errors: string[] = [];
  const prefix = `promotion packet '${packet.id}'`;
  if (!hasText(packet.assetId)) {
    errors.push(`${prefix}: assetId is required`);
  }
  if (packet.hostKinds.length === 0) {
    errors.push(`${prefix}: hostKinds must not be empty`);
  }
  if (packet.contractRefs.length === 0) {
    errors.push(`${prefix}: contractRefs must not be empty`);
  }
  if (packet.evidenceRefs.length === 0) {
    errors.push(`${prefix}: evidenceRefs must not be empty`);
  }
  if (packet.acceptanceRefs.length === 0) {
    errors.push(`${prefix}: acceptanceRefs must not be empty`);
  }
  if (!hasAtLeastTwoDistinctRefs(packet.acceptanceRefs)) {
    errors.push(`${prefix}: at least two distinct acceptance refs are required`);
  }
  if (packet.invariants.length === 0) {
    errors.push(`${prefix}: invariants must not be empty`);
  }
  if (packet.reviewRequiredRisks.length === 0) {
    errors.push(`${prefix}: reviewRequiredRisks must be explicitly recorded`);
  }
  errors.push(...validateDecision(packet.decision, prefix));

  if (packet.kind === "explore_to_pattern" || packet.kind === "explore_to_seam") {
    const targetAssetType = packet.kind === "explore_to_pattern" ? "pattern" : "seam";
    if (packet.assetType !== targetAssetType) {
      errors.push(`${prefix}: ${packet.kind} packets must target assetType='${targetAssetType}'`);
    }
    if (packet.originLevel !== "explore") {
      errors.push(`${prefix}: ${packet.kind} packets must originate from 'explore'`);
    }
    if ((packet.stableCapabilities || []).length === 0) {
      errors.push(`${prefix}: stableCapabilities are required for ${packet.kind}`);
    }
    if ((packet.stableInputs || []).length === 0) {
      errors.push(`${prefix}: stableInputs are required for ${packet.kind}`);
    }
    if ((packet.stableOutputs || []).length === 0) {
      errors.push(`${prefix}: stableOutputs are required for ${packet.kind}`);
    }
  }

  if (packet.kind === "pattern_to_family") {
    if (packet.assetType !== "family") {
      errors.push(`${prefix}: pattern_to_family packets must target assetType='family'`);
    }
    if (packet.originLevel !== "pattern") {
      errors.push(`${prefix}: pattern_to_family packets must originate from 'pattern'`);
    }
    if (!packet.sourceBackedAuthority) {
      errors.push(`${prefix}: sourceBackedAuthority is required for pattern_to_family`);
    } else {
      if (!hasText(packet.sourceBackedAuthority.sourceModelAdapter)) {
        errors.push(`${prefix}: sourceBackedAuthority.sourceModelAdapter is required`);
      }
      if (!hasText(packet.sourceBackedAuthority.updateAuthority)) {
        errors.push(`${prefix}: sourceBackedAuthority.updateAuthority is required`);
      }
      if (!hasText(packet.sourceBackedAuthority.ownershipBoundary)) {
        errors.push(`${prefix}: sourceBackedAuthority.ownershipBoundary is required`);
      }
      if (!hasText(packet.sourceBackedAuthority.dependencyBoundary)) {
        errors.push(`${prefix}: sourceBackedAuthority.dependencyBoundary is required`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function implementationExists(
  entry: ReusableAssetPromotionRegistryEntry,
  lookup: ReusableAssetImplementationLookup,
): boolean {
  switch (entry.assetType) {
    case "pattern":
      return lookup.patternExists(entry.assetId);
    case "family":
      return lookup.familyExists(entry.assetId);
    case "seam":
      return lookup.seamExists(entry.assetId);
  }
}

export function validatePromotionRegistryEntry(
  entry: ReusableAssetPromotionRegistryEntry,
  packets: Map<string, ReusableAssetPromotionPacket>,
  lookup: ReusableAssetImplementationLookup,
): ReusableAssetGovernanceValidationResult {
  const errors: string[] = [];
  const prefix = `promotion registry entry '${entry.assetType}:${entry.assetId}'`;
  if (!hasText(entry.assetId)) {
    errors.push(`${prefix}: assetId is required`);
  }
  if (entry.hostKinds.length === 0) {
    errors.push(`${prefix}: hostKinds must not be empty`);
  }
  if (entry.contractRefs.length === 0) {
    errors.push(`${prefix}: contractRefs must not be empty`);
  }
  if (entry.evidenceRefs.length === 0) {
    errors.push(`${prefix}: evidenceRefs must not be empty`);
  }
  if (entry.acceptanceRefs.length === 0) {
    errors.push(`${prefix}: acceptanceRefs must not be empty`);
  }
  errors.push(...validateDecision(entry.decision, prefix));

  const packet = packets.get(entry.packetId);
  if (!packet) {
    errors.push(`${prefix}: referenced packet '${entry.packetId}' is missing`);
  } else {
    if (packet.assetId !== entry.assetId || packet.assetType !== entry.assetType) {
      errors.push(`${prefix}: packet '${entry.packetId}' does not match asset identity`);
    }
    if (packet.originLevel !== entry.originLevel) {
      errors.push(`${prefix}: packet '${entry.packetId}' does not match origin level`);
    }
  }

  if (entry.status === "admitted") {
    if (!implementationExists(entry, lookup)) {
      errors.push(`${prefix}: admitted asset has no matching code implementation`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateReusableAssetGovernance(
  entries: ReusableAssetPromotionRegistryEntry[],
  packets: ReusableAssetPromotionPacket[],
  lookup: ReusableAssetImplementationLookup,
): ReusableAssetGovernanceValidationResult {
  const errors: string[] = [];
  const packetMap = new Map(packets.map((packet) => [packet.id, packet]));
  for (const packet of packets) {
    errors.push(...validatePromotionPacket(packet).errors);
  }
  for (const entry of entries) {
    errors.push(...validatePromotionRegistryEntry(entry, packetMap, lookup).errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function getReusableAssetAdmissionStatus(
  entries: ReusableAssetPromotionRegistryEntry[],
  assetType: ReusableAssetType,
  assetId: string,
  hostKind?: HostKind,
): ReusableAssetAdmissionStatus | "untracked" {
  const entry = entries.find(
    (candidate) =>
      candidate.assetType === assetType
      && candidate.assetId === assetId
      && (!hostKind || candidate.hostKinds.includes(hostKind)),
  );
  return entry?.status || "untracked";
}

export function isFormallyAdmittedReusableAsset(
  entries: ReusableAssetPromotionRegistryEntry[],
  assetType: ReusableAssetType,
  assetId: string,
  hostKind?: HostKind,
): boolean {
  return getReusableAssetAdmissionStatus(entries, assetType, assetId, hostKind) === "admitted";
}

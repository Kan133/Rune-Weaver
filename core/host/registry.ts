/**
 * Rune Weaver - Host Registry
 *
 * Thin registry for known host kinds.
 * It intentionally does not own scanner/init/generator behavior.
 */

import {
  HostKind,
  UNKNOWN_HOST_KIND,
} from "./types.js";

export interface HostKindRegistration {
  kind: HostKind;
  label: string;
  capabilities?: string[];
}

const hostKindRegistry = new Map<HostKind, HostKindRegistration>();

export function registerHostKind(registration: HostKindRegistration): void {
  hostKindRegistry.set(registration.kind, registration);
}

export function getKnownHostKinds(): HostKind[] {
  return Array.from(hostKindRegistry.keys());
}

export function isKnownHostKind(kind: string): kind is HostKind {
  return hostKindRegistry.has(kind);
}

export function getHostKindRegistration(kind: HostKind): HostKindRegistration | undefined {
  return hostKindRegistry.get(kind);
}

registerHostKind({
  kind: UNKNOWN_HOST_KIND,
  label: "Unknown Host",
});

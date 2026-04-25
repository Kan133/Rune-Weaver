import { DOTA2_X_TEMPLATE_HOST_KIND } from "../../../core/host/types.js";

export interface Dota2FamilyRegistration {
  id: string;
  hostKinds: string[];
  summary: string;
}

const dota2FamilyRegistry = new Map<string, Dota2FamilyRegistration>();

export function registerDota2Family(registration: Dota2FamilyRegistration): void {
  dota2FamilyRegistry.set(registration.id, registration);
}

export function getDota2FamilyRegistration(id: string): Dota2FamilyRegistration | undefined {
  return dota2FamilyRegistry.get(id);
}

export function getKnownDota2FamilyIds(): string[] {
  return Array.from(dota2FamilyRegistry.keys());
}

export function isKnownDota2Family(id: string): boolean {
  return dota2FamilyRegistry.has(id);
}

registerDota2Family({
  id: "selection_pool",
  hostKinds: [DOTA2_X_TEMPLATE_HOST_KIND],
  summary: "Source-backed five-module weighted selection family with externalized outcome realization.",
});

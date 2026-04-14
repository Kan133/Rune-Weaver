/**
 * Rune Weaver - Host Core Types
 *
 * Minimal host-generic contracts shared by schema/workspace/wizard layers.
 */

export type HostKind = string;

export const UNKNOWN_HOST_KIND = "unknown";
export const DOTA2_X_TEMPLATE_HOST_KIND = "dota2-x-template";
export const WAR3_CLASSIC_HOST_KIND = "war3-classic";

export interface HostDescriptor {
  kind: HostKind;
  projectRoot?: string;
  capabilities?: string[];
}

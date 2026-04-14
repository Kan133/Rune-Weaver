import { registerHostKind } from "../../core/host/registry.js";
import { WAR3_CLASSIC_HOST_KIND } from "../../core/host/types.js";

let registered = false;

export function ensureWar3HostKindRegistered(): void {
  if (registered) {
    return;
  }

  registerHostKind({
    kind: WAR3_CLASSIC_HOST_KIND,
    label: "Warcraft III Classic",
    capabilities: [
      "workspace-connect",
      "read-only-indexing",
      "planar-map",
      "anchor-extraction",
    ],
  });

  registered = true;
}

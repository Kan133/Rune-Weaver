import { registerHostKind } from "../../core/host/registry.js";
import { DOTA2_X_TEMPLATE_HOST_KIND } from "../../core/host/types.js";

let registered = false;

export function ensureDota2HostKindRegistered(): void {
  if (registered) {
    return;
  }

  registerHostKind({
    kind: DOTA2_X_TEMPLATE_HOST_KIND,
    label: "Dota2 x-template",
    capabilities: [
      "install-link",
      "launch-tools",
      "panorama-build",
      "vscripts-build",
    ],
  });

  registered = true;
}

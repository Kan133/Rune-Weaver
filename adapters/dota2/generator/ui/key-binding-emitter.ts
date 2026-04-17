/**
 * Key Binding Emitter Component Generator
 *
 * Generates the Panorama-side half of input.key_binding so the server-side
 * listener receives a real custom event from the client key surface.
 */

import { WritePlanEntry } from "../../assembler/index.js";

interface KeyBindingEmitterParams {
  triggerKey?: string;
  key?: string;
  eventName?: string;
}

function normalizeRequiredString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

export function generateKeyBindingEmitterComponent(
  componentName: string,
  featureId: string,
  entry: WritePlanEntry,
): string {
  const params = (entry.parameters || {}) as KeyBindingEmitterParams;
  const configuredKey = normalizeRequiredString(params.triggerKey || params.key).toUpperCase();
  const eventName = normalizeRequiredString(params.eventName, "rune_weaver_input_triggered");

  if (!configuredKey) {
    throw new Error("input.key_binding UI emitter requires an explicit triggerKey/key parameter.");
  }

  return `/**
 * ${componentName}
 * Generated input.key_binding Panorama emitter
 *
 * Current honest slice:
 * - input.key_binding owns trigger capture end-to-end
 * - UI emitter captures the configured key and forwards a custom event
 * - ui.selection_modal does not register trigger keys
 */

import React, { useEffect } from "react";
import { setKeyDownCallback } from "../../../hooks/useKeyboard";
import { registerCustomKey } from "../../../utils/keybinding";

declare global {
  interface CustomUIConfig {
    RuneWeaverInputBindingRegistry?: Record<string, boolean>;
  }
}

export function ${componentName}() {
  const featureId = ${JSON.stringify(featureId)};
  const configuredKey = ${JSON.stringify(configuredKey)};
  const eventName = ${JSON.stringify(eventName)};
  const bindingId = \`\${featureId}:\${configuredKey}:\${eventName}\`;

  useEffect(() => {
    const customUiConfig = GameUI.CustomUIConfig();
    if (!customUiConfig.RuneWeaverInputBindingRegistry) {
      customUiConfig.RuneWeaverInputBindingRegistry = {};
    }

    if (!customUiConfig.RuneWeaverInputBindingRegistry[bindingId]) {
      registerCustomKey(configuredKey);
      customUiConfig.RuneWeaverInputBindingRegistry[bindingId] = true;
    }

    setKeyDownCallback(configuredKey, () => {
      const playerId = Game.GetLocalPlayerID();
      console.log(\`[Rune Weaver] Emitting \${configuredKey} for feature \${featureId} via \${eventName}\`);
      (GameEvents.SendCustomGameEventToServer as any)(eventName, {
        PlayerID: playerId,
        playerId,
        key: configuredKey,
        featureId,
      });
    });

    console.log(\`[Rune Weaver] Input emitter ready: \${configuredKey} for feature \${featureId} via \${eventName}\`);

    return () => {
      setKeyDownCallback(configuredKey, () => {});
    };
  }, []);

  return null;
}

export default ${componentName};
`;
}

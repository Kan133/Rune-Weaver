import type { BlueprintConnection, BlueprintModule } from "../schema/types.js";

export function buildBlueprintConnections(modules: BlueprintModule[]): BlueprintConnection[] {
  const connections: BlueprintConnection[] = [];
  const triggerModules = modules.filter((module) => module.category === "trigger");
  const dataModules = modules.filter((module) => module.category === "data");
  const ruleModules = modules.filter((module) => module.category === "rule");
  const effectModules = modules.filter((module) => module.category === "effect");
  const uiModules = modules.filter((module) => module.category === "ui");

  for (const trigger of triggerModules) {
    for (const rule of ruleModules) {
      connections.push({
        from: trigger.id,
        to: rule.id,
        purpose: "瑙﹀彂瑙勫垯鎵ц",
      });
    }
    for (const effect of effectModules) {
      connections.push({
        from: trigger.id,
        to: effect.id,
        purpose: "瑙﹀彂鏁堟灉搴旂敤",
      });
    }
  }

  for (const data of dataModules) {
    for (const rule of ruleModules) {
      connections.push({
        from: data.id,
        to: rule.id,
        purpose: "鎻愪緵鏁版嵁杈撳叆",
      });
    }
    for (const effect of effectModules) {
      connections.push({
        from: data.id,
        to: effect.id,
        purpose: "鎻愪緵鏁堟灉鍙傛暟",
      });
    }
  }

  for (const rule of ruleModules) {
    for (const effect of effectModules) {
      connections.push({
        from: rule.id,
        to: effect.id,
        purpose: "瑙勫垯鍐崇瓥椹卞姩鏁堟灉",
      });
    }
  }

  for (const effect of effectModules) {
    for (const ui of uiModules) {
      connections.push({
        from: effect.id,
        to: ui.id,
        purpose: "鏁堟灉鐘舵€侀┍鍔?UI 鏇存柊",
      });
    }
  }

  return connections;
}

export function canonicalizeBlueprintModules(modules: BlueprintModule[]): BlueprintModule[] {
  return modules.map((module) => ({
    ...module,
    responsibilities: [...new Set(module.responsibilities)].filter(Boolean),
    inputs: module.inputs ? [...new Set(module.inputs)] : undefined,
    outputs: module.outputs ? [...new Set(module.outputs)] : undefined,
  }));
}

export function canonicalizeBlueprintConnections(
  connections: BlueprintConnection[],
  modules: BlueprintModule[],
): BlueprintConnection[] {
  const moduleIds = new Set(modules.map((module) => module.id));
  const deduped = new Map<string, BlueprintConnection>();

  for (const connection of connections) {
    if (!moduleIds.has(connection.from) || !moduleIds.has(connection.to)) {
      continue;
    }

    const key = `${connection.from}:${connection.to}:${connection.purpose}`;
    if (!deduped.has(key)) {
      deduped.set(key, connection);
    }
  }

  return [...deduped.values()];
}

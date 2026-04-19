import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { loadDotaHostSymbolIndex } from "./host-symbol-index.js";

const root = mkdtempSync(join(tmpdir(), "rw-retrieval-symbols-"));

try {
  mkdirSync(join(root, "vscripts"), { recursive: true });
  mkdirSync(join(root, "panorama"), { recursive: true });

  writeFileSync(
    join(root, "vscripts", "api.json"),
    JSON.stringify(
      [
        {
          kind: "class",
          name: "CDOTA_BaseNPC",
          description: "Base NPC class",
          members: [
            {
              kind: "function",
              name: "MoveToPosition",
              description: "Moves the unit to a target vector.",
              args: [{ name: "position", types: "Vector" }],
              returns: ["void"],
            },
          ],
        },
        {
          kind: "function",
          name: "CreateUnitByName",
          description: "Create a unit from script.",
          args: [{ name: "unitName", types: "string" }],
          returns: ["CDOTA_BaseNPC"],
        },
      ],
      null,
      2,
    ),
    "utf-8",
  );

  writeFileSync(
    join(root, "vscripts", "events.json"),
    JSON.stringify(
      [
        {
          name: "dota_player_spawned",
          description: "Fires when player hero has spawned.",
          fields: [{ name: "PlayerID", type: "PlayerID", description: "Player identifier." }],
        },
      ],
      null,
      2,
    ),
    "utf-8",
  );

  writeFileSync(
    join(root, "vscripts", "symbols-reference.json"),
    JSON.stringify(
      [
        {
          kind: "function",
          name: "ApplyDamage",
          description: "Apply damage to a target.",
          args: [{ name: "damageTable", types: "ApplyDamageOptions" }],
          returns: ["void"],
        },
      ],
      null,
      2,
    ),
    "utf-8",
  );

  writeFileSync(
    join(root, "vscripts", "enums.json"),
    JSON.stringify(
      [
        { name: "DOTA_UNIT_TARGET_TEAM_ENEMY", value: 2, kind: "constant" },
        {
          name: "DamageTypes",
          members: [{ name: "DAMAGE_TYPE_MAGICAL", value: 2 }],
        },
      ],
      null,
      2,
    ),
    "utf-8",
  );

  writeFileSync(
    join(root, "engine-enums.json"),
    JSON.stringify(
      [
        {
          name: "PseudoRandom",
          members: [{ name: "DOTA_PSEUDO_RANDOM_AXE_HELIX", shortName: "AXE_HELIX" }],
        },
      ],
      null,
      2,
    ),
    "utf-8",
  );

  const index = loadDotaHostSymbolIndex({ dataRoot: root });
  assert.ok(index.entries.length >= 8, "expected entries from api/events/enums");

  const createUnitHits = index.lookup("CreateUnitByName", { limit: 3 });
  assert.ok(createUnitHits.length > 0);
  assert.equal(createUnitHits[0].entry.kind, "api-function");
  assert.equal(createUnitHits[0].entry.name, "CreateUnitByName");

  const memberHits = index.lookup("MoveToPosition");
  assert.ok(memberHits.some((hit) => hit.entry.kind === "api-member" && hit.entry.containerName === "CDOTA_BaseNPC"));
  const exactMemberHits = index.lookupExact("CDOTA_BaseNPC.MoveToPosition");
  assert.ok(exactMemberHits.length > 0);
  assert.equal(exactMemberHits[0].entry.containerName, "CDOTA_BaseNPC");

  const eventHits = index.lookup("dota_player_spawned", { kinds: ["event"] });
  assert.equal(eventHits.length, 1);
  assert.equal(eventHits[0].entry.sourceFile, "vscripts/events.json");

  const enumHits = index.lookup("DAMAGE_TYPE_MAGICAL", { kinds: ["enum-member"] });
  assert.ok(enumHits.length > 0);
  assert.equal(enumHits[0].entry.containerName, "DamageTypes");

  const engineHits = index.lookup("AXE_HELIX", { domains: ["engine"] });
  assert.ok(engineHits.length > 0);
  assert.equal(engineHits[0].entry.domain, "engine");

  const nonWhitelistedFileHits = index.lookupExact("ApplyDamage", { kinds: ["api-function"] });
  assert.ok(nonWhitelistedFileHits.length > 0);
  assert.equal(nonWhitelistedFileHits[0].entry.sourceFile, "vscripts/symbols-reference.json");
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log("core/retrieval/host-symbol-index.test.ts passed");

import assert from "assert";
import type { DoctorCheck } from "./doctor-checks.js";
import { buildDoctorActionSummary } from "./doctor-summary.js";

function makeCheck(name: string, status: DoctorCheck["status"]): DoctorCheck {
  return { name, status, message: `${name}:${status}` };
}

const blocked = buildDoctorActionSummary([
  makeCheck("Addon Config", "fail"),
  makeCheck("Dota Directories", "warn"),
], "D:\\host");
assert.strictEqual(blocked.status, "blocked");
assert.ok(blocked.command?.includes("demo prepare"));

const repair = buildDoctorActionSummary([
  makeCheck("Addon Config", "pass"),
  makeCheck("Dota Directories", "pass"),
  makeCheck("Rune Weaver Workspace", "pass"),
  makeCheck("Post-Generation Validation", "fail"),
  makeCheck("Runtime Bridge Wiring", "pass"),
], "D:\\host");
assert.strictEqual(repair.status, "action_required");
assert.ok(repair.command?.includes("repair"));

const ready = buildDoctorActionSummary([
  makeCheck("Addon Config", "pass"),
  makeCheck("Dota Directories", "pass"),
  makeCheck("Rune Weaver Workspace", "pass"),
  makeCheck("Post-Generation Validation", "pass"),
  makeCheck("Runtime Bridge Wiring", "pass"),
  makeCheck("Host Build Artifacts", "pass"),
], "D:\\host");
assert.strictEqual(ready.status, "ready");
assert.ok(ready.command?.includes("yarn launch"));

console.log("Doctor summary tests passed");

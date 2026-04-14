import { writeFile } from "fs/promises";
import { join } from "path";
import { LATEST_DIR } from "./constants.js";
import type { Manifest } from "./types.js";

export async function writeManifest(manifest: Manifest): Promise<void> {
  const manifestPath = join(LATEST_DIR, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
}

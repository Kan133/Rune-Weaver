import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";

import type { GapFillApprovalRecord } from "../../../core/gap-fill/index.js";

export function saveGapFillApprovalRecord(record: GapFillApprovalRecord): string {
  const outputDir = join(process.cwd(), "tmp", "cli-review");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `gap-fill-approval-${timestamp}.json`;
  const outputPath = join(outputDir, filename);
  writeFileSync(outputPath, JSON.stringify(record, null, 2), "utf-8");
  return outputPath;
}

export function loadGapFillApprovalRecord(filePath: string): GapFillApprovalRecord {
  const resolvedPath = resolve(process.cwd(), filePath);
  return JSON.parse(readFileSync(resolvedPath, "utf-8")) as GapFillApprovalRecord;
}

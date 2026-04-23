import { existsSync } from "fs";
import { join } from "path";

import { deleteFeature, findFeatureById, loadWorkspace, saveWorkspace, workspaceExists } from "../../core/workspace/manager.js";
import { summarizeDota2FeatureGovernance } from "../../adapters/dota2/governance/feature-governance.js";

export async function runList(hostRoot: string): Promise<void> {
  console.log("=".repeat(60));
  console.log("RUNE WEAVER - LIST");
  console.log("=".repeat(60));

  if (!workspaceExists(hostRoot)) {
    console.error(`\n❌ Workspace not found at: ${hostRoot}`);
    console.error("   Please provide a valid host root path");
    return;
  }

  const workspaceResult = loadWorkspace(hostRoot);
  if (!workspaceResult.success || !workspaceResult.workspace) {
    console.error(`\n❌ Failed to load workspace: ${workspaceResult.issues.join(", ")}`);
    return;
  }

  const features = workspaceResult.workspace.features;
  console.log(`\n📦 Workspace: ${hostRoot}`);
  console.log(`   Total Features: ${features.length}`);

  if (features.length === 0) {
    console.log("\n   No features found. Use 'run' to create one.");
    return;
  }

  console.log("\n   ID                    | Status    | Revision | Patterns | Files | Updated");
  console.log("   " + "-".repeat(75));
  for (const feature of features) {
    const id = feature.featureId.padEnd(20);
    const status = feature.status.padEnd(9);
    const revision = String(feature.revision).padEnd(8);
    const patterns = String(feature.selectedPatterns.length).padEnd(8);
    const files = String(feature.generatedFiles.length).padEnd(5);
    const updated = feature.updatedAt.split("T")[0];
    console.log(`   ${id} | ${status} | ${revision} | ${patterns} | ${files} | ${updated}`);
  }
}

export async function runDelete(featureId: string, hostRoot: string, confirmed: boolean): Promise<void> {
  console.log("=".repeat(60));
  console.log("RUNE WEAVER - DELETE");
  console.log("=".repeat(60));

  if (!workspaceExists(hostRoot)) {
    console.error(`\n❌ Workspace not found at: ${hostRoot}`);
    console.error("   Please provide a valid host root path");
    return;
  }

  const workspaceResult = loadWorkspace(hostRoot);
  if (!workspaceResult.success || !workspaceResult.workspace) {
    console.error(`\n❌ Failed to load workspace: ${workspaceResult.issues.join(", ")}`);
    return;
  }

  const feature = findFeatureById(workspaceResult.workspace, featureId);
  if (!feature) {
    console.error(`\n❌ Feature '${featureId}' not found in workspace`);
    return;
  }

  console.log(`\n⚠️  DELETE PREVIEW: ${feature.featureId}`);
  console.log(`   Intent Kind: ${feature.intentKind}`);
  console.log(`   Status: ${feature.status}`);
  console.log(`   Revision: ${feature.revision}`);
  console.log(`   Selected Patterns: ${feature.selectedPatterns.join(", ")}`);

  const rwOwnedFiles = feature.generatedFiles.filter((file) =>
    file.includes("game/scripts/src/rune_weaver/") ||
    file.includes("game/scripts/vscripts/rune_weaver/") ||
    file.includes("content/panorama/src/rune_weaver/"),
  );
  const nonRwOwnedFiles = feature.generatedFiles.filter((file) => !rwOwnedFiles.includes(file));

  console.log("\n📁 Impact Summary:");
  console.log(`   Total Generated Files: ${feature.generatedFiles.length}`);
  console.log(`   RW-Owned Files: ${rwOwnedFiles.length}`);
  console.log(`   Non-RW-Owned Files: ${nonRwOwnedFiles.length}`);

  if (rwOwnedFiles.length > 0) {
    console.log("\n   RW-Owned Files (will be deleted):");
    for (const file of rwOwnedFiles) {
      console.log(`     - ${file}`);
    }
  }

  if (nonRwOwnedFiles.length > 0) {
    console.log("\n   ⚠️  Non-RW-Owned Files (CANNOT delete - outside RW scope):");
    for (const file of nonRwOwnedFiles) {
      console.log(`     - ${file}`);
    }
  }

  console.log("\n💡 Dependency Hints:");
  if (feature.dependsOn && feature.dependsOn.length > 0) {
    console.log(`   Dependencies: ${feature.dependsOn.join(", ")}`);
  } else {
    console.log("   Dependencies: None recorded");
  }
  console.log("   Bridge Points: Check manually if referenced in:");
  console.log("     - game/scripts/src/modules/index.ts");
  console.log("     - content/panorama/src/hud/script.tsx");

  if (!confirmed) {
    console.log("\n❌ DELETE ABORTED: --confirm flag required");
    console.log("   To delete, run with --confirm flag:");
    console.log(`   npx tsx apps/workbench/index.ts --delete ${featureId} ${hostRoot} --confirm`);
    return;
  }

  console.log("\n🔥 Executing DELETE...");

  const deleteResult = deleteFeature(workspaceResult.workspace, featureId);
  if (!deleteResult.success) {
    console.error(`\n❌ Delete failed: ${deleteResult.issues.join(", ")}`);
    return;
  }

  if (!deleteResult.workspace) {
    console.error("\n❌ Delete failed: no workspace returned");
    return;
  }

  const writeResult = saveWorkspace(hostRoot, deleteResult.workspace);
  if (!writeResult.success) {
    console.error(`\n❌ Failed to save workspace: ${writeResult.issues.join(", ")}`);
    return;
  }

  console.log(`\n✅ Feature '${featureId}' deleted from workspace`);
  console.log("   Note: Only workspace record removed.");
  console.log("   Files still present on disk must be reviewed below.");

  console.log("\n📋 ORPHANED FILE REVIEW (post-delete):");
  const orphanedFiles: string[] = [];
  for (const file of rwOwnedFiles) {
    const fullPath = join(hostRoot, file);
    if (existsSync(fullPath)) {
      orphanedFiles.push(file);
    }
  }

  if (orphanedFiles.length === 0) {
    console.log("   No orphaned RW-owned files detected.");
  } else {
    console.log(`   ⚠️  ${orphanedFiles.length} orphaned RW-owned file(s) still on disk:`);
    for (const file of orphanedFiles) {
      console.log(`     - ${file}`);
    }
    console.log("   These files should be manually removed if no longer needed.");
  }

  if (nonRwOwnedFiles.length > 0) {
    console.log(`\n   ⚠️  ${nonRwOwnedFiles.length} non-RW-owned file(s) (not managed by RW):`);
    for (const file of nonRwOwnedFiles) {
      console.log(`     - ${file}`);
    }
    console.log("   These files are outside RW scope and require manual handling.");
  }
}

export async function runInspect(featureId: string, hostRoot: string): Promise<void> {
  console.log("=".repeat(60));

  if (!workspaceExists(hostRoot)) {
    console.error(`\n❌ Workspace not found at: ${hostRoot}`);
    console.error("   Please provide a valid host root path");
    return;
  }

  const workspaceResult = loadWorkspace(hostRoot);
  if (!workspaceResult.success || !workspaceResult.workspace) {
    console.error(`\n❌ Failed to load workspace: ${workspaceResult.issues.join(", ")}`);
    return;
  }

  const feature = findFeatureById(workspaceResult.workspace, featureId);
  if (!feature) {
    console.error(`\n❌ Feature '${featureId}' not found in workspace`);
    console.error(`   Available features: ${workspaceResult.workspace.features.length}`);
    for (const existingFeature of workspaceResult.workspace.features.slice(0, 5)) {
      console.error(`   - ${existingFeature.featureId} (${existingFeature.status})`);
    }
    return;
  }

  console.log(`\n📋 Feature: ${feature.featureId}`);
  console.log(`   Intent Kind: ${feature.intentKind}`);
  console.log(`   Status: ${feature.status}`);
  console.log(`   Revision: ${feature.revision}`);
  console.log(`   Generated Files: ${feature.generatedFiles.length}`);
  console.log(`   Selected Patterns: ${feature.selectedPatterns.join(", ")}`);
  console.log(`   Created: ${feature.createdAt}`);
  console.log(`   Updated: ${feature.updatedAt}`);
  const governanceSummary = summarizeDota2FeatureGovernance(feature);
  console.log(`   Implementation Strategy: ${governanceSummary.implementationStrategy || "(unknown)"}`);
  console.log(`   Maturity: ${governanceSummary.maturity || "(unknown)"}`);
  console.log(`   Commit Outcome: ${governanceSummary.commitOutcome || "(unknown)"}`);
  if (governanceSummary.familyAdmissions.length > 0) {
    console.log(`   Family Governance: ${governanceSummary.familyAdmissions.map((item) => `${item.assetId}(${item.status})`).join(", ")}`);
  }
  if (governanceSummary.patternAdmissions.length > 0) {
    console.log(`   Pattern Governance: ${governanceSummary.patternAdmissions.map((item) => `${item.assetId}(${item.status})`).join(", ")}`);
  }

  if (feature.generatedFiles.length > 0) {
    console.log("\n📁 Generated Files:");
    for (const file of feature.generatedFiles) {
      console.log(`   - ${file}`);
    }
  }
}

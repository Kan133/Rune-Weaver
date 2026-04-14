import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type RegistryEntry = {
  docPath: string;
  status: string;
  freshness: string;
  action: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const docsRoot = path.join(repoRoot, "docs");
const registryPath = path.join(docsRoot, "DOC-STATUS-REGISTRY.md");
const routingPath = path.join(docsRoot, "AGENT-DOC-ROUTING.md");
const sessionSyncDir = path.join(docsRoot, "session-sync");

const HEADER_KEYS = [
  "Status",
  "Audience",
  "Doc family",
  "Update cadence",
  "Last verified",
  "Read when",
  "Do not use for",
] as const;

const HIGH_SIGNAL_PHRASES: Array<{ label: string; pattern: RegExp }> = [
  { label: "active baseline", pattern: /\bactive baseline\b/i },
  { label: "active technical reference", pattern: /\bactive technical reference\b/i },
  { label: "current execution", pattern: /\bcurrent execution\b/i },
  { label: "next-stage execution order", pattern: /\bnext-stage execution order\b/i },
];

function markdownTargetToFsPath(target: string, baseDir = repoRoot): string | null {
  if (!target || target.startsWith("#")) {
    return null;
  }

  if (/^https?:\/\//i.test(target)) {
    return null;
  }

  const [withoutHash] = target.split("#", 1);
  if (!withoutHash) {
    return null;
  }

  const decoded = decodeURIComponent(withoutHash);

  if (/^\/[A-Za-z]:\//.test(decoded)) {
    return path.win32.normalize(decoded.slice(1));
  }

  if (/^[A-Za-z]:\//.test(decoded)) {
    return path.win32.normalize(decoded);
  }

  return path.normalize(path.resolve(baseDir, decoded));
}

function extractMarkdownLinks(text: string): Array<{ label: string; target: string }> {
  const links: Array<{ label: string; target: string }> = [];
  const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    links.push({ label: match[1], target: match[2] });
  }

  return links;
}

function parseRegistryEntries(text: string): RegistryEntry[] {
  const entries: RegistryEntry[] = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    if (!line.startsWith("| [")) {
      continue;
    }

    const columns = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (columns.length < 4) {
      continue;
    }

    const link = extractMarkdownLinks(columns[0])[0];
    if (!link) {
      continue;
    }

    const docPath = markdownTargetToFsPath(link.target);
    if (!docPath) {
      continue;
    }

    entries.push({
      docPath,
      status: columns[1],
      freshness: columns[2],
      action: columns[3],
    });
  }

  return entries;
}

function parseReadInOrderDocs(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const docs: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim() !== "Read in this order:") {
      continue;
    }

    let started = false;
    for (let j = i + 1; j < lines.length; j += 1) {
      const line = lines[j].trim();

      if (!line) {
        if (started) {
          break;
        }
        continue;
      }

      if (!/^\d+\.\s/.test(line)) {
        if (started) {
          break;
        }
        continue;
      }
      started = true;

      const link = extractMarkdownLinks(line)[0];
      if (!link) {
        continue;
      }

      const docPath = markdownTargetToFsPath(link.target);
      if (docPath) {
        docs.push(docPath);
      }
    }
  }

  return docs;
}

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function missingHeaderKeys(text: string): string[] {
  return HEADER_KEYS.filter((key) => !new RegExp(`^> ${key}:\\s+.+$`, "m").test(text));
}

async function getMarkdownFiles(rootDir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await fs.readdir(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await getMarkdownFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".md") {
      results.push(fullPath);
    }
  }

  return results;
}

function isLatestSessionSyncNote(name: string): boolean {
  return /^dota2-mainline-.*\.md$/i.test(name) || /^war3-mainline-.*\.md$/i.test(name);
}

async function main(): Promise<void> {
  const failures: string[] = [];
  const registryText = await fs.readFile(registryPath, "utf8");
  const routingText = await fs.readFile(routingPath, "utf8");

  const registryEntries = parseRegistryEntries(registryText);
  const registryMap = new Map(registryEntries.map((entry) => [path.normalize(entry.docPath), entry]));
  const routedDocs = parseReadInOrderDocs(routingText);
  const rootDocs = (await fs.readdir(docsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".md")
    .map((entry) => path.join(docsRoot, entry.name));
  const docsMarkdownFiles = await getMarkdownFiles(docsRoot);
  const markdownLinkSources = [path.join(repoRoot, "README.md"), path.join(repoRoot, "INDEX.md"), ...docsMarkdownFiles];

  for (const rootDoc of rootDocs) {
    if (!registryMap.has(path.normalize(rootDoc))) {
      failures.push(`Root docs file is not registered: ${rootDoc}`);
    }
  }

  const sessionFiles = (await fs.readdir(sessionSyncDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".md")
    .map((entry) => entry.name)
    .sort();
  const dotaNotes = sessionFiles.filter((name) => /^dota2-mainline-.*\.md$/i.test(name));
  const war3Notes = sessionFiles.filter((name) => /^war3-mainline-.*\.md$/i.test(name));
  const extras = sessionFiles.filter(
    (name) =>
      name !== "RW-SHARED-PLAN.md" &&
      name !== "SESSION-SYNC-PROTOCOL.md" &&
      !isLatestSessionSyncNote(name),
  );

  if (dotaNotes.length !== 1) {
    failures.push(`docs/session-sync must contain exactly 1 live Dota2 note, found ${dotaNotes.length}.`);
  }
  if (war3Notes.length !== 1) {
    failures.push(`docs/session-sync must contain exactly 1 live War3 note, found ${war3Notes.length}.`);
  }
  if (!sessionFiles.includes("RW-SHARED-PLAN.md")) {
    failures.push("docs/session-sync is missing RW-SHARED-PLAN.md");
  }
  if (!sessionFiles.includes("SESSION-SYNC-PROTOCOL.md")) {
    failures.push("docs/session-sync is missing SESSION-SYNC-PROTOCOL.md");
  }
  if (extras.length > 0) {
    failures.push(`docs/session-sync contains historical or unexpected files: ${extras.join(", ")}`);
  }

  for (const link of extractMarkdownLinks(registryText)) {
    const docPath = markdownTargetToFsPath(link.target);
    if (docPath && !(await fileExists(docPath))) {
      failures.push(`Registry link target does not exist: ${docPath}`);
    }
  }

  for (const link of extractMarkdownLinks(routingText)) {
    const docPath = markdownTargetToFsPath(link.target);
    if (docPath && !(await fileExists(docPath))) {
      failures.push(`Routing link target does not exist: ${docPath}`);
    }
  }

  for (const entry of registryEntries) {
    const exists = await fileExists(entry.docPath);
    if (!exists) {
      failures.push(`Registered doc does not exist: ${entry.docPath}`);
      continue;
    }

    const text = await fs.readFile(entry.docPath, "utf8");
    const missing = missingHeaderKeys(text);
    if (missing.length > 0) {
      failures.push(`Registered doc is missing metadata keys [${missing.join(", ")}]: ${entry.docPath}`);
    }
  }

  for (const docPath of routedDocs) {
    const entry = registryMap.get(path.normalize(docPath));
    if (!entry) {
      failures.push(`Read-in-order routing doc is not registered: ${docPath}`);
      continue;
    }

    if (entry.action === "ignore-for-execution") {
      failures.push(`Read-in-order route points to ignore-for-execution doc: ${docPath}`);
    }

    if (entry.freshness === "redirect-stub") {
      failures.push(`Read-in-order route points to redirect-stub doc: ${docPath}`);
    }

    if (entry.freshness === "needs-refresh") {
      failures.push(`Read-in-order route points to needs-refresh doc: ${docPath}`);
    }
  }

  for (const docPath of docsMarkdownFiles) {
    const normalized = path.normalize(docPath);
    if (registryMap.has(normalized)) {
      continue;
    }

    const text = await fs.readFile(docPath, "utf8");
    for (const { label, pattern } of HIGH_SIGNAL_PHRASES) {
      if (pattern.test(text)) {
        failures.push(`Unregistered doc contains high-signal phrase "${label}": ${docPath}`);
      }
    }
  }

  for (const sourcePath of markdownLinkSources) {
    if (!(await fileExists(sourcePath))) {
      continue;
    }

    const text = await fs.readFile(sourcePath, "utf8");
    const baseDir = path.dirname(sourcePath);
    for (const link of extractMarkdownLinks(text)) {
      const targetPath = markdownTargetToFsPath(link.target, baseDir);
      if (!targetPath) {
        continue;
      }
      if (!(await fileExists(targetPath))) {
        failures.push(`Broken markdown link in ${sourcePath}: ${link.target}`);
      }
    }
  }

  if (failures.length > 0) {
    console.error("Doc governance check failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("Doc governance check passed.");
  console.log(`- Registered docs checked: ${registryEntries.length}`);
  console.log(`- Root docs registered: ${rootDocs.length}`);
  console.log(`- Session-sync live files checked: ${sessionFiles.length}`);
  console.log(`- Markdown link sources checked: ${markdownLinkSources.length}`);
}

await main();

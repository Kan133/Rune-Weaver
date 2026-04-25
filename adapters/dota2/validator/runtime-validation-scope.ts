export type RuntimeValidationSide = "server" | "ui";

export interface RuntimeValidationDiagnosticLike {
  file: string;
}

const SERVER_SCOPE_PREFIXES = [
  "game/scripts/src/rune_weaver/",
  "src/rune_weaver/",
] as const;

const SERVER_SCOPE_FILES = new Set([
  "game/scripts/src/modules/index.ts",
  "src/modules/index.ts",
]);

const UI_SCOPE_PREFIXES = [
  "content/panorama/src/rune_weaver/",
  "src/rune_weaver/",
] as const;

const UI_SCOPE_FILES = new Set([
  "content/panorama/src/hud/script.tsx",
  "src/hud/script.tsx",
]);

export function extractDiagnosticFileFromMessage(message: string): string | undefined {
  const match = message.match(/\bin file\s+(.+?\.tsx?)(?:[\s.)]|$)/i);
  return match?.[1]?.trim();
}

export function normalizeValidationDiagnosticFile(file: string, hostRoot: string): string {
  const normalizedFile = file.replace(/\\/g, "/").trim();
  if (!normalizedFile) {
    return "";
  }

  const normalizedHostRoot = hostRoot.replace(/\\/g, "/").replace(/\/+$/, "");
  if (normalizedFile.toLowerCase().startsWith(normalizedHostRoot.toLowerCase())) {
    return normalizedFile.slice(normalizedHostRoot.length).replace(/^\/+/, "");
  }

  return normalizedFile.replace(/^\/+/, "");
}

export function isRuntimeValidationDiagnosticInScope(
  diagnostic: RuntimeValidationDiagnosticLike,
  side: RuntimeValidationSide,
  hostRoot: string,
): boolean {
  const normalizedFile = normalizeValidationDiagnosticFile(diagnostic.file, hostRoot);
  if (!normalizedFile) {
    return true;
  }

  const prefixes = side === "server" ? SERVER_SCOPE_PREFIXES : UI_SCOPE_PREFIXES;
  const exactFiles = side === "server" ? SERVER_SCOPE_FILES : UI_SCOPE_FILES;
  return prefixes.some((prefix) => normalizedFile.startsWith(prefix)) || exactFiles.has(normalizedFile);
}

export function partitionRuntimeValidationDiagnostics<T extends RuntimeValidationDiagnosticLike>(
  diagnostics: T[],
  side: RuntimeValidationSide,
  hostRoot: string,
): {
  relevant: T[];
  external: T[];
} {
  const relevant: T[] = [];
  const external: T[] = [];

  for (const diagnostic of diagnostics) {
    if (isRuntimeValidationDiagnosticInScope(diagnostic, side, hostRoot)) {
      relevant.push(diagnostic);
    } else {
      external.push(diagnostic);
    }
  }

  return { relevant, external };
}

function describeRuntimeValidationScope(side: RuntimeValidationSide): string {
  return side === "server"
    ? "Rune Weaver server namespace and modules/index bridge entry"
    : "Rune Weaver UI namespace and hud/script bridge entry";
}

export function buildExternalRuntimeDiagnosticLimitation(
  diagnostics: RuntimeValidationDiagnosticLike[],
  side: RuntimeValidationSide,
  hostRoot: string,
): string | undefined {
  if (diagnostics.length === 0) {
    return undefined;
  }

  const files = Array.from(
    new Set(
      diagnostics
        .map((diagnostic) => normalizeValidationDiagnosticFile(diagnostic.file, hostRoot))
        .filter((file) => file.length > 0),
    ),
  );

  const fileList = files.slice(0, 3).join(", ");
  const overflow = files.length > 3 ? ", ..." : "";
  const fileClause = fileList.length > 0 ? ` Ignored files: ${fileList}${overflow}.` : "";

  return `${
    side === "server" ? "Server" : "UI"
  } compile reported ${diagnostics.length} error(s) outside runtime validation scope (${describeRuntimeValidationScope(side)}).${fileClause}`;
}

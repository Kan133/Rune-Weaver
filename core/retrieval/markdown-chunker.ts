import type { CorpusSource, RetrievalHit, RetrievalQuery } from "./types.js";

export interface MarkdownChunk {
  id: string;
  sourceId: string;
  sourcePath: string;
  headingPath: string[];
  headingLevel?: number;
  heading?: string;
  content: string;
}

export interface ChunkMarkdownOptions {
  sourceId: string;
  sourcePath: string;
  maxChunkChars?: number;
  minChunkChars?: number;
}

interface HeadingState {
  level: number;
  text: string;
}

const DEFAULT_MAX_CHARS = 1200;
const DEFAULT_MIN_CHARS = 280;

export function chunkMarkdownByHeadings(
  markdown: string,
  options: ChunkMarkdownOptions,
): MarkdownChunk[] {
  const maxChunkChars = normalizeLimit(options.maxChunkChars, DEFAULT_MAX_CHARS);
  const minChunkChars = normalizeLimit(options.minChunkChars, DEFAULT_MIN_CHARS);
  const lines = markdown.split(/\r?\n/);
  const headingStack: HeadingState[] = [];
  const contentBuffer: string[] = [];
  const chunks: MarkdownChunk[] = [];
  let inFence = false;

  const emitCurrentBuffer = () => {
    const body = trimEmptyLines(contentBuffer.join("\n"));
    contentBuffer.length = 0;
    if (!body) return;

    const segments = splitSectionBody(body, maxChunkChars, minChunkChars);
    for (const segment of segments) {
      const activeHeading = headingStack.length > 0 ? headingStack[headingStack.length - 1] : undefined;
      chunks.push({
        id: `${options.sourceId}::${chunks.length + 1}`,
        sourceId: options.sourceId,
        sourcePath: options.sourcePath,
        headingPath: headingStack.map((item) => item.text),
        headingLevel: activeHeading?.level,
        heading: activeHeading?.text,
        content: segment,
      });
    }
  };

  for (const line of lines) {
    if (isFenceLine(line)) {
      inFence = !inFence;
      contentBuffer.push(line);
      continue;
    }

    if (!inFence) {
      const heading = readHeading(line);
      if (heading) {
        emitCurrentBuffer();
        while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= heading.level) {
          headingStack.pop();
        }
        headingStack.push(heading);
        continue;
      }
    }

    contentBuffer.push(line);
  }

  emitCurrentBuffer();
  return chunks;
}

export interface CuratedMarkdownDocument {
  id: string;
  path: string;
  markdown: string;
}

export interface CuratedMarkdownCorpusOptions {
  id?: string;
  sourceKind?: "curated-markdown";
  documents: CuratedMarkdownDocument[];
  maxChunkChars?: number;
  minChunkChars?: number;
}

export function createCuratedMarkdownCorpusSource(
  options: CuratedMarkdownCorpusOptions,
): CorpusSource {
  const sourceId = options.id || "curated-markdown";
  const chunks = options.documents.flatMap((document) =>
    chunkMarkdownByHeadings(document.markdown, {
      sourceId: document.id,
      sourcePath: document.path,
      maxChunkChars: options.maxChunkChars,
      minChunkChars: options.minChunkChars,
    }),
  );

  return {
    id: sourceId,
    kind: options.sourceKind || "curated-markdown",
    search(query: RetrievalQuery): RetrievalHit[] {
      const limit = normalizeLimit(query.perSourceLimit, 8);
      const queryTokens = tokenize(query.text);
      if (queryTokens.length === 0) {
        return [];
      }

      return chunks
        .map((chunk) => {
          const contentTokens = tokenize(`${chunk.headingPath.join(" ")} ${chunk.content}`);
          const score = scoreTokenOverlap(queryTokens, contentTokens);
          return {
            chunk,
            score,
          };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((item) => toRetrievalHit(sourceId, item.chunk, item.score));
    },
  };
}

function toRetrievalHit(sourceId: string, chunk: MarkdownChunk, score: number): RetrievalHit {
  const headingTitle = chunk.headingPath.length > 0 ? chunk.headingPath.join(" > ") : chunk.sourcePath;
  return {
    id: chunk.id,
    sourceId,
    sourceKind: "curated-markdown",
    score,
    title: headingTitle,
    snippet: chunk.content.slice(0, 280),
    reference: chunk.sourcePath,
    metadata: {
      headingPath: chunk.headingPath,
      headingLevel: chunk.headingLevel,
      sourceChunkId: chunk.id,
    },
  };
}

function scoreTokenOverlap(queryTokens: string[], contentTokens: string[]): number {
  if (queryTokens.length === 0 || contentTokens.length === 0) return 0;

  const contentSet = new Set(contentTokens);
  let matched = 0;
  for (const token of queryTokens) {
    if (contentSet.has(token)) {
      matched += 1;
    }
  }
  if (matched === 0) return 0;
  return matched / Math.max(queryTokens.length, 1);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function splitSectionBody(content: string, maxChars: number, minChars: number): string[] {
  if (content.length <= maxChars) return [content];

  const paragraphs = content
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return [content];

  const segments: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= maxChars || current.length === 0) {
      current = candidate;
      continue;
    }

    segments.push(current);
    current = paragraph;
  }

  if (current) {
    segments.push(current);
  }

  const normalized: string[] = [];
  for (const segment of segments) {
    if (segment.length <= maxChars) {
      normalized.push(segment);
      continue;
    }

    let cursor = 0;
    while (cursor < segment.length) {
      normalized.push(segment.slice(cursor, cursor + maxChars).trim());
      cursor += maxChars;
    }
  }

  if (normalized.length > 1) {
    const last = normalized[normalized.length - 1];
    if (last.length < minChars) {
      normalized[normalized.length - 2] = `${normalized[normalized.length - 2]}\n\n${last}`;
      normalized.pop();
    }
  }

  return normalized.filter(Boolean);
}

function trimEmptyLines(content: string): string {
  return content.replace(/^\s+/, "").replace(/\s+$/, "");
}

function readHeading(line: string): HeadingState | undefined {
  const match = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
  if (!match) return undefined;
  const text = match[2].trim();
  if (!text) return undefined;
  return {
    level: match[1].length,
    text,
  };
}

function isFenceLine(line: string): boolean {
  return /^\s*```/.test(line) || /^\s*~~~/.test(line);
}

function normalizeLimit(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || !value || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
}

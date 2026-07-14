// Simple, dependency-free text chunker. Splits on paragraph boundaries first,
// then packs paragraphs into chunks up to `maxChars`, with a character-based
// overlap between consecutive chunks so retrieval doesn't lose context that
// straddled a chunk boundary.
//
// Character-based sizing (not token-based) keeps this independent of any
// specific tokenizer — good enough for chunk sizing since we're targeting
// a rough token budget, not an exact one. ~4 chars/token is a safe estimate
// for English text, so maxChars defaults to a ~500-token chunk.

export interface Chunk {
  index: number;
  content: string;
}

export interface ChunkOptions {
  maxChars?: number;
  overlapChars?: number;
}

export function chunkText(text: string, opts: ChunkOptions = {}): Chunk[] {
  const maxChars = opts.maxChars ?? 2000;
  const overlapChars = opts.overlapChars ?? 200;

  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (normalized.length === 0) return [];

  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const chunks: Chunk[] = [];
  let current = "";

  const pushCurrent = () => {
    const trimmed = current.trim();
    if (trimmed.length > 0) {
      chunks.push({ index: chunks.length, content: trimmed });
    }
    current = "";
  };

  for (const paragraph of paragraphs) {
    // A single paragraph longer than maxChars gets hard-split.
    if (paragraph.length > maxChars) {
      pushCurrent();
      for (let start = 0; start < paragraph.length; start += maxChars - overlapChars) {
        const slice = paragraph.slice(start, start + maxChars);
        chunks.push({ index: chunks.length, content: slice.trim() });
      }
      continue;
    }

    if (current.length + paragraph.length + 2 > maxChars) {
      pushCurrent();
      // Carry the tail of the previous chunk forward as overlap context.
      const prev = chunks[chunks.length - 1]?.content ?? "";
      current = prev.slice(Math.max(0, prev.length - overlapChars));
    }

    current = current.length > 0 ? `${current}\n\n${paragraph}` : paragraph;
  }
  pushCurrent();

  // Re-index in case pushCurrent ran mid-loop for oversized paragraphs.
  return chunks.map((c, i) => ({ index: i, content: c.content }));
}

/** Rough token estimate for storage in document_chunks.token_count (not exact). */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

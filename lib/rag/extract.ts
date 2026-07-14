// Plain-text extraction for the source file types in a typical case file set:
// emails (.eml), PDFs, and generic text/plain files. OneDrive documents that
// arrive as Word/Excel are treated as "other" and rejected for now — see
// SUPPORTED_MIME_TYPES below and extend as needed.

import { simpleParser } from "mailparser";

export interface ExtractedDocument {
  text: string;
  /** Best-effort metadata pulled from the source file itself (e.g. email headers). */
  metadata: Record<string, unknown>;
}

function guessSourceType(filename: string, mimeType: string | null): "email" | "attachment" | "other" {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".eml") || mimeType === "message/rfc822") return "email";
  if (lower.endsWith(".pdf") || mimeType === "application/pdf") return "attachment";
  return "other";
}

// mailparser types `from`/`to` as AddressObject | AddressObject[] and `html`
// as `string | false` — normalize both to plain strings defensively.
function addressText(addr: unknown): string | null {
  if (!addr) return null;
  if (Array.isArray(addr)) return addr.map((a) => (a as { text?: string }).text ?? "").join(", ") || null;
  return (addr as { text?: string }).text ?? null;
}

async function extractEmail(buffer: Buffer): Promise<ExtractedDocument> {
  const parsed = await simpleParser(buffer);
  const htmlText = typeof parsed.html === "string" ? parsed.html.replace(/<[^>]+>/g, " ") : "";
  const bodyText = parsed.text ?? htmlText;
  const fromText = addressText(parsed.from);
  const toText = addressText(parsed.to);
  const header = [
    `From: ${fromText ?? "unknown"}`,
    `To: ${toText ?? "unknown"}`,
    `Date: ${parsed.date?.toISOString() ?? "unknown"}`,
    `Subject: ${parsed.subject ?? "(no subject)"}`,
  ].join("\n");

  return {
    text: `${header}\n\n${bodyText}`.trim(),
    metadata: {
      from: fromText,
      to: toText,
      subject: parsed.subject ?? null,
      date: parsed.date?.toISOString() ?? null,
    },
  };
}

async function extractPdf(buffer: Buffer): Promise<ExtractedDocument> {
  // pdf-parse v2 (built on pdfjs-dist) tries to spin up a real worker
  // thread, then falls back to a "fake worker" that dynamically imports
  // pdf.worker.mjs by path. Inside a Next.js server bundle that path gets
  // rewritten to a webpack chunk location the file was never emitted to,
  // which throws "Setting up fake worker failed" in production even though
  // it works in local dev. Explicitly pointing PDFParse at the on-disk
  // worker file (resolved via pdf-parse's own `worker` subpath export)
  // sidesteps the fake-worker path entirely. This must run before the
  // first PDFParse instantiation — see pdf-parse's troubleshooting docs:
  // https://github.com/mehmet-kozan/pdf-parse/blob/main/docs/troubleshooting.md
  const { PDFParse } = await import("pdf-parse");
  const { getPath } = await import("pdf-parse/worker");
  PDFParse.setWorker(getPath());

  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return {
      text: result.text.trim(),
      metadata: {
        page_count: result.total ?? null,
      },
    };
  } finally {
    await parser.destroy();
  }
}

/**
 * Extracts plain text + light metadata from a raw file buffer.
 * Throws for unsupported types — callers should mark the document "failed".
 */
export async function extractText(
  buffer: Buffer,
  filename: string,
  mimeType: string | null,
): Promise<ExtractedDocument & { sourceType: "email" | "attachment" | "other" }> {
  const sourceType = guessSourceType(filename, mimeType);

  if (sourceType === "email") {
    const extracted = await extractEmail(buffer);
    return { ...extracted, sourceType };
  }

  if (filename.toLowerCase().endsWith(".pdf") || mimeType === "application/pdf") {
    const extracted = await extractPdf(buffer);
    return { ...extracted, sourceType: "attachment" };
  }

  // text/* covers plain text, code, and markdown. A small allowlist of
  // non-"text/" mime types covers generated code files (JSON, SQL) that are
  // still safe to treat as UTF-8 text.
  const TEXTLIKE_MIME_TYPES = new Set(["application/json", "application/sql"]);
  if (
    mimeType?.startsWith("text/") ||
    (mimeType && TEXTLIKE_MIME_TYPES.has(mimeType)) ||
    filename.toLowerCase().endsWith(".txt") ||
    filename.toLowerCase().endsWith(".csv")
  ) {
    return { text: buffer.toString("utf-8").trim(), metadata: {}, sourceType: "other" };
  }

  throw new Error(
    `Unsupported file type for "${filename}" (${mimeType ?? "unknown mime type"}). ` +
      "Supported: .eml, .pdf, .txt, .csv.",
  );
}

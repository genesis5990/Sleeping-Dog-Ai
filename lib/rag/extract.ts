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
  // pdf-parse v2 uses a class-based API (PDFParse) rather than v1's plain
  // function export. Keep the import lazy so builds without a PDF in the
  // request path stay fast.
  const { PDFParse } = await import("pdf-parse");
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

  if (
    mimeType?.startsWith("text/") ||
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

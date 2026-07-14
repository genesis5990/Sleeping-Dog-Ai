// Detects fenced code blocks (```lang\n...\n```) in assistant message content
// so the chat UI can offer "Save as file" on each one automatically, without
// waiting for the user to select text manually.

export interface DetectedCodeBlock {
  language: string | null;
  content: string;
  /** Character offset of the block within the original message, for dedup/keys. */
  index: number;
}

// Map common fence language tags to a file extension for the suggested filename.
const EXTENSION_BY_LANGUAGE: Record<string, string> = {
  javascript: "js",
  js: "js",
  jsx: "jsx",
  typescript: "ts",
  ts: "ts",
  tsx: "tsx",
  python: "py",
  py: "py",
  sql: "sql",
  bash: "sh",
  sh: "sh",
  shell: "sh",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  html: "html",
  css: "css",
  go: "go",
  rust: "rs",
  java: "java",
  kotlin: "kt",
  markdown: "md",
  md: "md",
  text: "txt",
  plaintext: "txt",
};

export function detectCodeBlocks(content: string): DetectedCodeBlock[] {
  const blocks: DetectedCodeBlock[] = [];
  // Matches ```lang\n...content...\n``` — lang is optional, content is non-greedy.
  const fenceRegex = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g;

  let match: RegExpExecArray | null;
  while ((match = fenceRegex.exec(content)) !== null) {
    const [, lang, body] = match;
    const trimmed = body.trim();
    // Skip trivial/empty blocks — not worth offering as a saveable file.
    if (trimmed.length < 10) continue;

    blocks.push({
      language: lang || null,
      content: trimmed,
      index: match.index,
    });
  }

  return blocks;
}

export function suggestFilename(block: DetectedCodeBlock, fallbackIndex: number): string {
  const lang = block.language?.toLowerCase() ?? "";
  const ext = EXTENSION_BY_LANGUAGE[lang] ?? "txt";

  // Try to infer a name from an obvious first-line hint, e.g. "# filename: foo.py"
  // or a shebang; otherwise fall back to a generic sequential name.
  const firstLine = block.content.split("\n")[0]?.trim() ?? "";
  const filenameHintMatch = firstLine.match(/(?:filename|file):\s*([\w.-]+)/i);
  if (filenameHintMatch) return filenameHintMatch[1];

  return `snippet-${fallbackIndex + 1}.${ext}`;
}

export function guessMimeType(block: DetectedCodeBlock): string {
  const lang = block.language?.toLowerCase() ?? "";
  const MIME_BY_LANGUAGE: Record<string, string> = {
    json: "application/json",
    html: "text/html",
    css: "text/css",
    javascript: "text/javascript",
    js: "text/javascript",
    typescript: "text/typescript",
    ts: "text/typescript",
    python: "text/x-python",
    py: "text/x-python",
    sql: "application/sql",
    markdown: "text/markdown",
    md: "text/markdown",
  };
  return MIME_BY_LANGUAGE[lang] ?? "text/plain";
}

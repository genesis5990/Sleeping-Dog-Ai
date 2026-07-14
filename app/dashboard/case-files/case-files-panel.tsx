"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Workspace } from "@/lib/supabase/types";

interface DocumentRow {
  id: string;
  filename: string;
  source_type: "email" | "attachment" | "onedrive" | "other";
  mime_type: string | null;
  size_bytes: number | null;
  status: "pending" | "processing" | "ready" | "failed";
  error_message: string | null;
  chunk_count: number;
  created_at: string;
}

const STATUS_STYLES: Record<DocumentRow["status"], string> = {
  pending: "bg-slate-100 text-slate-600",
  processing: "bg-amber-50 text-amber-700",
  ready: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CaseFilesPanel({
  workspaces,
  activeWorkspace,
  initialDocuments,
}: {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  initialDocuments: DocumentRow[];
}) {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentRow[]>(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasProcessing = documents.some((d) => d.status === "pending" || d.status === "processing");

  const refreshDocuments = useCallback(async () => {
    const res = await fetch(`/api/documents/ingest?workspace_id=${activeWorkspace.id}`);
    if (res.ok) {
      const json = await res.json();
      setDocuments(json.documents ?? []);
    }
  }, [activeWorkspace.id]);

  // Poll while anything is still pending/processing, so status updates
  // (ready/failed) show up without a manual refresh.
  useEffect(() => {
    if (!hasProcessing) return;
    const interval = setInterval(refreshDocuments, 4000);
    return () => clearInterval(interval);
  }, [hasProcessing, refreshDocuments]);

  async function uploadFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("workspace_id", activeWorkspace.id);
      for (const file of fileArray) form.append("file", file);

      const res = await fetch("/api/documents/ingest", { method: "POST", body: form });
      if (!res.ok) {
        setError(await res.text());
      }
      await refreshDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function deleteDocument(id: string) {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(await res.text());
      await refreshDocuments();
    }
  }

  function switchWorkspace(slug: string) {
    router.push(`/dashboard/case-files?workspace=${slug}`);
  }

  return (
    <div className="mx-auto w-full max-w-[1000px] flex-1 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Case Files</h1>
          <p className="mt-1 text-sm text-slate-600">
            Upload documents here to ground chat answers in your actual data via retrieval-augmented search.
          </p>
        </div>
        {workspaces.length > 1 && (
          <select
            value={activeWorkspace.slug}
            onChange={(e) => switchWorkspace(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.slug}>{w.name}</option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files.length > 0) void uploadFiles(e.dataTransfer.files);
        }}
        className={`mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragActive ? "border-brand-400 bg-brand-50" : "border-slate-300 bg-white"
        }`}
      >
        <p className="text-sm text-slate-600">
          Drag and drop files here, or{" "}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
            disabled={uploading}
          >
            browse
          </button>
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Supported: .eml, .pdf, .txt, .csv — up to 25MB each
        </p>
        {uploading && <p className="mt-3 text-xs font-medium text-brand-600">Uploading and processing…</p>}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".eml,.pdf,.txt,.csv,message/rfc822,application/pdf,text/plain,text/csv"
          className="hidden"
          onChange={(e) => e.target.files && void uploadFiles(e.target.files)}
        />
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">
          {documents.length} document{documents.length === 1 ? "" : "s"} in {activeWorkspace.name}
        </h2>

        {documents.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Nothing uploaded yet. Files you add here become searchable context for{" "}
            <Link href="/dashboard/chat" className="text-brand-700 underline underline-offset-2">chat</Link>.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{doc.filename}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {doc.source_type} · {formatBytes(doc.size_bytes)}
                    {doc.status === "ready" && ` · ${doc.chunk_count} chunk${doc.chunk_count === 1 ? "" : "s"}`}
                    {doc.status === "failed" && doc.error_message ? ` · ${doc.error_message}` : ""}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${STATUS_STYLES[doc.status]}`}>
                  {doc.status}
                </span>
                <button
                  onClick={() => deleteDocument(doc.id)}
                  className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:border-red-200 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

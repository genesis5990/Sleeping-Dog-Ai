"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Workspace } from "@/lib/supabase/types";

interface FileRow {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  source: "auto_detected" | "manual";
  language: string | null;
  thread_id: string | null;
  linked_document_id: string | null;
  created_at: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesPanel({
  workspaces,
  activeWorkspace,
  initialFiles,
}: {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  initialFiles: FileRow[];
}) {
  const router = useRouter();
  const [files, setFiles] = useState<FileRow[]>(initialFiles);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function switchWorkspace(slug: string) {
    router.push(`/dashboard/files?workspace=${slug}`);
  }

  async function downloadFile(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/files/${id}`);
      if (!res.ok) {
        setError(await res.text());
        return;
      }
      const { url } = await res.json();
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(await res.text());
      router.refresh();
    }
  }

  async function linkToChat(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/files/${id}/link`, { method: "POST" });
      if (!res.ok) {
        setError(await res.text());
        return;
      }
      const result = await res.json();
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, linked_document_id: result.documentId } : f)),
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1000px] flex-1 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Files</h1>
          <p className="mt-1 text-sm text-slate-600">
            Code and text saved from chat \u2014 either auto-detected code blocks or messages you saved manually.
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

      <div className="mt-6">
        {files.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            Nothing saved yet. In any chat, click &ldquo;Save&rdquo; under a code block or message to send it here.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm font-medium text-slate-900">{file.filename}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatBytes(file.size_bytes)} · {file.source === "auto_detected" ? "auto-detected" : "manual save"}
                    {file.thread_id && (
                      <>
                        {" · "}
                        <Link href={`/dashboard/chat?workspace=${activeWorkspace.slug}&thread=${file.thread_id}`} className="text-brand-700 hover:underline">
                          view source chat
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {file.linked_document_id ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                      In Case Files
                    </span>
                  ) : (
                    <button
                      onClick={() => void linkToChat(file.id)}
                      disabled={busyId === file.id}
                      className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-brand-200 hover:text-brand-700 disabled:opacity-50"
                    >
                      {busyId === file.id ? "Linking\u2026" : "Use as chat context"}
                    </button>
                  )}
                  <button
                    onClick={() => void downloadFile(file.id)}
                    disabled={busyId === file.id}
                    className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-brand-200 hover:text-brand-700 disabled:opacity-50"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => void deleteFile(file.id)}
                    className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:border-red-200 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

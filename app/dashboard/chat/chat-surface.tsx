"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ChatThread, Workspace } from "@/lib/supabase/types";
import { detectCodeBlocks, suggestFilename, guessMimeType } from "@/lib/files/detect-code-blocks";

type UiRole = "user" | "assistant" | "system" | "tool";
interface UiSource {
  filename: string;
  similarity: number;
  document_id: string;
}
interface UiMessage {
  id: string;
  role: UiRole;
  content: string;
  pending?: boolean;
  sources?: UiSource[];
  dbId?: string; // persisted chat_messages.id, once known — needed to link a saved file to its source message
}

export function ChatSurface({
  workspaces,
  activeWorkspace,
  threads,
  activeThreadId,
  initialMessages,
  modelName,
  runpodConfigured,
}: {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  threads: ChatThread[];
  activeThreadId: string | null;
  initialMessages: { id: string; role: string; content: string; created_at: string }[];
  modelName: string;
  runpodConfigured: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<UiMessage[]>(() =>
    initialMessages.map((m) => ({
      id: m.id,
      dbId: m.id,
      role: (m.role as UiRole) ?? "assistant",
      content: m.content,
    })),
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFileKeys, setSavedFileKeys] = useState<Set<string>>(new Set());
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedThreads, setArchivedThreads] = useState<ChatThread[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visibleThreads = showArchived ? archivedThreads : threads;

  async function toggleShowArchived() {
    const next = !showArchived;
    setShowArchived(next);
    if (next) {
      const res = await fetch(`/api/chat/threads?workspace_id=${activeWorkspace.id}&archived=true`);
      if (res.ok) {
        const json = await res.json();
        setArchivedThreads(json.threads ?? []);
      }
    }
  }

  async function toggleArchive(threadId: string, archive: boolean) {
    const res = await fetch(`/api/chat/threads/${threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: archive }),
    });
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    if (showArchived) {
      setArchivedThreads((prev) => prev.filter((t) => t.id !== threadId));
    }
    if (archive && threadId === activeThreadId) {
      router.push(`/dashboard/chat?workspace=${activeWorkspace.slug}`);
    }
    router.refresh();
  }

  async function deleteThread(threadId: string) {
    const res = await fetch(`/api/chat/threads/${threadId}`, { method: "DELETE" });
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    setArchivedThreads((prev) => prev.filter((t) => t.id !== threadId));
    if (threadId === activeThreadId) {
      router.push(`/dashboard/chat?workspace=${activeWorkspace.slug}`);
    }
    router.refresh();
  }

  async function saveAsFile(opts: {
    key: string;
    filename: string;
    content: string;
    mimeType: string;
    language?: string | null;
    source: "auto_detected" | "manual";
    messageId?: string;
  }) {
    setSavingKey(opts.key);
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          thread_id: activeThreadId,
          message_id: opts.messageId ?? null,
          filename: opts.filename,
          content: opts.content,
          mime_type: opts.mimeType,
          language: opts.language ?? null,
          source: opts.source,
        }),
      });
      if (!res.ok) {
        setError(await res.text());
        return;
      }
      setSavedFileKeys((prev) => new Set(prev).add(opts.key));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save file");
    } finally {
      setSavingKey(null);
    }
  }

  // Auto-scroll on new content.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const canSend = useMemo(
    () => runpodConfigured && !!activeThreadId && input.trim().length > 0 && !sending,
    [runpodConfigured, activeThreadId, input, sending],
  );

  async function createThread() {
    const res = await fetch("/api/chat/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: activeWorkspace.id }),
    });
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    const thread = (await res.json()) as ChatThread;
    router.push(`/dashboard/chat?workspace=${activeWorkspace.slug}&thread=${thread.id}`);
    router.refresh();
  }

  async function send() {
    if (!canSend || !activeThreadId) return;
    setError(null);
    setSending(true);

    const userMessage: UiMessage = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content: input.trim(),
    };
    const assistantMessage: UiMessage = {
      id: `local-asst-${Date.now()}`,
      role: "assistant",
      content: "",
      pending: true,
    };
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    const payloadContent = input.trim();
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: activeThreadId, content: payloadContent }),
      });

      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => "Request failed");
        throw new Error(msg);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          const event = eventLine?.slice(6).trim() ?? "message";
          const data = dataLine.slice(5).trim();
          let json: any = null;
          try { json = JSON.parse(data); } catch { /* noop */ }

          if (event === "delta" && json?.content) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id
                  ? { ...m, content: m.content + json.content }
                  : m,
              ),
            );
          } else if (event === "error") {
            throw new Error(json?.message ?? "Stream error");
          } else if (event === "done") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id
                  ? { ...m, pending: false, sources: json?.sources ?? [] }
                  : m,
              ),
            );
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setMessages((prev) =>
        prev.map((m) =>
          m.id.startsWith("local-asst") && m.pending
            ? { ...m, content: m.content || "(no response)", pending: false }
            : m,
        ),
      );
    } finally {
      setSending(false);
      // Pull the durable IDs from the DB on next navigation; refresh is cheap.
      router.refresh();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-[260px_1fr] overflow-hidden">
      {/* Sidebar */}
      <aside className="flex flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-3">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Workspace
          </label>
          <select
            value={activeWorkspace.slug}
            onChange={(e) =>
              router.push(`/dashboard/chat?workspace=${e.target.value}`)
            }
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.slug}>{w.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between px-3 pt-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            {showArchived ? "Archived" : "Chats"}
          </span>
          <button
            onClick={createThread}
            className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-700"
          >
            + New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {visibleThreads.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-slate-400">
              {showArchived ? "No archived chats." : "No chats yet. Click + New to start."}
            </p>
          )}
          {visibleThreads.map((t) => (
            <div key={t.id} className="group relative">
              <Link
                href={`/dashboard/chat?workspace=${activeWorkspace.slug}&thread=${t.id}`}
                className={
                  "block truncate rounded-md px-2 py-1.5 pr-14 text-sm " +
                  (t.id === activeThreadId
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-700 hover:bg-slate-50")
                }
              >
                {t.title}
              </Link>
              <div className="absolute right-1 top-1/2 hidden -translate-y-1/2 gap-1 group-hover:flex">
                <button
                  title={t.archived_at ? "Unarchive" : "Archive"}
                  onClick={(e) => {
                    e.preventDefault();
                    void toggleArchive(t.id, !t.archived_at);
                  }}
                  className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    {t.archived_at ? (
                      <path d="M21 8H3l1 12a2 2 0 002 2h10a2 2 0 002-2l1-12zM1 3h22v5H1zM10 12h4" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                      <path d="M21 8H3l1 12a2 2 0 002 2h10a2 2 0 002-2l1-12zM1 3h22v5H1z" strokeLinecap="round" strokeLinejoin="round" />
                    )}
                  </svg>
                </button>
                <button
                  title="Delete permanently"
                  onClick={(e) => {
                    e.preventDefault();
                    void deleteThread(t.id);
                  }}
                  className="rounded p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-600"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 p-2">
          <button
            onClick={() => void toggleShowArchived()}
            className="w-full rounded-md px-2 py-1.5 text-center text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          >
            {showArchived ? "← Back to active chats" : "View archived chats"}
          </button>
        </div>
      </aside>

      {/* Main chat */}
      <section className="flex min-h-0 flex-col bg-white">
        {!runpodConfigured && (
          <div className="border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-xs text-amber-900">
            RunPod endpoint not configured. Set <code className="rounded bg-amber-100 px-1">RUNPOD_ENDPOINT_ID</code> and <code className="rounded bg-amber-100 px-1">RUNPOD_API_KEY</code> in <code>.env.local</code> to enable chat.
          </div>
        )}

        {!activeThreadId ? (
          <div className="flex flex-1 items-center justify-center p-10 text-center">
            <div>
              <p className="text-sm text-slate-500">Pick a chat from the sidebar, or</p>
              <button
                onClick={createThread}
                className="mt-3 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Start a new chat
              </button>
            </div>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
              <div className="mx-auto max-w-3xl space-y-4">
                {messages.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center text-sm text-slate-500">
                    Say hello to <span className="font-medium text-slate-700">{modelName}</span>.
                  </div>
                )}

                {messages.map((m) => {
                  const codeBlocks = m.role === "assistant" && !m.pending ? detectCodeBlocks(m.content) : [];
                  return (
                    <div key={m.id} className={"flex flex-col " + (m.role === "user" ? "items-end" : "items-start")}>
                      <div
                        className={
                          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm " +
                          (m.role === "user"
                            ? "bg-brand-600 text-white"
                            : "border border-slate-200 bg-white text-slate-800")
                        }
                      >
                        {m.content || (m.pending ? <span className="inline-flex gap-1"><Dot /><Dot delay={0.15} /><Dot delay={0.3} /></span> : "")}
                      </div>

                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-1.5 flex max-w-[85%] flex-wrap gap-1.5">
                          {m.sources.map((s, i) => (
                            <Link
                              key={`${m.id}-src-${i}`}
                              href="/dashboard/case-files"
                              title={`similarity ${s.similarity.toFixed(2)}`}
                              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 hover:border-brand-200 hover:text-brand-700"
                            >
                              [{i + 1}] {s.filename}
                            </Link>
                          ))}
                        </div>
                      )}

                      {m.role === "assistant" && !m.pending && m.content.trim().length > 0 && (
                        <div className="mt-1.5 flex max-w-[85%] flex-wrap gap-1.5">
                          {codeBlocks.map((block, i) => {
                            const key = `${m.id}-block-${i}`;
                            const saved = savedFileKeys.has(key);
                            return (
                              <button
                                key={key}
                                disabled={saved || savingKey === key}
                                onClick={() =>
                                  saveAsFile({
                                    key,
                                    filename: suggestFilename(block, i),
                                    content: block.content,
                                    mimeType: guessMimeType(block),
                                    language: block.language,
                                    source: "auto_detected",
                                    messageId: m.dbId,
                                  })
                                }
                                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 hover:border-brand-200 hover:text-brand-700 disabled:opacity-60"
                              >
                                {saved ? "Saved ✓" : savingKey === key ? "Saving…" : `Save ${suggestFilename(block, i)}`}
                              </button>
                            );
                          })}
                          <button
                            disabled={savedFileKeys.has(`${m.id}-full`) || savingKey === `${m.id}-full`}
                            onClick={() =>
                              saveAsFile({
                                key: `${m.id}-full`,
                                filename: `message-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.md`,
                                content: m.content,
                                mimeType: "text/markdown",
                                source: "manual",
                                messageId: m.dbId,
                              })
                            }
                            className="rounded-full border border-dashed border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-500 hover:border-brand-300 hover:text-brand-700 disabled:opacity-60"
                          >
                            {savedFileKeys.has(`${m.id}-full`) ? "Message saved ✓" : "Save whole message"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="border-t border-rose-200 bg-rose-50 px-6 py-2 text-xs text-rose-700">
                {error}
              </div>
            )}

            <div className="border-t border-slate-200 bg-white px-6 py-4">
              <div className="mx-auto max-w-3xl">
                <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
                  <textarea
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={runpodConfigured ? "Message the model…" : "Configure RunPod to start chatting…"}
                    disabled={!runpodConfigured || sending}
                    className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none disabled:opacity-60"
                  />
                  <button
                    onClick={() => void send()}
                    disabled={!canSend}
                    className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
                  >
                    {sending ? "…" : "Send"}
                  </button>
                </div>
                <p className="mt-2 text-center text-[11px] text-slate-400">
                  Enter to send · Shift+Enter for newline · Streaming from RunPod vLLM
                </p>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400"
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

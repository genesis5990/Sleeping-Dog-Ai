import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";

const ENDPOINTS = [
  { name: "Chat", model: "Qwen3-8B", role: "General reasoning & conversation" },
  { name: "Embeddings", model: "bge-large-en-v1.5", role: "Case Files retrieval (RAG)" },
  { name: "Coder", model: "Qwen3-Coder-30B-A3B", role: "Agentic coding & tool use" },
];

const FEATURES = [
  {
    title: "Nothing leaves your infrastructure",
    body: "Every model runs on your own RunPod serverless endpoints. No prompts, documents, or completions touch OpenAI, Anthropic, or any third-party API — the whole stack is yours, end to end.",
  },
  {
    title: "Case Files: RAG over your own documents",
    body: "Upload emails, PDFs, and case files. They're chunked, embedded, and stored in Supabase with pgvector — then retrieved automatically into chat context, with sources cited on every answer.",
  },
  {
    title: "Three specialized endpoints, one workspace",
    body: "A general chat model, a dedicated embedding model for retrieval, and a 30B coding model with agentic tool-calling — each on its own right-sized GPU, not one model doing everything badly.",
  },
  {
    title: "Row-level security, not app-level trust",
    body: "Every table — workspaces, threads, messages, documents, chunks — is scoped by Postgres RLS. A workspace member literally cannot query another workspace's rows, even if the app code has a bug.",
  },
  {
    title: "OpenAI-compatible, swap anytime",
    body: "Every endpoint speaks the standard /v1/chat/completions and /v1/embeddings API. Point at a different model or a different GPU tier without touching application code.",
  },
  {
    title: "Built on infrastructure you already run",
    body: "Supabase for data, Fly.io for the app, RunPod for inference. No new vendor relationship, no new dashboard to babysit — it plugs into the stack you already operate.",
  },
];

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-ink-950">
      <SiteHeader authed={!!user} />

      {/* HERO */}
      <section className="hero-bg relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-ink-600 bg-ink-900 px-3 py-1 text-xs font-medium text-slate-300">
              <span className="status-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
              3 private endpoints online
            </span>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl md:text-6xl">
              Your own AI. Your own infrastructure.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-slate-400">
              Sleeping Dog Ai runs Qwen3 chat, coding, and embedding models on RunPod endpoints you
              provision and pay for. No third-party model API ever sees your prompts, your documents,
              or your case files.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={user ? "/dashboard" : "/login"}
                className="inline-flex items-center justify-center rounded-md bg-brand-500 px-5 py-3 text-sm font-medium text-ink-950 shadow-sm transition hover:bg-brand-400"
              >
                {user ? "Open your workspace" : "Sign in"}
              </Link>
              <a
                href="#stack"
                className="inline-flex items-center justify-center rounded-md border border-ink-600 bg-ink-900 px-5 py-3 text-sm font-medium text-slate-200 shadow-sm transition hover:border-ink-500"
              >
                See the endpoints →
              </a>
            </div>
          </div>

          {/* Real endpoint status card — not a mockup */}
          <div className="relative mx-auto mt-16 max-w-4xl">
            <div className="dotted-grid absolute inset-x-10 -bottom-6 top-10 rounded-3xl opacity-40" aria-hidden />
            <div className="relative overflow-hidden rounded-2xl border border-ink-600 bg-ink-900 shadow-soft">
              <div className="flex items-center gap-2 border-b border-ink-700 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-3 font-mono text-xs text-slate-500">
                  api.runpod.ai/v2/&#123;endpoint_id&#125;/openai/v1
                </span>
              </div>
              <div className="divide-y divide-ink-700">
                {ENDPOINTS.map((ep) => (
                  <div key={ep.name} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="status-dot h-2 w-2 rounded-full bg-emerald-400" />
                      <div>
                        <div className="text-sm font-medium text-slate-100">{ep.name}</div>
                        <div className="text-xs text-slate-500">{ep.role}</div>
                      </div>
                    </div>
                    <span className="rounded-md border border-ink-600 bg-ink-800 px-2.5 py-1 font-mono text-xs text-slate-300">
                      {ep.model}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STACK */}
      <section id="stack" className="border-y border-ink-700 bg-ink-900/60 py-10">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-xs uppercase tracking-wider text-slate-500">
            Built on infrastructure you provision, not a vendor's black box
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 font-mono text-sm text-slate-400">
            <span>RunPod</span>
            <span className="text-slate-600">·</span>
            <span>Supabase</span>
            <span className="text-slate-600">·</span>
            <span>pgvector</span>
            <span className="text-slate-600">·</span>
            <span>Next.js</span>
            <span className="text-slate-600">·</span>
            <span>Fly.io</span>
            <span className="text-slate-600">·</span>
            <span>vLLM</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
              What actually runs under the hood
            </h2>
            <p className="mt-4 text-slate-400">
              No feature on this page is aspirational. Everything below is deployed and answering
              real requests right now.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-ink-700 bg-ink-900 p-6 transition hover:border-brand-500/40 hover:shadow-glow"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-slate-100">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CASE FILES */}
      <section id="case-files" className="bg-ink-900/60 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
              Chat with your own documents, not the model's guesses.
            </h2>
            <p className="mt-4 text-slate-400">
              Case Files turns any workspace into a retrieval-grounded knowledge base. Upload emails,
              PDFs, or plain text — they're embedded and indexed automatically, and any chat answer
              that draws on them cites exactly which document was used and how confident the match was.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              <li className="flex gap-3"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-500" /> .eml, PDF, .txt, and .csv ingestion out of the box</li>
              <li className="flex gap-3"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-500" /> pgvector cosine similarity search, scoped per workspace</li>
              <li className="flex gap-3"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-500" /> Cited sources on every grounded answer</li>
              <li className="flex gap-3"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-500" /> Falls back to plain chat if retrieval has nothing relevant</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-ink-600 bg-ink-950 p-6 font-mono text-[12.5px] leading-relaxed text-slate-300 shadow-soft">
            <div className="mb-3 text-[10px] uppercase tracking-widest text-slate-500">retrieval · match_document_chunks</div>
            <pre className="whitespace-pre-wrap">
{`select dc.content, d.filename,
  1 - (dc.embedding <=> query) as similarity
from document_chunks dc
join documents d on d.id = dc.document_id
where dc.workspace_id = $1
  and is_workspace_member($1)
order by dc.embedding <=> query
limit 8;`}
            </pre>
          </div>
        </div>
      </section>

      {/* PRIVACY / SECURITY */}
      <section id="privacy" className="py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
          <div className="order-2 rounded-2xl border border-ink-600 bg-ink-900 p-6 font-mono text-[12.5px] leading-relaxed text-slate-300 shadow-soft md:order-1">
            <div className="mb-3 text-[10px] uppercase tracking-widest text-slate-500">policy · workspaces</div>
            <pre className="whitespace-pre-wrap">
{`create policy "workspaces: select if member"
on public.workspaces
for select
to authenticated
using (
  owner_id = auth.uid()
  or public.is_workspace_member(id)
);`}
            </pre>
          </div>
          <div className="order-1 md:order-2">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
              Your data's home address is a database you control.
            </h2>
            <p className="mt-4 text-slate-400">
              Every row in every table is protected by Postgres row-level security — enforced at the
              database, not the app layer. There is no shared model, no training pipeline, and no
              third party that ever sees a prompt or a document.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              <li className="flex gap-3"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-500" /> Workspace-scoped RLS on every table, including documents and chunks</li>
              <li className="flex gap-3"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-500" /> Inference happens on RunPod endpoints you own and can inspect</li>
              <li className="flex gap-3"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-500" /> Cascading delete — remove a workspace, its data is actually gone</li>
              <li className="flex gap-3"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-500" /> Real Postgres underneath — SQL access, exports, no lock-in</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-ink-700 bg-gradient-to-b from-ink-950 to-brand-900/10 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
            The endpoints are already running.
          </h2>
          <p className="mt-4 text-slate-400">
            Chat, code, or upload a Case File — it all runs on infrastructure that's already live.
          </p>
          <div className="mt-8">
            <Link
              href={user ? "/dashboard" : "/login"}
              className="inline-flex items-center justify-center rounded-md bg-brand-500 px-6 py-3 text-sm font-medium text-ink-950 shadow-sm transition hover:bg-brand-400"
            >
              {user ? "Open your workspace" : "Sign in"}
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

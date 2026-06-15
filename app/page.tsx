import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";

// TODO: replace this copy once you give me a real product pitch.
const HERO = {
  eyebrow: "Now in private preview",
  title: "Quiet intelligence for serious teams.",
  subtitle:
    "Sleeping Dog Ai is a calm, multi-tenant AI workspace. Bring your team, your data, and your judgment — we'll handle the plumbing.",
};

export default async function HomePage() {
  // Determine auth state on the server so the header CTA is correct on first paint.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader authed={!!user} />

      {/* HERO */}
      <section className="hero-bg relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              {HERO.eyebrow}
            </span>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
              {HERO.title}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-slate-600">
              {HERO.subtitle}
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={user ? "/dashboard" : "/login"}
                className="inline-flex items-center justify-center rounded-md bg-brand-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
              >
                {user ? "Open your workspace" : "Get started — it's free"}
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300"
              >
                See how it works →
              </a>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              No credit card required · SSO-ready · SOC 2 in progress
            </p>
          </div>

          {/* Product mock card */}
          <div className="relative mx-auto mt-16 max-w-5xl">
            <div className="dotted-grid absolute inset-x-10 -bottom-6 top-10 rounded-3xl opacity-60" aria-hidden />
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                <span className="ml-3 text-xs text-slate-400">app.sleepingdog.ai / acme</span>
              </div>
              <div className="grid grid-cols-12 gap-0">
                <aside className="col-span-3 border-r border-slate-100 p-5">
                  <div className="mb-4 text-[11px] uppercase tracking-wide text-slate-400">Workspace</div>
                  <div className="space-y-1.5 text-sm">
                    <div className="rounded-md bg-brand-50 px-2 py-1.5 text-brand-700">Threads</div>
                    <div className="px-2 py-1.5 text-slate-600">Documents</div>
                    <div className="px-2 py-1.5 text-slate-600">Members</div>
                    <div className="px-2 py-1.5 text-slate-600">Settings</div>
                  </div>
                </aside>
                <main className="col-span-9 p-6">
                  <div className="mb-4 h-3 w-40 rounded bg-slate-100" />
                  <div className="space-y-3">
                    <div className="h-2.5 w-full rounded bg-slate-100" />
                    <div className="h-2.5 w-11/12 rounded bg-slate-100" />
                    <div className="h-2.5 w-9/12 rounded bg-slate-100" />
                    <div className="h-2.5 w-10/12 rounded bg-slate-100" />
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-slate-100 p-3">
                      <div className="h-2 w-10 rounded bg-brand-100" />
                      <div className="mt-3 h-2 w-16 rounded bg-slate-100" />
                    </div>
                    <div className="rounded-lg border border-slate-100 p-3">
                      <div className="h-2 w-10 rounded bg-brand-100" />
                      <div className="mt-3 h-2 w-16 rounded bg-slate-100" />
                    </div>
                    <div className="rounded-lg border border-slate-100 p-3">
                      <div className="h-2 w-10 rounded bg-brand-100" />
                      <div className="mt-3 h-2 w-16 rounded bg-slate-100" />
                    </div>
                  </div>
                </main>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LOGO CLOUD */}
      <section className="border-y border-slate-100 bg-slate-50/50 py-10">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-xs uppercase tracking-wider text-slate-400">
            Built with technology trusted by teams everywhere
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-sm font-medium text-slate-400">
            <span>Supabase</span>
            <span>·</span>
            <span>Next.js</span>
            <span>·</span>
            <span>PostgreSQL</span>
            <span>·</span>
            <span>Vercel</span>
            <span>·</span>
            <span>Fly.io</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Everything your team needs. Nothing it doesn't.
            </h2>
            <p className="mt-4 text-slate-600">
              Built around the way teams actually work — workspaces, roles, and shared context, not isolated chat windows.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                title: "Multi-tenant workspaces",
                body: "Every team gets its own private workspace with owner, admin, member, and viewer roles enforced at the database with row-level security.",
              },
              {
                title: "Bring your own data",
                body: "Connect documents, knowledge bases, and APIs. Your context is yours — siloed by workspace and never used to train shared models.",
              },
              {
                title: "Built on Postgres",
                body: "A real database under the hood. Audit trails, exports, and SQL access when you need to leave — no vendor lock-in.",
              },
              {
                title: "SSO-ready",
                body: "Magic link and Google out of the box. SAML and OIDC for teams on a paid plan.",
              },
              {
                title: "Predictable pricing",
                body: "Per-seat pricing with no surprise tokens or surge fees. Bring your own LLM keys if you prefer.",
              },
              {
                title: "Calm by design",
                body: "No popups, no streaks, no nudge dark-patterns. Just a workspace that gets out of the way.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-slate-200 bg-white p-6 transition hover:border-brand-200 hover:shadow-soft"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-slate-50/60 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              From signup to your first workspace in 60 seconds.
            </h2>
          </div>

          <ol className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", title: "Sign in", body: "Magic link or Google. No password to forget." },
              { n: "02", title: "Create your workspace", body: "Pick a name and a slug. You become the owner automatically." },
              { n: "03", title: "Invite your team", body: "Add members with the right role. Row-level security handles the rest." },
            ].map((s) => (
              <li
                key={s.n}
                className="rounded-xl border border-slate-200 bg-white p-6"
              >
                <div className="text-xs font-semibold tracking-widest text-brand-600">{s.n}</div>
                <h3 className="mt-3 text-base font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* SECURITY */}
      <section id="security" className="py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Security isn't a feature. It's the floor.
            </h2>
            <p className="mt-4 text-slate-600">
              Every row in every table is protected by Postgres row-level security. Members only see data inside workspaces they belong to — enforced at the database, not the app layer.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              <li className="flex gap-3"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-600" /> Workspace-scoped RLS on every table</li>
              <li className="flex gap-3"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-600" /> Cascading delete protects against orphaned data</li>
              <li className="flex gap-3"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-600" /> Role enforcement: owner / admin / member / viewer</li>
              <li className="flex gap-3"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-600" /> Audit-ready Postgres logs</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-6 font-mono text-[12.5px] leading-relaxed text-slate-200 shadow-soft">
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
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-100 bg-gradient-to-b from-white to-brand-50/40 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Ready to wake the sleeping dog?
          </h2>
          <p className="mt-4 text-slate-600">
            Create your workspace in under a minute. No card required.
          </p>
          <div className="mt-8">
            <Link
              href={user ? "/dashboard" : "/login"}
              className="inline-flex items-center justify-center rounded-md bg-brand-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
            >
              {user ? "Open your workspace" : "Get started"}
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import type { Workspace, WorkspaceMember } from "@/lib/supabase/types";

export const metadata = { title: "Dashboard · Sleeping Dog Ai" };

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  // Workspaces this user is a member of, via the join table.
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("role, workspace:workspaces ( id, name, slug, description, owner_id, created_at, updated_at )")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const rows =
    (memberships ?? []).map((m) => ({
      role: m.role as WorkspaceMember["role"],
      workspace: (m as unknown as { workspace: Workspace }).workspace,
    })) ?? [];

  if (rows.length === 0) redirect("/onboarding");

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "there";

  return (
    <div className="min-h-screen bg-slate-50/60">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link href="/"><Logo /></Link>
            <nav className="hidden gap-4 text-sm md:flex">
              <Link href="/dashboard" className="font-medium text-slate-900">Workspaces</Link>
              <Link href="/dashboard/chat" className="text-slate-600 hover:text-slate-900">Chat</Link>
              <Link href="/dashboard/case-files" className="text-slate-600 hover:text-slate-900">Case Files</Link>
              <Link href="/dashboard/files" className="text-slate-600 hover:text-slate-900">Files</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 md:inline">{user.email}</span>
            <form action="/auth/sign-out" method="post">
              <button className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-300">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Welcome, {displayName.split(" ")[0]}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          You belong to {rows.length} workspace{rows.length === 1 ? "" : "s"}.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {rows.map(({ role, workspace }) => (
            <div
              key={workspace.id}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-soft"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">{workspace.name}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">app.sleepingdog.ai/{workspace.slug}</p>
                </div>
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-brand-700">
                  {role}
                </span>
              </div>
              {workspace.description && (
                <p className="mt-3 text-sm text-slate-600">{workspace.description}</p>
              )}
              <div className="mt-5 text-xs text-slate-400">
                Created {new Date(workspace.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}

          <Link
            href="/onboarding"
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500 transition hover:border-brand-300 hover:text-brand-700"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">+</span>
            Create another workspace
          </Link>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <Link
            href="/dashboard/chat"
            className="group rounded-xl border border-slate-200 bg-white p-6 transition hover:border-brand-200 hover:shadow-soft"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Open chat →</h3>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                vLLM
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Talk to your model on the RunPod serverless endpoint. Threads are private to this workspace.
            </p>
          </Link>
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-900">What's next</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>• Invite teammates (UI coming next)</li>
              <li>• Connect your first data source</li>
              <li>• Set workspace defaults in Settings</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

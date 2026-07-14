import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { FilesPanel } from "./files-panel";
import type { Workspace } from "@/lib/supabase/types";

export const metadata = { title: "Files · Sleeping Dog Ai" };

export default async function FilesPage({
  searchParams,
}: {
  searchParams: { workspace?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/files");

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace:workspaces ( id, name, slug, owner_id, description, created_at, updated_at )")
    .eq("user_id", user.id);

  const workspaces: Workspace[] = (memberships ?? [])
    .map((m) => (m as unknown as { workspace: Workspace }).workspace)
    .filter(Boolean);

  if (workspaces.length === 0) redirect("/onboarding");

  const activeWorkspace =
    workspaces.find((w) => w.slug === searchParams.workspace) ?? workspaces[0];

  const { data: files } = await supabase
    .from("generated_files")
    .select("id, filename, mime_type, size_bytes, source, language, thread_id, linked_document_id, created_at")
    .eq("workspace_id", activeWorkspace.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/60">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard"><Logo /></Link>
            <nav className="hidden gap-4 text-sm text-slate-600 md:flex">
              <Link href="/dashboard" className="hover:text-slate-900">Workspaces</Link>
              <Link href="/dashboard/chat" className="hover:text-slate-900">Chat</Link>
              <Link href="/dashboard/case-files" className="hover:text-slate-900">Case Files</Link>
              <Link href="/dashboard/files" className="font-medium text-slate-900">Files</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 md:inline">{activeWorkspace.name}</span>
            <form action="/auth/sign-out" method="post">
              <button className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-300">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <FilesPanel
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        initialFiles={files ?? []}
      />
    </div>
  );
}

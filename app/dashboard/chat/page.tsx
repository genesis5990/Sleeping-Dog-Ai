import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { ChatSurface } from "./chat-surface";
import type { ChatThread, Workspace } from "@/lib/supabase/types";

export const metadata = { title: "Chat · Sleeping Dog Ai" };

export default async function ChatPage({
  searchParams,
}: {
  searchParams: { workspace?: string; thread?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/chat");

  // Workspaces this user belongs to.
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

  // Threads for the active workspace, newest first.
  const { data: threadRows } = await supabase
    .from("chat_threads")
    .select("id, workspace_id, created_by, title, model, system_prompt, created_at, updated_at")
    .eq("workspace_id", activeWorkspace.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  const threads: ChatThread[] = (threadRows as ChatThread[]) ?? [];
  const activeThread =
    threads.find((t) => t.id === searchParams.thread) ?? threads[0] ?? null;

  // Messages for the active thread.
  let initialMessages: { id: string; role: string; content: string; created_at: string }[] = [];
  if (activeThread) {
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("thread_id", activeThread.id)
      .order("created_at", { ascending: true });
    initialMessages = msgs ?? [];
  }

  const modelName = process.env.RUNPOD_MODEL_NAME ?? "unknown";
  const runpodConfigured =
    !!process.env.RUNPOD_ENDPOINT_ID &&
    !process.env.RUNPOD_ENDPOINT_ID.startsWith("replace-") &&
    !!process.env.RUNPOD_API_KEY &&
    !process.env.RUNPOD_API_KEY.startsWith("replace-");

  return (
    <div className="flex h-screen flex-col bg-slate-50/60">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard"><Logo /></Link>
            <nav className="hidden gap-4 text-sm text-slate-600 md:flex">
              <Link href="/dashboard" className="hover:text-slate-900">Workspaces</Link>
              <Link href="/dashboard/chat" className="font-medium text-slate-900">Chat</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 md:inline">Model: {modelName}</span>
            <form action="/auth/sign-out" method="post">
              <button className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-300">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <ChatSurface
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        threads={threads}
        activeThreadId={activeThread?.id ?? null}
        initialMessages={initialMessages}
        modelName={modelName}
        runpodConfigured={runpodConfigured}
      />
    </div>
  );
}

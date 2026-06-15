import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { CreateWorkspaceForm } from "./create-workspace-form";

export const metadata = { title: "Create your workspace · Sleeping Dog Ai" };

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/onboarding");

  // If they already belong to a workspace, skip onboarding.
  const { count } = await supabase
    .from("workspace_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (count && count > 0) redirect("/dashboard");

  const suggestedName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    (user.email?.split("@")[0] ?? "My");

  return (
    <div className="min-h-screen bg-slate-50/60">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Logo />
          <form action="/auth/sign-out" method="post">
            <button className="text-sm text-slate-500 hover:text-slate-800">Sign out</button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
            Step 1 of 1
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Create your workspace
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            This is where your team will live. You can rename it later. You'll be the owner.
          </p>

          <CreateWorkspaceForm
            defaultName={`${suggestedName}'s Workspace`}
            userEmail={user.email ?? ""}
          />
        </div>
      </main>
    </div>
  );
}

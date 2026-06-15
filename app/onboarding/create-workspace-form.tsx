"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export function CreateWorkspaceForm({
  defaultName,
  userEmail,
}: {
  defaultName: string;
  userEmail: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(defaultName);
  const [slug, setSlug] = useState(slugify(defaultName));
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  const slugValid = useMemo(
    () => /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug),
    [slug],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 1 || name.trim().length > 120) {
      setError("Workspace name must be between 1 and 120 characters.");
      return;
    }
    if (!slugValid) {
      setError(
        "Slug must be 3–64 characters, lowercase, and contain only letters, numbers, and hyphens.",
      );
      return;
    }

    setSubmitting(true);

    // Ensure a profile row exists (the auth.users trigger should have created it,
    // but on legacy projects we upsert to be safe — and to keep email/full_name fresh).
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You're signed out. Please sign in again.");
      setSubmitting(false);
      return;
    }

    const { error: profileErr } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? userEmail,
        full_name:
          (user.user_metadata?.full_name as string | undefined) ?? null,
        avatar_url:
          (user.user_metadata?.avatar_url as string | undefined) ?? null,
      },
      { onConflict: "id" },
    );

    if (profileErr) {
      setError(profileErr.message);
      setSubmitting(false);
      return;
    }

    const { error: insertErr } = await supabase.from("workspaces").insert({
      name: name.trim(),
      slug,
      owner_id: user.id,
      description: description.trim() ? description.trim() : null,
    });

    if (insertErr) {
      setError(
        insertErr.code === "23505"
          ? "That slug is already taken. Try another."
          : insertErr.message,
      );
      setSubmitting(false);
      return;
    }

    // Trigger trg_workspaces_add_owner_member inserts the owner membership server-side.
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">
          Workspace name
        </label>
        <input
          id="name"
          type="text"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-slate-700">
          Workspace URL
        </label>
        <div className="mt-1 flex rounded-md shadow-sm">
          <span className="inline-flex items-center rounded-l-md border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">
            app.sleepingdog.ai/
          </span>
          <input
            id="slug"
            type="text"
            required
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            className="block w-full min-w-0 flex-1 rounded-none rounded-r-md border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        {!slugValid && slug.length > 0 && (
          <p className="mt-1 text-xs text-rose-600">
            Lowercase letters, numbers, and hyphens. Must start and end with a letter or number.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700">
          Description <span className="text-slate-400">(optional)</span>
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this workspace for?"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? "Creating workspace…" : "Create workspace"}
      </button>
    </form>
  );
}

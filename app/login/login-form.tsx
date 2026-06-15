"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ next }: { next: string }) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`;

  async function onMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }
    setStatus("sent");
  }

  async function onGoogle() {
    setErrorMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) setErrorMsg(error.message);
  }

  if (status === "sent") {
    return (
      <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-medium">Check your inbox</p>
        <p className="mt-1 text-emerald-800/90">
          We sent a magic sign-in link to <span className="font-medium">{email}</span>. It expires in 60 minutes.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      <button
        type="button"
        onClick={onGoogle}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path fill="#EA4335" d="M12 10.2v3.8h5.4c-.2 1.4-1.7 4.1-5.4 4.1-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.6 14.6 2.6 12 2.6 6.8 2.6 2.6 6.8 2.6 12s4.2 9.4 9.4 9.4c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.1-1.6H12z"/>
        </svg>
        Continue with Google
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs uppercase tracking-wider text-slate-400">or</span>
        </div>
      </div>

      <form onSubmit={onMagicLink} className="space-y-3">
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />

        <button
          type="submit"
          disabled={status === "sending"}
          className="flex w-full items-center justify-center rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Send magic link"}
        </button>

        {errorMsg && (
          <p className="text-sm text-rose-600">{errorMsg}</p>
        )}
      </form>
    </div>
  );
}

import Link from "next/link";
import { Logo } from "./logo";

export function SiteHeader({ authed = false }: { authed?: boolean }) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-ink-700 bg-ink-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="Sleeping Dog Ai home">
          <Logo className="h-7 w-auto [&_span]:text-slate-100" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#stack" className="text-sm text-slate-400 hover:text-slate-100">The stack</a>
          <a href="#case-files" className="text-sm text-slate-400 hover:text-slate-100">Case Files</a>
          <a href="#privacy" className="text-sm text-slate-400 hover:text-slate-100">Data & privacy</a>
        </nav>

        <div className="flex items-center gap-3">
          {authed ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-brand-500 px-3.5 py-2 text-sm font-medium text-ink-950 shadow-sm hover:bg-brand-400"
            >
              Open workspace
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-brand-500 px-3.5 py-2 text-sm font-medium text-ink-950 shadow-sm hover:bg-brand-400"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

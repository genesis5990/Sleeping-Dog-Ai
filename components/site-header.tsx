import Link from "next/link";
import { Logo } from "./logo";

export function SiteHeader({ authed = false }: { authed?: boolean }) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="Sleeping Dog Ai home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-slate-600 hover:text-slate-900">Features</a>
          <a href="#how" className="text-sm text-slate-600 hover:text-slate-900">How it works</a>
          <a href="#security" className="text-sm text-slate-600 hover:text-slate-900">Security</a>
        </nav>

        <div className="flex items-center gap-3">
          {authed ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
            >
              Open app
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm text-slate-700 hover:text-slate-900 md:inline">
                Sign in
              </Link>
              <Link
                href="/login"
                className="rounded-md bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

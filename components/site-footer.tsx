import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-700 bg-ink-950">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <Logo className="h-7 w-auto [&_span]:text-slate-100" />
            <p className="mt-3 max-w-sm text-sm text-slate-500">
              Private LLMs on infrastructure you control. Supabase, Next.js, RunPod, Fly.io.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-10 text-sm">
            <div>
              <h4 className="mb-2 font-medium text-slate-200">Product</h4>
              <ul className="space-y-1.5 text-slate-500">
                <li><a href="#stack" className="hover:text-slate-200">The stack</a></li>
                <li><a href="#case-files" className="hover:text-slate-200">Case Files</a></li>
                <li><a href="#privacy" className="hover:text-slate-200">Data & privacy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-medium text-slate-200">Infrastructure</h4>
              <ul className="space-y-1.5 text-slate-500">
                <li className="font-mono text-xs">RunPod serverless</li>
                <li className="font-mono text-xs">Supabase + pgvector</li>
                <li className="font-mono text-xs">Fly.io</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-medium text-slate-200">Access</h4>
              <ul className="space-y-1.5 text-slate-500">
                <li><a href="/login" className="hover:text-slate-200">Sign in</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-ink-700 pt-6 text-xs text-slate-500">
          © {new Date().getFullYear()} Sleeping Dog Ai — a private workspace, not a public product.
        </div>
      </div>
    </footer>
  );
}

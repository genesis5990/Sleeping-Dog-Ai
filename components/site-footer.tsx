import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-slate-500">
              Quiet intelligence for serious teams. Built with Supabase, Next.js, and care.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-10 text-sm">
            <div>
              <h4 className="mb-2 font-medium text-slate-900">Product</h4>
              <ul className="space-y-1.5 text-slate-500">
                <li><a href="#features" className="hover:text-slate-900">Features</a></li>
                <li><a href="#how" className="hover:text-slate-900">How it works</a></li>
                <li><a href="#security" className="hover:text-slate-900">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-medium text-slate-900">Company</h4>
              <ul className="space-y-1.5 text-slate-500">
                <li><a href="#" className="hover:text-slate-900">About</a></li>
                <li><a href="#" className="hover:text-slate-900">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-medium text-slate-900">Legal</h4>
              <ul className="space-y-1.5 text-slate-500">
                <li><a href="#" className="hover:text-slate-900">Privacy</a></li>
                <li><a href="#" className="hover:text-slate-900">Terms</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-slate-100 pt-6 text-xs text-slate-400">
          © {new Date().getFullYear()} Sleeping Dog Ai. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

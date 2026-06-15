import Link from "next/link";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign in · Sleeping Dog Ai",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const next = searchParams.next ?? "/dashboard";
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Left: brand side */}
      <div className="relative hidden flex-col justify-between bg-gradient-to-br from-brand-600 to-brand-800 p-10 text-white md:flex">
        <Link href="/" aria-label="Back to home" className="inline-flex">
          <Logo className="text-white [&_span]:text-white [&_span_span]:text-brand-100" />
        </Link>
        <div>
          <p className="text-2xl font-medium leading-snug text-balance">
            “The dog that doesn't bark catches more rabbits.”
          </p>
          <p className="mt-3 text-sm text-brand-100/80">
            Calm AI that does the work without the noise.
          </p>
        </div>
        <p className="text-xs text-brand-100/70">© {new Date().getFullYear()} Sleeping Dog Ai</p>
      </div>

      {/* Right: form side */}
      <div className="flex flex-col bg-white">
        <header className="flex items-center justify-between px-6 py-5 md:hidden">
          <Link href="/"><Logo /></Link>
        </header>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to your workspace. New here? An account is created automatically.
          </p>

          {searchParams.error && (
            <div className="mt-6 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {searchParams.error}
            </div>
          )}

          <LoginForm next={next} />

          <p className="mt-8 text-center text-xs text-slate-500">
            By continuing you agree to our{" "}
            <a href="#" className="underline">Terms</a> and{" "}
            <a href="#" className="underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

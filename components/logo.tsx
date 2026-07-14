export function Logo({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <span className={"inline-flex items-center gap-2 " + className}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        aria-label="Sleeping Dog Ai logo"
        className="h-7 w-7 text-brand-500"
      >
        {/* Resting dog silhouette + Z (sleeping) */}
        <path
          d="M4 26c2-1 4-1 6-1 1-2 3-3 5-3h10c3 0 5 2 6 4 2 0 4 1 5 3v3H4v-6z"
          fill="currentColor"
          opacity="0.9"
        />
        <circle cx="29" cy="23" r="1.4" fill="#0a0a0d" />
        <path
          d="M27 8h6l-6 6h6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight text-slate-900">
        Sleeping Dog <span className="text-brand-500">Ai</span>
      </span>
    </span>
  );
}

import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sleeping Dog Ai — Your own AI, on your own infrastructure",
  description:
    "Sleeping Dog Ai runs private LLMs on infrastructure you control. Chat, code, and retrieval-augmented search over your own documents — nothing leaves your RunPod endpoints.",
  openGraph: {
    title: "Sleeping Dog Ai",
    description:
      "Your own AI, on your own infrastructure. No third-party model providers.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} dark`}>
      <body className="font-sans text-slate-100">{children}</body>
    </html>
  );
}

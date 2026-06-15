import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sleeping Dog Ai — Quiet intelligence for serious teams",
  description:
    "Sleeping Dog Ai gives your team a calm, focused AI workspace. Multi-tenant by design, secure by default.",
  openGraph: {
    title: "Sleeping Dog Ai",
    description:
      "Quiet intelligence for serious teams. A calm, focused AI workspace.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans text-slate-900">{children}</body>
    </html>
  );
}

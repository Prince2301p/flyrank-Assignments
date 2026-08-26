import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Decision Flow - React Flow + Inngest Visual Engine",
  description: "Visual AI workflow system where each node represents an AI decision step returning YES or NO, executed via Inngest step functions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-slate-950 text-slate-100 select-none">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "kvdash",
  description: "Admin dashboard for the KV store",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-border-hairline bg-surface">
          <div className="mx-auto max-w-4xl px-6 py-4 flex items-center gap-6">
            <Link href="/" className="font-mono text-sm font-medium tracking-tight">
              kvdash
            </Link>
            <nav className="flex gap-4 text-sm text-muted">
              <Link href="/" className="hover:text-foreground">
                Keys
              </Link>
              <Link href="/zsets" className="hover:text-foreground">
                Sorted sets
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">
          <div className="mx-auto max-w-4xl px-6 py-8">{children}</div>
        </main>
      </body>
    </html>
  );
}

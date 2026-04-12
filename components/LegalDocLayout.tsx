import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Simple shell for /privacy, /terms, /contact — matches marketing typography and warm borders.
 */
export function LegalDocLayout({
  title,
  lastUpdated,
  children,
  className,
}: {
  title: string;
  /** Omit on non-policy pages (e.g. contact). */
  lastUpdated?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-[#e4e2e2]/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1072px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <Image
              src="/logo.jpeg"
              alt=""
              width={200}
              height={40}
              className="h-8 w-auto max-w-[120px] object-contain object-left sm:h-9 sm:max-w-[160px]"
              priority
            />
            <span className="hidden text-sm font-semibold tracking-tight sm:inline">Mock Interview</span>
          </Link>
          <Link
            href="/"
            className="shrink-0 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Home
          </Link>
        </div>
      </header>

      <main className={cn("mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14", className)}>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {lastUpdated ? (
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        ) : null}
        <div className="mt-10 space-y-8 pb-10 text-sm leading-relaxed text-muted-foreground sm:text-[15px] sm:leading-relaxed">
          {children}
        </div>
      </main>

      <footer className="border-t border-[#e4e2e2]/80 bg-[#faf8f6]/60 py-6">
        <div className="mx-auto flex max-w-[1072px] flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <nav
            className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
            aria-label="Legal and home"
          >
            <Link className="font-medium transition-colors hover:text-foreground" href="/privacy">
              Privacy
            </Link>
            <Link className="font-medium transition-colors hover:text-foreground" href="/terms">
              Terms
            </Link>
            <Link className="font-medium transition-colors hover:text-foreground" href="/contact">
              Contact
            </Link>
            <Link className="font-medium transition-colors hover:text-foreground" href="/">
              Home
            </Link>
          </nav>
          <p className="text-center text-xs text-muted-foreground sm:text-right">
            © {new Date().getFullYear()} Mock Interview
          </p>
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function LegalParagraph({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

export function LegalList({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-muted-foreground">{children}</ul>;
}

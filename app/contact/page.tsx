import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocLayout, LegalParagraph, LegalSection } from "@/components/LegalDocLayout";
import { Button } from "@/components/ui/button";
import { SUPPORT_EMAIL } from "@/lib/site-contact";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact — MockInterview",
  description: "Get in touch with the Mock Interview team.",
};

export default function ContactPage() {
  const mailto = `mailto:${SUPPORT_EMAIL}`;

  return (
    <LegalDocLayout title="Contact us">
      <LegalParagraph>
        Questions about mock interviews, billing, your account, or partnerships? Reach us by email—we
        typically respond within a few business days.
      </LegalParagraph>

      <LegalSection title="Email">
        <p className="break-all text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          <a className="underline decoration-[#e4e2e2] underline-offset-4 hover:decoration-foreground" href={mailto}>
            {SUPPORT_EMAIL}
          </a>
        </p>
        <div className="pt-2">
          <Button
            asChild
            className={cn(
              "h-12 rounded-full bg-[#1a1615] px-8 text-base font-semibold text-white shadow-sm transition-all hover:bg-[#1a1615]/90"
            )}
          >
            <a href={mailto}>Open in email app</a>
          </Button>
        </div>
      </LegalSection>

      <LegalSection title="Before you write">
        <LegalParagraph>
          Signed-in users can also check <Link href="/app/profile">Profile</Link> for account details and
          interview credits, and <Link href="/app/dashboard">Dashboard</Link> for past sessions.
        </LegalParagraph>
      </LegalSection>
    </LegalDocLayout>
  );
}

import type { Metadata } from "next";

import {
  LegalDocLayout,
  LegalList,
  LegalParagraph,
  LegalSection,
} from "@/components/LegalDocLayout";
import { SUPPORT_EMAIL } from "@/lib/site-contact";

export const metadata: Metadata = {
  title: "Privacy Policy — MockInterview",
  description:
    "How Mock Interview collects, uses, and protects your data when you practice with our AI interview coach.",
};

const LAST_UPDATED = "April 13, 2026";

export default function PrivacyPage() {
  return (
    <LegalDocLayout title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <LegalParagraph>
        Mock Interview (“we”, “us”, “our”) provides an AI-assisted mock interview product. This Privacy
        Policy explains what information we collect, how we use it, and the choices you have when you use
        our website, app, and related services (together, the “Service”).
      </LegalParagraph>

      <LegalSection id="collect" title="1. Information we collect">
        <LegalParagraph>
          <strong className="text-foreground">Account and authentication.</strong> If you sign in with
          Google, we receive identifiers and profile details that Google shares with us (such as your
          name, email address, and profile image) through our authentication provider.
        </LegalParagraph>
        <LegalParagraph>
          <strong className="text-foreground">Job descriptions and interview content.</strong> When you
          paste a job description or similar text, we process it to generate questions and session data.
          When you use the mock interview flow, we process your answers and related session metadata so we
          can score your performance, build your report, and keep your session history in your account.
        </LegalParagraph>
        <LegalParagraph>
          <strong className="text-foreground">Audio and voice features.</strong> Voice capture is used to
          power the interview experience and feedback. Audio may be sent to our processing pipeline and
          subprocessors as needed to generate scores and text feedback. We do not sell your voice prints as
          a biometric product.
        </LegalParagraph>
        <LegalParagraph>
          <strong className="text-foreground">Usage and diagnostics.</strong> We may collect technical
          information such as device type, browser, approximate region, and product analytics events to
          improve reliability and understand how the Service is used.
        </LegalParagraph>
        <LegalParagraph>
          <strong className="text-foreground">Payments.</strong> Purchases (for example, interview credit
          packs) are processed by our payment partner. We receive limited transaction and entitlement
          information—we do not store your full card number on our servers.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="use" title="2. How we use information">
        <LegalList>
          <li>Provide, operate, and secure the Service (including sign-in, sessions, and reports).</li>
          <li>Generate tailored questions, feedback, and PDF reports from your inputs.</li>
          <li>Manage interview credits, plans, and access to paid features.</li>
          <li>Communicate with you about the Service, respond to requests, and send transactional notices.</li>
          <li>Detect abuse, fraud, and technical issues; comply with law; enforce our Terms.</li>
          <li>Improve models, prompts, and product experience using aggregated or de-identified data where appropriate.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="sharing" title="3. How we share information">
        <LegalParagraph>
          We use trusted service providers (“subprocessors”) who process data on our behalf under
          contractual safeguards, including for example:
        </LegalParagraph>
        <LegalList>
          <li>
            <strong className="text-foreground">Supabase</strong> — authentication and database hosting for
            accounts and interview sessions.
          </li>
          <li>
            <strong className="text-foreground">Google</strong> — OAuth sign-in when you choose “Sign in
            with Google”.
          </li>
          <li>
            <strong className="text-foreground">Paddle</strong> — checkout, tax, and payment processing for
            one-time purchases.
          </li>
          <li>
            <strong className="text-foreground">Automation / AI pipeline</strong> — workflow and AI services
            we use to analyze job descriptions, run interviews, and produce scores and reports (for
            example, webhook-based processing configured for our deployment).
          </li>
          <li>
            <strong className="text-foreground">Hosting and analytics</strong> — infrastructure and product
            analytics (for example, Vercel and Firebase/Google Analytics where enabled).
          </li>
        </LegalList>
        <LegalParagraph>
          We may disclose information if required by law, legal process, or to protect the rights, safety,
          and security of our users, the public, or Mock Interview.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="retention" title="4. Retention">
        <LegalParagraph>
          We retain information for as long as your account is active and as needed to provide the
          Service, comply with legal obligations, resolve disputes, and enforce our agreements. You may
          request deletion of your account data where applicable law allows; some information may persist
          in backups for a limited period.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="security" title="5. Security">
        <LegalParagraph>
          We implement administrative, technical, and organizational measures designed to protect your
          information. No method of transmission or storage is 100% secure; we encourage you to use a
          strong password where applicable and protect access to your Google account.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="rights" title="6. Your choices and rights">
        <LegalParagraph>
          Depending on where you live, you may have rights to access, correct, delete, or export certain
          personal data, or to object to or restrict certain processing. To exercise these rights, contact us
          using the details below. You can also manage some information directly in your account profile
          and dashboard where the product supports it.
        </LegalParagraph>
        <LegalParagraph>
          You may disable cookies or analytics in your browser where possible. Sign-in via Google is
          subject to Google’s policies and your Google account settings.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="international" title="7. International transfers">
        <LegalParagraph>
          We may process and store information in countries other than your own. Where required, we use
          appropriate safeguards (such as contractual clauses) for cross-border transfers.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="children" title="8. Children’s privacy">
        <LegalParagraph>
          The Service is not directed to children under 16 (or the minimum age required in your region). We
          do not knowingly collect personal information from children. If you believe we have collected
          information from a child, please contact us and we will take appropriate steps to delete it.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="changes" title="9. Changes to this policy">
        <LegalParagraph>
          We may update this Privacy Policy from time to time. We will post the updated version on this
          page and adjust the “Last updated” date. Where changes are material, we will provide additional
          notice as appropriate (for example, a banner in the app or email to your account address).
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="contact" title="10. Contact">
        <LegalParagraph>
          Questions about this Privacy Policy or our data practices:{" "}
          <a
            className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
            href={`mailto:${SUPPORT_EMAIL}`}
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </LegalParagraph>
      </LegalSection>
    </LegalDocLayout>
  );
}

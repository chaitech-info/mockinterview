import type { Metadata } from "next";

import {
  LegalDocLayout,
  LegalList,
  LegalParagraph,
  LegalSection,
} from "@/components/LegalDocLayout";
import { SUPPORT_EMAIL } from "@/lib/site-contact";

export const metadata: Metadata = {
  title: "Terms of Service — MockInterview",
  description:
    "Terms governing your use of Mock Interview’s AI mock interview practice, credits, and paid features.",
};

const LAST_UPDATED = "April 13, 2026";

export default function TermsPage() {
  return (
    <LegalDocLayout title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <LegalParagraph>
        These Terms of Service (“Terms”) govern your access to and use of Mock Interview’s website,
        application, and related services (the “Service”). By creating an account, signing in, or using
        the Service, you agree to these Terms. If you do not agree, do not use the Service.
      </LegalParagraph>

      <LegalSection id="service" title="1. The Service">
        <LegalParagraph>
          Mock Interview helps you practice job interviews using AI-generated questions, voice-based
          practice, and scored feedback and reports based on the information you provide (such as a job
          description). Features may change over time; we may add, modify, or retire functionality with or
          without notice where reasonable.
        </LegalParagraph>
        <LegalParagraph>
          The Service is a coaching and preparation tool. It does not guarantee employment, interview
          outcomes, or human-like judgment in every situation. AI-generated content may be incomplete or
          inaccurate—use your own judgment and verify important details.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="account" title="2. Accounts and eligibility">
        <LegalParagraph>
          You must provide accurate information and keep your sign-in credentials secure. You are
          responsible for activity under your account. You must be old enough to enter a binding contract
          in your jurisdiction and not barred from using the Service under applicable law.
        </LegalParagraph>
        <LegalParagraph>
          If you use Google sign-in, your use of Google’s services is also governed by Google’s terms and
          policies.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="credits" title="3. Interview credits and payments">
        <LegalParagraph>
          Parts of the Service may be free or usage-limited; paid features are typically sold as{" "}
          <strong className="text-foreground">one-time interview credit packs</strong> (not a
          subscription) unless clearly stated otherwise at checkout. Credits are applied to your account
          after successful payment and may be consumed when you start or complete mock interviews according
          to the rules shown in the product.
        </LegalParagraph>
        <LegalParagraph>
          Payments are processed by our merchant of record / payment partner (for example, Paddle). Fees,
          taxes, invoices, refunds, and chargebacks may be handled according to that partner’s policies and
          the terms presented at checkout. If you have a billing issue, contact us and we will work with
          you in line with applicable consumer rules.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="acceptable" title="4. Acceptable use">
        <LegalParagraph>You agree not to:</LegalParagraph>
        <LegalList>
          <li>Use the Service in violation of law or third-party rights.</li>
          <li>Upload malware, attempt unauthorized access, or disrupt our systems or other users.</li>
          <li>Scrape, resell, or reverse engineer the Service except where applicable law permits.</li>
          <li>Use the Service to generate or distribute unlawful, harmful, or highly sensitive personal data of others without authority.</li>
          <li>Misrepresent your identity or affiliation.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="content" title="5. Your content">
        <LegalParagraph>
          You retain rights to content you submit (such as job descriptions and interview inputs). To
          operate the Service, you grant us a non-exclusive, worldwide license to host, process, transmit,
          display, and create derivative outputs (such as scores, transcripts where applicable, and PDF
          reports) solely for providing and improving the Service.
        </LegalParagraph>
        <LegalParagraph>
          You represent that you have the rights needed to submit your content. Do not paste confidential
          third-party information you are not allowed to share.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="third" title="6. Third-party services">
        <LegalParagraph>
          The Service relies on third parties (including hosting, authentication, payments, analytics, and
          AI/automation providers). Their availability and terms may affect your use of the Service. We are
          not responsible for third-party services we do not control.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="disclaimers" title="7. Disclaimers">
        <LegalParagraph>
          THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS
          OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
          AND NON-INFRINGEMENT, TO THE MAXIMUM EXTENT PERMITTED BY LAW.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="liability" title="8. Limitation of liability">
        <LegalParagraph>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, MOCK INTERVIEW AND ITS SUPPLIERS WILL NOT BE LIABLE FOR ANY
          INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA,
          OR GOODWILL, ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE. OUR AGGREGATE LIABILITY FOR
          CLAIMS RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US FOR THE
          SERVICE IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B) FIFTY US DOLLARS (USD $50), EXCEPT WHERE
          LIABILITY CANNOT BE LIMITED BY LAW.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="indemnity" title="9. Indemnity">
        <LegalParagraph>
          You will defend and indemnify Mock Interview and its team against claims, damages, losses, and
          expenses (including reasonable legal fees) arising from your misuse of the Service, your
          content, or your violation of these Terms, except to the extent caused by our willful misconduct.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="termination" title="10. Suspension and termination">
        <LegalParagraph>
          We may suspend or terminate access to the Service if you materially breach these Terms, if we
          must comply with law, or if we discontinue the Service. You may stop using the Service at any
          time. Provisions that by their nature should survive (including disclaimers, limitations,
          indemnity, and governing law) will survive termination.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="changes-terms" title="11. Changes to these Terms">
        <LegalParagraph>
          We may modify these Terms. We will post the updated Terms on this page and update the “Last
          updated” date. If changes are material, we will provide additional notice where appropriate.
          Continued use after the effective date constitutes acceptance of the revised Terms.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="law" title="12. Governing law and disputes">
        <LegalParagraph>
          Unless a mandatory law of your country says otherwise, these Terms are governed by the laws
          applicable to the entity operating Mock Interview, without regard to conflict-of-law rules.
          Courts in that jurisdiction will have exclusive venue, except that either party may seek
          injunctive relief in any court of competent jurisdiction.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="contact-terms" title="13. Contact">
        <LegalParagraph>
          For questions about these Terms:{" "}
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

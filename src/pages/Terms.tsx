import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Seo } from "@/components/seo/Seo";
import { SITE_NAME } from "@/lib/brand";
import { PRO_PRICE_USD } from "@/lib/plan";

const LAST_UPDATED = "August 19, 2026";

const Terms = () => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8"
  >
    <Seo
      title="Terms of Service"
      description={`The terms that govern your use of ${SITE_NAME}.`}
      url={typeof window !== "undefined" ? window.location.origin + "/terms" : undefined}
    />

    <header className="space-y-2 border-b border-border/60 pb-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last updated {LAST_UPDATED}</p>
    </header>

    <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none">
      <p>
        These Terms of Service ("Terms") govern your access to and use of {SITE_NAME} (the "Service"),
        including our website, tender listings, alerts, and any related tools. By creating an account or
        otherwise using the Service, you agree to these Terms. If you don't agree, please don't use the
        Service.
      </p>

      <h2>1. What the Service does</h2>
      <p>
        {SITE_NAME} aggregates publicly available procurement and tender notices from government portals,
        development agencies, and official gazettes across Africa, and lets you search, filter, bookmark,
        and set up alerts for the ones relevant to you.
      </p>
      <p>
        We are not affiliated with any procuring entity, government body, or funding institution whose
        notices appear on the Service, and we don't participate in the tendering or procurement process
        itself. A listing on {SITE_NAME} is not an endorsement or guarantee of any kind about a tender,
        its issuer, or the outcome of bidding on it.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You need an account to bookmark tenders, set up alerts, or subscribe to Pro. You're responsible for
        keeping your login credentials secure and for all activity under your account. Tell us if you
        believe your account has been compromised.
      </p>
      <p>You must be at least 18 years old, or the age of legal majority where you live, to create an account.</p>

      <h2>3. Free and Pro plans</h2>
      <p>
        The Service is free to browse and search without an account. A free account adds bookmarks and
        alerts, within the limits shown on our{" "}
        <Link to="/pricing">Pricing</Link> page. Pro (currently ${PRO_PRICE_USD}/month, billed via Stripe)
        removes those limits and unlocks earlier visibility on new tenders. Pricing, limits, and included
        features may change; we'll make a reasonable effort to notify active subscribers of material
        changes affecting them.
      </p>
      <p>
        Subscriptions renew automatically until cancelled. You can cancel anytime from the Billing page in
        your account - cancellation takes effect at the end of the current billing period, and we don't
        provide partial-period refunds except where required by law.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Scrape, bulk-extract, or systematically reproduce Service content outside normal use of the product</li>
        <li>Attempt to bypass plan limits, authentication, or other access controls</li>
        <li>Use the Service to distribute malware, spam, or unlawful content</li>
        <li>Interfere with the Service's normal operation or other users' access to it</li>
        <li>Misrepresent your identity or affiliation when creating an account</li>
      </ul>

      <h2>5. Tender data accuracy</h2>
      <p>
        We source tender information from public third-party portals and process it automatically, with
        some content translated or summarized using automated tools. We work to keep listings accurate and
        current, but we can't guarantee that every detail - deadlines, values, eligibility criteria, or
        anything else - exactly matches the original source at every moment. <strong>Always confirm
        critical details (especially deadlines) against the original source before relying on them</strong>,
        and use the "View source" link on a tender's page to reach it directly where available.
      </p>

      <h2>6. Disclaimers</h2>
      <p>
        THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS
        OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE
        DON'T WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT TENDER DATA WILL BE
        ACCURATE OR COMPLETE.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, {SITE_NAME.toUpperCase()} AND ITS OPERATORS WILL NOT BE
        LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
        PROFITS, OPPORTUNITIES, OR DATA, ARISING FROM YOUR USE OF THE SERVICE OR RELIANCE ON ANY TENDER
        INFORMATION IT PROVIDES - INCLUDING A MISSED DEADLINE OR AN UNSUCCESSFUL BID. OUR TOTAL LIABILITY
        FOR ANY CLAIM RELATING TO THE SERVICE IS LIMITED TO THE AMOUNT YOU PAID US IN THE 12 MONTHS BEFORE
        THE CLAIM AROSE.
      </p>

      <h2>8. Termination</h2>
      <p>
        You may stop using the Service and delete your account at any time. We may suspend or terminate
        accounts that violate these Terms, or discontinue the Service, with notice where reasonably
        possible.
      </p>

      <h2>9. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. We'll update the "Last updated" date above, and for
        material changes we'll make a reasonable effort to notify active users. Continuing to use the
        Service after changes take effect means you accept the updated Terms.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These Terms are governed by the laws of [Governing Jurisdiction], without regard to its conflict of
        law principles.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these Terms? Reach us at{" "}
        <a href="mailto:info@tamboticircle.com">info@tamboticircle.com</a>.
      </p>
    </div>
  </motion.div>
);

export default Terms;

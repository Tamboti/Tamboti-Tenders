import { motion } from "framer-motion";
import { Seo } from "@/components/seo/Seo";
import { SITE_NAME } from "@/lib/brand";

const LAST_UPDATED = "August 19, 2026";

const Privacy = () => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8"
  >
    <Seo
      title="Privacy Policy"
      description={`How ${SITE_NAME} collects, uses, and protects your data.`}
      url={typeof window !== "undefined" ? window.location.origin + "/privacy" : undefined}
    />

    <header className="space-y-2 border-b border-border/60 pb-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated {LAST_UPDATED}</p>
    </header>

    <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none">
      <p>
        This Privacy Policy explains what personal data {SITE_NAME} ("we," "us," "our") collects when you
        use our website and Service, why we collect it, and how you can control it.
      </p>

      <h2>1. Information we collect</h2>
      <p>You don't need an account to search or browse tenders. If you create one, we collect:</p>
      <ul>
        <li><strong>Account information</strong> - your email address, and your name if you provide it</li>
        <li><strong>Usage data</strong> - bookmarks, alert preferences, workflow status you set on tenders, and general product usage</li>
        <li><strong>Billing information</strong> - if you subscribe to Pro, Stripe processes your payment details directly; we store your subscription status and billing history, never your full card number</li>
        <li><strong>Analytics data</strong> - pages visited, general location (country-level), and device/browser type, via Google Analytics</li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>To operate your account, bookmarks, and tender alerts</li>
        <li>To send alert emails and other service-related messages you've opted into</li>
        <li>To process Pro subscription payments and manage billing</li>
        <li>To understand how the Service is used, so we can improve it</li>
        <li>To detect and prevent abuse of plan limits or the Service generally</li>
      </ul>
      <p>We don't sell your personal data, and we don't use it to serve third-party advertising.</p>

      <h2>3. Who we share it with</h2>
      <p>
        We use a small number of service providers to run {SITE_NAME}, each of which processes data on our
        behalf under their own security and privacy commitments:
      </p>
      <ul>
        <li><strong>Supabase</strong> - database, authentication, and file storage</li>
        <li><strong>Stripe</strong> - payment processing and subscription billing</li>
        <li><strong>Resend</strong> - delivery of alert digest and account emails</li>
        <li><strong>Google Analytics</strong> - website usage analytics</li>
        <li><strong>Vercel</strong> - website hosting</li>
      </ul>
      <p>
        We don't share your personal data with any other third party except where required by law, to
        protect our rights, or with your explicit consent.
      </p>

      <h2>4. Cookies</h2>
      <p>We use two kinds of cookies/local storage:</p>
      <ul>
        <li><strong>Essential</strong> -to keep you signed in and remember basic preferences (e.g. theme)</li>
        <li><strong>Analytics</strong> -Google Analytics, to understand aggregate usage of the Service</li>
      </ul>
      <p>
        You can block cookies in your browser settings, though essential cookies are required for signed-in
        features to work.
      </p>

      <h2>5. Data retention</h2>
      <p>
        We keep your account data for as long as your account is active. If you delete your account, we
        delete or anonymize your personal data within a reasonable period, except where we're required to
        retain billing records for tax, accounting, or legal purposes.
      </p>

      <h2>6. Your rights</h2>
      <p>Depending on where you live, you may have the right to:</p>
      <ul>
        <li>Access the personal data we hold about you</li>
        <li>Correct inaccurate data</li>
        <li>Delete your account and associated data</li>
        <li>Export your data in a portable format</li>
        <li>Unsubscribe from alert emails at any time, via the link in every alert email</li>
      </ul>
      <p>
        To exercise any of these, email{" "}
        <a href="mailto:info@tamboticircle.com">info@tamboticircle.com</a>. You can also delete
        bookmarks, alerts, or your account directly from your account settings.
      </p>

      <h2>7. Security</h2>
      <p>
        We rely on our infrastructure providers' security controls (encryption in transit and at rest,
        access controls, and row-level security on our database) to protect your data. No method of
        transmission or storage is 100% secure, and we can't guarantee absolute security.
      </p>

      <h2>8. International transfers</h2>
      <p>
        Our infrastructure providers may process and store data in countries other than your own. Where
        this involves a transfer out of the European Economic Area or another jurisdiction with data
        transfer restrictions, our providers rely on appropriate safeguards (such as standard contractual
        clauses) to protect it.
      </p>

      <h2>9. Children's privacy</h2>
      <p>
        The Service isn't directed at children, and we don't knowingly collect personal data from anyone
        under 18.
      </p>

      <h2>10. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We'll update the "Last updated" date above,
        and for material changes we'll make a reasonable effort to notify active users.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about this policy or your data? Reach us at{" "}
        <a href="mailto:info@tamboticircle.com">info@tamboticircle.com</a>.
      </p>
    </div>
  </motion.div>
);

export default Privacy;

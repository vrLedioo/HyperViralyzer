import Link from 'next/link';
import { Play } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — Hyperyzer',
  description: 'How Hyperyzer collects, uses, and protects your data.',
};

export default function Privacy() {
  return (
    <div className="relative z-10 text-slate-900 max-w-3xl mx-auto px-5 sm:px-8 py-10">
      <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-md">
          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
        </div>
        <span className="text-lg font-bold tracking-tight">Hyperyzer</span>
      </Link>

      <h1 className="text-3xl font-black tracking-tight">Privacy Policy</h1>
      <p className="text-slate-500 font-medium mt-1">Last updated: June 2026</p>

      <div className="prose-sm mt-8 space-y-6 text-slate-700 leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-8 [&_h2]:mb-2 [&_li]:ml-5 [&_li]:list-disc [&_a]:text-pink-600 [&_a]:underline">
        <p>
          Hyperyzer (&ldquo;we&rdquo;, &ldquo;us&rdquo;) provides an AI tool that scores video
          ideas and uploaded videos for hook, retention, and viral potential. This policy explains
          what we collect and how we use it. Operator: Hyperyzer, Kosovo.
          Contact: <a href="mailto:support@hyperyzer.com">support@hyperyzer.com</a>.
        </p>

        <h2>Information we collect</h2>
        <ul>
          <li><strong>Account data:</strong> your email address and a securely hashed password.</li>
          <li><strong>Content you submit:</strong> video titles, scripts/hooks, and any videos you
            upload — plus the transcripts and scores we generate from them.</li>
          <li><strong>Usage data:</strong> basic technical logs needed to run and secure the service.</li>
          <li><strong>Payment data:</strong> handled entirely by our payment provider (Paddle)
            — we do not receive or store your card details.</li>
          <li><strong>Your own API key (optional):</strong> if you choose &ldquo;bring your own
            key&rdquo;, your OpenAI key is used only to process that request and is not stored.</li>
        </ul>

        <h2>Legal basis for processing (GDPR)</h2>
        <p>
          We process your data on the following legal bases: <strong>contract performance</strong>
          (to provide the service you signed up for), <strong>legitimate interests</strong> (security,
          fraud prevention, service improvement), and <strong>legal obligation</strong> (tax/VAT
          records via Paddle as Merchant of Record).
        </p>

        <h2>How we use your data</h2>
        <ul>
          <li>To provide the analysis service and your account features (history, credits, plan).</li>
          <li>To process payments and prevent abuse/fraud.</li>
          <li>To operate, secure, and improve the service.</li>
        </ul>

        <h2>Third-party processors</h2>
        <ul>
          <li><strong>OpenAI</strong> — your titles, scripts, and video transcripts are sent to
            OpenAI to generate scores and (for uploads) transcriptions. Subject to OpenAI&apos;s
            privacy policy.</li>
          <li><strong>Paddle</strong> — our Merchant of Record; processes payments, issues invoices,
            and handles tax/VAT. Subject to Paddle&apos;s privacy policy.</li>
          <li><strong>Render &amp; Vercel</strong> — cloud infrastructure hosting our backend and
            frontend respectively. Data is processed in their data centers (EU/US).</li>
        </ul>

        <h2>Video uploads</h2>
        <p>
          Uploaded video files are used only to extract audio for transcription and are deleted from
          our servers immediately after processing. The resulting transcript and scores are saved to
          your account so you can review them.
        </p>

        <h2>Data retention</h2>
        <p>
          We keep your account and analysis history until you delete your account or ask us to remove
          it. You can delete your account at any time from your account settings or by contacting us.
          Payment transaction records are retained as required by applicable tax law (typically 7 years).
        </p>

        <h2>Your rights (GDPR)</h2>
        <p>
          If you are in the EU, EEA, or UK you have the right to: access your data, correct inaccurate
          data, request erasure (right to be forgotten), restrict or object to processing, and receive
          a machine-readable copy of your data (data portability). You can export all your data at any
          time from your account settings. To delete your account or exercise any right, contact
          {' '}<a href="mailto:support@hyperyzer.com">support@hyperyzer.com</a>. You also have the right
          to lodge a complaint with your local data protection authority.
        </p>

        <h2>Cookies &amp; local storage</h2>
        <p>
          We use your browser&rsquo;s local storage solely to keep you signed in (an authentication
          token). This is strictly necessary for the service to function. We do not use advertising
          cookies, third-party tracking cookies, or analytics cookies.
        </p>

        <h2>Children</h2>
        <p>The service is not intended for anyone under 16. Do not use it if you are under 16.</p>

        <h2>International transfers</h2>
        <p>
          Your data may be processed in the United States (OpenAI, Vercel, Render). Where required,
          such transfers rely on Standard Contractual Clauses or equivalent safeguards.
        </p>

        <h2>Changes</h2>
        <p>We may update this policy; material changes will be reflected by the &ldquo;Last updated&rdquo; date above. Continued use of the service after changes constitutes acceptance.</p>

        <h2>Contact</h2>
        <p>Questions or data requests: <a href="mailto:support@hyperyzer.com">support@hyperyzer.com</a>.</p>
      </div>

      <div className="mt-12 pt-6 border-t border-black/5 text-sm font-bold text-slate-500 flex flex-wrap gap-4">
        <Link href="/" className="hover:text-slate-900">Home</Link>
        <Link href="/pricing" className="hover:text-slate-900">Pricing</Link>
        <Link href="/terms" className="hover:text-slate-900">Terms</Link>
        <Link href="/refund" className="hover:text-slate-900">Refund</Link>
      </div>
    </div>
  );
}

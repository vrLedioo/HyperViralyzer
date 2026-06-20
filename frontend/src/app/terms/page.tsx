import Link from 'next/link';
import { Play } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service — Hyperyzer',
  description: 'The terms for using Hyperyzer.',
};

export default function Terms() {
  return (
    <div className="relative z-10 text-slate-900 max-w-3xl mx-auto px-5 sm:px-8 py-10">
      <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-md">
          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
        </div>
        <span className="text-lg font-bold tracking-tight">Hyperyzer</span>
      </Link>

      <h1 className="text-3xl font-black tracking-tight">Terms of Service</h1>
      <p className="text-slate-500 font-medium mt-1">Last updated: June 2026</p>

      <div className="prose-sm mt-8 space-y-6 text-slate-700 leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-8 [&_h2]:mb-2 [&_li]:ml-5 [&_li]:list-disc [&_a]:text-pink-600 [&_a]:underline">
        <p>
          These Terms govern your use of Hyperyzer (the &ldquo;Service&rdquo;), operated by
          Hyperyzer, Kosovo. By using the Service you agree to these Terms. If you do not agree,
          do not use the Service.
        </p>

        <h2>The Service</h2>
        <p>
          Hyperyzer uses AI to score video ideas and uploaded videos for hook strength, retention,
          and viral potential, and to give feedback. <strong>Scores and feedback are AI-generated
          estimates for guidance only — they are not predictions or guarantees of views, revenue, or
          performance.</strong>
        </p>

        <h2>Eligibility</h2>
        <p>
          You must be at least 16 years old to use the Service. By registering, you represent that
          you meet this age requirement.
        </p>

        <h2>Accounts</h2>
        <p>
          You are responsible for keeping your login credentials secure and for all activity under
          your account. Provide accurate information when registering. Notify us immediately of any
          unauthorized use at <a href="mailto:support@hyperyzer.com">support@hyperyzer.com</a>.
        </p>

        <h2>Acceptable use</h2>
        <ul>
          <li>Only upload content you own or have the right to use.</li>
          <li>Do not upload unlawful, infringing, abusive, or harmful content.</li>
          <li>Do not attempt to disrupt, overload, reverse-engineer, scrape, or abuse the Service.</li>
          <li>Do not use the Service to train competing AI models.</li>
          <li>Do not share your account or API key with others.</li>
        </ul>

        <h2>Credits, plans &amp; payments</h2>
        <ul>
          <li>Free accounts receive a limited number of starter credits on signup. An idea analysis
            costs 1 credit; a video analysis costs 5 credits (it includes transcription).</li>
          <li>You can buy credit packs or subscribe to a monthly plan. Subscriptions renew
            automatically until cancelled.</li>
          <li>Monthly subscription credits are an allowance for that billing period; they do not
            roll over to the next period.</li>
          <li>Payments are processed by <strong>Paddle</strong>, which acts as the Merchant of
            Record (seller of record) and handles applicable taxes and VAT. Paddle&apos;s terms
            also apply to your transaction.</li>
          <li>If you use your own OpenAI key (&ldquo;BYOK&rdquo;), you are solely responsible for
            any costs your key incurs with OpenAI.</li>
        </ul>

        <h2>Refunds</h2>
        <p>
          Refunds are handled in line with our <a href="/refund">Refund Policy</a>, Paddle&rsquo;s
          policy, and any statutory consumer rights that apply to you. Contact us at
          {' '}<a href="mailto:support@hyperyzer.com">support@hyperyzer.com</a> for refund requests.
        </p>

        <h2>Intellectual property</h2>
        <p>
          You retain all rights to the content you submit and the videos you upload. We own the
          Service itself, its software, and its output format. You grant us a limited, non-exclusive
          licence to process your content solely to provide the Service.
        </p>

        <h2>Disclaimer &amp; limitation of liability</h2>
        <p>
          The Service is provided &ldquo;as is&rdquo; without warranties of any kind, express or
          implied. To the maximum extent permitted by applicable law, we are not liable for indirect,
          incidental, special, or consequential losses, or for decisions you make based on the
          Service&rsquo;s output. Our total aggregate liability is limited to the amount you paid us
          in the 3 months prior to the claim.
        </p>

        <h2>Availability &amp; changes</h2>
        <p>
          We aim for high availability but do not guarantee uninterrupted access. We may modify,
          suspend, or discontinue the Service (or any part of it) with reasonable notice where
          practicable.
        </p>

        <h2>Termination</h2>
        <p>
          You may stop using the Service and delete your account at any time. We may suspend or
          terminate your access for breach of these Terms, or if required by law, with or without
          prior notice depending on severity.
        </p>

        <h2>Governing law</h2>
        <p>
          These Terms are governed by the laws of Kosovo. Any disputes shall be subject to the
          exclusive jurisdiction of the courts of Kosovo, except where mandatory consumer protection
          law in your country provides otherwise.
        </p>

        <h2>Changes to these Terms</h2>
        <p>
          We may update these Terms. Material changes will be notified via the Service or by email.
          Continued use after the effective date constitutes acceptance of the updated Terms.
        </p>

        <h2>Contact</h2>
        <p><a href="mailto:support@hyperyzer.com">support@hyperyzer.com</a></p>
      </div>

      <div className="mt-12 pt-6 border-t border-black/5 text-sm font-bold text-slate-500 flex flex-wrap gap-4">
        <Link href="/" className="hover:text-slate-900">Home</Link>
        <Link href="/pricing" className="hover:text-slate-900">Pricing</Link>
        <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
        <Link href="/refund" className="hover:text-slate-900">Refund</Link>
      </div>
    </div>
  );
}

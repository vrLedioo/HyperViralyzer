import Link from 'next/link';
import { Play } from 'lucide-react';

export const metadata = {
  title: 'Refund Policy — Hyperyzer',
  description: 'How refunds work for Hyperyzer subscriptions and credit packs.',
};

export default function Refund() {
  return (
    <div className="relative z-10 text-slate-900 max-w-3xl mx-auto px-5 sm:px-8 py-10">
      <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-md">
          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
        </div>
        <span className="text-lg font-bold tracking-tight">Hyperyzer</span>
      </Link>

      <h1 className="text-3xl font-black tracking-tight">Refund Policy</h1>
      <p className="text-slate-500 font-medium mt-1">Last updated: June 2026</p>

      <div className="prose-sm mt-8 space-y-6 text-slate-700 leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-8 [&_h2]:mb-2 [&_li]:ml-5 [&_li]:list-disc [&_a]:text-pink-600 [&_a]:underline">
        <p>
          This Refund Policy explains how refunds work for Hyperyzer (the &ldquo;Service&rdquo;),
          operated by Hyperyzer, Kosovo. Payments are processed by our payment provider,
          <strong> Paddle</strong>, which acts as the Merchant of Record (the seller of record) and
          handles billing, taxes, and refunds on our behalf. Paddle&rsquo;s own buyer terms also
          apply to your purchase.
        </p>

        <h2>Digital products</h2>
        <p>
          Hyperyzer sells <strong>subscription plans</strong> and one-time <strong>credit packs</strong>.
          These are digital products delivered instantly (as credits added to your account), so the
          rules below reflect that.
        </p>

        <h2>14-day right of withdrawal (EU/EEA &amp; UK)</h2>
        <p>
          If you are a consumer in the EU/EEA or UK, you normally have 14 calendar days from
          purchase to withdraw from a digital product purchase. <strong>Important:</strong> by
          running an analysis you expressly request that we begin performance immediately and
          acknowledge that you lose the right of withdrawal for the portion of credits already used.
          Any unused credits within the 14-day window remain refundable upon request.
        </p>

        <h2>Subscriptions</h2>
        <ul>
          <li>You can cancel at any time from your account settings; cancellation stops future
            renewals. You keep access and your remaining monthly credits until the end of the paid
            period.</li>
          <li>Monthly subscription credits are an allowance for that billing period and do not
            roll over.</li>
          <li>We do not generally refund a billing period that has already started once its credits
            have been used, except where required by law or at our discretion.</li>
        </ul>

        <h2>Credit packs</h2>
        <ul>
          <li>Unused pack credits can be refunded within 14 days of purchase — contact us.</li>
          <li>Credits that have already been spent on analyses are non-refundable.</li>
          <li>Pack credits never expire; they roll over indefinitely until used or until your
            account is closed.</li>
        </ul>

        <h2>Problems &amp; faulty service</h2>
        <p>
          If the Service fails to deliver an analysis you paid for (for example, a failed job that
          consumed credits and could not be re-run), contact us and we will re-credit or refund
          those credits without charge. Nothing in this policy limits your statutory consumer rights
          under applicable law.
        </p>

        <h2>How to request a refund</h2>
        <p>
          Email <a href="mailto:support@hyperyzer.com">support@hyperyzer.com</a> from the address
          on your account, with your order or receipt details. We aim to respond within 2 business
          days. Approved refunds are issued by Paddle to your original payment method within 5–10
          business days. You can also request help directly through the Paddle receipt email you
          received at purchase.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about a charge or refund?{' '}
          <a href="mailto:support@hyperyzer.com">support@hyperyzer.com</a>.
        </p>
      </div>

      <div className="mt-12 pt-6 border-t border-black/5 text-sm font-bold text-slate-500 flex flex-wrap gap-4">
        <Link href="/" className="hover:text-slate-900">Home</Link>
        <Link href="/pricing" className="hover:text-slate-900">Pricing</Link>
        <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
        <Link href="/terms" className="hover:text-slate-900">Terms</Link>
      </div>
    </div>
  );
}

import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { getBusinessInfo } from '@/config/businessInfo';
import {
  Coins,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contribution Policy — Global Digital Monument',
  description:
    'Detailed terms and explanation of digital contributions, tier amounts, contributor benefits, and our transparent participation model.',
};

export default function ContributionPolicyPage() {
  const businessInfo = getBusinessInfo();
  const { minimumAmount, maximumAmount, presetAmounts, currency } =
    businessInfo.contributionLimits;

  return (
    <LegalPageLayout
      title="Digital Contribution Policy"
      subtitle="Complete transparency on what your contribution covers, what you receive, and how digital markers are managed on the monument."
      category="Participation & Billing Guidelines"
      lastUpdated="October 2026"
    >
      {/* 1. What a Contribution Means */}
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight flex items-center gap-2.5">
          <Coins className="w-5 h-5 text-[#FFC857]" />
          <span>1. What a Contribution Means on This Platform</span>
        </h2>
        <p>
          A contribution to Global Digital Monument is a voluntary payment made to ignite and display an interactive, glowing light marker on our shared 3D Earth.
        </p>
        <p>
          Contributions fund the ongoing technical operation of the monument, including cloud rendering servers, real-time database persistence, WebGL graphics optimization, and continuous platform development. By contributing, you participate directly in a living, global work of collective digital art.
        </p>
      </section>

      {/* 2. Contribution Amounts & Limits */}
      <section className="space-y-4 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight">
          2. Contribution Amounts and Currency
        </h2>
        <p>
          Contribution amounts are structured to be accessible to participants worldwide while providing opportunities for greater support. The available options in our checkout flow are:
        </p>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {presetAmounts.map((amt) => (
              <div
                key={amt}
                className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-center"
              >
                <span className="text-[10px] font-mono text-[#8993A7] uppercase block">
                  Preset Tier
                </span>
                <span className="text-base sm:text-lg font-mono font-bold text-[#FFC857]">
                  ₹{amt}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 text-xs text-[#8993A7] space-y-1.5 border-t border-white/[0.06]">
            <p>
              • <strong>Custom Amounts:</strong> You may also enter any custom amount between{' '}
              <span className="text-[#F5F7FA] font-mono font-medium">₹{minimumAmount}</span> (minimum) and{' '}
              <span className="text-[#F5F7FA] font-mono font-medium">₹{maximumAmount.toLocaleString()}</span> (maximum demonstration ceiling).
            </p>
            <p>
              • <strong>Currency:</strong> All payments are calculated and processed in Indian Rupees ({currency}). If you pay using an international card, your bank or payment issuer will convert the charge at current foreign exchange rates.
            </p>
          </div>
        </div>
      </section>

      {/* 3. What the Contributor Receives */}
      <section className="space-y-4 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>3. What Contributors Receive</span>
        </h2>
        <p>
          Upon verified payment confirmation, your contribution grants the following digital features:
        </p>

        <ul className="space-y-2.5 pl-1">
          <li className="flex items-start gap-3 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFC857] mt-2 shrink-0" />
            <span>
              <strong>A Glowing 3D Light Marker:</strong> An interactive golden light beacon rendered at your chosen spherical coordinates (or chosen regional centroid).
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFC857] mt-2 shrink-0" />
            <span>
              <strong>Personal Dedication Message:</strong> An optional tribute or dedication of up to 240 characters, displayed in your marker card when clicked.
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFC857] mt-2 shrink-0" />
            <span>
              <strong>Identity Choice:</strong> Display your chosen name or opt for completely anonymous placement (&quot;Anonymous&quot;).
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFC857] mt-2 shrink-0" />
            <span>
              <strong>Optional Avatar / Tribute Image:</strong> Upload a personal tribute image thumbnail associated with your dedication.
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFC857] mt-2 shrink-0" />
            <span>
              <strong>Monument Leaderboard Ranking:</strong> Inclusion in the community leaderboard, calculated strictly by contribution amount and timestamp.
            </span>
          </li>
        </ul>
      </section>

      {/* 4. What Contributions Do NOT Include */}
      <section className="space-y-4 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight flex items-center gap-2.5">
          <XCircle className="w-5 h-5 text-red-400" />
          <span>4. What Contributions Do NOT Include</span>
        </h2>
        <p>
          To prevent any misunderstanding, we state clearly what a contribution is not:
        </p>

        <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-3 text-xs sm:text-sm">
          <p>
            • <strong>No Real Property or Physical Land:</strong> A digital light marker on our 3D globe does <em>not</em> convey any real-world ownership, deed, mining right, airspace claim, or legal entitlement to physical Earth property or territory.
          </p>
          <p>
            • <strong>No Physical Goods or Merchandise:</strong> Contributions do not include physical certificates, coins, merchandise, lottery tickets, or tangible items.
          </p>
          <p>
            • <strong>No Financial Returns or Securities:</strong> Contributions are non-investment participation fees. They do not confer equity, shares, profit-sharing, or dividends.
          </p>
          <p>
            • <strong>No Tax Deductions:</strong> Global Digital Monument is not a registered charity or non-profit entity. Contributions are not tax-deductible.
          </p>
          <p>
            • <strong>No Guaranteed Perpetual Visibility:</strong> While we aim to keep the monument active indefinitely, platform availability is subject to hosting uptime, technical maintenance, and operational continuity as outlined in our Terms of Service.
          </p>
        </div>
      </section>

      {/* 5. One-Time Payment Model */}
      <section className="space-y-4 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight">
          5. Single One-Time Charge (No Subscriptions)
        </h2>
        <p>
          Every contribution is a <strong>single, one-time payment</strong>. Global Digital Monument does <em>not</em> run recurring subscriptions, periodic memberships, or automatic renewal debits.
        </p>
        <p>
          You will only be charged when you explicitly review and authorize a checkout session through our payment provider.
        </p>
      </section>

      {/* 6. Content Moderation & Acceptable Dedications */}
      <section className="space-y-4 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight">
          6. Content Standards & Dedication Moderation
        </h2>
        <p>
          The monument is a respectful, positive global space. We enforce community guidelines:
        </p>
        <p>
          Dedications must not contain hate speech, harassment, profanity, defamatory statements, personal contact information of third parties without consent, or commercial spam. The platform operator reserves the right to edit, mask, or remove dedications that violate these standards without refund.
        </p>
      </section>

      {/* Navigation links */}
      <section className="pt-6 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <Link
          href="/refund-policy"
          className="text-[#8993A7] hover:text-[#FFC857] flex items-center gap-1.5 transition-colors"
        >
          <span>Read our Refund & Cancellation Policy</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Link
          href="/payment-support"
          className="text-[#8993A7] hover:text-[#FFC857] flex items-center gap-1.5 transition-colors"
        >
          <span>Need Payment Assistance?</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </section>
    </LegalPageLayout>
  );
}

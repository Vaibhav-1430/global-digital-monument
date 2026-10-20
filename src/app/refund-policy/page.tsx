import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { getBusinessInfo } from '@/config/businessInfo';
import {
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Clock,
  ShieldAlert,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy — Global Digital Monument',
  description:
    'Our transparent policies on checkout cancellations, duplicate charges, payment failures, and refund requests.',
};

export default function RefundPolicyPage() {
  const businessInfo = getBusinessInfo();

  return (
    <LegalPageLayout
      title="Refund & Cancellation Policy"
      subtitle="Clear guidelines on checkout cancellations, failed transactions, duplicate debits, and refund review procedures."
      category="Billing & Dispute Resolution"
      lastUpdated="October 2026"
    >
      {/* Overview Notice */}
      <section className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs sm:text-sm leading-relaxed space-y-2">
        <p>
          At Global Digital Monument, we strive to make every contribution experience smooth, transparent, and fair. Because our contributions represent digital services that ignite glowing beacons immediately upon payment confirmation, we outline our specific policies for different transaction scenarios below.
        </p>
      </section>

      {/* 1. Checkout Cancellation Before Payment */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight flex items-center gap-2.5">
          <Clock className="w-5 h-5 text-[#7DD3FC]" />
          <span>1. Checkout Cancellation Before Payment</span>
        </h2>
        <p>
          If you close or dismiss the Razorpay payment window before completing the transaction:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-[#C3C9D5]">
          <li>No money is deducted from your card, bank, or UPI account.</li>
          <li>The pending contribution intent is marked as cancelled or abandoned.</li>
          <li>No light marker is saved to our public database or displayed on the monument.</li>
          <li>You may restart the contribution process at any time without penalty.</li>
        </ul>
      </section>

      {/* 2. Failed or Interrupted Transactions */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-400" />
          <span>2. Failed or Interrupted Transactions</span>
        </h2>
        <p>
          If a transaction fails due to network interruptions, incorrect OTP entry, or bank authorization declines:
        </p>
        <p className="text-xs sm:text-sm">
          In most instances, no funds leave your account. In rare situations where your banking app displays a temporary debit for a failed session, the banking infrastructure holds the funds in escrow and automatically reverses the amount back to your original payment source within <strong>3 to 7 business days</strong>, in accordance with Reserve Bank of India (RBI) / banking standards.
        </p>
      </section>

      {/* 3. Duplicate Charges */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight flex items-center gap-2.5">
          <RefreshCw className="w-5 h-5 text-emerald-400" />
          <span>3. Duplicate Charges for a Single Light</span>
        </h2>
        <p>
          If you were inadvertently charged more than once for a single intended contribution due to rapid clicks or connectivity glitches:
        </p>
        <p className="text-xs sm:text-sm">
          Please notify the project operator via <Link href="/contact" className="text-[#FFC857] underline">Contact Support</Link> or <Link href="/payment-support" className="text-[#FFC857] underline">Payment Support</Link>. Provide both Razorpay Payment IDs (e.g. <code className="bg-white/10 px-1 py-0.5 rounded text-white font-mono">pay_...</code>). Once the duplicate charge is verified on the gateway dashboard, a full reversal for the redundant transaction will be initiated back to your original payment method.
        </p>
      </section>

      {/* 4. Payment Received But Contribution Not Displayed */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight">
          4. Payment Debited but Light Not Displayed
        </h2>
        <p className="text-xs sm:text-sm">
          If funds were successfully deducted from your account but your light did not immediately appear:
        </p>
        <p className="text-xs sm:text-sm">
          Our backend employs asynchronous payment webhooks. In cases of momentary client disconnects, our server webhook typically verifies and confirms the light within a few minutes. If after 30 minutes your light remains absent, please submit your Payment ID to the project operator. The transaction will be manually verified and your light activated. If we are unable to place your marker due to a technical defect, you are entitled to a full refund.
        </p>
      </section>

      {/* 5. Requests for Refunds After Successful Ignition */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight">
            5. Requests for Refunds After Successful Ignition
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold uppercase">
            Owner Review Required Prior to Launch
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 text-xs sm:text-sm">
          <p className="text-[#F5F7FA]">
            <strong>Digital Service Nature:</strong> Contributions on Global Digital Monument provide instant digital services (immediate 3D rendering, persistent marker placement, and leaderboard indexing). Because the digital light is ignited upon confirmation, contributions are generally non-refundable once rendered, except in cases of verified technical delivery failure or duplicate debits.
          </p>

          <p>
            <strong>Proposed Refund Consideration Framework (Pending Final Owner Launch Confirmation):</strong>
          </p>

          <ul className="list-disc pl-5 space-y-1.5 text-[#8993A7]">
            <li>
              Refund requests submitted within <strong>{businessInfo.refundWindowDays} calendar days</strong> of payment will be reviewed on a case-by-case basis by the project operator (e.g. accidental submission, proven unauthorized account use, or persistent rendering defects).
            </li>
            <li>
              Where a refund is approved by the project operator, the corresponding light marker and dedication will be deactivated and removed from the 3D globe and public leaderboard.
            </li>
            <li>
              Refunds approved for processing are credited back strictly to the <strong>original payment source</strong> (bank account, UPI, or card) through Razorpay&apos;s settlement channels, typically taking 5 to 7 business days to reflect in your statement.
            </li>
            <li>
              We never issue cash refunds or refunds to unrelated third-party accounts.
            </li>
          </ul>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200/90 leading-relaxed">
            <em>Notice to Operator:</em> The refund window and review discretion above represent the operational framework and must be reviewed and formally confirmed by legal counsel/business management before activating production payments.
          </div>
        </div>
      </section>

      {/* How to Request Assistance */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight">
          6. How to Submit a Refund or Payment Inquiry
        </h2>
        <p className="text-xs sm:text-sm">
          To initiate an inquiry or report an issue, please visit our <Link href="/payment-support" className="text-[#FFC857] underline">Payment Support page</Link> or email us with the following non-sensitive details:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
            <span className="text-emerald-400 font-bold block mb-1">✓ What to Provide:</span>
            <ul className="space-y-1 text-[#8993A7]">
              <li>• Razorpay Payment ID (pay_...)</li>
              <li>• Date and time of the transaction</li>
              <li>• Exact amount debited (e.g. ₹50)</li>
              <li>• Email address entered at checkout</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <span className="text-red-400 font-bold block mb-1">✕ NEVER Provide:</span>
            <ul className="space-y-1 text-red-200/80">
              <li>• UPI PIN or ATM PIN</li>
              <li>• Banking passwords or OTPs</li>
              <li>• 16-digit card number or CVV</li>
              <li>• Sensitive identity documents</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Statutory Rights */}
      <section className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-[#8993A7] leading-relaxed">
        <p>
          <strong>Statutory Consumer Rights:</strong> Nothing contained in this Refund Policy is intended to limit, modify, or exclude any mandatory consumer protection rights or statutory dispute mechanisms guaranteed to you under applicable consumer law in your jurisdiction.
        </p>
      </section>

      {/* Navigation footer */}
      <section className="pt-6 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <Link
          href="/payment-support"
          className="btn-gold px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-semibold flex items-center gap-2 shadow-lg"
        >
          <span>OPEN PAYMENT SUPPORT</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Link
          href="/terms"
          className="text-[#8993A7] hover:text-[#FFC857] flex items-center gap-1.5 transition-colors"
        >
          <span>View Terms of Service</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </section>
    </LegalPageLayout>
  );
}

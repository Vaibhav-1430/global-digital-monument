import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import {
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  CreditCard,
  RefreshCw,
  Search,
  Scale,
  ArrowRight,
  Mail
} from 'lucide-react';
import { getBusinessInfo } from '@/config/businessInfo';

export const metadata: Metadata = {
  title: 'Payment Support & Dispute Resolution — Global Digital Monument',
  description:
    'Dedicated support for payment verification, missing lights, duplicate charges, and transaction inquiries.',
};

export default function PaymentSupportPage() {
  const businessInfo = getBusinessInfo();

  return (
    <LegalPageLayout
      title="Payment Support & Dispute Resolution"
      subtitle="Fast, dedicated guidance for missing lights, payment verification, duplicate debits, and transaction reconciliation."
      category="Payment Troubleshooting & Support"
      lastUpdated="October 2026"
    >
      {/* Quick Action Alert */}
      <section className="p-5 rounded-2xl bg-[#FFC857]/10 border border-[#FFC857]/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-mono font-semibold uppercase text-[#FFC857] block">
            Need Immediate Payment Assistance?
          </span>
          <p className="text-xs sm:text-sm text-[#F5F7FA]/90">
            Submit your Razorpay Payment ID (<code className="bg-black/30 px-1 py-0.5 rounded text-white font-mono">pay_...</code>) directly through our contact form for priority transaction verification.
          </p>
        </div>
        <Link
          href="/contact"
          className="btn-gold px-5 py-2.5 rounded-full text-xs uppercase tracking-widest font-semibold flex items-center gap-1.5 shrink-0 shadow-lg"
        >
          <span>SUBMIT PAYMENT TICKET</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </section>

      {/* Common Payment Scenarios */}
      <section className="space-y-4 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight">
          How to Handle Common Payment Situations
        </h2>

        <div className="space-y-4">
          {/* Scenario 1: Debited but Light Not Showing */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
            <div className="flex items-center gap-2.5 text-[#FFC857]">
              <Search className="w-4 h-4" />
              <h3 className="text-sm font-semibold text-[#F5F7FA]">
                1. Money Debited, But My Light Did Not Appear
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#8993A7] leading-relaxed">
              <strong>Why this happens:</strong> If your mobile internet or Wi-Fi dropped for a second right after authorizing payment in the Razorpay modal, your browser may not have finished sending the cryptographic confirmation to our server.
            </p>
            <p className="text-xs sm:text-sm text-[#8993A7] leading-relaxed">
              <strong>Resolution:</strong> Our server runs automated background webhooks from Razorpay that independently verify and ignite pending lights within 5 to 10 minutes. If after 15 minutes your light is still not visible on the globe, send us your <strong>Razorpay Payment ID</strong> via <Link href="/contact" className="text-[#FFC857] underline">Contact Support</Link>. We will locate the transaction in our database and activate your light immediately.
            </p>
          </div>

          {/* Scenario 2: Duplicate Debits */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
            <div className="flex items-center gap-2.5 text-[#7DD3FC]">
              <RefreshCw className="w-4 h-4" />
              <h3 className="text-sm font-semibold text-[#F5F7FA]">
                2. Duplicate Debits / Charged Twice for One Light
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#8993A7] leading-relaxed">
              If multiple authorization attempts went through due to a delayed bank response or double click, please send us both payment references. Upon reviewing our gateway records, we will immediately approve a full reversal for the redundant charge back to your original payment method.
            </p>
          </div>

          {/* Scenario 3: Transaction Failed But Money Left Account */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
            <div className="flex items-center gap-2.5 text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <h3 className="text-sm font-semibold text-[#F5F7FA]">
                3. Checkout Showed &quot;Payment Failed&quot;, But Bank Deducted Money
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#8993A7] leading-relaxed">
              In rare inter-bank UPI or card routing failures, funds are debited by your issuing bank but never captured by Razorpay. Because our servers never received the funds, the banking clearinghouse automatically reconciles the transaction and returns the money to your account within <strong>3 to 7 business days</strong>. If it is not reversed within 7 business days, notify us with the bank reference number (UTR/RRN).
            </p>
          </div>

          {/* Scenario 4: Incorrect Amount */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
            <div className="flex items-center gap-2.5 text-purple-400">
              <CreditCard className="w-4 h-4" />
              <h3 className="text-sm font-semibold text-[#F5F7FA]">
                4. Incorrect Amount Deducted
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#8993A7] leading-relaxed">
              Our server enforces strict mathematical checks: if the checkout signature or amount returned by the gateway does not match the database contribution intent down to the exact paisa, the transaction is rejected. If you suspect an anomaly, send your digital receipt for investigation.
            </p>
          </div>
        </div>
      </section>

      {/* Critical Security Checklist */}
      <section className="space-y-4 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight">
          What Details to Provide (and What NEVER to Share)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Safe Details to Provide</span>
            </div>
            <ul className="space-y-1.5 text-xs text-emerald-200/90 leading-relaxed">
              <li>• Razorpay Payment ID (e.g. <code className="bg-black/30 px-1 py-0.5 rounded text-white font-mono">pay_Nx93...</code>)</li>
              <li>• Razorpay Order ID (e.g. <code className="bg-black/30 px-1 py-0.5 rounded text-white font-mono">order_Nx93...</code>)</li>
              <li>• Date and approximate time of payment</li>
              <li>• Contribution amount (e.g. ₹25 INR)</li>
              <li>• Email address entered during checkout</li>
              <li>• Selected location or country name</li>
            </ul>
          </div>

          <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/25 space-y-2.5">
            <div className="flex items-center gap-2 text-red-400 font-mono text-xs uppercase font-semibold">
              <ShieldAlert className="w-4 h-4" />
              <span>CRITICAL: NEVER Send These Details</span>
            </div>
            <ul className="space-y-1.5 text-xs text-red-200/90 leading-relaxed">
              <li>✕ UPI PIN, ATM PIN, or Google Pay PIN</li>
              <li>✕ One-Time Password (OTP) received via SMS or email</li>
              <li>✕ Internet banking passwords or login credentials</li>
              <li>✕ Full 16-digit card number or 3-digit CVV</li>
              <li>✕ Screenshots showing complete card numbers</li>
            </ul>
            <p className="text-[11px] text-red-300 font-mono pt-1">
              Our staff will NEVER ask you for your PIN, OTP, or CVV under any circumstances.
            </p>
          </div>
        </div>
      </section>

      {/* Dispute Procedures & Statutory Rights */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight flex items-center gap-2.5">
          <Scale className="w-5 h-5 text-[#FFC857]" />
          <span>Dispute Escalation & Statutory Consumer Rights</span>
        </h2>
        <p className="text-xs sm:text-sm text-[#8993A7] leading-relaxed">
          We are committed to resolving payment concerns fairly and transparently. Inquiries submitted via our contact form or sent to the owner-provided contact address (<strong className="text-white font-mono">{businessInfo.supportEmail || 'printkaro.org@gmail.com'}</strong>) are reviewed on a best-effort basis by the project operator. Guaranteed response times and SLA monitoring remain unconfirmed pending owner review prior to commercial launch.
        </p>
        <p className="text-xs sm:text-sm text-[#8993A7] leading-relaxed">
          <strong>Non-Exclusion of Statutory Rights:</strong> Our informal dispute assistance operates alongside, and does not replace, your statutory consumer rights or the dispute resolution channels provided by your bank, card issuer, or Razorpay. You retain the right to seek chargebacks or dispute remedies through your banking institution in cases of unauthorized transactions.
        </p>
      </section>

      {/* Navigation footer */}
      <section className="pt-6 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <Link
          href="/refund-policy"
          className="text-[#8993A7] hover:text-[#FFC857] flex items-center gap-1.5 transition-colors"
        >
          <span>Review our Refund Policy</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Link
          href="/contact"
          className="btn-gold px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-semibold flex items-center gap-2 shadow-lg"
        >
          <span>CONTACT SUPPORT NOW</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </section>
    </LegalPageLayout>
  );
}

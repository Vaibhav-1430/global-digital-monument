import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import ContactForm from '@/components/legal/ContactForm';
import { getBusinessInfo } from '@/config/businessInfo';
import {
  Mail,
  Clock,
  Building,
  HelpCircle,
  AlertTriangle,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact & Customer Support — Global Digital Monument',
  description:
    'Need help with a contribution, payment inquiry, or dedication? Reach out to the Global Digital Monument support team.',
};

export default function ContactPage() {
  const businessInfo = getBusinessInfo();

  return (
    <LegalPageLayout
      title="Contact & Customer Support"
      subtitle="Have questions about your contribution, payment verification, or dedication? We are here to help."
      category="Customer Support & Help Desk"
      lastUpdated="October 2026"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Support Channels Sidebar */}
        <aside className="lg:col-span-1 space-y-6">
          {/* Email Support Card */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
            <div className="flex items-center gap-2.5 text-[#FFC857]">
              <Mail className="w-4 h-4" />
              <h2 className="text-xs font-mono uppercase tracking-wider font-semibold">
                Direct Email Support
              </h2>
            </div>

            {businessInfo.isEmailConfigured && businessInfo.supportEmail ? (
              <div>
                <a
                  href={`mailto:${businessInfo.supportEmail}`}
                  className="text-sm font-mono text-[#FFC857] hover:underline break-all"
                >
                  {businessInfo.supportEmail}
                </a>
                <p className="text-xs text-[#8993A7] mt-1">
                  Click to open your default email client.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {!businessInfo.isProduction ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <span className="font-mono font-semibold block">Launch Configuration</span>
                      <span>Set NEXT_PUBLIC_SUPPORT_EMAIL in .env.local before production launch.</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#8993A7] leading-relaxed">
                    Direct email dispatch configuration is currently being finalized for launch. Please use the secure web inquiry form.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Operating Hours & Timelines */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
            <div className="flex items-center gap-2.5 text-[#7DD3FC]">
              <Clock className="w-4 h-4" />
              <h2 className="text-xs font-mono uppercase tracking-wider font-semibold">
                Support Hours
              </h2>
            </div>
            <div className="text-xs text-[#8993A7] space-y-1.5 leading-relaxed">
              <p>
                <strong className="text-[#F5F7FA]">Monday – Friday:</strong> 10:00 AM – 6:00 PM IST
              </p>
              <p>
                <strong className="text-[#F5F7FA]">Weekend:</strong> Critical payment verification tickets monitored
              </p>
              <p className="text-[11px] text-[#8993A7]/70 pt-1 border-t border-white/[0.06]">
                Typical response window: within 24 to 48 business hours.
              </p>
            </div>
          </div>

          {/* Business Entity Information */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
            <div className="flex items-center gap-2.5 text-[#8993A7]">
              <Building className="w-4 h-4" />
              <h2 className="text-xs font-mono uppercase tracking-wider font-semibold">
                Operator Details
              </h2>
            </div>
            <div className="text-xs text-[#8993A7] space-y-1 leading-relaxed">
              <p className="text-[#F5F7FA] font-medium">
                {businessInfo.legalEntityName}
              </p>
              <p className="text-[11px]">
                {businessInfo.businessAddress}
              </p>
              <p className="text-[10px] font-mono text-[#8993A7]/60 pt-1">
                Jurisdiction: {businessInfo.governingJurisdiction}
              </p>
            </div>
          </div>

          {/* Quick Security Warning */}
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Security Alert:</strong> Never share passwords, OTPs, UPI PINs, or full card numbers with support. We will never ask for payment secrets.
            </p>
          </div>
        </aside>

        {/* Contact Form Main Column */}
        <section className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg sm:text-xl font-light text-[#F5F7FA] tracking-tight mb-1">
              Send an Inquiry
            </h2>
            <p className="text-xs sm:text-sm text-[#8993A7] font-light">
              Fill out the form below. For payment-related issues, including your Razorpay Order ID or Payment ID helps us assist you faster.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
            <ContactForm />
          </div>

          {/* Direct link to Payment Support */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-[#8993A7]">
              Experiencing a debit without your light appearing?
            </span>
            <Link
              href="/payment-support"
              className="text-[#FFC857] hover:underline flex items-center gap-1 font-mono"
            >
              <span>Payment Guide</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </section>
      </div>
    </LegalPageLayout>
  );
}

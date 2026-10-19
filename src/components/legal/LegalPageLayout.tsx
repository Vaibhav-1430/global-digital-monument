'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Globe2,
  ArrowLeft,
  ShieldCheck,
  FileText,
  Mail,
  HelpCircle,
  RefreshCw,
  Coins,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { getBusinessInfo } from '@/config/businessInfo';

interface LegalPageLayoutProps {
  title: string;
  subtitle?: string;
  category?: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: '/about', label: 'About', icon: Globe2 },
  { href: '/contribution-policy', label: 'Contribution Policy', icon: Coins },
  { href: '/refund-policy', label: 'Refund Policy', icon: RefreshCw },
  { href: '/payment-support', label: 'Payment Support', icon: HelpCircle },
  { href: '/terms', label: 'Terms of Service', icon: FileText },
  { href: '/privacy', label: 'Privacy Policy', icon: ShieldCheck },
  { href: '/contact', label: 'Contact', icon: Mail },
];

export default function LegalPageLayout({
  title,
  subtitle,
  category = 'Trust & Legal Information',
  lastUpdated = 'October 2026',
  children,
}: LegalPageLayoutProps) {
  const pathname = usePathname();
  const businessInfo = getBusinessInfo();

  return (
    <div className="min-h-screen bg-[#030407] text-[#F5F7FA] flex flex-col font-sans select-text selection:bg-[#FFC857]/30 selection:text-[#FFC857]">
      {/* Subtle atmospheric starry background glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#7DD3FC]/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/4 -right-40 w-96 h-96 bg-[#FFC857]/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-[#7DD3FC]/5 rounded-full blur-[100px]" />
      </div>

      {/* Top Header */}
      <header className="relative z-20 border-b border-white/[0.08] bg-[#030407]/80 backdrop-blur-md sticky top-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-3 group transition-transform hover:scale-[1.01]"
            aria-label="Global Digital Monument Home"
          >
            <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-white/[0.04] border border-white/10 shadow-[0_0_12px_rgba(255,200,87,0.2)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FFC857] shadow-[0_0_6px_#FFC857]" />
              <div
                className="absolute inset-0 rounded-full border border-[#7DD3FC]/25 animate-spin"
                style={{ animationDuration: '20s' }}
              />
            </div>
            <span className="text-xs sm:text-sm font-semibold tracking-[0.2em] text-[#F5F7FA] uppercase font-mono group-hover:text-[#FFC857] transition-colors">
              Global Digital Monument
            </span>
          </Link>

          {/* Action button: Return to 3D Globe */}
          <Link
            href="/"
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full glass-panel border border-[#FFC857]/30 hover:border-[#FFC857] text-[#FFC857] hover:bg-[#FFC857]/10 transition-all text-xs font-mono tracking-wider flex items-center gap-2 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>RETURN TO GLOBE</span>
          </Link>
        </div>

        {/* Secondary Trust & Legal Navigation Bar */}
        <nav
          aria-label="Trust and Legal Navigation"
          className="border-t border-white/[0.04] bg-white/[0.01] overflow-x-auto scrollbar-none"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 sm:gap-2 py-1.5 text-xs font-mono">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-2 shrink-0 transition-all ${
                    isActive
                      ? 'bg-[#FFC857]/15 text-[#FFC857] border border-[#FFC857]/40 shadow-[0_0_12px_rgba(255,200,87,0.15)] font-semibold'
                      : 'text-[#8993A7] hover:text-[#F5F7FA] hover:bg-white/[0.04] border border-transparent'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Development Launch Warning (Visible only in development if required config is missing) */}
        {!businessInfo.isProduction && (!businessInfo.isEmailConfigured || !businessInfo.isLegalEntityConfigured) && (
          <div className="mb-6 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold font-mono uppercase block mb-0.5">
                Launch Configuration Notice (Development Mode)
              </span>
              <p className="text-amber-200/90 text-[11px] leading-relaxed">
                Owner legal and contact details are currently using fallback defaults. Configure{' '}
                <code className="text-white bg-black/40 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPPORT_EMAIL</code>{' '}
                and <code className="text-white bg-black/40 px-1 py-0.5 rounded">NEXT_PUBLIC_LEGAL_ENTITY_NAME</code>{' '}
                in <code className="text-white bg-black/40 px-1 py-0.5 rounded">.env.local</code> prior to public launch.
              </p>
            </div>
          </div>
        )}

        {/* Article Container */}
        <article className="glass-panel border border-white/10 rounded-3xl p-6 sm:p-10 md:p-12 shadow-[0_0_60px_rgba(0,0,0,0.8)]">
          {/* Header block */}
          <header className="border-b border-white/[0.08] pb-6 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7DD3FC]/10 border border-[#7DD3FC]/25 text-[#7DD3FC] text-[10px] font-mono tracking-widest uppercase mb-4">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{category}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-light text-[#F5F7FA] tracking-tight leading-tight mb-3">
              {title}
            </h1>

            {subtitle && (
              <p className="text-sm sm:text-base text-[#8993A7] font-light leading-relaxed mb-4">
                {subtitle}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#8993A7]">
              <span>Last updated: {lastUpdated}</span>
              <span>•</span>
              <span>Global Digital Monument</span>
            </div>
          </header>

          {/* Children body */}
          <div className="text-sm sm:text-base text-[#C3C9D5] font-light leading-relaxed space-y-6">
            {children}
          </div>
        </article>
      </main>

      {/* Trust & Legal Footer */}
      <footer className="relative z-10 border-t border-white/[0.08] bg-[#030407]/90 py-8 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/[0.06] text-xs font-mono text-[#8993A7]">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFC857]" />
              <span className="text-[#F5F7FA]">Global Digital Monument</span>
              <span>— One planet. Millions of stories.</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <Link href="/about" className="hover:text-[#FFC857] transition-colors">
                About
              </Link>
              <Link href="/contribution-policy" className="hover:text-[#FFC857] transition-colors">
                Contribution Policy
              </Link>
              <Link href="/refund-policy" className="hover:text-[#FFC857] transition-colors">
                Refunds
              </Link>
              <Link href="/payment-support" className="hover:text-[#FFC857] transition-colors">
                Payment Support
              </Link>
              <Link href="/terms" className="hover:text-[#FFC857] transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-[#FFC857] transition-colors">
                Privacy
              </Link>
              <Link href="/contact" className="hover:text-[#FFC857] transition-colors">
                Contact
              </Link>
            </div>
          </div>

          <div className="text-[11px] text-[#8993A7]/70 font-mono leading-relaxed space-y-2">
            <p>
              <strong>Notice:</strong> Global Digital Monument is an independent digital art and interactive web experience. It is not a registered charity, non-profit organization, or tax-deductible donation platform. All digital contributions are subject to our Contribution Policy and Refund Policy.
            </p>
            <p>
              © 2026 {businessInfo.legalEntityName}. All rights reserved. Razorpay is an independent third-party payment processing provider.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

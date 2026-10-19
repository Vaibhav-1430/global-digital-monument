'use client';

import React from 'react';
import Link from 'next/link';

interface SiteFooterProps {
  totalLights: number;
  opacity: number;
}

export default function SiteFooter({ totalLights, opacity }: SiteFooterProps) {
  return (
    <footer
      id="site-footer"
      aria-label="Site and Legal Navigation"
      className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none transition-all duration-1000 px-4 py-3 sm:px-8 sm:py-4 md:px-12 md:py-5 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px] font-mono"
      style={{
        opacity,
        transform: `translateY(${(1 - opacity) * 12}px)`,
      }}
    >
      {/* Light Counter Display */}
      <div className="pointer-events-auto flex items-center gap-2 text-[#8993A7]/80">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FFC857] animate-pulse" />
        <span id="monument-light-counter">
          {totalLights.toLocaleString()} lights glowing (Demo)
        </span>
      </div>

      {/* Trust & Legal Links */}
      <nav
        aria-label="Legal and Trust Links"
        className="pointer-events-auto flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1 text-[#8993A7]/70"
      >
        <Link
          href="/about"
          className="hover:text-[#FFC857] transition-colors focus:outline-none focus:text-[#FFC857]"
        >
          About
        </Link>
        <span className="opacity-30">•</span>
        <Link
          href="/contribution-policy"
          className="hover:text-[#FFC857] transition-colors focus:outline-none focus:text-[#FFC857]"
        >
          Contributions
        </Link>
        <span className="opacity-30">•</span>
        <Link
          href="/refund-policy"
          className="hover:text-[#FFC857] transition-colors focus:outline-none focus:text-[#FFC857]"
        >
          Refunds
        </Link>
        <span className="opacity-30">•</span>
        <Link
          href="/terms"
          className="hover:text-[#FFC857] transition-colors focus:outline-none focus:text-[#FFC857]"
        >
          Terms
        </Link>
        <span className="opacity-30">•</span>
        <Link
          href="/privacy"
          className="hover:text-[#FFC857] transition-colors focus:outline-none focus:text-[#FFC857]"
        >
          Privacy
        </Link>
        <span className="opacity-30">•</span>
        <Link
          href="/payment-support"
          className="hover:text-[#FFC857] transition-colors focus:outline-none focus:text-[#FFC857]"
        >
          Payment Support
        </Link>
        <span className="opacity-30">•</span>
        <Link
          href="/contact"
          className="text-[#FFC857]/80 hover:text-[#FFC857] transition-colors focus:outline-none focus:text-[#FFC857]"
        >
          Contact
        </Link>
      </nav>
    </footer>
  );
}

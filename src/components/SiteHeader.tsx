'use client';

import React from 'react';
import { Crown } from 'lucide-react';
import { LightMarkerData } from '@/types';

interface SiteHeaderProps {
  onOpenLeaderboard: () => void;
  onOpenAbout: () => void;
  onOpenLeader?: () => void;
  featuredLeader?: LightMarkerData;
  opacity: number;
}

export default function SiteHeader({
  onOpenLeaderboard,
  onOpenAbout,
  onOpenLeader,
  featuredLeader,
  opacity,
}: SiteHeaderProps) {
  return (
    <header
      id="site-header"
      className="fixed top-0 left-0 right-0 z-30 transition-all duration-1000 px-6 py-5 md:px-12 md:py-7 flex items-center justify-between pointer-events-none"
      style={{
        opacity,
        transform: `translateY(${(1 - opacity) * -12}px)`,
      }}
    >
      {/* Brand Identity */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-white/[0.03] border border-white/10 shadow-[0_0_12px_rgba(255,200,87,0.2)]">
          <div className="w-1.5 h-1.5 rounded-full bg-[#FFC857] shadow-[0_0_6px_#FFC857]" />
          <div
            className="absolute inset-0 rounded-full border border-[#7DD3FC]/25 animate-spin"
            style={{ animationDuration: '20s' }}
          />
        </div>
        <span className="text-xs md:text-sm font-semibold tracking-[0.25em] text-[#F5F7FA] uppercase font-mono">
          Global Digital Monument
        </span>
      </div>

      {/* Subtle Navigation Actions */}
      <div className="flex items-center gap-4 sm:gap-6 pointer-events-auto text-xs uppercase tracking-widest font-mono">
        {featuredLeader && onOpenLeader && (
          <button
            id="btn-world-leader-spotlight"
            onClick={onOpenLeader}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#FFC857]/[0.08] hover:bg-[#FFC857]/20 border border-[#FFC857]/30 hover:border-[#FFC857] text-[#FFC857] transition-all cursor-pointer shadow-[0_0_15px_rgba(255,200,87,0.12)] group"
            title={`World Leader: ${featuredLeader.name} (#1) — ₹${featuredLeader.amount.toLocaleString()}`}
            aria-label={`World Leader spotlight: ${featuredLeader.name}, rank #1, ₹${featuredLeader.amount.toLocaleString()}`}
          >
            <Crown className="w-3.5 h-3.5 text-[#FFC857] animate-pulse shrink-0" />
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#FFC857]/20 text-[#FFC857] font-semibold">
              #1
            </span>
            <span className="text-[11px] tracking-wider text-[#F5F7FA] font-medium max-w-[90px] sm:max-w-[140px] truncate group-hover:text-[#FFC857]">
              {featuredLeader.name}
            </span>
            <span className="hidden xs:inline-block text-[10px] sm:text-[11px] font-mono font-semibold text-[#FFC857]">
              ₹{featuredLeader.amount.toLocaleString()}
            </span>
          </button>
        )}

        <button
          id="btn-nav-leaderboard"
          onClick={onOpenLeaderboard}
          className="text-[#8993A7] hover:text-[#F5F7FA] transition-colors cursor-pointer py-1"
        >
          Leaderboard
        </button>

        <button
          id="btn-nav-about"
          onClick={onOpenAbout}
          className="text-[#8993A7]/70 hover:text-[#F5F7FA] transition-colors cursor-pointer py-1"
        >
          About
        </button>
      </div>
    </header>
  );
}

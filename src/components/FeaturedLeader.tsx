'use client';

import React from 'react';
import { Crown, Navigation, Sparkles } from 'lucide-react';
import { LightMarkerData } from '@/types';

interface FeaturedLeaderProps {
  leader: LightMarkerData;
  onFocusLeader: (leader: LightMarkerData) => void;
  opacity: number;
}

export default function FeaturedLeader({
  leader,
  onFocusLeader,
  opacity,
}: FeaturedLeaderProps) {
  return (
    <div
      id="featured-leader-card"
      className="fixed bottom-24 right-6 md:right-12 z-20 pointer-events-auto transition-all duration-1000 max-w-xs w-full"
      style={{
        opacity,
        transform: `translateY(${(1 - opacity) * 16}px)`,
      }}
    >
      <div className="p-4 sm:p-5 rounded-2xl glass-panel-gold relative overflow-hidden group">
        {/* Subtle corner light flare */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#FFC857]/15 to-transparent rounded-bl-full pointer-events-none" />

        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-[#FFC857]" />
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#FFC857] font-medium">
              Current World Leader
            </span>
          </div>
          <span className="text-[9px] font-mono text-[#8993A7] uppercase px-1.5 py-0.5 rounded bg-white/[0.04]">
            Demo
          </span>
        </div>

        <div className="flex items-baseline justify-between mb-1">
          <h2 className="text-base sm:text-lg font-medium text-[#F5F7FA] tracking-tight">
            {leader.name}
          </h2>
          <span className="text-sm sm:text-base font-mono font-semibold text-[#FFC857]">
            ${leader.amount.toLocaleString()}
          </span>
        </div>

        <div className="text-[11px] text-[#8993A7] flex items-center justify-between mb-3 font-mono">
          <span>{leader.city}, {leader.country}</span>
          <span className="text-[#FFC857]/90 text-[10px] font-medium">
            #1 — THE BRIGHTEST LIGHT
          </span>
        </div>

        <p className="text-[11px] text-[#8993A7]/90 italic font-light line-clamp-2 mb-3.5 border-l border-[#FFC857]/30 pl-2">
          &ldquo;{leader.message}&rdquo;
        </p>

        <button
          onClick={() => onFocusLeader(leader)}
          className="w-full py-2 px-3 rounded-lg bg-white/[0.06] hover:bg-[#FFC857]/15 border border-white/10 hover:border-[#FFC857]/30 text-[11px] uppercase tracking-wider text-[#F5F7FA] hover:text-[#FFC857] transition-all duration-300 flex items-center justify-center gap-1.5"
        >
          <Navigation className="w-3 h-3 text-[#FFC857]" />
          <span>Fly to Light on Globe</span>
        </button>
      </div>
    </div>
  );
}

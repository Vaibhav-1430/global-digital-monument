'use client';

import React, { useEffect, useState } from 'react';
import { Crown, Sparkles, X, Navigation, ArrowUpRight } from 'lucide-react';
import { LightMarkerData } from '@/types';

interface WorldLeaderTakeoverProps {
  newLeader: LightMarkerData;
  previousLeader?: LightMarkerData | null;
  onDismiss: () => void;
  onFlyToLeader: (leader: LightMarkerData) => void;
}

export default function WorldLeaderTakeover({
  newLeader,
  previousLeader,
  onDismiss,
  onFlyToLeader,
}: WorldLeaderTakeoverProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in gracefully
    const tIn = setTimeout(() => setIsVisible(true), 50);

    // Auto-dismiss after 10 seconds
    const tOut = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 400);
    }, 10000);

    // Escape key dismisses
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsVisible(false);
        setTimeout(onDismiss, 300);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(tIn);
      clearTimeout(tOut);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onDismiss]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <>
      {/* Restrained Golden Atmospheric Perimeter Glow (Non-blocking, respects globe interaction) */}
      <div
        className="fixed inset-0 pointer-events-none z-30 transition-opacity duration-1000"
        style={{
          opacity: isVisible ? 1 : 0,
          background: 'radial-gradient(circle at 50% 30%, rgba(255, 200, 87, 0.08) 0%, rgba(255, 200, 87, 0.02) 40%, transparent 70%)',
        }}
      />

      {/* Floating Cinematic Takeover Celebration Toast/Card */}
      <div
        id="world-leader-takeover-banner"
        className={`fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[calc(100%-2rem)] transition-all duration-700 pointer-events-auto ${
          isVisible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 -translate-y-4 scale-95'
        }`}
      >
        <div className="relative p-5 sm:p-6 rounded-3xl bg-[#030407]/90 border border-[#FFC857]/40 shadow-[0_0_50px_rgba(255,200,87,0.22)] backdrop-blur-xl overflow-hidden">
          {/* Subtle warm golden accent flare in corner */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#FFC857]/20 via-[#FFC857]/5 to-transparent pointer-events-none" />

          {/* Top Row: Crown + Category + Dismiss */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#FFC857]/20 border border-[#FFC857]/40 flex items-center justify-center text-[#FFC857] shadow-[0_0_12px_#FFC857]">
                <Crown className="w-4 h-4 text-[#FFC857]" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#FFC857] font-semibold">
                World Leader Shift
              </span>
            </div>

            <button
              id="btn-dismiss-takeover"
              onClick={handleClose}
              className="p-1.5 rounded-full text-[#8993A7] hover:text-[#F5F7FA] hover:bg-white/10 transition-colors"
              aria-label="Dismiss world leader announcement"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Heading & Supporting Text */}
          <h2 className="text-lg sm:text-xl font-light text-[#F5F7FA] tracking-tight mb-1">
            A NEW LIGHT LEADS THE WORLD.
          </h2>
          <p className="text-xs text-[#8993A7] mb-4">
            A new brightest light has emerged.
          </p>

          {/* Contributor Card Details */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 mb-4 flex items-center justify-between">
            <div className="min-w-0 pr-3">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FFC857] text-[#030407]">
                  #1 LEADER
                </span>
                <h3 className="text-sm sm:text-base font-semibold text-[#F5F7FA] truncate">
                  {newLeader.name}
                </h3>
              </div>
              <span className="text-[11px] text-[#8993A7] font-mono block truncate">
                {newLeader.city ? `${newLeader.city}, ` : ''}{newLeader.country}
              </span>
            </div>

            <div className="text-right shrink-0">
              <span className="text-base sm:text-lg font-mono font-bold text-[#FFC857] block">
                ₹{newLeader.amount.toLocaleString()}
              </span>
              <span className="text-[9px] font-mono text-[#8993A7] uppercase">
                Highest Beacon
              </span>
            </div>
          </div>

          {/* Previous leader transition note */}
          {previousLeader && previousLeader.id !== newLeader.id && (
            <div className="mb-4 text-[11px] text-[#8993A7] font-mono flex items-center justify-between px-1">
              <span>
                Previous #1: <span className="text-[#F5F7FA]">{previousLeader.name}</span> (₹{previousLeader.amount.toLocaleString()})
              </span>
              <span className="text-slate-300">Now #2</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              id="btn-takeover-view-globe"
              onClick={() => {
                onFlyToLeader(newLeader);
                handleClose();
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#FFC857] hover:bg-[#ffe394] text-[#030407] font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(255,200,87,0.3)]"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>View On Globe</span>
            </button>
            <button
              id="btn-takeover-skip"
              onClick={handleClose}
              className="py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/10 text-xs text-[#8993A7] hover:text-[#F5F7FA] font-mono uppercase tracking-wider transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

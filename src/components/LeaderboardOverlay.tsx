'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Trophy, Crown, Medal, Navigation, Search, Sparkles, MapPin, ShieldAlert } from 'lucide-react';
import { LightMarkerData } from '@/types';
import { rankContributors } from '@/utils/ranking';

interface LeaderboardOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  markers: LightMarkerData[];
  onSelectAndFlyTo: (marker: LightMarkerData) => void;
}

export default function LeaderboardOverlay({
  isOpen,
  onClose,
  markers,
  onSelectAndFlyTo,
}: LeaderboardOverlayProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation: Escape key closes overlay
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Authoritative ranking based on contribution amount with deterministic tie-breaking
  const sorted = rankContributors(markers);
  const topThree = sorted.slice(0, 3);
  const remaining = sorted.slice(3);

  const filteredRemaining = remaining.filter((m) => {
    const q = searchTerm.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.city && m.city.toLowerCase().includes(q)) ||
      m.country.toLowerCase().includes(q)
    );
  });

  return (
    <div
      id="modal-leaderboard-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 pointer-events-auto select-none"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-[#030407]/95 border border-white/10 overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.95)] backdrop-blur-xl"
      >
        {/* Top Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFC857]/15 border border-[#FFC857]/30 flex items-center justify-center text-[#FFC857] shadow-[0_0_15px_rgba(255,200,87,0.15)]">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="leaderboard-title" className="text-xl font-light text-[#F5F7FA] tracking-tight">
                  THE BRIGHTEST LIGHTS
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-[#8993A7] uppercase">
                  Demo Data
                </span>
              </div>
              <p className="text-xs text-[#8993A7] mt-0.5">
                People who have helped our world shine.
              </p>
            </div>
          </div>

          <button
            id="btn-close-leaderboard"
            onClick={onClose}
            className="p-2 rounded-full text-[#8993A7] hover:text-[#F5F7FA] hover:bg-white/10 transition-colors focus:outline-none focus:ring-1 focus:ring-[#FFC857]"
            aria-label="Close leaderboard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {sorted.length === 0 ? (
            /* Graceful Empty State */
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto text-[#FFC857]">
                <Sparkles className="w-6 h-6 opacity-60" />
              </div>
              <h4 className="text-base font-light text-[#F5F7FA]">No lights have been ignited yet</h4>
              <p className="text-xs text-[#8993A7] max-w-xs mx-auto">
                Be the very first contributor to place a permanent glowing beacon on our world.
              </p>
            </div>
          ) : (
            <>
              {/* Podium Display (Dynamically adapts to 1, 2, or 3 contributors) */}
              <div
                className={`grid gap-3 ${
                  topThree.length === 1
                    ? 'grid-cols-1 max-w-sm mx-auto'
                    : topThree.length === 2
                    ? 'grid-cols-1 sm:grid-cols-2 max-w-lg mx-auto'
                    : 'grid-cols-1 sm:grid-cols-3'
                }`}
              >
                {/* #2 Silver (shown on left on sm screens if 3 contributors) */}
                {topThree[1] && (
                  <div
                    onClick={() => {
                      onSelectAndFlyTo(topThree[1]);
                      onClose();
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onSelectAndFlyTo(topThree[1]);
                        onClose();
                      }
                    }}
                    className="order-2 sm:order-1 p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-slate-300/40 cursor-pointer transition-all hover:-translate-y-1 group relative overflow-hidden focus:outline-none focus:ring-1 focus:ring-slate-300"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-full bg-slate-300/20 text-slate-200 flex items-center justify-center text-xs font-bold font-mono">
                        #2
                      </div>
                      <Medal className="w-4 h-4 text-slate-300" />
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-300/80 mb-0.5">
                      Second Brightest
                    </div>
                    <h4 className="text-sm font-medium text-[#F5F7FA] truncate group-hover:text-slate-200">
                      {topThree[1].name}
                    </h4>
                    <div className="text-xs font-mono font-semibold text-slate-200 my-1">
                      ₹{topThree[1].amount.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-[#8993A7] truncate mb-2">
                      {topThree[1].city ? `${topThree[1].city}, ` : ''}{topThree[1].country}
                    </div>
                    <div className="text-[10px] text-slate-300 flex items-center gap-1 font-mono">
                      <Navigation className="w-2.5 h-2.5" />
                      <span>View Light</span>
                    </div>
                  </div>
                )}

                {/* #1 Gold Crown */}
                {topThree[0] && (
                  <div
                    onClick={() => {
                      onSelectAndFlyTo(topThree[0]);
                      onClose();
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onSelectAndFlyTo(topThree[0]);
                        onClose();
                      }
                    }}
                    className={`${
                      topThree.length === 3 ? 'order-1 sm:order-2' : 'order-1'
                    } p-5 rounded-2xl bg-[#FFC857]/[0.08] border border-[#FFC857]/40 hover:border-[#FFC857] cursor-pointer transition-all hover:-translate-y-1.5 shadow-[0_0_25px_rgba(255,200,87,0.18)] group relative overflow-hidden focus:outline-none focus:ring-1 focus:ring-[#FFC857]`}
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#FFC857]/20 to-transparent pointer-events-none" />
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-full bg-[#FFC857]/30 text-[#FFC857] flex items-center justify-center text-sm font-bold font-mono shadow-[0_0_12px_#FFC857]">
                        #1
                      </div>
                      <Crown className="w-5 h-5 text-[#FFC857] animate-pulse" />
                    </div>
                    <div className="text-[9px] font-mono uppercase tracking-widest text-[#FFC857] mb-0.5 font-semibold">
                      World Leader
                    </div>
                    <h4 className="text-base font-semibold text-[#F5F7FA] truncate group-hover:text-[#FFC857]">
                      {topThree[0].name}
                    </h4>
                    <div className="text-sm font-mono font-bold text-[#FFC857] my-1">
                      ₹{topThree[0].amount.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-[#8993A7] truncate mb-2">
                      {topThree[0].city ? `${topThree[0].city}, ` : ''}{topThree[0].country}
                    </div>
                    <div className="text-[10px] text-[#FFC857] flex items-center gap-1 font-mono font-medium">
                      <Navigation className="w-3 h-3" />
                      <span>View on Globe ↗</span>
                    </div>
                  </div>
                )}

                {/* #3 Bronze */}
                {topThree[2] && (
                  <div
                    onClick={() => {
                      onSelectAndFlyTo(topThree[2]);
                      onClose();
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onSelectAndFlyTo(topThree[2]);
                        onClose();
                      }
                    }}
                    className="order-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-700/40 cursor-pointer transition-all hover:-translate-y-1 group relative overflow-hidden focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-full bg-amber-700/20 text-amber-400 flex items-center justify-center text-xs font-bold font-mono">
                        #3
                      </div>
                      <Medal className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400/80 mb-0.5">
                      Third Brightest
                    </div>
                    <h4 className="text-sm font-medium text-[#F5F7FA] truncate group-hover:text-amber-400">
                      {topThree[2].name}
                    </h4>
                    <div className="text-xs font-mono font-semibold text-amber-400 my-1">
                      ₹{topThree[2].amount.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-[#8993A7] truncate mb-2">
                      {topThree[2].city ? `${topThree[2].city}, ` : ''}{topThree[2].country}
                    </div>
                    <div className="text-[10px] text-amber-400 flex items-center gap-1 font-mono">
                      <Navigation className="w-2.5 h-2.5" />
                      <span>View Light</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Search bar (only show if there are remaining contributors) */}
              {remaining.length > 0 && (
                <div className="relative">
                  <Search className="w-4 h-4 text-[#8993A7] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search contributors or locations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] text-sm text-[#F5F7FA] border border-white/10 focus:outline-none focus:border-[#FFC857]/50 placeholder:text-[#8993A7]/50"
                  />
                </div>
              )}

              {/* Ranked List for #4 onwards */}
              {filteredRemaining.length > 0 && (
                <div className="space-y-1.5">
                  {filteredRemaining.map((entry) => (
                    <div
                      key={entry.id}
                      onClick={() => {
                        onSelectAndFlyTo(entry);
                        onClose();
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          onSelectAndFlyTo(entry);
                          onClose();
                        }
                      }}
                      className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] hover:border-white/20 transition-all flex items-center justify-between cursor-pointer group focus:outline-none focus:ring-1 focus:ring-[#FFC857]/50"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className="w-7 text-center text-xs font-mono text-[#8993A7] font-medium shrink-0">
                          #{entry.rank}
                        </span>
                        <div className="min-w-0">
                          <h5 className="text-xs sm:text-sm font-medium text-[#F5F7FA] group-hover:text-[#FFC857] transition-colors truncate">
                            {entry.name}
                          </h5>
                          <div className="flex items-center gap-1 text-[11px] text-[#8993A7] truncate">
                            <MapPin className="w-3 h-3 text-[#7DD3FC] shrink-0" />
                            <span className="truncate">
                              {entry.city ? `${entry.city}, ` : ''}{entry.country}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span className="text-xs sm:text-sm font-mono font-semibold text-[#F5F7FA]">
                            ₹{entry.amount.toLocaleString()}
                          </span>
                          <span className="block text-[9px] text-[#8993A7] font-mono">
                            {entry.timestamp}
                          </span>
                        </div>
                        <Navigation className="w-3.5 h-3.5 text-[#8993A7] group-hover:text-[#FFC857] transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info note */}
        <div className="p-4 px-6 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#8993A7] font-mono">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-[#FFC857]" />
            <span>Simulated global leaderboard for demonstration.</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#F5F7FA] hover:text-[#FFC857] transition-colors uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-[#FFC857]"
          >
            Back to Earth
          </button>
        </div>
      </div>
    </div>
  );
}

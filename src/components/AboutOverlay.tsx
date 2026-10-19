'use client';

import React from 'react';
import Link from 'next/link';
import { X, Sparkles, Heart, Globe2, ShieldCheck, Compass, ArrowRight } from 'lucide-react';

interface AboutOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutOverlay({ isOpen, onClose }: AboutOverlayProps) {
  if (!isOpen) return null;

  return (
    <div
      id="modal-about-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-lg animate-in fade-in duration-300"
    >
      <div className="relative w-full max-w-xl rounded-3xl glass-modal border border-white/15 overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.9)] p-6 sm:p-8">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#7DD3FC]/15 border border-[#7DD3FC]/30 flex items-center justify-center text-[#7DD3FC]">
              <Globe2 className="w-4 h-4" />
            </div>
            <span className="text-xs uppercase tracking-[0.25em] text-[#8993A7] font-mono">
              About The Monument
            </span>
          </div>

          <button
            id="btn-close-about-icon"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8993A7] hover:text-[#F5F7FA] hover:bg-white/10 transition-colors"
            aria-label="Close about dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-light text-[#F5F7FA] tracking-tight leading-snug uppercase">
              ONE PLANET. MANY STORIES.
            </h2>
          </div>

          <p className="text-sm sm:text-base text-[#8993A7] font-light leading-relaxed">
            Global Digital Monument is a shared digital space where people leave their light on Earth. Every contribution becomes part of a growing monument to human connection, individuality, and our shared home.
          </p>

          {/* Three Core Principles */}
          <div className="space-y-3.5 pt-2">
            <h3 className="text-xs uppercase font-mono tracking-widest text-[#F5F7FA]">
              Our Guiding Principles
            </h3>

            <div className="grid grid-cols-1 gap-3">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#FFC857]/15 flex items-center justify-center text-[#FFC857] shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-[#F5F7FA] mb-0.5">
                    Every light has a place.
                  </h4>
                  <p className="text-xs text-[#8993A7] leading-relaxed">
                    No matter how small or large the gift, every light claims its unique geographic presence in space and time.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#7DD3FC]/15 flex items-center justify-center text-[#7DD3FC] shrink-0 mt-0.5">
                  <Heart className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-[#F5F7FA] mb-0.5">
                    Every story deserves respect.
                  </h4>
                  <p className="text-xs text-[#8993A7] leading-relaxed">
                    Behind every point of light is a human dedication, a memory, a hope, or a pledge for future generations.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-400/15 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Compass className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-[#F5F7FA] mb-0.5">
                    One planet connects us all.
                  </h4>
                  <p className="text-xs text-[#8993A7] leading-relaxed">
                    Seen from outer space, national borders dissolve into oceans, landmasses, and atmospheres. We share one world.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Trust and Policy Navigation Links */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <span className="text-[#8993A7]">Detailed Information:</span>
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              <Link href="/about" onClick={onClose} className="text-[#FFC857] hover:underline flex items-center gap-1 font-semibold">
                <span>Story & Mission</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <Link href="/contribution-policy" onClick={onClose} className="text-[#8993A7] hover:text-[#F5F7FA]">
                Policy
              </Link>
              <Link href="/refund-policy" onClick={onClose} className="text-[#8993A7] hover:text-[#F5F7FA]">
                Refunds
              </Link>
              <Link href="/contact" onClick={onClose} className="text-[#8993A7] hover:text-[#F5F7FA]">
                Contact
              </Link>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-white/[0.06]">
            <span className="text-[10px] font-mono text-[#8993A7] uppercase tracking-wider">
              Phase 6C — Verified Sandbox Flow
            </span>
            <button
              id="btn-return-globe"
              onClick={onClose}
              className="btn-gold px-5 py-2 rounded-full text-xs uppercase tracking-wider font-semibold"
            >
              Return to Globe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

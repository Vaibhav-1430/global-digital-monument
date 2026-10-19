'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface HeroContentProps {
  onAddLightClick: () => void;
  opacity: number;
  totalLights: number;
}

export default function HeroContent({
  onAddLightClick,
  opacity,
  totalLights,
}: HeroContentProps) {
  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 sm:p-10 md:p-16 transition-all duration-1000"
      style={{
        opacity,
        transform: `translateY(${(1 - opacity) * 12}px)`,
      }}
    >
      {/* Top spacer */}
      <div className="h-12" />

      {/* Main hero typography - minimalist, refined, compact */}
      <div className="max-w-md pointer-events-auto">
        <div className="text-[11px] font-mono tracking-[0.25em] text-[#7DD3FC]/80 uppercase mb-3">
          ONE PLANET. MILLIONS OF STORIES.
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-[#F5F7FA] leading-[1.1] mb-2">
          LEAVE YOUR LIGHT <br />
          <span className="font-medium text-[#FFC857]">
            ON EARTH.
          </span>
        </h1>

        <p className="text-sm md:text-base text-[#8993A7] font-light tracking-wide mb-6">
          Every light tells a story.
        </p>

        <div>
          <button
            id="btn-add-your-light"
            onClick={onAddLightClick}
            className="px-6 py-3 rounded-full btn-gold text-xs font-semibold tracking-widest flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <span>ADD YOUR LIGHT ✦</span>
          </button>
        </div>
      </div>

      {/* Subtle, tiny demo contribution count at the bottom */}
      <div className="pointer-events-auto">
        <div className="inline-flex items-center gap-2 text-[11px] font-mono text-[#8993A7]/70">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FFC857]" />
          <span>{totalLights.toLocaleString()} lights glowing (Demo)</span>
        </div>
      </div>
    </div>
  );
}

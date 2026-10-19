'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, Globe2, X, ArrowRight } from 'lucide-react';
import { LightMarkerData } from '@/types';

interface LightIgnitionProps {
  marker: LightMarkerData | null;
  isActive: boolean;
  onDismiss: () => void;
}

export default function LightIgnition({
  marker,
  isActive,
  onDismiss,
}: LightIgnitionProps) {
  const [stage, setStage] = useState<'approaching' | 'igniting' | 'pulsing' | 'confirmed'>('approaching');

  useEffect(() => {
    if (!isActive || !marker) {
      setStage('approaching');
      return;
    }

    // Sequence stages:
    // 0-1200ms: Camera approaching
    // 1200-2400ms: Tiny golden ember blooming
    // 2400-3600ms: Soft energy pulse expand + disperse
    // 3600ms+: Confirmation text & celebratory glow

    const t1 = setTimeout(() => setStage('igniting'), 1200);
    const t2 = setTimeout(() => setStage('pulsing'), 2400);
    const t3 = setTimeout(() => setStage('confirmed'), 3400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isActive, marker]);

  if (!isActive || !marker) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center animate-in fade-in duration-500">
      {/* Dimming background overlay */}
      <div
        className="absolute inset-0 bg-[#030407]/60 backdrop-blur-[2px] transition-opacity duration-1000"
        onClick={onDismiss}
      />

      {/* Center cinematic ignition beacon effect */}
      <div className="relative pointer-events-none flex items-center justify-center">
        {/* Stage 1: Approaching faint beacon */}
        {stage === 'approaching' && (
          <div className="w-4 h-4 rounded-full bg-[#FFE89E] shadow-[0_0_20px_#FFC857] animate-ping" />
        )}

        {/* Stage 2 & 3: Blooming beacon & Expanding shockwave rings */}
        {(stage === 'igniting' || stage === 'pulsing' || stage === 'confirmed') && (
          <div className="relative flex items-center justify-center">
            {/* Soft energy pulse ring 1 */}
            <div className="absolute w-48 h-48 rounded-full border border-[#FFC857]/40 animate-ping" style={{ animationDuration: '2.5s' }} />

            {/* Soft energy pulse ring 2 */}
            <div className="absolute w-72 h-72 rounded-full border border-[#7DD3FC]/25 animate-ping" style={{ animationDuration: '3.2s' }} />

            {/* Golden Bloom Corona */}
            <div
              className="w-20 h-20 rounded-full transition-all duration-1000"
              style={{
                background: 'radial-gradient(circle, #FFFFFF 0%, #FFEA9F 30%, #FFC857 60%, rgba(255,200,87,0) 80%)',
                boxShadow: '0 0 60px 20px rgba(255, 200, 87, 0.45)',
                transform: stage === 'pulsing' ? 'scale(1.4)' : 'scale(1)',
              }}
            />

            {/* Radiant particles dispersion */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, idx) => (
                <div
                  key={idx}
                  className="absolute w-1.5 h-1.5 rounded-full bg-[#FFE89E] shadow-[0_0_8px_#FFC857] transition-all duration-1000"
                  style={{
                    transform:
                      stage === 'pulsing' || stage === 'confirmed'
                        ? `rotate(${angle}deg) translate(65px) scale(${idx % 2 === 0 ? 1 : 0.6})`
                        : 'rotate(0deg) translate(0px) scale(0)',
                    opacity: stage === 'confirmed' ? 0.7 : 1,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation text panel (Settles after ignition bloom) */}
      {stage === 'confirmed' && (
        <div className="absolute bottom-16 sm:bottom-20 max-w-md w-full px-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pointer-events-auto">
          <div className="p-6 rounded-2xl glass-panel-gold border border-[#FFC857]/30 text-center relative overflow-hidden shadow-2xl">
            {/* Top Close icon */}
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 p-1 rounded-full text-[#8993A7] hover:text-[#F5F7FA] hover:bg-white/10"
              aria-label="Dismiss ignition panel"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 mx-auto mb-3.5 rounded-full bg-[#FFC857]/20 border border-[#FFC857]/40 flex items-center justify-center text-[#FFC857]">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-white/[0.04] text-[10px] font-mono tracking-[0.25em] text-[#7DD3FC] uppercase mb-2">
              New Beacon Ignited
            </div>

            <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight mb-1">
              YOUR LIGHT IS NOW PART OF OUR WORLD.
            </h2>

            <p className="text-xs sm:text-sm text-[#8993A7] font-light mb-4">
              One more light. One shared planet.
            </p>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-[#F5F7FA] mb-5 font-mono">
              <span className="text-[#FFC857] font-semibold">{marker.name}</span>
              <span className="text-[#8993A7]"> • </span>
              <span>{marker.city}, {marker.country}</span>
              <span className="text-[#8993A7]"> • </span>
              <span className="text-[#7DD3FC]">₹{marker.amount}</span>
            </div>

            <button
              onClick={onDismiss}
              id="btn-dismiss-ignition"
              className="w-full btn-gold py-2.5 px-6 rounded-full text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <span>RETURN TO EARTH</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

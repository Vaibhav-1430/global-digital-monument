'use client';

import React from 'react';

interface AtmosphericRimProps {
  opacity: number;
  scale?: number;
}

export default function AtmosphericRim({ opacity, scale = 1 }: AtmosphericRimProps) {
  // Only active during the early reveal phase
  if (opacity <= 0.05) return null;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-1000 z-1"
      style={{ opacity }}
    >
      {/* Soft celestial atmospheric aura during reveal */}
      <div
        className="w-[62vh] h-[62vh] max-w-[660px] max-h-[660px] rounded-full transition-transform duration-1000 pointer-events-none"
        style={{
          transform: `scale(${scale})`,
          background: 'radial-gradient(circle, rgba(125, 211, 252, 0) 60%, rgba(125, 211, 252, 0.15) 75%, rgba(56, 189, 248, 0) 100%)',
          filter: 'blur(16px)',
        }}
      />
    </div>
  );
}

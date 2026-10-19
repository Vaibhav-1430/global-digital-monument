'use client';

import React from 'react';
import { X, Sparkles, MapPin, Calendar, Heart, Share2, Crown } from 'lucide-react';
import { LightMarkerData } from '@/types';

interface SelectedMarkerCardProps {
  marker: LightMarkerData;
  onClose: () => void;
  onFlyTo?: () => void;
}

export default function SelectedMarkerCard({
  marker,
  onClose,
  onFlyTo,
}: SelectedMarkerCardProps) {
  const [copied, setCopied] = React.useState(false);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="selected-marker-modal"
      className="fixed bottom-24 left-6 md:left-12 z-40 max-w-sm w-full transition-all duration-500 animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="p-5 rounded-2xl glass-panel relative border border-white/15 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FFC857]/15 border border-[#FFC857]/30 flex items-center justify-center text-[#FFC857]">
              {marker.isTopContributor ? <Crown className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-[#F5F7FA]">
                  {marker.isAnonymous ? 'Anonymous Contributor' : marker.name}
                </h3>
                {marker.rank && marker.rank <= 3 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#FFC857]/20 text-[#FFC857]">
                    #{marker.rank}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[#8993A7] font-mono">
                <MapPin className="w-3 h-3 text-[#7DD3FC]" />
                <span>
                  {marker.city ? `${marker.city}, ` : ''}{marker.country}
                  {marker.isApproximate ? ' (approximate)' : ''}
                </span>
              </div>
            </div>
          </div>

          <button
            id="btn-close-marker"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-[#8993A7] hover:text-[#F5F7FA] transition-colors"
            aria-label="Close details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount & dedication */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-3">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-[#8993A7] font-mono">
              Demo Contribution
            </span>
            <span className="text-sm font-mono font-bold text-[#FFC857]">
              ₹{marker.amount.toLocaleString()}
            </span>
          </div>
          {marker.message && (
            <p className="text-xs text-[#F5F7FA]/90 italic font-light leading-relaxed">
              &ldquo;{marker.message}&rdquo;
            </p>
          )}
        </div>

        {/* Coordinates & Metadata */}
        <div className="flex items-center justify-between text-[10px] text-[#8993A7] font-mono mb-4 pt-1 border-t border-white/[0.05]">
          <span>
            {marker.lat >= 0 ? `${marker.lat.toFixed(2)}°N` : `${Math.abs(marker.lat).toFixed(2)}°S`},{' '}
            {marker.lng >= 0 ? `${marker.lng.toFixed(2)}°E` : `${Math.abs(marker.lng).toFixed(2)}°W`}
          </span>
          <span>{marker.timestamp}</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {onFlyTo && (
            <button
              onClick={onFlyTo}
              className="flex-1 py-2 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-[#F5F7FA] font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FFC857]" />
              <span>Center Light</span>
            </button>
          )}
          <button
            onClick={handleShare}
            className="py-2 px-3 rounded-lg bg-white/[0.05] hover:bg-white/10 text-xs text-[#8993A7] hover:text-[#F5F7FA] transition-colors flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copied ? 'Link Copied!' : 'Share'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

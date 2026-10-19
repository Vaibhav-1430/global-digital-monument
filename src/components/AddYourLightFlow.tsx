'use client';

import React, { useState, useEffect, useRef, useId } from 'react';
import {
  X,
  Sparkles,
  MapPin,
  Compass,
  Navigation,
  Upload,
  ShieldCheck,
  Check,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Search,
  Globe2
} from 'lucide-react';
import { LightMarkerData } from '@/types';

interface AddYourLightFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onStartPickingOnGlobe: () => void;
  pickedCoordinates: { lat: number; lng: number } | null;
  onConfirmContribution: (newMarker: LightMarkerData) => void;
}

const PRESET_AMOUNTS = [10, 25, 35, 55, 100];

// Defined representative points for countries and regions (clearly labelled as approximate)
const COUNTRIES_AND_REGIONS = [
  { name: 'India', region: 'South Asia', lat: 20.5937, lng: 78.9629 },
  { name: 'United States', region: 'North America', lat: 37.0902, lng: -95.7129 },
  { name: 'United Kingdom', region: 'Europe', lat: 55.3781, lng: -3.4360 },
  { name: 'Japan', region: 'East Asia', lat: 36.2048, lng: 138.2529 },
  { name: 'Australia', region: 'Oceania', lat: -25.2744, lng: 133.7751 },
  { name: 'Brazil', region: 'South America', lat: -14.2350, lng: -51.9253 },
  { name: 'Germany', region: 'Europe', lat: 51.1657, lng: 10.4515 },
  { name: 'France', region: 'Europe', lat: 46.2276, lng: 2.2137 },
  { name: 'Canada', region: 'North America', lat: 56.1304, lng: -106.3468 },
  { name: 'South Africa', region: 'Africa', lat: -30.5595, lng: 22.9375 },
  { name: 'Singapore', region: 'Southeast Asia', lat: 1.3521, lng: 103.8198 },
  { name: 'United Arab Emirates', region: 'Middle East', lat: 23.4241, lng: 53.8478 },
  { name: 'Kenya', region: 'East Africa', lat: -0.0236, lng: 37.9062 },
  { name: 'Argentina', region: 'South America', lat: -38.4161, lng: -63.6167 },
  { name: 'Switzerland', region: 'Europe', lat: 46.8182, lng: 8.2275 },
  { name: 'Egypt', region: 'North Africa', lat: 26.8206, lng: 30.8025 },
  { name: 'Iceland', region: 'Nordics', lat: 64.9631, lng: -19.0208 },
  { name: 'South Korea', region: 'East Asia', lat: 35.9078, lng: 127.7669 },
  { name: 'Sweden', region: 'Scandinavia', lat: 60.1282, lng: 18.6435 },
  { name: 'New Zealand', region: 'Oceania', lat: -40.9006, lng: 174.8860 },
];

/**
 * Dynamically loads the official Razorpay Checkout SDK script if not already present.
 */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function AddYourLightFlow({
  isOpen,
  onClose,
  onStartPickingOnGlobe,
  pickedCoordinates,
  onConfirmContribution,
}: AddYourLightFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [amount, setAmount] = useState<number>(25);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [customAmountError, setCustomAmountError] = useState<string | null>(null);

  // Location selection state
  const [locationMode, setLocationMode] = useState<'country' | 'globe' | 'device'>('country');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES_AND_REGIONS[0]);
  const [countrySearch, setCountrySearch] = useState('');
  const [deviceCoords, setDeviceCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Personalization state
  const [name, setName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [message, setMessage] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Escape key closes flow
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

  // If user picked coordinates on globe, switch mode to globe and step to 2
  useEffect(() => {
    if (pickedCoordinates) {
      setLocationMode('globe');
      setStep(2);
    }
  }, [pickedCoordinates]);

  if (!isOpen) return null;

  // Active contribution calculation
  const parsedCustom = parseFloat(customAmount);
  const currentAmount = customAmount ? (isNaN(parsedCustom) ? 0 : parsedCustom) : amount;
  const isAmountValid = currentAmount > 0 && currentAmount <= 1000000;

  const handleCustomAmountChange = (val: string) => {
    setCustomAmount(val);
    const num = parseFloat(val);
    if (!val) {
      setCustomAmountError(null);
    } else if (isNaN(num) || num <= 0) {
      setCustomAmountError('Please enter a valid amount greater than ₹0');
    } else if (num > 1000000) {
      setCustomAmountError('Maximum demonstration contribution is ₹10,00,000');
    } else {
      setCustomAmountError(null);
    }
  };

  // Request browser geolocation on explicit user click
  const handleRequestDeviceLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        setDeviceCoords({
          lat: Number(latitude.toFixed(4)),
          lng: Number(longitude.toFixed(4)),
        });
        setLocationMode('device');
      },
      (err) => {
        setIsLocating(false);
        setGeoError(err.message || 'Location permission was denied or is currently unavailable.');
      },
      { timeout: 10000 }
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Resolve final active latitude, longitude, and descriptive label
  let activeLat = selectedCountry.lat;
  let activeLng = selectedCountry.lng;
  let locationLabel = `${selectedCountry.name}`;
  let isApproximate = true;

  if (locationMode === 'globe' && pickedCoordinates) {
    activeLat = pickedCoordinates.lat;
    activeLng = pickedCoordinates.lng;
    locationLabel = `Custom Point (${pickedCoordinates.lat.toFixed(2)}°, ${pickedCoordinates.lng.toFixed(2)}°)`;
    isApproximate = false;
  } else if (locationMode === 'device' && deviceCoords) {
    activeLat = deviceCoords.lat;
    activeLng = deviceCoords.lng;
    locationLabel = `Current Location (${deviceCoords.lat.toFixed(2)}°, ${deviceCoords.lng.toFixed(2)}°)`;
    isApproximate = false;
  }

  const handleComplete = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmissionError(null);

    const contributorName = isAnonymous ? 'Anonymous' : (name.trim() || 'A Kind Soul');
    const payload = {
      amount: currentAmount,
      currency: 'INR',
      name: contributorName,
      isAnonymous,
      message: message.trim() || undefined,
      lat: activeLat,
      lng: activeLng,
      isApproximate,
      city: locationMode === 'country' ? selectedCountry.region : 'Earth Coordinates',
      country: locationMode === 'country' ? selectedCountry.name : 'Global',
      photoUrl: photoPreview || undefined,
    };

    try {
      const res = await fetch('/api/contributions/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        setSubmissionError(result.error || 'Failed to initiate contribution.');
        setIsSubmitting(false);
        return;
      }

      if (result.isDemo && result.contribution) {
        // Confirmed demo contribution returned from verified server validation
        onConfirmContribution(result.contribution);
        onClose();
        setTimeout(() => {
          setStep(1);
          setIsSubmitting(false);
        }, 400);
      } else if (!result.isDemo) {
        // Non-demo / sandbox mode: launch Razorpay Checkout modal
        if (result.provider === 'razorpay') {
          if (!result.keyId || !result.orderId) {
            setSubmissionError('Server returned an incomplete checkout session. Please try again.');
            setIsSubmitting(false);
            return;
          }

          const scriptLoaded = await loadRazorpayScript();
          if (!scriptLoaded) {
            setSubmissionError('Failed to load Razorpay Checkout SDK. Please check your network connection.');
            setIsSubmitting(false);
            return;
          }

          const options = {
            key: result.keyId,
            amount: Math.round(result.amount * 100),
            currency: result.currency || 'INR',
            name: 'Global Digital Monument',
            description: payload.message ? `Dedication: ${payload.message.slice(0, 50)}` : 'Leave Your Light on Earth',
            order_id: result.orderId,
            prefill: {
              name: isAnonymous ? 'Anonymous' : (contributorName || 'A Kind Soul'),
            },
            theme: {
              color: '#FFC857',
            },
            modal: {
              ondismiss: () => {
                setIsSubmitting(false);
                setSubmissionError('Checkout cancelled. Your light has not been confirmed.');
              },
            },
            handler: async (response: {
              razorpay_payment_id: string;
              razorpay_order_id: string;
              razorpay_signature: string;
            }) => {
              try {
                setIsSubmitting(true);
                setSubmissionError(null);
                const verifyRes = await fetch('/api/contributions/verify-checkout', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    orderId: response.razorpay_order_id,
                    paymentId: response.razorpay_payment_id,
                    signature: response.razorpay_signature,
                  }),
                });

                const verifyData = await verifyRes.json();
                if (!verifyRes.ok || !verifyData.success || !verifyData.contribution) {
                  throw new Error(verifyData.error || 'Server payment signature verification failed.');
                }

                // Authoritatively verified by server!
                onConfirmContribution(verifyData.contribution);
                onClose();
                setTimeout(() => {
                  setStep(1);
                  setIsSubmitting(false);
                }, 400);
              } catch (verifyErr: any) {
                setSubmissionError(
                  verifyErr.message || 'Payment confirmation failed. If debited, your light will appear shortly via webhook.'
                );
                setIsSubmitting(false);
              }
            },
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.on('payment.failed', (failResp: any) => {
            setIsSubmitting(false);
            setSubmissionError(failResp.error?.description || 'Payment failed. Please try again.');
          });
          rzp.open();
        } else {
          setIsSubmitting(false);
          setSubmissionError(`Payment provider '${result.provider}' checkout is not supported in this view.`);
        }
      }
    } catch {
      // Safe offline/fallback client creation
      const fallbackMarker: LightMarkerData = {
        id: `light-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: contributorName,
        isAnonymous,
        amount: currentAmount,
        city: locationMode === 'country' ? selectedCountry.region : 'Earth Coordinates',
        country: locationMode === 'country' ? selectedCountry.name : 'Global',
        lat: activeLat,
        lng: activeLng,
        message: message.trim() || undefined,
        timestamp: 'Just now',
        photoUrl: photoPreview || undefined,
        isDemo: true,
        isApproximate,
        createdAt: Date.now(),
      };
      onConfirmContribution(fallbackMarker);
      onClose();
      setTimeout(() => {
        setStep(1);
        setIsSubmitting(false);
      }, 400);
    }
  };

  const filteredCountries = COUNTRIES_AND_REGIONS.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.region.toLowerCase().includes(countrySearch.toLowerCase())
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg rounded-3xl glass-modal p-6 sm:p-8 overflow-hidden border border-white/15 shadow-[0_0_80px_rgba(0,0,0,0.9)] max-h-[92vh] flex flex-col justify-between"
      >
        {/* Top close button & progress indicator */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FFC857] shadow-[0_0_8px_#FFC857]" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#8993A7] font-mono">
              Step {step} of 4 — {step === 1 && 'Amount'}
              {step === 2 && 'Location'}
              {step === 3 && 'Personalize'}
              {step === 4 && 'Review'}
            </span>
          </div>

          <button
            id="btn-close-flow"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8993A7] hover:text-[#F5F7FA] hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ================= STEP 1: AMOUNT SELECTION ================= */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in flex-1 overflow-y-auto pr-1">
            <div>
              <h2 id={titleId} className="text-2xl sm:text-3xl font-light text-[#F5F7FA] tracking-tight mb-1">
                ADD YOUR LIGHT
              </h2>
              <p className="text-xs sm:text-sm text-[#8993A7] font-light">
                Every light tells a story.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {PRESET_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  id={`btn-preset-${val}`}
                  onClick={() => {
                    setAmount(val);
                    setCustomAmount('');
                    setCustomAmountError(null);
                  }}
                  className={`py-3.5 rounded-2xl font-mono text-sm sm:text-base font-medium transition-all cursor-pointer ${
                    amount === val && !customAmount
                      ? 'btn-gold shadow-[0_0_20px_rgba(255,200,87,0.35)]'
                      : 'bg-white/[0.04] text-[#F5F7FA] border border-white/10 hover:border-white/25 hover:bg-white/[0.08]'
                  }`}
                >
                  ₹{val}
                </button>
              ))}

              <div className="col-span-3 sm:col-span-1">
                <input
                  type="number"
                  placeholder="Custom ₹"
                  min="1"
                  max="1000000"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  className={`w-full py-3.5 px-3.5 rounded-2xl font-mono text-sm bg-white/[0.04] text-[#F5F7FA] border transition-all placeholder:text-[#8993A7]/50 focus:outline-none ${
                    customAmount
                      ? customAmountError
                        ? 'border-red-400 text-red-300'
                        : 'border-[#FFC857] text-[#FFC857]'
                      : 'border-white/10 focus:border-[#FFC857]/60'
                  }`}
                />
              </div>
            </div>

            {customAmountError && (
              <p className="text-xs text-red-400 font-mono flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{customAmountError}</span>
              </p>
            )}

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-2.5 text-xs text-[#8993A7]">
              <ShieldCheck className="w-4 h-4 text-[#7DD3FC] shrink-0" />
              <span>Simulated demo flow. No real billing info or payment required.</span>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="button"
                id="btn-continue-step-1"
                disabled={!isAmountValid}
                onClick={() => setStep(2)}
                className={`btn-gold px-7 py-3 rounded-full text-xs uppercase tracking-widest font-semibold flex items-center gap-2 cursor-pointer shadow-lg transition-opacity ${
                  !isAmountValid ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <span>CONTINUE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: LOCATION SELECTION ================= */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in flex-1 overflow-y-auto pr-1">
            <div>
              <h2 id={titleId} className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight mb-1">
                WHERE WILL YOUR LIGHT SHINE?
              </h2>
              <p className="text-xs sm:text-sm text-[#8993A7] font-light">
                Anchor your light to our living planet.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Choice 1: Select location on interactive globe */}
              <button
                type="button"
                id="btn-select-globe"
                onClick={() => {
                  setLocationMode('globe');
                  onStartPickingOnGlobe();
                }}
                className={`w-full py-3 px-4 rounded-2xl text-left border flex items-center justify-between transition-all cursor-pointer ${
                  locationMode === 'globe'
                    ? 'border-[#FFC857] bg-[#FFC857]/10 text-[#FFC857]'
                    : 'border-white/10 bg-white/[0.03] text-[#F5F7FA] hover:border-white/25 hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FFC857]/15 border border-[#FFC857]/30 flex items-center justify-center text-[#FFC857] shrink-0">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-medium">Select a location on the interactive globe</div>
                    <div className="text-[11px] text-[#8993A7] font-mono">
                      {pickedCoordinates
                        ? `Selected: ${pickedCoordinates.lat.toFixed(2)}°, ${pickedCoordinates.lng.toFixed(2)}° (precise)`
                        : 'Click anywhere directly on Earth'}
                    </div>
                  </div>
                </div>
                {pickedCoordinates && <Check className="w-4 h-4 text-[#FFC857] shrink-0" />}
              </button>

              {/* Choice 2: Use current location */}
              <div
                className={`w-full p-3.5 rounded-2xl border transition-all ${
                  locationMode === 'device'
                    ? 'border-[#7DD3FC] bg-[#7DD3FC]/10'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#7DD3FC]/15 border border-[#7DD3FC]/30 flex items-center justify-center text-[#7DD3FC] shrink-0">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-medium text-[#F5F7FA]">Use my current location</div>
                      <div className="text-[11px] text-[#8993A7]">
                        Requests browser location once to place your beacon. Never stored permanently.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    id="btn-use-device-location"
                    onClick={handleRequestDeviceLocation}
                    disabled={isLocating}
                    className="ml-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs text-[#7DD3FC] font-medium transition-colors shrink-0 cursor-pointer"
                  >
                    {isLocating ? 'Locating...' : deviceCoords ? 'Update' : 'Locate'}
                  </button>
                </div>
                {deviceCoords && (
                  <div className="mt-2 text-[11px] font-mono text-[#7DD3FC] flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>Coordinates detected: {deviceCoords.lat.toFixed(2)}°, {deviceCoords.lng.toFixed(2)}° (precise)</span>
                  </div>
                )}
                {geoError && (
                  <div className="mt-2 text-xs text-red-400 font-mono flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{geoError}</span>
                  </div>
                )}
              </div>

              {/* Choice 3: Choose a country or region */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  locationMode === 'country'
                    ? 'border-white/25 bg-white/[0.05]'
                    : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-[#8993A7] font-mono flex items-center gap-1.5">
                    <Globe2 className="w-3.5 h-3.5 text-[#FFC857]" />
                    <span>Choose a country or region</span>
                  </span>
                  <span className="text-[10px] text-[#8993A7] font-mono">
                    Representative point (approximate)
                  </span>
                </div>

                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-[#8993A7] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search country..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="w-full py-1.5 pl-8 pr-3 rounded-lg bg-black/40 text-xs text-[#F5F7FA] border border-white/10 focus:outline-none focus:border-[#FFC857]"
                  />
                </div>

                <select
                  id="select-country"
                  value={selectedCountry.name}
                  onChange={(e) => {
                    const found = COUNTRIES_AND_REGIONS.find((c) => c.name === e.target.value);
                    if (found) {
                      setSelectedCountry(found);
                      setLocationMode('country');
                    }
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#080D18] text-[#F5F7FA] text-xs sm:text-sm border border-white/15 focus:outline-none focus:border-[#FFC857] cursor-pointer"
                >
                  {filteredCountries.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} — {c.region} (approximate)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center shrink-0">
              <button
                type="button"
                id="btn-back-step-2"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs text-[#8993A7] hover:text-[#F5F7FA] flex items-center gap-1.5 cursor-pointer font-mono"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>BACK</span>
              </button>
              <button
                type="button"
                id="btn-continue-step-2"
                onClick={() => setStep(3)}
                className="btn-gold px-7 py-3 rounded-full text-xs uppercase tracking-widest font-semibold flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <span>CONTINUE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: PERSONALIZE ================= */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in flex-1 overflow-y-auto pr-1">
            <div>
              <h2 id={titleId} className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight mb-1">
                MAKE IT YOURS
              </h2>
              <p className="text-xs sm:text-sm text-[#8993A7] font-light">
                Dedicate this light to someone, share a memory, or leave a message for humanity.
              </p>
            </div>

            {/* Compact Amount & Location Preview */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between text-xs font-mono">
              <span className="text-[#8993A7]">Selected:</span>
              <span className="text-[#FFC857] font-semibold">₹{currentAmount.toLocaleString()}</span>
              <span className="text-[#8993A7]">•</span>
              <span className="text-[#7DD3FC] truncate max-w-[180px]">{locationLabel}</span>
              <span className="text-[10px] text-[#8993A7]">({isApproximate ? 'approx' : 'precise'})</span>
            </div>

            {/* Name / Anonymous Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs uppercase tracking-wider text-[#8993A7] font-mono">
                  Display Name (Optional)
                </label>
                <label className="flex items-center gap-1.5 text-xs text-[#8993A7] hover:text-[#F5F7FA] cursor-pointer">
                  <input
                    type="checkbox"
                    id="checkbox-anonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="accent-[#FFC857] rounded cursor-pointer"
                  />
                  <span>Contribute anonymously</span>
                </label>
              </div>
              <input
                type="text"
                id="input-contributor-name"
                disabled={isAnonymous}
                placeholder={isAnonymous ? 'Anonymous' : 'e.g. Alex Morgan or The Morgan Family'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="w-full py-2.5 px-3.5 rounded-2xl bg-white/[0.04] text-[#F5F7FA] border border-white/10 text-sm focus:outline-none focus:border-[#FFC857] disabled:opacity-40"
              />
            </div>

            {/* Dedication Message */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#8993A7] font-mono mb-1.5">
                Dedication Message (Optional)
              </label>
              <textarea
                id="textarea-dedication"
                rows={3}
                placeholder="In memory of... For peace... To our future..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={240}
                className="w-full py-2.5 px-3.5 rounded-2xl bg-white/[0.04] text-[#F5F7FA] border border-white/10 text-sm focus:outline-none focus:border-[#FFC857] resize-none"
              />
              <div className="text-right text-[10px] text-[#8993A7] font-mono mt-0.5">
                {message.length} / 240
              </div>
            </div>

            {/* Optional Photo Upload UI */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#8993A7] font-mono mb-1.5">
                Optional Avatar / Tribute Image
              </label>
              <div className="flex items-center gap-3">
                <label className="flex-1 py-2.5 px-3.5 rounded-2xl border border-dashed border-white/20 hover:border-[#FFC857]/50 bg-white/[0.02] flex items-center justify-center gap-2 cursor-pointer text-xs text-[#8993A7] hover:text-[#F5F7FA] transition-colors">
                  <Upload className="w-4 h-4 text-[#FFC857]" />
                  <span>{photoPreview ? 'Change Photo' : 'Upload Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
                {photoPreview && (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border border-[#FFC857] shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center shrink-0">
              <button
                type="button"
                id="btn-back-step-3"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs text-[#8993A7] hover:text-[#F5F7FA] flex items-center gap-1.5 cursor-pointer font-mono"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>BACK</span>
              </button>
              <button
                type="button"
                id="btn-continue-step-3"
                onClick={() => setStep(4)}
                className="btn-gold px-7 py-3 rounded-full text-xs uppercase tracking-widest font-semibold flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <span>REVIEW YOUR LIGHT</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: REVIEW & CONFIRMATION ================= */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in flex-1 overflow-y-auto pr-1">
            <div>
              <h2 id={titleId} className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight mb-1">
                YOUR LIGHT IS READY
              </h2>
              <p className="text-xs sm:text-sm text-[#8993A7] font-light">
                Ready to ignite your light on Earth. Review your details below.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <span className="text-xs text-[#8993A7] font-mono uppercase">Amount</span>
                <span className="text-base font-mono font-bold text-[#FFC857]">
                  ₹{currentAmount.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <span className="text-xs text-[#8993A7] font-mono uppercase">Location</span>
                <span className="text-xs text-[#F5F7FA] font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#7DD3FC]" />
                  <span>{locationLabel}</span>
                  <span className="text-[10px] font-mono text-[#8993A7]">
                    ({isApproximate ? 'approximate' : 'precise'})
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <span className="text-xs text-[#8993A7] font-mono uppercase">Contributor</span>
                <span className="text-xs text-[#F5F7FA] font-medium">
                  {isAnonymous ? 'Anonymous' : (name.trim() || 'A Kind Soul')}
                </span>
              </div>

              {message && (
                <div>
                  <span className="text-[10px] text-[#8993A7] font-mono uppercase block mb-1">
                    Dedication
                  </span>
                  <p className="text-xs text-[#F5F7FA]/90 italic font-light">
                    &ldquo;{message}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* Submission Error Alert */}
            {submissionError && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{submissionError}</span>
              </div>
            )}

            {/* Clear Phase 3 Demonstration Notice */}
            <div className="p-3.5 rounded-2xl bg-[#FFC857]/10 border border-[#FFC857]/30 flex items-start gap-3 text-xs text-[#FFC857]">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold uppercase tracking-wider block mb-1 font-mono text-[11px]">
                  DEMO MODE — NO PAYMENT WILL BE CHARGED. THIS CONTRIBUTION IS NOT SAVED PERMANENTLY.
                </span>
                <span className="text-[11px] text-[#F5F7FA]/80 leading-relaxed block">
                  Clicking confirm will ignite a glowing golden beacon on the 3D globe and fly the camera to your location.
                </span>
              </div>
            </div>

            {/* Accessible Trust & Payment Support Links */}
            <div className="flex items-center justify-between text-[11px] font-mono text-[#8993A7] px-1">
              <span>Need billing assistance?</span>
              <div className="flex items-center gap-2">
                <a
                  href="/contribution-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#FFC857] underline transition-colors"
                >
                  Contribution Policy
                </a>
                <span>•</span>
                <a
                  href="/payment-support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#FFC857] underline transition-colors"
                >
                  Payment Support
                </a>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center shrink-0">
              <button
                type="button"
                id="btn-back-step-4"
                onClick={() => setStep(3)}
                className="px-4 py-2 text-xs text-[#8993A7] hover:text-[#F5F7FA] flex items-center gap-1.5 cursor-pointer font-mono"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>BACK</span>
              </button>
              <button
                type="button"
                id="btn-confirm-ignition"
                disabled={isSubmitting}
                onClick={handleComplete}
                className="btn-gold px-7 py-3 rounded-full text-xs font-semibold uppercase tracking-widest flex items-center gap-2 cursor-pointer shadow-2xl"
              >
                <Sparkles className="w-4 h-4 text-[#030407]" />
                <span>IGNITE MY LIGHT ✦</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
